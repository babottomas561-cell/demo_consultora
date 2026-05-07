import pandas as pd
from typing import List, Generator
from .base import BaseConector, VentaNormalizada

class ExcelConector(BaseConector):
    REQUIRED_COLUMNS = [
        "fecha", "cliente_id", "cliente_nombre", "producto_id", 
        "producto_nombre", "cantidad", "precio_unitario", "total"
    ]

    def __init__(self, filepath: str, chunk_size: int = 5000):
        self.filepath = filepath
        self.chunk_size = chunk_size

    def _validate_columns(self, df: pd.DataFrame):
        missing = [col for col in self.REQUIRED_COLUMNS if col not in df.columns]
        if missing:
            raise ValueError(f"Faltan las siguientes columnas requeridas en el Excel: {', '.join(missing)}")

    def extract_and_normalize(self) -> Generator[List[VentaNormalizada], None, None]:
        df = pd.read_excel(self.filepath)
        self._validate_columns(df)
        
        df = df.dropna(subset=["fecha", "cliente_id", "producto_id"])
        df["fecha"] = pd.to_datetime(df["fecha"])
        
        for start in range(0, len(df), self.chunk_size):
            chunk_df = df.iloc[start:start + self.chunk_size]
            chunk_ventas = []
            
            for _, row in chunk_df.iterrows():
                venta = VentaNormalizada(
                    fecha=row["fecha"],
                    cliente_id=str(row["cliente_id"]),
                    cliente_nombre=str(row["cliente_nombre"]),
                    producto_id=str(row["producto_id"]),
                    producto_nombre=str(row["producto_nombre"]),
                    cantidad=float(row["cantidad"]),
                    precio_unitario=float(row["precio_unitario"]),
                    total=float(row["total"])
                )
                chunk_ventas.append(venta)
            
            yield chunk_ventas
