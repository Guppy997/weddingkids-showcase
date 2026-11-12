import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../data/weddingkids.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function initializeDatabase(): void {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Staff')),
      department TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weddings (
      id TEXT PRIMARY KEY,
      couple_names TEXT NOT NULL,
      initials TEXT NOT NULL,
      date TEXT NOT NULL,
      betreuungszeit TEXT,
      location TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Anfrage', 'Gebucht', 'Geplant', 'Abgesagt')),
      previous_status TEXT,
      children_count INTEGER NOT NULL DEFAULT 0,
      staff_needed INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
      staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('Ja', 'Nein', 'Vielleicht', 'Ausstehend')),
      assigned INTEGER NOT NULL DEFAULT 0,
      UNIQUE(wedding_id, staff_id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todo_items (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      wedding_id TEXT REFERENCES weddings(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      description TEXT,
      public INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote TEXT NOT NULL CHECK(vote IN ('Ja', 'Nein', 'Vielleicht')),
      voted_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (poll_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
  `);

  // Migrations for existing DBs
  try {
    db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending'))`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE assignments ADD COLUMN assigned INTEGER NOT NULL DEFAULT 0`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_color TEXT NOT NULL DEFAULT '#008080'`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_image TEXT`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE weddings ADD COLUMN staff_needed INTEGER NOT NULL DEFAULT 0`);
  } catch { /* column already exists */ }
  // Events: optionales End-Datum (Mehrtages-Termine), separate Start/End-Zeiten
  // und Farbe. Alles nullable, alte Events bleiben Single-Day in Standardfarbe.
  try { db.exec(`ALTER TABLE events ADD COLUMN end_date TEXT`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE events ADD COLUMN start_time TEXT`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE events ADD COLUMN end_time TEXT`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE events ADD COLUMN color TEXT`); } catch { /* exists */ }
  // Optionaler Kommentar zur eigenen Abstimmung (z. B. "kann nur mittags").
  try { db.exec(`ALTER TABLE assignments ADD COLUMN comment TEXT`); } catch { /* exists */ }
  // Zeitpunkt der letzten Passwortänderung: ältere Tokens werden danach abgelehnt.
  // Leer für alle bestehenden Accounts, bis sie ihr Passwort ändern.
  try { db.exec(`ALTER TABLE users ADD COLUMN password_changed_at TEXT`); } catch { /* exists */ }
  // Hochzeiten: optionales End-Datum für mehrtägige Betreuungen (z. B. ein ganzes
  // Wochenende). Leer = eintägig wie bisher.
  try { db.exec(`ALTER TABLE weddings ADD COLUMN end_date TEXT`); } catch { /* exists */ }

  // Migration: activity_log → wedding_id nullable + neue event_types erlauben.
  // Wir prüfen das durch einen Probe-Insert mit einem neuen event_type. Falls der
  // CHECK-Constraint noch greift, bauen wir die Tabelle einmalig neu.
  try {
    const probeId = '__migration_probe__';
    db.exec('BEGIN');
    db.prepare("INSERT INTO activity_log (id, wedding_id, event_type, description, actor_name) VALUES (?, NULL, 'wedding_created', '', '')").run(probeId);
    db.prepare('DELETE FROM activity_log WHERE id = ?').run(probeId);
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    // Alte Tabelle hat noch CHECK-Constraint + NOT NULL wedding_id → migrieren.
    db.exec(`
      CREATE TABLE activity_log_new (
        id TEXT PRIMARY KEY,
        wedding_id TEXT REFERENCES weddings(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        description TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO activity_log_new (id, wedding_id, event_type, description, actor_name, created_at)
        SELECT id, wedding_id, event_type, description, actor_name, created_at FROM activity_log;
      DROP TABLE activity_log;
      ALTER TABLE activity_log_new RENAME TO activity_log;
    `);
    console.log('✅ activity_log migrated (nullable wedding_id, open event_type)');
  }

  migrateActivityActorId();
  migrateAuthorColumns();

  console.log(`✅ SQLite database initialized at ${DB_PATH}`);
}

/**
 * Verlauf: wer etwas getan hat, wird über die Account-ID festgehalten statt
 * nur über den Anzeigenamen. Der Name ist frei änderbar: Wer sich wie eine
 * andere Person nannte, bekam deren Einträge im Datenexport und konnte unter
 * ihrem Namen im Verlauf auftauchen.
 *
 * Bestehende Einträge werden einmalig zugeordnet, aber nur, wenn der Name
 * genau zu einem Account gehört. Mehrdeutige oder verwaiste Einträge bleiben
 * ohne ID und erscheinen dann in keinem Datenexport.
 */
function migrateActivityActorId(): void {
  const columns = db.prepare('PRAGMA table_info(activity_log)').all() as { name: string }[];
  // Nur beim ersten Start nach dem Update: frische Datenbanken haben die Spalte
  // schon. Der Abgleich läuft bewusst kein zweites Mal, sonst könnte ein später
  // geänderter Name alte Einträge an die falsche Person hängen.
  if (!columns.some(c => c.name === 'actor_id')) {
    db.exec('ALTER TABLE activity_log ADD COLUMN actor_id TEXT');
    const { changes } = db.prepare(`
      UPDATE activity_log
         SET actor_id = (SELECT id FROM users WHERE users.name = activity_log.actor_name)
       WHERE actor_id IS NULL
         AND (SELECT COUNT(*) FROM users WHERE users.name = activity_log.actor_name) = 1
    `).run();
    console.log(`✅ activity_log migrated (actor_id, ${changes} Einträge zugeordnet)`);
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_id)');
}

/**
 * News, Termine und Abstimmungen überleben das Löschen ihres Autors.
 *
 * Vorher: notes und events hingen per ON DELETE CASCADE am Account. Wer einen
 * Admin löschte, löschte unbemerkt dessen News und Termine mit. polls stand auf
 * NOT NULL + ON DELETE SET NULL, was sich widerspricht: Accounts mit eigener
 * Abstimmung ließen sich gar nicht löschen (auch nicht per „Konto löschen“).
 *
 * Jetzt: created_by_id ist überall optional und wird beim Löschen geleert.
 * Der Name der Person steht weiterhin in created_by_name.
 *
 * SQLite kann eine Spalte nicht nachträglich ändern, deshalb wird jede Tabelle
 * einmal neu aufgebaut (Vorgehen nach sqlite.org/lang_altertable.html). Dabei
 * müssen die Fremdschlüssel aus sein, sonst nimmt DROP TABLE polls alle
 * abgegebenen Stimmen (poll_votes, ON DELETE CASCADE) mit.
 */
function migrateAuthorColumns(): void {
  const targets: Record<string, string> = {
    notes: `
      CREATE TABLE notes_new (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_by_name TEXT NOT NULL
      )`,
    events: `
      CREATE TABLE events_new (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        description TEXT,
        public INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_by_name TEXT NOT NULL,
        end_date TEXT,
        start_time TEXT,
        end_time TEXT,
        color TEXT
      )`,
    polls: `
      CREATE TABLE polls_new (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
  };

  const needsRebuild = (table: string) => {
    const column = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; notnull: number }[])
      .find(c => c.name === 'created_by_id');
    const fk = (db.prepare(`PRAGMA foreign_key_list(${table})`).all() as { from: string; on_delete: string }[])
      .find(f => f.from === 'created_by_id');
    return column?.notnull === 1 || fk?.on_delete !== 'SET NULL';
  };

  const pending = Object.keys(targets).filter(needsRebuild);
  if (pending.length === 0) return;

  // foreign_keys lässt sich nur außerhalb einer Transaktion umschalten.
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      for (const table of pending) {
        db.exec(targets[table]);
        const columns = (db.prepare(`PRAGMA table_info(${table}_new)`).all() as { name: string }[])
          .map(c => c.name).join(', ');
        db.exec(`INSERT INTO ${table}_new (${columns}) SELECT ${columns} FROM ${table}`);
        db.exec(`DROP TABLE ${table}`);
        db.exec(`ALTER TABLE ${table}_new RENAME TO ${table}`);
      }
      // Bricht die ganze Migration ab, falls danach ein Verweis ins Leere zeigt.
      const broken = db.prepare('PRAGMA foreign_key_check').all();
      if (broken.length > 0) throw new Error(`Migration abgebrochen: ${broken.length} ungültige Verweise`);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
  console.log(`✅ ${pending.join(', ')} migrated (created_by_id optional, ON DELETE SET NULL)`);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
}
