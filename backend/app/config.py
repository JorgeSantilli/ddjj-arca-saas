import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/ddjj_arca"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Field-level encryption for clave_fiscal (64 hex chars = 32 bytes AES-256 key)
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    FIELD_ENCRYPTION_KEY: str = ""

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_not_be_default(cls, v: str) -> str:
        if v == "change-me-in-production":
            import os
            if os.getenv("APP_ENV", "development") == "production":
                raise ValueError(
                    "SECRET_KEY no puede ser el valor por defecto en producción. "
                    "Generá uno con: python -c \"import secrets; print(secrets.token_hex(32))\""
                )
        return v

    @field_validator("FIELD_ENCRYPTION_KEY")
    @classmethod
    def encryption_key_must_be_valid(cls, v: str) -> str:
        if not v:
            return v  # Vacío = encriptación deshabilitada (compatible con datos existentes)
        try:
            key = bytes.fromhex(v)
        except ValueError:
            raise ValueError("FIELD_ENCRYPTION_KEY debe ser hexadecimal válido")
        if len(key) != 32:
            raise ValueError("FIELD_ENCRYPTION_KEY debe tener exactamente 64 caracteres hex (32 bytes)")
        return v

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
