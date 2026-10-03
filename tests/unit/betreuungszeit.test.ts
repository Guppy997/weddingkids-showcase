import { describe, it, expect } from 'vitest';
import {
  parseBetreuungszeit, calculateHours, formatHours, buildBetreuungszeit,
} from '../../src/components/admin/betreuungszeit';

describe('Betreuungszeit', () => {
  it('berechnet die Dauer, auch über Mitternacht', () => {
    expect(calculateHours('16:00', '22:00')).toBe(6);
    expect(calculateHours('16:00', '01:00')).toBe(9);
    expect(calculateHours('15:00', '17:20')).toBe(2.25); // auf Viertelstunde gerundet
  });

  it('liefert 0 bei fehlenden oder ungültigen Zeiten', () => {
    expect(calculateHours('', '22:00')).toBe(0);
    expect(calculateHours('ab:cd', '22:00')).toBe(0);
  });

  it('formatiert Stunden auf Deutsch', () => {
    expect(formatHours(1)).toBe('1 Stunde');
    expect(formatHours(2.5)).toBe('2,5 Stunden');
    expect(formatHours(0)).toBe('');
  });

  it('baut das Speicherformat und liest es wieder ein', () => {
    const stored = buildBetreuungszeit('15:00', '17:30');
    expect(stored).toBe('15:00 Uhr - 17:30 Uhr; 2,5 Stunden');
    expect(parseBetreuungszeit(stored)).toEqual({ start: '15:00', end: '17:30' });
  });

  it('liest auch einstellige Stunden und leere Werte', () => {
    expect(parseBetreuungszeit('9:00 Uhr - 13:00 Uhr')).toEqual({ start: '09:00', end: '13:00' });
    expect(parseBetreuungszeit('')).toEqual({ start: '', end: '' });
    expect(buildBetreuungszeit('', '13:00')).toBe('');
  });
});
