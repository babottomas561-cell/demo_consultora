import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { KpiCard } from "../components/KpiCard";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { useAsyncData } from "../hooks/useAsyncData";
import { apiRequest } from "../services/api";
import { formatCompactCurrency, formatCurrency, formatPercent } from "../utils/format";

function EERRRow({ label, value, bold, indent, highlight }) {
  return (
    <div className={`eerr-row${bold ? " eerr-bold" : ""}${indent ? " eerr-indent" : ""}${highlight ? " eerr-highlight" : ""}`}>
      <span className="eerr-label">{label}</span>
      <span className="eerr-value">{formatCurrency(value)}</span>
    </div>
  );
}

export function EERRPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, loading } = useAsyncData(
    () => apiRequest(`/eerr?year=${year}`),
    [year]
  );

  const anual = data?.anual;
  const monthly = data?.monthly ?? [];

  const chartData = monthly.map((m) => ({
    name: m.label,
    Ventas: m.ventas_neto,
    "Costo Vtas.": m.costo_ventas,
    "Ut. Bruta": m.utilidad_bruta,
  }));

  return (
    <div className="app-shell with-sidebar">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content">
          <div className="page-header">
            <h1>Estado de Resultados</h1>
            <div className="page-actions">
              {[currentYear - 1, currentYear].map((y) => (
                <button key={y} className={`period-btn${year === y ? " active" : ""}`} onClick={() => setYear(y)}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Calculando EERR...</div>
          ) : anual ? (
            <>
              <section className="kpi-grid">
                <KpiCard label="Ventas brutas" value={formatCompactCurrency(anual.ventas_total)} help="Con IVA incluido" />
                <KpiCard label="Ventas netas" value={formatCompactCurrency(anual.ventas_neto)} help="Sin IVA" />
                <KpiCard label="Costo de ventas" value={formatCompactCurrency(anual.costo_ventas)} help="Precio compra × cantidad" />
                <KpiCard
                  label="Utilidad bruta"
                  value={formatCompactCurrency(anual.utilidad_bruta)}
                  help={`Margen: ${formatPercent(anual.margen_bruto_pct / 100)}`}
                  progress={anual.margen_bruto_pct / 100}
                />
                <KpiCard label="Resultado neto" value={formatCompactCurrency(anual.resultado_neto)} help="Año completo" />
              </section>

              <div className="dashboard-grid" style={{ marginTop: 18 }}>
                {/* Gráfico mensual */}
                <section className="panel">
                  <div className="panel-header">
                    <h2>Evolución mensual {year}</h2>
                    <span>Ventas vs costo vs utilidad</span>
                  </div>
                  <div className="chart-wrap" style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                        <defs>
                          <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1f7466" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#1f7466" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradUtilidad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c7f36f" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#c7f36f" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#dfe7e4" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#70807a", fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fill: "#70807a", fontSize: 11 }} tickFormatter={(v) => formatCompactCurrency(v)} tickLine={false} width={72} />
                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "1px solid #d6dfdc" }} />
                        <Legend />
                        <Area type="monotone" dataKey="Ventas" stroke="#1f7466" strokeWidth={2} fill="url(#gradVentas)" />
                        <Area type="monotone" dataKey="Costo Vtas." stroke="#e07070" strokeWidth={2} fill="none" />
                        <Area type="monotone" dataKey="Ut. Bruta" stroke="#c7f36f" strokeWidth={2} fill="url(#gradUtilidad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Estructura P&L */}
                <section className="panel">
                  <div className="panel-header"><h2>Estructura P&L</h2><span>{year}</span></div>
                  <div className="eerr-table">
                    <EERRRow label="(+) Ventas brutas"      value={anual.ventas_total} bold />
                    <EERRRow label="    IVA ventas"          value={-anual.ventas_iva}  indent />
                    <EERRRow label="= Ventas netas"          value={anual.ventas_neto}  bold highlight />
                    <EERRRow label="(-) Costo de ventas"     value={-anual.costo_ventas} />
                    <EERRRow label="= Utilidad bruta"        value={anual.utilidad_bruta} bold highlight />
                    <EERRRow label="(-) Gastos operativos"   value={-anual.gastos_operativos} />
                    <EERRRow label="= Resultado operativo"   value={anual.resultado_operativo} bold />
                    <EERRRow label="= Resultado neto"        value={anual.resultado_neto} bold highlight />
                  </div>
                </section>
              </div>

              {/* Tabla mensual */}
              <section className="panel table-panel" style={{ marginTop: 18 }}>
                <div className="panel-header"><h2>Detalle mensual</h2><span>{year}</span></div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th style={{ textAlign: "right" }}>Ventas netas</th>
                        <th style={{ textAlign: "right" }}>Costo ventas</th>
                        <th style={{ textAlign: "right" }}>Ut. bruta</th>
                        <th style={{ textAlign: "right" }}>Margen %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((m) => (
                        <tr key={m.mes}>
                          <td>{m.label}</td>
                          <td className="money" style={{ textAlign: "right" }}>{formatCurrency(m.ventas_neto)}</td>
                          <td className="money" style={{ textAlign: "right" }}>{formatCurrency(m.costo_ventas)}</td>
                          <td className="money" style={{ textAlign: "right" }}>{formatCurrency(m.utilidad_bruta)}</td>
                          <td style={{ textAlign: "right" }}>{formatPercent(m.margen_bruto_pct / 100)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="empty-state">Sin datos para {year}</div>
          )}
        </main>
      </div>
    </div>
  );
}
