import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency } from "../utils/format";

export function ChartWidget({ data }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Ventas últimos 30 días</h2>
        <span>Actualización automática cada minuto</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1f7466" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1f7466" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#dfe7e4" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#70807a", fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fill: "#70807a", fontSize: 12 }}
              tickFormatter={formatCompactCurrency}
              tickLine={false}
              width={74}
            />
            <Tooltip
              formatter={(value) => formatCompactCurrency(value)}
              contentStyle={{
                border: "1px solid #d6dfdc",
                borderRadius: 8,
                boxShadow: "0 12px 28px rgba(16, 35, 31, 0.12)",
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              name="Ventas"
              stroke="#1f7466"
              strokeWidth={3}
              fill="url(#salesFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
