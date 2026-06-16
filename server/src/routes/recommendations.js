import express from 'express';
import { db, getProfile } from '../db.js';
import { generateRecommendations } from '../recommendations.js';

const router = express.Router();

router.get('/', (req, res) => {
  const profile = getProfile();
  const goals = db.prepare('SELECT * FROM goals ORDER BY created_at ASC').all();
  const conditions = db.prepare('SELECT * FROM conditions').all();
  const medications = db.prepare("SELECT * FROM medications WHERE is_active = 1 OR is_active IS NULL").all();
  const allergies = db.prepare('SELECT * FROM allergies').all();

  const result = generateRecommendations({ profile, goals, conditions, medications, allergies });
  res.json(result);
});

export default router;
