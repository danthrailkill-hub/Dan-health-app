// Pull CGM readings and treatments from a Nightscout site (https://nightscout.github.io).
// Nightscout can be fed by Dexcom Share, Libre (via xDrip+/Juggluco), Omnipod 5 / Loop,
// AndroidAPS, Tandem and more, so it is the most universal way to get live data in.

import crypto from 'crypto';
import { epochToWallClock } from './time.js';

const BOLUS_TYPES = /bolus|correction|snack|meal/i;

function buildUrl(base, path, params, token) {
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (token) url.searchParams.set('token', token);
  return url;
}

async function getJson(url, token) {
  const headers = { Accept: 'application/json' };
  // Older sites authenticate with the SHA-1 of API_SECRET instead of an access token.
  if (token) headers['api-secret'] = crypto.createHash('sha1').update(token).digest('hex');
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Nightscout returned ${res.status} for ${url.pathname}`);
  return res.json();
}

export async function fetchNightscout({ url, token, days, timeZone }) {
  if (!url) throw new Error('Set your Nightscout URL in Diabetes Settings first.');
  const sinceMs = Date.now() - days * 86400000;
  const out = { glucose: [], insulin: [], carbs: [], events: [] };

  const entries = await getJson(
    buildUrl(url, 'api/v1/entries.json', { 'find[date][$gte]': String(sinceMs), count: String(days * 300) }, token),
    token
  );
  for (const e of entries) {
    const ts = epochToWallClock(e.date, timeZone);
    if (e.type === 'sgv' && Number.isFinite(e.sgv)) out.glucose.push({ ts, mgdl: e.sgv, source: 'cgm' });
    if (e.type === 'mbg' && Number.isFinite(e.mbg)) out.glucose.push({ ts, mgdl: e.mbg, source: 'meter' });
  }

  const treatments = await getJson(
    buildUrl(url, 'api/v1/treatments.json', { 'find[created_at][$gte]': new Date(sinceMs).toISOString(), count: '20000' }, token),
    token
  );
  for (const t of treatments) {
    const ms = Date.parse(t.created_at);
    if (!Number.isFinite(ms)) continue;
    const ts = epochToWallClock(ms, timeZone);
    const type = t.eventType || '';
    if (Number(t.insulin) > 0) {
      const kind = /correction/i.test(type) ? 'correction' : BOLUS_TYPES.test(type) || !type ? 'bolus' : /basal/i.test(type) ? 'basal' : 'bolus';
      out.insulin.push({ ts, units: Number(t.insulin), kind, insulin: t.insulinType || null, note: t.notes || null });
    }
    if (Number(t.carbs) > 0) out.carbs.push({ ts, grams: Number(t.carbs), description: t.notes || t.foodType || null });
    if (Number.isFinite(Number(t.glucose)) && t.glucoseType === 'Finger') {
      const mgdl = t.units === 'mmol' ? Math.round(Number(t.glucose) * 18.016) : Number(t.glucose);
      out.glucose.push({ ts, mgdl, source: 'meter' });
    }
    const eventKind = /site change/i.test(type)
      ? 'site_change'
      : /sensor (start|change)/i.test(type)
      ? 'sensor_change'
      : /exercise/i.test(type)
      ? 'exercise'
      : null;
    if (eventKind) out.events.push({ ts, kind: eventKind, duration_min: Number(t.duration) || null, note: t.notes || null });
  }
  return out;
}
