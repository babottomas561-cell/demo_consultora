from fastapi import FastAPI
from app.api.v1 import companies, auth, sync, dashboard

import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="demo_consultora API")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
async def ping():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["companies"])
app.include_router(sync.router, prefix="/api/v1/sync", tags=["sync"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
