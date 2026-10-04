import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Wedding, Staff, Availability } from '../types';
import { WeddingInfoBlock } from './WeddingInfoBlock';
import { VoteIcon } from './VoteIcon';
import { WEDDING_STATUS_BADGE } from '../lib/status';


interface RequestsViewProps {
  weddings: Wedding[];
  currentUser: Staff;
  onUpdateAssignment: (weddingId: string, status: Availability, comment?: string) => void;
}

// Hochzeits-Jahre, die in der Anfragen-Liste vorkommen können. Alle Jahre
// werden gemeinsam in einer durchgehenden Liste angezeigt (chronologisch
// sortiert) — die Buttons oben sind reine Sprungmarken zum jeweiligen
// Abschnitt, kein Filter.
const AVAILABLE_YEARS = [2026, 2027] as const;
type WeddingYear = typeof AVAILABLE_YEARS[number];

export const RequestsView: React.FC<RequestsViewProps> = ({
  weddings,
  currentUser,
  onUpdateAssignment,
}) => {
  const yearRefs = useRef<Partial<Record<WeddingYear, HTMLDivElement | null>>>({});
  // Optionaler Kommentar pro Anfrage, wird zusammen mit der Stimme gesendet
  const [comments, setComments] = useState<Record<string, string>>({});
  const pendingRequests = weddings.filter((w) => {
    if (w.status === 'Geplant' || w.status === 'Abgesagt') return false;
    // Bereits fest eingeteilt → keine Antwort mehr nötig/möglich
    if (w.assignedStaffIds?.includes(currentUser.id)) return false;
    const userAssignment = w.assignments.find(a => a.staffId === currentUser.id);
    return !userAssignment;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const yearsPresent = new Set(pendingRequests.map(w => new Date(w.date).getFullYear()));
  const scrollToYear = (y: WeddingYear) => {
    yearRefs.current[y]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };



  const getCountByStatus = (wedding: Wedding, status: Availability) => {
    return wedding.assignments.filter(a => a.status === status).length;
  };

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto no-scrollbar">
      {/* Jahres-Sprungmarken — filtern nicht mehr, sondern scrollen nur zum jeweiligen Abschnitt der durchgehenden Liste */}
      <div className="px-4 pt-4">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 items-center">
          {AVAILABLE_YEARS.map(y => (
            <button
              key={y}
              type="button"
              disabled={!yearsPresent.has(y)}
              onClick={() => scrollToYear(y)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                yearsPresent.has(y) ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="flex items-center justify-center p-6 pt-10">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <p className="text-lg font-bold text-gray-800">Alle erledigt!</p>
            <p className="text-sm text-gray-500 mt-2">Du hast auf alle offenen Anfragen beantwortet.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {pendingRequests.map((wedding, idx) => {
            const weddingYear = new Date(wedding.date).getFullYear() as WeddingYear;
            const isFirstOfYear = idx === 0 || new Date(pendingRequests[idx - 1].date).getFullYear() !== weddingYear;

            return (
            <React.Fragment key={wedding.id}>
              {isFirstOfYear && (
                <div
                  ref={el => { yearRefs.current[weddingYear] = el; }}
                  className="pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-gray-400"
                >
                  {weddingYear}
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
              {/* Header — gleicher Aufbau wie Board */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-base text-text-main">{wedding.coupleNames}</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${WEDDING_STATUS_BADGE[wedding.status]}`}>
                    {wedding.status}
                  </span>
                </div>

                <WeddingInfoBlock wedding={wedding} size="compact" />

                {wedding.notes && (
                  <p className="text-xs text-gray-600 mt-3 italic border-t border-gray-100 pt-3">
                    "{wedding.notes}"
                  </p>
                )}
              </div>

              {/* Your Response Section */}
              <div className="p-4 bg-primary/5 border-b border-gray-100">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">
                  Deine Antwort
                </p>
                <input
                  type="text"
                  value={comments[wedding.id] ?? ''}
                  onChange={(e) => setComments(c => ({ ...c, [wedding.id]: e.target.value }))}
                  maxLength={200}
                  placeholder="Kommentar (optional), z. B. „kann nur mittags“"
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-200 bg-white text-base sm:text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  {(['Ja', 'Nein', 'Vielleicht'] as Availability[]).map((option) => {
                    const colorClass =
                      option === 'Ja'
                        ? 'bg-status-green-bg text-status-green-text border-status-green-text/30 hover:bg-status-green-text hover:text-white'
                        : option === 'Nein'
                          ? 'bg-status-red-bg text-status-red-text border-status-red-text/30 hover:bg-status-red-text hover:text-white'
                          : 'bg-[#FBF4E0] text-[#8A6A30] border-[#8A6A30]/30 hover:bg-[#8A6A30] hover:text-white';
                    return (
                      <button
                        key={option}
                        onClick={() => onUpdateAssignment(wedding.id, option, comments[wedding.id])}
                        className={`flex-1 py-2.5 rounded-lg border-2 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 ${colorClass}`}
                      >
                        {option === 'Ja' && <CheckCircle2 size={14} />}
                        {option === 'Nein' && <XCircle size={14} />}
                        {option === 'Vielleicht' && <HelpCircle size={14} />}
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Team Status */}
              {wedding.assignments.length > 0 && (
                <div className="p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Team Status
                  </p>
                  <div className="space-y-2">
                    {['Ja', 'Nein', 'Vielleicht'].map((status) => {
                      const count = getCountByStatus(wedding, status as Availability);
                      if (count === 0) return null;

                      const statusLabel =
                        status === 'Ja'
                          ? 'Dabei'
                          : status === 'Nein'
                            ? 'Absage'
                            : 'Vielleicht';
                      const statusColor =
                        status === 'Ja'
                          ? 'text-status-green-text bg-status-green-bg'
                          : status === 'Nein'
                            ? 'text-status-red-text bg-status-red-bg'
                            : 'text-[#8A6A30] bg-[#FBF4E0]';

                      return (
                        <div key={status} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusColor} text-xs font-bold`}>
                          <VoteIcon status={status as Availability} />
                          <span>
                            {statusLabel}: {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </motion.div>
            </React.Fragment>
            );
          })}
        </div>
      )}

    </div>
  );
};
