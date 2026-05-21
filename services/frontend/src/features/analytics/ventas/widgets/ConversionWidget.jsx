import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';
const formatPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.vendedor_nombre || label}</div>
      <div>Presupuestos: <strong>{d.total}</strong></div>
      <div>Confirmados: <strong>{d.confirmados}</strong></div>
      <div>Tasa: <strong style={{ color: '#22c55e' }}>{d.tasa_pct?.toFixed(1)}%</strong></div>
      <div>Monto confirmado: <strong>{formatCurrency(d.monto_confirmado)}</strong></div>
    </div>
  );
};

export default function ConversionWidget() {
  const { conversion, conversionLoading } = useVentasData();

  if (conversionLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando conversión...</div>
      </div>
    );
  }

  const data = conversion ?? {};
  const porVendedor = (data.por_vendedor ?? []).slice(0, 10);
  const porCanal = data.por_canal ?? [];
  const tasaGlobal = data.tasa_conversion_pct ?? 0;
  const total = data.total ?? 0;
  const confirmados = data.confirmados ?? 0;

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header KPIs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Conversión Presupuestos
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Tasa global', value: `${tasaGlobal.toFixed(1)}%`, color: tasaGlobal >= 50 ? '#22c55e' : tasaGlobal >= 25 ? '#eab308' : '#ef4444' },
          { label: 'Total emitidos', value: total },
          { label: 'Confirmados', value: confirmados, color: '#22c55e' },
          { label: 'Sin confirmar', value: total - confirmados, color: '#ef4444' },
        ].map((k) => (
          <div key={k.label} style={{
            flex: 1, background: 'var(--surface-2)', borderRadius: 8,
            padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color ?? 'var(--text-primary)' }}>
              {k.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart por vendedor */}
      {porVendedor.length > 0 && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tasa de cierre por vendedor
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porVendedor} layout="vertical" margin={{ left: 4, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="vendedor_nombre" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tasa_pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {porVendedor.map((v) => (
                  <Cell
                    key={v.cod_vendedor}
                    fill={v.tasa_pct >= 50 ? '#22c55e' : v.tasa_pct >= 25 ? '#eab308' : '#ef4444'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Canal origen */}
      {porCanal.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {porCanal.map((c) => (
            <div key={c.canal} style={{
              background: 'var(--surface-2)', borderRadius: 6, padding: '4px 10px',
              fontSize: 11, color: 'var(--text-secondary)',
            }}>
              {c.canal}: <strong>{c.tasa_pct?.toFixed(0)}%</strong> ({c.confirmados}/{c.total})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
