import { db } from '../db.js';
import { defaultTimeZone } from './time.js';

// Glucose is always stored in mg/dL; the UI converts to mmol/L for display if chosen.
// `origin` records where a row came from (manual, dexcom, libre, csv, nightscout, demo)
// so an import can be undone with one delete.
db.exec(`
  CREATE TABLE IF NOT EXISTS glucose_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    mgdl REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'cgm',   -- cgm | meter
    origin TEXT NOT NULL DEFAULT 'manual',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ux_glucose_ts_source ON glucose_readings(ts, source);

  CREATE TABLE IF NOT EXISTS insulin_doses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    units REAL NOT NULL,
    kind TEXT NOT NULL DEFAULT 'bolus',   -- bolus | correction | basal
    insulin TEXT,                         -- e.g. Humalog, Fiasp, Tresiba
    origin TEXT NOT NULL DEFAULT 'manual',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ux_insulin ON insulin_doses(ts, kind, units);

  CREATE TABLE IF NOT EXISTS carb_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    grams REAL NOT NULL,
    description TEXT,
    origin TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ux_carbs ON carb_entries(ts, grams);

  CREATE TABLE IF NOT EXISTS dm_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    kind TEXT NOT NULL,     -- exercise | site_change | sensor_change | illness | stress | alcohol | ketones | note
    duration_min REAL,
    value REAL,             -- e.g. ketone mmol/L, exercise intensity 1-3
    origin TEXT NOT NULL DEFAULT 'manual',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ux_events ON dm_events(ts, kind);

  CREATE TABLE IF NOT EXISTS dm_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    units TEXT DEFAULT 'mg/dL',
    target_low REAL DEFAULT 70,
    target_high REAL DEFAULT 180,
    very_low REAL DEFAULT 54,
    very_high REAL DEFAULT 250,
    timezone TEXT,
    nightscout_url TEXT,
    nightscout_token TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.prepare('INSERT OR IGNORE INTO dm_settings (id, timezone) VALUES (1, ?)').run(defaultTimeZone());

export const SETTINGS_FIELDS = ['units', 'target_low', 'target_high', 'very_low', 'very_high', 'timezone', 'nightscout_url', 'nightscout_token'];

export function getSettings({ includeSecrets = false } = {}) {
  const row = db.prepare('SELECT * FROM dm_settings WHERE id = 1').get();
  if (!includeSecrets) {
    row.has_nightscout_token = !!row.nightscout_token;
    delete row.nightscout_token;
  }
  return row;
}

export function updateSettings(fields) {
  const current = getSettings({ includeSecrets: true });
  const next = { ...current };
  for (const key of SETTINGS_FIELDS) {
    if (fields[key] === undefined) continue;
    // An empty token in the form means "keep the saved one"; send null to clear it.
    if (key === 'nightscout_token' && fields[key] === '') continue;
    next[key] = fields[key];
  }
  for (const key of ['target_low', 'target_high', 'very_low', 'very_high']) {
    const n = Number(next[key]);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${key} must be a positive number (mg/dL)`);
    next[key] = n;
  }
  if (!(next.very_low < next.target_low && next.target_low < next.target_high && next.target_high < next.very_high)) {
    throw new Error('Thresholds must satisfy very low < target low < target high < very high');
  }
  if (!['mg/dL', 'mmol/L'].includes(next.units)) throw new Error('units must be mg/dL or mmol/L');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: next.timezone });
  } catch {
    throw new Error(`Unknown timezone: ${next.timezone}`);
  }
  if (next.nightscout_url && !/^https?:\/\//i.test(next.nightscout_url)) {
    throw new Error('Nightscout URL must start with http:// or https://');
  }
  db.prepare(`
    UPDATE dm_settings SET units=@units, target_low=@target_low, target_high=@target_high,
      very_low=@very_low, very_high=@very_high, timezone=@timezone,
      nightscout_url=@nightscout_url, nightscout_token=@nightscout_token, updated_at=datetime('now')
    WHERE id = 1
  `).run(next);
  return getSettings();
}

const insertStmts = {
  glucose: db.prepare('INSERT OR IGNORE INTO glucose_readings (ts, mgdl, source, origin, note) VALUES (@ts, @mgdl, @source, @origin, @note)'),
  insulin: db.prepare('INSERT OR IGNORE INTO insulin_doses (ts, units, kind, insulin, origin, note) VALUES (@ts, @units, @kind, @insulin, @origin, @note)'),
  carbs: db.prepare('INSERT OR IGNORE INTO carb_entries (ts, grams, description, origin) VALUES (@ts, @grams, @description, @origin)'),
  events: db.prepare('INSERT OR IGNORE INTO dm_events (ts, kind, duration_min, value, origin, note) VALUES (@ts, @kind, @duration_min, @value, @origin, @note)'),
};

const DEFAULTS = {
  glucose: { source: 'cgm', note: null },
  insulin: { kind: 'bolus', insulin: null, note: null },
  carbs: { description: null },
  events: { duration_min: null, value: null, note: null },
};

// Insert a parsed batch ({glucose, insulin, carbs, events}) in one transaction.
// Duplicates (same timestamp etc.) are skipped, so re-importing a file is safe.
export const insertBatch = db.transaction((batch, origin) => {
  const result = {};
  for (const kind of Object.keys(insertStmts)) {
    let added = 0;
    const rows = batch[kind] || [];
    for (const row of rows) {
      const info = insertStmts[kind].run({ ...DEFAULTS[kind], origin, ...row });
      added += info.changes;
    }
    result[kind] = { added, skipped: rows.length - added };
  }
  return result;
});

export const TABLE_FOR = {
  glucose: 'glucose_readings',
  insulin: 'insulin_doses',
  carbs: 'carb_entries',
  events: 'dm_events',
};

export function getEntries(fromTs, toTs) {
  const q = (table) => db.prepare(`SELECT * FROM ${table} WHERE ts >= ? AND ts < ? ORDER BY ts ASC`).all(fromTs, toTs);
  return {
    glucose: q('glucose_readings'),
    insulin: q('insulin_doses'),
    carbs: q('carb_entries'),
    events: q('dm_events'),
  };
}
