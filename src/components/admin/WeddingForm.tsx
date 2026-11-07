import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { ProjectStatus } from '../../types';
import type { StaffMember, WeddingFormState } from './types';
import { calculateHours, formatHours } from './betreuungszeit';
import { inputClass, labelClass } from './styles';
import { suggestEndDate } from '../calendar/calendarUtils';

interface WeddingFormProps {
  weddingForm: WeddingFormState;
  setWeddingForm: React.Dispatch<React.SetStateAction<WeddingFormState>>;
  /** true = bestehende Hochzeit bearbeiten, false = neue anlegen */
  editingWedding: boolean;
  staffProp: StaffMember[];
  handleSaveWedding: (e: React.FormEvent) => void;
  closeWeddingForm: () => void;
}

/** Bis-Datum gesetzt und nach dem Start (nur relevant, wenn „Mehrere Tage“ angehakt). */
export const endDateValid = (f: WeddingFormState) =>
  !f.multiDay || (!!f.endDate && (!f.date || f.endDate > f.date));

/** Formular „Hochzeit anlegen / bearbeiten“ inkl. Betreuungszeit und direkter Einteilung. */
export const WeddingForm: React.FC<WeddingFormProps> = ({
  weddingForm, setWeddingForm, editingWedding, staffProp, handleSaveWedding, closeWeddingForm,
}) => (
  <motion.div id="wedding-edit-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-gray-800">{editingWedding ? 'Hochzeit bearbeiten' : 'Neue Hochzeit hinzufügen'}</h3>
      <button onClick={closeWeddingForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
    </div>
    <form onSubmit={handleSaveWedding} className="space-y-4">
      <div><label className={labelClass}>Paar / Veranstalter</label>
        <input type="text" value={weddingForm.coupleNames} onChange={e => setWeddingForm({ ...weddingForm, coupleNames: e.target.value })}
          placeholder="z.B. Anna & Bernd" required className={inputClass} /></div>
      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass}>{weddingForm.multiDay ? 'Von' : 'Datum'}</label>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 cursor-pointer select-none">
            <input type="checkbox" checked={weddingForm.multiDay}
              onChange={e => setWeddingForm({
                ...weddingForm,
                multiDay: e.target.checked,
                endDate: e.target.checked ? suggestEndDate(weddingForm.date, weddingForm.endDate) : '',
              })}
              className="w-4 h-4 accent-primary" />
            Mehrere Tage
          </label>
        </div>
        <input type="date" value={weddingForm.date} required className={inputClass}
          onChange={e => setWeddingForm({
            ...weddingForm,
            date: e.target.value,
            endDate: weddingForm.multiDay ? suggestEndDate(e.target.value, weddingForm.endDate) : weddingForm.endDate,
          })} />
        {weddingForm.multiDay && (
          <div className="mt-3">
            <label className={labelClass}>Bis</label>
            <input type="date" value={weddingForm.endDate} min={weddingForm.date || undefined}
              onChange={e => setWeddingForm({ ...weddingForm, endDate: e.target.value })} required className={inputClass} />
            {!endDateValid(weddingForm) && (
              <p className="text-xs text-status-red-text mt-2">End-Datum muss nach dem Start-Datum liegen.</p>
            )}
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>Betreuungszeit</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-[11px] text-gray-400 mb-1">Von</span>
            <input type="time" value={weddingForm.startTime}
              onChange={e => setWeddingForm({ ...weddingForm, startTime: e.target.value })}
              className={inputClass} />
          </div>
          <div>
            <span className="block text-[11px] text-gray-400 mb-1">Bis</span>
            <input type="time" value={weddingForm.endTime}
              onChange={e => setWeddingForm({ ...weddingForm, endTime: e.target.value })}
              className={inputClass} />
          </div>
        </div>
        {/* Uhrzeit-Felder lassen sich auf dem Handy nicht leeren → eigener Link */}
        {(weddingForm.startTime || weddingForm.endTime) && (
          <button type="button" onClick={() => setWeddingForm({ ...weddingForm, startTime: '', endTime: '' })}
            className="text-xs text-gray-500 underline mt-2">
            Zeit entfernen
          </button>
        )}
        {/* Bei mehreren Tagen: Beginn am ersten, Ende am letzten Tag — keine Dauer-Rechnung */}
        {!weddingForm.multiDay && weddingForm.startTime && weddingForm.endTime && (() => {
          const h = calculateHours(weddingForm.startTime, weddingForm.endTime);
          return h > 0 ? (
            <p className="text-xs text-primary font-bold mt-2">
              Dauer: {formatHours(h)}
            </p>
          ) : (
            <p className="text-xs text-status-red-text mt-2">
              End-Zeit muss nach Start-Zeit liegen.
            </p>
          );
        })()}
      </div>
      <div><label className={labelClass}>Location</label>
        <input type="text" value={weddingForm.location} onChange={e => setWeddingForm({ ...weddingForm, location: e.target.value })}
          placeholder="z.B. Schlossgarten, Berlin" required className={inputClass} /></div>
      <div><label className={labelClass}>Anzahl Kinder</label>
        <input type="number" min={0} value={weddingForm.childrenCount}
          onChange={e => setWeddingForm({ ...weddingForm, childrenCount: e.target.value })}
          placeholder="z.B. 12" className={inputClass} /></div>
      <div><label className={labelClass}>Benötigte Betreuer:innen</label>
        <input type="number" min={0} value={weddingForm.staffNeeded}
          onChange={e => setWeddingForm({ ...weddingForm, staffNeeded: e.target.value })}
          placeholder="z.B. 3" className={inputClass} /></div>
      {!editingWedding && (
        <div><label className={labelClass}>Status</label>
          <select value={weddingForm.status} onChange={e => setWeddingForm({ ...weddingForm, status: e.target.value as ProjectStatus })} className={inputClass}>
            <option value="Anfrage">Anfrage</option>
            <option value="Gebucht">Gebucht</option>
            <option value="Geplant">Geplant</option>
          </select></div>
      )}
      <div><label className={labelClass}>Notizen</label>
        <textarea value={weddingForm.notes} onChange={e => setWeddingForm({ ...weddingForm, notes: e.target.value })}
          placeholder="z.B. Vegetarisches Menü bevorzugt" className={inputClass} rows={3} /></div>

      {/* Mitarbeiter direkt zuweisen */}
      {staffProp.length > 0 && (
        <div>
          <label className={labelClass}>Mitarbeitende einteilen</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {staffProp.map(member => {
              const selected = weddingForm.assignedStaffIds.includes(member.id);
              const initials = member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setWeddingForm(f => ({
                    ...f,
                    assignedStaffIds: selected
                      ? f.assignedStaffIds.filter(id => id !== member.id)
                      : [...f.assignedStaffIds, member.id],
                  }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    selected
                      ? 'bg-status-green-bg text-status-green-text border-status-green-text/30'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{ backgroundColor: (member as any).avatarColor || '#A8D8D8' }}
                  >{initials}</span>
                  {member.name}
                </button>
              );
            })}
          </div>
          {weddingForm.assignedStaffIds.length > 0 && (
            <p className="text-xs text-status-green-text mt-2 font-medium">
              {weddingForm.assignedStaffIds.length} Person{weddingForm.assignedStaffIds.length > 1 ? 'en' : ''} eingeteilt
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-primary text-white font-bold h-10 rounded-xl">
          {editingWedding ? 'Speichern' : 'Hinzufügen'}
        </button>
        <button type="button" onClick={closeWeddingForm} className="flex-1 border border-gray-200 text-gray-700 font-bold h-10 rounded-xl">Abbrechen</button>
      </div>
    </form>
  </motion.div>
);
