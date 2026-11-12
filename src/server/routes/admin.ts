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
// die echten Admins nicht im Verlauf erscheinen. Gefiltert wird über die
// Account-ID (actor_id), nicht über den Namen: Sonst verschwände aus dem
// Verlauf, wer sich wie ein versteckter Account nennt.
//
// Ausnahme Altbestand: Einträge aus der Zeit vor actor_id, die sich keinem
// Account eindeutig zuordnen ließen, haben keine ID. Für sie (und nur für sie)
// gilt weiter der alte Namensfilter, damit durch das Update nichts sichtbar
// wird, was vorher verborgen war. Neue Einträge haben immer eine ID oder
// stammen vom Server („System“).
function hiddenActorFilter(column: string, nameColumn: string): { sql: string; params: string[] } {
  if (HIDDEN_USER_IDS.length === 0) return { sql: '1 = 1', params: [] };
  const ids = HIDDEN_USER_IDS.map(() => '?').join(',');
  const hiddenNames = (getDb().prepare(`SELECT name FROM users WHERE id IN (${ids})`)
    .all(...HIDDEN_USER_IDS) as { name: string }[]).map(r => r.name);
  const names = hiddenNames.map(() => '?').join(',');
  const legacy = hiddenNames.length ? `${nameColumn} NOT IN (${names})` : '1 = 1';
  return {
    sql: `((${column} IS NULL AND ${legacy}) OR (${column} IS NOT NULL AND ${column} NOT IN (${ids})))`,
    params: [...hiddenNames, ...HIDDEN_USER_IDS],
  };
}

router.get('/api/weddings/:id/activity', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const visible = hiddenActorFilter('actor_id', 'actor_name');
  const rows = getDb().prepare(
    `SELECT * FROM activity_log WHERE wedding_id = ? AND ${visible.sql} ORDER BY created_at DESC LIMIT 50`
  ).all(req.params.id, ...visible.params) as ActivityRow[];
  res.json(rows.map(r => ({ id: r.id, weddingId: r.wedding_id, eventType: r.event_type, description: r.description, actorName: r.actor_name, createdAt: toISO(r.created_at) })));
});

router.get('/api/admin/activity', authMiddleware, adminMiddleware, (_req: Request, res: Response) => {
  const visible = hiddenActorFilter('a.actor_id', 'a.actor_name');
  const rows = getDb().prepare(`
    SELECT a.*, w.couple_names
    FROM activity_log a
    LEFT JOIN weddings w ON w.id = a.wedding_id
    WHERE ${visible.sql}
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all(...visible.params) as (ActivityRow & { couple_names: string | null })[];
  res.json(rows.map(r => ({
    id: r.id, weddingId: r.wedding_id, weddingName: r.couple_names,
    eventType: r.event_type, description: r.description,
    actorName: r.actor_name, createdAt: toISO(r.created_at),
  })));
});

export default router;
