from fastapi import FastAPI


app = FastAPI(title="Donna AI Assistant")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}