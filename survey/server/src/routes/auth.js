import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  issueAdminToken, clearAdminToken, issueEmployeeToken, clearEmployeeToken, requireEmployeeAuth,
} from '../auth.js';
import { getEmployeeById, getOpenSurvey, hasResponded } from '../db.js';

const router = express.Router();

const employeeLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// --- Admin ---

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  issueAdminToken(res);
  res.json({ ok: true });
});

router.post('/admin/logout', (req, res) => {
  clearAdminToken(res);
  res.json({ ok: true });
});

// --- Employee ---

router.post('/employee/login', employeeLoginLimiter, (req, res) => {
  const employeeId = String(req.body.employeeId || '').trim();
  if (!employeeId) return res.status(400).json({ error: 'Employee ID is required' });

  const employee = getEmployeeById(employeeId);
  if (!employee || !employee.active) {
    return res.status(401).json({ error: 'We could not verify that employee ID as an active employee.' });
  }

  const survey = getOpenSurvey();
  if (!survey) {
    return res.status(409).json({ error: 'There is no survey open for responses right now.' });
  }

  issueEmployeeToken(res, employee.employee_id);
  res.json({
    ok: true,
    employee: { firstName: employee.first_name, lastName: employee.last_name },
    alreadyCompleted: hasResponded(survey.id, employee.employee_id),
  });
});

router.post('/employee/logout', (req, res) => {
  clearEmployeeToken(res);
  res.json({ ok: true });
});

router.get('/employee/me', requireEmployeeAuth, (req, res) => {
  const employee = getEmployeeById(req.employeeId);
  if (!employee || !employee.active) return res.status(401).json({ error: 'Session no longer valid' });
  res.json({ employee: { firstName: employee.first_name, lastName: employee.last_name } });
});

export default router;
