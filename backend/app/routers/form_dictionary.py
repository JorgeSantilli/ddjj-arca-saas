import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.db import get_db
from app.models.form_dictionary import FormularioDescripcion
from app.models.user import User

router = APIRouter(prefix="/api/v1/form-dictionary", tags=["form-dictionary"])

# Default dictionary — used as fallback when tenant has no override
DEFAULT_FORM_DICT: dict[str, str] = {
    "762v2600": "Bienes Personales (v26)",
    "762v2500": "Bienes Personales (v25)",
    "5111v400": "DJ IB MENDOZA",
    "2051v101": "IVA SIMPLE",
    "2083v300": "LIBRO IVA",
    "2084v100": "Autoridades y Apoderados",
    "1003v170": "Venta de Inmuebles (No Retención)",
    "931v4700": "DJ EMPLEADOR",
    "899v600": "BIENES PERSONALES",
    "713v2500": "GANANCIAS SOCIEDADES",
    "1272v800": "CERT. PYME",
    "711v2700": "GAN. PERS. FISICAS",
}


def normalize_form_key(raw: str) -> str:
    """Normalize a formulario key for matching: lowercase, strip non-alnum, remove leading 'f'."""
    cleaned = re.sub(r"[^a-z0-9]", "", raw.lower())
    # Remove leading 'f' if followed by digits (e.g., "f931v4700" -> "931v4700")
    cleaned = re.sub(r"^f(?=\d)", "", cleaned)
    # Remove standalone 'v' between numbers (e.g., "931v4700" stays as-is, that's fine)
    return cleaned


async def get_form_descriptions(db: AsyncSession, tenant_id: int) -> dict[str, str]:
    """Build merged dictionary: defaults + tenant overrides."""
    result = await db.execute(
        select(FormularioDescripcion).where(FormularioDescripcion.tenant_id == tenant_id)
    )
    tenant_entries = result.scalars().all()
    # Start with defaults
    merged = dict(DEFAULT_FORM_DICT)
    # Overlay tenant-specific entries
    for entry in tenant_entries:
        key = normalize_form_key(entry.clave)
        merged[key] = entry.descripcion
    return merged


def lookup_description(form_dict: dict[str, str], formulario: str) -> str:
    """Look up description for a formulario value."""
    key = normalize_form_key(formulario)
    return form_dict.get(key, "")


class FormDictEntry(BaseModel):
    clave: str
    descripcion: str


class FormDictResponse(BaseModel):
    id: int
    clave: str
    descripcion: str
    is_default: bool = False

    model_config = {"from_attributes": True}


@router.get("/")
async def list_form_dictionary(
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[FormDictResponse]:
    """List all form descriptions: defaults + tenant-specific."""
    result = await db.execute(
        select(FormularioDescripcion).where(FormularioDescripcion.tenant_id == tenant_id)
    )
    tenant_entries = {normalize_form_key(e.clave): e for e in result.scalars().all()}

    entries: list[FormDictResponse] = []
    # Add defaults (not overridden by tenant)
    for key, desc in DEFAULT_FORM_DICT.items():
        if key not in tenant_entries:
            entries.append(FormDictResponse(id=0, clave=key, descripcion=desc, is_default=True))
    # Add tenant entries
    for e in tenant_entries.values():
        entries.append(FormDictResponse(id=e.id, clave=e.clave, descripcion=e.descripcion, is_default=False))

    entries.sort(key=lambda x: x.clave)
    return entries


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_form_entry(
    payload: FormDictEntry,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
) -> FormDictResponse:
    """Create a new form description entry for this tenant."""
    entry = FormularioDescripcion(
        tenant_id=tenant_id,
        clave=payload.clave,
        descripcion=payload.descripcion,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return FormDictResponse(id=entry.id, clave=entry.clave, descripcion=entry.descripcion, is_default=False)


@router.put("/{entry_id}")
async def update_form_entry(
    entry_id: int,
    payload: FormDictEntry,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
) -> FormDictResponse:
    """Update a tenant-specific form description."""
    result = await db.execute(
        select(FormularioDescripcion).where(
            FormularioDescripcion.id == entry_id,
            FormularioDescripcion.tenant_id == tenant_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    entry.clave = payload.clave
    entry.descripcion = payload.descripcion
    await db.commit()
    await db.refresh(entry)
    return FormDictResponse(id=entry.id, clave=entry.clave, descripcion=entry.descripcion, is_default=False)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_form_entry(
    entry_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Delete a tenant-specific form description."""
    result = await db.execute(
        select(FormularioDescripcion).where(
            FormularioDescripcion.id == entry_id,
            FormularioDescripcion.tenant_id == tenant_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    await db.delete(entry)
    await db.commit()
