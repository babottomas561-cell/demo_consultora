import { useState } from "react";

import { DataTable } from "../components/DataTable";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { useAsyncData } from "../hooks/useAsyncData";
import { apiRequest } from "../services/api";
import { formatCurrency, formatCompactCurrency } from "../utils/format";

const COLUMNS = [
  { key: "cod_articulo",   label: "Código",        render: (r) => `#${r.cod_articulo}` },
  { key: "descripcion",    label: "Descripción" },
  { key: "rubro",          label: "Rubro" },
  { key: "precio_compra",  label: "P. Compra",     className: "money", align: "right", render: (r) => formatCurrency(r.precio_compra) },
  { key: "precio_venta",   label: "P. Venta",      className: "money", align: "right", render: (r) => formatCurrency(r.precio_venta) },
  { key: "margen_pct",     label: "Margen %",      align: "right",     render: (r) => `${r.margen_pct}%` },
  { key: "ventas_30d",     label: "Vtas. 30d",     className: "money", align: "right", render: (r) => formatCompactCurrency(r.ventas_30d) },
  { key: "unidades_30d",   label: "Uds. 30d",      align: "right",     render: (r) => r.unidades_30d.toLocaleString("es-AR") },
];

export function ArticulosPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const url = `/articulos?limit=${limit}&offset=${offset}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  const { data, loading } = useAsyncData(() => apiRequest(url), [url]);

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  function handleSearch(e) {
    e.preventDefault();
    setSearch(q);
    setOffset(0);
  }

  return (
    <div className="app-shell with-sidebar">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content">
          <div className="page-header">
            <h1>Artículos</h1>
            <form className="search-form" onSubmit={handleSearch}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por descripción..."
                className="search-input"
              />
              <button type="submit" className="primary-button">Buscar</button>
            </form>
          </div>

          <div className="panel table-panel">
            <div className="panel-header">
              <h2>Catálogo</h2>
              <span>{total.toLocaleString("es-AR")} artículos</span>
            </div>
            <DataTable columns={COLUMNS} rows={items} loading={loading} emptyText="Sin artículos" />
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
