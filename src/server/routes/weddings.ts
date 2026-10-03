import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database.js';
import { logActivity } from '../lib/activityLog.js';
import { sendPushToUsers } from '../lib/push.js';
import { notifyWeddingUpdate } from '../lib/weddingNotifications.js';
import { authMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { broadcastUpdate } from '../lib/sse.js';
import { toISO } from '../lib/dates.js';
import { HIDDEN_USER_IDS } from '../config.js';
import type { UserRow, WeddingRow, AssignmentRow } from '../types.js';

const router = Router();

/** Eine Abstimmung, wie sie vom Client im PATCH-Body kommt (ungeprüfte Eingabe). */
interface IncomingVote {
  staffId?: string;
  status?: string;
  comment?: unknown;
}

// ─── Weddings ────────────────────────────────────────────────────────────────

function getWeddingsWithAssignments() {
  const db = getDb();
  const weddings = db.prepare('SELECT * FROM weddings ORDER BY date ASC').all() as WeddingRow[];
  const allAssignments = db.prepare('SELECT * FROM assignments').all() as AssignmentRow[];
  // Versteckte Accounts (admin/test) tauchen weder als Stimmen noch in den
  // assignedStaffIds auf — sie sind unsichtbar für die ganze App.
  const hidden = new Set(HIDDEN_USER_IDS);
  return weddings.map(w => ({
    id: w.id,
    coupleNames: w.couple_names,
    initials: w.initials,
    date: w.date,
    betreuungszeit: w.betreuungszeit ?? undefined,
    location: w.location,
    status: w.status,
    previousStatus: w.previous_status ?? undefined,
    childrenCount: w.children_count,
    staffNeeded: w.staff_needed ?? 0,
    notes: w.notes,
    assignments: allAssignments.filter(a => a.wedding_id === w.id && !hidden.has(a.staff_id)).map(a => ({ staffId: a.staff_id, status: a.status, comment: a.comment ?? undefined })),
    assignedStaffIds: allAssignments.filter(a => a.wedding_id === w.id && a.assigned === 1 && !hidden.has(a.staff_id)).map(a => a.staff_id),
    createdAt: toISO(w.created_at),
    updatedAt: toISO(w.updated_at),
  }));
}

router.get('/api/weddings', authMiddleware, (_req: Request, res: Response) => {
  res.json(getWeddingsWithAssignments());
});

router.post('/api/weddings', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const { coupleNames, initials, date, betreuungszeit, location, status, childrenCount, staffNeeded, notes } = req.body;
    if (!coupleNames || !date || !location || !status) return res.status(400).json({ error: 'Required fields missing' });
    const db = getDb();
    const id = `w-${randomUUID()}`;
    const autoInitials = initials ?? coupleNames.split(' & ').map((n: string) => n[0]).join('&');
    db.prepare('INSERT INTO weddings (id, couple_names, initials, date, betreuungszeit, location, status, children_count, staff_needed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, coupleNames, autoInitials, date, betreuungszeit ?? null, location, status, childrenCount ?? 0, staffNeeded ?? 0, notes ?? '');
    // Activity Log: neue Hochzeit angelegt
    logActivity(id, 'wedding_created', `Neue Hochzeit angelegt (${status})`, (req as AuthRequest).user!.name);
    const [wedding] = getWeddingsWithAssignments().filter(w => w.id === id);
    res.status(201).json(wedding);
    broadcastUpdate('weddings_changed');

    // Push-Notification an alle aktiven Nutzer:innen (Staff + andere Admins),
    // außer dem auslösenden Admin selbst. So sieht die eine Admin sofort, wenn
    // die andere eine neue Hochzeit anlegt – und umgekehrt. Gilt für alle Jahre.
    try {
      const recipients = db.prepare(
        "SELECT id FROM users WHERE status = 'active' AND id != ?"
      ).all((req as AuthRequest).user!.userId) as { id: string }[];
      const dateStr = new Date(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
      sendPushToUsers(recipients.map(r => r.id), {
        title: 'Neue Hochzeit',
        body: `${coupleNames} – ${dateStr} in ${location}`,
        url: '/',
        tag: `wedding-${id}`,
      }).catch(err => console.error('Push send failed:', err));
    } catch (err) {
      console.error('Push trigger error:', err);
    }
  } catch (error) {
    console.error('Create wedding error:', error);
    res.status(500).json({ error: 'Failed to create wedding' });
  }
});

router.patch('/api/weddings/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    // Mitarbeitende dürfen nur ihre eigene Antwort (assignments) senden —
    // Hochzeitsdaten, Status und Einteilung sind Admin-Sache.
    if (req.user?.role !== 'Admin' && Object.keys(req.body || {}).some(k => k !== 'assignments')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT * FROM weddings WHERE id = ?').get(req.params.id) as WeddingRow | undefined;
    if (!existing) return res.status(404).json({ error: 'Wedding not found' });

    // Status VOR der Änderung merken (für Push-Trigger weiter unten)
    const prevAssignedSnapshot = (db.prepare(
      'SELECT staff_id FROM assignments WHERE wedding_id = ? AND assigned = 1'
    ).all(req.params.id) as Pick<AssignmentRow, 'staff_id'>[]).map(r => r.staff_id);

    const colMap: Record<string, string> = {
      coupleNames: 'couple_names', initials: 'initials', date: 'date',
      betreuungszeit: 'betreuungszeit', location: 'location', status: 'status',
      childrenCount: 'children_count', staffNeeded: 'staff_needed', notes: 'notes',
    };

    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [jsKey, dbCol] of Object.entries(colMap)) {
      if (req.body[jsKey] !== undefined) { fields.push(`${dbCol} = ?`); values.push(req.body[jsKey]); }
    }
    if (req.body.status && req.body.status !== existing.status) {
      fields.push('previous_status = ?'); values.push(existing.status);
    }
    if (fields.length) {
      fields.push("updated_at = datetime('now')");
      values.push(req.params.id);
      db.prepare(`UPDATE weddings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    // Log status change
    if (req.body.status && req.body.status !== existing.status) {
      logActivity(req.params.id, 'status_change', `Status: ${existing.status} → ${req.body.status}`, req.user!.name);
    }

    // Log andere Feld-Änderungen (Datum, Ort, Personalbedarf etc.) – aber nicht Status/Assignments,
    // die haben eigene Log-Einträge
    const fieldLabels: Record<string, { label: string; col: keyof WeddingRow }> = {
      coupleNames: { label: 'Paar', col: 'couple_names' },
      date: { label: 'Datum', col: 'date' },
      betreuungszeit: { label: 'Betreuungszeit', col: 'betreuungszeit' },
      location: { label: 'Ort', col: 'location' },
      childrenCount: { label: 'Kinderanzahl', col: 'children_count' },
      staffNeeded: { label: 'Personalbedarf', col: 'staff_needed' },
      notes: { label: 'Notizen', col: 'notes' },
    };
    const changedLabels = Object.entries(fieldLabels)
      .filter(([key, { col }]) => req.body[key] !== undefined && String(req.body[key] ?? '') !== String(existing[col] ?? ''))
      .map(([, { label }]) => label);
    if (changedLabels.length > 0) {
      logActivity(req.params.id, 'wedding_edited', `Geändert: ${changedLabels.join(', ')}`, req.user!.name);
    }

    if (Array.isArray(req.body.assignments)) {
      // Sicherheit: Nicht-Admins dürfen nur ihre EIGENE Antwort upserten
      const isAdminUser = req.user?.role === 'Admin';
      const ownId = req.user?.userId;
      const filtered = isAdminUser
        ? req.body.assignments
        : req.body.assignments.filter((a: IncomingVote) => a.staffId === ownId);
      // Fest eingeteilte Personen sind gesperrt — Vote bleibt 'Ja' bis Admin die
      // Einteilung zurücknimmt. Wir filtern Vote-Versuche für aktuell zugeteilte
      // Personen heraus (sowohl für Staff selbst als auch für Admins).
      const currentlyAssignedIds = new Set(
        (db.prepare('SELECT staff_id FROM assignments WHERE wedding_id = ? AND assigned = 1')
          .all(req.params.id) as Pick<AssignmentRow, 'staff_id'>[]).map(r => r.staff_id)
      );
      const upsert = db.prepare('INSERT INTO assignments (wedding_id, staff_id, status) VALUES (?, ?, ?) ON CONFLICT(wedding_id, staff_id) DO UPDATE SET status = excluded.status');
      const deleteVote = db.prepare('DELETE FROM assignments WHERE wedding_id = ? AND staff_id = ? AND assigned = 0');
      const getPrev = db.prepare('SELECT status FROM assignments WHERE wedding_id = ? AND staff_id = ?');
      const getStaffName = db.prepare('SELECT name FROM users WHERE id = ?');
      for (const a of filtered) {
        if (currentlyAssignedIds.has(a.staffId)) continue; // gesperrt
        const prev = (getPrev.get(req.params.id, a.staffId) as Pick<AssignmentRow, 'status'> | undefined)?.status;
        if (a.status === 'Ausstehend') {
          // Stimme zurücknehmen → Zeile löschen (nur wenn nicht eingeteilt).
          // So taucht die Hochzeit wieder in der Anfragen-Liste auf.
          deleteVote.run(req.params.id, a.staffId);
          if (prev && prev !== 'Ausstehend') {
            const staffName = (getStaffName.get(a.staffId) as Pick<UserRow, 'name'> | undefined)?.name ?? a.staffId;
            logActivity(req.params.id, 'vote_cast', `${staffName}: Stimme zurückgezogen`, req.user!.name);
          }
          continue;
        }
        upsert.run(req.params.id, a.staffId, a.status);
        // Log Vote nur bei tatsächlicher Änderung und gültigen Werten
        if (prev !== a.status && ['Ja', 'Nein', 'Vielleicht'].includes(a.status)) {
          const staffName = (getStaffName.get(a.staffId) as Pick<UserRow, 'name'> | undefined)?.name ?? a.staffId;
          logActivity(req.params.id, 'vote_cast', `${staffName}: ${a.status}`, req.user!.name);
        }
      }

      // Kommentar zur Abstimmung: jede:r nur den EIGENEN (auch Admins nicht für
      // andere). Geht auch bei fester Einteilung, z. B. "komme 30 Min später".
      // Wirkt nur auf eine vorhandene Stimme; leerer Text löscht den Kommentar.
      const own = req.body.assignments.find((a: IncomingVote | null) => a?.staffId === ownId && typeof a?.comment === 'string');
      if (own) {
        const comment = own.comment.trim().slice(0, 200);
        db.prepare('UPDATE assignments SET comment = ? WHERE wedding_id = ? AND staff_id = ?')
          .run(comment || null, req.params.id, ownId);
      }
    }

    // Admin sets final assignment: update the assigned flag for each staff member
    if (Array.isArray(req.body.assignedStaffIds) && req.user?.role === 'Admin') {
      const assignedIds: string[] = req.body.assignedStaffIds;
      const prevAssigned = (db.prepare('SELECT staff_id FROM assignments WHERE wedding_id = ? AND assigned = 1').all(req.params.id) as Pick<AssignmentRow, 'staff_id'>[]).map(r => r.staff_id);
      db.prepare('UPDATE assignments SET assigned = 0 WHERE wedding_id = ?').run(req.params.id);
      // Beim Einteilen wird der Vote automatisch auf "Ja" gesetzt – fest eingeteilte
      // Personen gelten als zugesagt, ihr Status ist gesperrt bis die Einteilung
      // wieder zurückgenommen wird.
      const upsertAssigned = db.prepare(
        `INSERT INTO assignments (wedding_id, staff_id, status, assigned) VALUES (?, ?, 'Ja', 1)
         ON CONFLICT(wedding_id, staff_id) DO UPDATE SET assigned = 1, status = 'Ja'`
      );
      for (const staffId of assignedIds) {
        upsertAssigned.run(req.params.id, staffId);
        if (!prevAssigned.includes(staffId)) {
          const staffUser = db.prepare('SELECT name FROM users WHERE id = ?').get(staffId) as Pick<UserRow, 'name'> | undefined;
          logActivity(req.params.id, 'staff_assigned', `${staffUser?.name ?? staffId} eingeteilt`, req.user!.name);
        }
      }
      for (const staffId of prevAssigned) {
        if (!assignedIds.includes(staffId)) {
          const staffUser = db.prepare('SELECT name FROM users WHERE id = ?').get(staffId) as Pick<UserRow, 'name'> | undefined;
          logActivity(req.params.id, 'staff_removed', `${staffUser?.name ?? staffId} entfernt`, req.user!.name);
        }
      }
    }

    const [updated] = getWeddingsWithAssignments().filter(w => w.id === req.params.id);
    res.json(updated);
    broadcastUpdate('weddings_changed');

    notifyWeddingUpdate({
      wedding: updated,
      changes: req.body,
      actor: req.user!,
      previousStatus: existing.status,
      previouslyAssigned: prevAssignedSnapshot,
    });
  } catch (error) {
    console.error('Update wedding error:', error);
    res.status(500).json({ error: 'Failed to update wedding' });
  }
});

router.delete('/api/weddings/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const w = db.prepare('SELECT couple_names FROM weddings WHERE id = ?').get(req.params.id) as Pick<WeddingRow, 'couple_names'> | undefined;
  if (!w) return res.status(404).json({ error: 'Wedding not found' });
  // Log BEVOR die Hochzeit gelöscht wird (durch ON DELETE SET NULL bleibt der Eintrag stehen,
  // damit man im Verlauf sieht, dass „X gelöscht hat …")
  logActivity(null, 'wedding_deleted', `Hochzeit gelöscht: ${w.couple_names}`, req.user!.name);
  db.prepare('DELETE FROM weddings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Wedding deleted' });
  broadcastUpdate('weddings_changed');
});

export default router;
