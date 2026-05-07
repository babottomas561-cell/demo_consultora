from celery import Celery
from celery.schedules import crontab
import os

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

app = Celery(
    "demo_consultora_beat",
    broker=redis_url,
    backend=redis_url,
    # Need to include the tasks module so Celery Beat knows about them
    include=["tasks.demo_seed"]
)

app.conf.beat_schedule = {
    "tick-demo-ventas": {
        "task": "tasks.demo_seed.tick_demo_ventas",
        "schedule": 1800.0,  # cada 30 minutos
    },
}

app.conf.timezone = "America/Argentina/Buenos_Aires"
