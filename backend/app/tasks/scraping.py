import logging
import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.celery_app import celery
from app.models.client import Cliente
from app.models.consultation import Consulta

logger = logging.getLogger("scraper")

# Celery tasks use SYNC SQLAlchemy (Celery workers are sync)
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/ddjj_arca")
SYNC_DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2").replace("postgresql+psycopg2", "postgresql+psycopg2")
if "asyncpg" in SYNC_DATABASE_URL:
    SYNC_DATABASE_URL = SYNC_DATABASE_URL.replace("+asyncpg", "")

sync_engine = create_engine(SYNC_DATABASE_URL)
SyncSession = sessionmaker(sync_engine)


@celery.task(
    bind=True,
    name="scrape_arca",
    soft_time_limit=300,
    time_limit=360,
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 1},
    retry_backoff=True,
)
def scrape_arca_task(self, consulta_id: int, tenant_id: int):
    """
    Celery task for ARCA scraping.
    Playwright MUST be initialized INSIDE the task (not at module level).
    Run worker with: celery -A app.celery_app worker --pool=solo --loglevel=info
    """
    with SyncSession() as db:
        consulta = db.get(Consulta, consulta_id)
        if not consulta or consulta.tenant_id != tenant_id:
            logger.error(f"Consulta {consulta_id} no encontrada o no pertenece al tenant {tenant_id}")
            return {"error": "Consulta no encontrada"}

        cliente = db.get(Cliente, consulta.cliente_id)
        if not cliente:
            consulta.estado = "error"
            consulta.error_detalle = "Cliente no encontrado"
            db.commit()
            return {"error": "Cliente no encontrado"}

        # Update status to en_proceso
        consulta.estado = "en_proceso"
        db.commit()

        try:
            # Import and create scraper INSIDE the task
            from app.services.scraper import ARCAScraper

            download_dir = os.environ.get("DOWNLOAD_DIR", "descargas")
            scraper = ARCAScraper(
                headless=True,
                min_delay=float(os.environ.get("MIN_DELAY", "1.5")),
                max_delay=float(os.environ.get("MAX_DELAY", "3.5")),
                download_base_dir=download_dir,
            )

            resultado = scraper.ejecutar_consulta(
                cuit_login=cliente.cuit_login,
                clave_fiscal=cliente.clave_fiscal,
                cuit_consulta=cliente.cuit_consulta,
                periodo=consulta.periodo,
                tenant_id=tenant_id,
            )

            if resultado["exito"]:
                consulta.estado = "exitoso"
                consulta.archivo_csv = resultado.get("archivo")
            else:
                consulta.estado = "error"
                consulta.error_detalle = resultado.get("error", "Error desconocido")

            db.commit()

            # Send email notification if batch is complete
            _check_and_notify_batch_complete(db, tenant_id)

            return resultado

        except Exception as e:
            consulta.estado = "error"
            consulta.error_detalle = str(e)
            db.commit()
            logger.error(f"Error en scraping consulta {consulta_id}: {e}", exc_info=True)
            raise


def _check_and_notify_batch_complete(db: Session, tenant_id: int):
    """Check if all pending consultations are done and send notification."""
    pending = db.scalar(
        select(Consulta)
        .where(
            Consulta.tenant_id == tenant_id,
            Consulta.estado.in_(["pendiente", "en_proceso"]),
        )
    )
    if pending is None:
        # All done - trigger email notification
        try:
            from app.services.email import notify_batch_complete
            notify_batch_complete(db, tenant_id)
        except Exception as e:
            logger.warning(f"Error enviando notificacion: {e}")
