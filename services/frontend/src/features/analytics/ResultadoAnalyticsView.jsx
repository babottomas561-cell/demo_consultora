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
          <KpiCard label="Ingresos" value={formatCurrency(data.summary?.ingresos)} sparklineData={data.series?.map((row) => row.ingresos)} />
          <KpiCard label="Costo mercadería" value={formatCurrency(data.summary?.costo_mercaderia)} sparklineData={data.series?.map((row) => row.compras)} />
          <KpiCard label="Gastos" value={formatCurrency(data.summary?.gastos)} sparklineData={data.series?.map((row) => row.gastos)} />
          <KpiCard
            label="Resultado"
            value={formatCurrency(data.summary?.resultado)}
            tone={(data.summary?.resultado || 0) >= 0 ? 'success' : 'danger'}
            sparklineData={data.series?.map((row) => row.resultado)}
          />
          <KpiCard
            label="Margen"
            value={`${((data.summary?.margen_resultado || 0) * 100).toFixed(1)}%`}
            tone={(data.summary?.margen_resultado || 0) >= 0 ? 'success' : 'danger'}
            sparklineData={data.series?.map((row) => row.margen_pct)}
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
          customTooltip={(value, name) => {
            if (name === 'Margen %') return [`${Number(value || 0).toFixed(1)}%`, 'Margen %'];
            return [`$${Number(value || 0).toLocaleString('es-AR')}`, name];
          }}
        />
      </>
    )}
  />
);

export default ResultadoAnalyticsView;
