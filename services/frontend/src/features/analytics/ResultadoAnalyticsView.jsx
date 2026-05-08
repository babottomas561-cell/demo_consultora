import AnalyticsPage from './AnalyticsPage';
import { formatCurrency } from './analyticsUtils';

const ResultadoAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Resultado"
    description="Resultado económico estimado con ingresos, compras y gastos operativos."
    endpoint="/analytics/resultado/resumen"
    buildView={(data, { KpiCard, SeriesChart }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Ingresos" value={formatCurrency(data.summary?.ingresos)} />
          <KpiCard label="Costo mercadería" value={formatCurrency(data.summary?.costo_mercaderia)} />
          <KpiCard label="Gastos" value={formatCurrency(data.summary?.gastos)} />
          <KpiCard
            label="Resultado"
            value={formatCurrency(data.summary?.resultado)}
            tone={(data.summary?.resultado || 0) >= 0 ? 'success' : 'danger'}
          />
        </div>
        <SeriesChart
          data={data.series}
          bars={[
            { key: 'ingresos', label: 'Ingresos', color: '#4f46e5' },
            { key: 'compras', label: 'Compras', color: '#0f766e' },
            { key: 'gastos', label: 'Gastos', color: '#dc2626' },
            { key: 'resultado', label: 'Resultado', color: '#ca8a04' },
          ]}
        />
      </>
    )}
  />
);

export default ResultadoAnalyticsView;
