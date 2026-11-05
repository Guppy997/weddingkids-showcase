import type { Wedding } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Letzter Betreuungstag: End-Datum bei mehrtägigen Hochzeiten, sonst das Datum. */
export const weddingLastDay = (wedding: Pick<Wedding, 'date' | 'endDate'>): string =>
  wedding.endDate && wedding.endDate > wedding.date ? wedding.endDate : wedding.date;

/** true bei mehrtägigen Betreuungen (End-Datum nach dem Start-Datum). */
export const isMultiDayWedding = (wedding: Pick<Wedding, 'date' | 'endDate'>): boolean =>
  weddingLastDay(wedding) !== wedding.date;

/**
 * true, wenn der (letzte) Hochzeitstag (Mitternacht UTC) mehr als 24 Stunden
 * zurückliegt — unabhängig vom Status. Eine Hochzeit bleibt so den ganzen
 * Hochzeitstag über sichtbar und verschwindet in der Nacht danach; mehrtägige
 * erst nach dem letzten Tag.
 */
export function isWeddingOver(wedding: Pick<Wedding, 'date' | 'endDate'>, now: number = Date.now()): boolean {
  return new Date(weddingLastDay(wedding)).getTime() < now - ONE_DAY_MS;
}

/**
 * Datum bzw. Zeitraum für die Anzeige, z. B. "Fr., 10.04.2026" oder
 * "Fr., 10.04.2026 – So., 12.04.2026" (Format über `opts`).
 */
export function formatWeddingDateRange(
  wedding: Pick<Wedding, 'date' | 'endDate'>,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('de-DE', opts);
  return isMultiDayWedding(wedding)
    ? `${fmt(wedding.date)} – ${fmt(weddingLastDay(wedding))}`
    : fmt(wedding.date);
}
