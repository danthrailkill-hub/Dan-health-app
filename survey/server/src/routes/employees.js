import express from 'express';
import multer from 'multer';
import { replaceEmployees, upsertEmployees, listEmployees, countEmployees, countActiveEmployees } from '../db.js';
import { parseEmployeesCsv, EMPLOYEE_TEMPLATE_HEADERS, toCsv } from '../lib/csv.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ employees: listEmployees(), total: countEmployees(), active: countActiveEmployees() });
});

router.get('/template.csv', (req, res) => {
  const csv = toCsv(EMPLOYEE_TEMPLATE_HEADERS, []);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="employee_roster_template.csv"');
  res.send(csv);
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const mode = req.body.mode === 'merge' ? 'merge' : 'replace';
  const { rows, errors } = parseEmployeesCsv(req.file.buffer);

  if (rows.length === 0) {
    return res.status(400).json({ error: 'No valid employee rows found', details: errors });
  }

  if (mode === 'replace') {
    replaceEmployees(rows);
  } else {
    upsertEmployees(rows);
  }

  res.json({
    ok: true,
    mode,
    imported: rows.length,
    warnings: errors,
    total: countEmployees(),
    active: countActiveEmployees(),
  });
});

export default router;
