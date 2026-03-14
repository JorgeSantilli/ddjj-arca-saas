import re
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_tenant_id, get_current_user
from app.auth.encryption import decrypt_clave, encrypt_clave
from app.db import get_db
from app.models.client import Cliente
from app.models.download import Descarga
from app.models.user import User
from app.schemas.client import ClienteCreate, ClienteImportRequest, ClienteImportResult, ClienteImportError, ClienteResponse, ClienteUpdate

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


def _parse_periodo(periodo_str: str | None) -> tuple[int, int] | None:
    """Parse periodo string to (year, month). Handles formats like '01/2026', '2026-01', '202601'."""
    if not periodo_str:
        return None
    cleaned = periodo_str.strip()
    # Try MM/YYYY
    m = re.match(r"(\d{1,2})[/-](\d{4})", cleaned)
    if m:
        return int(m.group(2)), int(m.group(1))
    # Try YYYY-MM or YYYY/MM
    m = re.match(r"(\d{4})[/-](\d{1,2})", cleaned)
    if m:
        return int(m.group(1)), int(m.group(2))
    # Try YYYYMM
    m = re.match(r"(\d{4})(\d{2})", cleaned)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None


def _calc_estado_ddjj(ultimo_periodo: str | None) -> str:
    """Calculate DDJJ status comparing last period vs current fiscal month."""
    parsed = _parse_periodo(ultimo_periodo)
    if not parsed:
        return "sin_datos"
    year, month = parsed
    now = datetime.now(timezone.utc)
    # Fiscal month = previous month
    fiscal_year = now.year if now.month > 1 else now.year - 1
    fiscal_month = now.month - 1 if now.month > 1 else 12
    # Months difference
    diff = (fiscal_year * 12 + fiscal_month) - (year * 12 + month)
    if diff <= 0:
        return "al_dia"
    elif diff == 1:
        return "atrasado_1"
    else:
        return "atrasado_critico"


@router.get("/", response_model=list[ClienteResponse])
async def list_clients(
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Listar todos los clientes del tenant actual con estado DDJJ."""
    # Get clients
    result = await db.execute(
        select(Cliente)
        .where(Cliente.tenant_id == tenant_id)
        .order_by(Cliente.nombre)
    )
    clientes = result.scalars().all()

    # Get last periodo per client
    periodo_result = await db.execute(
        select(
            Descarga.cliente_id,
            func.max(Descarga.periodo).label("ultimo_periodo"),
        )
        .where(Descarga.tenant_id == tenant_id)
        .group_by(Descarga.cliente_id)
    )
    periodo_map = {row.cliente_id: row.ultimo_periodo for row in periodo_result}

    # Build enriched response
    response = []
    for c in clientes:
        ultimo = periodo_map.get(c.id)
        data = ClienteResponse.model_validate(c)
        data.ultimo_periodo = ultimo
        data.estado_ddjj = _calc_estado_ddjj(ultimo)
        response.append(data)

    return response


@router.post("/import", response_model=ClienteImportResult)
async def import_clients(
    payload: ClienteImportRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Importar clientes desde CSV parseado en frontend."""
    created = 0
    updated = 0
    errors: list[ClienteImportError] = []

    for i, row in enumerate(payload.clientes):
        # Validate CUIT (11 digits)
        cuit_clean = re.sub(r"\D", "", row.cuit_login)
        if len(cuit_clean) != 11:
            errors.append(ClienteImportError(row=i + 1, nombre=row.nombre, error=f"CUIT login inválido: {row.cuit_login}"))
            continue
        if not row.nombre.strip():
            errors.append(ClienteImportError(row=i + 1, nombre=row.nombre or "(vacío)", error="Nombre vacío"))
            continue
        if not row.clave_fiscal.strip():
            errors.append(ClienteImportError(row=i + 1, nombre=row.nombre, error="Clave fiscal vacía"))
            continue

        cuit_consulta_clean = re.sub(r"\D", "", row.cuit_consulta) if row.cuit_consulta else cuit_clean

        # Check for existing client by cuit_login within tenant
        result = await db.execute(
            select(Cliente).where(Cliente.tenant_id == tenant_id, Cliente.cuit_login == cuit_clean)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing
            existing.nombre = row.nombre.strip()
            existing.clave_fiscal = encrypt_clave(row.clave_fiscal.strip())
            existing.cuit_consulta = cuit_consulta_clean
            existing.tipo_cliente = row.tipo_cliente if row.tipo_cliente in ("empleador", "no_empleador") else "no_empleador"
            existing.activo = row.activo
            updated += 1
        else:
            # Create new
            cliente = Cliente(
                tenant_id=tenant_id,
                nombre=row.nombre.strip(),
                cuit_login=cuit_clean,
                clave_fiscal=encrypt_clave(row.clave_fiscal.strip()),
                cuit_consulta=cuit_consulta_clean,
                tipo_cliente=row.tipo_cliente if row.tipo_cliente in ("empleador", "no_empleador") else "no_empleador",
                activo=row.activo,
            )
            db.add(cliente)
            created += 1

    await db.commit()
    return ClienteImportResult(created=created, updated=updated, errors=errors)


@router.post("/", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClienteCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Crear un nuevo cliente ARCA."""
    data = payload.model_dump()
    data["clave_fiscal"] = encrypt_clave(data["clave_fiscal"])
    cliente = Cliente(**data, tenant_id=tenant_id)
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.get("/{client_id}", response_model=ClienteResponse)
async def get_client(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Obtener un cliente por ID."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.get("/{client_id}/password")
async def get_client_password(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Obtener la clave fiscal de un cliente."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"clave_fiscal": decrypt_clave(cliente.clave_fiscal)}


@router.get("/{client_id}/autologin", response_class=HTMLResponse)
async def client_autologin(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Pagina de acceso rapido a ARCA con credenciales del cliente."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    clave_plaintext = decrypt_clave(cliente.clave_fiscal)

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Acceso ARCA - {cliente.nombre}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
  .card {{ background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.1); padding: 32px; max-width: 420px; width: 100%; }}
  .header {{ text-align: center; margin-bottom: 24px; }}
  .header h1 {{ font-size: 18px; color: #1a1a2e; margin-bottom: 4px; }}
  .header p {{ font-size: 13px; color: #666; }}
  .field {{ margin-bottom: 16px; }}
  .field label {{ display: block; font-size: 12px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }}
  .field-row {{ display: flex; align-items: center; gap: 8px; }}
  .field-value {{ flex: 1; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 14px; font-size: 15px; font-family: 'SF Mono', 'Consolas', monospace; color: #1a1a2e; letter-spacing: 1px; }}
  .btn-copy {{ background: #e8f4fd; border: 1px solid #b8daff; color: #0066cc; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all .15s; white-space: nowrap; }}
  .btn-copy:hover {{ background: #d0ebff; }}
  .btn-copy.copied {{ background: #d4edda; border-color: #b1dfbb; color: #155724; }}
  .divider {{ height: 1px; background: #e0e0e0; margin: 20px 0; }}
  .steps {{ margin-bottom: 20px; }}
  .steps li {{ font-size: 13px; color: #555; margin-bottom: 6px; padding-left: 4px; }}
  .steps li strong {{ color: #1a1a2e; }}
  .btn-arca {{ display: block; width: 100%; background: #0066cc; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background .15s; text-align: center; text-decoration: none; }}
  .btn-arca:hover {{ background: #0052a3; }}
  .badge {{ display: inline-block; background: #e8f4fd; color: #0066cc; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-left: 8px; }}
  .auto-msg {{ text-align: center; font-size: 12px; color: #28a745; margin-top: 12px; font-weight: 500; }}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>{cliente.nombre}</h1>
    <p>Acceso rapido a ARCA</p>
  </div>

  <div class="field">
    <label>CUIT <span class="badge" id="auto-badge">Copiado automaticamente</span></label>
    <div class="field-row">
      <div class="field-value" id="cuit">{cliente.cuit_login}</div>
      <button class="btn-copy" onclick="copiar('cuit', this)">Copiar</button>
    </div>
  </div>

  <div class="field">
    <label>Clave Fiscal</label>
    <div class="field-row">
      <div class="field-value" id="clave">{clave_plaintext}</div>
      <button class="btn-copy" onclick="copiar('clave', this)">Copiar</button>
    </div>
  </div>

  <div class="divider"></div>

  <ol class="steps">
    <li><strong>CUIT ya copiado</strong> - pega en el campo de CUIT</li>
    <li>Hace clic en <strong>Siguiente</strong></li>
    <li>Volve aca, copia la <strong>Clave Fiscal</strong> y pegala</li>
    <li>Hace clic en <strong>Ingresar</strong></li>
  </ol>

  <a class="btn-arca" href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" rel="noopener">
    Abrir ARCA
  </a>

  <div class="auto-msg" id="auto-msg"></div>
</div>

<script>
  // Auto-copy CUIT on page load
  const badge = document.getElementById('auto-badge');
  badge.style.display = 'none';
  navigator.clipboard.writeText('{cliente.cuit_login}').then(() => {{
    badge.style.display = 'inline-block';
    document.getElementById('auto-msg').textContent = 'CUIT copiado al portapapeles';
    setTimeout(() => {{ document.getElementById('auto-msg').textContent = ''; }}, 3000);
  }}).catch(() => {{
    badge.style.display = 'none';
  }});

  function copiar(id, btn) {{
    const text = document.getElementById(id).textContent;
    navigator.clipboard.writeText(text).then(() => {{
      btn.textContent = 'Copiado!';
      btn.classList.add('copied');
      setTimeout(() => {{ btn.textContent = 'Copiar'; btn.classList.remove('copied'); }}, 2000);
    }});
  }}
</script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.put("/{client_id}", response_model=ClienteResponse)
async def update_client(
    client_id: int,
    payload: ClienteUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Actualizar un cliente existente."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "clave_fiscal" in update_data and update_data["clave_fiscal"]:
        update_data["clave_fiscal"] = encrypt_clave(update_data["clave_fiscal"])
    for field, value in update_data.items():
        setattr(cliente, field, value)

    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    tenant_id: Annotated[int, Depends(get_current_tenant_id)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Eliminar un cliente."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == client_id, Cliente.tenant_id == tenant_id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    await db.delete(cliente)
    await db.commit()
