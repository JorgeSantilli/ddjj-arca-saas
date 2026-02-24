import csv
import logging
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.config import settings
from app.db import get_db
from app.models.download import Descarga
from app.models.client import Cliente
from app.models.user import User

logger = logging.getLogger("downloads")

router = APIRouter(prefix="/api/v1/downloads", tags=["downloads"])


@router.get("/")
async def list_downloads(
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Listar registros de DDJJ extraidos de ARCA."""
    result = await db.execute(
        select(Descarga, Cliente.nombre.label("cliente_nombre"))
        .join(Cliente, Descarga.cliente_id == Cliente.id)
        .where(Descarga.tenant_id == tenant_id)
        .order_by(Descarga.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": d.id,
            "cliente_cuit": d.cuit_cuil,
            "cliente_nombre": nombre,
            "estado": d.estado,
            "cuit_cuil": d.cuit_cuil,
            "formulario": d.formulario,
            "periodo": d.periodo,
            "transaccion": d.transaccion,
            "fecha_presentacion": d.fecha_presentacion,
            "consulta_id": d.consulta_id,
            "created_at": d.created_at.isoformat() if d.created_at else "",
        }
        for d, nombre in rows
    ]


@router.delete("/{descarga_id}")
async def delete_download(
    descarga_id: int,
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Eliminar un registro de descarga."""
    result = await db.execute(
        select(Descarga).where(Descarga.id == descarga_id, Descarga.tenant_id == tenant_id)
    )
    descarga = result.scalar_one_or_none()
    if not descarga:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    await db.delete(descarga)
    await db.commit()


@router.post("/delete-batch")
async def delete_batch(
    ids: list[int],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Eliminar multiples registros de descarga."""
    for did in ids:
        result = await db.execute(
            select(Descarga).where(Descarga.id == did, Descarga.tenant_id == tenant_id)
        )
        descarga = result.scalar_one_or_none()
        if descarga:
            await db.delete(descarga)
    await db.commit()
    return {"eliminados": len(ids)}


@router.get("/file/{file_path:path}")
async def download_file(
    file_path: str,
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Descargar un archivo CSV. Proteccion contra path traversal."""
    if not file_path.startswith(f"tenant_{tenant_id}/"):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    full_path = os.path.join(settings.DOWNLOAD_DIR, file_path)
    real_path = os.path.realpath(full_path)
    base_real = os.path.realpath(settings.DOWNLOAD_DIR)

    if not real_path.startswith(base_real):
        raise HTTPException(status_code=403, detail="Ruta invalida")

    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    return FileResponse(real_path, filename=os.path.basename(real_path))
