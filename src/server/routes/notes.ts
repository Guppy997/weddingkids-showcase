import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database.js';
import { logActivity, preview } from '../lib/activityLog.js';
import { sendPushToUsers } from '../lib/push.js';
import { authMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { broadcastUpdate } from '../lib/sse.js';
import { toISO } from '../lib/dates.js';
import type { NoteRow, IdRow } from '../types.js';

const router = Router();

// ─── Notes ───────────────────────────────────────────────────────────────────

router.get('/api/notes', authMiddleware, (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM notes ORDER BY created_at DESC').all() as NoteRow[];
  res.json(rows.map(r => ({ id: r.id, text: r.text, createdAt: toISO(r.created_at), createdBy: r.created_by_name })));
});

router.post('/api/notes', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
    const db = getDb();
    const id = `note-${randomUUID()}`;
    db.prepare('INSERT INTO notes (id, text, created_by_id, created_by_name) VALUES (?, ?, ?, ?)')
      .run(id, text.trim(), req.user!.userId, req.user!.name);
    // Activity Log
    logActivity(null, 'note_created', `Neue Notiz: ${preview(text.trim())}`, req.user!.name);
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow;
    res.status(201).json({ id: note.id, text: note.text, createdAt: toISO(note.created_at), createdBy: note.created_by_name });
    broadcastUpdate('notes_changed');

    // Push: alle Mitarbeiter (außer Autor) → "Neue News"
    try {
      const recipients = (db.prepare(
        "SELECT id FROM users WHERE status = 'active' AND id != ?"
      ).all(req.user!.userId) as IdRow[]).map(r => r.id);
      const preview = text.trim().slice(0, 120);
      sendPushToUsers(recipients, {
        title: 'Neue News',
        body: preview,
        url: '/',
        tag: `note-${id}`,
      }).catch(err => console.error('Push (note) failed:', err));
    } catch (err) {
      console.error('Push trigger error (note):', err);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.delete('/api/notes/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const note = db.prepare('SELECT text FROM notes WHERE id = ?').get(req.params.id) as Pick<NoteRow, 'text'> | undefined;
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  if (note) {
    logActivity(null, 'note_deleted', `Notiz gelöscht: ${preview(note.text)}`, req.user!.name);
  }
  res.json({ message: 'Note deleted' });
  broadcastUpdate('notes_changed');
});

export default router;
