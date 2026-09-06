import secrets
from typing import Optional

from fastapi import Header, HTTPException

from .config import settings


async def verify_api_key(
    api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> None:
    if api_key is None:
        raise HTTPException(
            status_code=401,
            detail="Missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if not secrets.compare_digest(api_key, settings.API_SECRET_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key")