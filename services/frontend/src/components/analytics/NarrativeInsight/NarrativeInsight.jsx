import { useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '../../ui/utils';
import { runRules } from '../../../lib/narrativeRules';

const TONE_STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  danger:  'bg-red-50 border-red-200 text-red-900',
  info:    'bg-indigo-50 border-indigo-200 text-indigo-900',
  neutral: 'bg-slate-50 border-slate-200 text-slate-700',
};

const renderInline = (text) => {
  // markdown-style bold: **text** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
};

const NarrativeInsight = ({ rules, context, title = 'Insights', maxInsights = 5, dismissible = true, className }) => {
  const insights = useMemo(() => runRules(rules, context, maxInsights), [rules, context, maxInsights]);
  const [dismissed, setDismissed] = useState({});

  const visible = insights.filter((_, i) => !dismissed[i]);
  if (visible.length === 0) return null;

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-3 space-y-2', className)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles size={13} className="text-indigo-500" />
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
        <span className="text-[10px] text-slate-400">· auto-generados</span>
      </div>
      <ul className="space-y-1.5">
        {visible.map((insight, i) => (
          <li
            key={i}
            className={cn(
              'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[12px] leading-snug',
              TONE_STYLES[insight.tone] || TONE_STYLES.neutral
            )}
          >
            <span className="shrink-0">{insight.icon}</span>
            <span className="flex-1">{renderInline(insight.text)}</span>
            {dismissible && (
              <button
                onClick={() => setDismissed((d) => ({ ...d, [i]: true }))}
                className="opacity-50 hover:opacity-100"
                title="Descartar"
              >
                <X size={11} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NarrativeInsight;
