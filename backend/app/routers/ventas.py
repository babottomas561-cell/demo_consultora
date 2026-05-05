from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.bi_customer import BiCustomer
from app.models.bi_product import BiProduct
from app.models.bi_rubro import BiRubro
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem
from app.models.bi_vendedor import BiVendedor

router = APIRouter(prefix="/ventas", tags=["ventas"])

FACTURAS = ("FA",)


@router.get("")
async def list_ventas(
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    cod_cliente: int | None = None,
    cod_vendedor: int | None = None,
    tipo_comprobante: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    if not fecha_hasta:
        fecha_hasta = date.today()
    if not fecha_desde:
        fecha_desde = fecha_hasta - timedelta(days=30)

    filters = [BiSale.fecha >= fecha_desde, BiSale.fecha <= fecha_hasta]
    if cod_cliente:
        filters.append(BiSale.cod_cliente == cod_cliente)
    if cod_vendedor:
        filters.append(BiSale.cod_vendedor == cod_vendedor)
    if tipo_comprobante:
        filters.append(BiSale.tipo_comprobante == tipo_comprobante)
    else:
        filters.append(BiSale.anulada == "N")

    total_r = await db.execute(select(func.count()).select_from(BiSale).where(and_(*filters)))
    total = int(total_r.scalar_one())

    r = await db.execute(
        select(BiSale)
        .where(and_(*filters))
        .order_by(desc(BiSale.fecha), desc(BiSale.source_sale_id))
        .limit(limit).offset(offset)
    )
    sales = r.scalars().all()

    cod_clientes = list({s.cod_cliente for s in sales if s.cod_cliente})
    cod_vendedores = list({s.cod_vendedor for s in sales if s.cod_vendedor})

    names_map: dict[int, str] = {}
    if cod_clientes:
        cr = await db.execute(select(BiCustomer.cod_cliente, BiCustomer.nombre).where(BiCustomer.cod_cliente.in_(cod_clientes)))
        names_map = {c.cod_cliente: c.nombre for c in cr.all()}

    vendedores_map: dict[int, str] = {}
    if cod_vendedores:
        vr = await db.execute(select(BiVendedor.cod_vendedor, BiVendedor.nombre).where(BiVendedor.cod_vendedor.in_(cod_vendedores)))
        vendedores_map = {v.cod_vendedor: v.nombre for v in vr.all()}

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": s.source_sale_id,
                "fecha": s.fecha.isoformat(),
                "tipo_comprobante": s.tipo_comprobante,
                "tipo_factura": s.tipo_factura,
                "numero": s.numero,
                "punto_de_venta": s.punto_de_venta,
                "total": round(float(s.total or 0), 2),
                "neto": round(float(s.neto or 0), 2),
                "iva_importe": round(float(s.iva_importe or 0), 2),
                "cod_cliente": s.cod_cliente,
                "cliente_nombre": names_map.get(s.cod_cliente, f"Cliente {s.cod_cliente}"),
                "cod_vendedor": s.cod_vendedor,
                "vendedor_nombre": vendedores_map.get(s.cod_vendedor, ""),
                "condicion_venta": s.condicion_venta_tipo,
                "anulada": s.anulada,
            }
            for s in sales
        ],
    }


@router.get("/{venta_id}")
async def get_venta(venta_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(BiSale).where(BiSale.source_sale_id == venta_id))
    sale = r.scalar_one_or_none()
    if not sale:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    items_r = await db.execute(
        select(BiSaleItem).where(
            and_(BiSaleItem.source_sale_id == venta_id, BiSaleItem.source_id == sale.source_id)
        )
    )
    items = items_r.scalars().all()

    # Enriquecer items con descripción de artículo
    cod_articulos = [i.cod_articulo for i in items if i.cod_articulo]
    products_map: dict[int, tuple[str, int]] = {}
    if cod_articulos:
        pr = await db.execute(
            select(BiProduct.cod_articulo, BiProduct.descripcion, BiProduct.cod_rubro)
            .where(BiProduct.cod_articulo.in_(cod_articulos))
        )
        products_map = {p.cod_articulo: (p.descripcion, p.cod_rubro) for p in pr.all()}

    rubros_map: dict[int, str] = {}
    if products_map:
        rubro_ids = list({v[1] for v in products_map.values() if v[1]})
        if rubro_ids:
            rr = await db.execute(select(BiRubro.cod_rubro, BiRubro.descripcion).where(BiRubro.cod_rubro.in_(rubro_ids)))
            rubros_map = {r.cod_rubro: r.descripcion for r in rr.all()}

    # Cliente y vendedor
    cliente_nombre = f"Cliente {sale.cod_cliente}"
    if sale.cod_cliente:
        cr = await db.execute(select(BiCustomer.nombre).where(BiCustomer.cod_cliente == sale.cod_cliente))
        row = cr.scalar_one_or_none()
        if row:
            cliente_nombre = row

    vendedor_nombre = ""
    if sale.cod_vendedor:
        vr = await db.execute(select(BiVendedor.nombre).where(BiVendedor.cod_vendedor == sale.cod_vendedor))
        row = vr.scalar_one_or_none()
        if row:
            vendedor_nombre = row

    margin = sum(
        (i.precio_con_iva - i.precio_compra_actual) * i.cantidad
        for i in items
        if i.precio_con_iva and i.precio_compra_actual
    )

    return {
        "id": sale.source_sale_id,
        "fecha": sale.fecha.isoformat(),
        "tipo_comprobante": sale.tipo_comprobante,
        "tipo_factura": sale.tipo_factura,
        "numero": sale.numero,
        "punto_de_venta": sale.punto_de_venta,
        "total": round(float(sale.total or 0), 2),
        "neto": round(float(sale.neto or 0), 2),
        "iva_importe": round(float(sale.iva_importe or 0), 2),
        "margen": round(margin, 2),
        "margen_pct": round(margin / float(sale.total) * 100, 1) if sale.total else 0,
        "cod_cliente": sale.cod_cliente,
        "cliente_nombre": cliente_nombre,
        "cod_vendedor": sale.cod_vendedor,
        "vendedor_nombre": vendedor_nombre,
        "anulada": sale.anulada,
        "items": [
            {
                "id": i.source_item_id,
                "cod_articulo": i.cod_articulo,
                "descripcion": products_map.get(i.cod_articulo, (i.detalle or "", None))[0],
                "rubro": rubros_map.get((products_map.get(i.cod_articulo, (None, None))[1] or 0), ""),
                "cantidad": i.cantidad,
                "precio_unitario": round(float(i.precio_con_iva or 0), 2),
                "precio_compra": round(float(i.precio_compra_actual or 0), 2),
                "margen_item": round((float(i.precio_con_iva or 0) - float(i.precio_compra_actual or 0)) * float(i.cantidad or 0), 2),
                "importe": round(float(i.importe or 0), 2),
                "descuento_porc": i.descuento_porc,
            }
            for i in items
        ],
    }
