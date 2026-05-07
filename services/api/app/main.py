from fastapi import FastAPI
from app.api.v1 import companies, auth

app = FastAPI(title="demo_consultora API")

@app.get("/ping")
async def ping():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["companies"])
