/**
 * Rules engine for auto-generated narrative insights.
 * Each rule takes a `ctx` object and returns null OR an insight `{ icon, tone, text }`.
 *
 * Rules are simple, deterministic and run client-side. No LLM.
 */

const fmtCurrency = (v) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
}).format(v ?? 0);

const fmtPct = (v) => `${(v ?? 0).toFixed(1)}%`;

const pctDelta = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/**
 * Rule: KPI variation vs previous period
 */
const ruleVariation = (kpiKey, kpiLabel, threshold = 5) => (ctx) => {
  const kpi = ctx.kpis?.[kpiKey];
  if (!kpi || kpi.variacion_pct == null) return null;
  const v = kpi.variacion_pct;
  if (Math.abs(v) < threshold) return null;
  const direction = v > 0 ? '📈' : '📉';
  const tone = v > 0 ? 'success' : 'warning';
  return { icon: direction, tone, text: `**${kpiLabel}** ${v > 0 ? 'sube' : 'baja'} **${fmtPct(Math.abs(v))}** vs período anterior.` };
};

/**
 * Rule: top contributor in ranking
 */
const ruleTopContributor = (rankingKey, labelKey, valueKey, label) => (ctx) => {
  const list = ctx[rankingKey];
  if (!Array.isArray(list) || list.length === 0) return null;
  const top = list[0];
  const total = list.reduce((acc, r) => acc + (r[valueKey] || 0), 0);
  if (!total) return null;
  const pct = ((top[valueKey] || 0) / total) * 100;
  if (pct < 5) return null;
  return {
    icon: '🏆',
    tone: 'info',
    text: `${label}: **${top[labelKey]}** representa el **${fmtPct(pct)}** (${fmtCurrency(top[valueKey])}).`,
  };
};

/**
 * Rule: concentration alert (top N over X% of total)
 */
const ruleConcentration = (rankingKey, valueKey, label, topN = 3, threshold = 60) => (ctx) => {
  const list = ctx[rankingKey];
  if (!Array.isArray(list) || list.length < topN) return null;
  const total = list.reduce((acc, r) => acc + (r[valueKey] || 0), 0);
  const topSum = list.slice(0, topN).reduce((acc, r) => acc + (r[valueKey] || 0), 0);
  const pct = (topSum / total) * 100;
  if (pct < threshold) return null;
  return {
    icon: '⚠️',
    tone: 'warning',
    text: `Concentración alta: top ${topN} ${label} = **${fmtPct(pct)}** del total. Considerá diversificar.`,
  };
};

/**
 * Rule: low margin products
 */
const ruleLowMargin = (productsKey, threshold = 5) => (ctx) => {
  const list = ctx[productsKey];
  if (!Array.isArray(list)) return null;
  const low = list.filter((p) => p.margen_pct != null && p.margen_pct < threshold && p.facturado > 0);
  if (low.length === 0) return null;
  return {
    icon: '💔',
    tone: 'danger',
    text: `**${low.length} producto${low.length > 1 ? 's' : ''}** con margen <${threshold}%. Revisar pricing.`,
  };
};

/**
 * Rule: cumplimiento de cuota
 */
const ruleCuota = () => (ctx) => {
  const vendedores = ctx.vendedores;
  if (!Array.isArray(vendedores)) return null;
  const conCuota = vendedores.filter((v) => v.cuota_mensual > 0);
  if (conCuota.length === 0) return null;
  const total = conCuota.reduce((acc, v) => acc + v.facturado_neto, 0);
  const targetTotal = conCuota.reduce((acc, v) => acc + v.cuota_mensual, 0);
  if (!targetTotal) return null;
  const pct = (total / targetTotal) * 100;
  return {
    icon: pct >= 100 ? '🎯' : pct >= 80 ? '🟡' : '🚨',
    tone: pct >= 100 ? 'success' : pct >= 80 ? 'warning' : 'danger',
    text: `Cumplimiento de cuota: **${fmtPct(pct)}** del objetivo total ($${fmtCurrency(total)} de ${fmtCurrency(targetTotal)}).`,
  };
};

/**
 * Rule: descuentos elevados
 */
const ruleDescuentos = (threshold = 10) => (ctx) => {
  const kpi = ctx.kpis;
  if (!kpi?.descuento_promedio?.actual) return null;
  const d = kpi.descuento_promedio.actual;
  if (d < threshold) return null;
  return {
    icon: '💸',
    tone: 'warning',
    text: `Tasa de descuento promedio: **${fmtPct(d)}** — más alta de lo habitual.`,
  };
};

/**
 * Rule: stock cobertura crítica
 */
const ruleStockCritico = () => (ctx) => {
  const alertas = ctx.alertasStock;
  if (!Array.isArray(alertas) || alertas.length === 0) return null;
  return {
    icon: '📦',
    tone: 'warning',
    text: `**${alertas.length}** artículo${alertas.length > 1 ? 's' : ''} con stock bajo mínimo. Reposición urgente.`,
  };
};

/**
 * Predefined rule sets per panel
 */
export const VENTAS_RULES = [
  ruleVariation('facturado_neto', 'Facturado'),
  ruleVariation('tickets', 'Tickets', 8),
  ruleVariation('margen_bruto_pct', 'Margen bruto', 2),
  ruleTopContributor('clientesRanking', 'cliente_nombre', 'facturado', 'Cliente líder'),
  ruleTopContributor('rubrosRanking', 'nombre', 'facturado', 'Rubro destacado'),
  ruleLowMargin('productosRanking'),
  ruleCuota(),
  ruleDescuentos(),
  ruleConcentration('clientesRanking', 'facturado', 'clientes', 5, 60),
];

export const COMPRAS_RULES = [
  ruleVariation('comprado_neto', 'Compras'),
  ruleVariation('proveedores_unicos', 'Proveedores activos'),
  ruleTopContributor('proveedoresRanking', 'nombre', 'comprado', 'Principal proveedor'),
  ruleConcentration('proveedoresRanking', 'comprado', 'proveedores', 3, 50),
  ruleStockCritico(),
];

export const runRules = (rules, ctx, maxInsights = 5) => {
  const results = [];
  for (const rule of rules) {
    try {
      const r = rule(ctx);
      if (r) results.push(r);
      if (results.length >= maxInsights) break;
    } catch {
      /* swallow */
    }
  }
  return results;
};
