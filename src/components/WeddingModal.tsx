import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users } from 'lucide-react';
import { Wedding, Staff, Availability } from '../types';
import { WeddingInfoBlock } from './WeddingInfoBlock';
import { VoteIcon } from './VoteIcon';
import { voteBoxClass } from '../lib/status';


interface WeddingModalProps {
  staff?: { id: string; name: string; initials: string; department: string; }[];
  wedding: Wedding;
  currentUser: Staff;
  isAdmin?: boolean;
  onClose: () => void;
  onUpdateAssignment: (staffId: string, status: Availability) => void;
  onUpdateOwnComment?: (comment: string) => void;
}

export const WeddingModal: React.FC<WeddingModalProps> = ({
  wedding,
  currentUser,
  isAdmin = false,
  onClose,
  onUpdateAssignment,
  onUpdateOwnComment,
  staff = [],
}) => {
  // Eigener Kommentar zur Abstimmung — wird beim Verlassen des Felds gespeichert
  const ownAssignment = wedding.assignments.find(a => a.staffId === currentUser.id);
  const savedOwnComment = ownAssignment?.comment ?? '';
  const [ownComment, setOwnComment] = useState(savedOwnComment);
  useEffect(() => { setOwnComment(savedOwnComment); }, [savedOwnComment]);
  const saveOwnComment = () => {
    if (ownComment.trim() !== savedOwnComment) onUpdateOwnComment?.(ownComment.trim());
  };



  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        />
        
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header: einfacher Flex-Block oben — sticky+overflow-hidden hat auf iOS
              Safari einen bekannten Rendering-Bug (Element kollabiert auf Höhe 0).
              shrink-0, damit der Flex-Parent ihn nicht zusammenstaucht. */}
          <div className="shrink-0 bg-white px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight text-text-main">{wedding.coupleNames}</h2>
            <button
              onClick={onClose}
              aria-label="Schließen"
              className="w-11 h-11 flex items-center justify-center text-gray-400"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
            {/* Info-Block: gleiches Layout wie auf der Board-Karte, damit man
                in Modal & Übersicht denselben Aufbau sieht. */}
            <div className="card">
              <div className="mb-3">
                <WeddingInfoBlock wedding={wedding} size="default" />
              </div>

              {/* Eingeteilte Mitarbeiter:innen – im Modal mit vollem Namen,
                  damit man direkt sieht wer dabei ist. */}
              {(() => {
                const assignedStaffMembers = wedding.assignedStaffIds
                  .map(id => staff.find(s => s.id === id))
                  .filter((m): m is typeof staff[number] => Boolean(m));
                if (assignedStaffMembers.length === 0) {
                  return (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                        <Users size={10} className="text-gray-300" />
                      </div>
                      <span className="text-xs text-gray-400">Noch niemand eingeteilt</span>
                    </div>
                  );
                }
                return (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">
                      {assignedStaffMembers.length} eingeteilt
                    </p>
                    <ul className="space-y-1.5">
                      {assignedStaffMembers.map((member) => {
                        const m = member as Staff;
                        return (
                          <li key={m.id} className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={m.avatarImage ? undefined : { backgroundColor: m.avatarColor || '#008080' }}
                            >
                              {m.avatarImage
                                ? <img src={m.avatarImage} alt={m.name} className="w-full h-full object-cover" />
                                : m.initials}
                            </div>
                            <span className="text-sm text-gray-700 truncate">{m.name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>

            {/* Notizen separat darunter, wenn vorhanden */}
            {wedding.notes && wedding.notes.trim() && (
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Notizen</p>
                <div className="bg-bg-light p-4 rounded-xl text-xs text-gray-600 leading-relaxed italic">
                  „{wedding.notes}"
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Personal-Status</p>
              <div className="space-y-2">
                {[...staff]
                  .sort((a, b) => {
                    // Eigener Eintrag immer ganz oben
                    if (a.id === currentUser.id) return -1;
                    if (b.id === currentUser.id) return 1;
                    return 0;
                  })
                  .map(member => {
                  const assignment = wedding.assignments.find(a => a.staffId === member.id);
                  const status = assignment?.status || 'Ausstehend';
                  const isCurrentUser = member.id === currentUser.id;
                  const isAssigned = wedding.assignedStaffIds.includes(member.id);
                  
                  const canComment = isCurrentUser && status !== 'Ausstehend' && !!onUpdateOwnComment;

                  return (
                    <div key={member.id} className={`rounded-xl border transition-all ${voteBoxClass(status)} ${!isCurrentUser ? 'opacity-75' : ''}`}>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-[10px] text-gray-600">
                          {member.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{member.name}</span>
                          {isCurrentUser && <span className="text-xs text-primary font-bold">Du</span>}
                          {isAssigned && <span className="text-xs text-status-green-text font-bold">Final eingeteilt</span>}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {(['Ja', 'Nein', 'Vielleicht'] as Availability[]).map((opt) => {
                          // Bearbeiten erlaubt, wenn die Person NICHT fest eingeteilt ist UND
                          //  - es der eigene Eintrag ist, ODER
                          //  - man Admin ist.
                          // Bei einer festen Einteilung ist der Status auf "Ja" gesperrt;
                          // erst wenn der Admin die Einteilung zurücknimmt, kann wieder
                          // abgestimmt werden.
                          const canEdit = !isAssigned && (isAdmin || isCurrentUser);
                          const isSelected = status === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                if (!canEdit) return;
                                // Klick auf die bereits gewählte Stimme → Stimme zurücknehmen
                                // (zurück auf "Ausstehend"). Sonst die neue Stimme setzen.
                                onUpdateAssignment(member.id, isSelected ? 'Ausstehend' : opt);
                              }}
                              disabled={!canEdit}
                              aria-pressed={isSelected}
                              title={isSelected && canEdit ? 'Stimme zurücknehmen' : undefined}
                              className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-white shadow-sm ring-1 ring-black/5'
                                  : canEdit
                                    ? 'opacity-40 grayscale active:scale-95 cursor-pointer'
                                    : 'opacity-40 grayscale cursor-default pointer-events-none'
                              }`}
                            >
                              <VoteIcon status={opt} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Kommentar-Streifen unter der Abstimmung */}
                    {canComment ? (
                      <div className="px-3 pb-3">
                        <input
                          type="text"
                          value={ownComment}
                          onChange={(e) => setOwnComment(e.target.value)}
                          onBlur={saveOwnComment}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          maxLength={200}
                          placeholder="Kommentar hinzufügen (optional)"
                          className="w-full px-3 py-2 rounded-lg border border-black/5 bg-white/80 text-base sm:text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ) : assignment?.comment ? (
                      <p className="px-3 pb-3 -mt-1 text-xs text-gray-600 italic break-words">„{assignment.comment}“</p>
                    ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="p-6 bg-bg-light mt-auto">
            <button 
              onClick={onClose}
              className="w-full bg-primary text-white font-bold h-12 rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-primary/20"
            >
              Speichern
            </button>
          </div>
          <div className="h-[var(--safe-bottom)] bg-bg-light" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
