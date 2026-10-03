import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database.js';
import { logActivity } from '../lib/activityLog.js';
import { authMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { broadcastUpdate } from '../lib/sse.js';
import type { TodoRow } from '../types.js';

const router = Router();

// ─── Todos ────────────────────────────────────────────────────────────────────

router.get('/api/weddings/:id/todos', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM todo_items WHERE wedding_id = ? ORDER BY sort_order ASC, created_at ASC').all(req.params.id) as TodoRow[];
  res.json(rows.map(r => ({ id: r.id, weddingId: r.wedding_id, text: r.text, done: r.done === 1, sortOrder: r.sort_order, createdAt: r.created_at })));
});

router.post('/api/weddings/:id/todos', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
  const db = getDb();
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM todo_items WHERE wedding_id = ?').get(req.params.id) as { m: number | null } | undefined)?.m ?? -1;
  const id = `todo-${randomUUID()}`;
  db.prepare('INSERT INTO todo_items (id, wedding_id, text, sort_order) VALUES (?, ?, ?, ?)').run(id, req.params.id, text.trim(), maxOrder + 1);
  logActivity(req.params.id, 'todo_created', `Aufgabe erstellt: "${text.trim()}"`, req.user!.name);
  const row = db.prepare('SELECT * FROM todo_items WHERE id = ?').get(id) as TodoRow;
  res.status(201).json({ id: row.id, weddingId: row.wedding_id, text: row.text, done: row.done === 1, sortOrder: row.sort_order, createdAt: row.created_at });
});

router.patch('/api/todos/:todoId', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const todo = db.prepare('SELECT * FROM todo_items WHERE id = ?').get(req.params.todoId) as TodoRow | undefined;
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  const done = req.body.done !== undefined ? (req.body.done ? 1 : 0) : todo.done;
  const text = req.body.text !== undefined ? req.body.text.trim() : todo.text;
  db.prepare("UPDATE todo_items SET done = ?, text = ?, updated_at = datetime('now') WHERE id = ?").run(done, text, req.params.todoId);
  if (req.body.done === true && todo.done === 0) {
    logActivity(todo.wedding_id, 'todo_completed', `Aufgabe erledigt: "${text}"`, req.user!.name);
  }
  const updated = db.prepare('SELECT * FROM todo_items WHERE id = ?').get(req.params.todoId) as TodoRow;
  res.json({ id: updated.id, weddingId: updated.wedding_id, text: updated.text, done: updated.done === 1, sortOrder: updated.sort_order, createdAt: updated.created_at });
  broadcastUpdate('todos_changed');
});

router.delete('/api/todos/:todoId', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  getDb().prepare('DELETE FROM todo_items WHERE id = ?').run(req.params.todoId);
  res.json({ message: 'Todo deleted' });
  broadcastUpdate('todos_changed');
});

export default router;
