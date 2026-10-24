import type { Wedding } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * true, wenn das Hochzeitsdatum (Mitternacht UTC) mehr als 24 Stunden
 * zurückliegt — unabhängig vom Status. Eine Hochzeit bleibt so den ganzen
 * Hochzeitstag über sichtbar und verschwindet in der Nacht danach.
 */
export function isWeddingOver(wedding: Pick<Wedding, 'date'>, now: number = Date.now()): boolean {
  return new Date(wedding.date).getTime() < now - ONE_DAY_MS;
}
