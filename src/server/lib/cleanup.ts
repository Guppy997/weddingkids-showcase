import { getDb } from '../database.js';
import { logActivity } from './activityLog.js';
import { broadcastUpdate } from './sse.js';

/** Wie oft der Server nach abgelaufenen Absagen schaut. */
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Löscht abgesagte Hochzeiten endgültig, sobald ihr (letzter) Tag vorbei ist —
 * dieselbe Regel wie `isWeddingOver` im Frontend: der Tag (UTC) liegt vor heute.
 * Zuteilungen und Aufgaben gehen per ON DELETE CASCADE mit, der Verlauf bleibt
 * stehen und bekommt einen Eintrag pro Hochzeit. Gibt die Anzahl zurück.
 */
export function deleteExpiredCancelledWeddings(): number {
  const db = getDb();
  const expired = db.prepare(`
    SELECT id, couple_names FROM weddings
    WHERE status = 'Abgesagt'
      AND date(COALESCE(NULLIF(end_date, ''), date)) < date('now')
  `).all() as { id: string; couple_names: string }[];
  if (expired.length === 0) return 0;

  const remove = db.prepare('DELETE FROM weddings WHERE id = ?');
  db.transaction(() => {
    for (const w of expired) {
      logActivity(null, 'wedding_deleted', `Abgesagte Hochzeit automatisch gelöscht: ${w.couple_names}`, null);
      remove.run(w.id);
    }
  })();

  console.log(`🧹 ${expired.length} abgelaufene abgesagte Hochzeit(en) gelöscht`);
  broadcastUpdate('weddings_changed');
  return expired.length;
}

/** Fehler nur loggen — die Aufräumfunktion darf den Server nie stoppen. */
export function runCleanupSafely(): void {
  try {
    deleteExpiredCancelledWeddings();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
