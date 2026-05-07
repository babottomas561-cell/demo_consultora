import os
import sys

sys.path.insert(0, os.path.abspath("services/api"))

from app.core.tenant import run_tenant_migrations
import asyncio

run_tenant_migrations("tenant_dashboard_corp_4")
