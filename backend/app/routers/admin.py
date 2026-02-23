from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_superadmin
from app.db import get_db
from app.models.client import Cliente
from app.models.consultation import Consulta
from app.models.user import Tenant, User
from app.schemas.auth import TenantResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/tenants", response_model=list[TenantResponse])
async def list_tenants(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_superadmin)],
):
    """Listar todos los tenants (solo superadmin)."""
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    return result.scalars().all()


@router.get("/stats")
async def global_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_superadmin)],
):
    """Metricas globales del SaaS."""
    tenants_count = await db.scalar(select(func.count(Tenant.id)))
    users_count = await db.scalar(select(func.count(User.id)))
    clients_count = await db.scalar(select(func.count(Cliente.id)))
    consultas_total = await db.scalar(select(func.count(Consulta.id)))
    consultas_exitosas = await db.scalar(
        select(func.count(Consulta.id)).where(Consulta.estado == "exitoso")
    )
    consultas_error = await db.scalar(
        select(func.count(Consulta.id)).where(Consulta.estado == "error")
    )
    consultas_pendientes = await db.scalar(
        select(func.count(Consulta.id)).where(Consulta.estado.in_(["pendiente", "en_proceso"]))
    )

    return {
        "tenants": tenants_count,
        "users": users_count,
        "clientes": clients_count,
        "consultas_total": consultas_total,
        "consultas_exitosas": consultas_exitosas,
        "consultas_error": consultas_error,
        "consultas_pendientes": consultas_pendientes,
        "tasa_exito": round(consultas_exitosas / max(consultas_total, 1) * 100, 1),
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant_detail(
    tenant_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_superadmin)],
):
    """Detalle de un tenant con estadisticas."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    clients = await db.scalar(
        select(func.count(Cliente.id)).where(Cliente.tenant_id == tenant_id)
    )
    consultas = await db.scalar(
        select(func.count(Consulta.id)).where(Consulta.tenant_id == tenant_id)
    )

    return {
        "id": tenant.id,
        "nombre": tenant.nombre,
        "email": tenant.email,
        "plan": tenant.plan,
        "activo": tenant.activo,
        "created_at": tenant.created_at,
        "clientes_count": clients,
        "consultas_count": consultas,
    }


@router.post("/tenants/{tenant_id}/toggle")
async def toggle_tenant(
    tenant_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_superadmin)],
):
    """Activar/desactivar un tenant."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    tenant.activo = not tenant.activo
    await db.commit()
    return {"id": tenant.id, "activo": tenant.activo}


@router.get("/consultations")
async def all_consultations(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_superadmin)],
    limit: int = 200,
):
    """Todas las consultas cross-tenant (solo superadmin)."""
    result = await db.execute(
        select(Consulta, Cliente.nombre, Tenant.nombre.label("tenant_nombre"))
        .join(Cliente, Consulta.cliente_id == Cliente.id)
        .join(Tenant, Consulta.tenant_id == Tenant.id)
        .order_by(Consulta.created_at.desc())
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": c.id,
            "tenant_nombre": tn,
            "cliente_nombre": cn,
            "periodo": c.periodo,
            "estado": c.estado,
            "error_detalle": c.error_detalle,
            "created_at": c.created_at,
        }
        for c, cn, tn in rows
    ]
