/**
 * Helfer-Funktionen für Web-Push aus dem Frontend.
 *
 * Lebenszyklus:
 *   isPushSupported()       → kann der Browser überhaupt Push?
 *   isPushSubscribed()      → ist dieses Gerät bereits angemeldet?
 *   subscribeToPush(token)  → Permission anfragen + Subscription beim Server speichern
 *   unsubscribeFromPush(token) → Subscription lokal & beim Server entfernen
 *
 * iOS-Hinweis: Web-Push funktioniert auf iPhone nur, wenn die App als PWA
 * zum Home-Bildschirm hinzugefügt wurde (iOS 16.4+).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Auf iPhone nur möglich, wenn als PWA zum Home-Bildschirm hinzugefügt. */
export function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore — iOS-spezifische Property
    window.navigator.standalone === true
  );
}

/**
 * Wrapt ein Promise mit Timeout. Wenn das Promise nicht innerhalb von ms
 * resolved/rejected, wird ein Fehler mit `label` geworfen — so wissen wir
 * sofort, an welcher Stelle die Push-Pipeline hängt.
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Zeitüberschreitung bei: ${label}`)), ms)
    ),
  ]);
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 3000, 'Service Worker');
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Wandelt einen base64url-VAPID-Key in das Uint8Array-Format um, das die Browser-API erwartet. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Permission anfragen + Subscription erstellen + an Server schicken.
 * Wirft eine sprechende Exception wenn etwas nicht klappt — jeder Schritt
 * hat einen Timeout, damit der UI-State nie endlos hängt.
 */
export async function subscribeToPush(token: string): Promise<void> {
  if (!isPushSupported()) throw new Error('Dein Browser unterstützt keine Push-Notifications.');
  if (!VAPID_PUBLIC_KEY) throw new Error('Push ist serverseitig nicht konfiguriert.');

  // Falls die Permission bereits "denied" wurde, kein erneuter Dialog möglich.
  if (Notification.permission === 'denied') {
    throw new Error('Benachrichtigungen sind blockiert. Bitte in den Browser-Einstellungen erlauben.');
  }

  // 1. Permission anfragen (kein Timeout — User-Dialog kann beliebig lange offen sein)
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Du hast Benachrichtigungen nicht erlaubt.');
  }

  // 2. Service Worker bereit (max 15s — Mobile Chrome ist manchmal langsam)
  // Falls noch keine Registration existiert, einmal kurz registrieren.
  if (!(await navigator.serviceWorker.getRegistration())) {
    try { await navigator.serviceWorker.register('/sw.js'); } catch { /* schon vorhanden */ }
  }
  const reg = await withTimeout(
    navigator.serviceWorker.ready,
    15000,
    'Service Worker bereit'
  );

  // 3. Vorhandene Subscription holen oder neue erstellen (max 30s — geht über FCM/APNS)
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await withTimeout(
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }),
      30000,
      'Push-Anmeldung beim Browser'
    );
  }

  // 4. Subscription an unseren Server senden (max 15s)
  const json = sub.toJSON();
  const res = await withTimeout(
    fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    }),
    15000,
    'Server-Anmeldung'
  );
  if (!res.ok) {
    throw new Error(`Server-Antwort: ${res.status}. Subscription konnte nicht gespeichert werden.`);
  }
}

/** Lokal abbestellen + serverseitig löschen. */
export async function unsubscribeFromPush(token: string): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 3000, 'Service Worker');
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch(`${API_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint }),
    }).catch(() => { /* nicht kritisch wenn Server-Cleanup fehlschlägt */ });
  } catch (err) {
    console.error('unsubscribeFromPush:', err);
  }
}
