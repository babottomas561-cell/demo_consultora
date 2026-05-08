import datetime
import numpy as np
from typing import List, Optional, Dict, Any
from connectors.base import BaseConector, VentaNormalizada

class InfomanagerDemoConector(BaseConector):
    PRODUCTOS = [
        {"id": "REM001", "nombre": "Remera básica", "categoria": "remeras", "precio_base": 8500},
        {"id": "REM002", "nombre": "Remera estampada", "categoria": "remeras", "precio_base": 12000},
        {"id": "PAN001", "nombre": "Pantalón jean slim", "categoria": "pantalones", "precio_base": 25000},
        {"id": "PAN002", "nombre": "Pantalón cargo", "categoria": "pantalones", "precio_base": 22000},
        {"id": "VES001", "nombre": "Vestido floral", "categoria": "vestidos", "precio_base": 18000},
        {"id": "VES002", "nombre": "Vestido casual", "categoria": "vestidos", "precio_base": 15000},
        {"id": "CAM001", "nombre": "Campera impermeable", "categoria": "camperas", "precio_base": 45000},
        {"id": "CAM002", "nombre": "Campera de abrigo", "categoria": "camperas", "precio_base": 52000},
        {"id": "BUZ001", "nombre": "Buzo con capucha", "categoria": "buzos", "precio_base": 19000},
        {"id": "CAL001", "nombre": "Zapatillas urbanas", "categoria": "calzado", "precio_base": 38000},
        {"id": "CAL002", "nombre": "Botas de cuero", "categoria": "calzado", "precio_base": 55000},
        {"id": "CAL003", "nombre": "Sandalias verano", "categoria": "calzado", "precio_base": 15000},
        {"id": "ACC001", "nombre": "Cinturón cuero", "categoria": "accesorios", "precio_base": 8000},
        {"id": "ACC002", "nombre": "Cartera mediana", "categoria": "accesorios", "precio_base": 22000},
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

        is_mayorista = cliente["id"].startswith("MAY")
        cantidad = rng.integers(10, 50) if is_mayorista else rng.integers(1, 5)

        precio_unitario = self.get_precio_con_descuento(producto["precio_base"], fecha)
        if is_mayorista:
            precio_unitario = precio_unitario * 0.75

        return VentaNormalizada(
            fecha=fecha,
            cliente_id=cliente["id"],
            cliente_nombre=cliente["nombre"],
            producto_id=producto["id"],
            producto_nombre=producto["nombre"],
            cantidad=int(cantidad),
            precio_unitario=float(precio_unitario),
            total=float(precio_unitario * cantidad)
        )

    def generar_datos_periodo(self, desde: datetime.datetime, hasta: datetime.datetime) -> Dict[str, List[Any]]:
        ventas = []
        compras = []
        cta_cte_clientes = []
        cta_cte_proveedores = []
        movimientos_caja = []

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

                    comprobante_id = f"FAC-{int(fecha_venta.timestamp())}-{rng.integers(10, 99)}"
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
                    else:
                        pending_invoices_cli.append({
                            "comprobante_id": comprobante_id,
                            "cliente_id": v.cliente_id,
                            "cliente_nombre": v.cliente_nombre,
                            "importe": v.total,
                            "vencimiento": fecha_venta + datetime.timedelta(days=int(rng.choice([15, 30, 45])))
                        })

            fecha_actual += datetime.timedelta(hours=1)

        return {
            "ventas": ventas,
            "compras": compras,
            "cta_cte_clientes": cta_cte_clientes,
            "cta_cte_proveedores": cta_cte_proveedores,
            "movimientos_caja": movimientos_caja
        }
