import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';
import { logActivity } from '../lib/activityLog.js';
import { hashPassword } from '../lib/credentials.js';
import { authMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { broadcastUpdate } from '../lib/sse.js';
import { HIDDEN_USER_IDS, PROTECTED_USER_IDS, NOT_HIDDEN_SQL } from '../config.js';
import type { UserRow } from '../types.js';

const router = Router();

// ─── Staff ───────────────────────────────────────────────────────────────────

router.get('/api/staff', authMiddleware, (_req: Request, res: Response) => {
  const db = getDb();
  // Versteckte System-Accounts (z.B. Maintenance-Admin) werden hier rausgefiltert
  const rows = db.prepare(
    `SELECT id, name, role, department, status, avatar_color, avatar_image
     FROM users WHERE status = 'active'${NOT_HIDDEN_SQL} ORDER BY name ASC`
  ).all(...HIDDEN_USER_IDS) as Pick<UserRow, 'id' | 'name' | 'role' | 'department' | 'status' | 'avatar_color' | 'avatar_image'>[];
  res.json(rows.map(r => ({
    ...r,
    avatarColor: r.avatar_color ?? '#008080',
    avatarImage: r.avatar_image ?? null,
    // Inhaber:innen-Accounts: Frontend blendet „Entfernen“ aus (Server lehnt es ohnehin ab)
    isProtected: PROTECTED_USER_IDS.includes(r.id),
  })));
});

router.get('/api/staff/pending', authMiddleware, adminMiddleware, (_req: Request, res: Response) => {
  const db = getDb();
  res.json(db.prepare("SELECT id, name, username, department, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC").all());
});

router.post('/api/staff/:id/approve', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const u = db.prepare("SELECT name FROM users WHERE id = ?").get(req.params.id) as Pick<UserRow, 'name'> | undefined;
  const result = db.prepare("UPDATE users SET status = 'active' WHERE id = ? AND status = 'pending'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Ausstehender User nicht gefunden' });
  if (u) {
    logActivity(null, 'staff_approved', `Mitarbeiter:in freigegeben: ${u.name}`, req.user!.name);
  }
  res.json({ message: 'User freigegeben' });
  broadcastUpdate('staff_changed');
});

router.delete('/api/staff/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  // Geschützte Accounts (Inhaber:innen + versteckte System-Accounts) sind nicht löschbar
  if (PROTECTED_USER_IDS.includes(req.params.id)) {
    return res.status(403).json({ error: 'Dieser Account kann nicht gelöscht werden.' });
  }
  const db = getDb();
  const u = db.prepare("SELECT name, status FROM users WHERE id = ?").get(req.params.id) as Pick<UserRow, 'name' | 'status'> | undefined;
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (u) {
    const eventType = u.status === 'pending' ? 'staff_rejected' : 'staff_deleted';
    const description = u.status === 'pending'
      ? `Mitarbeiteranfrage abgelehnt: ${u.name}`
      : `Mitarbeiter:in entfernt: ${u.name}`;
    logActivity(null, eventType, description, req.user!.name);
  }
  res.json({ message: 'User gelöscht' });
  broadcastUpdate('staff_changed');
});

// Admin setzt für einen Staff-Account ein neues (temporäres) Passwort.
// Admin-Accounts können untereinander NICHT zurückgesetzt werden — wenn ein
// Admin sein Passwort verliert, muss es manuell über den Server-Admin erfolgen.
router.post('/api/staff/:id/reset-password', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Passwort zu lang (max 128 Zeichen)' });
    }
    const db = getDb();
    const target = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(req.params.id) as Pick<UserRow, 'id' | 'name' | 'role'> | undefined;
    if (!target) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    if (target.role === 'Admin') {
      return res.status(403).json({ error: 'Admin-Passwörter können nicht über die App zurückgesetzt werden.' });
    }
    const hash = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, target.id);
    logActivity(null, 'password_reset', `Passwort zurückgesetzt: ${target.name}`, req.user!.name);
    res.json({ message: 'Passwort zurückgesetzt' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Passwort-Reset fehlgeschlagen' });
  }
});

export default router;
