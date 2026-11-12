import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { CLIENT_ORIGIN } from './config.js';
import { fieldLengthLimits } from './middleware/validation.js';
import { writeLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import weddingRoutes from './routes/weddings.js';
import noteRoutes from './routes/notes.js';
import pollRoutes from './routes/polls.js';
import eventRoutes from './routes/events.js';
import todoRoutes from './routes/todos.js';
import adminRoutes from './routes/admin.js';
import streamRoutes from './routes/stream.js';
import pushRoutes from './routes/push.js';

/** Baut die Express-App: Sicherheits-Middleware zuerst, dann alle API-Routen. */
export function createApp() {
  const app = express();

  // Hinter nginx-Reverse-Proxy: echte Client-IP aus X-Forwarded-For nehmen (für rate-limit)
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(fieldLengthLimits);
  app.use('/api/', writeLimiter);

  app.use(authRoutes);
  app.use(staffRoutes);
  app.use(weddingRoutes);
  app.use(noteRoutes);
  app.use(pollRoutes);
  app.use(eventRoutes);
  app.use(todoRoutes);
  app.use(adminRoutes);
  app.use(streamRoutes);
  app.use(pushRoutes);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Zentrale Fehlerbehandlung: immer JSON, nie die HTML-Fehlerseite von Express.
  // Die enthält außerhalb von NODE_ENV=production den Stacktrace samt Serverpfaden.
  // Der vierte Parameter ist Pflicht, sonst erkennt Express die Middleware nicht.
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('Unhandled error:', err);
    if (res.headersSent) return;
    const message = status === 413 ? 'Anfrage zu groß' : status === 500 ? 'Interner Serverfehler' : 'Ungültige Anfrage';
    res.status(status).json({ error: message });
  };
  app.use(onError);

  return app;
}
