import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import type { Wedding, ProjectStatus } from '../../types';
import type { StaffMember, WeddingSection } from './types';
import { emptyWeddingForm } from './types';
import { parseBetreuungszeit, buildBetreuungszeit } from './betreuungszeit';
import { WeddingForm } from './WeddingForm';
import { AdminWeddingCard } from './AdminWeddingCard';

interface WeddingsTabProps {
  weddings: Wedding[];
  staffProp: StaffMember[];
  focusWeddingId?: string;
  // Ansichts-Zustand liegt im AdminPanel, damit er Tab-Wechsel überdauert
  year: 2026 | 2027;
  setYear: (year: 2026 | 2027) => void;
  openSection: WeddingSection | null;
  toggleSection: (section: WeddingSection) => void;
  expandedWeddingId: string | null;
  setExpandedWeddingId: (id: string | null) => void;
  /** Ändert sich bei jedem Tab-Klick → offenes Formular schließen */
  closeFormSignal: number;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onAddWedding?: (wedding: Wedding) => void;
  onUpdateWedding?: (weddingId: string, updates: Partial<Wedding>) => void;
  onUpdateWeddingStatus?: (weddingId: string, status: ProjectStatus) => void;
  onDeleteWedding?: (weddingId: string) => void;
}

/** Admin-Tab „Hochzeiten“: anlegen/bearbeiten, Jahresfilter, Akkordeon aus aktiv/abgesagt/abgeschlossen. */
export const WeddingsTab: React.FC<WeddingsTabProps> = ({
  weddings, staffProp, focusWeddingId, year, setYear, openSection, toggleSection,
  expandedWeddingId, setExpandedWeddingId, closeFormSignal, onError, onSuccess,
  onAddWedding, onUpdateWedding, onUpdateWeddingStatus, onDeleteWedding,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingWedding, setEditingWedding] = useState<Wedding | null>(null);
  const [weddingForm, setWeddingForm] = useState(emptyWeddingForm);

  useEffect(() => { setShowForm(false); }, [closeFormSignal]);

  const openEditForm = (wedding: Wedding) => {
    setEditingWedding(wedding);
    const parsed = parseBetreuungszeit(wedding.betreuungszeit ?? '');
    setWeddingForm({
      coupleNames: wedding.coupleNames,
      betreuungszeit: wedding.betreuungszeit ?? '',
      startTime: parsed.start,
      endTime: parsed.end,
      date: wedding.date,
      location: wedding.location,
      status: wedding.status,
      childrenCount: wedding.childrenCount > 0 ? String(wedding.childrenCount) : '',
      staffNeeded: wedding.staffNeeded && wedding.staffNeeded > 0 ? String(wedding.staffNeeded) : '',
      notes: wedding.notes,
      assignedStaffIds: wedding.assignedStaffIds ?? [],
    });
    setShowForm(true);
    setExpandedWeddingId(null);
    setTimeout(() => {
      document.getElementById('wedding-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const closeWeddingForm = () => {
    setShowForm(false);
    setEditingWedding(null);
    setWeddingForm(emptyWeddingForm);
    onError('');
  };

  const handleSaveWedding = (e: React.FormEvent) => {
    e.preventDefault();
    onError(''); onSuccess('');
    const childrenCount = parseInt(weddingForm.childrenCount) || 0;
    const staffNeeded = parseInt(weddingForm.staffNeeded) || 0;
    const betreuungszeit = buildBetreuungszeit(weddingForm.startTime, weddingForm.endTime);
    try {
      if (editingWedding) {
        onUpdateWedding?.(editingWedding.id, {
          coupleNames: weddingForm.coupleNames,
          initials: weddingForm.coupleNames.split('&').map(n => n.trim()[0]).join('&'),
          betreuungszeit,
          date: weddingForm.date,
          location: weddingForm.location,
          childrenCount,
          staffNeeded,
          notes: weddingForm.notes,
          assignedStaffIds: weddingForm.assignedStaffIds,
        });
        onSuccess('Hochzeit gespeichert!');
      } else {
        const newWedding: Wedding = {
          id: 'w' + Date.now(),
          coupleNames: weddingForm.coupleNames,
          initials: weddingForm.coupleNames.split('&').map(n => n.trim()[0]).join('&'),
          betreuungszeit,
          date: weddingForm.date,
          location: weddingForm.location,
          status: weddingForm.status,
          childrenCount,
          staffNeeded,
          notes: weddingForm.notes,
          assignments: [],
          assignedStaffIds: weddingForm.assignedStaffIds,
        };
        onAddWedding?.(newWedding);
        onSuccess('Hochzeit erfolgreich hinzugefügt!');
      }
      closeWeddingForm();
    } catch (err: any) {
      onError(err.message || 'Fehler beim Speichern der Hochzeit');
    }
  };

  const getStaffDisplay = (staffId: string) => {
    const member = staffProp.find(m => m.id === staffId);
    if (member) return { name: member.name, department: member.department };
    return { name: `Unbekannt`, department: '' };
  };

  const toggleFinalAssignment = (wedding: Wedding, staffId: string) => {
    const isAssigned = wedding.assignedStaffIds.includes(staffId);
    onUpdateWedding?.(wedding.id, {
      assignedStaffIds: isAssigned ? wedding.assignedStaffIds.filter(id => id !== staffId) : [...wedding.assignedStaffIds, staffId],
    });
  };

  // Hochzeiten des gewählten Jahres in die drei Sektionen aufteilen
  // Hochzeiten des gewählten Jahres
  const weddingsForYear = weddings.filter(w => new Date(w.date).getFullYear() === year);
  // "Abgeschlossen" = Datum >1 Tag in der Vergangenheit UND nicht abgesagt
  const oneDayMs = 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - oneDayMs;
  const isCompleted = (w: Wedding) => new Date(w.date).getTime() < cutoff && w.status !== 'Abgesagt';

  // Aktiv: STATUS_COLUMNS außer Abgesagt, Datum nicht abgeschlossen
  // Reihenfolge im Admin-Panel: Anfragen → Gebucht → Geplant
  // (danach kommen Abgesagt und Abgeschlossen als aufklappbare Blöcke)
  const activeStatuses: ProjectStatus[] = ['Anfrage', 'Gebucht', 'Geplant'];
  const activeWeddings = weddingsForYear.filter(w => activeStatuses.includes(w.status) && !isCompleted(w));
  const cancelledWeddings = weddingsForYear.filter(w => w.status === 'Abgesagt');
  const completedWeddings = weddingsForYear.filter(isCompleted);

  const renderWeddingCard = (wedding: Wedding, muted = false) => (
    <AdminWeddingCard
      key={wedding.id}
      wedding={wedding}
      muted={muted}
      expandedWeddingId={expandedWeddingId}
      setExpandedWeddingId={setExpandedWeddingId}
      focusWeddingId={focusWeddingId}
      getStaffDisplay={getStaffDisplay}
      toggleFinalAssignment={toggleFinalAssignment}
      openEditForm={openEditForm}
      onUpdateWeddingStatus={onUpdateWeddingStatus}
      onDeleteWedding={onDeleteWedding}
    />
  );

  return (
    <>
      {showForm ? (
        <WeddingForm
          weddingForm={weddingForm}
          setWeddingForm={setWeddingForm}
          editingWedding={editingWedding !== null}
          staffProp={staffProp}
          handleSaveWedding={handleSaveWedding}
          closeWeddingForm={closeWeddingForm}
        />
      ) : (
        <button onClick={() => { setEditingWedding(null); setWeddingForm(emptyWeddingForm); setShowForm(true); }}
          className="flex items-center justify-center gap-2 w-full bg-primary text-white font-bold h-12 rounded-xl mb-6 shadow-lg shadow-primary/20 active:scale-[0.98] transition">
          <Plus size={20} /> Hochzeit hinzufügen
        </button>
      )}

      {/* Jahres-Wechsel — identisch zum Board, sitzt unter dem Hinzufügen-Button.
          w-fit erzwingt content-Breite, sonst ziehen flex/parent-Hooks die Box
          ggf. auf volle Spaltenbreite. */}
      <div className="w-fit inline-flex rounded-xl border border-gray-200 bg-white p-1 items-center mb-4">
        {([2026, 2027] as const).map(y => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              year === y ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Aktive Hochzeiten: Anfrage / Gebucht / Geplant gemischt,
            chronologisch nach Datum sortiert (nur im Admin-Panel —
            das Board bleibt nach Status-Spalten gegliedert). */}
        {activeWeddings.length > 0 && (() => {
          const sortedActive = [...activeWeddings].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          return (
            <div className="bg-bg-light rounded-xl p-3">
              <button
                type="button"
                onClick={() => toggleSection('active')}
                className="w-full flex items-center justify-between px-1 active:scale-[0.99] transition"
              >
                <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-500">
                  Hochzeiten ({sortedActive.length})
                </h4>
                {openSection === 'active' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {openSection === 'active' && (
                <div className="space-y-2 mt-3">
                  {sortedActive.map(w => renderWeddingCard(w))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Aufklappbare Sektion: Abgesagt */}
        {cancelledWeddings.length > 0 && (
          <div className="bg-bg-light rounded-xl p-3">
            <button
              type="button"
              onClick={() => toggleSection('cancelled')}
              className="w-full flex items-center justify-between px-1 active:scale-[0.99] transition"
            >
              <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-500">
                Abgesagt ({cancelledWeddings.length})
              </h4>
              {openSection === 'cancelled' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openSection === 'cancelled' && (
              <div className="space-y-2 mt-3">
                {cancelledWeddings.map(w => renderWeddingCard(w, true))}
              </div>
            )}
          </div>
        )}

        {/* Aufklappbare Sektion: Abgeschlossen (Datum > 1 Tag her) */}
        {completedWeddings.length > 0 && (
          <div className="bg-bg-light rounded-xl p-3">
            <button
              type="button"
              onClick={() => toggleSection('completed')}
              className="w-full flex items-center justify-between px-1 active:scale-[0.99] transition"
            >
              <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-500">
                Abgeschlossen ({completedWeddings.length})
              </h4>
              {openSection === 'completed' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openSection === 'completed' && (
              <div className="space-y-2 mt-3">
                {/* Neueste zuerst — die zuletzt gelaufene Hochzeit steht oben */}
                {[...completedWeddings]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(w => renderWeddingCard(w, true))}
              </div>
            )}
          </div>
        )}

        {/* Empty state: keine Hochzeit in keiner Sektion */}
        {activeWeddings.length === 0 && cancelledWeddings.length === 0 && completedWeddings.length === 0 && (
          <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-300 font-medium">Keine Hochzeiten für {year}</p>
          </div>
        )}
      </div>
    </>
  );
};
