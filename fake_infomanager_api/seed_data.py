from __future__ import annotations

import json
import math
import random
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from faker import Faker

from .config import END_DATE, GENERATED_DATA_DIR, RANDOM_SEED, START_DATE

DATA_FILES = {
    "empresas": "empresas.json",
    "clientes": "clientes.json",
    "articulos": "articulos.json",
    "vendedores": "vendedores.json",
    "rubros": "rubros.json",
    "subrubros": "subrubros.json",
    "cotizaciones": "cotizaciones.json",
    "ventas": "ventas.json",
    "venta_items": "venta_items.json",
    "macro": "macro.json",
}


def parse_yyyymmdd(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y%m%d").date()
    except ValueError as exc:
        raise ValueError("Date must use AAAAMMDD format") from exc


def paginate(rows: list[dict[str, Any]], page: int = 1, limit: int = 100) -> dict[str, Any]:
    total = len(rows)
    if page == 0 and limit == 0:
        return {"total": total}
    page = max(page, 1)
    limit = max(min(limit, 1000), 1)
    start = (page - 1) * limit
    return {"page": page, "limit": limit, "total": total, "data": rows[start : start + limit]}


def load_data(force: bool = False) -> dict[str, list[dict[str, Any]]]:
    GENERATED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    if force or not all((GENERATED_DATA_DIR / filename).exists() for filename in DATA_FILES.values()):
        generate_data()

    data = {}
    for key, filename in DATA_FILES.items():
        with (GENERATED_DATA_DIR / filename).open("r", encoding="utf-8") as handle:
            data[key] = json.load(handle)
    return data


def generate_data() -> None:
    rng = random.Random(RANDOM_SEED)
    fake = Faker("es_AR")
    Faker.seed(RANDOM_SEED)

    start = date.fromisoformat(START_DATE)
    end = date.fromisoformat(END_DATE)
    days = list(_daterange(start, end))

    empresas = [_empresa()]
    vendedores = _vendedores(rng, fake)
    rubros = _rubros()
    subrubros = _subrubros(rng, rubros)
    clientes = _clientes(rng, fake, vendedores)
    articulos = _articulos(rng, subrubros)
    macro, cotizaciones = _macro(days, rng)
    ventas, venta_items = _ventas(days, rng, clientes, articulos, vendedores, macro)

    payloads = {
        "empresas": empresas,
        "clientes": clientes,
        "articulos": articulos,
        "vendedores": vendedores,
        "rubros": rubros,
        "subrubros": subrubros,
        "cotizaciones": cotizaciones,
        "ventas": ventas,
        "venta_items": venta_items,
        "macro": macro,
    }

    for key, rows in payloads.items():
        path = GENERATED_DATA_DIR / DATA_FILES[key]
        with path.open("w", encoding="utf-8") as handle:
            json.dump(rows, handle, ensure_ascii=False, separators=(",", ":"))


def _daterange(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _empresa() -> dict[str, str]:
    return {
        "id": "51499783",
        "cod_empresa": "1",
        "nombre": "Distribuidora San Miguel S.A.",
        "nombre_1": "DSM",
        "direccion": "San Miguel de Tucumán",
        "cuit": "30-00000000-1",
        "telefonos": "3810000000",
        "categoria_iva": "RI",
        "cod_deposito": "1",
        "email": "admin@dsm.com",
        "cod_cliente": "0",
        "habilitada": "S",
    }


def _vendedores(rng: random.Random, fake: Faker) -> list[dict[str, str]]:
    return [
        {
            "id": str(52000000 + idx),
            "cod_vendedor": str(idx),
            "nombre": fake.name(),
            "habilitado": "S",
        }
        for idx in range(1, rng.randint(8, 15) + 1)
    ]


def _rubros() -> list[dict[str, str]]:
    names = [
        "Almacén",
        "Bebidas",
        "Limpieza",
        "Perfumería",
        "Lácteos",
        "Congelados",
        "Snacks",
        "Mascotas",
        "Panificados",
        "Bazar",
    ]
    return [{"id": str(53000000 + idx), "cod_rubro": str(idx), "descripcion": name} for idx, name in enumerate(names, 1)]


def _subrubros(rng: random.Random, rubros: list[dict[str, str]]) -> list[dict[str, str]]:
    suffixes = ["Premium", "Familiar", "Económico", "Mayorista"]
    rows = []
    code = 1
    for rubro in rubros:
        for suffix in rng.sample(suffixes, rng.randint(2, 4)):
            rows.append(
                {
                    "id": str(53100000 + code),
                    "cod_subrubro": str(code),
                    "cod_rubro": rubro["cod_rubro"],
                    "descripcion": f"{rubro['descripcion']} {suffix}",
                }
            )
            code += 1
    return rows


def _clientes(rng: random.Random, fake: Faker, vendedores: list[dict[str, str]]) -> list[dict[str, Any]]:
    rows = []
    for code in range(1, rng.randint(80, 150) + 1):
        dni = str(rng.randint(20_000_000, 39_999_999))
        business = fake.company()
        rows.append(
            {
                "id": str(53683887 + code),
                "cod_cliente": str(code),
                "nombre": business,
                "categoria_iva": rng.choice(["RI", "MT", "CF"]),
                "cod_tipo_doc": "1",
                "numero_doc": dni,
                "cuit": f"30-{dni}-1",
                "cod_cuenta": str(1141000 + code),
                "habilitado": "S",
                "fecha_alta": (date(2023, 1, 1) + timedelta(days=rng.randint(0, 420))).isoformat(),
                "email": fake.company_email(),
                "cod_vendedor": rng.choice(vendedores)["cod_vendedor"],
                "lista_precio": str(rng.randint(1, 4)),
                "domicilio": fake.street_address(),
                "telefonos": f"381{rng.randint(1000000, 9999999)}",
                "razon_social": business,
                "condicion_venta": rng.choice([1, 2, 3]),
                "segmento": rng.choice(["supermercado", "kiosco", "almacén", "horeca", "mayorista"]),
            }
        )
    return rows


def _articulos(rng: random.Random, subrubros: list[dict[str, str]]) -> list[dict[str, Any]]:
    nouns = ["Yerba", "Aceite", "Arroz", "Gaseosa", "Detergente", "Shampoo", "Queso", "Galletas", "Café", "Fideos"]
    sizes = ["250g", "500g", "1kg", "1L", "2L", "pack x6", "familiar", "premium"]
    rows = []
    for code in range(1, rng.randint(150, 300) + 1):
        subrubro = rng.choice(subrubros)
        compra = round(rng.uniform(350, 6500), 5)
        margen = rng.uniform(1.25, 1.95)
        descripcion = f"{rng.choice(nouns)} {rng.choice(sizes)} #{code:03d}"
        rows.append(
            {
                "id": str(53686179 + code),
                "cod_articulo": str(90000 + code),
                "descripcion": descripcion,
                "descripcion_corta": descripcion[:45],
                "cod_afip_concepto": "1",
                "cod_cuenta_venta": "4110000",
                "habilitado": "1",
                "iva": "21.00",
                "moneda": "P",
                "precio_compra": f"{compra:.5f}",
                "precio_compra_dolar": "0.00000",
                "precio_venta": f"{compra * margen:.5f}",
                "precio_venta_dolar": "0.00000",
                "tipo_movimiento": "A",
                "cod_compatibilidad": None,
                "cod_rubro": subrubro["cod_rubro"],
                "cod_subrubro": subrubro["cod_subrubro"],
                "cod_barra": f"779{code:010d}",
                "_stock_inicial": rng.randint(80, 900),
                "_elasticidad_precio": round(rng.uniform(0.55, 1.45), 3),
            }
        )
    return rows


def _macro(days: list[date], rng: random.Random) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    monthly_inflation: dict[str, float] = {}
    monthly_salary: dict[str, float] = {}
    dollar = 360.0
    macro = []
    cotizaciones = []
    campaigns = [
        (date(2023, 5, 8), date(2023, 5, 20), "Hot Sale Mayo", 1.18),
        (date(2023, 12, 10), date(2023, 12, 24), "Fiestas", 1.25),
        (date(2024, 5, 13), date(2024, 5, 25), "Hot Sale Mayo", 1.2),
        (date(2024, 11, 4), date(2024, 11, 12), "Cyber Week", 1.17),
        (date(2025, 5, 12), date(2025, 5, 24), "Hot Sale Mayo", 1.21),
        (date(2025, 12, 8), date(2025, 12, 24), "Fiestas", 1.27),
    ]

    for day in days:
        month_key = day.strftime("%Y-%m")
        if month_key not in monthly_inflation:
            month_index = (day.year - 2023) * 12 + day.month
            monthly_inflation[month_key] = round(max(1.7, rng.gauss(5.0 - month_index * 0.045, 1.15)), 2)
            monthly_salary[month_key] = round(96 + math.sin(month_index / 2.8) * 5 + rng.uniform(-2.5, 2.5), 2)

        monthly_rate = monthly_inflation[month_key] / 100
        dollar *= 1 + monthly_rate / 30 + rng.uniform(-0.004, 0.006)
        campaign = next((name for start, end, name, _boost in campaigns if start <= day <= end), None)
        campaign_boost = next((_boost for start, end, _name, _boost in campaigns if start <= day <= end), 1.0)
        row = {
            "fecha": day.isoformat(),
            "dolar": round(dollar, 2),
            "inflacion_mensual": monthly_inflation[month_key],
            "salario_real": monthly_salary[month_key],
            "campaña": campaign,
            "campania": campaign,
            "campania_boost": campaign_boost,
        }
        macro.append(row)
        cotizaciones.append({"fecha": day.isoformat(), "moneda": "D", "cotizacion": round(dollar, 2)})
    return macro, cotizaciones


def _ventas(
    days: list[date],
    rng: random.Random,
    clientes: list[dict[str, Any]],
    articulos: list[dict[str, Any]],
    vendedores: list[dict[str, str]],
    macro: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sales = []
    sale_items = []
    stock = {a["cod_articulo"]: int(a["_stock_inicial"]) for a in articulos}
    macro_by_date = {m["fecha"]: m for m in macro}
    id_counter = 68100000
    item_id = 68200000
    numero = 1

    for day in days:
        today = macro_by_date[day.isoformat()]
        lag_day = max(days[0], day - timedelta(days=rng.randint(5, 10)))
        lag_macro = macro_by_date[lag_day.isoformat()]
        weekday_factor = {0: 0.72, 1: 0.88, 2: 0.96, 3: 1.04, 4: 1.22, 5: 1.28, 6: 0.55}[day.weekday()]
        pay_factor = 1.18 if day.day in {1, 2, 3, 14, 15, 16} else 1.0
        salary_factor = max(0.72, today["salario_real"] / 100)
        dollar_factor = max(0.72, 1 - ((lag_macro["dolar"] / 360) - 1) * 0.035)
        campaign_factor = today["campania_boost"]
        month_season = 1 + math.sin((day.timetuple().tm_yday / 365) * math.tau) * 0.08
        expected_sales = 8.5 * weekday_factor * pay_factor * salary_factor * dollar_factor * campaign_factor * month_season
        sale_count = max(1, round(expected_sales + rng.gauss(0, 2.2)))

        for _ in range(sale_count):
            id_counter += 1
            cliente = rng.choice(clientes)
            vendedor = next((v for v in vendedores if v["cod_vendedor"] == cliente["cod_vendedor"]), rng.choice(vendedores))
            items_count = rng.randint(1, 8)
            sale_total = 0.0
            neto = 0.0
            iva_total = 0.0
            current_items = []

            for articulo in rng.sample(articulos, items_count):
                cod_articulo = articulo["cod_articulo"]
                if stock[cod_articulo] <= 0:
                    continue
                base_price = float(articulo["precio_venta"])
                month_multiplier = _inflation_multiplier(day, macro_by_date)
                price = base_price * month_multiplier * rng.uniform(0.96, 1.08)
                cost = float(articulo["precio_compra"]) * month_multiplier * rng.uniform(0.98, 1.04)
                price_pressure = price / max(base_price * month_multiplier, 1)
                quantity_base = rng.uniform(1.0, 5.5) * salary_factor * campaign_factor * pay_factor
                quantity_base *= max(0.35, 1 - (price_pressure - 1) * articulo["_elasticidad_precio"])
                quantity = max(1, round(quantity_base))
                quantity = min(quantity, stock[cod_articulo])
                stock[cod_articulo] -= quantity
                if stock[cod_articulo] < 35:
                    stock[cod_articulo] += rng.randint(120, 480)

                net_price = round(price / 1.21, 2)
                gross_price = round(price, 2)
                iva_importe = round(gross_price - net_price, 2)
                importe = round(gross_price * quantity, 2)
                sale_total += importe
                neto += round(net_price * quantity, 2)
                iva_total += round(iva_importe * quantity, 2)
                item_id += 1
                current_items.append(
                    {
                        "id": item_id,
                        "id_comprobante": id_counter,
                        "fecha": day.isoformat(),
                        "cod_cliente": int(cliente["cod_cliente"]),
                        "cod_vendedor": int(vendedor["cod_vendedor"]),
                        "cod_empresa": 1,
                        "cod_articulo": int(cod_articulo),
                        "detalle": articulo["descripcion"],
                        "cantidad": quantity,
                        "precio_orig": net_price,
                        "precio": net_price,
                        "precio_con_iva": gross_price,
                        "precio_compra_actual": round(cost, 2),
                        "iva_por": 21,
                        "iva_importe": iva_importe,
                        "importe": importe,
                        "cod_cuenta": 4100100,
                        "cod_lista_precios": int(cliente["lista_precio"]),
                        "descuento_porc": 0,
                        "cod_barra": articulo["cod_barra"],
                    }
                )

            if not current_items:
                continue

            venta = {
                "id": id_counter,
                "fecha": day.isoformat(),
                "fecha_entrega": None,
                "tipo_presupuesto": None,
                "tipo_comprobante": "FA",
                "tipo_factura": "B",
                "numero": numero,
                "punto_de_venta": rng.choice([1, 4, 8, 16]),
                "moneda": "P",
                "cotizacion": 1,
                "cotizacion_2": 0,
                "id_destino": 2,
                "total": round(sale_total, 2),
                "cod_cliente": int(cliente["cod_cliente"]),
                "cod_vendedor": int(vendedor["cod_vendedor"]),
                "cod_empresa": 1,
                "cod_unidad_negocio_cab": 0,
                "tag": "S",
                "talonario_manual": None,
                "mueve_stock": None,
                "condicion_venta_tipo": cliente["condicion_venta"],
                "iva_importe": round(iva_total, 2),
                "importe_iva_10_5": 0,
                "importe_iva_27": 0,
                "neto": round(neto, 2),
                "no_grabado": 0,
                "observaciones": today["campania"] or "",
                "usuario": "API_User",
                "usuario_fecha": day.isoformat(),
                "fac_electronica": 2,
                "fecha_cae": "0000-00-00",
                "cae": "",
                "numero_cai": 0,
                "afip_comprobantes_fe": "6",
                "afip_conceptos_fe": 1,
                "afip_tipdoc_fe": 80,
                "afip_cod_barra": "",
                "afip_cond_vta": 0,
                "anulada": "N",
                "cod_compatibilidad": "1885",
                "cod_jurisdiccion": 0,
                "cod_deposito": 1,
                "cod_deposito_destino": None,
                "cod_jurisdiccion_comerc": 0,
                "tipo_recibo": None,
                "genero_re_auto": "N",
                "moneda_2": None,
                "arca_cond_iva": 5,
            }
            sales.append({"venta": venta, "items": current_items})
            sale_items.extend(current_items)
            numero += 1

    return sales, sale_items


def _inflation_multiplier(current_day: date, macro_by_date: dict[str, dict[str, Any]]) -> float:
    multiplier = 1.0
    first_month = date(2023, 1, 1)
    month_cursor = first_month
    while month_cursor <= current_day.replace(day=1):
        macro = macro_by_date[month_cursor.isoformat()]
        multiplier *= 1 + macro["inflacion_mensual"] / 100
        next_month = month_cursor.month + 1
        next_year = month_cursor.year + (1 if next_month == 13 else 0)
        month_cursor = date(next_year, 1 if next_month == 13 else next_month, 1)
    return multiplier


def strip_internal_article_fields(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{key: value for key, value in row.items() if not key.startswith("_")} for row in rows]
