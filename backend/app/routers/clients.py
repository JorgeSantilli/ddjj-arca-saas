from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.db import get_db
from app.models.client import Cliente
from app.models.user import User
from app.schemas.client import ClienteCreate, ClienteResponse, ClienteUpdate

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


@router.get("/", response_model=list[ClienteResponse])
async def list_clients(
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Listar todos los clientes del tenant actual."""
    result = await db.execute(
        select(Cliente)
        .where(Cliente.tenant_id == tenant_id)
        .order_by(Cliente.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClienteCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Crear un nuevo cliente ARCA."""
    cliente = Cliente(**payload.model_dump(), tenant_id=tenant_id)
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.get("/{client_id}", response_model=ClienteResponse)
async def get_client(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Obtener un cliente por ID."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.put("/{client_id}", response_model=ClienteResponse)
async def update_client(
    client_id: int,
    payload: ClienteUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Actualizar un cliente existente."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cliente, field, value)

    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Eliminar un cliente."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    await db.delete(cliente)
    await db.commit()
