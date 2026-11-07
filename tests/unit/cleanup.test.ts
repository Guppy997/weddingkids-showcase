import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';

// Eigene Wegwerf-Datenbank — DB_PATH muss VOR dem Import von database.ts stehen.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weddingkids-cleanup-'));
process.env.DB_PATH = path.join(tmpDir, 'cleanup.db');

const { initializeDatabase, closeDatabase, getDb } = await import('../../src/server/database');
const { deleteExpiredCancelledWeddings } = await import('../../src/server/lib/cleanup');

/** Datum relativ zu heute (UTC), z. B. -1 = gestern. */
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

function addWedding(id: string, status: string, date: string, endDate: string | null = null) {
  getDb().prepare(`INSERT INTO weddings (id, couple_names, initials, date, end_date, location, status)
    VALUES (?, ?, 'XX', ?, ?, 'Ort', ?)`).run(id, `Paar ${id}`, date, endDate, status);
}
const exists = (id: string) => !!getDb().prepare('SELECT 1 FROM weddings WHERE id = ?').get(id);

beforeAll(() => {
  initializeDatabase();
  getDb().prepare(`INSERT INTO users (id, username, name, password_hash, role, department)
    VALUES ('u1', 'u1', 'Uli', 'x', 'Staff', 'Kids')`).run();
});
beforeEach(() => {
  getDb().exec('DELETE FROM weddings; DELETE FROM activity_log;');
});
afterAll(() => {
  closeDatabase();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Abgelaufene abgesagte Hochzeiten automatisch löschen', () => {
  it('löscht vergangene Absagen samt Zuteilungen/Aufgaben und schreibt den Verlauf', () => {
    addWedding('old', 'Abgesagt', day(-1));
    const db = getDb();
    db.prepare(`INSERT INTO assignments (wedding_id, staff_id, status, assigned) VALUES ('old', 'u1', 'Ja', 1)`).run();
    db.prepare(`INSERT INTO todo_items (id, wedding_id, text) VALUES ('t1', 'old', 'Basteln')`).run();

    expect(deleteExpiredCancelledWeddings()).toBe(1);
    expect(exists('old')).toBe(false);
    expect(db.prepare(`SELECT COUNT(*) c FROM assignments WHERE wedding_id = 'old'`).get()).toEqual({ c: 0 });
    expect(db.prepare(`SELECT COUNT(*) c FROM todo_items WHERE wedding_id = 'old'`).get()).toEqual({ c: 0 });
    const log = db.prepare('SELECT event_type, description, actor_name FROM activity_log').all();
    expect(log).toEqual([{ event_type: 'wedding_deleted', description: 'Abgesagte Hochzeit automatisch gelöscht: Paar old', actor_name: 'System' }]);
  });

  it('lässt heutige und zukünftige Absagen stehen', () => {
    addWedding('today', 'Abgesagt', day(0));
    addWedding('future', 'Abgesagt', day(30));
    expect(deleteExpiredCancelledWeddings()).toBe(0);
    expect(exists('today') && exists('future')).toBe(true);
  });

  it('lässt vergangene, nicht abgesagte Hochzeiten stehen (Abgeschlossen)', () => {
    for (const s of ['Anfrage', 'Gebucht', 'Geplant']) addWedding(s, s, day(-10));
    expect(deleteExpiredCancelledWeddings()).toBe(0);
    expect(getDb().prepare('SELECT COUNT(*) c FROM weddings').get()).toEqual({ c: 3 });
  });

  it('mehrtägig: erst nach dem letzten Tag', () => {
    addWedding('running', 'Abgesagt', day(-2), day(0));
    addWedding('done', 'Abgesagt', day(-3), day(-1));
    expect(deleteExpiredCancelledWeddings()).toBe(1);
    expect(exists('running')).toBe(true);
    expect(exists('done')).toBe(false);
  });
});
