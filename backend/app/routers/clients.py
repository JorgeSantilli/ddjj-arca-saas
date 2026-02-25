import re
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.db import get_db
from app.models.client import Cliente
from app.models.download import Descarga
from app.models.user import User
from app.schemas.client import ClienteCreate, ClienteResponse, ClienteUpdate

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


def _parse_periodo(periodo_str: str | None) -> tuple[int, int] | None:
    """Parse periodo string to (year, month). Handles formats like '01/2026', '2026-01', '202601'."""
    if not periodo_str:
        return None
    cleaned = periodo_str.strip()
    # Try MM/YYYY
    m = re.match(r"(\d{1,2})[/-](\d{4})", cleaned)
    if m:
        return int(m.group(2)), int(m.group(1))
    # Try YYYY-MM or YYYY/MM
    m = re.match(r"(\d{4})[/-](\d{1,2})", cleaned)
    if m:
        return int(m.group(1)), int(m.group(2))
    # Try YYYYMM
    m = re.match(r"(\d{4})(\d{2})", cleaned)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None


def _calc_estado_ddjj(ultimo_periodo: str | None) -> str:
    """Calculate DDJJ status comparing last period vs current fiscal month."""
    parsed = _parse_periodo(ultimo_periodo)
    if not parsed:
        return "sin_datos"
    year, month = parsed
    now = datetime.now(timezone.utc)
    # Fiscal month = previous month
    fiscal_year = now.year if now.month > 1 else now.year - 1
    fiscal_month = now.month - 1 if now.month > 1 else 12
    # Months difference
    diff = (fiscal_year * 12 + fiscal_month) - (year * 12 + month)
    if diff <= 0:
        return "al_dia"
    elif diff == 1:
        return "atrasado_1"
    else:
        return "atrasado_critico"


@router.get("/", response_model=list[ClienteResponse])
async def list_clients(
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Listar todos los clientes del tenant actual con estado DDJJ."""
    # Get clients
    result = await db.execute(
        select(Cliente)
        .where(Cliente.tenant_id == tenant_id)
        .order_by(Cliente.nombre)
    )
    clientes = result.scalars().all()

    # Get last periodo per client
    periodo_result = await db.execute(
        select(
            Descarga.cliente_id,
            func.max(Descarga.periodo).label("ultimo_periodo"),
        )
        .where(Descarga.tenant_id == tenant_id)
        .group_by(Descarga.cliente_id)
    )
    periodo_map = {row.cliente_id: row.ultimo_periodo for row in periodo_result}

    # Build enriched response
    response = []
    for c in clientes:
        ultimo = periodo_map.get(c.id)
        data = ClienteResponse.model_validate(c)
        data.ultimo_periodo = ultimo
        data.estado_ddjj = _calc_estado_ddjj(ultimo)
        response.append(data)

    return response


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


@router.get("/{client_id}/password")
async def get_client_password(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Obtener la clave fiscal de un cliente."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"clave_fiscal": cliente.clave_fiscal}


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
