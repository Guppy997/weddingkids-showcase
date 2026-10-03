import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp, Trash2, Pencil } from 'lucide-react';
import type { Wedding, Availability, ProjectStatus } from '../../types';
import { WeddingInfoBlock } from '../WeddingInfoBlock';
import { VOTE_STYLES, WEDDING_STATUS_BADGE } from '../../lib/status';
import { btnSuccess, btnDanger, btnSecondary, btnNeutral } from './styles';
import { scrollCardBelowHeader } from './scroll';

interface AdminWeddingCardProps {
  wedding: Wedding;
  /** Abgesagte / abgeschlossene Hochzeiten blasser darstellen */
  muted?: boolean;
  expandedWeddingId: string | null;
  setExpandedWeddingId: (id: string | null) => void;
  focusWeddingId?: string;
  getStaffDisplay: (staffId: string) => { name: string; department: string };
  toggleFinalAssignment: (wedding: Wedding, staffId: string) => void;
  openEditForm: (wedding: Wedding) => void;
  onUpdateWeddingStatus?: (weddingId: string, status: ProjectStatus) => void;
  onDeleteWedding?: (weddingId: string) => void;
}

const getCountByStatus = (wedding: Wedding, status: Availability) =>
  wedding.assignments.filter(a => a.status === status).length;

/** Aufklappbare Hochzeits-Karte im Admin-Bereich: Rückmeldungen, Einteilung, Status. */
export const AdminWeddingCard: React.FC<AdminWeddingCardProps> = ({
  wedding, muted = false, expandedWeddingId, setExpandedWeddingId, focusWeddingId,
  getStaffDisplay, toggleFinalAssignment, openEditForm, onUpdateWeddingStatus, onDeleteWedding,
}) => {
  const isExpanded = expandedWeddingId === wedding.id;
  return (
    <motion.div key={wedding.id} id={`admin-wedding-${wedding.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`scroll-mt-4 p-4 bg-white rounded-xl border transition-colors ${
        expandedWeddingId === wedding.id && focusWeddingId === wedding.id
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-gray-100'
      } ${muted ? 'opacity-70' : ''}`}>
                <button type="button" onClick={() => {
                  const willExpand = !isExpanded;
                  setExpandedWeddingId(willExpand ? wedding.id : null);
                  // Beim Aufklappen die Karte direkt unter den Header scrollen,
                  // damit man von oben anfangend alles sieht (Name nicht abgeschnitten).
                  if (willExpand) {
                    setTimeout(() => scrollCardBelowHeader(`admin-wedding-${wedding.id}`), 60);
                  }
                }} className="w-full text-left">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-bold text-gray-800">{wedding.coupleNames}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${WEDDING_STATUS_BADGE[wedding.status]}`}>{wedding.status}</span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </div>
                  </div>
                  <div className="mb-3">
                    <WeddingInfoBlock wedding={wedding} size="compact" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-status-green-bg text-status-green-text">{getCountByStatus(wedding, 'Ja')} Zugesagt</span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FBF4E0] text-[#8A6A30] border border-[#F8D8A8]">{getCountByStatus(wedding, 'Vielleicht')} Vielleicht</span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-status-red-bg text-status-red-text">{getCountByStatus(wedding, 'Nein')} Abgesagt</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="pt-3 mt-3 border-t border-gray-100 space-y-3">
                    {(['Ja', 'Vielleicht', 'Nein'] as const).map(voteStatus => {
                      const section = VOTE_STYLES[voteStatus];
                      const voters = wedding.assignments.filter(a => a.status === voteStatus);
                      return (
                        <div key={voteStatus} className={`rounded-lg border p-2 ${section.box}`}>
                          <p className={`text-[11px] font-bold mb-2 ${section.text}`}>{section.title} ({voters.length})</p>
                          {voters.length === 0 ? <p className="text-xs text-gray-500">Keine Rückmeldungen.</p> : (
                            <div className="space-y-2">
                              {voters.map(a => {
                                const member = getStaffDisplay(a.staffId);
                                const isAssigned = wedding.assignedStaffIds.includes(a.staffId);
                                return (
                                  <div key={a.staffId} className="flex items-center justify-between bg-white/80 rounded-md px-2 py-1.5">
                                    <div className="min-w-0 pr-2">
                                      <p className="text-sm font-medium text-gray-800">{member.name}</p>
                                      <p className="text-xs text-gray-500">{member.department}</p>
                                      {a.comment && (
                                        <p className="text-xs text-gray-700 italic mt-1 break-words">„{a.comment}“</p>
                                      )}
                                    </div>
                                    <button type="button" onClick={() => toggleFinalAssignment(wedding, a.staffId)}
                                      disabled={wedding.status !== 'Gebucht' && wedding.status !== 'Geplant'}
                                      className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm transition active:scale-[0.98] hover:brightness-95 ${isAssigned ? 'bg-status-green-bg text-status-green-text' : 'bg-primary/15 text-primary'} disabled:opacity-40`}>
                                      {isAssigned ? 'Eingeteilt' : 'Einteilen'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Admin Entscheidung</p>

                      {/* Status transitions — jeder Button auf eigener Zeile, volle Breite */}
                      {wedding.status === 'Anfrage' && (
                        <>
                          <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, 'Gebucht')} className={`w-full ${btnSuccess}`}>Auf Gebucht</button>
                          <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, 'Abgesagt')} className={`w-full ${btnDanger}`}>Abgesagt</button>
                        </>
                      )}
                      {wedding.status === 'Gebucht' && (
                        <>
                          <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, 'Geplant')} className={`w-full ${btnSuccess}`}>Auf Geplant</button>
                          <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, 'Abgesagt')} className={`w-full ${btnDanger}`}>Abgesagt</button>
                          <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, 'Anfrage')} className={`w-full ${btnSecondary}`}>Zurück auf Anfrage</button>
                        </>
                      )}
                      {wedding.status === 'Geplant' && (
                        <>
                          <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, 'Abgesagt')} className={`w-full ${btnDanger}`}>Abgesagt</button>
                          <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, 'Gebucht')} className={`w-full ${btnSecondary}`}>Zurück auf Gebucht</button>
                        </>
                      )}
                      {wedding.status === 'Abgesagt' && (
                        <button type="button" onClick={() => onUpdateWeddingStatus?.(wedding.id, wedding.previousStatus || 'Anfrage')} className={`w-full ${btnSecondary}`}>
                          Zurück auf {wedding.previousStatus || 'Anfrage'}
                        </button>
                      )}

                      {/* Edit + Delete nebeneinander */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); openEditForm(wedding); }}
                          className={`flex items-center justify-center gap-1.5 ${btnNeutral}`}
                        >
                          <Pencil size={13} /> Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hochzeit "${wedding.coupleNames}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                              onDeleteWedding?.(wedding.id);
                            }
                          }}
                          className={`flex items-center justify-center gap-1.5 ${btnNeutral}`}
                        >
                          <Trash2 size={13} /> Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                )}
    </motion.div>
  );
};
