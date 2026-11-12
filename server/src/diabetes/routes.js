import express from 'express';
import multer from 'multer';
import { db } from '../db.js';
import { getSettings, updateSettings, insertBatch, getEntries, TABLE_FOR } from './schema.js';
import { computeSummary } from './stats.js';
import { importCsv, IMPORTERS, GENERIC_TEMPLATE } from './importers.js';
import { fetchNightscout } from './nightscout.js';
import { clearEversenseToken } from './eversense.js';
import { runEversenseSync, getEversenseStatus, resetEversenseStatus } from './eversenseSync.js';
import { generateDemo } from './demo.js';
import { addDays, nowWallClock, normalizeTs } from './time.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024 } });

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Resolve ?from=YYYY-MM-DD&to=YYYY-MM-DD (to inclusive) or ?days=N ending today.
function resolveRange(query, settings) {
  const today = nowWallClock(settings.timezone).slice(0, 10);
  if (isDate(query.from) && isDate(query.to)) {
    return { from: query.from, to: addDays(query.to, 1) };
  }
  const days = Math.min(365, Math.max(1, Number(query.days) || 14));
  const to = addDays(today, 1);
  return { from: addDays(to, -days), to };
}

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

router.get('/settings', (req, res) => res.json(getSettings()));
router.put(
  '/settings',
  wrap((req, res) => {
    const credsChanged = ['eversense_region', 'eversense_username', 'eversense_password'].some((k) => req.body[k] !== undefined && req.body[k] !== '');
    const updated = updateSettings(req.body);
    if (credsChanged) {
      clearEversenseToken();
      resetEversenseStatus();
    }
    res.json(updated);
  })
);

router.get('/summary', (req, res) => {
  const s = getSettings();
  const { from, to } = resolveRange(req.query, s);
  const entries = getEntries(`${from}T00:00:00`, `${to}T00:00:00`);
  res.json(computeSummary(entries, s, from, to));
});

router.get('/entries', (req, res) => {
  const s = getSettings();
  const { from, to } = resolveRange(req.query, s);
  res.json({ from, to, ...getEntries(`${from}T00:00:00`, `${to}T00:00:00`) });
});

router.get('/latest', (req, res) => {
  const last = db.prepare('SELECT * FROM glucose_readings ORDER BY ts DESC LIMIT 1').get();
  res.json({ glucose: last || null });
});

// ---- Manual logging ----

function requireTs(body) {
  const ts = normalizeTs(body.ts);
  if (!ts) throw new Error('A valid date and time is required');
  return ts;
}

function range(n, min, max, label) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${label} must be between ${min} and ${max}`);
  return v;
}

const VALIDATORS = {
  glucose: (b) => ({
    ts: requireTs(b),
    mgdl: range(b.mgdl, 20, 600, 'Glucose (mg/dL)'),
    source: b.source === 'cgm' ? 'cgm' : 'meter',
    note: b.note || null,
  }),
  insulin: (b) => ({
    ts: requireTs(b),
    units: range(b.units, 0.05, 150, 'Units'),
    kind: ['bolus', 'correction', 'basal'].includes(b.kind) ? b.kind : 'bolus',
    insulin: b.insulin || null,
    note: b.note || null,
  }),
  carbs: (b) => ({ ts: requireTs(b), grams: range(b.grams, 1, 500, 'Carbs (g)'), description: b.description || null }),
  events: (b) => {
    const kinds = ['exercise', 'site_change', 'sensor_change', 'illness', 'stress', 'alcohol', 'ketones', 'note'];
    if (!kinds.includes(b.kind)) throw new Error('Unknown event type');
    return {
      ts: requireTs(b),
      kind: b.kind,
      duration_min: b.duration_min ? Number(b.duration_min) : null,
      value: b.value !== '' && b.value != null ? Number(b.value) : null,
      note: b.note || null,
    };
  },
};

for (const kind of Object.keys(TABLE_FOR)) {
  router.post(
    `/${kind}`,
    wrap((req, res) => {
      const row = VALIDATORS[kind](req.body);
      const result = insertBatch({ [kind]: [row] }, 'manual');
      if (!result[kind].added) throw new Error('An entry with the same time already exists');
      res.status(201).json(db.prepare(`SELECT * FROM ${TABLE_FOR[kind]} ORDER BY id DESC LIMIT 1`).get());
    })
  );
  router.delete(`/${kind}/:id`, (req, res) => {
    const info = db.prepare(`DELETE FROM ${TABLE_FOR[kind]} WHERE id = ?`).run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });
}

// ---- Import / sync ----

router.get('/import/formats', (req, res) => {
  res.json(Object.entries(IMPORTERS).map(([key, v]) => ({ key, label: v.label })));
});

router.get('/import/template.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="diabetes-import-template.csv"');
  res.send(GENERIC_TEMPLATE);
});

router.post(
  '/import',
  upload.single('file'),
  wrap((req, res) => {
    if (!req.file) throw new Error('Choose a CSV file to import');
    const { format, dateOrder, batch } = importCsv(req.file.buffer.toString('utf8'), req.body);
    const total = Object.values(batch).reduce((a, rows) => a + rows.length, 0);
    if (!total) throw new Error('No readings found in this file. Check the format and date order.');
    const origin = format === 'generic' ? 'csv' : format;
    res.json({ format, dateOrder, result: insertBatch(batch, origin) });
  })
);

router.post(
  '/nightscout/sync',
  wrap(async (req, res) => {
    const s = getSettings({ includeSecrets: true });
    const days = Math.min(90, Math.max(1, Number(req.body.days) || 14));
    const batch = await fetchNightscout({ url: s.nightscout_url, token: s.nightscout_token, days, timeZone: s.timezone });
    res.json({ result: insertBatch(batch, 'nightscout') });
  })
);

router.get('/eversense/status', (req, res) => res.json(getEversenseStatus()));

router.post(
  '/eversense/sync',
  wrap(async (req, res) => {
    const days = req.body.days ? Math.min(30, Math.max(1, Number(req.body.days))) : undefined;
    res.json(await runEversenseSync({ days }));
  })
);

router.post(
  '/demo',
  wrap((req, res) => {
    const s = getSettings();
    const now = nowWallClock(s.timezone);
    res.json({ result: insertBatch(generateDemo(now.slice(0, 10), now, 14), 'demo') });
  })
);

// Delete everything from one origin (e.g. undo an import, or clear demo data).
router.delete('/data', (req, res) => {
  const origin = req.query.origin;
  if (!origin) return res.status(400).json({ error: 'origin is required' });
  const counts = {};
  for (const [kind, table] of Object.entries(TABLE_FOR)) {
    counts[kind] = db.prepare(`DELETE FROM ${table} WHERE origin = ?`).run(origin).changes;
  }
  res.json(counts);
});

router.get('/origins', (req, res) => {
  const rows = db
    .prepare(
      `SELECT origin, COUNT(*) AS n, MIN(ts) AS first, MAX(ts) AS last FROM (
         SELECT origin, ts FROM glucose_readings UNION ALL SELECT origin, ts FROM insulin_doses
         UNION ALL SELECT origin, ts FROM carb_entries UNION ALL SELECT origin, ts FROM dm_events
       ) GROUP BY origin ORDER BY n DESC`
    )
    .all();
  res.json(rows);
});

router.get('/export.csv', (req, res) => {
  const s = getSettings();
  const { from, to } = resolveRange(req.query.from ? req.query : { days: req.query.days || 90 }, s);
  const e = getEntries(`${from}T00:00:00`, `${to}T00:00:00`);
  const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = ['timestamp,glucose_mgdl,glucose_source,insulin_units,insulin_kind,insulin_name,carbs_g,event,note'];
  const rows = [
    ...e.glucose.map((r) => [r.ts, r.mgdl, r.source, '', '', '', '', '', r.note]),
    ...e.insulin.map((r) => [r.ts, '', '', r.units, r.kind, r.insulin, '', '', r.note]),
    ...e.carbs.map((r) => [r.ts, '', '', '', '', '', r.grams, '', r.description]),
    ...e.events.map((r) => [r.ts, '', '', '', '', '', '', r.kind, r.note]),
  ].sort((a, b) => a[0].localeCompare(b[0]));
  for (const r of rows) lines.push(r.map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="diabetes-${from}-to-${addDays(to, -1)}.csv"`);
  res.send(lines.join('\n'));
});

export default router;
