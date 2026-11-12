// Runs Eversense syncs, manual or every few minutes in the background, and remembers how the
// last one went so the UI can show it.

import { db } from '../db.js';
import { getSettings, insertBatch } from './schema.js';
import { fetchEversense, EversenseAuthError } from './eversense.js';
import { nowWallClock, tsToMs } from './time.js';

const AUTO_SYNC_MINUTES = 5;

const status = {
  running: false,
  last_attempt: null,
  last_success: null,
  ok: null,
  message: null,
  added: null,
  patient: null,
  latest: null,
};

export function getEversenseStatus() {
  return { ...status, auto_sync_minutes: AUTO_SYNC_MINUTES };
}

// Where to start an automatic sync: an hour before the newest Eversense reading we have
// (to fill any gaps), or one day back on the first run.
function incrementalSince(s) {
  const last = db.prepare("SELECT MAX(ts) AS ts FROM glucose_readings WHERE origin = 'eversense'").get()?.ts;
  if (!last) return Date.now() - 86400000;
  const ageMs = tsToMs(nowWallClock(s.timezone)) - tsToMs(last);
  return Date.now() - Math.max(0, ageMs) - 3600000;
}

export async function runEversenseSync({ days } = {}) {
  if (status.running) throw new Error('An Eversense sync is already running.');
  status.running = true;
  status.last_attempt = new Date().toISOString();
  try {
    const s = getSettings({ includeSecrets: true });
    const sinceMs = days ? Date.now() - days * 86400000 : incrementalSince(s);
    const { batch, patient, latest } = await fetchEversense({
      region: s.eversense_region,
      username: s.eversense_username,
      password: s.eversense_password,
      patientUsername: s.eversense_patient,
      sinceMs,
      timeZone: s.timezone,
    });
    const result = insertBatch(batch, 'eversense');
    Object.assign(status, {
      ok: true,
      last_success: new Date().toISOString(),
      message: null,
      added: result.glucose.added,
      patient,
      latest,
    });
    return { result, patient, latest };
  } catch (err) {
    status.ok = false;
    status.message = err.message;
    // A wrong password retried every 5 minutes would get the account locked; stop until fixed.
    if (err instanceof EversenseAuthError) db.prepare('UPDATE dm_settings SET eversense_auto_sync = 0 WHERE id = 1').run();
    throw err;
  } finally {
    status.running = false;
  }
}

export function resetEversenseStatus() {
  Object.assign(status, { ok: null, message: null, added: null, patient: null, latest: null });
}

export function startEversenseScheduler() {
  const tick = async () => {
    const s = getSettings();
    if (!s.eversense_auto_sync || !s.eversense_username || !s.has_eversense_password || status.running) return;
    try {
      await runEversenseSync();
    } catch (err) {
      console.warn(`[eversense] auto-sync failed: ${err.message}`);
    }
  };
  setTimeout(tick, 10000);
  return setInterval(tick, AUTO_SYNC_MINUTES * 60000);
}
