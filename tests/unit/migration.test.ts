import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Spielt das Update auf eine Datenbank im Stand von v1.19.0 ein: Der Server
// migriert beim Start selbst (database.ts). Hier wird geprüft, dass dabei
// nichts verloren geht und die neuen Regeln danach gelten.

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weddingkids-migration-'));
const dbPath = path.join(tmpDir, 'v1-19-0.db');
process.env.DB_PATH = dbPath;

/** Tabellen so, wie v1.19.0 sie angelegt hat (nur was die Migration betrifft). */
function createV1190Database() {
  const old = new Database(dbPath);
  old.pragma('foreign_keys = ON');
  old.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, role TEXT NOT NULL, department TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE notes (
      id TEXT PRIMARY KEY, text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_by_name TEXT NOT NULL
    );
    CREATE TABLE events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, time TEXT, description TEXT,
      public INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_by_name TEXT NOT NULL,
      end_date TEXT, start_time TEXT, end_time TEXT, color TEXT
    );
    CREATE TABLE polls (
      id TEXT PRIMARY KEY, question TEXT NOT NULL,
      created_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_by_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE poll_votes (
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote TEXT NOT NULL, voted_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (poll_id, user_id)
    );
    CREATE TABLE activity_log (
      id TEXT PRIMARY KEY, wedding_id TEXT, event_type TEXT NOT NULL,
      description TEXT NOT NULL, actor_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO users (id, username, name, password_hash, role, department) VALUES
      ('lena', 'lena', 'Lena',  'x', 'Admin', 'Leitung'),
      ('tom',  'tom',  'Tom',   'x', 'Staff', 'Kids'),
      ('anna1', 'anna1', 'Anna', 'x', 'Staff', 'Kids'),
      ('anna2', 'anna2', 'Anna', 'x', 'Staff', 'Kids');

    INSERT INTO notes  (id, text, created_by_id, created_by_name) VALUES ('n1', 'News von Lena', 'lena', 'Lena');
    INSERT INTO events (id, title, date, color, created_by_id, created_by_name) VALUES ('e1', 'Teamtreffen', '2027-01-10', '#ff0000', 'lena', 'Lena');
    INSERT INTO polls  (id, question, created_by_id, created_by_name) VALUES ('p1', 'Sommerfest?', 'lena', 'Lena');
    INSERT INTO poll_votes (poll_id, user_id, vote) VALUES ('p1', 'tom', 'Ja'), ('p1', 'anna1', 'Nein');

    INSERT INTO activity_log (id, event_type, description, actor_name) VALUES
      ('a1', 'note_created',    'Neue Notiz',          'Lena'),
      ('a2', 'vote_cast',       'Anna: Ja',            'Anna'),
      ('a3', 'wedding_created', 'Neue Hochzeit',       'Ehemalige'),
      ('a4', 'wedding_deleted', 'Automatisch gelöscht', 'System');
  `);
  old.close();
}

createV1190Database();
const { initializeDatabase, closeDatabase, getDb } = await import('../../src/server/database');

const count = (table: string) => (getDb().prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
const actorOf = (id: string) => (getDb().prepare('SELECT actor_id FROM activity_log WHERE id = ?').get(id) as { actor_id: string | null }).actor_id;

beforeAll(() => initializeDatabase());
afterAll(() => {
  closeDatabase();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Migration von v1.19.0', () => {
  it('behält alle News, Termine, Abstimmungen und Stimmen', () => {
    expect(count('notes')).toBe(1);
    expect(count('polls')).toBe(1);
    expect(count('poll_votes')).toBe(2);
    const event = getDb().prepare('SELECT title, color, created_by_id FROM events WHERE id = ?').get('e1');
    expect(event).toEqual({ title: 'Teamtreffen', color: '#ff0000', created_by_id: 'lena' });
  });

  it('lässt keine ungültigen Verweise zurück und schaltet die Fremdschlüssel wieder ein', () => {
    expect(getDb().prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(getDb().pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('ordnet alte Verlaufseinträge nur eindeutigen Namen zu', () => {
    expect(actorOf('a1')).toBe('lena');   // genau ein Account heißt Lena
    expect(actorOf('a2')).toBeNull();     // zwei Accounts heißen Anna
    expect(actorOf('a3')).toBeNull();     // Account gibt es nicht mehr
    expect(actorOf('a4')).toBeNull();     // Eintrag des Servers
  });

  it('ein zweiter Start ändert nichts und ordnet nichts nachträglich zu', () => {
    // Tom nennt sich später wie die frühere Kollegin: deren alter Eintrag bleibt ohne Account
    getDb().prepare("UPDATE users SET name = 'Ehemalige' WHERE id = 'tom'").run();
    closeDatabase();
    initializeDatabase();
    expect(actorOf('a3')).toBeNull();
    expect(count('notes') + count('events') + count('polls') + count('poll_votes')).toBe(5);
  });

  it('danach lässt sich die Autorin löschen, ihre Inhalte bleiben mit Namen stehen', () => {
    // Vorher: NOT NULL constraint failed (polls) bzw. News und Termine wurden mitgelöscht
    getDb().prepare('DELETE FROM users WHERE id = ?').run('lena');
    for (const table of ['notes', 'events', 'polls']) {
      const row = getDb().prepare(`SELECT created_by_id, created_by_name FROM ${table}`).get();
      expect(row).toEqual({ created_by_id: null, created_by_name: 'Lena' });
    }
    // Stimmen der anderen bleiben, der Verlaufseintrag behält die (jetzt verwaiste) ID
    expect(count('poll_votes')).toBe(2);
    expect(actorOf('a1')).toBe('lena');
  });
});
