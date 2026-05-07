import datetime
import random
import numpy as np
from typing import List, Optional
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

    def extract_and_normalize(self) -> List[VentaNormalizada]:
        # Required by BaseConector but not used directly here
        return []

    def get_multiplicador_estacional(self, fecha: datetime.datetime) -> float:
        mes = fecha.month
        dia_semana = fecha.weekday()  # 0=lunes, 6=domingo
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
        if mes in [1, 7]:  # liquidaciones
            return precio_base * 0.7
        return precio_base

    def _generar_venta(self, fecha: datetime.datetime, rng: np.random.Generator) -> VentaNormalizada:
        cliente = rng.choice(self.CLIENTES)
        producto = rng.choice(self.PRODUCTOS)
        
        is_mayorista = cliente["id"].startswith("MAY")
        cantidad = rng.integers(10, 50) if is_mayorista else rng.integers(1, 5)
        
        precio_unitario = self.get_precio_con_descuento(producto["precio_base"], fecha)
        if is_mayorista:
            precio_unitario = precio_unitario * 0.75  # 25% descuento mayorista
            
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

    def generar_ventas_periodo(self, desde: datetime.datetime, hasta: datetime.datetime) -> List[VentaNormalizada]:
        ventas = []
        fecha_actual = desde
        # Seed based on period for reproducibility
        rng = np.random.default_rng(seed=int(desde.timestamp()))
        
        while fecha_actual <= hasta:
            mult = self.get_multiplicador_estacional(fecha_actual)
            # Base probability of having sales in this hour
            if rng.random() < (0.3 * mult):
                n_ventas_hora = int(rng.integers(1, 5) * mult)
                for _ in range(n_ventas_hora):
                    minuto_rnd = rng.integers(0, 59)
                    segundo_rnd = rng.integers(0, 59)
                    fecha_venta = fecha_actual.replace(minute=minuto_rnd, second=segundo_rnd)
                    ventas.append(self._generar_venta(fecha_venta, rng))
            fecha_actual += datetime.timedelta(hours=1)
            
        return ventas

    def generar_ventas_ahora(self, n_ventas: Optional[int] = None) -> List[VentaNormalizada]:
        ahora = datetime.datetime.now()
        rng = np.random.default_rng()
        
        if n_ventas is None:
            mult = self.get_multiplicador_estacional(ahora)
            n_ventas = int(rng.integers(3, 8) * mult)
            
        ventas = []
        for _ in range(n_ventas):
            ventas.append(self._generar_venta(ahora, rng))
            
        return ventas
