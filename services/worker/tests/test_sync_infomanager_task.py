import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from worker_app import celery_app
from tasks.sync_infomanager import sync_all_companies, sync_company


def test_sync_infomanager_tasks_are_registered_with_celery():
    assert sync_company.name == "tasks.sync_infomanager.sync_company"
    assert sync_all_companies.name == "tasks.sync_infomanager.sync_all_companies"
    assert "tasks.sync_infomanager" in celery_app.conf.include


def test_sync_all_companies_is_scheduled_every_six_hours():
    schedule = celery_app.conf.beat_schedule["sync-all-companies"]

    assert schedule["task"] == "tasks.sync_infomanager.sync_all_companies"
    assert str(schedule["schedule"]) == "<crontab: 0 */6 * * * (m/h/dM/MY/d)>"
