import { useEffect, useState } from 'react';
import { api } from './api';

export const MGDL_PER_MMOL = 18.016;

// Glucose range colours (status colours: always shown with a text label too).
export const RANGES = [
  { key: 'very_high', label: 'Very high', color: '#ec835a' },
  { key: 'high', label: 'High', color: '#fab219' },
  { key: 'in_range', label: 'In range', color: '#0ca30c' },
  { key: 'low', label: 'Low', color: '#d03b3b' },
  { key: 'very_low', label: 'Very low', color: '#8f1d1d' },
];

export const SERIES = {
  glucose: '#2a78d6',
  meter: '#0d366b',
  bolus: '#6250d6',
  basal: '#9085e9',
  carbs: '#d55181',
};

export const EVENT_LABELS = {
  exercise: 'Exercise',
  site_change: 'Site change',
  sensor_change: 'Sensor change',
  illness: 'Illness',
  stress: 'Stress',
  alcohol: 'Alcohol',
  ketones: 'Ketones',
  note: 'Note',
};

export function classify(mgdl, s) {
  if (mgdl < s.very_low) return 'very_low';
  if (mgdl < s.target_low) return 'low';
  if (mgdl <= s.target_high) return 'in_range';
  if (mgdl <= s.very_high) return 'high';
  return 'very_high';
}

export function rangeColor(mgdl, s) {
  return RANGES.find((r) => r.key === classify(mgdl, s)).color;
}

// Convert stored mg/dL to the user's display unit (number only).
export function toDisplay(mgdl, units) {
  if (mgdl == null || !Number.isFinite(mgdl)) return null;
  return units === 'mmol/L' ? Math.round((mgdl / MGDL_PER_MMOL) * 10) / 10 : Math.round(mgdl);
}

export function fromDisplay(value, units) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return units === 'mmol/L' ? Math.round(n * MGDL_PER_MMOL) : n;
}

export function fmtG(mgdl, units, { unit = false } = {}) {
  const v = toDisplay(mgdl, units);
  if (v == null) return '–';
  const text = units === 'mmol/L' ? v.toFixed(1) : String(v);
  return unit ? `${text} ${units}` : text;
}

export const fmtPct = (n, digits = 0) => (n == null ? '–' : `${n.toFixed(digits)}%`);
export const fmtNum = (n, digits = 1) => (n == null ? '–' : (Math.round(n * 10 ** digits) / 10 ** digits).toString());

export function fmtTime(ts) {
  const h = Number(ts.slice(11, 13));
  const m = ts.slice(14, 16);
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

export function fmtDate(dateStr, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, opts);
}

export function minutesOfDay(ts) {
  return Number(ts.slice(11, 13)) * 60 + Number(ts.slice(14, 16));
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Current local time as "YYYY-MM-DDTHH:MM" for <input type="datetime-local">.
export function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayLocal() {
  return nowLocalInput().slice(0, 10);
}

// Shared settings, fetched once and refreshed after saving.
let cached = null;
const listeners = new Set();

export async function reloadDiabetesSettings() {
  cached = await api.get('/api/diabetes/settings');
  listeners.forEach((fn) => fn(cached));
  return cached;
}

export function useDiabetesSettings() {
  const [settings, setSettings] = useState(cached);
  useEffect(() => {
    listeners.add(setSettings);
    if (!cached) reloadDiabetesSettings().catch(() => {});
    return () => listeners.delete(setSettings);
  }, []);
  return settings;
}

// Track an element's width so charts render at real pixel size (crisp text on phones).
export function useWidth(ref, fallback = 800) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
