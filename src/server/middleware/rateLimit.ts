import rateLimit from 'express-rate-limit';

// Login, Registrierung, Zugangsanfrage: 20 Versuche pro 15 Minuten und IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Schreibender Allgemein-Limiter: schützt POST/PATCH/DELETE-Routen vor Spam
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 Minute
  max: 60,             // max 60 Schreib-Requests pro Minute pro IP
  message: { error: 'Zu viele Anfragen, bitte kurz warten.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
});
