import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import documentsRouter from './routes/documents.js';
import { makeCrudRouter } from './routes/crud.js';
import { requireAuth } from './auth.js';

if (!process.env.JWT_SECRET || !process.env.APP_PASSWORD) {
  console.error('Missing JWT_SECRET or APP_PASSWORD in environment. Copy .env.example to .env and set them.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/documents', requireAuth, documentsRouter);
for (const table of ['conditions', 'medications', 'allergies', 'immunizations', 'labs', 'visits', 'contacts']) {
  app.use(`/api/${table}`, requireAuth, makeCrudRouter(table));
}

app.listen(PORT, () => {
  console.log(`Health app server listening on port ${PORT}`);
});
