import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './utils/env';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import submissionRoutes from './routes/submission.routes';
import pollRoutes from './routes/poll.routes';
import publicRoutes from './routes/public.routes';
import analyticsRoutes from './routes/analytics.routes';

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: env.NODE_ENV === 'development' ? '*' : undefined }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Error Handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

export default app;
