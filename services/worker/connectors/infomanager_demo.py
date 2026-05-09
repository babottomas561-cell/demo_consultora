import datetime
import hashlib
import numpy as np
from typing import List, Optional, Dict, Any
from connectors.base import BaseConector, VentaNormalizada

class InfomanagerDemoConector(BaseConector):
    PRODUCTOS = [
        {"id": "REM001", "cod_articulo": 1001, "nombre": "Remera básica", "categoria": "remeras", "cod_rubro": 1, "cod_subrubro": 101, "precio_base": 8500, "costo_factor": 0.48},
        {"id": "REM002", "cod_articulo": 1002, "nombre": "Remera estampada", "categoria": "remeras", "cod_rubro": 1, "cod_subrubro": 102, "precio_base": 12000, "costo_factor": 0.50},
        {"id": "PAN001", "cod_articulo": 2001, "nombre": "Pantalón jean slim", "categoria": "pantalones", "cod_rubro": 2, "cod_subrubro": 201, "precio_base": 25000, "costo_factor": 0.54},
        {"id": "PAN002", "cod_articulo": 2002, "nombre": "Pantalón cargo", "categoria": "pantalones", "cod_rubro": 2, "cod_subrubro": 202, "precio_base": 22000, "costo_factor": 0.53},
        {"id": "VES001", "cod_articulo": 3001, "nombre": "Vestido floral", "categoria": "vestidos", "cod_rubro": 3, "cod_subrubro": 301, "precio_base": 18000, "costo_factor": 0.47},
        {"id": "VES002", "cod_articulo": 3002, "nombre": "Vestido casual", "categoria": "vestidos", "cod_rubro": 3, "cod_subrubro": 302, "precio_base": 15000, "costo_factor": 0.46},
        {"id": "CAM001", "cod_articulo": 4001, "nombre": "Campera impermeable", "categoria": "camperas", "cod_rubro": 4, "cod_subrubro": 401, "precio_base": 45000, "costo_factor": 0.58},
        {"id": "CAM002", "cod_articulo": 4002, "nombre": "Campera de abrigo", "categoria": "camperas", "cod_rubro": 4, "cod_subrubro": 402, "precio_base": 52000, "costo_factor": 0.60},
        {"id": "BUZ001", "cod_articulo": 5001, "nombre": "Buzo con capucha", "categoria": "buzos", "cod_rubro": 5, "cod_subrubro": 501, "precio_base": 19000, "costo_factor": 0.51},
        {"id": "CAL001", "cod_articulo": 6001, "nombre": "Zapatillas urbanas", "categoria": "calzado", "cod_rubro": 6, "cod_subrubro": 601, "precio_base": 38000, "costo_factor": 0.57},
        {"id": "CAL002", "cod_articulo": 6002, "nombre": "Botas de cuero", "categoria": "calzado", "cod_rubro": 6, "cod_subrubro": 602, "precio_base": 55000, "costo_factor": 0.62},
        {"id": "CAL003", "cod_articulo": 6003, "nombre": "Sandalias verano", "categoria": "calzado", "cod_rubro": 6, "cod_subrubro": 603, "precio_base": 15000, "costo_factor": 0.45},
        {"id": "ACC001", "cod_articulo": 7001, "nombre": "Cinturón cuero", "categoria": "accesorios", "cod_rubro": 7, "cod_subrubro": 701, "precio_base": 8000, "costo_factor": 0.42},
        {"id": "ACC002", "cod_articulo": 7002, "nombre": "Cartera mediana", "categoria": "accesorios", "cod_rubro": 7, "cod_subrubro": 702, "precio_base": 22000, "costo_factor": 0.55},
    ]

    VENDEDORES = [
        {"cod_vendedor": 1, "nombre": "Lucas García", "email": "lucas.garcia@demo.com", "habilitado": True, "cuota_mensual": 18000000},
        {"cod_vendedor": 2, "nombre": "María López", "email": "maria.lopez@demo.com", "habilitado": True, "cuota_mensual": 17000000},
        {"cod_vendedor": 3, "nombre": "Carlos Ruiz", "email": "carlos.ruiz@demo.com", "habilitado": True, "cuota_mensual": 17500000},
        {"cod_vendedor": 4, "nombre": "Ana Martínez", "email": "ana.martinez@demo.com", "habilitado": True, "cuota_mensual": 16000000},
        {"cod_vendedor": 5, "nombre": "Diego Fernández", "email": "diego.fernandez@demo.com", "habilitado": True, "cuota_mensual": 18500000},
    ]

    PUNTOS_DE_VENTA = [
        {"id": 1, "nombre": "Casa Central", "cod_empresa": 1, "habilitado": True},
        {"id": 2, "nombre": "Sucursal Norte", "cod_empresa": 1, "habilitado": True},
        {"id": 3, "nombre": "Ecommerce", "cod_empresa": 1, "habilitado": True},
    ]

    DEPOSITOS = [
        {"cod_deposito": 1, "nombre": "Central", "habilitado": True},
        {"cod_deposito": 2, "nombre": "Sucursal", "habilitado": True},
    ]

    RUBROS = [
        {"cod_rubro": 1, "nombre": "Remeras"},
        {"cod_rubro": 2, "nombre": "Pantalones"},
        {"cod_rubro": 3, "nombre": "Vestidos"},
        {"cod_rubro": 4, "nombre": "Camperas"},
        {"cod_rubro": 5, "nombre": "Buzos"},
        {"cod_rubro": 6, "nombre": "Calzado"},
        {"cod_rubro": 7, "nombre": "Accesorios"},
        {"cod_rubro": 8, "nombre": "Temporada"},
    ]

    SUBRUBROS = [
        {"cod_subrubro": 101, "cod_rubro": 1, "nombre": "Básicas"},
        {"cod_subrubro": 102, "cod_rubro": 1, "nombre": "Estampadas"},
        {"cod_subrubro": 201, "cod_rubro": 2, "nombre": "Jeans"},
        {"cod_subrubro": 202, "cod_rubro": 2, "nombre": "Cargo"},
        {"cod_subrubro": 301, "cod_rubro": 3, "nombre": "Florales"},
        {"cod_subrubro": 302, "cod_rubro": 3, "nombre": "Casuales"},
        {"cod_subrubro": 401, "cod_rubro": 4, "nombre": "Impermeables"},
        {"cod_subrubro": 402, "cod_rubro": 4, "nombre": "Abrigo"},
        {"cod_subrubro": 501, "cod_rubro": 5, "nombre": "Capucha"},
        {"cod_subrubro": 601, "cod_rubro": 6, "nombre": "Urbanas"},
        {"cod_subrubro": 602, "cod_rubro": 6, "nombre": "Botas"},
        {"cod_subrubro": 603, "cod_rubro": 6, "nombre": "Verano"},
        {"cod_subrubro": 701, "cod_rubro": 7, "nombre": "Cuero"},
        {"cod_subrubro": 702, "cod_rubro": 7, "nombre": "Carteras"},
    ]

    CLIENTES = (
        [{"id": f"MAY{i:03d}", "nombre": f"Mayorista Demo {i} SA"} for i in range(1, 21)] +
        [{"id": f"MIN{i:03d}", "nombre": f"Boutique Demo {i}"} for i in range(1, 81)]
    )

    PROVEEDORES = [
        {"id": "PROV001", "nombre": "Textil San Martín SA"},
        {"id": "PROV002", "nombre": "Importadora del Norte SRL"},
        {"id": "PROV003", "nombre": "Confecciones Argentinas SRL"},
        {"id": "PROV004", "nombre": "Telas y Avíos S.A."},
        {"id": "PROV005", "nombre": "Distribuidora Mayorista Moda"},
        {"id": "PROV006", "nombre": "Fábrica de Calzados El Paso"},
        {"id": "PROV007", "nombre": "Cueros y Accesorios Ltda."},
        {"id": "PROV008", "nombre": "Textil Sur"},
        {"id": "PROV009", "nombre": "Importaciones Globales SA"},
        {"id": "PROV010", "nombre": "Insumos Textiles Centro"},
    ]

    def extract_and_normalize(self) -> List[VentaNormalizada]:
        hasta = datetime.datetime.now()
        desde = hasta - datetime.timedelta(days=365)
        return self.generar_ventas_periodo(desde, hasta)

    def generar_ventas_periodo(self, desde: datetime.datetime, hasta: datetime.datetime) -> List[VentaNormalizada]:
        return self.generar_datos_periodo(desde, hasta)["ventas"]

    def generar_ventas_ahora(self, n_ventas: Optional[int] = None) -> List[VentaNormalizada]:
        ahora = datetime.datetime.now()
        rng = np.random.default_rng()

        if n_ventas is None:
            mult = self.get_multiplicador_estacional(ahora)
            n_ventas = int(rng.integers(3, 8) * mult)

        return [self._generar_venta(ahora, rng) for _ in range(n_ventas)]

    def _stable_id(self, value: str) -> int:
        digest = hashlib.sha1(value.encode("utf-8")).hexdigest()
        return int(digest[:12], 16) % 9000000000 + 100000

    def get_multiplicador_estacional(self, fecha: datetime.datetime) -> float:
        mes = fecha.month
        dia_semana = fecha.weekday()
        hora = fecha.hour

        mult_mes = {
            1: 1.6, 2: 0.8, 3: 0.9, 4: 1.0,
            5: 1.3, 6: 1.2, 7: 1.8, 8: 1.1,
            9: 0.9, 10: 1.4, 11: 1.1, 12: 1.7,
        }[mes]

        mult_dia = {0: 0.8, 1: 0.8, 2: 1.0, 3: 1.0,
                    4: 1.2, 5: 1.4, 6: 0.6}[dia_semana]

        if 10 <= hora <= 13 or 17 <= hora <= 21:
            mult_hora = 1.3
        elif 14 <= hora <= 16:
            mult_hora = 0.7
        else:
            mult_hora = 0.1

        return mult_mes * mult_dia * mult_hora

    def get_precio_con_descuento(self, precio_base: float, fecha: datetime.datetime) -> float:
        mes = fecha.month
        if mes in [1, 7]:
            return precio_base * 0.7
        return precio_base

    def _generar_venta(self, fecha: datetime.datetime, rng: np.random.Generator) -> VentaNormalizada:
        cliente = rng.choice(self.CLIENTES)
        producto = rng.choice(self.PRODUCTOS)
        vendedor = rng.choice(self.VENDEDORES)
        punto_de_venta = rng.choice(self.PUNTOS_DE_VENTA, p=[0.55, 0.25, 0.20])
        deposito = rng.choice(self.DEPOSITOS, p=[0.72, 0.28])
        tipo_comprobante = rng.choice(["FA", "NC", "ND"], p=[0.90, 0.08, 0.02])

        is_mayorista = cliente["id"].startswith("MAY")
        cantidad = rng.integers(10, 50) if is_mayorista else rng.integers(1, 5)

        precio_unitario = self.get_precio_con_descuento(producto["precio_base"], fecha)
        descuento_porc = 0
        if is_mayorista:
            precio_unitario = precio_unitario * 0.75
            descuento_porc = 25

        precio_compra_actual = producto["precio_base"] * producto["costo_factor"]
        total = float(precio_unitario * cantidad)
        if tipo_comprobante == "NC":
            total = -total
            cantidad = -cantidad

        venta = VentaNormalizada(
            fecha=fecha,
            cliente_id=cliente["id"],
            cliente_nombre=cliente["nombre"],
            producto_id=producto["id"],
            producto_nombre=producto["nombre"],
            cantidad=int(cantidad),
            precio_unitario=float(precio_unitario),
            total=total
        )
        venta.tipo_comprobante = str(tipo_comprobante)
        venta.tipo_factura = "A" if is_mayorista else "B"
        venta.punto_de_venta = int(punto_de_venta["id"])
        venta.cod_vendedor = int(vendedor["cod_vendedor"])
        venta.cod_empresa = 1
        venta.tag = "S"
        venta.condicion_venta_tipo = 2 if is_mayorista else 1
        venta.neto = float(total / 1.21)
        venta.iva_importe = float(total - venta.neto)
        venta.anulada = "N"
        venta.cod_deposito = int(deposito["cod_deposito"])
        venta.cod_rubro = int(producto["cod_rubro"])
        venta.cod_subrubro = int(producto["cod_subrubro"])
        venta.precio_compra_actual = float(precio_compra_actual)
        venta.descuento_porc = float(descuento_porc)
        venta.cod_articulo = int(producto["cod_articulo"])
        venta.cod_cliente = int(cliente["id"][3:])
        return venta

    def generar_datos_periodo(self, desde: datetime.datetime, hasta: datetime.datetime) -> Dict[str, List[Any]]:
        ventas = []
        compras = []
        cta_cte_clientes = []
        cta_cte_proveedores = []
        movimientos_caja = []
        recibos = []

        saldo_caja = 0.0
        saldos_clientes = {c["id"]: 0.0 for c in self.CLIENTES}
        saldos_proveedores = {p["id"]: 0.0 for p in self.PROVEEDORES}

        pending_invoices_cli = []
        pending_invoices_prov = []

        fecha_actual = desde
        rng = np.random.default_rng(seed=int(desde.timestamp()))

        while fecha_actual <= hasta:
            # 1. Gastos Fijos (dias 5 de cada mes a las 10 AM)
            if fecha_actual.day == 5 and fecha_actual.hour == 10:
                total_gastos = 4000000.0 # Sueldos, Alquiler, Servicios
                saldo_caja -= total_gastos
                movimientos_caja.append({
                    "fecha": fecha_actual,
                    "tipo": "gasto",
                    "descripcion": "Pago Sueldos y Gastos Fijos",
                    "importe": -total_gastos,
                    "saldo_acumulado": saldo_caja
                })

            # 2. Compras
            if fecha_actual.hour == 9 and rng.random() < 0.4:
                proveedor = rng.choice(self.PROVEEDORES)
                producto = rng.choice(self.PRODUCTOS)

                cantidad = int(rng.integers(50, 300))
                costo_unitario = producto["precio_base"] * rng.uniform(0.45, 0.65)
                total_compra = float(cantidad * costo_unitario)

                compras.append({
                    "fecha": fecha_actual,
                    "proveedor_id": proveedor["id"],
                    "proveedor_nombre": proveedor["nombre"],
                    "producto_id": producto["id"],
                    "producto_nombre": producto["nombre"],
                    "cantidad": cantidad,
                    "precio_unitario": float(costo_unitario),
                    "total": total_compra
                })

                comprobante_id = f"FAC-P-{int(fecha_actual.timestamp())}"
                saldos_proveedores[proveedor["id"]] += total_compra

                vencimiento = fecha_actual + datetime.timedelta(days=int(rng.choice([30, 60, 90])))
                cta_cte_proveedores.append({
                    "proveedor_id": proveedor["id"],
                    "proveedor_nombre": proveedor["nombre"],
                    "comprobante_id": comprobante_id,
                    "tipo": "factura",
                    "fecha": fecha_actual,
                    "importe": total_compra,
                    "saldo_acumulado": saldos_proveedores[proveedor["id"]],
                    "fecha_vencimiento": vencimiento
                })

                pending_invoices_prov.append({
                    "comprobante_id": comprobante_id,
                    "proveedor_id": proveedor["id"],
                    "proveedor_nombre": proveedor["nombre"],
                    "importe": total_compra,
                    "vencimiento": vencimiento
                })

            # 3. Pagos / Cobros programados
            if fecha_actual.hour == 11:
                still_pending_prov = []
                for inv in pending_invoices_prov:
                    if fecha_actual >= inv["vencimiento"]:
                        saldos_proveedores[inv["proveedor_id"]] -= inv["importe"]
                        cta_cte_proveedores.append({
                            "proveedor_id": inv["proveedor_id"],
                            "proveedor_nombre": inv["proveedor_nombre"],
                            "comprobante_id": f"PAG-{inv['comprobante_id']}",
                            "tipo": "pago",
                            "fecha": fecha_actual,
                            "importe": -inv["importe"],
                            "saldo_acumulado": saldos_proveedores[inv["proveedor_id"]],
                            "fecha_vencimiento": None
                        })
                        saldo_caja -= inv["importe"]
                        movimientos_caja.append({
                            "fecha": fecha_actual,
                            "tipo": "pago",
                            "descripcion": f"Pago a {inv['proveedor_nombre']}",
                            "importe": -inv["importe"],
                            "saldo_acumulado": saldo_caja
                        })
                    else:
                        still_pending_prov.append(inv)
                pending_invoices_prov = still_pending_prov

                still_pending_cli = []
                for inv in pending_invoices_cli:
                    if fecha_actual >= inv["vencimiento"] and rng.random() < 0.85:
                        forma_pago = str(rng.choice(["efectivo", "transferencia", "tarjeta", "cheque"], p=[0.25, 0.40, 0.25, 0.10]))
                        saldos_clientes[inv["cliente_id"]] -= inv["importe"]
                        cta_cte_clientes.append({
                            "cliente_id": inv["cliente_id"],
                            "cliente_nombre": inv["cliente_nombre"],
                            "comprobante_id": f"REC-{inv['comprobante_id']}",
                            "tipo": "recibo",
                            "fecha": fecha_actual,
                            "importe": -inv["importe"],
                            "saldo_acumulado": saldos_clientes[inv["cliente_id"]],
                            "fecha_vencimiento": None
                        })
                        saldo_caja += inv["importe"]
                        movimientos_caja.append({
                            "fecha": fecha_actual,
                            "tipo": "cobro",
                            "descripcion": f"Cobro factura {inv['cliente_nombre']}",
                            "importe": inv["importe"],
                            "saldo_acumulado": saldo_caja
                        })
                        recibos.append({
                            "id": self._stable_id(f"REC-{inv['comprobante_id']}"),
                            "fecha": fecha_actual.date(),
                            "cod_cliente": int(inv["cliente_id"][3:]),
                            "cliente_nombre": inv["cliente_nombre"],
                            "forma_pago": forma_pago,
                            "importe": inv["importe"],
                            "factura_id": self._stable_id(inv["comprobante_id"]),
                            "tarjeta_numero": f"**** {rng.integers(1000, 9999)}" if forma_pago == "tarjeta" else None,
                            "tarjeta_cupon": str(rng.integers(100000, 999999)) if forma_pago == "tarjeta" else None,
                        })
                    else:
                        still_pending_cli.append(inv)
                pending_invoices_cli = still_pending_cli

            # 4. Ventas
            mult = self.get_multiplicador_estacional(fecha_actual)
            if rng.random() < (0.3 * mult):
                n_ventas_hora = int(rng.integers(1, 5) * mult)
                for _ in range(n_ventas_hora):
                    minuto_rnd = rng.integers(0, 59)
                    segundo_rnd = rng.integers(0, 59)
                    fecha_venta = fecha_actual.replace(minute=minuto_rnd, second=segundo_rnd)

                    v = self._generar_venta(fecha_venta, rng)
                    ventas.append(v)

                    comprobante_id = f"{v.tipo_comprobante}-{int(fecha_venta.timestamp())}-{rng.integers(10, 99)}"
                    v.id_comprobante = self._stable_id(comprobante_id)
                    saldos_clientes[v.cliente_id] += v.total
                    cta_cte_clientes.append({
                        "cliente_id": v.cliente_id,
                        "cliente_nombre": v.cliente_nombre,
                        "comprobante_id": comprobante_id,
                        "tipo": "factura",
                        "fecha": fecha_venta,
                        "importe": v.total,
                        "saldo_acumulado": saldos_clientes[v.cliente_id],
                        "fecha_vencimiento": fecha_venta + datetime.timedelta(days=30)
                    })

                    if rng.random() < 0.7: # 70% paid immediately
                        forma_pago = str(rng.choice(["efectivo", "transferencia", "tarjeta", "cheque"], p=[0.30, 0.35, 0.25, 0.10]))
                        saldos_clientes[v.cliente_id] -= v.total
                        cta_cte_clientes.append({
                            "cliente_id": v.cliente_id,
                            "cliente_nombre": v.cliente_nombre,
                            "comprobante_id": f"REC-{comprobante_id}",
                            "tipo": "recibo",
                            "fecha": fecha_venta,
                            "importe": -v.total,
                            "saldo_acumulado": saldos_clientes[v.cliente_id],
                            "fecha_vencimiento": None
                        })
                        saldo_caja += v.total
                        movimientos_caja.append({
                            "fecha": fecha_venta,
                            "tipo": "cobro",
                            "descripcion": f"Venta {v.cliente_nombre}",
                            "importe": v.total,
                            "saldo_acumulado": saldo_caja
                        })
                        recibos.append({
                            "id": self._stable_id(f"REC-{comprobante_id}"),
                            "fecha": fecha_venta.date(),
                            "cod_cliente": v.cod_cliente,
                            "cliente_nombre": v.cliente_nombre,
                            "forma_pago": forma_pago,
                            "importe": v.total,
                            "factura_id": v.id_comprobante,
                            "tarjeta_numero": f"**** {rng.integers(1000, 9999)}" if forma_pago == "tarjeta" else None,
                            "tarjeta_cupon": str(rng.integers(100000, 999999)) if forma_pago == "tarjeta" else None,
                        })
                    else:
                        pending_invoices_cli.append({
                            "comprobante_id": comprobante_id,
                            "cliente_id": v.cliente_id,
                            "cliente_nombre": v.cliente_nombre,
                            "importe": v.total,
                            "vencimiento": fecha_venta + datetime.timedelta(days=int(rng.choice([15, 30, 45])))
                        })

            fecha_actual += datetime.timedelta(hours=1)

        presupuestos = self._generar_presupuestos(desde, hasta, ventas, rng)
        stock = self._generar_stock(ventas, compras)

        return {
            "ventas": ventas,
            "compras": compras,
            "cta_cte_clientes": cta_cte_clientes,
            "cta_cte_proveedores": cta_cte_proveedores,
            "movimientos_caja": movimientos_caja,
            "vendedores": self.VENDEDORES,
            "puntos_de_venta": self.PUNTOS_DE_VENTA,
            "depositos": self.DEPOSITOS,
            "rubros": self.RUBROS,
            "subrubros": self.SUBRUBROS,
            "presupuestos": presupuestos,
            "recibos": recibos,
            "stock": stock,
        }

    def _generar_presupuestos(self, desde, hasta, ventas, rng):
        presupuestos = []
        ventas_positivas = [v for v in ventas if v.total > 0]
        confirmadas = ventas_positivas[:140]
        for idx in range(200):
            confirmado = idx < 140 and idx < len(confirmadas)
            venta = confirmadas[idx] if confirmado else self._generar_venta(
                desde + datetime.timedelta(days=int(rng.integers(0, max((hasta - desde).days, 1)))),
                rng,
            )
            fecha = venta.fecha.date() - datetime.timedelta(days=int(rng.integers(1, 12)))
            presupuestos.append({
                "id": 8000000000 + idx + 1,
                "fecha": fecha,
                "cod_cliente": venta.cod_cliente,
                "cliente_nombre": venta.cliente_nombre,
                "cod_vendedor": venta.cod_vendedor,
                "total": abs(venta.total),
                "confirmado": confirmado,
                "fecha_conversion": venta.fecha.date() if confirmado else None,
                "venta_id": getattr(venta, "id_comprobante", None) if confirmado else None,
            })
        return presupuestos

    def _generar_stock(self, ventas, compras):
        compradas = {}
        vendidas = {}
        costos = {}
        for compra in compras:
            producto = next((p for p in self.PRODUCTOS if p["id"] == compra["producto_id"]), None)
            if not producto:
                continue
            cod_articulo = producto["cod_articulo"]
            compradas[cod_articulo] = compradas.get(cod_articulo, 0) + abs(compra["cantidad"])
            costos[cod_articulo] = compra["precio_unitario"]
        for venta in ventas:
            vendidas[venta.cod_articulo] = vendidas.get(venta.cod_articulo, 0) + max(venta.cantidad, 0)
            costos.setdefault(venta.cod_articulo, venta.precio_compra_actual)

        rows = []
        now = datetime.datetime.now().replace(microsecond=0)
        for producto in self.PRODUCTOS:
            cod_articulo = producto["cod_articulo"]
            base_stock = 3500 + compradas.get(cod_articulo, 0) - vendidas.get(cod_articulo, 0)
            central = max(int(base_stock * 0.7), 0)
            sucursal = max(int(base_stock * 0.3), 0)
            for deposito, cantidad in [(1, central), (2, sucursal)]:
                rows.append({
                    "cod_articulo": cod_articulo,
                    "cod_deposito": deposito,
                    "cantidad": cantidad,
                    "stock_minimo": 150 if deposito == 1 else 60,
                    "precio_compra_actual": float(costos.get(cod_articulo, producto["precio_base"] * producto["costo_factor"])),
                    "ultima_actualizacion": now,
                })
        return rows
