from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from app.core.llm import groq_client
except ImportError:
    from core.llm import groq_client


app = FastAPI(title="Donna AI Assistant")


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
    except Exception as error:
        raise HTTPException(status_code=502, detail="Chat provider request failed") from error

    return ChatResponse(message=response.content, model=response.model)