import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.routers import admin, auth, clients, consultations, downloads, form_dictionary, reports

# Configure logging for scraper/task visibility
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logging.getLogger("scraper").setLevel(logging.INFO)
logging.getLogger("task_runner").setLevel(logging.INFO)


logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    from sqlalchemy import select, text
    from app.db import engine, Base, async_session_maker
    from app.models import Tenant, User, Cliente, Consulta, FormularioDescripcion  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add missing columns to existing tables (no-op if already exists)
        migrations = [
            "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20) NOT NULL DEFAULT 'no_empleador'",
            "ALTER TABLE consultas ADD COLUMN IF NOT EXISTS error_categoria VARCHAR(30)",
            "ALTER TABLE consultas ADD COLUMN IF NOT EXISTS reintentos INTEGER NOT NULL DEFAULT 0",
        ]
        for sql in migrations:
            await conn.execute(text(sql))

    # Migrate existing plain-text clave_fiscal values to encrypted format
    if settings.FIELD_ENCRYPTION_KEY:
        from app.auth.encryption import encrypt_clave
        async with async_session_maker() as db:
            result = await db.execute(
                select(Cliente).where(~Cliente.clave_fiscal.startswith("enc:"))
            )
            legacy = result.scalars().all()
            if legacy:
                logger.info(f"Migrando {len(legacy)} credenciales a formato encriptado...")
                for c in legacy:
                    c.clave_fiscal = encrypt_clave(c.clave_fiscal)
                await db.commit()
                logger.info("Migración de credenciales completada.")

    os.makedirs(settings.DOWNLOAD_DIR, exist_ok=True)
    yield
    # Shutdown


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="DDJJ-ARCA API",
    description="SaaS para consulta automatizada de DDJJ en ARCA",
    version="2.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(consultations.router)
app.include_router(downloads.router)
app.include_router(form_dictionary.router)
app.include_router(reports.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
