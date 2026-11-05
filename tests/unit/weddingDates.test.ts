import { describe, it, expect } from 'vitest';
import { isWeddingOver, isMultiDayWedding, formatWeddingDateRange } from '../../src/lib/weddingDates';
import { formatWeddingDateDE } from '../../src/server/lib/dates';

const now = new Date('2026-10-06T12:00:00Z').getTime();

describe('isWeddingOver (Board blendet vergangene Hochzeiten aus)', () => {
  it('vergangene Hochzeit ist vorbei — egal welcher Status', () => {
    expect(isWeddingOver({ date: '2026-09-05' }, now)).toBe(true);
  });

  it('zukünftige Hochzeit ist nicht vorbei', () => {
    expect(isWeddingOver({ date: '2026-11-07' }, now)).toBe(false);
  });

  it('bleibt am Hochzeitstag sichtbar und verschwindet in der Nacht danach', () => {
    expect(isWeddingOver({ date: '2026-10-06' }, now)).toBe(false);
    expect(isWeddingOver({ date: '2026-10-05' }, new Date('2026-10-05T23:00:00Z').getTime())).toBe(false);
    expect(isWeddingOver({ date: '2026-10-05' }, now)).toBe(true);
  });
});

describe('mehrtägige Hochzeiten', () => {
  const weekend = { date: '2026-04-10', endDate: '2026-04-12' };

  it('bleibt bis zum letzten Tag sichtbar', () => {
    expect(isWeddingOver(weekend, new Date('2026-04-11T12:00:00Z').getTime())).toBe(false);
    expect(isWeddingOver(weekend, new Date('2026-04-12T23:00:00Z').getTime())).toBe(false);
    expect(isWeddingOver(weekend, new Date('2026-04-13T12:00:00Z').getTime())).toBe(true);
  });

  it('zeigt den Zeitraum bzw. bei einem Tag nur das Datum', () => {
    expect(isMultiDayWedding(weekend)).toBe(true);
    expect(formatWeddingDateRange(weekend)).toBe('10.4.2026 – 12.4.2026');
    expect(formatWeddingDateRange({ date: '2026-04-10', endDate: null })).toBe('10.4.2026');
    expect(isMultiDayWedding({ date: '2026-04-10', endDate: '2026-04-10' })).toBe(false);
  });
});

describe('Zeitraum in Push-Texten', () => {
  it('fasst gleichen Monat/gleiches Jahr zusammen', () => {
    expect(formatWeddingDateDE('2026-04-10')).toBe('10. April 2026');
    expect(formatWeddingDateDE('2026-04-10', '2026-04-12')).toBe('10. – 12. April 2026');
    expect(formatWeddingDateDE('2026-04-30', '2026-05-02')).toBe('30. April – 2. Mai 2026');
    expect(formatWeddingDateDE('2026-12-31', '2027-01-01')).toBe('31. Dezember 2026 – 1. Januar 2027');
  });
});
