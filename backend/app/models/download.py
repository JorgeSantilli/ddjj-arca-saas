from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.db import Base


class Descarga(Base):
    __tablename__ = "descargas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    consulta_id = Column(Integer, ForeignKey("consultas.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True)
    estado = Column(String(50), nullable=False, default="")
    cuit_cuil = Column(String(20), nullable=False, default="")
    formulario = Column(String(100), nullable=False, default="")
    periodo = Column(String(20), nullable=False, default="")
    transaccion = Column(String(50), nullable=False, default="")
    fecha_presentacion = Column(String(50), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant")
    consulta = relationship("Consulta")
    cliente = relationship("Cliente")
