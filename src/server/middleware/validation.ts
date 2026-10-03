import type { Request, Response, NextFunction } from 'express';

// ─── Längen-Limits für Text-Felder ───────────────────────────────────────────
// Verhindert dass User Megabytes an Text in einzelne Felder schreiben.
const FIELD_LIMITS: Record<string, number> = {
  coupleNames: 120,
  initials: 16,
  location: 200,
  betreuungszeit: 400,
  notes: 4000,
  status: 32,
  text: 4000,        // Notizen, Notes-Body
  description: 1000, // To-Dos
  username: 64,
  password: 128,
  name: 80,
  department: 80,
};

function validateFieldLengths(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  for (const [key, max] of Object.entries(FIELD_LIMITS)) {
    const v = (body as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.length > max) {
      return `Feld „${key}" ist zu lang (max ${max} Zeichen)`;
    }
  }
  return null;
}

// Middleware nur für JSON-Body-Routes (alles unter /api/* mit POST/PATCH/PUT)
export function fieldLengthLimits(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) return next();
  // Profile-Patch hat eigene Validierung (Avatar-Bild darf länger sein)
  if (req.path === '/api/auth/profile') return next();
  const err = validateFieldLengths(req.body);
  if (err) return res.status(400).json({ error: err });
  next();
}
