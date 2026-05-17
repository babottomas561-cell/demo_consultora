import logging
import os
import threading
import time
from datetime import datetime, timedelta

import psycopg2
from celery import Celery
from celery.schedules import crontab

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5433/demo_consultora")
SYNC_INTERVAL_SECONDS = int(os.getenv("INFOMANAGER_SYNC_INTERVAL", "30"))  # 30 seconds
FULL_SYNC_INTERVAL_HOURS = int(os.getenv("INFOMANAGER_FULL_SYNC_HOURS", "24"))

celery_app = Celery(
    "worker_app",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "tasks.etl",
        "tasks.excel",
        "tasks.monte_carlo",
        "tasks.forecasting",
        "tasks.clustering",
        "tasks.econometria",
        "tasks.demo_seed",
        "tasks.sync_infomanager",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "sync-all-companies": {
        "task": "tasks.sync_infomanager.sync_all_companies",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "refresh-demo-infomanager": {
        "task": "tasks.demo_seed.refresh_all_demo_infomanager_tables",
        "schedule": timedelta(hours=23),
    },
}


_last_full_sync: dict[str, datetime] = {}
_last_incremental_sync: dict[str, datetime] = {}


def _get_active_infomanager_tenants() -> list[dict]:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT cc.client_id, cc.client_secret, cc.base_url,
                   c.tenant_schema, cc.id AS connector_id, c.id AS company_id
            FROM public.company_connectors cc
            JOIN public.companies c ON c.id = cc.company_id
            WHERE cc.connector_type = 'INFOMANAGER'
              AND c.is_provisioned = TRUE
              AND (
                cc.sync_status <> 'running'
                OR cc.last_sync_at IS NULL
                OR cc.last_sync_at < NOW() - INTERVAL '30 minutes'
              )
            """
        )
        rows = cur.fetchall()
        return [
            {
                "tenant_schema": row[3],
                "connector_id": row[4],
                "company_id": row[5],
                "erp_config": {
                    "client_id": row[0],
                    "client_secret": row[1],
                    "base_url": row[2],
                },
            }
            for row in rows
        ]
    except Exception as exc:
        logger.error(f"[SyncLoop] Error consultando tenants: {exc}")
        return []
    finally:
        cur.close()
        conn.close()


def _sync_loop() -> None:
    logger.info("[SyncLoop] Background thread iniciado")
    # Initial delay to let Celery workers start
    time.sleep(15)
    while True:
        try:
            tenants = _get_active_infomanager_tenants()
            logger.info(f"[SyncLoop] {len(tenants)} tenants activos")

            for tenant in tenants:
                schema = tenant["tenant_schema"]
                erp_config = tenant["erp_config"]
                try:
                    ultima = _last_full_sync.get(schema)
                    needs_full = not ultima or datetime.now() - ultima > timedelta(hours=FULL_SYNC_INTERVAL_HOURS)
                    if needs_full:
                        celery_app.send_task(
                            "tasks.sync_infomanager.sync_completo",
                            kwargs={
                                "tenant_schema": schema,
                                "erp_config": erp_config,
                                "connector_id": tenant["connector_id"],
                            },
                        )
                        _last_full_sync[schema] = datetime.now()
                        logger.info(f"[SyncLoop] FULL → {schema}")
                    else:
                        ultima_inc = _last_incremental_sync.get(schema)
                        secs_since = (datetime.now() - ultima_inc).total_seconds() if ultima_inc else None
                        if not ultima_inc or secs_since >= SYNC_INTERVAL_SECONDS - 5:
                            celery_app.send_task(
                                "tasks.sync_infomanager.sync_incremental",
                                kwargs={
                                    "tenant_schema": schema,
                                    "erp_config": erp_config,
                                    "connector_id": tenant["connector_id"],
                                },
                            )
                            _last_incremental_sync[schema] = datetime.now()
                            logger.info(f"[SyncLoop] INCR → {schema}")
                        else:
                            logger.debug(f"[SyncLoop] SKIP {schema} (last inc {secs_since:.0f}s ago)")
                except Exception as exc:
                    logger.error(f"[SyncLoop] Error en {schema}: {exc}")
                    continue
        except Exception as exc:
            logger.error(f"[SyncLoop] Error general: {exc}")

        time.sleep(SYNC_INTERVAL_SECONDS)


_sync_thread = threading.Thread(target=_sync_loop, daemon=True, name="infomanager-sync-loop")
_sync_thread.start()
