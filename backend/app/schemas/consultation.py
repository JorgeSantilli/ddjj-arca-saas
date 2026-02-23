from pydantic import BaseModel
from datetime import datetime


class ConsultaCreate(BaseModel):
    cliente_ids: list[int]
    periodo: str = "1"
    headless: bool = True


class ConsultaResponse(BaseModel):
    id: int
    cliente_id: int
    cliente_nombre: str | None = None
    periodo: str
    estado: str
    error_detalle: str | None = None
    archivo_csv: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConsultaStatusResponse(BaseModel):
    corriendo: bool
    detalle: str
    consultas: list[ConsultaResponse]
