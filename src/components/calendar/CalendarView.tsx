import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, List, Table } from 'lucide-react';
import type { Wedding, AdminEvent } from '../../types';
import { createMonthGrid, getDateKey, bucketEventsByDate } from './calendarUtils';
import { useEventForm } from './useEventForm';
import { CalendarListView } from './CalendarListView';
import { EventForm } from './EventForm';
import { MonthGrid } from './MonthGrid';
import { DayDetails } from './DayDetails';

interface CalendarViewProps {
  weddings: Wedding[];
  events?: AdminEvent[];
  onAddEvent?: (payload: Omit<AdminEvent, 'id' | 'createdAt' | 'createdBy'>) => void;
  onUpdateEvent?: (eventId: string, updates: Partial<AdminEvent>) => void;
  onDeleteEvent?: (eventId: string) => void;
  onWeddingClick: (wedding: Wedding) => void;
  currentUser?: { id: string; name: string; initials: string; department?: string };
  isAdmin?: boolean;
}

type CalendarMode = 'list' | 'month';


export const CalendarView: React.FC<CalendarViewProps> = ({ weddings, events, onAddEvent, onUpdateEvent, onDeleteEvent, onWeddingClick, currentUser, isAdmin }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Formular-Felder; editingEventId gesetzt = bestehenden Termin bearbeiten (PATCH statt POST)
  const { form, update, reset: resetEventForm, loadEvent } = useEventForm();

  // Termin in Bearbeitungs-Modus laden: alle Felder vorausfüllen, Form öffnen.
  const openEventEditor = (ev: AdminEvent) => {
    loadEvent(ev);
    setShowCreateForm(true);
  };
  const [mode, setMode] = useState<CalendarMode>('list');
  const [expandedWeddingId, setExpandedWeddingId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Admins sehen Anfragen zusätzlich gelb im Kalender. Staff sehen Anfragen
  // gar nicht — die haben dafür den eigenen "Anfragen"-Tab zum Voten und
  // sollen im Kalender nur ihre festen Einsätze + Termine sehen.
  // Abgeschlossene Hochzeiten (Datum >1 Tag her, nicht abgesagt) werden wie im
  // Board ausgeblendet — sie sind im Admin-Panel im "Abgeschlossen"-Block zu finden.
  const oneDayMs = 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - oneDayMs;
  const plannedWeddings = useMemo(
    () => {
      const allowedStatuses = isAdmin
        ? ['Gebucht', 'Geplant', 'Anfrage']
        : ['Gebucht', 'Geplant'];
      let filtered = weddings.filter(
        (w) => allowedStatuses.includes(w.status) && !(new Date(w.date).getTime() < cutoff && w.status !== 'Abgesagt')
      );
      if (!isAdmin && currentUser) {
        filtered = filtered.filter(w => w.assignedStaffIds.includes(currentUser.id));
      }
      return filtered;
    },
    [weddings, isAdmin, currentUser]
  );

  // Termine pro Tag — bei mehrtägigen Terminen wird das Event auf JEDEN Tag
  // im Range gelegt (Start- bis End-Datum inkl.).
  const eventsByDate = useMemo(() => bucketEventsByDate(events, !!isAdmin), [events, isAdmin]);

  const sorted = [...plannedWeddings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weddingsByDate = useMemo(() => {
    const bucket: Record<string, Wedding[]> = {};

    plannedWeddings.forEach((wedding) => {
      const key = getDateKey(new Date(wedding.date));
      if (!bucket[key]) {
        bucket[key] = [];
      }
      bucket[key].push(wedding);
    });

    Object.values(bucket).forEach((items) => {
      items.sort((a, b) => a.coupleNames.localeCompare(b.coupleNames, 'de'));
    });

    return bucket;
  }, [plannedWeddings]);

  const monthDays = useMemo(() => createMonthGrid(monthCursor), [monthCursor]);

  const selectedDayWeddings = selectedDateKey ? weddingsByDate[selectedDateKey] ?? [] : [];
  const selectedDayEvents = selectedDateKey
    ? (eventsByDate[selectedDateKey] ?? []).filter((event) => {
        // Auto-generierte Wedding-Events ausblenden (wedding- Prefix)
        if (event.id.startsWith('wedding-')) return false;
        // Sicherheitsnetz: Events, deren Titel exakt zu einer Hochzeit am selben Tag passt,
        // sind sehr wahrscheinlich alte Duplikate aus früheren Versionen → ausblenden
        if (selectedDayWeddings.some(w => w.coupleNames === event.title)) return false;
        return true;
      })
    : [];

  const isAssignedToWedding = (wedding: Wedding) => currentUser ? wedding.assignedStaffIds.includes(currentUser.id) : false;

  const changeMonth = (offset: number) => {    setSelectedDateKey(null);
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="px-6 py-4 space-y-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Kalender-Übersicht</h1>
        <p className="text-sm text-gray-500">Alle geplanten und gebuchten Termine im Blick.</p>

        <div className="mt-4 inline-flex rounded-xl border border-gray-200 bg-white p-1 items-center">
          <button
            type="button"
            onClick={() => setMode('list')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition ${
              mode === 'list' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <List size={16} />
            Liste
          </button>
          <button
            type="button"
            onClick={() => setMode('month')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition ${
              mode === 'month' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Table size={16} />
            Kalender
          </button>
        </div>

      </header>
      {mode === 'list' ? (
        <div className="space-y-6">

          <CalendarListView
            sorted={sorted}
            currentUser={currentUser}
            isAdmin={isAdmin}
            expandedWeddingId={expandedWeddingId}
            setExpandedWeddingId={setExpandedWeddingId}
            onWeddingClick={onWeddingClick}
          />

        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                aria-label="Vorheriger Monat"
              >
                <ChevronLeft size={18} />
              </button>

              <h2 className="text-base font-bold text-gray-900 capitalize">
                {monthCursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </h2>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                aria-label="Nächster Monat"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {isAdmin && (
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm((s) => !s);
                    update({ date: selectedDateKey ?? '' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-primary shadow-sm"
                >
                  Neuer Termin
                </button>
              </div>
            )}

            {isAdmin && showCreateForm && (
              <EventForm
                form={form}
                update={update}
                close={() => { resetEventForm(); setShowCreateForm(false); }}
                onAddEvent={onAddEvent}
                onUpdateEvent={onUpdateEvent}
              />
            )}

            <MonthGrid
              monthDays={monthDays}
              monthCursor={monthCursor}
              weddingsByDate={weddingsByDate}
              eventsByDate={eventsByDate}
              selectedDateKey={selectedDateKey}
              setSelectedDateKey={setSelectedDateKey}
              isAssignedToWedding={isAssignedToWedding}
              isAdmin={isAdmin}
            />
          </div>

          {selectedDateKey && (
            <DayDetails
              selectedDateKey={selectedDateKey}
              selectedDayEvents={selectedDayEvents}
              selectedDayWeddings={selectedDayWeddings}
              isAdmin={isAdmin}
              isAssignedToWedding={isAssignedToWedding}
              openEventEditor={openEventEditor}
              onUpdateEvent={onUpdateEvent}
              onDeleteEvent={onDeleteEvent}
              onWeddingClick={onWeddingClick}
            />
          )}
        </div>
      )}
    </div>
  );
};
