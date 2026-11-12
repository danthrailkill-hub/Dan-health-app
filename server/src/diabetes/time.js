// Timestamp helpers.
//
// All diabetes timestamps are stored as *local wall-clock* strings in the form
// "YYYY-MM-DDTHH:MM:SS" with no timezone offset. That is how CGM exports
// (Dexcom Clarity, LibreView) present them, and it is what matters for
// time-of-day analysis ("lows around 3am"). Arithmetic on them is done by
// treating the wall-clock value as if it were UTC, which keeps differences
// correct and avoids the server's own timezone leaking in.

export function tsToMs(ts) {
  return Date.parse(`${ts}Z`);
}

export function msToTs(ms) {
  return new Date(ms).toISOString().slice(0, 19);
}

export function minutesOfDay(ts) {
  return Number(ts.slice(11, 13)) * 60 + Number(ts.slice(14, 16));
}

export function dateOf(ts) {
  return ts.slice(0, 10);
}

export function addDays(dateStr, n) {
  return msToTs(Date.parse(`${dateStr}T00:00:00Z`) + n * 86400000).slice(0, 10);
}

const pad = (n) => String(n).padStart(2, '0');

// Convert an absolute instant (epoch ms) to the wall-clock string in `timeZone`.
export function epochToWallClock(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

export function nowWallClock(timeZone) {
  return epochToWallClock(Date.now(), timeZone);
}

export function defaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

// Parse the many timestamp shapes seen in device exports into wall-clock form.
// dateOrder: 'MDY' or 'DMY' for ambiguous "01-02-2024" style dates.
export function normalizeTs(input, dateOrder = 'MDY') {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;

  // ISO-ish: 2024-01-31T08:05:00, 2024-01-31 08:05, optionally with seconds/ms/zone.
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${mi}:${pad(se || 0)}`;
  }

  // 01-31-2024 08:05, 31/01/2024 8:05 PM, etc.
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
  if (m) {
    let [, a, b, y, h, mi, se, ampm] = m;
    let mo = a;
    let d = b;
    if (dateOrder === 'DMY') [mo, d] = [b, a];
    let hour = Number(h);
    if (ampm) {
      const pm = ampm.toLowerCase() === 'pm';
      if (pm && hour < 12) hour += 12;
      if (!pm && hour === 12) hour = 0;
    }
    return `${y}-${pad(mo)}-${pad(d)}T${pad(hour)}:${mi}:${pad(se || 0)}`;
  }

  return null;
}
