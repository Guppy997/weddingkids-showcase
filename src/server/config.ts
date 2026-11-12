// Zentrale Server-Konfiguration aus der Umgebung (.env).
// Wird erst nach `dotenv/config` importiert (siehe server.ts).

const idList = (value: string | undefined): string[] =>
  (value ?? '').split(',').map(s => s.trim()).filter(Boolean);

export const PORT = Number(process.env.PORT) || 3001;
// Nur lokal lauschen: nginx leitet /api/* an 127.0.0.1 weiter.
export const HOST = process.env.HOST || '127.0.0.1';
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Versteckte System-Accounts (z. B. Wartungs-Admin, Test-Account): können sich
// einloggen, tauchen aber in keiner Liste, Abstimmung oder im Verlauf auf.
export const HIDDEN_USER_IDS = idList(process.env.HIDDEN_USER_IDS);

// Accounts, die nicht gelöscht werden dürfen (Inhaber:innen + versteckte Accounts).
export const PROTECTED_USER_IDS = [...idList(process.env.PROTECTED_USER_IDS), ...HIDDEN_USER_IDS];

// SQL-Fragment zum Ausfiltern versteckter Accounts; Parameter: ...HIDDEN_USER_IDS
export const NOT_HIDDEN_SQL = HIDDEN_USER_IDS.length
  ? ` AND id NOT IN (${HIDDEN_USER_IDS.map(() => '?').join(',')})`
  : '';

// Obergrenzen der Rate-Limits (middleware/rateLimit.ts). Überschreibbar nur für
// die Testsuite, die in Sekunden mehr Anfragen stellt als ein Mensch in einer
// Minute. Im Betrieb nicht setzen: Die Standardwerte sind der Schutz gegen
// Passwort-Raten und Spam.
const positiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};
export const AUTH_LIMIT_PER_15_MIN = positiveInt(process.env.AUTH_LIMIT_PER_15_MIN, 20);
export const WRITE_LIMIT_PER_MIN = positiveInt(process.env.WRITE_LIMIT_PER_MIN, 60);
