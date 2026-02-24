"""
In-process async task runner for scraping.
Replaces Celery for MVP deployment - runs scraping sequentially
in a background thread within the FastAPI process.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.client import Cliente
from app.models.consultation import Consulta
from app.models.download import Descarga

logger = logging.getLogger("task_runner")

# Sync DB for scraping thread (Playwright is sync)
_sync_db_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
sync_engine = create_engine(_sync_db_url)
SyncSession = sessionmaker(sync_engine)

# Global queue and state
_queue: asyncio.Queue | None = None
_processor_task: asyncio.Task | None = None


async def get_queue() -> asyncio.Queue:
    global _queue
    if _queue is None:
        _queue = asyncio.Queue()
    return _queue


async def enqueue_scraping(consulta_id: int, tenant_id: int):
    """Add a scraping job to the queue. Starts processor if not running."""
    q = await get_queue()
    await q.put((consulta_id, tenant_id))
    logger.info(f"Encolada consulta {consulta_id} para tenant {tenant_id} (queue size: {q.qsize()})")
    await _ensure_processor_running()


async def _ensure_processor_running():
    global _processor_task
    if _processor_task is None or _processor_task.done():
        _processor_task = asyncio.create_task(_process_queue())


async def _process_queue():
    """Process scraping jobs one by one (sequential execution)."""
    q = await get_queue()
    logger.info("Iniciando procesador de scraping")
    try:
        while True:
            try:
                consulta_id, tenant_id = await asyncio.wait_for(q.get(), timeout=30.0)
            except asyncio.TimeoutError:
                logger.info("Cola vacia por 30s, deteniendo procesador")
                break

            logger.info(f"Procesando consulta {consulta_id}")
            try:
                await asyncio.to_thread(_sync_scrape, consulta_id, tenant_id)
            except Exception as e:
                logger.error(f"Error procesando consulta {consulta_id}: {e}", exc_info=True)
            finally:
                q.task_done()
    except Exception as e:
        logger.error(f"Error fatal en procesador: {e}", exc_info=True)
    finally:
        logger.info("Procesador de scraping detenido")


def _sync_scrape(consulta_id: int, tenant_id: int):
    """Run a single scraping job (runs in thread)."""
    with SyncSession() as db:
        consulta = db.get(Consulta, consulta_id)
        if not consulta or consulta.tenant_id != tenant_id:
            logger.error(f"Consulta {consulta_id} no encontrada")
            return

        cliente = db.get(Cliente, consulta.cliente_id)
        if not cliente:
            consulta.estado = "error"
            consulta.error_detalle = "Cliente no encontrado"
            db.commit()
            return

        # Update status
        consulta.estado = "en_proceso"
        db.commit()
        logger.info(f"Scraping: {cliente.nombre} (CUIT: {cliente.cuit_consulta})")

        try:
            from app.services.scraper import ARCAScraper

            scraper = ARCAScraper(
                headless=settings.HEADLESS,
                min_delay=settings.MIN_DELAY,
                max_delay=settings.MAX_DELAY,
                download_base_dir=settings.DOWNLOAD_DIR,
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
                logger.info(f"Consulta {consulta_id} exitosa: {resultado.get('archivo')}")

                # Save table data extracted from ARCA screen
                tabla_datos = resultado.get("tabla_datos", [])
                if tabla_datos:
                    for row in tabla_datos:
                        descarga = Descarga(
                            tenant_id=tenant_id,
                            consulta_id=consulta_id,
                            cliente_id=consulta.cliente_id,
                            estado=row.get("estado", ""),
                            cuit_cuil=row.get("cuit_cuil", ""),
                            formulario=row.get("formulario", ""),
                            periodo=row.get("periodo", ""),
                            transaccion=row.get("transaccion", ""),
                            fecha_presentacion=row.get("fecha_presentacion", ""),
                        )
                        db.add(descarga)
                    logger.info(f"Guardados {len(tabla_datos)} registros de tabla ARCA en DB")
            else:
                consulta.estado = "error"
                consulta.error_detalle = resultado.get("error", "Error desconocido")
                logger.warning(f"Consulta {consulta_id} error: {consulta.error_detalle}")

            db.commit()

            # Check if batch complete and notify
            _check_and_notify_batch_complete(db, tenant_id)

        except Exception as e:
            consulta.estado = "error"
            consulta.error_detalle = str(e)[:500]
            db.commit()
            logger.error(f"Error en scraping consulta {consulta_id}: {e}", exc_info=True)


def _check_and_notify_batch_complete(db, tenant_id: int):
    """Check if all pending consultations are done and send notification."""
    pending = db.scalar(
        select(Consulta).where(
            Consulta.tenant_id == tenant_id,
            Consulta.estado.in_(["pendiente", "en_proceso"]),
        )
    )
    if pending is None:
        try:
            from app.services.email import notify_batch_complete
            notify_batch_complete(db, tenant_id)
        except Exception as e:
            logger.warning(f"Error enviando notificacion: {e}")
