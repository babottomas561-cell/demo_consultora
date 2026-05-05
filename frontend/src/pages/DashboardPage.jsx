import { ChartWidget } from "../components/ChartWidget";
import { KpiCard } from "../components/KpiCard";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { useDashboard } from "../hooks/useDashboard";
import { formatCompactCurrency, formatCurrency, formatDate, formatPercent } from "../utils/format";

function RankList({ items, type }) {
  return (
    <div className="rank-list">
      {items.map((item, index) => (
        <div className="rank-row" key={type === "product" ? item.product : item.customer_name}>
          <span className="rank-number">{index + 1}</span>
          <div>
            <div className="rank-title">{type === "product" ? item.product : item.customer_name}</div>
            <div className="rank-subtitle">
              {type === "product"
                ? `${item.category} · ${item.units.toLocaleString("es-AR")} unidades`
                : `${item.orders} compras · última ${formatDate(item.last_purchase)}`}
            </div>
          </div>
          <span className="rank-value">{formatCompactCurrency(item.sales)}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { data, error, loading, lastUpdated } = useDashboard();

  if (loading) {
    return (
      <div className="app-shell with-sidebar">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <div className="loading-state">Cargando datos...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell with-sidebar">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <div className="loading-state">{error}</div>
        </div>
      </div>
    );
  }

  const { kpis, series, products, customers, sales } = data;

  return (
    <div className="app-shell with-sidebar">
      <Sidebar />
      <div className="main-content">
      <Navbar />
      <main className="dashboard">
        <section className="dashboard-header">
          <div className="dashboard-title">
            <h1>{kpis.client_name}</h1>
            <p>Ventas, margen y clientes conectados a la API real de Demo Consultora.</p>
          </div>
          <div className="last-updated">
            Última actualización
            <br />
            {lastUpdated ? lastUpdated.toLocaleTimeString("es-AR") : "Sin datos"}
          </div>
        </section>

        <section className="kpi-grid">
          <KpiCard
            label="Ventas hoy"
            value={formatCurrency(kpis.today_sales)}
            help="Suma de ventas con fecha igual a hoy."
          />
          <KpiCard
            label="Ventas del mes"
            value={formatCompactCurrency(kpis.month_sales)}
            help={`${kpis.month_units.toLocaleString("es-AR")} unidades vendidas este mes.`}
          />
          <KpiCard
            label="Margen bruto"
            value={formatPercent(kpis.gross_margin_rate)}
            help={formatCurrency(kpis.month_margin)}
          />
          <KpiCard
            label="Punto de equilibrio"
            value={`${Math.round(kpis.break_even_progress * 100)}%`}
            help={`Costos fijos: ${formatCurrency(kpis.fixed_costs)}`}
            progress={kpis.break_even_progress}
          />
          <KpiCard
            label="Clientes activos"
            value={kpis.active_customers.toString()}
            help="Clientes con compras registradas en el mes."
          />
        </section>

        <section className="dashboard-grid">
          <ChartWidget data={series} />

          <div className="stack">
            <section className="panel">
              <div className="panel-header">
                <h2>Top productos</h2>
                <span>Por facturación acumulada</span>
              </div>
              <RankList items={products} type="product" />
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>Top clientes</h2>
                <span>Cartera comercial</span>
              </div>
              <RankList items={customers} type="customer" />
            </section>
          </div>

          <section className="panel table-panel">
            <div className="panel-header">
              <h2>Últimas ventas</h2>
              <span>{sales.total.toLocaleString("es-AR")} transacciones en la demo</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Unidades</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.items.map((sale) => (
                    <tr key={sale.id}>
                      <td>{formatDate(sale.date)}</td>
                      <td>{sale.product}</td>
                      <td>{sale.category}</td>
                      <td>{sale.customer_name}</td>
                      <td>{sale.seller}</td>
                      <td>{sale.quantity}</td>
                      <td className="money">{formatCurrency(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
      </div>
    </div>
  );
}
