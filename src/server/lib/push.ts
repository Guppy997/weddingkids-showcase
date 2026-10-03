/**
 * Web-Push-Logik (VAPID).
 *
 * - Liest VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT aus .env.
 * - Persistiert Subscriptions in der Tabelle push_subscriptions.
 * - sendPushToUsers(userIds, payload) verschickt eine Notification an alle
 *   gespeicherten Geräte dieser User. Abgelaufene Subscriptions (410/404)
 *   werden automatisch aus der DB entfernt.
 */
import webpush from 'web-push';
import { getDb } from '../database.js';

const PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  ?? '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const SUBJECT     = process.env.VAPID_SUBJECT     ?? 'mailto:admin@example.com';

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
} else {
  console.warn('⚠ VAPID-Keys fehlen — Push-Notifications sind deaktiviert.');
}

export const pushEnabled = () => configured;
export const getPublicKey = () => PUBLIC_KEY;

export interface PushPayload {
  title: string;
  body: string;
  url?: string;          // Welche Seite soll bei Klick geöffnet werden
  tag?: string;          // Notifications mit gleichem tag werden ersetzt (kein Spam)
}

interface DbSub {
  id: number;
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

/**
 * Sendet eine Notification an alle Geräte der angegebenen User-IDs.
 * Läuft non-blocking — Fehler beim Versenden brechen nicht die laufende Aktion ab.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!configured || userIds.length === 0) return;

  const db = getDb();
  const placeholders = userIds.map(() => '?').join(',');
  const subs = db.prepare(
    `SELECT id, user_id, endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE user_id IN (${placeholders})`
  ).all(...userIds) as DbSub[];

  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  const removeSub = db.prepare('DELETE FROM push_subscriptions WHERE id = ?');

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        data,
        { TTL: 60 * 60 * 24 } // 24h zwischenspeichern wenn Empfänger offline
      );
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      // 404 / 410 → Subscription ungültig → aufräumen
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        removeSub.run(sub.id);
      } else {
        console.error('Push send error:', err?.statusCode, err?.body ?? err?.message);
      }
    }
  }));
}
