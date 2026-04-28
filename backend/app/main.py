from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth

app = FastAPI(
    title="demo_consultora API",
    version="0.1.0",
    # /docs → UI interactiva Swagger para probar endpoints desde el navegador
    docs_url="/docs",
)

# Sin este middleware, el navegador bloquea todos los requests desde el frontend.
# En producción reemplazar ["*"] con la URL real del frontend en Railway.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health")
def health_check():
    # Endpoint para que Railway verifique que el servicio está vivo.
    return {"status": "ok"}
