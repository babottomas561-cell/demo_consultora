# Auditoría API Infomanager — Mayo 2026

Ejecutada el 2026-05-16 contra `https://impedidos.infomanager.com.ar`  
Credenciales: `ck_test_imp_02` / tenant **Test IMP 02 (ALAMENIA SA)**

---

## Estado de endpoints

| Endpoint | HTTP | Registros | Root key | Observaciones |
|---|---|---|---|---|
| `GET /api/v1/ventas` | 200 | 318 | `results` / `totalItems` | Paginado. Incluye RE, PR contaminando la lista |
| `GET /api/v1/ventas/items` | 200 | paginado | `results` | Sin fecha/cod_cliente; requiere join con cabeceras |
| `GET /api/v1/ventas/facturas-con-pagos` | 500 | — | — | SP no existe en entorno test |
| `GET /api/v1/compras` | 200 | 30 | lista directa | `proveedor` = null en cabecera; nombre viene del maestro |
| `GET /api/v1/compras/items` | 200 | paginado | `lComprasItems` / `totalItems` | `importe` = 0 siempre; usar `cantidad × precio_con_iva` |
| `GET /api/v1/compras/compras-por-factura` | 200 | paginado | lista directa | Requiere `page`, `limit`, `usuario`, `fecha_desde`, `fecha_hasta` como query params |
| `GET /api/v1/articulos` | 200 | 325 | `results` / `totalItems` | `rubro`/`subrubro` presentes pero null en algunos |
| `GET /api/v1/articulos/stock` | 200 | 127 | lista directa | Stock en `existencia`; mínimo en `pto_de_reposicion` |
| `GET /api/v1/depositos` | 200 | 2 | lista directa | Nombre en `descripcion` |
| `GET /api/v1/depositos/stock_por_deposito/{id}` | 500 | — | — | Error de servidor en entorno test |
| `GET /api/v1/articulos/movimientos-por-articulo` | 200 | paginado | lista directa | Requiere `fecha_desde`, `fecha_hasta`, `cod_articulo`, `cod_deposito` |
| `GET /api/v1/clientes` | 200 | 4.651 | `results` / `totalItems` | Email en campo `mail`; `habilitado` = "S"/"N" |
| `GET /api/v1/proveedores` | 200 | 1.402 | lista directa | Campos mínimos |
| `GET /api/v1/vendedores` | 200 | 13 | lista directa | Estado en `inactivo` = "N"/"S" |
| `GET /api/v1/presupuestos/confirmados` | 200 | 864 | lista de `{venta:{...}}` | Sin campo `total`; `cliente` en vez de `cliente_nombre` |
| `GET /api/v1/presupuestos/no_confirmados` | 200 | 4 | lista de `{venta:{...}}` | Igual que confirmados |
| `GET /api/v1/reportes/facturas` | 200 | 49 | lista directa | Requiere `tag`, `codEmpresa`, `fechaDesde`, `fechaHasta`, `page`, `limit` |
| `GET /api/v1/reportes/facturas_con_recibos` | 200 | 27 | lista directa | Requiere `tag`, `codEmpresa`, `fechaDesde`, `fechaHasta`, `page`, `limit` |
| `GET /api/v1/reportes/facturas_compras` | 200 | 10 | lista directa | Requiere `tag`, `codEmpresa`, `codProveedor`, `fechaDesde`, `fechaHasta`, `page`, `limit` |
| `GET /api/v1/reportes/saldos_clientes` | 200 | 4.651 | lista directa | Ignora paginación; devuelve todos. Requiere `tag`, `codCliente`, `codEmpresa`, `page`, `limit` |
| `GET /api/v1/reportes/comprob_pendientes_clientes` | 200 | 102 | lista directa | Requiere `tag`, `codCliente`, `codEmpresa`, `page`, `limit` |
| `GET /api/v1/reportes/disponible_por_cliente` | 200 | 1 | lista directa | Requiere `codCliente` específico; `codCliente=0` → error |
| `GET /api/v1/reportes/lista_precio_por_codigo` | 200 | 23 | lista directa | Requiere `codLista`, `fechaDesde`, `fechaHasta`, `page`, `limit` |
| `GET /api/v1/rubros/All` | 200 | 7 | lista directa | |
| `GET /api/v1/subrubros/All` | 200 | 16 | lista directa | |
| `GET /api/v1/puntos-de-venta` | 200 | 20 | lista directa | |
| `GET /api/v1/empresas` | 200 | 1 | lista directa | |
| `GET /api/v1/monedas/all` | 200 | 2 | lista directa | |

> **Nota sobre 400 "JSON inválido"**: todos los endpoints de reportes devuelven 400 si no se incluyen `page` y `limit` en la query string, incluso si los demás parámetros son correctos. El mensaje de error ("El formato del JSON enviado no es válido") es engañoso. No son endpoints POST — son GET puros que exigen estos params.

---

## Campos reales de cada endpoint

### `/api/v1/ventas` (cabeceras)
```
id, fecha, fecha_entrega, tipo_presupuesto, tipo_comprobante, tipo_factura,
numero, punto_de_venta, moneda, cotizacion, cotizacion_2, id_destino,
total, cod_cliente, cod_vendedor, cod_empresa, cod_unidad_negocio_cab,
tag, talonario_manual, mueve_stock, condicion_venta_tipo, iva_importe,
importe_iva_10_5, importe_iva_27, neto, no_grabado, observaciones,
usuario, usuario_fecha, fac_electronica, fecha_cae, cae, numero_cai,
afip_comprobantes_fe, afip_conceptos_fe, afip_tipdoc_fe, afip_cod_barra,
afip_cond_vta, anulada, cod_compatibilidad, cod_jurisdiccion,
cod_deposito, cod_deposito_destino, cod_jurisdiccion_comerc,
tipo_recibo, genero_re_auto, moneda_2, arca_cond_iva
```
⚠️ El endpoint devuelve ALL tipos de comprobante: FA, RE (recibos), PR (presupuestos), etc.
El conector filtra correctamente dejando sólo FA/NC/ND.

### `/api/v1/ventas/items`
```
id, id_comprobante, cod_articulo, cantidad, precio, importe, detalle,
editar_precio, descuento, iva_por, iva_importe, cod_cuenta,
id_remito_compra, id_remito_venta, precio_compra_actual,
id_articulos_unid_med, cod_unidad_negocio, descuento_porc, precio_orig,
fe_permiso, fe_pais_dest, cod_actividad, precio_con_iva,
cod_lista_precios, orden, item_tipo_interes, remanente, fecha_entrega,
equivalencia_um, afip_unidad_de_medida, estado_item, cod_vendedor,
detalle_aux, precio_compra_lp, cod_uni_venta, cant_uni_venta, tipo_iva
```
⚠️ Sin `fecha` ni `cod_cliente` — requiere join con cabeceras vía `id_comprobante`.
⚠️ Sin `cod_rubro` — rubro viene del maestro de artículos.
✅ `importe` correcto (≠ compras): `importe = cantidad × precio` validado.

### `/api/v1/compras` (cabeceras)
```
id, fecha, fecha_comprobante, tipo_comprobante, tipo_factura, numero,
punto_de_venta, moneda, cotizacion, importe_total, cod_proveedor,
proveedor, cod_empresa, tag, detalle, vencimiento_cai, nro_cai,
anulada, cod_cuenta, cod_deposito, deposito, mueve_stock, nrointerno,
importe_iva, id_orden_de_compra, items
```
⚠️ `proveedor` = null (siempre). Nombre viene del maestro `/api/v1/proveedores`.
⚠️ Total en `importe_total` (no `total`). IVA en `importe_iva` (no `iva_importe`).

### `/api/v1/compras/items`
```
id, id_comprobante, cod_articulo, cantidad, precio, importe, detalle,
editar_precio, descuento, cod_cuenta, iva_por, iva_importe, cod_maquina,
id_factura_venta, id_remito_compra, id_remito_venta, cod_unidad_negocio,
precio_con_iva, cod_cli_venta, id_factura_items, id_remito_items,
id_articulos_unid_med, precio_sin_descuento, cant_uni_compra,
cod_uni_compra, precio_uni_compra
```
🚨 `importe` = **siempre 0.0** (bug de la API). Total real = `cantidad × precio_con_iva`.

### `/api/v1/compras/compras-por-factura`
```
empresa, punto_de_venta, numero_de_comprobante, tipo_de_comprobante,
letra, fecha, moneda_del_comprobante, cotizacion, codigo_del_proveedor,
proveedor, codigo_articulo, codigo_barra, articulo, un, codigo_rubro,
rubro, codigo_subrubro, subrubro, cantidad, precio_unitario,
importe_neto, porc_descuento, imp_neto_con_descuento, iva, total
```
✅ Endpoint más completo para compras: incluye rubro/subrubro, importe_neto, IVA.
Requiere params: `fecha_desde`, `fecha_hasta`, `cod_proveedor=0`, `cod_articulo=0`,
`cod_rubro=0`, `cod_subrubro=0`, `cod_unidad_negocio=0`, `centro_de_costo=T`,
`usuario=admin`, `page`, `limit`.

### `/api/v1/articulos/stock`
```
cod_articulo, descripcion, stock_entradas, stock_salidas, compras, ventas,
cod_rubro, rubro, cod_subrubro, subrubro, pto_de_reposicion, precio_compra,
precio_venta, ubicacion, existencia, cod_proveedor, cod_fabricante,
cod_afip_concepto, existencia_anterior, equivalencia_um, unidad_de_medida,
habilitado, proveedor
```
🚨 Stock en `existencia` (correcto). Stock mínimo en `pto_de_reposicion` (no `stock_minimo`).
✅ Incluye `rubro`/`subrubro` nombres directamente.

### `/api/v1/articulos` (lista)
```
id, cod_articulo, descripcion, descripcion_corta, cod_afip_concepto,
cod_cuenta, cod_cuenta_venta, habilitado, iva, moneda, precio_compra,
precio_compra_dolar, precio_venta, precio_venta_dolar, tipo_movimiento,
cod_compatibilidad, cod_rubro, rubro, cod_subrubro, subrubro, cod_barra,
unidad_de_medida, equivalencia_um, cod_proveedor, cod_fabricante,
unidades_venta, cod_unidad_medida, coeficiente
```
⚠️ `rubro` y `subrubro` presentes en la lista pero pueden ser null.

### `/api/v1/clientes`
```
id, cod_cliente, nombre, categoria_iva, cod_tipo_doc, numero_doc, cuit,
cod_cuenta, codigo_postal, cod_pais, pais, cod_provincia, provincia,
cod_localidad, localidad, telefonos, habilitado, fecha_alta, fecha_estado,
nombre_fantasia, cod_rubro_cliente, rubro_cliente, cod_zona, id_grupo,
lote, lista_precio, observaciones, mail, cod_vendedor, domicilio,
condicion_venta, control_margen_venta, cod_compatibilidad,
cod_transporte, cod_domicilio_predefinido, cod_domicilio_primero,
condicion_venta_descripcion, domicilios_entrega
```
🚨 Email en campo `mail` (no `email`). `habilitado` = "S"/"N".

### `/api/v1/proveedores`
```
id, cod_proveedor, nombre, categoria_iva, cod_tipo_doc, numero_doc,
cuit, cod_cuenta, habilitado
```

### `/api/v1/vendedores`
```
id, cod_vendedor, nombre, usuario, inactivo
```
Estado en `inactivo` = "N" (activo) / "S" (inactivo).

### `/api/v1/depositos`
```
cod_deposito, descripcion, tipo, domicilio_empresa, empresa
```
Nombre en `descripcion` (no `nombre`). 2 depósitos: CAMARA (1) y *** cambiar *** (99).

### `/api/v1/presupuestos/confirmados` y `/no_confirmados`
```json
{ "venta": { "id", "cod_cliente", "cliente", "id_destino", "destino",
             "cod_empresa", "empresa", "fecha", "tag", "observaciones",
             "cod_vendedor", "vendedor", "cod_origen_sistema", "origen_sistema" } }
```
⚠️ Sin campo `total` ni `importe`. Sin `fecha_conversion`. Datos anidados bajo `venta`.

### `/api/v1/reportes/facturas`
```
fa_id, tipo_comprobante, fa_cod_empresa, fa_fecha, fa_cc, fa_pto_vta,
fa_nro, fa_moneda, fa_cotiz, cod_cliente, cod_vendedor, fa_total,
fa_total_moneda_local, primer_fec_vto, ult_fec_vto, vto_cant_cuotas,
vto_importe, rc_imp_pagado, saldo_fa, ultimo_recibo, remitos_asociados
```

### `/api/v1/reportes/facturas_con_recibos`
```
fa_id, tipo_comp, fa_cod_empresa, fa_fecha, fa_cc, fa_pto_vta, fa_nro,
fa_moneda, fa_cotiz, cod_cliente, fa_total, fa_total_moneda_local,
rc_id, rc_fecha, rc_nro, rc_moneda, rc_cotiz, imp_pag_moneda_local,
cond_pago, importe, cod_banco, cheque_numero, cheque_fec_pago,
importe_retencion, primer_fec_vto, ult_fec_vto
```
⚠️ Tipo en `tipo_comp` (no `tipo_comprobante`).

### `/api/v1/reportes/facturas_compras`
```
fa_id, fa_cod_empresa, fa_fecha, fa_cc, fa_pto_vta, fa_nro, moneda,
cod_proveedor, primer_fec_vto, ult_fec_vto, vto_cant_cuotas,
vto_importe, fa_total, op_imp_pagado, saldo_fa, nro_ultima_OP, nombre
```
Nombre del proveedor en `nombre`.

### `/api/v1/reportes/saldos_clientes`
```
fecha, dias_deuda, tot_entrada, tot_salida, tot_saldo, cod_cliente,
nombre, color, prevision, cod_cuenta, cta_descripcion,
proveedor_cod_cliente, cod_proveedor
```
Ignora pagination — devuelve todos los 4.651 clientes en una sola llamada.

### `/api/v1/reportes/comprob_pendientes_clientes`
```
orden, id, tipo_comprobante, importe_factura, importe_pagado, saldo,
elegido, centrocosto, punto_de_venta, numero, id_asiento, cod_cliente,
detalle, fecha_factura, cod_empresa, cod_vendedor, medio_pago,
moneda_fa, cotizacion_fa, dias_deuda, color, ls_moneda_2,
ldec_cotizacion_2, nombre
```
⚠️ Sin `fecha_vencimiento` / `ult_fec_vto`.

### `/api/v1/reportes/disponible_por_cliente`
```
cod_cliente, nombre, cod_cuenta, cta_descripcion, control_margen_venta,
margen_acuerdos, saldo, disponible, status, mensaje
```
Requiere `codCliente` específico. `codCliente=0` devuelve `{status:400, mensaje:"Cliente Inexistente"}`.

### `/api/v1/reportes/lista_precio_por_codigo`
```
lista_id, cod_lista, fecha_actualiz, cod_articulo, art_descripcion,
art_moneda, art_iva, art_precio_compra, art_precio_venta,
lista_porcentaje, lista_precio_sugerido, lista_precio_base,
lista_descuento, lista_precio_con_iva, art_porcentaje_precio,
lista_precio_venta, lista_cotizacion
```
Requiere `codLista` (entero). Lista 4 = lista base actual.

### `/api/v1/articulos/movimientos-por-articulo`
```
articulo, fecha, descripcion, deposito, cantidad, unidad_de_medida,
acumulado, precio, total
```
Requiere `fecha_desde`, `fecha_hasta`, `cod_articulo`, `cod_deposito` como query params.

### `/api/v1/rubros/All`
```
id, cod_rubro, descripcion, tipo_rubro, cod_compatibilidad
```
7 rubros activos.

### `/api/v1/subrubros/All`
```
id, cod_rubro, cod_subrubro, descripcion, cod_compatibilidad
```
16 sub-rubros activos.

### `/api/v1/puntos-de-venta`
```
id, empresa, id_comprobante_rel, id_destino, punto_de_venta,
domicilio_fiscal, habilitado
```
20 puntos de venta.

### `/api/v1/empresas`
```
id, cod_empresa, nombre, nombre_1, direccion, cuit, telefonos,
categoria_iva, cod_deposito, email, cod_cliente, habilitada
```
1 empresa: **ALAMENIA SA** (CUIT 30-708475676).

### `/api/v1/monedas/all`
```
id, codigo, nombre, codigo2, cod_afip, codigo3
```
2 monedas: Pesos (P/ARS) y Dólar (D/USD).

---

## Endpoints más útiles por panel del BI Engine

### Panel Ventas
- **Principal**: `GET /api/v1/ventas/items` + join con `/api/v1/ventas` (cabeceras)
  - Campos clave: `fecha`, `cod_cliente`, `cod_vendedor`, `cod_articulo`, `detalle`, `cantidad`, `precio`, `importe`, `precio_compra_actual`, `descuento_porc`
  - Filtrar: sólo FA/NC/ND (excluir RE, PR, etc.)
- **Alternativa para facturación rápida**: `GET /api/v1/reportes/facturas`
  - Campos: `fa_id`, `fa_fecha`, `cod_cliente`, `cod_vendedor`, `fa_total`, `saldo_fa`

### Panel Compras
- **Para detalle por artículo**: `GET /api/v1/compras/items` + join con `/api/v1/compras`
  - ⚠️ `importe` = 0; usar `cantidad × precio_con_iva`
- **Para análisis completo con rubro/subrubro**: `GET /api/v1/compras/compras-por-factura`
  - Más rico: incluye rubro, subrubro, importe_neto, IVA, proveedor nombre

### Panel Clientes / Cuenta Corriente
- **Saldos actuales**: `GET /api/v1/reportes/saldos_clientes`
  - → Widget "Saldo por cliente": `tot_saldo`, `dias_deuda`, `tot_entrada`, `tot_salida`
- **Documentos pendientes**: `GET /api/v1/reportes/comprob_pendientes_clientes`
  - → Widget "Deuda por cobrar": `saldo`, `tipo_comprobante`, `dias_deuda`, `nombre`
- **Crédito disponible**: `GET /api/v1/reportes/disponible_por_cliente` (por cliente específico)
  - → Widget "Límite de crédito": `disponible`, `margen_acuerdos`, `saldo`

### Panel Caja / Cobranza
- **Cobros confirmados**: `GET /api/v1/reportes/facturas_con_recibos`
  - → Widget "Cobranza del período": `fa_total`, `imp_pag_moneda_local`, `cond_pago`, `rc_fecha`
  - Medios de pago: `cond_pago` = "EF" (efectivo), "CH" (cheque), etc.

### Panel Proveedores / Cuentas a Pagar
- **Facturas pendientes**: `GET /api/v1/reportes/facturas_compras`
  - → Widget "Compras con vencimientos": `fa_total`, `saldo_fa`, `op_imp_pagado`, `ult_fec_vto`
  - → Widget "Cash out proyectado": por `primer_fec_vto`/`ult_fec_vto`

### Panel Stock
- **Existencias actuales**: `GET /api/v1/articulos/stock`
  - → Widget "Stock valorizado": `existencia × precio_compra`
  - → Widget "Artículos bajo mínimo": `existencia < pto_de_reposicion`
- **Movimientos**: `GET /api/v1/articulos/movimientos-por-articulo` (por artículo)
  - → Widget "Kardex": `fecha`, `descripcion`, `cantidad`, `acumulado`

### Panel Presupuestos / Pipeline
- **Confirmados**: `GET /api/v1/presupuestos/confirmados`
  - → Widget "Pipeline ganado": 864 presupuestos convertidos en ventas
- **No confirmados**: `GET /api/v1/presupuestos/no_confirmados`
  - → Widget "Oportunidades abiertas": 4 presupuestos pendientes
- ⚠️ Sin campo `total` — monto del presupuesto no disponible

### Nuevos Reportes/Widgets posibles
| Endpoint | Widget sugerido |
|---|---|
| `/reportes/facturas` | Facturas emitidas del período con saldo |
| `/reportes/facturas_con_recibos` | Cobranza — días de pago, medios |
| `/reportes/facturas_compras` | Cuentas a pagar con vencimientos |
| `/reportes/saldos_clientes` | Ranking de deuda por cliente |
| `/reportes/comprob_pendientes_clientes` | Aging de cartera |
| `/reportes/disponible_por_cliente` | Semáforo de crédito por cliente |
| `/reportes/lista_precio_por_codigo` | Pricing — margen implícito por lista |

---

## Bugs confirmados y fixes aplicados

| Bug | Impacto | Fix |
|---|---|---|
| `sync_stock`: stock mínimo buscaba `stock_minimo`/`stock_min`/`punto_pedido` | `stock_minimo` = 0 siempre (campo no existe) | Agregado `pto_de_reposicion` como primer candidato |
| `sync_clientes`: email = `c.get("email")` | Email vacío para todos los clientes | Cambiado a `c.get("mail") or c.get("email")` |
| `sync_compras`: `item_total = importe` | Total de compras = 0 para todos los items | Fallback a `cantidad × precio_con_iva` |

---

## Gaps: lo que la API NO tiene

| Funcionalidad | Estado | Alternativa |
|---|---|---|
| `ventas/facturas-con-pagos` | SP no existe en test | Usar `reportes/facturas_con_recibos` |
| `depositos/stock_por_deposito/{id}` | Error 500 | `articulos/stock` (tiene cod_deposito) |
| Total de presupuestos | Ausente del endpoint | No disponible vía API |
| Cheques / disponibilidades | No publicado | Sin alternativa |
| IVA compras/ventas, balances | Solo plan de cuentas + mayor | Sin alternativa en v1 |
| Anticipos clientes/proveedores | No publicado | Sin alternativa |
| Saldos proveedores por cuenta | No publicado | Sin alternativa |
| Comisiones por recibos (endpoint propio) | No publicado | Derivable de `facturas_con_recibos` |

---

## Comportamiento de paginación

| Patrón | Endpoints | Acción correcta |
|---|---|---|
| Paginado real | `ventas`, `ventas/items`, `compras/items`, `clientes`, `proveedores`, `articulos` | `fetch_paginated` con `max_pages=500` |
| Ignora paginación (devuelve todo) | `saldos_clientes`, `comprob_pendientes_clientes`, `facturas_con_recibos`, `facturas_compras`, `facturas` | `max_pages=1` |
| Requiere `page`+`limit` para no dar 400 | Todos los endpoints de reportes | Siempre incluir aunque sea `page=1&limit=100` |

---

## Maestros — datos del tenant ALAMENIA SA

- **Empresa**: ALAMENIA SA — CUIT 30-708475676 — `cod_empresa=1`
- **Depósitos**: CAMARA (1), *** cambiar *** (99)
- **Vendedores**: 13 activos (CALLACE MIRTA, LUNA GRACIELA, DEMARCHI ALEJANDRA...)
- **Rubros**: 7 (Pescados, Mariscos, Huevos, Lácteos, Fiambres, Congelados, Varios)
- **Subrubros**: 16 (Pescados Frescos, Pescados Congelados, Mariscos Congelados...)
- **Clientes**: 4.651 registrados
- **Proveedores**: 1.402 registrados
- **Artículos**: 325 activos
- **Monedas**: Pesos (P/ARS), Dólar (D/USD)
