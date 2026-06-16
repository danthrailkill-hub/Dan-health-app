import express from 'express';
import { getProfile, upsertProfile } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getProfile() || {});
});

router.put('/', (req, res) => {
  const profile = upsertProfile(req.body);
  res.json(profile);
});

export default router;
