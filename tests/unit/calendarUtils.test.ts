import { describe, it, expect } from 'vitest';
import { createMonthGrid, getDateKey, bucketEventsByDate, addToDateRange } from '../../src/components/calendar/calendarUtils';
import type { AdminEvent } from '../../src/types';

const event = (over: Partial<AdminEvent>): AdminEvent => ({
  id: 'e', title: 'Termin', date: '2026-10-24', public: true, createdAt: '', createdBy: '', ...over,
} as AdminEvent);

describe('Monatsraster', () => {
  it('hat 6 Wochen und beginnt an einem Montag', () => {
    const days = createMonthGrid(new Date(2026, 9, 1)); // Oktober 2026, 1. ist ein Donnerstag
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    expect(getDateKey(days[0])).toBe('2026-09-28');
    expect(getDateKey(days[3])).toBe('2026-10-01');
  });

  it('formatiert Datums-Schlüssel mit führenden Nullen', () => {
    expect(getDateKey(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});

describe('Termine pro Tag', () => {
  it('legt mehrtägige Termine auf jeden Tag', () => {
    const buckets = bucketEventsByDate([event({ id: 'w', date: '2026-10-24', endDate: '2026-10-26' })], true);
    expect(Object.keys(buckets).sort()).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
  });

  it('zeigt private Termine nur, wenn erlaubt', () => {
    const events = [event({ id: 'a', public: true }), event({ id: 'b', public: false })];
    expect(bucketEventsByDate(events, false)['2026-10-24'].map(e => e.id)).toEqual(['a']);
    expect(bucketEventsByDate(events, true)['2026-10-24'].map(e => e.id)).toEqual(['a', 'b']);
  });

  it('begrenzt absurd lange Termine auf 60 Tage', () => {
    const buckets = bucketEventsByDate([event({ date: '2026-01-01', endDate: '2026-12-31' })], true);
    expect(Object.keys(buckets)).toHaveLength(60);
  });
});

describe('addToDateRange (mehrtägige Hochzeiten im Kalender)', () => {
  it('legt den Eintrag auf jeden Tag inkl. Start und Ende', () => {
    const bucket: Record<string, string[]> = {};
    addToDateRange(bucket, 'w1', '2026-10-23', '2026-10-26'); // über die Zeitumstellung
    expect(Object.keys(bucket)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']);
    addToDateRange(bucket, 'w2', '2026-10-24', null);
    expect(bucket['2026-10-24']).toEqual(['w1', 'w2']);
  });
});
