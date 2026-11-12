// Eversense connector tests against a local fake of the Eversense cloud API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fetchEversense, EversenseAuthError, clearEversenseToken } from '../src/diabetes/eversense.js';
import { encryptSecret, decryptSecret } from '../src/diabetes/secrets.js';

let server;
let mode = 'ok';
const calls = [];

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    calls.push(url.pathname + url.search);
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/connect/token') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const form = new URLSearchParams(body);
        if (mode === 'locked') {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'invalid_grant', error_code: 5005 }));
        }
        if (form.get('password') !== 'right' || form.get('grant_type') !== 'password') {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'invalid_grant', error_code: 6008, error_description: 'invalid credentials.RemainingAttempt:2' }));
        }
        res.end(JSON.stringify({ access_token: 'tok', expires_in: 3600, token_type: 'Bearer' }));
      });
      return;
    }
    if (req.headers.authorization !== 'Bearer tok') {
      res.statusCode = 401;
      return res.end('{}');
    }
    if (url.pathname === '/api/care/GetFollowingPatientList') {
      if (mode === 'nobody') return res.end('[]');
      return res.end(
        JSON.stringify([
          { UserID: 42, userName: 'wearer@example.com', firstName: 'Pat', lastName: 'Example', CurrentGlucose: 131, GlucoseTrend: 4, CGTime: '2026-07-01T12:10:00', IsTransmitterConnected: true },
        ])
      );
    }
    if (url.pathname === '/api/care/GetFollowingUserSensorGlucose') {
      assert.equal(url.searchParams.get('UserID'), '42');
      assert.match(url.searchParams.get('startDate'), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      return res.end(
        JSON.stringify([
          { EventTypeID: 1, EventSubTypeID: 0, Value: 120, EventDate: '2026-07-01T12:00:00' },
          { EventTypeID: 1, EventSubTypeID: 0, Value: 125, EventDate: '2026-07-01T12:05:00' },
          { EventTypeID: 1, EventSubTypeID: 0, Value: 65535, EventDate: '2026-07-01T11:55:00' }, // no reading
          { EventTypeID: 2, EventSubTypeID: 0, Value: 118, EventDate: '2026-07-01T11:50:00' }, // not sensor glucose
        ])
      );
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.EVERSENSE_AUTH_URL = base;
  process.env.EVERSENSE_DATA_URL = base;
});

after(() => server.close());

const opts = (extra = {}) => ({
  region: 'US',
  username: 'follower@example.com',
  password: 'right',
  sinceMs: Date.now() - 2 * 86400000,
  timeZone: 'America/Chicago',
  ...extra,
});

test('syncs history and the latest reading, converting GMT to local time', async () => {
  mode = 'ok';
  clearEversenseToken();
  const { batch, patient, latest } = await fetchEversense(opts());
  assert.equal(patient, 'Pat Example');
  // 12:00 GMT in July is 07:00 in Chicago (CDT).
  assert.deepEqual(
    batch.glucose.map((g) => [g.ts, g.mgdl]),
    [
      ['2026-07-01T07:00:00', 120],
      ['2026-07-01T07:05:00', 125],
      ['2026-07-01T07:10:00', 131],
    ]
  );
  assert.equal(latest.trend, 'rising');
  // 2 days back + 5 minutes ahead = 3 one-day windows.
  assert.equal(calls.filter((c) => c.startsWith('/api/care/GetFollowingUserSensorGlucose')).length, 3);
});

test('wrong password gives a clear error and is not retried', async () => {
  mode = 'ok';
  clearEversenseToken();
  calls.length = 0;
  await assert.rejects(fetchEversense(opts({ password: 'wrong' })), (err) => err instanceof EversenseAuthError && /2 attempts left/.test(err.message));
  assert.equal(calls.filter((c) => c === '/connect/token').length, 1);
});

test('locked account is reported', async () => {
  mode = 'locked';
  clearEversenseToken();
  await assert.rejects(fetchEversense(opts()), /locked/);
});

test('account that follows nobody explains how to set up Eversense NOW', async () => {
  mode = 'nobody';
  clearEversenseToken();
  await assert.rejects(fetchEversense(opts()), /not following anyone/);
});

test('missing credentials', async () => {
  await assert.rejects(fetchEversense(opts({ password: '' })), /Diabetes Settings/);
});

test('saved secrets are encrypted and decrypt back', () => {
  process.env.JWT_SECRET = 'test-secret';
  const enc = encryptSecret('hunter2');
  assert.match(enc, /^enc:v1:/);
  assert.notEqual(enc, encryptSecret('hunter2')); // random IV
  assert.equal(decryptSecret(enc), 'hunter2');
  assert.equal(decryptSecret('plain-old-token'), 'plain-old-token');
  assert.equal(encryptSecret(''), null);
});
