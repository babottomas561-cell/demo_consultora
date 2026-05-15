import { useCallback } from 'react';

const arrayToCSV = (rows, columns) => {
  const effectiveColumns = columns.length > 0
    ? columns
    : Array.from(rows.reduce((set, row) => {
        Object.keys(row ?? {}).forEach((key) => set.add(key));
        return set;
      }, new Set())).map((key) => ({ key, label: key }));
  const headers = effectiveColumns.map((c) => c.label ?? c.key).join(',');
  const lines = rows.map((row) =>
    effectiveColumns.map((c) => {
      const val = row[c.key] ?? '';
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );
  return [headers, ...lines].join('\n');
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const flattenRecord = (value, prefix = '') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { [prefix || 'valor']: value };
  }

  return Object.entries(value).reduce((acc, [key, item]) => {
    const nextKey = prefix ? `${prefix}_${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      Object.assign(acc, flattenRecord(item, nextKey));
    } else {
      acc[nextKey] = item;
    }
    return acc;
  }, {});
};

const rowsFromValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.movimientos)) return value.movimientos;
  if (Array.isArray(value.ranking)) return value.ranking;
  if (Array.isArray(value.series)) return value.series;
  if (Array.isArray(value.productos)) return value.productos;
  if (Array.isArray(value.vendedores)) return value.vendedores;
  if (Array.isArray(value.clientes)) return value.clientes;
  if (Array.isArray(value.proveedores)) return value.proveedores;
  if (Array.isArray(value.comprobantes)) return value.comprobantes;
  if (Array.isArray(value.alertas)) return value.alertas;
  if (Array.isArray(value.sugerencias)) return value.sugerencias;
  if (Array.isArray(value.por_tipo)) return value.por_tipo;
  if (typeof value === 'object') return [value];
  return [{ valor: value }];
};

const normalizeSheets = (value) => {
  const sheets = value && typeof value === 'object' && !Array.isArray(value) ? value : { Datos: value };
  return Object.entries(sheets).reduce((acc, [name, rows]) => {
    const normalized = rowsFromValue(rows).map((row) => flattenRecord(row));
    acc[name] = normalized;
    return acc;
  }, {});
};

export const useExport = ({ data, getData, filename = 'export', columns = [] }) => {
  const getExportData = useCallback(async () => (getData ? getData() : data), [data, getData]);

  const exportCSV = useCallback(async () => {
    const payload = await getExportData();
    const sheets = normalizeSheets(payload);
    const rows = Object.values(sheets)[0] ?? [];
    const csv = arrayToCSV(rows, columns);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
  }, [getExportData, filename, columns]);

  const exportXLSX = useCallback(async () => {
    const payload = await getExportData();
    const { utils, writeFile } = await import('xlsx');
    const wb = utils.book_new();
    const sheets = normalizeSheets(payload);
    Object.entries(sheets).forEach(([name, rows]) => {
      const ws = utils.json_to_sheet(rows ?? []);
      utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    writeFile(wb, `${filename}.xlsx`);
  }, [getExportData, filename]);

  const exportPDF = useCallback(async (elementRef) => {
    if (!elementRef?.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const canvas = await html2canvas(elementRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${filename}.pdf`);
  }, [filename]);

  const copyImage = useCallback(async (elementRef) => {
    if (!elementRef?.current || !navigator.clipboard?.write) return;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(elementRef.current, { scale: 2 });
    canvas.toBlob(async (blob) => {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    });
  }, []);

  return { exportCSV, exportXLSX, exportPDF, copyImage };
};
