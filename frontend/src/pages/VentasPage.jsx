import { useState } from "react";

import { DataTable } from "../components/DataTable";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { apiRequest } from "../services/api";
import { formatCurrency, formatDate } from "../utils/format";
import { useAsyncData } from "../hooks/useAsyncData";

const TIPO_LABEL = { FA: "Factura", NC: "Nota Créd.", ND: "Nota Déb.", PR: "Presup.", RE: "Remito" };
const COND_LABEL = { 1: "Efectivo", 2: "Cta. Cte.", 3: "Tarjeta", 4: "Otros" };

const COLUMNS = [
  { key: "fecha",           label: "Fecha",        render: (r) => formatDate(r.fecha) },
  { key: "tipo_comprobante", label: "Tipo",         render: (r) => `${TIPO_LABEL[r.tipo_comprobante] ?? r.tipo_comprobante} ${r.tipo_factura ?? ""}` },
  { key: "numero",          label: "Nro.",          render: (r) => r.numero ? `${String(r.punto_de_venta ?? 0).padStart(4,"0")}-${String(r.numero).padStart(8,"0")}` : "-" },
  { key: "cliente_nombre",  label: "Cliente" },
  { key: "vendedor_nombre", label: "Vendedor" },
  { key: "condicion_venta", label: "Condición",     render: (r) => COND_LABEL[r.condicion_venta] ?? "-" },
  { key: "neto",            label: "Neto",          className: "money", align: "right", render: (r) => formatCurrency(r.neto) },
  { key: "total",           label: "Total",         className: "money", align: "right", render: (r) => formatCurrency(r.total) },
];

function useFetch(url) {
  return useAsyncData(() => apiRequest(url), [url]);
}

export function VentasPage() {
  const [days, setDays] = useState(30);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading } = useFetch(`/ventas?days=${days}&limit=${limit}&offset=${offset}`);

  const total = data?.total ?? 0;
  const items = (data?.items ?? []).map((r) => ({ ...r, id: r.id }));

  return (
    <div className="app-shell with-sidebar">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content">
          <div className="page-header">
            <h1>Ventas</h1>
            <div className="page-actions">
              {[7, 30, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  className={`period-btn${days === d ? " active" : ""}`}
                  onClick={() => { setDays(d); setOffset(0); }}
                >
                  {d === 365 ? "1 año" : `${d}d`}
                </button>
              ))}
            </div>
          </div>

          <div className="panel table-panel">
            <div className="panel-header">
              <h2>Comprobantes</h2>
              <span>{total.toLocaleString("es-AR")} registros</span>
            </div>
            <DataTable columns={COLUMNS} rows={items} loading={loading} emptyText="Sin ventas en el período" />
            {total > limit && (
              <div className="pagination">
                <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>← Anterior</button>
                <span>{Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}</span>
                <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Siguiente →</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
