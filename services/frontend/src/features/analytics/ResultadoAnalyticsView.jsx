import AnalyticsPage from './AnalyticsPage';
import { formatCurrency } from './analyticsUtils';

const ResultadoAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Resultado"
    description="Resultado económico estimado con ingresos, compras y gastos operativos."
    endpoint="/analytics/resultado/resumen"
    buildView={(data, { KpiCard, SeriesChart }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KpiCard label="Ingresos" value={formatCurrency(data.summary?.ingresos)} />
          <KpiCard label="Costo mercadería" value={formatCurrency(data.summary?.costo_mercaderia)} />
          <KpiCard label="Gastos" value={formatCurrency(data.summary?.gastos)} />
          <KpiCard
            label="Resultado"
            value={formatCurrency(data.summary?.resultado)}
            tone={(data.summary?.resultado || 0) >= 0 ? 'success' : 'danger'}
          />
          <KpiCard
            label="Margen"
            value={`${((data.summary?.margen_resultado || 0) * 100).toFixed(1)}%`}
            tone={(data.summary?.margen_resultado || 0) >= 0 ? 'success' : 'danger'}
          />
        </div>
        <SeriesChart
          title="Ingresos, Costos y Gastos por Mes"
          data={data.series}
          bars={[
            { key: 'ingresos', label: 'Ingresos', color: '#4f46e5', stack: 'costs' },
            { key: 'compras', label: 'Costo mercadería', color: '#dc2626', stack: 'expenses' },
            { key: 'gastos', label: 'Gastos operativos', color: '#f97316', stack: 'expenses' },
          ]}
        />
        <SeriesChart
          title="Margen Bruto Mensual (%)"
          data={data.series}
          lines={[
            { key: 'margen_pct', label: 'Margen %', color: '#16a34a', yAxisId: 'right' },
          ]}
          bars={[
            { key: 'resultado', label: 'Resultado $', color: '#4f46e5' },
          ]}
          yAxisRight
        />
      </>
    )}
  />
);

export default ResultadoAnalyticsView;
