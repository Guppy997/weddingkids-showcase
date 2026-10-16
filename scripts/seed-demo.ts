/**
 * Legt eine Demo-Datenbank mit frei erfundenen Daten an (Team, Hochzeiten,
 * Abstimmungen, News, Termine) — zum Ausprobieren und für Screenshots.
 *
 *   npm run seed:demo          (nutzt DB_PATH aus der .env)
 *   DB_PATH=./data/demo.db npm run seed:demo
 *
 * Sicherheitsnetz: schreibt nur in eine NEUE Datei. Existiert die Datei
 * bereits, bricht das Skript ab — eine echte Datenbank wird nie verändert.
 * Login für alle Demo-Accounts: Passwort „demo1234“ (Admin: lena / sophie).
 */
import 'dotenv/config';
import fs from 'node:fs';
import bcrypt from 'bcrypt';

const dbPath = process.env.DB_PATH;
if (!dbPath) {
  console.error('Bitte DB_PATH angeben, z. B. DB_PATH=./data/demo.db npm run seed:demo');
  process.exit(1);
}
if (fs.existsSync(dbPath)) {
  console.error(`Abbruch: ${dbPath} existiert bereits. Das Demo-Seed schreibt nur in eine neue Datei.`);
  process.exit(1);
}

// database.ts liest DB_PATH beim Import — daher erst nach der Prüfung laden.
const { initializeDatabase, getDb } = await import('../src/server/database.js');
initializeDatabase();
const db = getDb();

const PASSWORD_HASH = bcrypt.hashSync('demo1234', 10);

const team = [
  { id: 'demo-lena',   username: 'lena',   name: 'Lena Hoffmann',  role: 'Admin', department: 'Leitung',        color: '#008080' },
  { id: 'demo-sophie', username: 'sophie', name: 'Sophie Wagner',  role: 'Admin', department: 'Leitung',        color: '#C97B84' },
  { id: 'demo-marie',  username: 'marie',  name: 'Marie Becker',   role: 'Staff', department: 'Kinderbetreuung', color: '#E0A458' },
  { id: 'demo-jonas',  username: 'jonas',  name: 'Jonas Schulz',   role: 'Staff', department: 'Kinderbetreuung', color: '#6A8EAE' },
  { id: 'demo-emma',   username: 'emma',   name: 'Emma Fischer',   role: 'Staff', department: 'Kinderbetreuung', color: '#8FBF9F' },
  { id: 'demo-paul',   username: 'paul',   name: 'Paul Weber',     role: 'Staff', department: 'Kinderbetreuung', color: '#B38BCB' },
  { id: 'demo-hannah', username: 'hannah', name: 'Hannah Koch',    role: 'Staff', department: 'Kinderbetreuung', color: '#D98E73' },
  { id: 'demo-finn',   username: 'finn',   name: 'Finn Richter',   role: 'Staff', department: 'Kinderbetreuung', color: '#5FA8A0' },
] as const;

const insertUser = db.prepare(
  `INSERT INTO users (id, username, name, password_hash, role, department, status, avatar_color)
   VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
);
for (const u of team) insertUser.run(u.id, u.username, u.name, PASSWORD_HASH, u.role, u.department, u.color);

// Eine offene Zugangsanfrage, damit der Freigabe-Bereich etwas zeigt
db.prepare(
  `INSERT INTO users (id, username, name, password_hash, role, department, status)
   VALUES ('demo-tom', 'tom', 'Tom Neumann', ?, 'Staff', 'Kinderbetreuung', 'pending')`
).run(PASSWORD_HASH);

type Vote = [staffId: string, status: 'Ja' | 'Nein' | 'Vielleicht', comment?: string];
const weddings: {
  id: string; couple: string; date: string; time: string; location: string;
  status: 'Anfrage' | 'Gebucht' | 'Geplant' | 'Abgesagt'; children: number; staff: number;
  notes?: string; votes?: Vote[]; assigned?: string[];
}[] = [
  { id: 'demo-w1', couple: 'Clara & Felix', date: '2026-05-16', time: '15:00 Uhr - 23:00 Uhr; 8 Stunden', location: 'Schloss Lindenhain', status: 'Geplant', children: 9, staff: 2, assigned: ['demo-marie', 'demo-jonas'] },
  { id: 'demo-w2', couple: 'Nina & David', date: '2026-06-20', time: '16:00 Uhr - 22:00 Uhr; 6 Stunden', location: 'Gut Eichenhof', status: 'Geplant', children: 6, staff: 2, assigned: ['demo-emma', 'demo-paul'] },
  { id: 'demo-w3', couple: 'Sarah & Lukas', date: '2026-08-08', time: '14:00 Uhr - 22:00 Uhr; 8 Stunden', location: 'Hofgut Sonnenhang', status: 'Geplant', children: 12, staff: 3, assigned: ['demo-marie', 'demo-hannah', 'demo-finn'] },
  { id: 'demo-w4', couple: 'Anna & Elias', date: '2026-09-05', time: '16:00 Uhr - 23:00 Uhr; 7 Stunden', location: 'Weingut am See', status: 'Abgesagt', children: 4, staff: 1 },
  { id: 'demo-w5', couple: 'Laura & Max', date: '2026-10-17', time: '15:30 Uhr - 23:30 Uhr; 8 Stunden', location: 'Landgut Wiesental', status: 'Geplant', children: 10, staff: 2,
    notes: 'Zwei Kleinkinder unter 2 Jahren, Mittagsschlaf einplanen.',
    votes: [['demo-marie', 'Ja'], ['demo-jonas', 'Ja'], ['demo-emma', 'Nein', 'Bin auf einer anderen Feier']], assigned: ['demo-marie', 'demo-jonas'] },
  { id: 'demo-w6', couple: 'Mia & Ben', date: '2026-11-07', time: '16:00 Uhr - 00:00 Uhr; 8 Stunden', location: 'Alte Mühle', status: 'Gebucht', children: 8, staff: 2,
    votes: [['demo-paul', 'Ja'], ['demo-hannah', 'Vielleicht', 'Abends Termin, mittags 3 Std. möglich'], ['demo-finn', 'Ja'], ['demo-emma', 'Nein']] },
  { id: 'demo-w7', couple: 'Katharina & Jan', date: '2026-12-12', time: '15:00 Uhr - 21:00 Uhr; 6 Stunden', location: 'Hotel Krone', status: 'Anfrage', children: 5, staff: 1,
    votes: [['demo-jonas', 'Vielleicht', 'Hängt von meiner Prüfung ab']] },
  { id: 'demo-w8', couple: 'Johanna & Moritz', date: '2027-04-24', time: '14:00 Uhr - 20:00 Uhr; 6 Stunden', location: 'Gartenhaus Rosental', status: 'Anfrage', children: 7, staff: 2 },
  { id: 'demo-w9', couple: 'Theresa & Simon', date: '2027-05-22', time: '16:00 Uhr - 23:00 Uhr; 7 Stunden', location: 'Kloster Talblick', status: 'Anfrage', children: 11, staff: 3,
    votes: [['demo-marie', 'Ja'], ['demo-paul', 'Ja', 'Gerne mit Bastelprogramm']] },
  { id: 'demo-w10', couple: 'Carla & Leon', date: '2027-06-19', time: '15:00 Uhr - 23:00 Uhr; 8 Stunden', location: 'Seehaus am Ufer', status: 'Gebucht', children: 9, staff: 2,
    votes: [['demo-emma', 'Ja'], ['demo-finn', 'Ja']] },
];

const insertWedding = db.prepare(
  `INSERT INTO weddings (id, couple_names, initials, date, betreuungszeit, location, status, children_count, staff_needed, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertVote = db.prepare(
  `INSERT INTO assignments (wedding_id, staff_id, status, assigned, comment) VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(wedding_id, staff_id) DO UPDATE SET status = excluded.status, assigned = excluded.assigned, comment = excluded.comment`
);
for (const w of weddings) {
  const initials = w.couple.split('&').map(n => n.trim()[0]).join('&');
  insertWedding.run(w.id, w.couple, initials, w.date, w.time, w.location, w.status, w.children, w.staff, w.notes ?? '');
  for (const [staffId, status, comment] of w.votes ?? []) insertVote.run(w.id, staffId, status, 0, comment ?? null);
  for (const staffId of w.assigned ?? []) insertVote.run(w.id, staffId, 'Ja', 1, null);
}

db.prepare(`INSERT INTO notes (id, text, created_by_id, created_by_name) VALUES (?, ?, ?, ?)`)
  .run('demo-n1', 'Neue Bastelkisten sind da! Bitte vor jeder Hochzeit im Lager abholen.', 'demo-lena', 'Lena Hoffmann');
db.prepare(`INSERT INTO notes (id, text, created_by_id, created_by_name) VALUES (?, ?, ?, ?)`)
  .run('demo-n2', 'Erste-Hilfe-Auffrischung am 14. November — Anmeldung über die Abstimmung.', 'demo-sophie', 'Sophie Wagner');

db.prepare(`INSERT INTO polls (id, question, created_by_id, created_by_name) VALUES (?, ?, ?, ?)`)
  .run('demo-p1', 'Bist du beim Erste-Hilfe-Kurs am 14. November dabei?', 'demo-sophie', 'Sophie Wagner');
const insertPollVote = db.prepare(`INSERT INTO poll_votes (poll_id, user_id, vote) VALUES ('demo-p1', ?, ?)`);
for (const [id, vote] of [['demo-marie', 'Ja'], ['demo-jonas', 'Ja'], ['demo-emma', 'Vielleicht'], ['demo-finn', 'Nein']]) insertPollVote.run(id, vote);

const insertEvent = db.prepare(
  `INSERT INTO events (id, title, date, start_time, end_time, description, color, public, created_by_id, created_by_name)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'demo-lena', 'Lena Hoffmann')`
);
insertEvent.run('demo-e1', 'Teamtreffen', '2026-10-24', '18:00', '20:00', 'Saisonrückblick und Planung 2027', '#008080', 1);
insertEvent.run('demo-e2', 'Erste-Hilfe-Kurs', '2026-11-14', '10:00', '16:00', 'Für alle Betreuer:innen', '#C97B84', 1);
insertEvent.run('demo-e3', 'Steuerberater', '2026-10-29', '09:00', '10:00', 'Nur intern', '#6A8EAE', 0);

const insertTodo = db.prepare(`INSERT INTO todo_items (id, wedding_id, text, done, sort_order) VALUES (?, ?, ?, ?, ?)`);
insertTodo.run('demo-t1', 'demo-w5', 'Bastelmaterial packen', 1, 0);
insertTodo.run('demo-t2', 'demo-w5', 'Ablaufplan an Brautpaar schicken', 0, 1);
insertTodo.run('demo-t3', 'demo-w6', 'Betreuung einteilen', 0, 0);

console.log(`✅ Demo-Datenbank angelegt: ${dbPath}`);
console.log('   Login: lena / demo1234 (Admin) · marie / demo1234 (Mitarbeiterin)');
