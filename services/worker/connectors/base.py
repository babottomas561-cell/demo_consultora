from typing import List, Dict, Any
from abc import ABC, abstractmethod

class VentaNormalizada:
    def __init__(self, fecha, cliente_id, cliente_nombre, producto_id, producto_nombre, cantidad, precio_unitario, total):
        self.fecha = fecha
        self.cliente_id = cliente_id
        self.cliente_nombre = cliente_nombre
        self.producto_id = producto_id
        self.producto_nombre = producto_nombre
        self.cantidad = cantidad
        self.precio_unitario = precio_unitario
        self.total = total

class BaseConector(ABC):
    @abstractmethod
    def extract_and_normalize(self) -> List[VentaNormalizada]:
        pass
