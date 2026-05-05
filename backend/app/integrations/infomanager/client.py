from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx


class InfomanagerApiClient:
    def __init__(self, base_url: str, client_id: str, client_secret: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self._access_token: str | None = None
        self._expires_at: datetime | None = None
        self._http = httpx.AsyncClient(timeout=30)

    async def close(self) -> None:
        await self._http.aclose()

    async def login(self) -> str:
        response = await self._http.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"client_id": self.client_id, "client_secret": self.client_secret},
        )
        response.raise_for_status()
        payload = response.json()
        self._access_token = payload["access_token"]
        expires_in = int(payload.get("expires_in") or 86400)
        self._expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        return self._access_token

    def _token_needs_refresh(self) -> bool:
        if not self._access_token or not self._expires_at:
            return True
        return datetime.now(timezone.utc) >= self._expires_at - timedelta(minutes=30)

    async def _headers(self) -> dict[str, str]:
        if self._token_needs_refresh():
            await self.login()
        return {"Authorization": f"Bearer {self._access_token}"}

    async def request(self, method: str, path: str, *, params: dict[str, Any] | None = None) -> Any:
        response = await self._http.request(method, f"{self.base_url}{path}", headers=await self._headers(), params=params)
        if response.status_code == 401:
            await self.login()
            response = await self._http.request(
                method,
                f"{self.base_url}{path}",
                headers={"Authorization": f"Bearer {self._access_token}"},
                params=params,
            )
        response.raise_for_status()
        return response.json()

    async def get_paginated(self, path: str, *, params: dict[str, Any] | None = None, limit: int = 500) -> list[dict]:
        rows: list[dict] = []
        page = 1
        base_params = dict(params or {})
        while True:
            payload = await self.request("GET", path, params={**base_params, "page": page, "limit": limit})
            batch = payload if isinstance(payload, list) else payload.get("data", [])
            if not batch:
                break
            rows.extend(batch)
            total = payload.get("total") if isinstance(payload, dict) else None
            if total is not None and len(rows) >= int(total):
                break
            if len(batch) < limit:
                break
            page += 1
        return rows

    async def get_clientes(self) -> list[dict]:
        return await self.get_paginated("/api/v1/clientes")

    async def get_articulos(self) -> list[dict]:
        return await self.get_paginated("/api/v1/articulos")

    async def get_ventas(self, fecha_desde: str, fecha_hasta: str) -> list[dict]:
        return await self.get_paginated(
            "/api/v1/ventas",
            params={"fechaDesde": fecha_desde, "fechaHasta": fecha_hasta},
        )

    async def get_venta_items(self, fecha_desde: str, fecha_hasta: str) -> list[dict]:
        return await self.get_paginated(
            "/api/v1/ventas/items",
            params={"fechaDesde": fecha_desde, "fechaHasta": fecha_hasta},
        )
