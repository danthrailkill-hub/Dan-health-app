import jwt from 'jsonwebtoken';

const ADMIN_COOKIE = 'ess_admin_session';
const EMPLOYEE_COOKIE = 'ess_employee_session';

// --- Admin session (single shared admin password, like the health app) ---

export function issueAdminToken(res) {
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  });
}

export function clearAdminToken(res) {
  res.clearCookie(ADMIN_COOKIE);
}

export function requireAdminAuth(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('wrong role');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// --- Employee session (identified only by employee ID, short-lived) ---

export function issueEmployeeToken(res, employeeId) {
  const token = jwt.sign({ role: 'employee', employeeId }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.cookie(EMPLOYEE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 60 * 60 * 1000,
  });
}

export function clearEmployeeToken(res) {
  res.clearCookie(EMPLOYEE_COOKIE);
}

export function requireEmployeeAuth(req, res, next) {
  const token = req.cookies?.[EMPLOYEE_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'employee' || !payload.employeeId) throw new Error('wrong role');
    req.employeeId = payload.employeeId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
