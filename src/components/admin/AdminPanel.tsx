import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Wedding, BoardNote, Poll, ProjectStatus } from '../../types';
import type { StaffMember, WeddingSection } from './types';
import { NotesTab } from './NotesTab';
import { StaffTab } from './StaffTab';
import { WeddingsTab } from './WeddingsTab';

type AdminTab = 'weddings' | 'staff' | 'notes';

interface AdminPanelProps {
  weddings: Wedding[];
  notes: BoardNote[];
  polls?: Poll[];
  staff?: StaffMember[];
  focusWeddingId?: string;
  initialAdminTab?: AdminTab;
  onAddWedding?: (wedding: Wedding) => void;
  onUpdateWedding?: (weddingId: string, updates: Partial<Wedding>) => void;
  onUpdateWeddingStatus?: (weddingId: string, status: ProjectStatus) => void;
  onDeleteWedding?: (weddingId: string) => void;
  onAddNote?: (text: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onAddPoll?: (question: string) => void;
  onDeletePoll?: (pollId: string) => void;
}

/**
 * Admin-Bereich mit drei Tabs (Hochzeiten, Mitarbeitende, Notizen).
 * Hält den Zustand, der einen Tab-Wechsel überdauern soll — Jahr, offener
 * Bereich, aufgeklappte Karte, Entwürfe — und die gemeinsamen Meldungen.
 */
export const AdminPanel: React.FC<AdminPanelProps> = ({
  weddings, notes, polls = [], staff: staffProp = [], focusWeddingId, initialAdminTab, onAddWedding, onUpdateWedding, onUpdateWeddingStatus, onDeleteWedding, onAddNote, onDeleteNote, onAddPoll, onDeletePoll,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialAdminTab ?? 'weddings');

  // Wenn von außen ein Tab gewünscht wird (z.B. Sprung aus AufgabenView) → übernehmen
  React.useEffect(() => {
    if (initialAdminTab) setActiveTab(initialAdminTab);
  }, [initialAdminTab]);
  const [expandedWeddingId, setExpandedWeddingId] = useState<string | null>(focusWeddingId ?? null);

  // When focusWeddingId changes (navigated from Aufgaben), switch to weddings tab and expand
  React.useEffect(() => {
    if (focusWeddingId) {
      setActiveTab('weddings');
      setOpenSection('active');
      setExpandedWeddingId(focusWeddingId);
      setTimeout(() => {
        document.getElementById(`admin-wedding-${focusWeddingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [focusWeddingId]);
  const [noteText, setNoteText] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');

  // Jahres-Auswahl für die Hochzeits-Liste (Admin-Panel). Standard 2026.
  const [year, setYear] = useState<2026 | 2027>(2026);
  // Akkordeon: immer höchstens eine Sektion offen. Standard: aktive Hochzeiten.
  // Öffnet man Abgesagt/Abgeschlossen, klappt der Rest zu und die Sektion
  // rutscht nach oben — kein Scrollen an der langen aktiven Liste vorbei.
  const [openSection, setOpenSection] = useState<WeddingSection | null>('active');
  const toggleSection = (section: WeddingSection) =>
    setOpenSection(s => (s === section ? null : section));

  // Zahl offener Zugangsanfragen (Badge am Tab „Mitarbeitende“), gemeldet vom StaffTab
  const [pendingCount, setPendingCount] = useState(0);
  // Jeder Klick auf einen Tab schließt ein offenes Hochzeits-Formular
  const [closeFormSignal, setCloseFormSignal] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const showSuccess = (message: string) => {
    setSuccess(message);
    if (message) setTimeout(() => setSuccess(''), 3000);
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Kein Zugriff auf das Admin-Panel</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto no-scrollbar px-4 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Admin-Panel</h2>
        <p className="text-sm text-gray-500 mt-1">Verwalte Mitarbeitende und Hochzeiten</p>
      </div>

      {/* Feedback */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 mb-4 bg-[#FAE8E8] border border-[#F4A8A8] rounded-xl text-sm text-[#8A4848]">
          <XCircle size={16} className="shrink-0" />{error}
        </motion.div>
      )}
      {success && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 mb-4 bg-[#E4F5EC] border border-[#A8E4C8] rounded-xl text-sm text-[#4A7A5A]">
          <CheckCircle2 size={16} className="shrink-0" />{success}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-bg-light rounded-xl p-1">
        {([['weddings', 'Hochzeiten'], ['staff', 'Mitarbeitende'], ['notes', 'Notizen']] as [AdminTab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setCloseFormSignal(n => n + 1); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            {tab === 'staff' && pendingCount > 0 && (
              <span className="ml-1 bg-[#F4A8A8] text-[#8A4848] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'notes' && (
        <NotesTab
          notes={notes}
          polls={polls}
          noteText={noteText}
          setNoteText={setNoteText}
          pollQuestion={pollQuestion}
          setPollQuestion={setPollQuestion}
          onAddNote={onAddNote}
          onDeleteNote={onDeleteNote}
          onAddPoll={onAddPoll}
          onDeletePoll={onDeletePoll}
        />
      )}

      {activeTab === 'staff' && (
        <StaffTab onError={setError} onSuccess={showSuccess} onPendingCountChange={setPendingCount} />
      )}

      {activeTab === 'weddings' && (
        <WeddingsTab
          weddings={weddings}
          staffProp={staffProp}
          focusWeddingId={focusWeddingId}
          year={year}
          setYear={setYear}
          openSection={openSection}
          toggleSection={toggleSection}
          expandedWeddingId={expandedWeddingId}
          setExpandedWeddingId={setExpandedWeddingId}
          closeFormSignal={closeFormSignal}
          onError={setError}
          onSuccess={showSuccess}
          onAddWedding={onAddWedding}
          onUpdateWedding={onUpdateWedding}
          onUpdateWeddingStatus={onUpdateWeddingStatus}
          onDeleteWedding={onDeleteWedding}
        />
      )}
    </div>
  );
};
