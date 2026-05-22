import { LayoutDashboard, TrendingUp, TrendingDown, Users, ShoppingBag, FileText, Wallet, AlertTriangle } from 'lucide-react';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';

const fmt = (v) => `$${Number(v ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

function MetricCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div className={`rounded-lg p-2.5 ${color}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={13} className="opacity-70" />
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</span>
      </div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {subtext && <p className="text-[10px] opacity-60 mt-0.5">{subtext}</p>}
    </div>
  );
}

export default function ResumenEjecutivoWidget() {
  const { data, loading, error } = useInfomanagerFetch('resumen-ejecutivo', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
  }));

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 p-4 animate-pulse">
        <div className="h-5 w-1/3 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 p-4">
        <LayoutDashboard size={24} className="text-red-400" />
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const flujoPositivo = data.flujo_neto >= 0;

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <LayoutDashboard size={16} className="text-violet-500" />
        <h3 className="text-sm font-semibold text-slate-800">Resumen Ejecutivo</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1 auto-rows-min">
        <MetricCard
          label="Facturación"
          value={fmt(data.facturacion)}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-800"
          subtext={`${data.comprobantes_emitidos} comprobantes`}
        />
        <MetricCard
          label="Margen bruto"
          value={fmt(data.margen_bruto)}
          icon={TrendingUp}
          color="bg-blue-50 text-blue-800"
          subtext={`${fmtPct(data.margen_pct)} del neto`}
        />
        <MetricCard
          label="Compras"
          value={fmt(data.total_compras)}
          icon={ShoppingBag}
          color="bg-orange-50 text-orange-800"
          subtext={`${data.proveedores_activos} proveedores`}
        />
        <MetricCard
          label="Flujo de caja"
          value={fmt(Math.abs(data.flujo_neto))}
          icon={flujoPositivo ? TrendingUp : TrendingDown}
          color={flujoPositivo ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800'}
          subtext={flujoPositivo ? 'Positivo' : 'Negativo'}
        />
        <MetricCard
          label="Clientes activos"
          value={data.clientes_activos}
          icon={Users}
          color="bg-indigo-50 text-indigo-800"
        />
        <MetricCard
          label="Deuda clientes"
          value={fmt(data.deuda_clientes)}
          icon={FileText}
          color="bg-slate-50 text-slate-800"
        />
        <MetricCard
          label="Morosos"
          value={data.clientes_morosos}
          icon={AlertTriangle}
          color={data.clientes_morosos > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}
          subtext={data.clientes_morosos > 0 ? 'Requiere atención' : 'Sin alertas'}
        />
        <MetricCard
          label="Cobros vs Pagos"
          value={fmt(data.ingresos_caja)}
          icon={Wallet}
          color="bg-purple-50 text-purple-800"
          subtext={`Pagos: ${fmt(data.egresos_caja)}`}
        />
      </div>
    </div>
  );
}
