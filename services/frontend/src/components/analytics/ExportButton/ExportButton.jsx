import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ImageIcon, ChevronDown } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useExport } from '../../../hooks/useExport';
import apiClient from '../../../api/client';

const ExportButton = ({
  data,
  endpoint,
  label,
  filename = 'export',
  columns = [],
  panelRef,
  size = 'md',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);
  const getData = async () => {
    if (!endpoint) return data;
    const response = await apiClient.get(endpoint);
    const sheetName = label || filename || 'Datos';
    return { [sheetName]: response.data };
  };
  const { exportCSV, exportXLSX, exportPDF, copyImage } = useExport({ data, getData, filename, columns });

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    { label: 'Exportar a Excel (.xlsx)', icon: FileSpreadsheet, action: exportXLSX },
    { label: 'Exportar a CSV (.csv)', icon: FileText, action: exportCSV },
    { label: 'Exportar a PDF', icon: Download, action: () => exportPDF(panelRef) },
    { label: 'Copiar imagen', icon: ImageIcon, action: () => copyImage(panelRef) },
  ];

  const isIcon = size === 'icon';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors',
          isIcon ? 'p-1.5' : 'h-8 px-2.5 text-xs font-medium border border-slate-200 bg-white shadow-sm rounded-lg text-slate-700',
          className
        )}
        title="Exportar"
      >
        <Download size={isIcon ? 14 : 13} />
        {!isIcon && <span>{loading ? 'Exportando' : 'Exportar'}</span>}
        {!isIcon && <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
          {items.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={async () => {
                try {
                  setLoading(true);
                  await action();
                } finally {
                  setLoading(false);
                  setOpen(false);
                }
              }}
            >
              <Icon size={14} className="text-slate-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
