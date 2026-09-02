import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { requireAdminAuth } from './auth.js';
import authRouter from './routes/auth.js';
import employeesRouter from './routes/employees.js';
import surveysRouter from './routes/surveys.js';
import resultsRouter from './routes/results.js';
import surveyTakingRouter from './routes/survey-taking.js';

if (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD) {
  console.error('Missing JWT_SECRET or ADMIN_PASSWORD in environment. Copy .env.example to .env and set them.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4100;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
    credentials: true,
  })
);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);

// Admin-only management endpoints
app.use('/api/admin/employees', requireAdminAuth, employeesRouter);
app.use('/api/admin/surveys', requireAdminAuth, surveysRouter);
app.use('/api/admin/surveys', requireAdminAuth, resultsRouter);

// Employee-facing survey-taking endpoints (auth enforced inside the router)
app.use('/api/survey', surveyTakingRouter);

app.use((err, req, res, next) => {
  if (err?.name === 'MulterError' || err?.message?.includes('CSV')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Ernst engagement survey server listening on port ${PORT}`);
});
