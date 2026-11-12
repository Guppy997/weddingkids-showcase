import rateLimit from 'express-rate-limit';
import { AUTH_LIMIT_PER_15_MIN, WRITE_LIMIT_PER_MIN } from '../config.js';

// Login, Registrierung, Zugangsanfrage: 20 Versuche pro 15 Minuten und IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: AUTH_LIMIT_PER_15_MIN,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Schreibender Allgemein-Limiter: schützt POST/PATCH/DELETE-Routen vor Spam
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 Minute
  max: WRITE_LIMIT_PER_MIN, // 60 Schreib-Requests pro Minute und IP
  message: { error: 'Zu viele Anfragen, bitte kurz warten.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
});
