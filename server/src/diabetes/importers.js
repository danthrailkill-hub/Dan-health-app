// CSV importers for common diabetes device exports.
//
// Each importer returns { glucose: [], insulin: [], carbs: [], events: [] } with
// rows shaped for insertBatch() in schema.js. Glucose is converted to mg/dL.
//
// To support a new device: write a function that takes the parsed rows and
// returns that shape, add a detector to detectFormat(), and register it in IMPORTERS.

import { normalizeTs } from './time.js';
import { MGDL_PER_MMOL } from './stats.js';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  // Pick the delimiter that appears most in the first few lines (comma, tab or semicolon).
  const sample = src.split(/\r?\n/).slice(0, 5).join('\n');
  const delim = [',', '\t', ';'].sort((a, b) => sample.split(b).length - sample.split(a).length)[0];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const num = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(',', '.').trim());
  return Number.isFinite(n) && String(v).trim() !== '' ? n : null;
};

// Find the header row (some exports have metadata lines above it) and return
// an array of objects keyed by trimmed header names.
function toObjects(rows, headerTest) {
  const headerIdx = rows.findIndex((r) => headerTest(r.map((c) => c.trim())));
  if (headerIdx < 0) return [];
  const header = rows[headerIdx].map((c) => c.trim());
  return rows.slice(headerIdx + 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]?.trim() ?? ''])));
}

function findKey(obj, ...patterns) {
  return Object.keys(obj).find((k) => patterns.some((p) => p.test(k)));
}

function glucoseToMgdl(raw, isMmol) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'low') return 39; // sensor floor
  if (s === 'high') return 401; // sensor ceiling
  const n = num(raw);
  if (n == null) return null;
  return isMmol ? Math.round(n * MGDL_PER_MMOL) : n;
}

// ---- Dexcom Clarity "Export" CSV ----
// Columns: Index, Timestamp (YYYY-MM-DDThh:mm:ss), Event Type, Event Subtype, ...,
//          Glucose Value (mg/dL), Insulin Value (u), Carb Value (grams), Duration (hh:mm:ss), ...
function importDexcom(rows) {
  const objs = toObjects(rows, (h) => h.some((c) => /^Timestamp/i.test(c)) && h.includes('Event Type'));
  const out = { glucose: [], insulin: [], carbs: [], events: [] };
  if (!objs.length) return out;
  const tsKey = findKey(objs[0], /^Timestamp/i);
  const gKey = findKey(objs[0], /^Glucose Value/i);
  const isMmol = /mmol/i.test(gKey || '');
  const insKey = findKey(objs[0], /^Insulin Value/i);
  const carbKey = findKey(objs[0], /^Carb Value/i);
  const durKey = findKey(objs[0], /^Duration/i);

  for (const o of objs) {
    const ts = normalizeTs(o[tsKey]);
    if (!ts) continue;
    const type = (o['Event Type'] || '').toLowerCase();
    const sub = (o['Event Subtype'] || '').toLowerCase();
    if (type === 'egv') {
      const mgdl = glucoseToMgdl(o[gKey], isMmol);
      if (mgdl != null) out.glucose.push({ ts, mgdl, source: 'cgm' });
    } else if (type === 'calibration' || type === 'fingerstick' || type === 'bg') {
      const mgdl = glucoseToMgdl(o[gKey], isMmol);
      if (mgdl != null) out.glucose.push({ ts, mgdl, source: 'meter' });
    } else if (type === 'insulin') {
      const units = num(o[insKey]);
      if (units != null && units > 0) {
        out.insulin.push({ ts, units, kind: /long/.test(sub) ? 'basal' : 'bolus', insulin: o['Event Subtype'] || null });
      }
    } else if (type === 'carbs') {
      const grams = num(o[carbKey]);
      if (grams != null && grams > 0) out.carbs.push({ ts, grams });
    } else if (type === 'exercise') {
      const [h, m] = (o[durKey] || '').split(':').map(Number);
      out.events.push({
        ts,
        kind: 'exercise',
        duration_min: Number.isFinite(h) ? h * 60 + (m || 0) : null,
        value: { light: 1, medium: 2, heavy: 3 }[sub] ?? null,
        note: o['Event Subtype'] || null,
      });
    } else if (type === 'health') {
      const kind = /illness/.test(sub) ? 'illness' : /stress/.test(sub) ? 'stress' : /alcohol/.test(sub) ? 'alcohol' : 'note';
      out.events.push({ ts, kind, note: o['Event Subtype'] || null });
    }
  }
  return out;
}

// ---- Abbott LibreView "Download glucose data" CSV ----
// Line 1 is metadata; line 2 is the header with "Device Timestamp", "Record Type",
// "Historic Glucose mg/dL" (or mmol/L), "Scan Glucose ...", "Strip Glucose ...",
// "Rapid-Acting Insulin (units)", "Long-Acting Insulin Value (units)", "Carbohydrates (grams)", "Notes".
function importLibre(rows, dateOrder) {
  const objs = toObjects(rows, (h) => h.includes('Device Timestamp'));
  const out = { glucose: [], insulin: [], carbs: [], events: [] };
  if (!objs.length) return out;
  const k = objs[0];
  const histKey = findKey(k, /^Historic Glucose/i);
  const scanKey = findKey(k, /^Scan Glucose/i);
  const stripKey = findKey(k, /^Strip Glucose/i);
  const isMmol = /mmol/i.test(histKey || scanKey || '');
  const rapidKey = findKey(k, /^Rapid-Acting Insulin \(units\)/i);
  const longKey = findKey(k, /^Long-Acting Insulin( Value)? \(units\)/i);
  const carbKey = findKey(k, /^Carbohydrates \(grams\)/i);
  const ketoneKey = findKey(k, /^Ketone/i);

  for (const o of objs) {
    const ts = normalizeTs(o['Device Timestamp'], dateOrder);
    if (!ts) continue;
    const hist = glucoseToMgdl(o[histKey], isMmol);
    if (hist != null) out.glucose.push({ ts, mgdl: hist, source: 'cgm' });
    // Scans duplicate historic readings at a finer grain; keep them only if no historic value.
    const scan = glucoseToMgdl(o[scanKey], isMmol);
    if (scan != null && hist == null) out.glucose.push({ ts, mgdl: scan, source: 'cgm' });
    const strip = glucoseToMgdl(o[stripKey], isMmol);
    if (strip != null) out.glucose.push({ ts, mgdl: strip, source: 'meter' });
    const rapid = num(o[rapidKey]);
    if (rapid) out.insulin.push({ ts, units: rapid, kind: 'bolus', insulin: 'Rapid-acting' });
    const long = num(o[longKey]);
    if (long) out.insulin.push({ ts, units: long, kind: 'basal', insulin: 'Long-acting' });
    const grams = num(o[carbKey]);
    if (grams) out.carbs.push({ ts, grams, description: o.Notes || null });
    const ketone = num(o[ketoneKey]);
    if (ketone != null) out.events.push({ ts, kind: 'ketones', value: ketone });
  }
  return out;
}

const EVENT_KINDS = ['exercise', 'site_change', 'sensor_change', 'illness', 'stress', 'alcohol', 'ketones', 'note'];

// ---- Generic CSV (this app's own template, or a spreadsheet you keep yourself) ----
// Header: timestamp, glucose_mgdl | glucose_mmol, glucose_source, insulin_units, insulin_kind, insulin_name, carbs_g, event, note
// (This is also the format of the app's own CSV export, so an export can be re-imported.)
function importGeneric(rows, dateOrder) {
  const objs = toObjects(rows, (h) => h.some((c) => /^(timestamp|date ?time|time)$/i.test(c)));
  const out = { glucose: [], insulin: [], carbs: [], events: [] };
  if (!objs.length) return out;
  const k = objs[0];
  const tsKey = findKey(k, /^(timestamp|date ?time|time)$/i);
  const mgKey = findKey(k, /^glucose(_mgdl| \(mg\/dl\))?$/i, /^bg$/i);
  const mmolKey = findKey(k, /^glucose_mmol$/i, /^glucose \(mmol\/l\)$/i);
  for (const o of objs) {
    const ts = normalizeTs(o[tsKey], dateOrder);
    if (!ts) continue;
    const mgdl = mmolKey && o[mmolKey] ? glucoseToMgdl(o[mmolKey], true) : glucoseToMgdl(o[mgKey], false);
    if (mgdl != null) out.glucose.push({ ts, mgdl, source: /meter|strip|finger/i.test(o.glucose_source || '') ? 'meter' : 'cgm' });
    const units = num(o.insulin_units);
    if (units) {
      const kind = /basal|long/i.test(o.insulin_kind || '') ? 'basal' : /correct/i.test(o.insulin_kind || '') ? 'correction' : 'bolus';
      out.insulin.push({ ts, units, kind, insulin: o.insulin_name || null });
    }
    const grams = num(o.carbs_g ?? o.carbs);
    if (grams) out.carbs.push({ ts, grams, description: o.note || null });
    if (EVENT_KINDS.includes(o.event)) out.events.push({ ts, kind: o.event, note: o.note || null });
  }
  return out;
}

export const IMPORTERS = {
  dexcom: { label: 'Dexcom Clarity CSV', fn: importDexcom },
  libre: { label: 'Abbott LibreView CSV', fn: importLibre },
  generic: { label: 'Generic CSV (template)', fn: importGeneric },
};

export function detectFormat(rows) {
  const head = rows.slice(0, 5).map((r) => r.map((c) => c.trim()));
  if (head.some((r) => r.includes('Event Type') && r.some((c) => /^Timestamp/i.test(c)))) return 'dexcom';
  if (head.some((r) => r.includes('Device Timestamp'))) return 'libre';
  if (head.some((r) => r.some((c) => /^(timestamp|date ?time|time)$/i.test(c)))) return 'generic';
  return null;
}

// If any date has a first component > 12 it must be day-first.
function detectDateOrder(rows) {
  for (const r of rows.slice(0, 500)) {
    for (const c of r) {
      const m = String(c).match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{4}/);
      if (m && Number(m[1]) > 12) return 'DMY';
      if (m && Number(m[2]) > 12) return 'MDY';
    }
  }
  return 'MDY';
}

export function importCsv(text, { format, dateOrder } = {}) {
  const rows = parseCsv(text);
  const fmt = format && format !== 'auto' ? format : detectFormat(rows);
  if (!fmt || !IMPORTERS[fmt]) {
    throw new Error('Could not recognise this file. Supported: Dexcom Clarity export, LibreView export, or the generic template.');
  }
  const order = dateOrder && dateOrder !== 'auto' ? dateOrder : detectDateOrder(rows);
  return { format: fmt, dateOrder: order, batch: IMPORTERS[fmt].fn(rows, order) };
}

export const GENERIC_TEMPLATE =
  'timestamp,glucose_mgdl,glucose_source,insulin_units,insulin_kind,insulin_name,carbs_g,note\n' +
  '2026-01-15 07:30,112,meter,,,,,\n' +
  '2026-01-15 07:35,,,5.5,bolus,Humalog,45,Oatmeal and berries\n' +
  '2026-01-15 22:00,,,20,basal,Tresiba,,\n';
