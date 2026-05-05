export function DataTable({ columns, rows, loading, emptyText = "Sin datos" }) {
  if (loading) {
    return <div className="loading-state">Cargando...</div>;
  }

  if (!rows || rows.length === 0) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.align ? { textAlign: col.align } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} onClick={row._onClick} style={row._onClick ? { cursor: "pointer" } : {}}>
              {columns.map((col) => (
                <td key={col.key} className={col.className ?? ""} style={col.align ? { textAlign: col.align } : {}}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
