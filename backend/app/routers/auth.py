from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.jwt import create_access_token
from app.auth.password import DUMMY_HASH, hash_password, verify_password
from app.db import get_db
from app.models.user import Tenant, User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Registrar nuevo contador: crea tenant + user."""
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El email ya esta registrado")

    # Create tenant
    tenant = Tenant(nombre=payload.nombre_estudio, email=payload.email)
    db.add(tenant)
    await db.flush()

    # Create user
    user = User(
        tenant_id=tenant.id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        nombre=payload.nombre,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Set JWT cookie
    token = create_access_token(user.id, tenant.id, user.is_superadmin)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # True in production with HTTPS
        samesite="lax",
        max_age=86400,
        path="/",
    )
    return user


@router.post("/login", response_model=UserResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Login con email y password. Devuelve JWT en httpOnly cookie."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        # Timing attack prevention
        verify_password(payload.password, DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Email o contrasena incorrectos")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email o contrasena incorrectos")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Cuenta desactivada")

    token = create_access_token(user.id, user.tenant_id, user.is_superadmin)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/",
    )
    return user


@router.post("/logout")
async def logout(response: Response):
    """Cerrar sesion eliminando la cookie."""
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Sesion cerrada"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    """Obtener datos del usuario autenticado."""
    return current_user
