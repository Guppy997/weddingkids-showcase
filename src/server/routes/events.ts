import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database.js';
import { authMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { broadcastUpdate } from '../lib/sse.js';
import { toISO } from '../lib/dates.js';
import type { EventRow } from '../types.js';

const router = Router();

// ─── Events ──────────────────────────────────────────────────────────────────

// Hilfs-Mapper für ein Event-Row → API-DTO
function mapEvent(r: EventRow) {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    endDate: r.end_date ?? null,
    time: r.time ?? undefined,
    startTime: r.start_time ?? null,
    endTime: r.end_time ?? null,
    description: r.description ?? undefined,
    color: r.color ?? null,
    public: r.public === 1,
    createdAt: toISO(r.created_at),
    createdBy: r.created_by_name,
  };
}

router.get('/api/events', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const isAdmin = req.user?.role === 'Admin';
  const rows = (isAdmin
    ? db.prepare('SELECT * FROM events ORDER BY date ASC').all()
    : db.prepare('SELECT * FROM events WHERE public = 1 ORDER BY date ASC').all()) as EventRow[];
  res.json(rows.map(mapEvent));
});

router.post('/api/events', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { title, date, endDate, time, startTime, endTime, description, color } = req.body;
    const isPublic = req.body.public;
    if (!title || !date) return res.status(400).json({ error: 'Title and date required' });
    if (endDate && endDate < date) return res.status(400).json({ error: 'End-Datum muss nach Start-Datum liegen' });
    const db = getDb();
    const id = `event-${randomUUID()}`;
    db.prepare(
      `INSERT INTO events (id, title, date, end_date, time, start_time, end_time, description, color, public, created_by_id, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, title, date,
      endDate || null,
      time ?? null,
      startTime || null,
      endTime || null,
      description ?? null,
      color || null,
      isPublic ? 1 : 0,
      req.user!.userId, req.user!.name
    );
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as EventRow;
    res.status(201).json(mapEvent(ev));
    broadcastUpdate('events_changed');
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.patch('/api/events/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { title, date, endDate, time, startTime, endTime, description, color } = req.body;
    const isPublic = req.body.public;
    db.prepare(
      `UPDATE events SET
         title = COALESCE(?, title),
         date = COALESCE(?, date),
         end_date = ?,
         time = ?,
         start_time = ?,
         end_time = ?,
         description = ?,
         color = ?,
         public = COALESCE(?, public)
       WHERE id = ?`
    ).run(
      title ?? null,
      date ?? null,
      endDate || null,
      time ?? null,
      startTime || null,
      endTime || null,
      description ?? null,
      color || null,
      isPublic !== undefined ? (isPublic ? 1 : 0) : null,
      req.params.id
    );
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as EventRow | undefined;
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    res.json(mapEvent(ev));
    broadcastUpdate('events_changed');
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/api/events/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  getDb().prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ message: 'Event deleted' });
  broadcastUpdate('events_changed');
});

export default router;
