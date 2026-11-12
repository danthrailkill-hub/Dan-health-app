// Pull Eversense CGM readings from the Eversense cloud (the "DMS").
//
// Eversense has no public API. This uses the same endpoints as the official Eversense NOW
// follower app, as documented by the open-source Nightscout "Nocturne" connector. It can stop
// working if Eversense changes their service.
//
// How the data flows:
//   sensor → transmitter → Eversense app on your phone → Eversense DMS cloud → this app
//
// The API serves data to *followers*. So you sign in here with an Eversense account that
// follows the sensor wearer in Eversense NOW, not with the wearer's own account. The wearer
// invites that account from the data sharing (Eversense NOW) settings in the Eversense app.

import { epochToWallClock } from './time.js';

// Client id/secret of the official Eversense mobile app (public; shipped inside the app).
const CLIENT_ID = 'eversenseMMAiOS';
const CLIENT_SECRET = 'vYL4yrvM_E"K';

// EVERSENSE_AUTH_URL / EVERSENSE_DATA_URL override the hosts (used by the tests).
const SERVERS = {
  US: { auth: 'https://usiamapi.eversensedms.com', data: 'https://usapialpha.eversensedms.com' },
  OUS: { auth: 'https://ousiamapialpha.eversensedms.com', data: 'https://ousalphaapiservices.eversensedms.com' },
};

function hosts(region) {
  const r = SERVERS[region] || SERVERS.US;
  return {
    auth: process.env.EVERSENSE_AUTH_URL || r.auth,
    data: process.env.EVERSENSE_DATA_URL || r.data,
  };
}

const SENSOR_GLUCOSE_EVENT = 1;
const NO_READING = 65535; // the care API's "no value" marker
const MAX_DAYS = 30;

export class EversenseAuthError extends Error {}

// Cache the access token so syncs every few minutes don't sign in every time.
let tokenCache = null; // { key, token, expiresAt }

async function signIn({ region, username, password }) {
  const cacheKey = `${region}|${username}|${password}`;
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > Date.now() + 5 * 60000) {
    return tokenCache.token;
  }
  const body = new URLSearchParams({
    username,
    password,
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(`${hosts(region).auth}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON error page
  }
  if (!res.ok || !json?.access_token) {
    // Never retry a refused sign-in: Eversense locks the account for 30 minutes after 3 failures.
    if (json?.error_code === 5005) {
      throw new EversenseAuthError('Eversense has locked this account for about 30 minutes after repeated failed sign-ins. Wait, then check the email and password.');
    }
    if (json?.error === 'invalid_grant' || json?.error_code === 6008) {
      const left = String(json?.error_description || '').match(/RemainingAttempt:(\d+)/)?.[1];
      throw new EversenseAuthError(
        `Eversense rejected the email or password${left ? ` (${left} attempts left before a 30 minute lockout)` : ''}. Automatic sync has been paused.`
      );
    }
    throw new Error(`Eversense sign-in failed (HTTP ${res.status}). Check the region setting (US vs outside US).`);
  }
  tokenCache = { key: cacheKey, token: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
  return json.access_token;
}

async function getJson(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (res.status === 401) {
    tokenCache = null;
    throw new Error('Eversense session expired; try again.');
  }
  if (!res.ok) throw new Error(`Eversense returned HTTP ${res.status} for ${new URL(url).pathname}`);
  return res.json();
}

// Eversense dates are GMT with no zone suffix, e.g. "2026-11-12T14:05:00".
function parseGmt(s) {
  if (!s || String(s).startsWith('0001-01-01')) return null;
  const str = String(s).trim();
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(str) ? str : `${str}Z`);
  return Number.isFinite(ms) ? ms : null;
}

const validMgdl = (v) => Number.isFinite(v) && v !== NO_READING && v >= 40 && v <= 400;

// Trend arrows as the Eversense app numbers them.
export const TRENDS = {
  0: null,
  1: 'falling fast',
  2: 'falling',
  3: 'steady',
  4: 'rising',
  5: 'rising fast',
  6: 'falling very fast',
  7: 'rising very fast',
};

const gmtParam = (ms) => new Date(ms).toISOString().slice(0, 19);

/**
 * Fetch CGM readings since `sinceMs` (epoch). Returns { batch, patient, latest }.
 * Glucose comes back in mg/dL; timestamps are converted to wall-clock time in `timeZone`.
 */
export async function fetchEversense({ region, username, password, patientUsername, sinceMs, timeZone }) {
  if (!username || !password) throw new Error('Add your Eversense NOW follower email and password in Diabetes Settings first.');
  const token = await signIn({ region, username, password });
  const { data } = hosts(region);

  const patients = await getJson(`${data}/api/care/GetFollowingPatientList`, token);
  if (!Array.isArray(patients) || !patients.length) {
    throw new Error(
      'Signed in to Eversense, but this account is not following anyone. In the Eversense app, invite this email as a follower (Eversense NOW), accept the invite, then sync again.'
    );
  }
  let patient = patients[0];
  if (patients.length > 1) {
    patient = patients.find((p) => String(p.userName || '').toLowerCase() === String(patientUsername || '').toLowerCase());
    if (!patient) {
      throw new Error(
        `This account follows several people (${patients.map((p) => p.userName).join(', ')}). Set "Person to sync" in Diabetes Settings.`
      );
    }
  }

  const now = Date.now();
  const floor = now - MAX_DAYS * 86400000;
  const start = Math.max(floor, sinceMs);
  const end = now + 5 * 60000; // allow for a transmitter clock slightly ahead
  const seen = new Map();

  // One request per day of history, oldest first, as the NOW app does.
  for (let from = start; from < end; from += 86400000) {
    const to = Math.min(from + 86400000, end);
    const url =
      `${data}/api/care/GetFollowingUserSensorGlucose?UserID=${encodeURIComponent(patient.UserID)}` +
      `&startDate=${encodeURIComponent(gmtParam(from))}&endDate=${encodeURIComponent(gmtParam(to))}`;
    const events = await getJson(url, token);
    for (const e of Array.isArray(events) ? events : []) {
      if (e.EventTypeID !== SENSOR_GLUCOSE_EVENT || !validMgdl(Number(e.Value))) continue;
      const ms = parseGmt(e.EventDate);
      if (ms != null) seen.set(ms, Number(e.Value));
    }
  }

  let latest = null;
  const latestMs = parseGmt(patient.CGTime);
  // CurrentGlucose is mg/dL regardless of the account's display units.
  if (latestMs != null && validMgdl(Number(patient.CurrentGlucose))) {
    seen.set(latestMs, Number(patient.CurrentGlucose));
    latest = {
      ts: epochToWallClock(latestMs, timeZone),
      mgdl: Number(patient.CurrentGlucose),
      trend: TRENDS[patient.GlucoseTrend] ?? null,
      transmitter_connected: patient.IsTransmitterConnected ?? null,
    };
  }

  const glucose = [...seen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ms, mgdl]) => ({ ts: epochToWallClock(ms, timeZone), mgdl, source: 'cgm' }));

  return {
    batch: { glucose },
    patient: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.userName || null,
    latest,
  };
}

export function clearEversenseToken() {
  tokenCache = null;
}
