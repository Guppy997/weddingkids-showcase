import { describe, it, expect } from 'vitest';
import { isWeddingOver } from '../../src/lib/weddingDates';

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
