// Glucose analytics: the numbers behind the Overview page.
//
// Metric definitions follow the International Consensus on Time in Range
// (Battelino et al., Diabetes Care 2019) used by Glooko, Dexcom Clarity and LibreView:
//   very low < 54, low 54–69, in range 70–180, high 181–250, very high > 250 (mg/dL)
//   GMI (%) = 3.31 + 0.02392 × mean glucose (mg/dL)
//   CV (%)  = SD / mean × 100, stable glucose is ≤ 36%
// Thresholds come from the user's settings so they can be tightened (e.g. 70–140).

import { tsToMs, minutesOfDay, dateOf, addDays } from './time.js';

export const MGDL_PER_MMOL = 18.016;

const CGM_READINGS_PER_DAY = 288; // one every 5 minutes

export const PERIODS = [
  { key: 'overnight', label: 'Overnight', start: 0, end: 6 },
  { key: 'morning', label: 'Morning', start: 6, end: 12 },
  { key: 'afternoon', label: 'Afternoon', start: 12, end: 18 },
  { key: 'evening', label: 'Evening', start: 18, end: 24 },
];

export function fmtGlucose(mgdl, units) {
  if (mgdl == null || !Number.isFinite(mgdl)) return '–';
  return units === 'mmol/L' ? `${(mgdl / MGDL_PER_MMOL).toFixed(1)} mmol/L` : `${Math.round(mgdl)} mg/dL`;
}

function fmtHour(h) {
  const hr = ((h + 11) % 12) + 1;
  return `${hr}${h < 12 ? 'am' : 'pm'}`;
}

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function stdev(arr) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(arr) {
  return percentile([...arr].sort((a, b) => a - b), 0.5);
}

function periodOf(ts) {
  const h = Number(ts.slice(11, 13));
  return PERIODS.find((p) => h >= p.start && h < p.end).key;
}

export function classify(mgdl, s) {
  if (mgdl < s.very_low) return 'very_low';
  if (mgdl < s.target_low) return 'low';
  if (mgdl <= s.target_high) return 'in_range';
  if (mgdl <= s.very_high) return 'high';
  return 'very_high';
}

function rangeBreakdown(values, s) {
  const counts = { very_low: 0, low: 0, in_range: 0, high: 0, very_high: 0 };
  for (const v of values) counts[classify(v, s)]++;
  const pct = {};
  for (const k of Object.keys(counts)) pct[k] = values.length ? (counts[k] / values.length) * 100 : 0;
  return pct;
}

// A low "episode" is consecutive readings below target_low lasting ≥ 15 minutes
// (CGM), or any single fingerstick below target_low.
export function findLows(readings, s) {
  const episodes = [];
  let cur = null;
  const close = () => {
    if (!cur) return;
    const duration = (tsToMs(cur.end) - tsToMs(cur.start)) / 60000 + 5;
    if (duration >= 15 || cur.meter) {
      episodes.push({
        start: cur.start,
        end: cur.end,
        nadir: cur.nadir,
        duration_min: Math.round(duration),
        level: cur.nadir < s.very_low ? 2 : 1,
      });
    }
    cur = null;
  };
  for (const r of readings) {
    if (cur && tsToMs(r.ts) - tsToMs(cur.end) > 30 * 60000) close();
    if (r.mgdl < s.target_low) {
      if (!cur) cur = { start: r.ts, end: r.ts, nadir: r.mgdl, meter: r.source === 'meter' };
      cur.end = r.ts;
      cur.nadir = Math.min(cur.nadir, r.mgdl);
      if (r.source === 'meter') cur.meter = true;
    } else {
      close();
    }
  }
  close();
  return episodes;
}

// Ambulatory Glucose Profile: percentiles of glucose by time of day, all days overlaid.
// 96 buckets of 15 minutes, each smoothed over a ±30 minute window.
export function computeAgp(readings) {
  const buckets = Array.from({ length: 96 }, () => []);
  for (const r of readings) buckets[Math.floor(minutesOfDay(r.ts) / 15)].push(r.mgdl);
  const out = [];
  for (let i = 0; i < 96; i++) {
    const pool = [];
    for (let d = -2; d <= 2; d++) pool.push(...buckets[(i + d + 96) % 96]);
    if (pool.length < 5) {
      out.push({ minute: i * 15, n: pool.length });
      continue;
    }
    pool.sort((a, b) => a - b);
    out.push({
      minute: i * 15,
      n: pool.length,
      p5: percentile(pool, 0.05),
      p25: percentile(pool, 0.25),
      p50: percentile(pool, 0.5),
      p75: percentile(pool, 0.75),
      p95: percentile(pool, 0.95),
    });
  }
  return out;
}

function nearestReading(readings, ms, windowMin) {
  let best = null;
  let bestDiff = Infinity;
  for (const r of readings) {
    const diff = Math.abs(tsToMs(r.ts) - ms);
    if (diff < bestDiff && diff <= windowMin * 60000) {
      best = r;
      bestDiff = diff;
    }
  }
  return best;
}

function readingsBetween(readings, fromMs, toMs) {
  return readings.filter((r) => {
    const t = tsToMs(r.ts);
    return t >= fromMs && t <= toMs;
  });
}

function mealSlot(ts) {
  const h = Number(ts.slice(11, 13));
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 22) return 'dinner';
  return 'late-night snack';
}

// Rise after each logged meal and how the bolus was timed relative to it.
// Carbs eaten to treat a low (a reading below target in the 30 min before) are not meals.
export function analyzeMeals(readings, carbs, insulin, s) {
  const boluses = insulin.filter((d) => d.kind !== 'basal');
  const isLowTreatment = (t) => readingsBetween(readings, t - 30 * 60000, t + 5 * 60000).some((r) => r.mgdl < s.target_low);
  return carbs
    .filter((c) => c.grams >= 10 && !isLowTreatment(tsToMs(c.ts)))
    .map((c) => {
      const t = tsToMs(c.ts);
      const start = nearestReading(readings, t, 15);
      const after = readingsBetween(readings, t + 30 * 60000, t + 180 * 60000);
      const bolus = boluses
        .map((b) => ({ b, diff: (tsToMs(b.ts) - t) / 60000 }))
        .filter((x) => x.diff >= -45 && x.diff <= 90)
        .sort((x, y) => Math.abs(x.diff) - Math.abs(y.diff))[0];
      let peak = null;
      for (const r of after) if (!peak || r.mgdl > peak.mgdl) peak = r;
      return {
        ts: c.ts,
        grams: c.grams,
        slot: mealSlot(c.ts),
        start_mgdl: start?.mgdl ?? null,
        peak_mgdl: peak?.mgdl ?? null,
        peak_after_min: peak ? Math.round((tsToMs(peak.ts) - t) / 60000) : null,
        rise: start && peak ? peak.mgdl - start.mgdl : null,
        bolus_offset_min: bolus ? Math.round(bolus.diff) : null,
        bolus_units: bolus?.b.units ?? null,
      };
    });
}

function buildInsights({ s, stats, lows, meals, readings, events, daysWithData }) {
  const insights = [];
  const u = s.units;
  const minDays = Math.max(2, Math.ceil(daysWithData * 0.2));

  if (!readings.length) return insights;

  // Recurring lows by time of day.
  for (const p of PERIODS) {
    const inPeriod = lows.filter((l) => periodOf(l.start) === p.key);
    const days = new Set(inPeriod.map((l) => dateOf(l.start)));
    if (days.size >= minDays) {
      const hours = {};
      for (const l of inPeriod) hours[Number(l.start.slice(11, 13))] = (hours[Number(l.start.slice(11, 13))] || 0) + 1;
      const topHour = Number(Object.entries(hours).sort((a, b) => b[1] - a[1])[0][0]);
      const nadir = Math.min(...inPeriod.map((l) => l.nadir));
      insights.push({
        severity: 'warning',
        title: `Recurring ${p.label.toLowerCase()} lows on ${days.size} of ${daysWithData} days`,
        detail: `Most often starting around ${fmtHour(topHour)}–${fmtHour((topHour + 1) % 24)}. Lowest reading ${fmtGlucose(nadir, u)}. Worth reviewing with your care team.${p.key === 'overnight' ? ' Overnight lows often trace back to basal insulin or evening boluses.' : ''}`,
      });
    }
  }

  // Recurring highs: ≥ 1 hour above very_high within the period.
  for (const p of PERIODS) {
    const byDay = {};
    for (const r of readings) {
      if (periodOf(r.ts) !== p.key || r.mgdl <= s.very_high) continue;
      byDay[dateOf(r.ts)] = (byDay[dateOf(r.ts)] || 0) + 1;
    }
    const days = Object.values(byDay).filter((n) => n >= 12).length;
    if (days >= Math.max(2, Math.ceil(daysWithData * 0.3))) {
      insights.push({
        severity: 'warning',
        title: `Extended ${p.label.toLowerCase()} highs on ${days} of ${daysWithData} days`,
        detail: `On those days glucose stayed above ${fmtGlucose(s.very_high, u)} for an hour or more during the ${p.label.toLowerCase()} (${fmtHour(p.start)}–${fmtHour(p.end % 24)}).`,
      });
    }
  }

  // Post-meal rises.
  const bySlot = {};
  for (const m of meals) if (m.rise != null) (bySlot[m.slot] ||= []).push(m);
  for (const [slot, list] of Object.entries(bySlot)) {
    if (list.length < 3) continue;
    const rise = median(list.map((m) => m.rise));
    if (rise < 60) continue;
    const peakAfter = median(list.map((m) => m.peak_after_min));
    const offsets = list.map((m) => m.bolus_offset_min).filter((x) => x != null);
    const medOffset = offsets.length ? median(offsets) : null;
    let timing = '';
    if (medOffset != null && medOffset >= 0) {
      timing = ` Insulin for these meals was typically given ${medOffset === 0 ? 'at the same time as' : `${Math.round(medOffset)} min after`} eating; ask your care team whether pre-bolusing would help.`;
    }
    const riseText = u === 'mmol/L' ? `${(rise / MGDL_PER_MMOL).toFixed(1)} mmol/L` : `${Math.round(rise)} mg/dL`;
    insights.push({
      severity: rise >= 90 ? 'warning' : 'info',
      title: `Glucose rises a median ${riseText} after ${slot}`,
      detail: `Based on ${list.length} logged meals, peaking about ${Math.round(peakAfter)} minutes after eating.${timing}`,
    });
  }

  // Meals without a matching bolus.
  const missed = meals.filter((m) => m.grams >= 15 && m.bolus_offset_min == null);
  if (missed.length >= 2) {
    insights.push({
      severity: 'info',
      title: `${missed.length} meals with no bolus logged nearby`,
      detail: 'Carbs of 15 g or more with no bolus recorded from 45 minutes before to 90 minutes after. If you did dose, logging it makes these reports more accurate.',
    });
  }

  // Rebound highs after lows (often from over-treating).
  const rebounds = lows.filter((l) => {
    const endMs = tsToMs(l.end);
    return readingsBetween(readings, endMs, endMs + 3 * 3600000).some((r) => r.mgdl > s.target_high);
  });
  if (rebounds.length >= 3) {
    insights.push({
      severity: 'info',
      title: `${rebounds.length} of ${lows.length} lows were followed by a high within 3 hours`,
      detail: `Rebounds above ${fmtGlucose(s.target_high, u)} after a low can mean the low was over-treated. The "rule of 15" (15 g fast carbs, recheck in 15 minutes) helps some people avoid this.`,
    });
  }

  // Lows after exercise.
  const exercise = events.filter((e) => e.kind === 'exercise');
  if (exercise.length >= 2) {
    const followed = exercise.filter((e) => {
      const start = tsToMs(e.ts);
      return lows.some((l) => tsToMs(l.start) >= start && tsToMs(l.start) <= start + 12 * 3600000);
    });
    if (followed.length >= 2) {
      insights.push({
        severity: 'warning',
        title: `${followed.length} of ${exercise.length} exercise sessions were followed by a low within 12 hours`,
        detail: 'Exercise can increase insulin sensitivity for many hours, including overnight. Bring this up with your care team when you plan workouts.',
      });
    }
  }

  // Overall targets.
  if (stats.cv != null && stats.cv > 36) {
    insights.push({
      severity: 'warning',
      title: `Glucose variability is high (CV ${stats.cv.toFixed(1)}%)`,
      detail: 'The consensus target is a coefficient of variation of 36% or less. High variability is linked to more frequent lows.',
    });
  }
  if (stats.ranges.very_low + stats.ranges.low > 4) {
    insights.push({
      severity: 'warning',
      title: `Time below range is ${(stats.ranges.very_low + stats.ranges.low).toFixed(1)}%`,
      detail: `The target is under 4% below ${fmtGlucose(s.target_low, u)} (about 1 hour a day) and under 1% below ${fmtGlucose(s.very_low, u)}.`,
    });
  }
  if (stats.ranges.in_range >= 70) {
    insights.push({
      severity: 'good',
      title: `Time in range is ${stats.ranges.in_range.toFixed(0)}%, which meets the 70% target`,
      detail: `That is about ${Math.round((stats.ranges.in_range / 100) * 24 * 10) / 10} hours a day between ${fmtGlucose(s.target_low, u)} and ${fmtGlucose(s.target_high, u)}.`,
    });
  }
  if (stats.coverage_pct != null && stats.coverage_pct < 70) {
    insights.push({
      severity: 'info',
      title: `CGM data is ${stats.coverage_pct.toFixed(0)}% complete for this period`,
      detail: 'Reports are most reliable with at least 70% of possible CGM readings across 14 days.',
    });
  }

  const order = { warning: 0, info: 1, good: 2 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function computeSummary({ glucose, insulin, carbs, events }, s, fromDate, toDate) {
  const days = Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
  const cgm = glucose.filter((r) => r.source === 'cgm');
  // Use CGM if present; fall back to fingersticks for people without a sensor.
  const readings = cgm.length ? cgm : glucose;
  const values = readings.map((r) => r.mgdl);
  const m = mean(values);
  const sd = stdev(values);
  const daysWithData = new Set(readings.map((r) => dateOf(r.ts))).size;

  const stats = {
    days,
    days_with_data: daysWithData,
    count: values.length,
    source: cgm.length ? 'cgm' : glucose.length ? 'meter' : null,
    mean: m,
    sd,
    cv: m && sd ? (sd / m) * 100 : null,
    gmi: m ? 3.31 + 0.02392 * m : null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    coverage_pct: cgm.length ? Math.min(100, (cgm.length / (days * CGM_READINGS_PER_DAY)) * 100) : null,
    ranges: rangeBreakdown(values, s),
    meter_checks_per_day: glucose.filter((r) => r.source === 'meter').length / days,
  };

  const lows = findLows([...glucose].sort((a, b) => a.ts.localeCompare(b.ts)), s);
  stats.low_episodes = lows.length;
  stats.low_episodes_level2 = lows.filter((l) => l.level === 2).length;

  // Per-day rollup.
  const daily = [];
  for (let d = fromDate; d < toDate; d = addDays(d, 1)) {
    const dayVals = readings.filter((r) => dateOf(r.ts) === d).map((r) => r.mgdl);
    const dayIns = insulin.filter((x) => dateOf(x.ts) === d);
    const bolus = dayIns.filter((x) => x.kind !== 'basal').reduce((a, x) => a + x.units, 0);
    const basal = dayIns.filter((x) => x.kind === 'basal').reduce((a, x) => a + x.units, 0);
    daily.push({
      date: d,
      count: dayVals.length,
      mean: mean(dayVals),
      in_range_pct: dayVals.length ? rangeBreakdown(dayVals, s).in_range : null,
      lows: lows.filter((l) => dateOf(l.start) === d).length,
      bolus,
      basal,
      carbs: carbs.filter((c) => dateOf(c.ts) === d).reduce((a, c) => a + c.grams, 0),
    });
  }

  const insulinDays = daily.filter((d) => d.bolus + d.basal > 0);
  const carbDays = daily.filter((d) => d.carbs > 0);
  const avgBolus = mean(insulinDays.map((d) => d.bolus));
  const avgBasal = mean(insulinDays.map((d) => d.basal));
  const insulinStats = {
    days_logged: insulinDays.length,
    avg_total: insulinDays.length ? avgBolus + avgBasal : null,
    avg_bolus: avgBolus,
    avg_basal: avgBasal,
    basal_pct: insulinDays.length && avgBolus + avgBasal > 0 ? (avgBasal / (avgBolus + avgBasal)) * 100 : null,
    boluses_per_day: insulinDays.length ? insulin.filter((x) => x.kind !== 'basal').length / insulinDays.length : null,
  };
  const carbStats = {
    days_logged: carbDays.length,
    avg_daily: mean(carbDays.map((d) => d.carbs)),
    entries_per_day: carbDays.length ? carbs.length / carbDays.length : null,
  };

  const periods = PERIODS.map((p) => {
    const vals = readings.filter((r) => periodOf(r.ts) === p.key).map((r) => r.mgdl);
    return { ...p, count: vals.length, mean: mean(vals), ranges: rangeBreakdown(vals, s) };
  });

  const meals = analyzeMeals(readings, carbs, insulin, s);
  const insights = buildInsights({ s, stats, lows, meals, readings, events, daysWithData });

  return {
    from: fromDate,
    to: toDate,
    settings: s,
    stats,
    insulin: insulinStats,
    carbs: carbStats,
    periods,
    daily,
    agp: computeAgp(readings),
    lows,
    insights,
  };
}
