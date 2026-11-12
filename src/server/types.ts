// Zeilen-Typen der SQLite-Tabellen (siehe database.ts).
// better-sqlite3 liefert untypisierte Objekte; mit diesen Typen werden die
// Abfrage-Ergebnisse explizit gemacht, z. B. `.get(id) as UserRow | undefined`.

export interface UserRow {
  id: string;
  username: string;
  name: string;
  password_hash: string;
  role: 'Admin' | 'Staff';
  department: string;
  status: 'active' | 'pending';
  avatar_color: string;
  avatar_image: string | null;
  password_changed_at: string | null;
  created_at: string;
}

export interface WeddingRow {
  id: string;
  couple_names: string;
  initials: string;
  date: string;
  end_date: string | null;
  betreuungszeit: string | null;
  location: string;
  status: 'Anfrage' | 'Gebucht' | 'Geplant' | 'Abgesagt';
  previous_status: string | null;
  children_count: number;
  staff_needed: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRow {
  id: number;
  wedding_id: string;
  staff_id: string;
  status: 'Ja' | 'Nein' | 'Vielleicht' | 'Ausstehend';
  assigned: 0 | 1;
  comment: string | null;
}

export interface NoteRow {
  id: string;
  text: string;
  created_at: string;
  /** null, wenn der Account der Autorin inzwischen gelöscht ist */
  created_by_id: string | null;
  created_by_name: string;
}

export interface TodoRow {
  id: string;
  wedding_id: string;
  text: string;
  done: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  wedding_id: string | null;
  event_type: string;
  description: string;
  actor_name: string;
  /** Account-ID des Auslösers; null bei Einträgen des Servers und nicht zuordenbaren Altbeständen */
  actor_id: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  time: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  color: string | null;
  public: 0 | 1;
  created_at: string;
  /** null, wenn der Account der Autorin inzwischen gelöscht ist */
  created_by_id: string | null;
  created_by_name: string;
}

export interface PollRow {
  id: string;
  question: string;
  /** null, wenn der Account der Autorin inzwischen gelöscht ist */
  created_by_id: string | null;
  created_by_name: string;
  created_at: string;
}

export interface PollVoteRow {
  poll_id: string;
  user_id: string;
  vote: 'Ja' | 'Nein' | 'Vielleicht';
  voted_at: string;
}

export interface PushSubscriptionRow {
  id: number;
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  user_agent: string | null;
  created_at: string;
}

/** Ergebnis von `SELECT COUNT(*) as c …` */
export interface CountRow { c: number }

/** Ergebnis von `SELECT id FROM users …` */
export interface IdRow { id: string }
