import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/ddjj_arca"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Email
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "DDJJ-ARCA <notificaciones@tudominio.com>"

    # Scraper
    MIN_DELAY: float = 1.5
    MAX_DELAY: float = 3.5
    BROWSER_TIMEOUT: int = 30000
    HEADLESS: bool = True

    # App
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    DOWNLOAD_DIR: str = "descargas"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
