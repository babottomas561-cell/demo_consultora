import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../../ui/utils';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import ExportButton from '../ExportButton/ExportButton';
import EmptyState from '../EmptyState/EmptyState';

const SortIcon = ({ direction }) => {
  if (direction === 'asc') return <ChevronUp size={12} />;
  if (direction === 'desc') return <ChevronDown size={12} />;
  return <ChevronsUpDown size={12} className="opacity-30" />;
};

const PAGE_SIZES = [10, 25, 50, 100];

const DataTable = ({
  title,
  columns: columnDefs,
  rows = [],
  loading = false,
  exportFilename,
  exportColumns,
  className,
  initialPageSize = 10,
  footer,
  onRowClick,
  rowClassName,
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: initialPageSize });
  const [columnVisibility, setColumnVisibility] = useState({});
  const [showColPicker, setShowColPicker] = useState(false);

  const columns = useMemo(
    () =>
      columnDefs.map((col) => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label ?? col.key,
        cell: col.render
          ? ({ row }) => col.render(row.original)
          : ({ getValue }) => {
              const v = getValue();
              return v == null ? '—' : String(v);
            },
        enableSorting: col.sortable !== false,
        enableColumnFilter: false,
        size: col.width,
        meta: { align: col.align ?? 'left', footer: col.footer },
      })),
    [columnDefs]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter, sorting, pagination, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    isMultiSortEvent: (e) => e.shiftKey,
  });

  const exportData = useMemo(() => rows, [rows]);

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        {title && <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Buscar..."
              className="h-8 rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowColPicker((p) => !p)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              Columnas
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-slate-200 bg-white shadow-lg p-2 space-y-1">
                {table.getAllLeafColumns().map((col) => (
                  <label key={col.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer px-1">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className="accent-indigo-600"
                    />
                    {col.columnDef.header}
                  </label>
                ))}
              </div>
            )}
          </div>
          {exportData.length > 0 && (
            <ExportButton
              data={exportData}
              filename={exportFilename ?? title ?? 'tabla'}
              columns={exportColumns ?? columnDefs.map((c) => ({ key: c.key, label: c.label }))}
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {table.getRowModel().rows.length === 0 ? (
          <EmptyState variant="no-results" actionLabel={globalFilter ? 'Limpiar búsqueda' : undefined} onAction={() => setGlobalFilter('')} />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 select-none whitespace-nowrap',
                        header.column.getCanSort() && 'cursor-pointer hover:text-slate-800'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.column.columnDef.size }}
                    >
                      <div className={cn('flex items-center gap-1', header.column.columnDef.meta?.align === 'right' && 'justify-end')}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <SortIcon direction={header.column.getIsSorted()} />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn('border-b border-slate-50 hover:bg-slate-50/60 transition-colors', onRowClick && 'cursor-pointer', rowClassName)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-4 py-2.5 text-slate-700',
                        cell.column.columnDef.meta?.align === 'right' && 'text-right tabular-nums'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {footer && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  {footer.map((cell, i) => (
                    <td key={i} className={cn('px-4 py-2 text-xs font-semibold text-slate-700', typeof cell === 'number' && 'text-right tabular-nums')}>
                      {cell ?? ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Pagination */}
      {rows.length > pagination.pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            {table.getFilteredRowModel().rows.length} resultados · Pág {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => setPagination((p) => ({ ...p, pageSize: Number(e.target.value), pageIndex: 0 }))}
              className="rounded border border-slate-200 px-1 py-0.5 text-xs"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} por pág.</option>)}
            </select>
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DataTable;
