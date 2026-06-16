import express from 'express';
import { db } from '../db.js';

const TABLES = {
  conditions: ['name', 'status', 'diagnosed_date', 'notes'],
  medications: ['name', 'dosage', 'frequency', 'prescribing_doctor', 'start_date', 'end_date', 'is_active', 'notes'],
  allergies: ['allergen', 'reaction', 'severity', 'notes'],
  immunizations: ['vaccine', 'date_given', 'provider', 'notes'],
  labs: ['test_name', 'test_date', 'result_value', 'unit', 'reference_range', 'notes'],
  visits: ['visit_date', 'provider', 'reason', 'summary'],
  contacts: ['name', 'relationship', 'role', 'phone', 'email', 'notes'],
  goals: ['goal_type', 'target', 'notes'],
};

export function makeCrudRouter(table) {
  const columns = TABLES[table];
  if (!columns) throw new Error(`Unknown table: ${table}`);
  const router = express.Router();

  router.get('/', (req, res) => {
    const orderCol = columns.includes('test_date')
      ? 'test_date'
      : columns.includes('visit_date')
      ? 'visit_date'
      : 'created_at';
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY ${orderCol} DESC, id DESC`).all();
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    const data = {};
    for (const col of columns) data[col] = req.body[col] ?? null;
    const placeholders = columns.map((c) => `@${c}`).join(', ');
    const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
    const info = stmt.run(data);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = { id: req.params.id };
    const setClauses = [];
    for (const col of columns) {
      data[col] = req.body[col] ?? existing[col];
      setClauses.push(`${col} = @${col}`);
    }
    db.prepare(`UPDATE ${table} SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(data);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    res.json(row);
  });

  router.delete('/:id', (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  return router;
}
