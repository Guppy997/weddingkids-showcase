import React from 'react';
import type { Wedding, AdminEvent } from '../../types';
import { WEEKDAY_LABELS, getDateKey } from './calendarUtils';

interface MonthGridProps {
  monthDays: Date[];
  monthCursor: Date;
  weddingsByDate: Record<string, Wedding[]>;
  eventsByDate: Record<string, AdminEvent[]>;
  selectedDateKey: string | null;
  setSelectedDateKey: (key: string) => void;
  isAssignedToWedding: (wedding: Wedding) => boolean;
  isAdmin?: boolean;
}

/** Monatsraster mit farbiger Markierung pro Tag und Legende. */
export const MonthGrid: React.FC<MonthGridProps> = ({
  monthDays, monthCursor, weddingsByDate, eventsByDate, selectedDateKey, setSelectedDateKey, isAssignedToWedding, isAdmin,
}) => (
  <>
    <div className="grid grid-cols-7 gap-1 mb-2">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="text-center text-[11px] font-bold text-gray-500 py-1">
          {label}
        </div>
      ))}
    </div>

    <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
        const key = getDateKey(day);
            const weddingItems = weddingsByDate[key] ?? [];
            // Filter: keine alten Auto-Wedding-Events (wedding-* Prefix oder Titel-Duplikate)
            const visibleEvents = (eventsByDate[key] ?? []).filter(ev => {
              if (ev.id.startsWith('wedding-')) return false;
              if (weddingItems.some(w => w.coupleNames === ev.title)) return false;
              return true;
            });
            const dayEvents = [...weddingItems, ...visibleEvents];
        const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
        const isSelected = selectedDateKey === key;
        const isToday = key === getDateKey(new Date());
            const hasEvents = dayEvents.length > 0;
            const hasAssignedEvents = weddingItems.some((wedding) => isAssignedToWedding(wedding));
            // Tag enthält ausschließlich Anfragen (keine bestätigten / eingeteilten Hochzeiten)
            // → eigene gelbe Markierung statt grau, signalisiert "noch offen"
            const onlyRequested = weddingItems.length > 0 && weddingItems.every(w => w.status === 'Anfrage');
            // Tag enthält NUR Standalone-Termine (keine Hochzeiten) → Termin-Farbe nutzen
            const onlyStandaloneEvents = weddingItems.length === 0 && visibleEvents.length > 0;
            const firstEventColor = visibleEvents[0]?.color || '#BFD9E6';
            // Anzahl Hochzeiten (für Punkte-Anzeige)
            const weddingCount = weddingItems.length;

        // Hierarchie der visuellen States (von stark → leicht):
        //   1. Eingeteilt    → solides Türkis, weißer Text  (sehr auffällig)
        //   2. Nur Anfragen  → gelb (wie "Vielleicht")       (Anfrage offen)
        //   3. Nur Termine   → Termin-Farbe getönt (1. Termin gewinnt)
        //   4. Hochzeit/Event → mittleres Grau              (deutlich sichtbar, aber nicht "deins")
        //   5. Aktueller Monat ohne Events → weiß
        //   6. Anderer Monat → ausgegraut
        let bg: string;
        let inlineBg: React.CSSProperties = {};
        if (hasAssignedEvents) {
          bg = 'border-primary bg-primary text-white shadow-sm hover:opacity-90';
        } else if (onlyRequested) {
          bg = 'border-[#F8D8A8] bg-[#FBF4E0] text-[#8A6A30] hover:brightness-95';
        } else if (onlyStandaloneEvents) {
          // Eigene Termin-Farbe als Hintergrund. Border etwas dunkler aus
          // gleicher Farbe – machen wir via CSS-Filter beim Hover, einfach.
          bg = 'text-gray-800 hover:brightness-95 border';
          inlineBg = { backgroundColor: firstEventColor, borderColor: firstEventColor };
        } else if (hasEvents) {
          bg = 'border-gray-300 bg-gray-200 text-gray-800 hover:bg-gray-300';
        } else if (isCurrentMonth) {
          bg = 'border-gray-100 bg-white text-gray-800 hover:bg-gray-50';
        } else {
          bg = 'border-transparent bg-gray-50 text-gray-300';
        }
        // Selected überschreibt nicht die Farbe, sondern setzt einen Ring drauf
        const ring = isSelected ? 'ring-2 ring-primary ring-offset-1' : '';
        // Heute: dezenter zusätzlicher Outline-Ring, falls nicht selected
        const todayRing = isToday && !isSelected ? 'ring-1 ring-gray-400' : '';

        return (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedDateKey(key)}
            style={inlineBg}
            className={`min-h-[44px] rounded-lg border text-xs font-bold flex flex-col items-center justify-center relative transition ${bg} ${ring} ${todayRing}`}
          >
            <span>{day.getDate()}</span>
            {hasEvents && (
              <span className="mt-1 flex gap-0.5">
                {Array.from({ length: Math.min(Math.max(weddingCount, visibleEvents.length, 1), 3) }).map((_, i) => {
                  // Termin-Punkte in Termin-Farbe, Hochzeits-Punkte in Standard
                  let dotColor = 'bg-gray-500';
                  let dotStyle: React.CSSProperties = {};
                  if (hasAssignedEvents) dotColor = 'bg-white';
                  else if (onlyRequested) dotColor = 'bg-[#8A6A30]';
                  else if (onlyStandaloneEvents) {
                    // Eigene Farbe pro Punkt, sonst dunklere Variante der Cell-Farbe
                    const ev = visibleEvents[i];
                    dotColor = '';
                    dotStyle = { backgroundColor: ev?.color || firstEventColor, filter: 'brightness(0.7)' };
                  }
                  return (
                    <span
                      key={i}
                      style={dotStyle}
                      className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                    />
                  );
                })}
              </span>
            )}
          </button>
        );
      })}
    </div>

    {/* Legende — "Anfrage offen" sehen nur Admins, da Staff Anfragen im
        Kalender nicht angezeigt bekommen. */}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-primary border border-primary" />
        Eingeteilt
      </span>
      {isAdmin && (
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#FBF4E0] border border-[#F8D8A8]" />
          Anfrage offen
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
        Termin
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-white ring-1 ring-gray-400" />
        Heute
      </span>
    </div>
  </>
);
