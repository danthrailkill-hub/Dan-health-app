// Synthetic demo data so every screen can be explored before real data is imported.
// This is a toy glucose model for UI testing only, not a physiological simulator.

import { addDays, msToTs, tsToMs } from './time.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fraction of a dose/meal acting in each 5-minute step, gamma-shaped with peak at `peakMin`.
function activityCurve(peakMin, totalMin) {
  const steps = Math.round(totalMin / 5);
  const raw = Array.from({ length: steps }, (_, i) => {
    const t = i * 5;
    return (t / peakMin) * Math.exp(1 - t / peakMin);
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((x) => x / sum);
}

const CARB_CURVE = activityCurve(45, 240);
const INSULIN_CURVE = activityCurve(75, 360);

export function generateDemo(todayDate, nowTs, days = 14) {
  const rand = rng(1234);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const startDate = addDays(todayDate, -(days - 1));
  const startMs = tsToMs(`${startDate}T00:00:00`);
  const endMs = tsToMs(nowTs);
  const steps = Math.floor((endMs - startMs) / 300000);

  const ISF = 45; // mg/dL per unit
  const ICR = 10; // g per unit
  const carbIn = new Float64Array(steps + 100);
  const insIn = new Float64Array(steps + 100);
  const sensitivity = new Float64Array(steps + 100).fill(1);
  const out = { glucose: [], insulin: [], carbs: [], events: [] };
  const stepOf = (ts) => Math.round((tsToMs(ts) - startMs) / 300000);
  const at = (date, minutes) => msToTs(tsToMs(`${date}T00:00:00`) + Math.round(minutes) * 60000);

  const addCarbs = (ts, grams, description) => {
    const i = stepOf(ts);
    if (i < 0 || i >= steps) return;
    out.carbs.push({ ts, grams, description });
    CARB_CURVE.forEach((f, k) => (carbIn[i + k] !== undefined ? (carbIn[i + k] += grams * f) : 0));
  };
  const addBolus = (ts, units, kind = 'bolus') => {
    const i = stepOf(ts);
    if (i < 0 || i >= steps) return;
    out.insulin.push({ ts, units, kind, insulin: 'Humalog' });
    INSULIN_CURVE.forEach((f, k) => (insIn[i + k] !== undefined ? (insIn[i + k] += units * f) : 0));
  };

  for (let d = 0; d < days; d++) {
    const date = addDays(startDate, d);
    const meals = [
      { name: 'Breakfast', at: 435 + rand() * 50, g: 40 + rand() * 25, late: 5 + rand() * 15 },
      { name: 'Lunch', at: 735 + rand() * 60, g: 35 + rand() * 35, late: -10 + rand() * 15 },
      { name: 'Dinner', at: 1110 + rand() * 60, g: 55 + rand() * 35, late: -5 + rand() * 15 },
    ];
    for (const m of meals) {
      const ts = at(date, m.at);
      const grams = Math.round(m.g);
      addCarbs(ts, grams, m.name);
      const dose = Math.round((grams / ICR) * (0.85 + rand() * 0.3) * 2) / 2;
      addBolus(at(date, m.at + m.late), dose);
    }
    if (rand() < 0.35) addCarbs(at(date, 1290 + rand() * 40), Math.round(15 + rand() * 15), 'Snack'); // no bolus
    out.insulin.push({ ts: at(date, 1260), units: 22, kind: 'basal', insulin: 'Tresiba' });
    if (d % 3 === 0) out.events.push({ ts: at(date, 1200), kind: 'site_change', note: null });
    if (d % 10 === 0) out.events.push({ ts: at(date, 1210), kind: 'sensor_change', note: 'Dexcom G7' });
    if (d % 3 === 1) {
      const ts = at(date, 1050);
      out.events.push({ ts, kind: 'exercise', duration_min: 45, value: 2, note: 'Run' });
      // Exercise raises insulin sensitivity for ~12 hours.
      const i = stepOf(ts);
      for (let k = 0; k < 144 && i + k < steps; k++) sensitivity[i + k] = 1.55;
    }
  }

  let g = 125;
  let noise = 0;
  let treatedUntil = -1;
  for (let i = 0; i < steps; i++) {
    const ts = msToTs(startMs + i * 300000);
    const minute = (i * 5) % 1440;
    const dawn = minute >= 240 && minute < 480 ? 0.35 : 0;
    const base = 115;
    g += carbIn[i] * (ISF / ICR) - insIn[i] * ISF * sensitivity[i] + (base - g) * 0.012 + dawn;
    noise = 0.85 * noise + gauss() * 1.6;
    const value = Math.max(40, Math.min(400, Math.round(g + noise)));
    if (i < steps) out.glucose.push({ ts, mgdl: value, source: 'cgm' });
    if (value < 68 && i > treatedUntil) {
      // Treat the low; sometimes with too much.
      const grams = rand() < 0.4 ? 40 : 16;
      addCarbs(msToTs(startMs + (i + 2) * 300000), grams, 'Glucose tabs / juice');
      treatedUntil = i + 9;
    }
    if (minute === 450 && rand() < 0.5) {
      out.glucose.push({ ts: msToTs(startMs + i * 300000 + 60000), mgdl: Math.round(value + gauss() * 6), source: 'meter' });
    }
  }
  // Nothing in the future.
  for (const k of Object.keys(out)) out[k] = out[k].filter((r) => r.ts <= nowTs);
  return out;
}
