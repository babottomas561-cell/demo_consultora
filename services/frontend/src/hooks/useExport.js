import { useCallback } from 'react';

const arrayToCSV = (rows, columns) => {
  const headers = columns.map((c) => c.label ?? c.key).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => {
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

export const useExport = ({ data, filename = 'export', columns = [] }) => {
  const exportCSV = useCallback(() => {
    const rows = Array.isArray(data) ? data : Object.values(data)[0] ?? [];
    const csv = arrayToCSV(rows, columns);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
  }, [data, filename, columns]);

  const exportXLSX = useCallback(async () => {
    const { utils, writeFile } = await import('xlsx');
    const wb = utils.book_new();
    const sheets = typeof data === 'object' && !Array.isArray(data) ? data : { Datos: data };
    Object.entries(sheets).forEach(([name, rows]) => {
      const ws = utils.json_to_sheet(rows ?? []);
      utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    writeFile(wb, `${filename}.xlsx`);
  }, [data, filename]);

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
