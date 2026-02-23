import logging
import os

from sqlalchemy import func, select
from sqlalchemy.orm import Session

logger = logging.getLogger("email")


def _get_resend():
    """Lazy import resend to avoid issues when API key is not set."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        logger.warning("RESEND_API_KEY no configurada, emails deshabilitados")
        return None

    import resend
    resend.api_key = api_key
    return resend


def send_welcome_email(email: str, nombre: str):
    """Email de bienvenida al registrarse."""
    resend = _get_resend()
    if not resend:
        return

    from_email = os.environ.get("FROM_EMAIL", "DDJJ-ARCA <noreply@example.com>")
    try:
        resend.Emails.send({
            "from": from_email,
            "to": [email],
            "subject": "Bienvenido a DDJJ-ARCA",
            "html": f"""
            <h2>Hola {nombre}!</h2>
            <p>Tu cuenta en DDJJ-ARCA fue creada exitosamente.</p>
            <p>Ya podes cargar tus clientes ARCA y comenzar a consultar declaraciones juradas.</p>
            <p>Saludos,<br>El equipo de DDJJ-ARCA</p>
            """,
        })
        logger.info(f"Email de bienvenida enviado a {email}")
    except Exception as e:
        logger.error(f"Error enviando email de bienvenida: {e}")


def notify_batch_complete(db: Session, tenant_id: int):
    """Notificar al contador que el batch de consultas termino."""
    resend = _get_resend()
    if not resend:
        return

    from app.models.consultation import Consulta
    from app.models.user import Tenant, User

    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        return

    user = db.scalar(select(User).where(User.tenant_id == tenant_id).limit(1))
    if not user:
        return

    # Count results
    from sqlalchemy import and_
    exitosas = db.scalar(
        select(func.count(Consulta.id)).where(
            and_(Consulta.tenant_id == tenant_id, Consulta.estado == "exitoso")
        )
    )
    errores = db.scalar(
        select(func.count(Consulta.id)).where(
            and_(Consulta.tenant_id == tenant_id, Consulta.estado == "error")
        )
    )

    from_email = os.environ.get("FROM_EMAIL", "DDJJ-ARCA <noreply@example.com>")
    try:
        resend.Emails.send({
            "from": from_email,
            "to": [user.email],
            "subject": f"Consultas ARCA finalizadas - {exitosas} exitosas, {errores} errores",
            "html": f"""
            <h2>Consultas finalizadas</h2>
            <p>El procesamiento de consultas ARCA termino:</p>
            <ul>
                <li><strong>Exitosas:</strong> {exitosas}</li>
                <li><strong>Errores:</strong> {errores}</li>
            </ul>
            <p>Ingresa a DDJJ-ARCA para ver los detalles y descargar los archivos CSV.</p>
            <p>Saludos,<br>El equipo de DDJJ-ARCA</p>
            """,
        })
        logger.info(f"Notificacion de batch enviada a {user.email}")
    except Exception as e:
        logger.error(f"Error enviando notificacion de batch: {e}")
