import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
  subDays, subWeeks, subMonths, subQuarters, subYears,
  differenceInDays, format,
} from 'date-fns';

const iso = (d) => format(d, 'yyyy-MM-dd');

export const PRESETS = {
  today:        { label: 'Hoy',                group: 'rapid' },
  yesterday:    { label: 'Ayer',               group: 'rapid' },
  last_7_days:  { label: 'Últimos 7 días',     group: 'rapid' },
  last_30_days: { label: 'Últimos 30 días',    group: 'rapid' },
  last_90_days: { label: 'Últimos 90 días',    group: 'rapid' },

  this_week:    { label: 'Esta semana',        group: 'current' },
  this_month:   { label: 'Este mes (MTD)',     group: 'current' },
  this_quarter: { label: 'Este trim. (QTD)',   group: 'current' },
  this_year:    { label: 'Este año (YTD)',     group: 'current' },

  last_week:    { label: 'Semana pasada',      group: 'previous' },
  last_month:   { label: 'Mes pasado',         group: 'previous' },
  last_quarter: { label: 'Trim. pasado',       group: 'previous' },
  last_year:    { label: 'Año pasado',         group: 'previous' },

  custom:       { label: 'Personalizado',      group: 'custom' },
};

export const COMPARE_MODES = {
  none:        { label: 'Sin comparar' },
  previous:    { label: 'Período anterior' },
  yoy:         { label: 'Año anterior (YoY)' },
  ytd_prev:    { label: 'YTD del año pasado' },
  target:      { label: 'vs Objetivo' },
  custom:      { label: 'Custom' },
};

export const GRANULARITIES = {
  hour:    { label: 'Hora',      days: 0 },
  day:     { label: 'Día',       days: 1 },
  week:    { label: 'Semana',    days: 7 },
  month:   { label: 'Mes',       days: 30 },
  quarter: { label: 'Trimestre', days: 90 },
  year:    { label: 'Año',       days: 365 },
};

export const resolvePreset = (preset, now = new Date()) => {
  switch (preset) {
    case 'today':
      return { desde: iso(startOfDay(now)), hasta: iso(endOfDay(now)) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { desde: iso(startOfDay(y)), hasta: iso(endOfDay(y)) };
    }
    case 'last_7_days':
      return { desde: iso(subDays(now, 6)), hasta: iso(now) };
    case 'last_30_days':
      return { desde: iso(subDays(now, 29)), hasta: iso(now) };
    case 'last_90_days':
      return { desde: iso(subDays(now, 89)), hasta: iso(now) };

    case 'this_week':
      return { desde: iso(startOfWeek(now, { weekStartsOn: 1 })), hasta: iso(now) };
    case 'this_month':
      return { desde: iso(startOfMonth(now)), hasta: iso(now) };
    case 'this_quarter':
      return { desde: iso(startOfQuarter(now)), hasta: iso(now) };
    case 'this_year':
      return { desde: iso(startOfYear(now)), hasta: iso(now) };

    case 'last_week': {
      const w = subWeeks(now, 1);
      return { desde: iso(startOfWeek(w, { weekStartsOn: 1 })), hasta: iso(endOfWeek(w, { weekStartsOn: 1 })) };
    }
    case 'last_month': {
      const m = subMonths(now, 1);
      return { desde: iso(startOfMonth(m)), hasta: iso(endOfMonth(m)) };
    }
    case 'last_quarter': {
      const q = subQuarters(now, 1);
      return { desde: iso(startOfQuarter(q)), hasta: iso(endOfQuarter(q)) };
    }
    case 'last_year': {
      const y = subYears(now, 1);
      return { desde: iso(startOfYear(y)), hasta: iso(endOfYear(y)) };
    }

    default:
      return null;
  }
};

export const resolveComparePeriod = (desde, hasta, compareMode) => {
  if (compareMode === 'none' || !compareMode) return null;
  const d = new Date(desde);
  const h = new Date(hasta);
  const days = differenceInDays(h, d);

  switch (compareMode) {
    case 'previous':
      return { desde: iso(subDays(d, days + 1)), hasta: iso(subDays(h, days + 1)) };
    case 'yoy':
      return { desde: iso(subYears(d, 1)), hasta: iso(subYears(h, 1)) };
    case 'ytd_prev': {
      const y = subYears(d, 1);
      return { desde: iso(startOfYear(y)), hasta: iso(subYears(h, 1)) };
    }
    default:
      return null;
  }
};

export const suggestGranularity = (desde, hasta) => {
  const d = new Date(desde);
  const h = new Date(hasta);
  const days = differenceInDays(h, d);
  if (days <= 1)   return 'hour';
  if (days <= 14)  return 'day';
  if (days <= 90)  return 'week';
  if (days <= 730) return 'month';
  return 'quarter';
};

export const isoDate = iso;
