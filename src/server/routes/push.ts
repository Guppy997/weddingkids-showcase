import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';
import { sendPushToUsers, getPublicKey, pushEnabled } from '../lib/push.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Push Notifications ──────────────────────────────────────────────────────

// Public Key für Frontend-Subscription (kein Auth nötig)
router.get('/api/push/public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: getPublicKey(), enabled: pushEnabled() });
});

// Subscription speichern (Browser-PushSubscription-Objekt)
router.post('/api/push/subscribe', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription payload' });
    }
    const userAgent = (req.headers['user-agent'] || '').slice(0, 200);
    getDb().prepare(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth, user_agent)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         keys_p256dh = excluded.keys_p256dh,
         keys_auth = excluded.keys_auth,
         user_agent = excluded.user_agent`
    ).run(req.user!.userId, endpoint, keys.p256dh, keys.auth, userAgent);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Subscription wieder entfernen (auf Wunsch des Users)
router.post('/api/push/unsubscribe', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
      .run(endpoint, req.user!.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

// Test-Push (nur Admin) — schickt sich selbst eine Probe-Notification
router.post('/api/push/test', authMiddleware, (req: AuthRequest, res: Response) => {
  sendPushToUsers([req.user!.userId], {
    title: 'WeddingKids Test',
    body: 'Push-Notifications funktionieren! 🎉',
    url: '/',
    tag: 'test',
  }).catch(err => console.error('Push test failed:', err));
  res.json({ ok: true });
});

export default router;
