import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  Search, Pin, EyeOff, ArrowUpDown, MoreHorizontal,
  AlignLeft, Rows, Rows3, Rows4, ChevronRight as ExpandIcon,
} from 'lucide-react';
import { cn } from '../../ui/utils';
import EmptyState from '../EmptyState/EmptyState';
import { useWidgetSettings } from '../../../store/widgetSettingsStore';

const SortIcon = ({ direction }) => {
  if (direction === 'asc') return <ChevronUp size={11} />;
  if (direction === 'desc') return <ChevronDown size={11} />;
  return <ChevronsUpDown size={11} className="opacity-30" />;
};

const PAGE_SIZES = [10, 25, 50, 100, 250];
const DENSITY_HEIGHTS = { compact: 'py-1', normal: 'py-2', comfortable: 'py-3' };

const applyConditionalFormat = (value, rule) => {
  if (!rule) return '';
  if (rule.type === 'gt' && value > rule.value) return rule.className;
  if (rule.type === 'lt' && value < rule.value) return rule.className;
  if (rule.type === 'between' && value >= rule.from && value <= rule.to) return rule.className;
  if (rule.type === 'eq' && value === rule.value) return rule.className;
  return '';
};

const DataGrid = ({
  widgetId,
  columns: columnDefs,
  rows = [],
  loading = false,
  empty,
  emptyMessage,
  initialPageSize = 25,
  enableFilters = true,
  enableSearch = true,
  enablePagination = true,
  enableColumnVisibility = true,
  enableMultiSort = true,
  enablePin = true,
  enableGrouping = false,
  expandable = false,
  rowExpandRender,
  className,
  footer,
  onRowClick,
  onRowDoubleClick,
  rowHighlight,
}) => {
  const update = useWidgetSettings((s) => s.update);
  const settings = useWidgetSettings((s) => s.settings[widgetId] || {});

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState(settings.sorting || []);
  const [columnVisibility, setColumnVisibility] = useState(settings.columnVisibility || {});
  const [columnOrder, setColumnOrder] = useState(settings.columnOrder || []);
  const [columnPinning, setColumnPinning] = useState(settings.columnPinning || { left: [], right: [] });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: settings.pageSize || initialPageSize });
  const [density, setDensity] = useState(settings.density || 'normal');
  const [expanded, setExpanded] = useState({});
  const [grouping, setGrouping] = useState([]);
  const [colMenu, setColMenu] = useState(null);
  const colMenuRef = useRef(null);

  // Persist settings
  useEffect(() => { update(widgetId, { sorting, columnVisibility, columnOrder, columnPinning, pageSize: pagination.pageSize, density }); /* eslint-disable-next-line */ }, [sorting, columnVisibility, columnOrder, columnPinning, pagination.pageSize, density]);

  useEffect(() => {
    if (!colMenu) return;
    const handler = (e) => { if (!colMenuRef.current?.contains(e.target)) setColMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colMenu]);

  const columns = useMemo(
    () => columnDefs.map((col) => ({
      id: col.key,
      accessorKey: col.key,
      header: col.label ?? col.key,
      enableSorting: col.sortable !== false,
      enableHiding: col.required !== true,
      enableGrouping: col.groupable === true,
      aggregationFn: col.aggregationFn,
      cell: col.render
        ? ({ row }) => col.render(row.original, row)
        : ({ getValue }) => {
            const v = getValue();
            if (typeof v === 'number') return new Intl.NumberFormat('es-AR').format(v);
            return v ?? '—';
          },
      meta: {
        align: col.align || 'left',
        width: col.width,
        conditionalFormat: col.conditionalFormat,
        showInExport: col.showInExport !== false,
        labelExport: col.label ?? col.key,
      },
    })),
    [columnDefs]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter, sorting, columnVisibility, columnOrder, columnPinning, pagination, expanded, grouping },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    enableMultiSort,
    enableSortingRemoval: true,
    getRowCanExpand: () => Boolean(expandable),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getGroupedRowModel: enableGrouping ? getGroupedRowModel() : undefined,
    getExpandedRowModel: getExpandedRowModel(),
  });

  const handlePin = (colId, side) => {
    setColumnPinning((prev) => {
      const next = { ...prev, left: [...prev.left], right: [...prev.right] };
      next.left = next.left.filter((id) => id !== colId);
      next.right = next.right.filter((id) => id !== colId);
      if (side) next[side] = [...next[side], colId];
      return next;
    });
    setColMenu(null);
  };

  const visibleLeafColumns = table.getVisibleLeafColumns();

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        {enableSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded border border-slate-200 bg-white py-1 pl-7 pr-2 text-xs focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center rounded border border-slate-200 bg-white p-0.5">
            {[{ k: 'compact', i: Rows4, t: 'Compacto' }, { k: 'normal', i: Rows3, t: 'Normal' }, { k: 'comfortable', i: Rows, t: 'Cómodo' }].map(({ k, i: Icon, t }) => (
              <button
                key={k}
                onClick={() => setDensity(k)}
                title={t}
                className={cn('rounded p-1', density === k ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50')}
              >
                <Icon size={11} />
              </button>
            ))}
          </div>

          {enableColumnVisibility && (
            <div className="relative">
              <button
                onClick={() => setColMenu(colMenu === '__visibility' ? null : '__visibility')}
                className="rounded border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
                title="Columnas"
              >
                <EyeOff size={12} />
              </button>
              {colMenu === '__visibility' && (
                <div ref={colMenuRef} className="absolute right-0 top-full z-30 mt-1 w-56 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
                  <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Columnas visibles</div>
                  {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((col) => (
                    <label key={col.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                      />
                      <span>{typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {empty || (!loading && table.getRowModel().rows.length === 0) ? (
          <EmptyState title="Sin datos" description={emptyMessage || 'No hay filas que coincidan'} />
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const isPinnedLeft = header.column.getIsPinned() === 'left';
                    const isPinnedRight = header.column.getIsPinned() === 'right';
                    const align = header.column.columnDef.meta?.align || 'left';
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.column.columnDef.meta?.width }}
                        className={cn(
                          'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap',
                          align === 'right' && 'text-right',
                          align === 'center' && 'text-center',
                          isPinnedLeft && 'sticky left-0 bg-slate-50 shadow-[1px_0_0_0_rgb(226_232_240)]',
                          isPinnedRight && 'sticky right-0 bg-slate-50 shadow-[-1px_0_0_0_rgb(226_232_240)]'
                        )}
                      >
                        <div className={cn('flex items-center gap-1.5 group', align === 'right' && 'justify-end', align === 'center' && 'justify-center')}>
                          <button
                            onClick={(e) => header.column.getToggleSortingHandler()?.(e)}
                            className="flex items-center gap-1 hover:text-indigo-600"
                            disabled={!header.column.getCanSort()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && <SortIcon direction={header.column.getIsSorted()} />}
                          </button>
                          {enablePin && header.column.getCanHide() && (
                            <button
                              onClick={() => setColMenu(colMenu === header.id ? null : header.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700"
                              title="Opciones de columna"
                            >
                              <MoreHorizontal size={11} />
                            </button>
                          )}
                          {colMenu === header.id && (
                            <div ref={colMenuRef} className="absolute z-30 mt-6 rounded border border-slate-200 bg-white py-1 shadow-lg">
                              <button onClick={() => handlePin(header.id, 'left')} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50">
                                <Pin size={11} /> Fijar a izquierda
                              </button>
                              <button onClick={() => handlePin(header.id, 'right')} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50">
                                <Pin size={11} /> Fijar a derecha
                              </button>
                              <button onClick={() => handlePin(header.id, null)} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50">
                                Desfijar
                              </button>
                              <button onClick={() => { header.column.toggleVisibility(false); setColMenu(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 text-red-600">
                                <EyeOff size={11} /> Ocultar
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map((row) => {
                const highlightClass = rowHighlight ? rowHighlight(row.original) : '';
                return (
                  <>
                    <tr
                      key={row.id}
                      onClick={() => onRowClick?.(row.original, row)}
                      onDoubleClick={() => onRowDoubleClick?.(row.original, row)}
                      className={cn(
                        'hover:bg-indigo-50/40 transition-colors',
                        (onRowClick || onRowDoubleClick) && 'cursor-pointer',
                        highlightClass
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const align = cell.column.columnDef.meta?.align || 'left';
                        const cf = cell.column.columnDef.meta?.conditionalFormat;
                        const val = cell.getValue();
                        const cfClass = Array.isArray(cf) ? cf.map((r) => applyConditionalFormat(val, r)).join(' ') : applyConditionalFormat(val, cf);
                        const isPinnedLeft = cell.column.getIsPinned() === 'left';
                        const isPinnedRight = cell.column.getIsPinned() === 'right';
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              'px-3 text-slate-700 whitespace-nowrap', DENSITY_HEIGHTS[density],
                              align === 'right' && 'text-right tabular-nums',
                              align === 'center' && 'text-center',
                              isPinnedLeft && 'sticky left-0 bg-white shadow-[1px_0_0_0_rgb(226_232_240)]',
                              isPinnedRight && 'sticky right-0 bg-white shadow-[-1px_0_0_0_rgb(226_232_240)]',
                              cfClass
                            )}
                          >
                            {expandable && cell.column.getIsFirstColumn?.() && (
                              <button onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }} className="mr-1 text-slate-400">
                                <ExpandIcon size={11} className={cn('transition-transform', row.getIsExpanded() && 'rotate-90')} />
                              </button>
                            )}
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                    {expandable && row.getIsExpanded() && rowExpandRender && (
                      <tr key={`${row.id}-exp`}>
                        <td colSpan={row.getVisibleCells().length} className="bg-slate-50 p-3">
                          {rowExpandRender(row.original)}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>

            {footer && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                {footer}
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Pagination */}
      {enablePagination && table.getRowModel().rows.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
              {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, rows.length)} de {rows.length}
            </span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30">
              <ChevronLeft size={13} />
            </button>
            <span className="text-xs text-slate-600 font-medium px-1.5">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGrid;
