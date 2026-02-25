from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.db import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    cuit_login = Column(String(20), nullable=False)
    clave_fiscal = Column(String(200), nullable=False)
    cuit_consulta = Column(String(20), nullable=False)
    activo = Column(Boolean, default=True)
    tipo_cliente = Column(String(20), nullable=False, default="no_empleador")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="clientes")
    consultas = relationship("Consulta", back_populates="cliente", cascade="all, delete-orphan")
