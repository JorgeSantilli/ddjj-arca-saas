import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, auth, clients, consultations, downloads


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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
async def health():
    return {"status": "ok", "version": "2.0.0"}
