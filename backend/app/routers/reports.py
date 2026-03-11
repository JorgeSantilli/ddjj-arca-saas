from typing import Annotated, Dict, List, Set, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.db import get_db
from app.models.client import Cliente
from app.models.download import Descarga
from app.models.user import User
from app.routers.clients import _calc_estado_ddjj, _parse_periodo
from app.routers.form_dictionary import get_form_descriptions, lookup_description
from app.schemas.report import ComplianceMatrixResponse, ClientComplianceRow, ComplianceStatus

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


def _periodo_key(periodo_str: str | None) -> int:
    """Convert periodo string to integer for sorting (e.g., '2026-01' -> 202601)."""
    parsed = _parse_periodo(periodo_str)
    if not parsed:
        return 0
    return parsed[0] * 100 + parsed[1]


@router.get("/compliance-matrix", response_model=ComplianceMatrixResponse)
async def get_compliance_matrix(
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Genera una matriz de cumplimiento de DDJJ.
    Filas: Clientes
    Columnas: Tipos de DDJJ (basado en descripción del formulario)
    Celdas: Estado (semáforo) y último periodo presentado.
    """
    # 1. Get all active clients
    clients_result = await db.execute(
        select(Cliente)
        .where(Cliente.tenant_id == tenant_id, Cliente.activo == True)
        .order_by(Cliente.nombre)
    )
    clientes = clients_result.scalars().all()

    # 2. Get form dictionary for descriptions
    form_dict = await get_form_descriptions(db, tenant_id)

    # 3. Get all downloads for this tenant
    # We fetch all to do in-memory aggregation which is complex in SQL with custom form logic
    downloads_result = await db.execute(
        select(Descarga).where(Descarga.tenant_id == tenant_id)
    )
    descargas = downloads_result.scalars().all()

    # 4. Process data: Group by (client_id, ddjj_type) -> max_periodo
    # Structure: client_id -> { ddjj_type: max_periodo_str }
    client_map: Dict[int, Dict[str, str]] = {c.id: {} for c in clientes}
    all_columns: Set[str] = set()

    for d in descargas:
        if d.cliente_id not in client_map:
            continue
        
        # Determine DDJJ Type (Column Name)
        desc = lookup_description(form_dict, d.formulario)
        ddjj_type = desc if desc else f"Form {d.formulario}"
        
        # Add to known columns
        all_columns.add(ddjj_type)

        # Check if this is a newer period for this client/type
        current_max = client_map[d.cliente_id].get(ddjj_type)
        if not current_max or _periodo_key(d.periodo) > _periodo_key(current_max):
            client_map[d.cliente_id][ddjj_type] = d.periodo

    # 5. Build Response
    sorted_columns = sorted(list(all_columns))
    rows: List[ClientComplianceRow] = []

    for c in clientes:
        row_data: Dict[str, ComplianceStatus] = {}
        client_data = client_map.get(c.id, {})
        
        for col in sorted_columns:
            periodo = client_data.get(col)
            if periodo:
                estado = _calc_estado_ddjj(periodo)
                row_data[col] = ComplianceStatus(periodo=periodo, estado=estado)
            else:
                row_data[col] = ComplianceStatus(periodo=None, estado="sin_datos")
        
        rows.append(ClientComplianceRow(
            cliente_id=c.id,
            cliente_nombre=c.nombre,
            data=row_data
        ))

    return ComplianceMatrixResponse(columns=sorted_columns, rows=rows)
