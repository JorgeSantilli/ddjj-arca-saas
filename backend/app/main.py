import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, auth, clients, consultations, downloads


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    from app.db import engine, Base
    from app.models import Tenant, User, Cliente, Consulta  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs(settings.DOWNLOAD_DIR, exist_ok=True)
    yield
    # Shutdown


app = FastAPI(
    title="DDJJ-ARCA API",
    description="SaaS para consulta automatizada de DDJJ en ARCA",
    version="2.0.0",
    lifespan=lifespan,
)

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
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/debug/config")
async def debug_config():
    """Temporary debug endpoint - remove in production."""
    return {
        "secret_key_len": len(settings.SECRET_KEY),
        "secret_key_start": settings.SECRET_KEY[:8],
        "secret_key_default": settings.SECRET_KEY == "change-me-in-production",
        "database_url_start": settings.DATABASE_URL[:30],
    }
