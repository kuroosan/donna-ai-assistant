import httpx
import structlog
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from app.core.llm import groq_client
except ImportError:
    from core.llm import groq_client


app = FastAPI(title="Donna AI Assistant")
logger = structlog.get_logger(__name__)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message: str
    model: str


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/healthz")
async def api_health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message must not be empty")

    try:
        response = await groq_client.chat(message)
    except httpx.HTTPStatusError as error:
        status_code = error.response.status_code
        logger.error(
            "chat_provider_http_error",
            status_code=status_code,
            request_url=str(error.request.url),
            provider_detail=error.response.text[:300],
        )
        raise HTTPException(
            status_code=502,
            detail=f"Chat provider returned HTTP {status_code}",
        ) from error
    except httpx.RequestError as error:
        logger.error("chat_provider_request_error", error_type=type(error).__name__)
        raise HTTPException(status_code=502, detail="Chat provider request failed") from error
    except Exception as error:
        logger.error("chat_provider_unexpected_error", error_type=type(error).__name__)
        raise HTTPException(status_code=502, detail="Chat provider request failed") from error

    return ChatResponse(message=response.content, model=response.model)