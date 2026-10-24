import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { verifyToken, issuedAtMs, type TokenPayload } from '../lib/credentials.js';
import type { UserRow } from '../types.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Token prüfen UND Account in der DB nachschlagen: Gelöschte oder nicht aktive
// Accounts verlieren sofort den Zugriff, ohne dass Tokens ablaufen müssen.
// Rolle/Name kommen aus der DB, nicht aus dem Token — Rechte-Änderungen
// greifen damit ebenfalls sofort.
export function resolveActiveUser(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const dbUser = getDb().prepare(
    'SELECT id, name, role, department, status, password_changed_at FROM users WHERE id = ?'
  ).get(payload.userId) as Pick<UserRow, 'id' | 'name' | 'role' | 'department' | 'status' | 'password_changed_at'> | undefined;
  if (!dbUser || dbUser.status !== 'active') return null;
  // Nach einer Passwortänderung gelten nur noch Tokens, die danach ausgestellt
  // wurden — so sind andere (z. B. verlorene) Geräte sofort abgemeldet.
  if (dbUser.password_changed_at && issuedAtMs(payload) < Date.parse(dbUser.password_changed_at)) return null;
  return { userId: dbUser.id, name: dbUser.name, role: dbUser.role, department: dbUser.department };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const user = resolveActiveUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = user;
  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
