from typing import Any, Dict, Optional

import httpx
import structlog

from .config import settings


logger = structlog.get_logger(__name__)


class N8nClient:
    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=settings.N8N_TIMEOUT_SECONDS)
        return self._client

    async def trigger(self, workflow_name: str, payload: dict) -> dict:
        if not settings.is_n8n_configured:
            raise RuntimeError("n8n is not configured")

        url = f"{settings.N8N_WEBHOOK_BASE_URL.rstrip('/')}/{workflow_name.lstrip('/')}"
        try:
            response = await self._get_client().post(url, json=payload)
            logger.info(
                "n8n_webhook_response",
                workflow_name=workflow_name,
                response_status=response.status_code,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise RuntimeError(
                f"n8n workflow '{workflow_name}' returned HTTP {error.response.status_code}"
            ) from error
        except httpx.RequestError as error:
            raise RuntimeError(
                f"n8n workflow '{workflow_name}' request failed: {error}"
            ) from error

        result: Any = response.json()
        if not isinstance(result, dict):
            raise ValueError("Unexpected n8n response format: expected a JSON object")
        return result

    async def close(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
        self._client = None


n8n_client = N8nClient()