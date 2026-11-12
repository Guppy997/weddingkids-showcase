import { Router, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database.js';
import { logActivity, preview } from '../lib/activityLog.js';
import { sendPushToUsers } from '../lib/push.js';
import { authMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { broadcastUpdate } from '../lib/sse.js';
import { toISO } from '../lib/dates.js';
import { HIDDEN_USER_IDS } from '../config.js';
import type { PollRow, PollVoteRow, IdRow } from '../types.js';

const router = Router();

// ─── Polls (Umfragen im News-Tab) ────────────────────────────────────────────
// Ein Admin stellt eine Frage, alle aktiven User können mit Ja/Nein/Vielleicht
// antworten. Versteckte Accounts und ihre Votes werden überall rausgefiltert.

function loadPollsForUser(userId: string) {
  const db = getDb();
  const polls = db.prepare('SELECT * FROM polls ORDER BY created_at DESC LIMIT 100').all() as PollRow[];
  if (polls.length === 0) return [];
  const ids = polls.map(p => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const allVotes = db.prepare(
    `SELECT pv.poll_id, pv.user_id, pv.vote, u.name AS user_name
     FROM poll_votes pv JOIN users u ON u.id = pv.user_id
     WHERE pv.poll_id IN (${placeholders})`
  ).all(...ids) as (PollVoteRow & { user_name: string })[];
  const hidden = new Set(HIDDEN_USER_IDS);
  return polls.map(p => {
    const votesForPoll = allVotes.filter(v => v.poll_id === p.id && !hidden.has(v.user_id));
    const myVoteRow = votesForPoll.find(v => v.user_id === userId);
    return {
      id: p.id,
      question: p.question,
      createdBy: p.created_by_name,
      createdAt: toISO(p.created_at),
      votes: votesForPoll.map(v => ({ userId: v.user_id, userName: v.user_name, vote: v.vote })),
      myVote: myVoteRow?.vote ?? null,
    };
  });
}

router.get('/api/polls', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json(loadPollsForUser(req.user!.userId));
});

router.post('/api/polls', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body || {};
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Frage erforderlich' });
    }
    if (question.length > 280) {
      return res.status(400).json({ error: 'Frage zu lang (max 280 Zeichen)' });
    }
    const db = getDb();
    const id = `poll-${randomUUID()}`;
    db.prepare('INSERT INTO polls (id, question, created_by_id, created_by_name) VALUES (?, ?, ?, ?)')
      .run(id, question.trim(), req.user!.userId, req.user!.name);
    logActivity(null, 'poll_created', `Neue Abstimmung: ${preview(question.trim())}`, req.user!);
    res.status(201).json(loadPollsForUser(req.user!.userId).find(p => p.id === id));
    broadcastUpdate('polls_changed');

    // Push an alle aktiven User außer dem Autor (wie bei Notizen)
    try {
      const recipients = (db.prepare(
        "SELECT id FROM users WHERE status = 'active' AND id != ?"
      ).all(req.user!.userId) as IdRow[]).map(r => r.id);
      sendPushToUsers(recipients, {
        title: 'Neue Abstimmung',
        body: question.trim().slice(0, 120),
        url: '/',
        tag: `poll-${id}`,
      }).catch(err => console.error('Push (poll) failed:', err));
    } catch (err) {
      console.error('Push trigger error (poll):', err);
    }
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: 'Abstimmung konnte nicht angelegt werden' });
  }
});

router.delete('/api/polls/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const p = db.prepare('SELECT question FROM polls WHERE id = ?').get(req.params.id) as Pick<PollRow, 'question'> | undefined;
  db.prepare('DELETE FROM polls WHERE id = ?').run(req.params.id);
  if (p) {
    logActivity(null, 'poll_deleted', `Abstimmung gelöscht: ${preview(p.question)}`, req.user!);
  }
  res.json({ message: 'Poll deleted' });
  broadcastUpdate('polls_changed');
});

router.post('/api/polls/:id/vote', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { vote } = req.body || {};
    const db = getDb();
    const exists = db.prepare('SELECT id FROM polls WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Abstimmung nicht gefunden' });
    if (vote === null) {
      // Stimme zurückziehen
      db.prepare('DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?').run(req.params.id, req.user!.userId);
    } else if (['Ja', 'Nein', 'Vielleicht'].includes(vote)) {
      db.prepare(
        `INSERT INTO poll_votes (poll_id, user_id, vote) VALUES (?, ?, ?)
         ON CONFLICT(poll_id, user_id) DO UPDATE SET vote = excluded.vote, voted_at = datetime('now')`
      ).run(req.params.id, req.user!.userId, vote);
    } else {
      return res.status(400).json({ error: 'Ungültige Stimme' });
    }
    res.json(loadPollsForUser(req.user!.userId).find(p => p.id === req.params.id));
    broadcastUpdate('polls_changed');
  } catch (err) {
    console.error('Vote poll error:', err);
    res.status(500).json({ error: 'Stimme konnte nicht gespeichert werden' });
  }
});

export default router;
