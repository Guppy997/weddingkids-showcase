import { randomUUID } from 'crypto';
import { getDb } from '../database.js';

/** Wer einen Verlaufseintrag ausgelöst hat. `null` = der Server selbst (z. B. Aufräum-Job). */
export type Actor = { userId: string; name: string } | null;

/**
 * Schreibt einen Eintrag ins Aktivitätsprotokoll (Admin-Bereich → Verlauf).
 * `weddingId` ist null bei Ereignissen ohne Hochzeitsbezug (News, Team, …).
 *
 * Gespeichert werden Account-ID UND Name: Die ID entscheidet, wem ein Eintrag
 * gehört (Datenexport, versteckte Accounts), der Name ist nur die Anzeige zum
 * Zeitpunkt des Eintrags. Nie nach dem Namen filtern, er ist frei änderbar.
 */
export function logActivity(weddingId: string | null, eventType: string, description: string, actor: Actor) {
  getDb()
    .prepare('INSERT INTO activity_log (id, wedding_id, event_type, description, actor_name, actor_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), weddingId, eventType, description, actor?.name ?? 'System', actor?.userId ?? null);
}

/** Kürzt Text für Verlaufseinträge, z. B. „Neue Notiz: Bitte morgen …“. */
export function preview(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
