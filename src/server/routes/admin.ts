import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { toISO } from '../lib/dates.js';
import { HIDDEN_USER_IDS } from '../config.js';
import type { ActivityRow, CountRow } from '../types.js';

const router = Router();

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/api/admin/dashboard', authMiddleware, adminMiddleware, (_req: Request, res: Response) => {
  const db = getDb();
  const totalActive = (db.prepare("SELECT COUNT(*) as c FROM weddings WHERE status != 'Abgesagt'").get() as CountRow).c;
  const weddingsThisMonth = (db.prepare("SELECT COUNT(*) as c FROM weddings WHERE status != 'Abgesagt' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get() as CountRow).c;
  const weddingsWithoutStaff = (db.prepare("SELECT COUNT(*) as c FROM weddings w WHERE w.status != 'Abgesagt' AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.wedding_id = w.id AND a.assigned = 1)").get() as CountRow).c;
  const pendingAccessRequests = (db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'pending'").get() as CountRow).c;
  res.json({ totalActive, weddingsThisMonth, weddingsWithoutStaff, pendingAccessRequests });
});


// ─── Activity Log ─────────────────────────────────────────────────────────────

// Aktivitätsprotokoll: Versteckte System-Accounts (admin/test) sollen für
// die echten Admins nicht im Verlauf erscheinen. Wir filtern per actor_name
// — die Namen der versteckten User holen wir aus der users-Tabelle.
function getHiddenActorNames(): string[] {
  if (HIDDEN_USER_IDS.length === 0) return [];
  const placeholders = HIDDEN_USER_IDS.map(() => '?').join(',');
  return (getDb().prepare(`SELECT name FROM users WHERE id IN (${placeholders})`)
    .all(...HIDDEN_USER_IDS) as { name: string }[]).map(r => r.name);
}

router.get('/api/weddings/:id/activity', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const hiddenNames = getHiddenActorNames();
  const namePlaceholders = hiddenNames.length ? hiddenNames.map(() => '?').join(',') : '';
  const excludeSql = namePlaceholders ? ` AND actor_name NOT IN (${namePlaceholders})` : '';
  const rows = getDb().prepare(
    `SELECT * FROM activity_log WHERE wedding_id = ?${excludeSql} ORDER BY created_at DESC LIMIT 50`
  ).all(req.params.id, ...hiddenNames) as ActivityRow[];
  res.json(rows.map(r => ({ id: r.id, weddingId: r.wedding_id, eventType: r.event_type, description: r.description, actorName: r.actor_name, createdAt: toISO(r.created_at) })));
});

router.get('/api/admin/activity', authMiddleware, adminMiddleware, (_req: Request, res: Response) => {
  const db = getDb();
  const hiddenNames = getHiddenActorNames();
  const namePlaceholders = hiddenNames.length ? hiddenNames.map(() => '?').join(',') : '';
  const excludeSql = namePlaceholders ? ` WHERE a.actor_name NOT IN (${namePlaceholders})` : '';
  const rows = db.prepare(`
    SELECT a.*, w.couple_names
    FROM activity_log a
    LEFT JOIN weddings w ON w.id = a.wedding_id
    ${excludeSql}
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all(...hiddenNames) as (ActivityRow & { couple_names: string | null })[];
  res.json(rows.map(r => ({
    id: r.id, weddingId: r.wedding_id, weddingName: r.couple_names,
    eventType: r.event_type, description: r.description,
    actorName: r.actor_name, createdAt: toISO(r.created_at),
  })));
});

export default router;
