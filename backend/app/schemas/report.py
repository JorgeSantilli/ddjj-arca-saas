from pydantic import BaseModel
from typing import Dict


class ComplianceStatus(BaseModel):
    periodo: str | None = None
    estado: str = "sin_datos"  # al_dia, atrasado_1, atrasado_critico, sin_datos


class ClientComplianceRow(BaseModel):
    cliente_id: int
    cliente_nombre: str
    data: Dict[str, ComplianceStatus]


class ComplianceMatrixResponse(BaseModel):
    columns: list[str]
    rows: list[ClientComplianceRow]
