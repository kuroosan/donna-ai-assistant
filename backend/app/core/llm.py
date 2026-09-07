import asyncio
import mimetypes
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx
import structlog

from .config import settings


logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class ChatResponse:
    content: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True)
class TranscriptionResponse:
    text: str
    language: Optional[str] = None
    duration: Optional[float] = None


class GroqClient:
    def __init__(self) -> None:
        self._json_client: Optional[httpx.AsyncClient] = None

    def _get_json_client(self) -> httpx.AsyncClient:
        if self._json_client is None or self._json_client.is_closed:
            self._json_client = httpx.AsyncClient(
                base_url=f"{settings.GROQ_BASE_URL.rstrip('/')}/",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(120.0, read=120.0),
            )
        return self._json_client

    async def chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> ChatResponse:
        messages = []
        if system_prompt is not None:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": settings.GROQ_CHAT_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        raw = await self._post_json_with_retry("chat/completions", payload)
        return self._parse_chat_response(raw)

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        language: Optional[str] = None,
    ) -> TranscriptionResponse:
        data: Dict[str, str] = {"model": settings.GROQ_WHISPER_MODEL}
        if language is not None:
            data["language"] = language

        max_retries = settings.GROQ_MAX_RETRIES
        for attempt in range(max_retries + 1):
            async with httpx.AsyncClient(
                base_url=f"{settings.GROQ_BASE_URL.rstrip('/')}/",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                timeout=httpx.Timeout(120.0, read=120.0),
            ) as client:
                response = await client.post(
                    "audio/transcriptions",
                    data=data,
                    files={
                        "file": (
                            filename,
                            audio_bytes,
                            self._infer_mime(filename),
                        )
                    },
                )

            logger.debug(
                "groq_transcription_rate_limit",
                remaining_requests=response.headers.get("x-ratelimit-remaining-requests"),
            )

            if response.status_code == 429:
                if attempt >= max_retries:
                    response.raise_for_status()
                await self._backoff(attempt, response)
                continue

            response.raise_for_status()
            raw = response.json()
            if not isinstance(raw, dict):
                raise ValueError("Unexpected transcription response format")

            duration = raw.get("duration")
            return TranscriptionResponse(
                text=str(raw["text"]),
                language=raw.get("language"),
                duration=float(duration) if duration is not None else None,
            )

        raise RuntimeError("Groq transcription request exhausted retries")

    async def _post_json_with_retry(
        self,
        endpoint: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        max_retries = settings.GROQ_MAX_RETRIES
        for attempt in range(max_retries + 1):
            client = self._get_json_client()
            response = await client.post(endpoint, json=payload)

            logger.debug(
                "groq_rate_limit",
                remaining_requests=response.headers.get("x-ratelimit-remaining-requests"),
            )

            if response.status_code == 429:
                if attempt >= max_retries:
                    response.raise_for_status()
                await self._backoff(attempt, response)
                continue

            response.raise_for_status()
            raw = response.json()
            if not isinstance(raw, dict):
                raise ValueError("Unexpected Groq response format")
            return raw

        raise RuntimeError("Groq request exhausted retries")

    async def _backoff(
        self,
        attempt: int,
        response: Optional[httpx.Response] = None,
    ) -> None:
        delay = settings.GROQ_RETRY_BASE_DELAY * (2**attempt)
        if response is not None:
            retry_after = response.headers.get("retry-after")
            if retry_after is not None:
                try:
                    delay = float(retry_after)
                except ValueError:
                    pass
        await asyncio.sleep(delay)

    def _parse_chat_response(self, raw: Dict[str, Any]) -> ChatResponse:
        choice = raw["choices"][0]
        usage = raw.get("usage", {})
        return ChatResponse(
            content=choice["message"]["content"],
            model=raw["model"],
            prompt_tokens=int(usage.get("prompt_tokens", 0)),
            completion_tokens=int(usage.get("completion_tokens", 0)),
            total_tokens=int(usage.get("total_tokens", 0)),
        )

    async def close(self) -> None:
        if self._json_client is not None and not self._json_client.is_closed:
            await self._json_client.aclose()
        self._json_client = None

    @staticmethod
    def _infer_mime(filename: str) -> str:
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mime_types = {
            "aac": "audio/aac",
            "flac": "audio/flac",
            "m4a": "audio/mp4",
            "mp3": "audio/mpeg",
            "mp4": "video/mp4",
            "oga": "audio/ogg",
            "ogg": "audio/ogg",
            "wav": "audio/wav",
            "webm": "audio/webm",
        }
        return mime_types.get(extension, mimetypes.guess_type(filename)[0] or "application/octet-stream")


groq_client = GroqClient()