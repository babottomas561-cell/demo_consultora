"""
Cliente HTTP para la API de Infomanager.
Se autentica una vez, cachea el token y lo renueva automáticamente si expira.
Toda comunicación con Infomanager pasa por acá — los services nunca llaman a httpx directamente.
"""

import logging
from datetime import date, datetime, timedelta

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

PAGE_SIZE = 100  # registros por página en cada consulta paginada


class InfomanagerClient:
    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expires_at: datetime | None = None
        self._http = httpx.AsyncClient(timeout=30)

    async def close(self) -> None:
        await self._http.aclose()

    # ------------------------------------------------------------------ auth

    async def _authenticate(self) -> None:
        """Obtiene un access token con client_id + client_secret."""
        resp = await self._http.post(
            f"{settings.im_base_url}/v1/auth",
            json={"client_id": settings.im_client_id, "client_secret": settings.im_client_secret},
        )
        resp.raise_for_status()
        token = resp.json()  # la API devuelve el token directamente como string
        self._token = token.strip('"')
        # Asumimos tokens de 1 hora; re-autenticamos 5 min antes de que expire
        self._token_expires_at = datetime.utcnow() + timedelta(minutes=55)
        logger.info("Infomanager: token obtenido correctamente")

    async def _headers(self) -> dict:
        """Devuelve headers con Bearer token, renovando si expiró."""
        if not self._token or datetime.utcnow() >= (self._token_expires_at or datetime.min):
            await self._authenticate()
        return {"Authorization": f"Bearer {self._token}"}

    # ------------------------------------------------------------------ ventas

    async def get_ventas(self, fecha_desde: date, fecha_hasta: date) -> list[dict]:
        """
        Trae todos los comprobantes de venta entre dos fechas.
        Maneja la paginación automáticamente y devuelve una lista plana.
        """
        desde = fecha_desde.strftime("%Y%m%d")
        hasta = fecha_hasta.strftime("%Y%m%d")
        headers = await self._headers()
        ventas: list[dict] = []
        page = 1

        while True:
            resp = await self._http.get(
                f"{settings.im_base_url}/v1/ventas",
                headers=headers,
                params={"fechaDesde": desde, "fechaHasta": hasta, "page": page, "limit": PAGE_SIZE},
            )
            resp.raise_for_status()
            data = resp.json()

            # La API devuelve lista de objetos {venta: {...}, items: [...]}
            batch = data if isinstance(data, list) else data.get("data", [])
            if not batch:
                break

            ventas.extend(batch)
            if len(batch) < PAGE_SIZE:
                break
            page += 1

        logger.info("Infomanager: %d comprobantes de venta obtenidos (%s → %s)", len(ventas), desde, hasta)
        return ventas

    # ------------------------------------------------------------------ clientes

    async def get_clientes(self) -> list[dict]:
        """Trae todos los clientes paginados."""
        headers = await self._headers()
        clientes: list[dict] = []
        page = 1

        while True:
            resp = await self._http.get(
                f"{settings.im_base_url}/v1/clientes",
                headers=headers,
                params={"page": page, "limit": PAGE_SIZE},
            )
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break
            clientes.extend(batch if isinstance(batch, list) else batch.get("data", []))
            if len(batch) < PAGE_SIZE:
                break
            page += 1

        logger.info("Infomanager: %d clientes obtenidos", len(clientes))
        return clientes

    # ------------------------------------------------------------------ artículos

    async def get_articulos(self) -> list[dict]:
        """Trae todos los artículos paginados."""
        headers = await self._headers()
        articulos: list[dict] = []
        page = 1

        while True:
            resp = await self._http.get(
                f"{settings.im_base_url}/v1/articulos",
                headers=headers,
                params={"page": page, "limit": PAGE_SIZE},
            )
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break
            articulos.extend(batch if isinstance(batch, list) else batch.get("data", []))
            if len(batch) < PAGE_SIZE:
                break
            page += 1

        logger.info("Infomanager: %d artículos obtenidos", len(articulos))
        return articulos


# Instancia singleton — se crea una vez y la comparten todos los servicios
im_client = InfomanagerClient()
