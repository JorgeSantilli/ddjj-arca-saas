from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db import Base


class FormularioDescripcion(Base):
    __tablename__ = "formulario_descripciones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    clave = Column(String(100), nullable=False)
    descripcion = Column(String(200), nullable=False)

    tenant = relationship("Tenant")
