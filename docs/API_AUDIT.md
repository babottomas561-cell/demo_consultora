Tengo el Swagger de InfoManager completamente auditado contra datos reales. Este documento te dice exactamente qué saca cada endpoint GET, qué campos usar, cómo paginarlo, y qué widget o reporte construir con cada uno. No hay que adivinar nada.
## AUTENTICACIÓN

```
POST /api/v1/auth/login
Body: { "client_id": "...", "client_secret": "..." }
Respuesta: { "token": "<JWT>" }
Header: Authorization: Bearer <token>
```

Token expira. Reintentar con re-auth si recibes 401.
---
## REGLAS DE PAGINACIÓN (críticas)
| Patrón | Endpoints | Cómo llamar |
|---|---|---|
| Paginado real | `ventas`, `ventas/items`, `compras/items`, `clientes`, `articulos` | Loop incrementando `page` hasta que `results` esté vacío |
| Devuelve todo de una | `saldos_clientes`, `comprob_pendientes_clientes`, `facturas`, `facturas_con_recibos`, `facturas_compras` | `page=1&limit=1000` alcanza, no loopar |
| Sin paginación | `proveedores`, `vendedores`, `rubros`, `depositos`, `empresas`, `monedas`, `articulos/stock` | Una sola llamada |
**Todos los endpoints de `/reportes/*` necesitan `page` y `limit` en la query aunque no sean paginados, si no devuelven 400 con el mensaje engañoso "El formato del JSON enviado no es válido".**
---
## ENDPOINT POR ENDPOINT
---
### `GET /api/v1/empresas`
**Params:** ninguno
**Root:** lista directa
**Campos útiles:**

```
cod_empresa, nombre, cuit, categoria_iva, email, habilitada
```

**Qué sacar:** Siempre llamar primero. Nunca hardcodear `cod_empresa=1`. Cargar todas las empresas habilitadas y dejar al usuario filtrar. Si hay una sola, seleccionarla automáticamente.
**Widget:** Selector de empresa en el header global del dashboard.
---
### `GET /api/v1/depositos`
**Params:** ninguno
**Root:** lista directa
**Campos útiles:**

```
cod_deposito, descripcion, empresa { cod_empresa, nombre }
```

⚠️ Nombre en `descripcion`, no `nombre`.
**Qué sacar:** Maestro de depósitos para el filtro global. Hay 2: CAMARA (1) y uno genérico (99).
**Widget:** Filtro de depósito en paneles de Stock e Interdeposito.
---
### `GET /api/v1/monedas/all`
**Params:** ninguno
**Root:** lista directa
**Campos útiles:**

```
id, codigo, nombre, codigo2 (P=Pesos, D=Dolar), cod_afip, codigo3 (ARS, USD)
```

**Qué sacar:** Para convertir importes. Cuando `moneda = "D"`, multiplicar por `cotizacion` para obtener monto en pesos.
---
### `GET /api/v1/rubros/All`
**Params:** ninguno
**Root:** lista directa (7 registros)
**Campos útiles:**

```
cod_rubro, descripcion
```

**Qué sacar:** Maestro para ejes de gráficos. Usar `descripcion` como etiqueta.
**Widget:** Filtro de rubro. Eje X en FacturacionRubroWidget.
---
### `GET /api/v1/subrubros/All`
**Params:** ninguno
**Root:** lista directa (16 registros)
**Campos útiles:**

```
cod_subrubro, cod_rubro, descripcion
```

**Qué sacar:** Sub-clasificación de artículos. Joinear con rubros por `cod_rubro`.
**Widget:** Drill-down de rubro → subrubro en ventas y stock.
---
### `GET /api/v1/vendedores`
**Params:** ninguno
**Root:** lista directa (13 registros)
**Campos útiles:**

```
cod_vendedor, nombre, inactivo
```

⚠️ Estado en `inactivo` = "N" (activo) / "S" (inactivo). No hay campo `habilitado`.
**Qué sacar:** Maestro para filtro y labels de gráficos. Filtrar `inactivo = "N"`.
**Widget:** Filtro de vendedor. Labels en RankingVendedoresWidget.
---
### `GET /api/v1/proveedores`
**Params:** ninguno
**Root:** lista directa (1.402 registros)
**Campos útiles:**

```
cod_proveedor, nombre, categoria_iva, cuit, habilitado
```

**Qué sacar:** Maestro de proveedores. Indispensable porque `/api/v1/compras` devuelve `proveedor = null` siempre — el nombre del proveedor solo existe acá. Hacer lookup `cod_proveedor → nombre` antes de sincronizar compras.
**Widget:** Filtro de proveedor. Labels en RankingProveedoresWidget.
---
### `GET /api/v1/articulos`
**Params:** `page` (req), `limit` (req)
**Root:** `results` / `totalItems`
**Paginación:** real, loopar
**Campos útiles:**

```
cod_articulo, descripcion, habilitado, iva,
precio_compra, precio_venta,
cod_rubro, rubro, cod_subrubro, subrubro,
cod_proveedor, cod_barra, unidad_de_medida
```

⚠️ `rubro` y `subrubro` pueden ser null aunque `cod_rubro` tenga valor. Hacer lookup con maestro.
**Qué sacar:** Catálogo completo. Usar para enriquecer ventas/items (que no tienen `cod_rubro`).
**Widget:** Filtro de artículo. Tabla de catálogo con precios.
---
### `GET /api/v1/articulos/stock`
**Params:** ninguno
**Root:** lista directa (127 artículos con movimiento)
**Campos útiles:**

```
cod_articulo, descripcion,
existencia,              ← stock actual
pto_de_reposicion,       ← stock mínimo (NO buscar "stock_minimo", ese campo no existe)
stock_entradas, stock_salidas, compras, ventas,
existencia_anterior,
precio_compra, precio_venta,
cod_rubro, rubro, cod_subrubro, subrubro,
cod_proveedor, proveedor, habilitado
```

🚨 Campo para stock mínimo es `pto_de_reposicion`, no `stock_minimo` ni `punto_pedido`.
**Qué sacar:**
- Stock valorizado: `existencia × precio_compra` por artículo
- Artículos bajo mínimo: `existencia <= pto_de_reposicion`
- Artículos sin stock: `existencia <= 0`
- Rotación implícita: `ventas / (existencia + ventas)`
**Widgets:** StockKpiWidget (total existencia $), AlertasStockWidget (bajo mínimo), InventarioWidget (tabla), RotacionAbcWidget.
---
### `GET /api/v1/articulos/movimientos-por-articulo`
**Params:** `page` (req), `limit` (req), `cod_articulo` (req), `fecha_desde` (req), `fecha_hasta` (req)
**Root:** lista directa, paginado real
**Campos útiles:**

```
articulo, fecha, descripcion, deposito,
cantidad, unidad_de_medida, acumulado, precio, total
```

**Qué sacar:** Kardex completo de un artículo. Llamar por artículo + rango de fecha. `acumulado` es el stock acumulado tras cada movimiento. `descripcion` indica si es entrada, salida, compra, venta, etc.
**Widget:** KardexWidget / MovimientosStockWidget — drill-down desde AlertasStockWidget.
---
### `GET /api/v1/clientes`
**Params:** `page` (req), `limit` (req)
**Root:** `results` / `totalItems`
**Paginación:** real, loopar (4.651 registros)
**Campos útiles:**

```
cod_cliente, nombre, nombre_fantasia, cuit, categoria_iva,
mail,                  ← email está en "mail", NO en "email"
habilitado,            ← "S" / "N"
cod_vendedor, cod_zona, lista_precio,
condicion_venta, cod_rubro_cliente, rubro_cliente,
cod_provincia, provincia, localidad,
fecha_alta
```

🚨 Email en campo `mail`, no `email`.
🚨 `habilitado` es string "S"/"N", no booleano.
**Qué sacar:**
- Segmentación por `rubro_cliente` (DISTRIBUIDORA, RESTAURANTE, etc.)
- Distribución geográfica por `provincia` / `localidad`
- Asignación a vendedores: `cod_vendedor`
- Clientes por lista de precios: `lista_precio`
**Widgets:** SegmentacionClientesWidget, mapa por provincia, filtro de clientes.
---
### `GET /api/v1/ventas`
**Params:** `fechaDesde` (req), `fechaHasta` (req), `page` (req), `limit` (req)
**Root:** `results` / `totalItems`
**Paginación:** real, loopar
**Campos útiles:**

```
id, fecha, tipo_comprobante, tipo_factura, numero, punto_de_venta,
moneda, cotizacion,
total, neto, iva_importe, importe_iva_10_5, importe_iva_27,
cod_cliente, cod_vendedor, cod_empresa, tag,
condicion_venta_tipo, cod_deposito,
anulada,               ← "S" / "N"
cae, fac_electronica,  ← para control de facturación electrónica
```

⚠️ Devuelve FA + RE (recibos) + PR (presupuestos) mezclados. **Filtrar siempre: `tipo_comprobante IN ('FA', 'NC', 'ND')`**.
⚠️ Para multi-moneda: si `moneda = "D"`, el `total` está en dólares. Convertir con `total × cotizacion`.
**Qué sacar:**
- Facturación del período por empresa/vendedor/punto de venta
- IVA discriminado: `importe_iva_10_5` (alimentos) y `importe_iva_27` para libro IVA
- Saldo pendiente: joinear con `reportes/facturas`
**Widgets:** VentasKpiWidget, EvolucionTemporalWidget, ComprobantesTipoWidget.
---
### `GET /api/v1/ventas/items`
**Params:** `fechaDesde` (req), `fechaHasta` (req), `page` (req), `limit` (req)
**Root:** `results`
**Paginación:** real, loopar
**Campos útiles:**

```
id, id_comprobante,    ← FK a ventas.id
cod_articulo, detalle,
cantidad, precio, importe,          ← importe = cantidad × precio ✅
precio_compra_actual,               ← COSTO REAL al momento de venta ← usar para margen
precio_compra_lp,                   ← precio de lista (menos fiable)
precio_con_iva,
descuento_porc, descuento,
iva_por, iva_importe, tipo_iva,
cod_lista_precios, cod_unidad_negocio,
cod_vendedor
```

⚠️ **No tiene `fecha` ni `cod_cliente`**. Para obtenerlos: JOIN con `ventas` por `id_comprobante`.
⚠️ **No tiene `cod_rubro`**. Para el rubro: JOIN con maestro `articulos` por `cod_articulo`.
✅ `importe = cantidad × precio` (confirmado correcto, distinto a compras).
✅ `precio_compra_actual` es el costo real al momento de facturar. **Usar este campo para calcular margen, nunca el precio de lista.**
**Qué sacar:**
- Margen por línea: `(precio - precio_compra_actual) / precio × 100`
- Top artículos por importe o por margen
- Impacto de descuentos: `descuento_porc > 0` filtra líneas con descuento
**Widgets:** RankingProductosWidget, ParetoProductosWidget, DescuentosWidget, ScatterPortafolioWidget (volumen vs margen).
---
### `GET /api/v1/compras`
**Params:** `fechaDesde` (req), `fechaHasta` (req)
**Root:** lista directa (sin paginación)
**Campos útiles:**

```
id, fecha, fecha_comprobante, tipo_comprobante, tipo_factura,
numero, punto_de_venta, moneda, cotizacion,
importe_total,         ← total (NO usar "total", ese campo no existe acá)
importe_iva,           ← IVA (NO usar "iva_importe")
cod_proveedor,
proveedor,             ← SIEMPRE null. Nombre viene del maestro /proveedores
cod_empresa, tag, anulada, cod_deposito
```

🚨 `proveedor = null` siempre. Lookup: `cod_proveedor → nombre` usando maestro.
🚨 Campo de total es `importe_total`, no `total`.
🚨 Campo de IVA es `importe_iva`, no `iva_importe`.
**Qué sacar:** Cabeceras de facturas de compra para cruzar con items.
---
### `GET /api/v1/compras/items`
**Params:** `fechaDesde` (req), `fechaHasta` (req), `page` (req), `limit` (req)
**Root:** `lComprasItems` / `totalItems`
**Paginación:** real, loopar (root key es `lComprasItems`, no `results`)
**Campos útiles:**

```
id, id_comprobante,
cod_articulo, detalle, cantidad,
precio, precio_con_iva,
importe,               ← 🚨 SIEMPRE 0.0 (bug de la API)
precio_sin_descuento, descuento,
iva_por, iva_importe, cod_cuenta
```

🚨 **`importe = 0` siempre**. Total real = `cantidad × precio_con_iva`.
**Qué sacar:** Detalle de qué se compró. Para el total de cada línea, calcular `cantidad × precio_con_iva`.
---
### `GET /api/v1/compras/compras-por-factura`
**Params:** `page` (req), `limit` (req), `fecha_desde` (req), `fecha_hasta` (req), `cod_proveedor=0`, `cod_articulo=0`, `cod_rubro=0`, `cod_subrubro=0`, `cod_unidad_negocio=0`, `centro_de_costo=T`, `usuario=admin`
**Root:** lista directa, paginado real
**Campos útiles:**

```
empresa, punto_de_venta, numero_de_comprobante,
tipo_de_comprobante, letra, fecha, moneda_del_comprobante,
cotizacion, codigo_del_proveedor, proveedor,
codigo_articulo, codigo_barra, articulo,
un, codigo_rubro, rubro, codigo_subrubro, subrubro,
cantidad, precio_unitario,
importe_neto, porc_descuento, imp_neto_con_descuento,
iva, total
```

✅ El endpoint más completo para compras: tiene `proveedor`, `rubro`, `subrubro`, `importe_neto` e IVA en un solo lugar.
✅ `total` y `importe_neto` correctos acá (a diferencia de `compras/items`).
**Qué sacar:** Análisis de compras por artículo con classification completa. Usar este en vez de joinear `compras` + `compras/items` + maestros cuando se necesite la vista analítica.
**Widgets:** EvolucionComprasWidget, ParetoComprasWidget, VariacionPreciosWidget.
---
### `GET /api/v1/reportes/facturas`
**Params:** `fechaDesde` (req), `fechaHasta` (req), `tag` (req), `codEmpresa` (req), `page=1`, `limit=1000`
**Root:** lista directa (devuelve todo aunque tenga page/limit)
**Campos útiles:**

```
fa_id, fa_fecha, tipo_comprobante,
fa_pto_vta, fa_nro,
fa_cod_empresa, fa_moneda, fa_cotiz,
cod_cliente, cod_vendedor,
fa_total, fa_total_moneda_local,
rc_imp_pagado,         ← lo que ya cobró
saldo_fa,              ← lo que falta cobrar (ya calculado: fa_total - rc_imp_pagado)
ultimo_recibo, remitos_asociados,
primer_fec_vto, ult_fec_vto, vto_cant_cuotas, vto_importe
```

✅ `saldo_fa` ya viene calculado. No recalcular.
**Qué sacar:**
- Facturas impagas: filtrar `saldo_fa > 0`
- Aging de cartera: `(hoy - fa_fecha)` en días agrupado en tramos 0-30/31-60/61-90/+90
- Estado de cuenta por cliente: group by `cod_cliente`, sum `saldo_fa`
**Widgets:** AgingCobranzaWidget, FacturasCobrarWidget, SaldosConsolidadosWidget.
---
### `GET /api/v1/reportes/facturas_con_recibos`
**Params:** `fechaDesde` (req), `fechaHasta` (req), `tag` (req), `codEmpresa` (req), `page=1`, `limit=1000`
**Root:** lista directa
**Campos útiles:**

```
fa_id, fa_fecha, tipo_comp,    ← OJO: "tipo_comp", no "tipo_comprobante"
fa_pto_vta, fa_nro,
cod_cliente, fa_total, fa_total_moneda_local,
rc_id, rc_fecha, rc_nro,
imp_pag_moneda_local,          ← importe cobrado en pesos
cond_pago,                     ← "EF"=efectivo, "CH"=cheque, "TC"=tarjeta
importe, cod_banco,
cheque_numero, cheque_fec_pago,
importe_retencion,
primer_fec_vto, ult_fec_vto
```

⚠️ Tipo en `tipo_comp`, no `tipo_comprobante`.
**Qué sacar:**
- Cobranza del período: sum `imp_pag_moneda_local` por fecha
- Mix de medios de pago: group by `cond_pago`
- Cheques en cartera: filtrar `cond_pago = "CH"`, proyectar por `cheque_fec_pago`
- Días de pago promedio: `rc_fecha - fa_fecha` por cliente
**Widgets:** FlujoWidget, PorTipoWidget (efectivo vs cheque vs tarjeta), EficienciaCobranzaWidget.
---
### `GET /api/v1/reportes/facturas_compras`
**Params:** `fechaDesde` (req), `fechaHasta` (req), `tag` (req), `codEmpresa` (req), `codProveedor=0` (req, 0=todos), `page=1`, `limit=1000`
**Root:** lista directa
**Campos útiles:**

```
fa_id, fa_fecha, fa_pto_vta, fa_nro,
fa_cod_empresa, moneda,
cod_proveedor, nombre,         ← nombre del proveedor (sí está acá)
fa_total,
op_imp_pagado,                 ← lo que ya se pagó
saldo_fa,                      ← lo que falta pagar
nro_ultima_OP,
primer_fec_vto, ult_fec_vto, vto_cant_cuotas, vto_importe
```

✅ `nombre` del proveedor sí viene acá (a diferencia de `compras` cabeceras).
**Qué sacar:**
- Deuda a proveedores: `saldo_fa > 0` group by `cod_proveedor`
- Vencimientos próximos: ordenar por `primer_fec_vto`
- Cash out proyectado: agrupar `saldo_fa` por semana de `ult_fec_vto`
**Widgets:** VencimientosProveedoresWidget, CalendarioPagosWidget, RankingProveedoresWidget (por deuda).
---
### `GET /api/v1/reportes/saldos_clientes`
**Params:** `tag` (req), `codCliente=0` (req, 0=todos), `codEmpresa` (req), `page=1`, `limit=1000`
**Root:** lista directa (ignora paginación, devuelve todos los 4.651 clientes)
**Campos útiles:**

```
cod_cliente, nombre,
tot_entrada,           ← total débitos (facturas emitidas)
tot_salida,            ← total créditos (cobros recibidos)
tot_saldo,             ← saldo neto (positivo = deuda del cliente)
dias_deuda,            ← días desde el comprobante más antiguo sin cobrar
color,                 ← semáforo de la API ("verde","amarillo","rojo")
```

**Qué sacar:**
- Ranking de deudores: order by `tot_saldo DESC`
- Semáforo de cartera: group by `color`
- Clientes con `tot_saldo < 0`: tienen saldo a favor (pagaron de más)
- KPI: sum `tot_saldo` = deuda total de cartera
**Widgets:** SaldosClientesWidget, ClientesKpiWidget (total cartera), ClientesRiesgoWidget.
---
### `GET /api/v1/reportes/comprob_pendientes_clientes`
**Params:** `tag` (req), `codCliente=0` (req, 0=todos), `codEmpresa` (req), `page=1`, `limit=1000`
**Root:** lista directa
**Campos útiles:**

```
id, tipo_comprobante, nombre,
cod_cliente, cod_empresa, cod_vendedor,
punto_de_venta, numero,
fecha_factura,
importe_factura, importe_pagado, saldo,
dias_deuda,            ← días desde fecha_factura
color,                 ← semáforo
medio_pago, moneda_fa, cotizacion_fa
```

⚠️ Sin `fecha_vencimiento`. Para aging usar `fecha_factura + días hábitos según condición de venta`.
**Qué sacar:**
- Listado de comprobantes impagos por cliente (drill-down desde saldos)
- Aging real documento por documento: group por tramos de `dias_deuda`
- Por vendedor: `cod_vendedor` para medir cartera por vendedor
**Widgets:** ComprobantesClienteWidget, AgingCobranzaWidget (nivel documento).
---
### `GET /api/v1/reportes/disponible_por_cliente`
**Params:** `codCliente` (req, NO usar 0 — da error)
**Root:** lista directa (1 registro)
**Campos útiles:**

```
cod_cliente, nombre,
saldo,                 ← deuda actual
margen_acuerdos,       ← límite de crédito acordado
disponible,            ← margen_acuerdos - saldo
status, mensaje
```

⚠️ Llamar de a un cliente. No acepta `codCliente=0`.
**Qué sacar:** Semáforo de crédito disponible para el cliente antes de aprobar una venta.
**Widget:** CreditoDisponibleWidget — mostrar en el drill-down de un cliente específico.
---
### `GET /api/v1/reportes/lista_precio_por_codigo`
**Params:** `codLista` (req), `fechaDesde` (req), `fechaHasta` (req), `page=1`, `limit=1000`
**Root:** lista directa (23 artículos en lista 4)
**Campos útiles:**

```
cod_lista, cod_articulo, art_descripcion,
art_moneda, art_iva,
art_precio_compra,         ← costo
lista_precio_venta,        ← precio en esta lista
lista_precio_con_iva,      ← precio con IVA incluido
lista_porcentaje,          ← markup %
lista_descuento,
lista_cotizacion
```

**Qué sacar:**
- Margen implícito por lista: `(lista_precio_venta - art_precio_compra) / lista_precio_venta × 100`
- Comparar listas entre sí: llamar con distintos `codLista` y joinear por `cod_articulo`
- Detectar artículos con markup muy bajo o negativo
**Widget:** MargenPorListaWidget, comparador de listas de precios.
---
### `GET /api/v1/presupuestos/confirmados` y `/no_confirmados`
**Params:** ninguno
**Root:** lista de `{ "venta": { ... } }` — el objeto está anidado bajo la clave `venta`
**Campos útiles (dentro de `venta`):**

```
id, fecha, cod_cliente, cliente,    ← "cliente" no "cliente_nombre"
cod_vendedor, vendedor,
cod_empresa, empresa,
tag, observaciones,
cod_origen_sistema, origen_sistema  ← "App de pedidos", "IM4", etc.
```

⚠️ Sin campo `total` ni `importe`. No hay monto del presupuesto disponible.
⚠️ Nombre del cliente en `cliente`, no en `cliente_nombre`.
**Qué sacar:**
- Confirmados: pipeline ganado (864 presupuestos). Tasa de conversión = confirmados / (confirmados + no_confirmados).
- No confirmados: oportunidades abiertas (4 activas). Group by vendedor para ver pipeline por comercial.
- Canal de origen: `origen_sistema` para saber qué % viene de "App de pedidos" vs "IM4".
**Widget:** GoalTrackerWidget, ConversionVendedoresWidget.
---
## JOINS NECESARIOS (lo que la API no trae junto)
| Necesitás | Fuente A | Fuente B | Join por |
|---|---|---|---|
| Fecha + cliente en ítems de venta | `ventas/items` | `ventas` (cabeceras) | `id_comprobante = ventas.id` |
| Rubro/subrubro en ítems de venta | `ventas/items` | `articulos` | `cod_articulo` |
| Nombre de proveedor en compras | `compras` (cabeceras) | `proveedores` | `cod_proveedor` |
| Nombre de cliente en ventas | `ventas` | `clientes` | `cod_cliente` |
| Nombre de vendedor | cualquier tabla con `cod_vendedor` | `vendedores` | `cod_vendedor` |
| Nombre de depósito | cualquier tabla con `cod_deposito` | `depositos` | `cod_deposito` |
---
## ENDPOINTS QUE NO FUNCIONAN (no usar)
| Endpoint | Error | Alternativa |
|---|---|---|
| `GET /api/v1/ventas/facturas-con-pagos` | 500 (SP no existe en test) | `reportes/facturas_con_recibos` |
| `GET /api/v1/depositos/stock_por_deposito/{id}` | 500 | `articulos/stock` tiene `cod_deposito` |
## LO QUE LA API DIRECTAMENTE NO TIENE
Cheques en cartera, anticipos, conciliación proveedor-cliente, saldos por cuenta contable, IVA período cerrado, balances. No hay endpoint. No buscar.

---
## OPERACIONES DE ESCRITURA (POST / PUT) — según guía funcional oficial

### CENTROS DE COSTO — Tabla unificada definitiva
| Endpoint | Parámetro | S | N | T disponible |
|---|---|---|---|---|
| Ventas POST/GET | `tag` | CC1 | CC2 | No |
| Compras | `tag` | CC1 | CC2 | No |
| Compras por factura | `centro_costo` | CC1 | CC2 | T=ambos |
| Recibos | `centro_costo` | CC1 | CC2 | No |
| Presupuestos | `tag` | CC1 | CC2 | No |
| **Libro mayor** | `tag` | **CC2 ⚠️** | **CC1 ⚠️** | No |
| Reportes facturas | `tag` | CC1 | CC2 | No |
| Saldos clientes | `TAG` (mayúsc.) | CC2 | CC1 | T=ambos |
| Comprobantes pendientes | `TAG` (mayúsc.) | CC2 | CC1 | T=ambos |

### id_destino para ventas
| ID | Destino |
|---|---|
| 1 | Manual |
| 2 | Comprobante Electrónico Interno |
| 3 | Controlador Fiscal |
| 4 | Comprobante Electrónico Exterior |
| 5 | Preimpreso |
| 10 | Comprobante en línea PyME |
| 11 | Mostrador CC2 |

### Estructura Plan de Cuentas (para Caja y ER)
```
1xxxxxxx → ACTIVO
  111xxxx → Caja y Bancos (para widget CajaYBancos)
  112xxxx → Bancos CC
2xxxxxxx → PASIVO
  21xxxxx → Proveedores (cod ~2121001)
3xxxxxxx → PATRIMONIO NETO
4xxxxxxx → INGRESOS / Ventas (para Estado de Resultados)
5xxxxxxx → COSTOS y GASTOS (para Estado de Resultados)
```

### POST /api/v1/ventas — campos clave
- `numero=0` → genera automáticamente
- `fac_electronica`: 0=No electrónica, 1=CAE ya obtenido, 2=Pendiente (sistema pide)
- Consultar `/api/v1/puntos-de-venta` antes de crear para saber punto + id_destino

### POST /api/v1/Recibo (capital R) — campos clave
- `centro_costo` (no `tag`) en recibos: S=CC1, N=CC2 (NO invertido)
- `pagos`: array de medios de pago (EF=efectivo, TJ=tarjeta)
- `comprobantes`: array de facturas a cobrar con su importe
- La suma de pagos debe coincidir con suma de comprobantes

### GET /api/v1/clientes/GetDatosArca/{identificador}
- Solo números sin guiones: CUIT/CUIL 11 dígitos, DNI 7 u 8
- 200: datos encontrados. 400: formato incorrecto. 502: no existe en AFIP

### artículos/stock — campo para stock mínimo
- Campo correcto: `pto_de_reposicion` (NO `stock_minimo` ni `punto_pedido`)
- `existencia` = stock actual (NO `cantidad`)
