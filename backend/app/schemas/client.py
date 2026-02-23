from pydantic import BaseModel
from datetime import datetime


class ClienteCreate(BaseModel):
    nombre: str
    cuit_login: str
    clave_fiscal: str
    cuit_consulta: str
    activo: bool = True


class ClienteUpdate(BaseModel):
    nombre: str | None = None
    cuit_login: str | None = None
    clave_fiscal: str | None = None
    cuit_consulta: str | None = None
    activo: bool | None = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    cuit_login: str
    cuit_consulta: str
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
