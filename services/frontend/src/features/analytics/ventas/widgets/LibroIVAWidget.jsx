import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../../../utils/formatters';

const IVA_COLORS = {
  iva_21:   '#6366f1',
  iva_10_5: '#22c55e',
  iva_27:   '#f59e0b',
};

const IVA_LABELS = {
  iva_21:   'IVA 21%',
  iva_10_5: 'IVA 10,5%',
  iva_27:   'IVA 27%',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12, minWidth: 180,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ color: p.fill }}>{IVA_LABELS[p.dataKey] ?? p.dataKey}</span>
          <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)' }}>Total IVA</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
    </div>
  );
};

export default function LibroIVAWidget() {
  const { ivaDiscriminado, ivaDiscriminadoLoading } = useVentasData();

  if (ivaDiscriminadoLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando IVA discriminado...</div>
      </div>
    );
  }

  const periodos = ivaDiscriminado?.periodos ?? [];

  // Totales acumulados del período
  const totalIva21   = periodos.reduce((s, p) => s + (p.iva_21   ?? 0), 0);
  const totalIva105  = periodos.reduce((s, p) => s + (p.iva_10_5 ?? 0), 0);
  const totalIva27   = periodos.reduce((s, p) => s + (p.iva_27   ?? 0), 0);
  const totalIvaAll  = periodos.reduce((s, p) => s + (p.iva_total ?? 0), 0);
  const totalBase    = periodos.reduce((s, p) => s + (p.base_neta ?? 0), 0);

  const has105 = totalIva105 > 0;
  const has27  = totalIva27  > 0;

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          IVA Ventas Discriminado
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Libro IVA — CPN</span>
      </div>

      {/* KPIs resumen */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Base Neta', value: totalBase, color: 'var(--text-primary)' },
          { label: 'IVA 21%',   value: totalIva21,  color: IVA_COLORS.iva_21 },
          ...(has105 ? [{ label: 'IVA 10,5%', value: totalIva105, color: IVA_COLORS.iva_10_5 }] : []),
          ...(has27  ? [{ label: 'IVA 27%',   value: totalIva27,  color: IVA_COLORS.iva_27   }] : []),
          { label: 'Débito Total', value: totalIvaAll, color: '#f8fafc', bold: true },
        ].map((k) => (
          <div key={k.label} style={{
            flex: 1, minWidth: 90,
            background: k.bold ? 'rgba(99,102,241,0.12)' : 'var(--surface-2)',
            border: k.bold ? '1px solid #6366f1' : '1px solid var(--border)',
            borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: k.bold ? 800 : 600, color: k.color }}>
              {formatCurrency(k.value)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de barras apiladas por mes */}
      {periodos.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
          Sin datos. Requerís un sync con las columnas iva_10_5 / iva_27.
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={periodos} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{IVA_LABELS[value] ?? value}</span>}
              />
              <Bar dataKey="iva_21"   stackId="iva" fill={IVA_COLORS.iva_21}   radius={has105 || has27 ? 0 : [4,4,0,0]} />
              {has105 && <Bar dataKey="iva_10_5" stackId="iva" fill={IVA_COLORS.iva_10_5} radius={0} />}
              {has27  && <Bar dataKey="iva_27"   stackId="iva" fill={IVA_COLORS.iva_27}   radius={[4,4,0,0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla mensual compacta */}
      {periodos.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
                <th style={{ textAlign: 'left', padding: '4px 6px' }}>Período</th>
                <th style={{ padding: '4px 6px' }}>Base neta</th>
                <th style={{ padding: '4px 6px' }}>IVA 21%</th>
                {has105 && <th style={{ padding: '4px 6px' }}>IVA 10,5%</th>}
                {has27  && <th style={{ padding: '4px 6px' }}>IVA 27%</th>}
                <th style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}>Total IVA</th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((p) => (
                <tr key={p.periodo} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 6px', color: 'var(--text-primary)', fontWeight: 600 }}>{p.periodo}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(p.base_neta)}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', color: IVA_COLORS.iva_21 }}>{formatCurrency(p.iva_21)}</td>
                  {has105 && <td style={{ padding: '4px 6px', textAlign: 'right', color: IVA_COLORS.iva_10_5 }}>{formatCurrency(p.iva_10_5)}</td>}
                  {has27  && <td style={{ padding: '4px 6px', textAlign: 'right', color: IVA_COLORS.iva_27  }}>{formatCurrency(p.iva_27)}</td>}
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.iva_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
