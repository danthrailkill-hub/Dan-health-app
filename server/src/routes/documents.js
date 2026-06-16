import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 16);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM documents ORDER BY created_at DESC, id DESC').all();
  res.json(rows);
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const { title, category, notes } = req.body;
  const stmt = db.prepare(`
    INSERT INTO documents (title, category, file_name, stored_name, mime_type, size_bytes, notes)
    VALUES (@title, @category, @file_name, @stored_name, @mime_type, @size_bytes, @notes)
  `);
  const info = stmt.run({
    title: title || req.file.originalname,
    category: category || null,
    file_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size_bytes: req.file.size,
    notes: notes || null,
  });
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.get('/:id/file', (req, res) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name)}"`);
  res.sendFile(path.join(uploadsDir, row.stored_name));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  fs.unlink(path.join(uploadsDir, row.stored_name), () => {});
  res.status(204).end();
});

export default router;
