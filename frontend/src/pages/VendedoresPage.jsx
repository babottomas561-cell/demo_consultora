import { useState } from "react";

import { KpiCard } from "../components/KpiCard";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { useAsyncData } from "../hooks/useAsyncData";
import { apiRequest } from "../services/api";
import { formatCompactCurrency, formatCurrency } from "../utils/format";

export function VendedoresPage() {
  const [days, setDays] = useState(30);

  const { data: ranking, loading } = useAsyncData(
    () => apiRequest(`/vendedores/ranking?days=${days}`),
    [days]
  );

  const rows = ranking ?? [];
  const totalVentas = rows.reduce((s, r) => s + r.ventas, 0);

  return (
    <div className="app-shell with-sidebar">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content">
          <div className="page-header">
            <h1>Vendedores</h1>
            <div className="page-actions">
              {[7, 30, 90, 365].map((d) => (
                <button key={d} className={`period-btn${days === d ? " active" : ""}`} onClick={() => setDays(d)}>
                  {d === 365 ? "1 año" : `${d}d`}
                </button>
              ))}
            </div>
          </div>

          <section className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <KpiCard label="Total vendido" value={formatCompactCurrency(totalVentas)} help={`Últimos ${days} días`} />
            <KpiCard label="Vendedores activos" value={String(rows.length)} help="Con ventas en el período" />
            <KpiCard label="Ticket promedio" value={formatCurrency(rows.reduce((s, r) => s + r.ventas, 0) / Math.max(rows.reduce((s, r) => s + r.facturas, 0), 1))} help="Por factura emitida" />
          </section>

          {loading ? (
            <div className="loading-state">Cargando ranking...</div>
          ) : (
            <section className="panel">
              <div className="panel-header">
                <h2>Ranking</h2>
                <span>Últimos {days} días</span>
              </div>
              <div className="rank-list">
                {rows.map((row, i) => (
                  <div className="rank-row" key={row.cod_vendedor}>
                    <span className="rank-number">{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div className="rank-title">{row.nombre}</div>
                      <div className="rank-subtitle">
                        {row.facturas} facturas · {row.clientes} clientes · margen {formatCompactCurrency(row.margen)}
                      </div>
                      <div className="progress-track" style={{ marginTop: 8 }}>
                        <div className="progress-fill" style={{ width: `${row.share_pct}%` }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="rank-value">{formatCompactCurrency(row.ventas)}</span>
                      <div className="rank-subtitle">{row.share_pct}% del total</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
