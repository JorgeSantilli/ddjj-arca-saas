from pydantic import BaseModel
from datetime import datetime


class ClienteCreate(BaseModel):
    nombre: str
    cuit_login: str
    clave_fiscal: str
    cuit_consulta: str
    activo: bool = True
    tipo_cliente: str = "no_empleador"


class ClienteUpdate(BaseModel):
    nombre: str | None = None
    cuit_login: str | None = None
    clave_fiscal: str | None = None
    cuit_consulta: str | None = None
    activo: bool | None = None
    tipo_cliente: str | None = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    cuit_login: str
    cuit_consulta: str
    activo: bool
    tipo_cliente: str
    ultimo_periodo: str | None = None
    estado_ddjj: str = "sin_datos"
    created_at: datetime

    model_config = {"from_attributes": True}
