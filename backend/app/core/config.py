import sys
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    GROQ_API_KEY: str
    GROQ_CHAT_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_WHISPER_MODEL: str = "whisper-large-v3"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MAX_RETRIES: int = 3
    GROQ_RETRY_BASE_DELAY: float = 2.0
    MASTER_RESUME: str = ""
    API_SECRET_KEY: str
    ALLOWED_ORIGINS: str
    APP_ENV: str = "production"
    LOG_LEVEL: str = "warning"

    @field_validator("API_SECRET_KEY")
    @classmethod
    def validate_api_secret_key(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("API_SECRET_KEY must be at least 32 characters long")
        return value

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def validate_allowed_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",")]
        if "*" in origins:
            raise ValueError("ALLOWED_ORIGINS cannot contain the wildcard '*'")
        return value

    @field_validator("APP_ENV")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in {"development", "production"}:
            raise ValueError("APP_ENV must be 'development' or 'production'")
        return normalized

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in {"debug", "info", "warning", "error", "critical"}:
            raise ValueError(
                "LOG_LEVEL must be one of: debug, info, warning, error, critical"
            )
        return normalized

    def get_allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


def _load_settings() -> Settings:
    try:
        return Settings()
    except Exception as error:
        print(f"Configuration error: {error}", file=sys.stderr)
        sys.exit(1)


settings = _load_settings()