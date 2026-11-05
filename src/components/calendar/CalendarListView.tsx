import React from 'react';
import { ChevronDown, ChevronUp, Heart } from 'lucide-react';
import type { Wedding } from '../../types';
import { WeddingInfoBlock } from '../WeddingInfoBlock';
import { WEDDING_STATUS_BADGE } from '../../lib/status';
import { parseDateKey } from './calendarUtils';
import { isMultiDayWedding, weddingLastDay } from '../../lib/weddingDates';

interface CalendarListViewProps {
  sorted: Wedding[];
  currentUser?: { id: string };
  isAdmin?: boolean;
  expandedWeddingId: string | null;
  setExpandedWeddingId: (id: string | null) => void;
  onWeddingClick: (wedding: Wedding) => void;
}

/** Listen-Ansicht: „Meine Einsätze“ zuerst, darunter alle weiteren Hochzeiten. */
export const CalendarListView: React.FC<CalendarListViewProps> = ({
  sorted, currentUser, isAdmin, expandedWeddingId, setExpandedWeddingId, onWeddingClick,
}) => {
  const myWeddings = currentUser ? sorted.filter(w => w.assignedStaffIds.includes(currentUser.id)) : [];
  const otherWeddings = currentUser ? sorted.filter(w => !w.assignedStaffIds.includes(currentUser.id)) : sorted;

  // Shared card renderer — eingeklappt: nur Datum + Status, Tap erweitert
  const renderCard = (wedding: Wedding, mine: boolean) => {
    const d = parseDateKey(wedding.date);
    // Mehrtägig: "10.–12." bzw. über den Monatswechsel "30.–2." (Monat vom Start)
    const dayLabel = isMultiDayWedding(wedding)
      ? `${d.getDate()}.–${parseDateKey(weddingLastDay(wedding)).getDate()}.`
      : String(d.getDate());
    const statusClass = WEDDING_STATUS_BADGE[wedding.status];
    const isExpanded = expandedWeddingId === wedding.id;
    return (
      <div
        key={wedding.id}
        className={`rounded-xl border bg-white shadow-sm overflow-hidden ${mine ? 'border-primary/40' : 'border-gray-100'}`}
      >
        {/* Eingeklappte Header-Zeile: Datum + Name + Status + Chevron */}
        <button
          type="button"
          onClick={() => setExpandedWeddingId(isExpanded ? null : wedding.id)}
          className="w-full flex items-center text-left active:scale-[0.98] transition-transform p-3"
        >
          {/* Date block */}
          <div className={`min-w-[42px] flex flex-col items-center justify-center mr-3 ${mine ? 'text-primary' : 'text-gray-500'}`}>
            <span className={`font-black leading-none whitespace-nowrap ${dayLabel.length > 2 ? 'text-sm' : 'text-lg'}`}>{dayLabel}</span>
            <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString('de-DE', { month: 'short' })}</span>
          </div>

          {/* Name — einheitlicher Grauton für alle Karten, "Meine"
              unterscheidet sich nur noch durch Datum-Farbe + Rahmen. */}
          <p className="flex-1 min-w-0 truncate font-bold text-gray-700">
            {wedding.coupleNames}
          </p>

          {/* Status badge */}
          <span className={`ml-2 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shrink-0 ${statusClass}`}>
            {wedding.status}
          </span>
          {isExpanded
            ? <ChevronUp size={16} className="text-gray-400 ml-2 shrink-0" />
            : <ChevronDown size={16} className="text-gray-400 ml-2 shrink-0" />}
        </button>

        {/* Aufgeklappter Bereich: alle Details */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-100">
            <WeddingInfoBlock wedding={wedding} size="compact" />
            <button
              type="button"
              onClick={() => onWeddingClick(wedding)}
              className="mt-3 w-full h-10 rounded-xl bg-primary/15 text-primary text-sm font-bold shadow-sm hover:brightness-95 active:scale-[0.98] transition"
            >
              Details öffnen
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── Meine Einsätze ── */}
      {myWeddings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Heart size={13} className="text-primary" fill="currentColor" />
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              Meine Einsätze ({myWeddings.length})
            </p>
          </div>
          <div className="space-y-2">
            {myWeddings.map(w => renderCard(w, true))}
          </div>
        </div>
      )}

      {/* ── Weitere Hochzeiten (keine Duplikate) ── */}
      {otherWeddings.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            {myWeddings.length > 0 ? 'Weitere Hochzeiten' : 'Alle Hochzeiten'} ({otherWeddings.length})
          </p>
          <div className="space-y-2">
            {otherWeddings.map(w => renderCard(w, false))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {myWeddings.length === 0 && otherWeddings.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">Keine Hochzeiten geplant.</p>
      )}

      {/* Empty state für Staff ohne Einsätze */}
      {!isAdmin && myWeddings.length === 0 && otherWeddings.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-primary" />
          </div>
          <p className="font-bold text-gray-700">Noch keine Einsätze</p>
          <p className="text-sm text-gray-400 mt-1">Du wurdest noch keiner Hochzeit zugeteilt.</p>
        </div>
      )}
    </>
  );
};
