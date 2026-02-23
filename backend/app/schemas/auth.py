from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    nombre_estudio: str  # tenant name


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    nombre: str
    tenant_id: int
    is_superadmin: bool

    model_config = {"from_attributes": True}


class TenantResponse(BaseModel):
    id: int
    nombre: str
    email: str
    plan: str
    activo: bool

    model_config = {"from_attributes": True}
