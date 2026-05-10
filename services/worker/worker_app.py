import os
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

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
}
