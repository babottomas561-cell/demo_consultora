import { useState } from "react";

import { DataTable } from "../components/DataTable";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { useAsyncData } from "../hooks/useAsyncData";
import { apiRequest } from "../services/api";
import { formatCurrency } from "../utils/format";

const IVA_LABEL = { RI: "Resp. Inscripto", CF: "Consumidor Final", RM: "Monotributo", EX: "Exento" };
const COND_LABEL = { 1: "Efectivo", 2: "Cta. Cte.", 3: "Tarjeta", 4: "Otros" };

const COLUMNS = [
  { key: "cod_cliente",     label: "Código",      render: (r) => `#${r.cod_cliente}` },
  { key: "nombre",          label: "Nombre" },
  { key: "cuit",            label: "CUIT" },
  { key: "categoria_iva",   label: "IVA",         render: (r) => IVA_LABEL[r.categoria_iva] ?? r.categoria_iva },
  { key: "condicion_venta", label: "Condición",   render: (r) => COND_LABEL[r.condicion_venta] ?? "-" },
  { key: "vendedor_nombre", label: "Vendedor" },
  { key: "ventas_mes",      label: "Ventas mes",  className: "money", align: "right", render: (r) => formatCurrency(r.ventas_mes) },
];

export function ClientesPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const url = `/clientes?limit=${limit}&offset=${offset}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
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
            <h1>Clientes</h1>
            <form className="search-form" onSubmit={handleSearch}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre..."
                className="search-input"
              />
              <button type="submit" className="primary-button">Buscar</button>
            </form>
          </div>

          <div className="panel table-panel">
            <div className="panel-header">
              <h2>Cartera comercial</h2>
              <span>{total.toLocaleString("es-AR")} clientes</span>
            </div>
            <DataTable columns={COLUMNS} rows={items} loading={loading} emptyText="Sin clientes" />
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
