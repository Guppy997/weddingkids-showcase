import { Router, type Request, type Response } from 'express';
import { resolveActiveUser } from '../middleware/auth.js';
import { sseClients } from '../lib/sse.js';

const router = Router();

// ─── SSE Stream ──────────────────────────────────────────────────────────────

router.get('/api/stream', (req: Request, res: Response) => {
  // Auth via Query-Parameter (EventSource unterstützt keine custom Headers)
  const token = req.query.token as string;
  if (!resolveActiveUser(token)) return res.status(401).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx-Buffering deaktivieren
  res.flushHeaders();

  // Initiale Verbindungsbestätigung
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.add(res);

  // Heartbeat alle 25s damit nginx / iOS die Verbindung nicht killt
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); sseClients.delete(res); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

export default router;
