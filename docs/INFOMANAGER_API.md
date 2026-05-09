# Infomanager API

Base documental consultada: `Documentacion Funcional API (1).docx` y estructura Swagger indicada por Infomanager. La API requiere autenticacion previa con `client_id` y `client_secret`, y luego usa token Bearer.

## Autenticacion

| Metodo | Endpoint | Campos principales | Uso BI |
|---|---|---|---|
| POST | `/api/v1/auth/login` | `client_id`, `client_secret`, `access_token`, `token_type`, `expires_in` | Gestion de credenciales, healthcheck de fuente, renovacion de token |

## Datos Transaccionales

| Metodo | Endpoint | Campos principales | KPI que alimenta |
|---|---|---|---|
| GET | `/api/v1/ventas` | `id`, `fecha`, `tipo_comprobante`, `tipo_factura`, `numero`, `punto_de_venta`, `cod_cliente`, `cod_vendedor`, `cod_empresa`, `total`, `neto`, `iva_importe`, `anulada`, `cod_deposito`, `tag`, `condicion_venta_tipo` | Ventas totales, ticket promedio, ventas por vendedor, punto de venta, empresa, deposito, condicion de venta, anulaciones |
| GET | `/api/v1/ventas/{id}` | Cabecera de venta + `items` con `cod_articulo`, `cantidad`, `precio`, `precio_con_iva`, `precio_compra_actual`, `descuento_porc`, `cod_barra` | Margen por producto, unidades, descuento promedio, mix de productos |
| GET | `/api/v1/ventas/items` | `id`, `id_comprobante`, `fecha`, `cod_cliente`, `cod_vendedor`, `cod_articulo`, `detalle`, `cantidad`, `precio`, `precio_compra_actual`, `importe` | Top productos, margen bruto, stock vendido, ventas por rubro/subrubro si se cruza con articulos |
| GET | `/api/v1/compras` | `id`, `fecha`, `cod_proveedor`, `tipo_comprobante`, `numero`, `total`, `neto`, `iva_importe`, `cod_deposito`, `anulada` | Compras, costo mercaderia, compras por proveedor, compras por deposito |
| GET | `/api/v1/compras/{id}` | Cabecera de compra + items con `cod_articulo`, `cantidad`, `precio_compra`, `importe` | Costo unitario, reposicion, margen estimado |
| GET | `/api/v1/recibo` | `id`, `fecha`, `cod_cliente`, `importe`, `forma_pago`, `factura_id`, `tarjeta_numero`, `tarjeta_cupon` | Cobros, caja, medios de pago, cobranza por cliente |
| GET | `/api/v1/remitos` | `id`, `fecha`, `cod_cliente`, `cod_deposito`, `mueve_stock`, `items` | Movimientos fisicos, entregas, diferencias venta/remito |
| GET | `/api/v1/interdeposito` | `id`, `fecha`, `cod_deposito_origen`, `cod_deposito_destino`, `items` | Transferencias, disponibilidad por deposito |

## Maestros

| Metodo | Endpoint | Campos principales | KPI que alimenta |
|---|---|---|---|
| GET | `/api/v1/clientes` | `id`, `cod_cliente`, `nombre`, `razon_social`, `cuit`, `categoria_iva`, `email`, `cod_vendedor`, `lista_precio`, `condicion_venta`, `habilitado` | Segmentacion clientes, ventas/cobros por cliente, cartera por vendedor |
| GET | `/api/v1/clientes/{cod_cliente}` | Detalle completo cliente | Drilldown de cliente, riesgo de cobranza |
| GET | `/api/v1/proveedores` | `cod_proveedor`, `nombre`, `razon_social`, `cuit`, `email`, `habilitado`, `condicion_compra` | Compras por proveedor, deuda proveedor |
| GET | `/api/v1/articulos` | `cod_articulo`, `descripcion`, `cod_rubro`, `cod_subrubro`, `iva`, `precio_compra`, `precio_venta`, `tipo_movimiento`, `cod_barra`, `habilitado` | Productos, margen teorico, ventas por rubro/subrubro |
| GET | `/api/v1/articulos/{cod_articulo}` | Detalle articulo | Drilldown producto |
| GET | `/api/v1/articulos/detallado/{cod_articulo}` | Articulo + rubro, subrubro, caracteristicas | Analitica por categoria |
| GET | `/api/v1/articulos/unidadDeVenta/{cod_articulo}` | `cod_unidad`, `nombre`, `coeficiente_conversion`, `tipo`, `predefinida` | Conversion de unidades, compras vs ventas |
| GET | `/api/v1/vendedores` | `cod_vendedor`, `nombre`, `email`, `habilitado` | Ventas, margen y cobranza por vendedor |
| GET | `/api/v1/empresas` | `cod_empresa`, `nombre`, `cuit`, `direccion`, `categoria_iva`, `habilitada` | Filtros por empresa, multiempresa futura |
| GET | `/api/v1/puntos-de-venta` | `id`, `nombre`, `cod_empresa`, `habilitado` | Ventas por sucursal/punto de venta |
| GET | `/api/v1/rubros` | `cod_rubro`, `descripcion` | Ventas, stock y margen por rubro |
| GET | `/api/v1/subrubros` | `cod_subrubro`, `cod_rubro`, `descripcion` | Ventas, stock y margen por subrubro |
| GET | `/api/v1/lista-de-precios` | `cod_lista`, `descripcion`, `moneda`, `habilitada` | Analisis de listas y pricing |
| GET | `/api/v1/monedas` | `moneda`, `descripcion` | Conversion de importes |
| GET | `/api/v1/cotizaciones` | `fecha`, `moneda`, `cotizacion` | Deflactacion, dolarizacion, analisis macro |

## Reportes Prearmados

| Metodo | Endpoint | Campos principales | KPI que alimenta |
|---|---|---|---|
| GET | `/api/v1/reportes/saldos_clientes` | `cod_cliente`, `cliente_nombre`, `saldo`, `vencido`, `a_vencer`, `fecha_ultimo_movimiento` | Cuentas corrientes clientes, aging, riesgo de cobranza |
| GET | `/api/v1/reportes/comprob_pendientes` | `id`, `fecha`, `tipo_comprobante`, `cod_cliente`, `total`, `saldo`, `fecha_vencimiento` | Pendientes de cobro, flujo proyectado |
| GET | `/api/v1/reportes/facturas_con_recibos` | `factura_id`, `recibo_id`, `fecha_factura`, `fecha_recibo`, `importe_factura`, `importe_recibo` | Dias de cobranza, conciliacion venta/cobro |
| GET | `/api/v1/reportes/facturas_compras` | `id`, `fecha`, `cod_proveedor`, `proveedor_nombre`, `total`, `saldo`, `fecha_vencimiento` | Cuentas a pagar, cash out proyectado |
| GET | `/api/v1/reportes/disponible_por_cliente` | `cod_cliente`, `limite_credito`, `saldo`, `disponible` | Limite crediticio, bloqueo comercial |
| GET | `/api/v1/reportes/ventas` | Totales agregados por fecha, cliente, vendedor, articulo | Validacion de BI vs reporte Infomanager |
| GET | `/api/v1/reportes/stock` | Stock por articulo/deposito | Control de inventario |

## Stock

| Metodo | Endpoint | Campos principales | KPI que alimenta |
|---|---|---|---|
| GET | `/api/v1/articulos/stock` | `cod_articulo`, `descripcion`, `cod_deposito`, `deposito`, `cantidad`, `stock_minimo`, `precio_compra_actual` | Stock disponible, valorizacion, quiebres |
| GET | `/api/v1/articulos/movimientos-por-articulo/{cod_articulo}` | `fecha`, `tipo_movimiento`, `comprobante`, `cantidad`, `cod_deposito`, `saldo` | Rotacion, kardex, trazabilidad de stock |
| GET | `/api/v1/depositos` | `cod_deposito`, `nombre`, `habilitado` | Filtros de stock y ventas por deposito |

## Presupuestos

| Metodo | Endpoint | Campos principales | KPI que alimenta |
|---|---|---|---|
| GET | `/api/v1/presupuestos/confirmados` | `id`, `fecha`, `cod_cliente`, `cliente_nombre`, `cod_vendedor`, `total`, `fecha_conversion`, `venta_id` | Conversion de presupuestos, pipeline ganado |
| GET | `/api/v1/presupuestos/no_confirmados` | `id`, `fecha`, `cod_cliente`, `cliente_nombre`, `cod_vendedor`, `total` | Pipeline perdido, tasa de conversion |
| GET | `/api/v1/presupuestos/{id}` | Cabecera + items | Analisis de oportunidad por producto |

## Campos Minimos a Normalizar

- Identidad: IDs externos estables (`id`, `numero`, `cod_*`) y fuente.
- Tiempo: `fecha`, `fecha_vencimiento`, `fecha_conversion`, `created_at`.
- Segmentacion: empresa, punto de venta, vendedor, cliente, proveedor, deposito, rubro, subrubro.
- Importes: total, neto, IVA, costo, precio, descuento, saldo.
- Estado: anulada, confirmada, habilitado, tag, condicion de venta.

## KPIs Derivables

- Ventas: facturacion, unidades, ticket promedio, descuentos, anulaciones, ventas por vendedor/punto/rubro.
- Margen: neto - costo, margen por producto/rubro/vendedor.
- Compras: costo mercaderia, compras por proveedor, reposicion.
- Caja: cobros, pagos, saldo neto, medios de pago.
- Cuentas corrientes: saldo, vencido, a vencer, dias de cobranza.
- Stock: cantidad disponible, valorizacion, rotacion, productos bajo minimo.
- Presupuestos: conversion, pipeline, monto perdido, tiempo a conversion.
