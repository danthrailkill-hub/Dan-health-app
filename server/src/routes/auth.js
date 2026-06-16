import express from 'express';
import crypto from 'crypto';
import { issueToken, clearToken } from '../auth.js';

const router = express.Router();

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || !safeEqual(password, process.env.APP_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  issueToken(res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

export default router;
