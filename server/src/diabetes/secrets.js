// Encrypts saved third-party credentials (Eversense password, Nightscout token) at rest,
// using a key derived from JWT_SECRET. A copy of health.db on its own is then not enough
// to read them; you would also need server/.env.
//
// Changing JWT_SECRET makes saved credentials unreadable; re-enter them in Diabetes Settings.

import crypto from 'crypto';

const PREFIX = 'enc:v1:';

function key() {
  return crypto.createHash('sha256').update(`dm-secrets:${process.env.JWT_SECRET || ''}`).digest();
}

export function encryptSecret(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

export function decryptSecret(stored) {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // saved before encryption was added
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
