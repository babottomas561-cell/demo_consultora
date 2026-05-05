"""
Servicio de sincronización Infomanager → PostgreSQL.

Primer sync: trae los últimos IM_SYNC_DAYS_INITIAL días.
Syncs siguientes: trae solo los últimos 5 minutos (incremental).
Usa upsert (INSERT ... ON CONFLICT DO UPDATE) para no duplicar datos.
"""

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.infomanager_client import im_client

logger = logging.getLogger(__name__)

# Fecha del último sync exitoso — en memoria, se resetea si el proceso reinicia
_last_sync_at: datetime | None = None


def _sync_date_range() -> tuple[date, date]:
    """
    Primer sync → últimos IM_SYNC_DAYS_INITIAL días.
    Syncs siguientes → desde 1 día atrás para no perder nada (ventana generosa).
    """
    today = date.today()
    if _last_sync_at is None:
        start = today - timedelta(days=settings.im_sync_days_initial)
    else:
        start = today - timedelta(days=1)
    return start, today


async def sync_ventas(db: AsyncSession) -> int:
    """
    Sincroniza ventas e ítems desde Infomanager.
    Devuelve la cantidad de comprobantes procesados.
    """
    global _last_sync_at

    fecha_desde, fecha_hasta = _sync_date_range()

    try:
        raw = await im_client.get_ventas(fecha_desde, fecha_hasta)
    except Exception as exc:
        logger.error("Infomanager sync_ventas error: %s", exc)
        return 0

    if not raw:
        _last_sync_at = datetime.now(timezone.utc)
        return 0

    ventas_rows = []
    items_rows = []

    for entry in raw:
        v = entry.get("venta", entry)          # algunos endpoints devuelven {venta:{}, items:[]}
        items = entry.get("items", [])

        ventas_rows.append({
            "im_id":                int(v["id"]),
            "fecha":                v.get("fecha"),
            "tipo_comprobante":     v.get("tipo_comprobante", ""),
            "tipo_factura":         v.get("tipo_factura"),
            "numero":               v.get("numero"),
            "punto_de_venta":       v.get("punto_de_venta"),
            "total":                float(v.get("total") or 0),
            "neto":                 float(v.get("neto") or 0),
            "iva_importe":          float(v.get("iva_importe") or 0),
            "no_grabado":           float(v.get("no_grabado") or 0),
            "cod_cliente":          v.get("cod_cliente"),
            "cod_vendedor":         v.get("cod_vendedor"),
            "cod_empresa":          int(v.get("cod_empresa") or 1),
            "moneda":               v.get("moneda"),
            "cotizacion":           float(v.get("cotizacion") or 1),
            "condicion_venta_tipo": v.get("condicion_venta_tipo"),
            "anulada":              v.get("anulada", "N"),
        })

        for item in items:
            items_rows.append({
                "im_id":                int(item["id"]),
                "im_venta_id":          int(v["id"]),
                "cod_articulo":         item.get("cod_articulo"),
                "cantidad":             float(item.get("cantidad") or 0),
                "precio_orig":          float(item.get("precio_orig") or 0),
                "precio":               float(item.get("precio") or 0),
                "precio_con_iva":       float(item.get("precio_con_iva") or 0),
                "precio_compra_actual": float(item.get("precio_compra_actual") or 0),
                "iva_por":              float(item.get("iva_por") or 0),
                "importe":              float(item.get("importe") or 0),
                "descuento_porc":       float(item.get("descuento_porc") or 0),
                "detalle":              item.get("detalle", ""),
            })

    # Upsert cabeceras — ON CONFLICT DO UPDATE actualiza si ya existe
    if ventas_rows:
        await db.execute(
            text("""
                INSERT INTO im_ventas
                    (im_id, fecha, tipo_comprobante, tipo_factura, numero, punto_de_venta,
                     total, neto, iva_importe, no_grabado, cod_cliente, cod_vendedor,
                     cod_empresa, moneda, cotizacion, condicion_venta_tipo, anulada)
                VALUES
                    (:im_id, :fecha, :tipo_comprobante, :tipo_factura, :numero, :punto_de_venta,
                     :total, :neto, :iva_importe, :no_grabado, :cod_cliente, :cod_vendedor,
                     :cod_empresa, :moneda, :cotizacion, :condicion_venta_tipo, :anulada)
                ON CONFLICT (im_id) DO UPDATE SET
                    total = EXCLUDED.total,
                    neto  = EXCLUDED.neto,
                    anulada = EXCLUDED.anulada,
                    synced_at = now()
            """),
            ventas_rows,
        )

    # Upsert ítems
    if items_rows:
        await db.execute(
            text("""
                INSERT INTO im_venta_items
                    (im_id, im_venta_id, cod_articulo, cantidad, precio_orig, precio,
                     precio_con_iva, precio_compra_actual, iva_por, importe, descuento_porc, detalle)
                VALUES
                    (:im_id, :im_venta_id, :cod_articulo, :cantidad, :precio_orig, :precio,
                     :precio_con_iva, :precio_compra_actual, :iva_por, :importe, :descuento_porc, :detalle)
                ON CONFLICT (im_id) DO UPDATE SET
                    cantidad             = EXCLUDED.cantidad,
                    precio_con_iva       = EXCLUDED.precio_con_iva,
                    precio_compra_actual = EXCLUDED.precio_compra_actual,
                    importe              = EXCLUDED.importe
            """),
            items_rows,
        )

    await db.commit()
    _last_sync_at = datetime.now(timezone.utc)
    logger.info("Sync OK: %d ventas, %d ítems (%s → %s)", len(ventas_rows), len(items_rows), fecha_desde, fecha_hasta)
    return len(ventas_rows)
