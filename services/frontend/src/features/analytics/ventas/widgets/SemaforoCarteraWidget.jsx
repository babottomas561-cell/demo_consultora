import React from 'react';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';

const COLOR_CONFIG = {
  verde:    { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e', dot: '#22c55e',  label: 'Al día' },
  amarillo: { bg: 'rgba(234,179,8,0.12)',  border: '#eab308', dot: '#eab308',  label: 'Con mora' },
  rojo:     { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', dot: '#ef4444',  label: 'En riesgo' },
  sin_dato: { bg: 'rgba(148,163,184,0.08)', border: '#475569', dot: '#64748b', label: 'Sin dato' },
};

export default function SemaforoCarteraWidget() {
  const { semaforoCartera, semaforoCarteraLoading } = useVentasData();

  if (semaforoCarteraLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando semáforo...</div>
      </div>
    );
  }

  const data = semaforoCartera?.semaforo ?? [];
  const totalCartera = semaforoCartera?.total_cartera ?? 0;

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Semáforo de Cartera
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Total: {formatCurrency(totalCartera)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {data.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
            Sin datos. Ejecutá el sync para cargar saldos.
          </div>
        )}
        {data.map((item) => {
          const cfg = COLOR_CONFIG[item.color] ?? COLOR_CONFIG.sin_dato;
          return (
            <div
              key={item.color}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: cfg.dot, flexShrink: 0,
                boxShadow: `0 0 6px ${cfg.dot}`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {cfg.label}
                  <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>
                    {item.clientes} cliente{item.clientes !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Deuda: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.saldo_deudor)}</strong>
                  {item.saldo_a_favor > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      A favor: <strong style={{ color: '#22c55e' }}>{formatCurrency(item.saldo_a_favor)}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: cfg.dot,
                flexShrink: 0,
              }}>
                {item.pct_cartera?.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
