// SQLite gibt Timestamps als "YYYY-MM-DD HH:MM:SS" zurück (Leerzeichen, kein T/Z).
// Für JS-Vergleiche und JSON-Konsistenz wandeln wir in echtes ISO 8601 um.
export const toISO = (s: string | null | undefined): string | undefined =>
  s ? s.replace(' ', 'T') + 'Z' : undefined;
