const toNumber = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const roundMoney = (value) => Math.round(toNumber(value) * 100) / 100;

const invoiceKey = (row) => {
  if (row?.fa_id != null) return String(row.fa_id);
  return [
    row?.tipo_comp ?? row?.tipo ?? 'FA',
    row?.cod_cliente ?? row?.cliente_id ?? '',
    row?.fa_fecha ?? row?.fecha ?? '',
    row?.fa_total_moneda_local ?? row?.fa_total ?? row?.importe_total ?? '',
  ].join('|');
};

export function buildEficienciaCobranza(data) {
  const recibos = data?.recibos ?? [];
  const facturas = new Map();

  recibos.forEach((row) => {
    const key = invoiceKey(row);
    const current = facturas.get(key) ?? {
      comprobante_id: row.fa_id ?? key,
      cliente_id: row.cod_cliente ?? row.cliente_id,
      cliente_nombre: row.cliente_nombre ?? row.nombre ?? row.cod_cliente ?? 'Sin cliente',
      tipo: row.tipo_comp ?? row.tipo ?? 'FA',
      numero: row.fa_id ?? row.numero ?? key,
      fecha: row.fa_fecha ?? row.fecha,
      importe_total: toNumber(row.fa_total_moneda_local || row.fa_total || row.importe_total),
      importe_pagado: 0,
      saldo: 0,
      pct_cobrado: 0,
      ultimo_pago: null,
      forma_pago: row.cond_pago ?? row.forma_pago ?? null,
    };

    const pago = toNumber(row.imp_pag_moneda_local || row.importe || row.importe_pagado);
    current.importe_pagado += pago;
    if (row.rc_fecha && (!current.ultimo_pago || row.rc_fecha > current.ultimo_pago)) {
      current.ultimo_pago = row.rc_fecha;
    }
    if (row.cond_pago || row.forma_pago) {
      current.forma_pago = row.cond_pago ?? row.forma_pago;
    }
    facturas.set(key, current);
  });

  const filas = Array.from(facturas.values()).map((row) => {
    const importeTotal = roundMoney(row.importe_total);
    const importePagado = roundMoney(row.importe_pagado);
    const saldo = roundMoney(Math.max(importeTotal - importePagado, 0));
    return {
      ...row,
      importe_total: importeTotal,
      importe_pagado: importePagado,
      saldo,
      pct_cobrado: importeTotal > 0 ? Math.round((importePagado / importeTotal) * 1000) / 10 : 0,
    };
  });

  filas.sort((a, b) => String(b.ultimo_pago ?? b.fecha ?? '').localeCompare(String(a.ultimo_pago ?? a.fecha ?? '')));

  const totalFacturado = filas.reduce((sum, row) => sum + row.importe_total, 0);
  const totalCobrado = filas.reduce((sum, row) => sum + row.importe_pagado, 0);
  const facturasCobradas = filas.filter((row) => row.saldo <= 0.01).length;

  return {
    kpi: {
      total_facturado: roundMoney(totalFacturado),
      total_cobrado: roundMoney(totalCobrado),
      pct_eficiencia_cobranza: totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 1000) / 10 : 0,
      facturas_cobradas: facturasCobradas,
      total_facturas: filas.length,
    },
    filas,
  };
}
