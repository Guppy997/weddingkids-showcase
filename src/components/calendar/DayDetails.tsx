import React from 'react';
import { Calendar as CalendarIcon, Trash2, Pencil } from 'lucide-react';
import type { Wedding, AdminEvent } from '../../types';
import { WEDDING_STATUS_BADGE } from '../../lib/status';

interface DayDetailsProps {
  selectedDateKey: string;
  selectedDayEvents: AdminEvent[];
  selectedDayWeddings: Wedding[];
  isAdmin?: boolean;
  isAssignedToWedding: (wedding: Wedding) => boolean;
  openEventEditor: (ev: AdminEvent) => void;
  onUpdateEvent?: (eventId: string, updates: Partial<AdminEvent>) => void;
  onDeleteEvent?: (eventId: string) => void;
  onWeddingClick: (wedding: Wedding) => void;
}

/** Einträge des ausgewählten Tags: Termine (mit Bearbeiten/Löschen für Admins) und Hochzeiten. */
export const DayDetails: React.FC<DayDetailsProps> = ({
  selectedDateKey, selectedDayEvents, selectedDayWeddings, isAdmin, isAssignedToWedding,
  openEventEditor, onUpdateEvent, onDeleteEvent, onWeddingClick,
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <CalendarIcon size={16} className="text-primary" />
      <h3 className="font-bold text-gray-800">
        {new Date(selectedDateKey).toLocaleDateString('de-DE', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
      </h3>
    </div>

    {selectedDayEvents.length === 0 && selectedDayWeddings.length === 0 ? (
      <p className="text-sm text-gray-500">Keine Einträge an diesem Tag.</p>
    ) : (
      <div className="space-y-3">
        {selectedDayEvents.length > 0 && (
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => {
              // Mehrtägige Termine zusätzlich Datum-Range anzeigen
              const isMultiDay = ev.endDate && ev.endDate !== ev.date;
              const dateRange = isMultiDay
                ? `${new Date(ev.date).toLocaleDateString('de-DE')} – ${new Date(ev.endDate!).toLocaleDateString('de-DE')}`
                : null;
              const timeRange = ev.startTime && ev.endTime
                ? `${ev.startTime} – ${ev.endTime} Uhr`
                : ev.startTime
                ? `ab ${ev.startTime} Uhr`
                : null;
              return (
                <div
                  key={ev.id}
                  className="w-full text-left p-3 rounded-xl border-l-4 border bg-white flex items-start gap-2"
                  style={{
                    borderLeftColor: ev.color || '#BFD9E6',
                    borderColor: '#E5E7EB',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{ev.title}</p>
                    {(dateRange || timeRange) && (
                      <p className="text-xs mt-1 text-gray-500">
                        {[dateRange, timeRange].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-xs mt-1 text-gray-500">{ev.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onUpdateEvent && (
                        <button
                          type="button"
                          onClick={() => openEventEditor(ev)}
                          aria-label="Termin bearbeiten"
                          title="Termin bearbeiten"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Termin „${ev.title}" wirklich löschen?`)) {
                              onDeleteEvent(ev.id);
                            }
                          }}
                          aria-label="Termin löschen"
                          title="Termin löschen"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-status-red-text hover:bg-status-red-bg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedDayWeddings.length > 0 && (
          <div className="space-y-2">
            {selectedDayWeddings.map((wedding) => (
              <button
                key={wedding.id}
                onClick={() => onWeddingClick(wedding)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  isAssignedToWedding(wedding)
                    ? 'border-primary/40 bg-primary/10 hover:bg-primary/20'
                    : wedding.status === 'Anfrage'
                    ? 'border-[#F8D8A8] bg-[#FBF4E0] hover:brightness-95'
                    : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{wedding.coupleNames}</p>
                    <p className="text-xs mt-1 text-gray-500 truncate">{wedding.location}</p>
                    {wedding.betreuungszeit && (
                      <p className="text-xs text-gray-500 truncate">
                        {wedding.betreuungszeit?.replace(/;\s*/g, ' · ')}
                      </p>
                    )}
                    {wedding.childrenCount > 0 && (
                      <p className="text-xs text-gray-500">{wedding.childrenCount} Kinder</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0 ml-2 ${WEDDING_STATUS_BADGE[wedding.status]}`}>
                    {wedding.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);
