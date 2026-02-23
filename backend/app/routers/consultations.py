from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.db import get_db
from app.models.client import Cliente
from app.models.consultation import Consulta
from app.models.user import User
from app.schemas.consultation import ConsultaCreate, ConsultaResponse

router = APIRouter(prefix="/api/v1/consultations", tags=["consultations"])


@router.get("/", response_model=list[ConsultaResponse])
async def list_consultations(
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
    limit: int = 100,
):
    """Listar consultas del tenant actual."""
    result = await db.execute(
        select(Consulta, Cliente.nombre.label("cliente_nombre"))
        .join(Cliente, Consulta.cliente_id == Cliente.id)
        .where(Consulta.tenant_id == tenant_id)
        .order_by(Consulta.created_at.desc())
        .limit(limit)
    )
    rows = result.all()
    return [
        ConsultaResponse(
            id=c.id,
            cliente_id=c.cliente_id,
            cliente_nombre=nombre,
            periodo=c.periodo,
            estado=c.estado,
            error_detalle=c.error_detalle,
            archivo_csv=c.archivo_csv,
            created_at=c.created_at,
        )
        for c, nombre in rows
    ]


@router.post("/execute", status_code=status.HTTP_202_ACCEPTED)
async def execute_consultations(
    payload: ConsultaCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Encolar consultas ARCA para ejecucion en background."""
    from app.tasks.scraping import scrape_arca_task

    consulta_ids = []
    for cliente_id in payload.cliente_ids:
        # Verify client belongs to tenant
        result = await db.execute(
            select(Cliente).where(Cliente.id == cliente_id, Cliente.tenant_id == tenant_id)
        )
        cliente = result.scalar_one_or_none()
        if not cliente:
            raise HTTPException(status_code=404, detail=f"Cliente {cliente_id} no encontrado")

        consulta = Consulta(
            tenant_id=tenant_id,
            cliente_id=cliente_id,
            periodo=payload.periodo,
            estado="pendiente",
        )
        db.add(consulta)
        await db.flush()
        consulta_ids.append(consulta.id)

    await db.commit()

    # Enqueue Celery tasks
    for cid in consulta_ids:
        scrape_arca_task.delay(cid, tenant_id)

    return {"message": f"{len(consulta_ids)} consultas encoladas", "consulta_ids": consulta_ids}


@router.get("/status")
async def get_execution_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Estado actual de consultas (para polling)."""
    result = await db.execute(
        select(Consulta, Cliente.nombre.label("cliente_nombre"))
        .join(Cliente, Consulta.cliente_id == Cliente.id)
        .where(Consulta.tenant_id == tenant_id)
        .order_by(Consulta.created_at.desc())
        .limit(50)
    )
    rows = result.all()

    en_proceso = any(c.estado in ("pendiente", "en_proceso") for c, _ in rows)
    detalle = ""
    for c, nombre in rows:
        if c.estado == "en_proceso":
            detalle = f"Procesando: {nombre}"
            break

    consultas = [
        ConsultaResponse(
            id=c.id,
            cliente_id=c.cliente_id,
            cliente_nombre=nombre,
            periodo=c.periodo,
            estado=c.estado,
            error_detalle=c.error_detalle,
            archivo_csv=c.archivo_csv,
            created_at=c.created_at,
        )
        for c, nombre in rows
    ]
    return {"corriendo": en_proceso, "detalle": detalle, "consultas": consultas}


@router.delete("/{consulta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_consultation(
    consulta_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Eliminar una consulta."""
    result = await db.execute(
        select(Consulta).where(Consulta.id == consulta_id, Consulta.tenant_id == tenant_id)
    )
    consulta = result.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta no encontrada")
    await db.delete(consulta)
    await db.commit()


@router.post("/delete-batch", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(
    ids: list[int],
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Eliminar multiples consultas."""
    for cid in ids:
        result = await db.execute(
            select(Consulta).where(Consulta.id == cid, Consulta.tenant_id == tenant_id)
        )
        consulta = result.scalar_one_or_none()
        if consulta:
            await db.delete(consulta)
    await db.commit()
