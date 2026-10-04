import type { AdminEvent } from '../../types';

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Datum als "YYYY-MM-DD" in lokaler Zeit (Schlüssel für Tages-Buckets). */
export const getDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * "YYYY-MM-DD" als lokale Mitternacht. `new Date('2026-10-24')` liest den String
 * als UTC — in Deutschland ist das 01:00/02:00 Uhr, und über die Zeitumstellung
 * im Oktober verrutscht ein Tages-Cursor so um eine Stunde hinter das End-Datum.
 */
export const parseDateKey = (key: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(key);
};

/** 6 Wochen à 7 Tage (Mo–So) rund um den Monat von `baseDate`. */
export const createMonthGrid = (baseDate: Date) => {
  const firstDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const mondayStartOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstDayOfMonth);
  gridStart.setDate(firstDayOfMonth.getDate() - mondayStartOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    days.push(day);
  }

  return days;
};

/**
 * Ordnet Termine den Tagen zu. Mehrtägige Termine erscheinen an JEDEM Tag
 * zwischen Start- und End-Datum (inkl.). Private Termine nur für Admins.
 */
export function bucketEventsByDate(events: AdminEvent[] | undefined, includePrivate: boolean) {
  const bucket: Record<string, AdminEvent[]> = {};
  (events || []).forEach((ev) => {
    if (!ev) return;
    if (!includePrivate && !ev.public) return;
    const start = parseDateKey(ev.date);
    const end = ev.endDate ? parseDateKey(ev.endDate) : start;
    // Sicherheits-Cap: max 60 Tage Span, falls jemand absurd lange Termine anlegt
    const maxIters = 60;
    let iter = 0;
    const cursor = new Date(start);
    while (cursor <= end && iter < maxIters) {
      const key = getDateKey(cursor);
      if (!bucket[key]) bucket[key] = [];
      bucket[key].push(ev);
      cursor.setDate(cursor.getDate() + 1);
      iter++;
    }
  });
  return bucket;
}
