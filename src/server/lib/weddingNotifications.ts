import { getDb } from '../database.js';
import { sendPushToUsers } from './push.js';
import type { TokenPayload } from './credentials.js';
import type { AssignmentRow } from '../types.js';
import { formatWeddingDateDE } from './dates.js';

/**
 * Push-Benachrichtigungen nach einer Hochzeits-Änderung (PATCH /api/weddings/:id):
 *  (a) neu eingeteilte Personen + Info an andere Admins (auch bei Entfernungen)
 *  (b) Status-Änderung → eingeteilte Mitarbeitende + Admins
 *  (c) Abstimmung durch Mitarbeitende → Admins
 * Fehler beim Versand brechen die eigentliche Änderung nie ab.
 */
/** Die Felder aus dem PATCH-Body, die eine Benachrichtigung auslösen können. */
export interface WeddingChanges {
  assignedStaffIds?: string[];
  status?: string;
  assignments?: { staffId?: string; status?: string }[];
}

export function notifyWeddingUpdate({ wedding, changes, actor, previousStatus, previouslyAssigned }: {
  wedding: { id: string; coupleNames: string; date: string; endDate?: string | null; location: string };
  changes: WeddingChanges;
  actor: TokenPayload;
  previousStatus: string;
  previouslyAssigned: string[];
}) {
  const db = getDb();
  try {
    const dateStr = formatWeddingDateDE(wedding.date, wedding.endDate);
    const actorId = actor.userId;

    // Hilfsfunktion: alle aktiven Admin-IDs holen (für Mit-Info bei wichtigen Events).
    // Admins sollen immer Bescheid wissen, auch wenn sie selbst nicht zugeteilt sind.
    const getOtherAdmins = () => (db.prepare(
      "SELECT id FROM users WHERE role = 'Admin' AND status = 'active' AND id != ?"
    ).all(actorId) as { id: string }[]).map(r => r.id);

    // (a) Frisch fest eingeteilte Personen → "Du wurdest eingeteilt"
    //     + Admins bekommen Info-Push "Neue Einteilung"
    const assignedStaffIds = changes.assignedStaffIds;
    if (Array.isArray(assignedStaffIds) && actor.role === 'Admin') {
      const newlyAssigned = assignedStaffIds.filter(
        id => !previouslyAssigned.includes(id) && id !== actorId
      );
      if (newlyAssigned.length > 0) {
        sendPushToUsers(newlyAssigned, {
          title: 'Du wurdest eingeteilt',
          body: `${wedding.coupleNames} – ${dateStr} in ${wedding.location}`,
          url: '/',
          tag: `assigned-${wedding.id}`,
        }).catch(err => console.error('Push (assigned) failed:', err));

        // Admin-Info: andere Admins sehen wer eingeteilt wurde
        const adminIds = getOtherAdmins().filter(id => !newlyAssigned.includes(id));
        if (adminIds.length > 0) {
          const namesRows = db.prepare(
            `SELECT name FROM users WHERE id IN (${newlyAssigned.map(() => '?').join(',')})`
          ).all(...newlyAssigned) as { name: string }[];
          const names = namesRows.map(r => r.name).join(', ');
          sendPushToUsers(adminIds, {
            title: 'Neue Einteilung',
            body: `${names} → ${wedding.coupleNames} (${dateStr})`,
            url: '/',
            tag: `admin-assigned-${wedding.id}`,
          }).catch(err => console.error('Push (admin assigned) failed:', err));
        }
      }

      // Entfernungen: Admin-Info bei aus-geteilten Personen
      const removed = previouslyAssigned.filter(
        id => !assignedStaffIds.includes(id) && id !== actorId
      );
      if (removed.length > 0) {
        const adminIds = getOtherAdmins().filter(id => !removed.includes(id));
        const namesRows = db.prepare(
          `SELECT name FROM users WHERE id IN (${removed.map(() => '?').join(',')})`
        ).all(...removed) as { name: string }[];
        const names = namesRows.map(r => r.name).join(', ');
        if (adminIds.length > 0) {
          sendPushToUsers(adminIds, {
            title: 'Einteilung entfernt',
            body: `${names} ← ${wedding.coupleNames}`,
            url: '/',
            tag: `admin-removed-${wedding.id}`,
          }).catch(err => console.error('Push (admin removed) failed:', err));
        }
      }
    }

    // (b) Status-Änderung → eingeteilte Mitarbeiter + alle anderen Admins
    if (changes.status && changes.status !== previousStatus) {
      const currentlyAssigned = (db.prepare(
        'SELECT staff_id FROM assignments WHERE wedding_id = ? AND assigned = 1'
      ).all(wedding.id) as Pick<AssignmentRow, 'staff_id'>[])
        .map(r => r.staff_id)
        .filter(id => id !== actorId);
      // Admins immer dazu, falls nicht schon zugeteilt
      const adminIds = getOtherAdmins();
      const recipients = Array.from(new Set([...currentlyAssigned, ...adminIds]));
      if (recipients.length > 0) {
        sendPushToUsers(recipients, {
          title: `Status geändert: ${changes.status}`,
          body: `${wedding.coupleNames} – ${dateStr}`,
          url: '/',
          tag: `status-${wedding.id}`,
        }).catch(err => console.error('Push (status) failed:', err));
      }
    }

    // (c) Votes (Ja/Nein/Vielleicht) durch Staff → Admins bekommen Push
    //     Damit die Admins sehen, wer wann zugesagt hat
    if (Array.isArray(changes.assignments) && actor.role !== 'Admin') {
      const ownId = actor.userId;
      const myVote = changes.assignments.find(a => a.staffId === ownId);
      if (myVote?.status && ['Ja', 'Nein', 'Vielleicht'].includes(myVote.status)) {
        const adminIds = getOtherAdmins(); // schließt Auslöser bereits aus
        if (adminIds.length > 0) {
          sendPushToUsers(adminIds, {
            title: `${actor.name}: ${myVote.status}`,
            body: `${wedding.coupleNames} – ${dateStr}`,
            url: '/',
            tag: `vote-${wedding.id}-${ownId}`,
          }).catch(err => console.error('Push (vote) failed:', err));
        }
      }
    }
  } catch (err) {
    console.error('Push trigger error (wedding patch):', err);
  }
}
