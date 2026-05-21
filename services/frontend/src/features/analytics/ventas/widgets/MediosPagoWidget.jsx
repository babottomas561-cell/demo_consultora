import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';

const COLORS = {
  EF: '#22c55e',
  CH: '#3b82f6',
  TC: '#a855f7',
  otro: '#94a3b8',
};

const LABEL_MAP = { EF: 'Efectivo', CH: 'Cheque', TC: 'Tarjeta' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
      <div>Total: <strong>{formatCurrency(d.total)}</strong></div>
      <div>Operaciones: <strong>{d.operaciones}</strong></div>
      <div>Participación: <strong>{d.pct?.toFixed(1)}%</strong></div>
    </div>
  );
};

export default function MediosPagoWidget() {
  const { mediosPago, mediosPagoLoading } = useVentasData();

  if (mediosPagoLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando medios de pago...</div>
      </div>
    );
  }

  const medios = (mediosPago?.medios ?? []).map((m) => ({
    ...m,
    label: LABEL_MAP[m.forma_pago?.toUpperCase()] ?? m.forma_pago,
    fill: COLORS[m.forma_pago?.toUpperCase()] ?? COLORS.otro,
  }));

  const totalCobrado = mediosPago?.total_cobrado ?? 0;

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Medios de Cobro
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Total: {formatCurrency(totalCobrado)}
        </span>
      </div>

      {medios.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 24, textAlign: 'center' }}>
          Sin cobros en el período
        </div>
      ) : (
        <>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={medios}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={3}
                >
                  {medios.map((m) => (
                    <Cell key={m.forma_pago} fill={m.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {medios.map((m) => (
              <div key={m.forma_pago} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: 'var(--text-secondary)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: m.fill, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{m.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(m.total)}</span>
                <span style={{ color: 'var(--text-muted)', minWidth: 42, textAlign: 'right' }}>{m.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
