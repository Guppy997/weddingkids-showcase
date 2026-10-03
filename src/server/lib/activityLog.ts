import { randomUUID } from 'crypto';
import { getDb } from '../database.js';

/**
 * Schreibt einen Eintrag ins Aktivitätsprotokoll (Admin-Bereich → Verlauf).
 * `weddingId` ist null bei Ereignissen ohne Hochzeitsbezug (News, Team, …).
 */
export function logActivity(weddingId: string | null, eventType: string, description: string, actorName: string) {
  getDb()
    .prepare('INSERT INTO activity_log (id, wedding_id, event_type, description, actor_name) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), weddingId, eventType, description, actorName);
}

/** Kürzt Text für Verlaufseinträge, z. B. „Neue Notiz: Bitte morgen …“. */
export function preview(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
