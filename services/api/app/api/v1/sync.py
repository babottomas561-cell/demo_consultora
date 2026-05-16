import os
import uuid
import shutil
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.api.deps import get_current_user
from celery.result import AsyncResult
from celery import Celery
from app.core.config import settings

router = APIRouter()

# Instantiate celery client for triggering tasks and polling status
celery_client = Celery(
    "api_client",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.central import Company, CompanyConnector
from sqlalchemy import select
from fastapi import Depends, Form
    
@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    company_id: int = Form(None),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_company_id = company_id if (company_id and current_user.is_admin) else current_user.company_id
    if not target_company_id:
        raise HTTPException(status_code=400, detail="User not associated with a company and no company_id provided")
        
    result = await db.execute(select(Company).filter(Company.id == target_company_id))
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")
        
    tenant_schema = company.tenant_schema
    
    # Save file to /tmp
    os.makedirs("/tmp/demo_consultora", exist_ok=True)
    filename = f"/tmp/demo_consultora/{tenant_schema}_{uuid.uuid4()}_{file.filename}"
    
    with open(filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Trigger Celery task
    task = celery_client.send_task(
        "tasks.excel.process_excel",
        args=[tenant_schema, filename, ""]
    )
    
    return {"job_id": task.id, "status": "processing"}

@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    current_user = Depends(get_current_user)
):
    task_result = AsyncResult(job_id, app=celery_client)
    
    response = {
        "job_id": job_id,
        "status": task_result.status.lower() # processing, done, failed (from pending, success, failure)
    }
    
    if task_result.status == "SUCCESS":
        response["status"] = "done"
        response["result"] = task_result.result
    elif task_result.status == "FAILURE":
        response["status"] = "failed"
        response["error"] = str(task_result.result)
    elif task_result.status in ["PENDING", "STARTED"]:
        response["status"] = "processing"
        
    return response


class InfomanagerSyncRequest(BaseModel):
    company_id: int
    mode: Literal["full", "incremental"] = "full"


@router.post("/infomanager")
async def sync_infomanager(
    body: InfomanagerSyncRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == body.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if not current_user.is_admin and current_user.company_id != body.company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if company.erp_type != "infomanager":
        raise HTTPException(status_code=400, detail="Company is not of type infomanager")

    conn_result = await db.execute(
        select(CompanyConnector).where(
            CompanyConnector.company_id == body.company_id,
            CompanyConnector.connector_type == "INFOMANAGER",
        )
    )
    connector = conn_result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Infomanager connector not found for this company")

    connector.sync_status = "pending"
    connector.sync_error = None
    await db.commit()

    erp_config = {
        "client_id": connector.client_id,
        "client_secret": connector.client_secret,
        "base_url": connector.base_url,
    }

    if body.mode == "full":
        task = celery_client.send_task(
            "tasks.sync_infomanager.sync_completo",
            kwargs={
                "tenant_schema": company.tenant_schema,
                "erp_config": erp_config,
                "connector_id": connector.id,
            },
        )
    else:
        task = celery_client.send_task(
            "tasks.sync_infomanager.sync_company",
            args=[body.company_id, connector.id],
        )

    return {"job_id": task.id, "status": "processing", "mode": body.mode}


@router.post("/infomanager/direct")
async def sync_infomanager_direct(
    body: InfomanagerSyncRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run sync_completo synchronously (bypasses Celery — use if worker is down)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")

    result = await db.execute(select(Company).where(Company.id == body.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    conn_result = await db.execute(
        select(CompanyConnector).where(
            CompanyConnector.company_id == body.company_id,
            CompanyConnector.connector_type == "INFOMANAGER",
        )
    )
    connector = conn_result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    erp_config = {
        "client_id": connector.client_id,
        "client_secret": connector.client_secret,
        "base_url": connector.base_url,
    }
    tenant_schema = company.tenant_schema

    def _run_sync():
        import sys
        # Worker code co-located in /app/services/worker or /worker
        for p in ["/app/services/worker", "/worker", "/app/worker"]:
            if os.path.exists(p) and p not in sys.path:
                sys.path.insert(0, p)
        from tasks.sync_infomanager import sync_completo
        return sync_completo(tenant_schema=tenant_schema, erp_config=erp_config, connector_id=connector.id)

    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=1)
    try:
        sync_result = await loop.run_in_executor(executor, _run_sync)
        return {"status": "ok", "result": sync_result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        executor.shutdown(wait=False)
