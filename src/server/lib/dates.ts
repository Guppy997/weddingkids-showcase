// SQLite gibt Timestamps als "YYYY-MM-DD HH:MM:SS" zurück (Leerzeichen, kein T/Z).
// Für JS-Vergleiche und JSON-Konsistenz wandeln wir in echtes ISO 8601 um.
export const toISO = (s: string | null | undefined): string | undefined =>
  s ? s.replace(' ', 'T') + 'Z' : undefined;

/**
 * Datum bzw. Zeitraum einer Hochzeit für Push-Texte, z. B. "10. April 2026" oder
 * "10. – 12. April 2026". "YYYY-MM-DD" wird als UTC-Mitternacht gelesen → auch in
 * UTC formatieren, sonst zeigt ein Server westlich von UTC den Vortag an.
 */
export function formatWeddingDateDE(date: string, endDate?: string | null): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString('de-DE', { ...opts, timeZone: 'UTC' });
  const full = (iso: string) => fmt(iso, { day: 'numeric', month: 'long', year: 'numeric' });
  if (!endDate || endDate <= date) return full(date);
  const startPart = date.slice(0, 7) === endDate.slice(0, 7)
    ? `${Number(date.slice(8, 10))}.`
    : date.slice(0, 4) === endDate.slice(0, 4)
      ? fmt(date, { day: 'numeric', month: 'long' })
      : full(date);
  return `${startPart} – ${full(endDate)}`;
}
