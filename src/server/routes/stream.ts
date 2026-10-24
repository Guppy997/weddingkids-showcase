import { Router, type Request, type Response } from 'express';
import { authMiddleware, resolveActiveUser, type AuthRequest } from '../middleware/auth.js';
import { LEGACY_TOKEN_CUTOFF_MS } from '../lib/credentials.js';
import { issueStreamTicket, redeemStreamTicket } from '../lib/streamTickets.js';
import { sseClients } from '../lib/sse.js';

const router = Router();

// ─── SSE Stream ──────────────────────────────────────────────────────────────

// Einmal-Ticket für den Stream (Login-Token kommt hier per Header, nicht per URL)
router.post('/api/stream/ticket', authMiddleware, (req: AuthRequest, res: Response) => {
  const token = req.headers.authorization!.split(' ')[1];
  res.json({ ticket: issueStreamTicket(token) });
});

router.get('/api/stream', (req: Request, res: Response) => {
  // ?token= nur noch als Übergang für PWAs, die das Update noch nicht geladen
  // haben — der Token stünde sonst dauerhaft in den Server-Logs.
  const token = req.query.ticket !== undefined
    ? redeemStreamTicket(req.query.ticket)
    : (Date.now() <= LEGACY_TOKEN_CUTOFF_MS && typeof req.query.token === 'string' ? req.query.token : null);
  if (!resolveActiveUser(token ?? undefined)) return res.status(401).end();

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
