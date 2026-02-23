import csv
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.config import settings
from app.db import get_db
from app.models.user import User

router = APIRouter(prefix="/api/v1/downloads", tags=["downloads"])


@router.get("/")
async def list_downloads(
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Listar archivos CSV descargados del tenant."""
    base_dir = os.path.join(settings.DOWNLOAD_DIR, f"tenant_{tenant_id}")
    registros = []

    if not os.path.exists(base_dir):
        return registros

    for cuit_dir in sorted(os.listdir(base_dir)):
        cuit_path = os.path.join(base_dir, cuit_dir)
        if not os.path.isdir(cuit_path):
            continue

        for periodo_dir in sorted(os.listdir(cuit_path), reverse=True):
            periodo_path = os.path.join(cuit_path, periodo_dir)
            if not os.path.isdir(periodo_path):
                continue

            for archivo in os.listdir(periodo_path):
                if not archivo.endswith(".csv"):
                    continue

                filepath = os.path.join(periodo_path, archivo)
                try:
                    with open(filepath, "r", encoding="latin-1") as f:
                        reader = csv.DictReader(f, delimiter=";")
                        for row in reader:
                            registros.append({
                                "cliente_cuit": cuit_dir.replace("CUIT_", ""),
                                "estado": row.get("Estado", ""),
                                "cuit_cuil": row.get("CUIT/CUIL", ""),
                                "formulario": row.get("Formulario", ""),
                                "periodo": row.get("Período", row.get("Periodo", "")),
                                "transaccion": row.get("Transacción", row.get("Transaccion", "")),
                                "fecha_presentacion": row.get("Fecha de Presentación", row.get("Fecha de Presentacion", "")),
                                "archivo": f"tenant_{tenant_id}/{cuit_dir}/{periodo_dir}/{archivo}",
                            })
                except Exception:
                    continue

    return registros


@router.get("/file/{file_path:path}")
async def download_file(
    file_path: str,
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Descargar un archivo CSV. Proteccion contra path traversal."""
    # Ensure file belongs to tenant
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


@router.post("/delete-batch")
async def delete_files(
    file_paths: list[str],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Eliminar multiples archivos CSV."""
    deleted = 0
    for fp in file_paths:
        if not fp.startswith(f"tenant_{tenant_id}/"):
            continue
        full_path = os.path.join(settings.DOWNLOAD_DIR, fp)
        real_path = os.path.realpath(full_path)
        base_real = os.path.realpath(settings.DOWNLOAD_DIR)
        if real_path.startswith(base_real) and os.path.isfile(real_path):
            os.remove(real_path)
            deleted += 1

    return {"eliminados": deleted}
