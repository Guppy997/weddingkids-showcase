import React from 'react';
import { X } from 'lucide-react';
import type { AdminEvent } from '../../types';
import type { EventFormState } from './useEventForm';

// Pastell-Palette aus dem bestehenden App-Design
const EVENT_COLORS = [
  { hex: '#BFD9E6', label: 'Blau' },
  { hex: '#A8E4C8', label: 'Grün' },
  { hex: '#FBF4E0', label: 'Gelb' },
  { hex: '#F4A8A8', label: 'Rot' },
  { hex: '#D4C8F0', label: 'Lila' },
  { hex: '#A8C4E8', label: 'Türkis' },
  { hex: '#E5E5E5', label: 'Grau' },
];

interface EventFormProps {
  form: EventFormState;
  update: (patch: Partial<EventFormState>) => void;
  /** Formular leeren und schließen */
  close: () => void;
  onAddEvent?: (payload: Omit<AdminEvent, 'id' | 'createdAt' | 'createdBy'>) => void;
  onUpdateEvent?: (eventId: string, updates: Partial<AdminEvent>) => void;
}

/** Formular „Neuer Termin / Termin bearbeiten“ (nur Admins). */
export const EventForm: React.FC<EventFormProps> = ({ form, update, close, onAddEvent, onUpdateEvent }) => {
  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none text-gray-900 bg-white text-base";
  const labelCls = "block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2";
  const timeValid = !form.withTime || (!form.startTime || !form.endTime || form.endTime > form.startTime);
  const dateValid = !form.multiDay || (!form.endDate || !form.date || form.endDate >= form.date);
  const canSave = form.title.trim().length > 0 && form.date.length > 0 && timeValid && dateValid;
  return (
    <div className="mb-4 bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">{form.editingEventId ? 'Termin bearbeiten' : 'Neuer Termin'}</h3>
        <button
          type="button"
          onClick={() => { close(); }}
          aria-label="Schließen"
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Name */}
      <div>
        <label className={labelCls}>Name</label>
        <input
          type="text"
          placeholder="z.B. Team-Meeting"
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Datum + optional End-Datum */}
      <div>
        <label className={labelCls}>{form.multiDay ? 'Von' : 'Datum'}</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => update({ date: e.target.value })}
          className={inputCls}
        />
        {form.multiDay ? (
          <div className="mt-3">
            <label className={labelCls}>Bis</label>
            <input
              type="date"
              value={form.endDate}
              min={form.date || undefined}
              onChange={(e) => update({ endDate: e.target.value })}
              className={inputCls}
            />
            {!dateValid && (
              <p className="text-xs text-status-red-text mt-2">End-Datum muss am oder nach dem Start-Datum liegen.</p>
            )}
            <button
              type="button"
              onClick={() => { update({ multiDay: false }); update({ endDate: '' }); }}
              className="text-xs text-gray-500 underline mt-2"
            >
              Mehrtägig entfernen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => update({ multiDay: true })}
            className="text-xs font-bold text-primary mt-2 inline-flex items-center gap-1"
          >
            + Mehrere Tage
          </button>
        )}
      </div>

      {/* Zeit (optional) */}
      <div>
        {form.withTime ? (
          <>
            <label className={labelCls}>Zeit</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] text-gray-400 mb-1">Von</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update({ startTime: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <span className="block text-[11px] text-gray-400 mb-1">Bis</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update({ endTime: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            {!timeValid && (
              <p className="text-xs text-status-red-text mt-2">End-Zeit muss nach Start-Zeit liegen.</p>
            )}
            <button
              type="button"
              onClick={() => { update({ withTime: false }); update({ startTime: '' }); update({ endTime: '' }); }}
              className="text-xs text-gray-500 underline mt-2"
            >
              Zeit entfernen
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => update({ withTime: true })}
            className="text-xs font-bold text-primary inline-flex items-center gap-1"
          >
            + Zeit hinzufügen
          </button>
        )}
      </div>

      {/* Farbe */}
      <div>
        <label className={labelCls}>Farbe</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_COLORS.map(c => {
            const selected = form.color === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => update({ color: c.hex })}
                aria-label={c.label}
                title={c.label}
                className={`w-8 h-8 rounded-full transition active:scale-90 ${
                  selected ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:ring-1 hover:ring-gray-300'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
      </div>

      {/* Beschreibung */}
      <div>
        <label className={labelCls}>Beschreibung (optional)</label>
        <textarea
          placeholder="Notizen, Details, …"
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={2}
          className={inputCls}
        />
      </div>

      {/* Mit Team teilen */}
      <label className="flex items-center gap-2 text-sm select-none">
        <input type="checkbox" checked={form.isPublic} onChange={(e) => update({ isPublic: e.target.checked })} />
        <span>Mit Team teilen</span>
      </label>

      {/* Speichern — eigene Zeile, voll breit. Bei form.editingEventId: PATCH, sonst POST. */}
      <button
        type="button"
        disabled={!canSave}
        onClick={() => {
          const payload = {
            title: form.title.trim(),
            date: form.date,
            endDate: form.multiDay && form.endDate ? form.endDate : null,
            startTime: form.withTime ? form.startTime || null : null,
            endTime: form.withTime ? form.endTime || null : null,
            description: form.description.trim() || undefined,
            color: form.color,
            public: form.isPublic,
          };
          if (form.editingEventId) {
            onUpdateEvent?.(form.editingEventId, payload);
          } else {
            onAddEvent?.(payload);
          }
          close();
        }}
        className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-sm hover:brightness-95 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {form.editingEventId ? 'Änderungen speichern' : 'Speichern'}
      </button>
    </div>
  );
};
