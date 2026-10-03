import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Clock, Trash2, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiGetStaff, apiGetPendingStaff, apiApproveStaff, apiDeleteStaff } from '../../api';
import type { StaffMember } from './types';
import { ResetPasswordDialog } from './ResetPasswordDialog';

interface StaffTabProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  /** Meldet die Zahl offener Zugangsanfragen (für das Badge am Tab). */
  onPendingCountChange: (count: number) => void;
}

/** Admin-Tab „Mitarbeitende“: Zugangsanfragen freigeben, Team verwalten, Passwörter zurücksetzen. */
export const StaffTab: React.FC<StaffTabProps> = ({ onError, onSuccess, onPendingCountChange }) => {
  const { user, token } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [pendingList, setPendingList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);

  // Load staff from API
  const loadStaff = async () => {
    if (!token) return;
    setStaffLoading(true);
    try {
      const [active, pending] = await Promise.all([apiGetStaff(token), apiGetPendingStaff(token)]);
      setStaffList(active);
      setPendingList(pending);
      onPendingCountChange(pending.length);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [token]);

  const handleDeleteActiveStaff = async (id: string, name: string) => {
    if (!token) return;
    setDeletingStaffId(id);
    try {
      await apiDeleteStaff(token, id);
      await loadStaff();
      onSuccess(`${name} wurde entfernt.`);
    } catch (err: any) {
      onError(err.message || 'Fehler beim Löschen');
    } finally {
      setDeletingStaffId(null);
    }
  };

  const handleApprove = async (id: string) => {
    if (!token) return;
    try {
      await apiApproveStaff(token, id);
      await loadStaff();
    } catch (err: any) {
      onError(err.message || 'Fehler bei der Freigabe');
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Anfrage ablehnen und User löschen?')) return;
    try {
      await apiDeleteStaff(token, id);
      await loadStaff();
    } catch (err: any) {
      onError(err.message || 'Fehler beim Ablehnen');
    }
  };

  return (
    <>
      {/* Pending approvals */}
      {pendingList.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Clock size={16} className="text-[#8A6A30]" />
            Ausstehende Anfragen ({pendingList.length})
          </h3>
          <div className="space-y-2">
            {pendingList.map(member => (
              <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-[#FBF4E0] border border-[#F8D8A8] rounded-xl">
                <div>
                  <p className="font-bold text-gray-800">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.username} · {member.department}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(member.id)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-status-green-bg text-status-green-text rounded-xl shadow-sm hover:brightness-95 active:scale-[0.98] transition">
                    <CheckCircle2 size={14} /> Freigeben
                  </button>
                  <button onClick={() => handleReject(member.id)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-status-red-bg text-status-red-text rounded-xl shadow-sm hover:brightness-95 active:scale-[0.98] transition">
                    <XCircle size={14} /> Ablehnen
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Active staff list — Admins zuerst, dann Mitarbeitende */}
      <div className="space-y-6">
        {staffLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Wird geladen...</p>
        ) : (() => {
          const adminList = staffList.filter(m => m.role === 'Admin');
          const memberList = staffList.filter(m => m.role !== 'Admin');

          const renderRow = (member: typeof staffList[number], isAdminRow: boolean) => {
            const isSelf = member.id === user?.id;
            const isProtected = member.isProtected === true;
            return (
              <motion.div key={member.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{
                  backgroundColor: member.avatarColor ? `${member.avatarColor}40` : undefined,
                  borderColor: member.avatarColor || undefined,
                }}
                className={`flex items-center justify-between p-4 rounded-xl border gap-3 ${isAdminRow ? 'shadow-sm ring-1 ring-primary/20' : ''}`}>
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  {isAdminRow && <ShieldCheck size={16} className="text-primary shrink-0" />}
                  <p className="font-bold text-gray-800 truncate">
                    {member.name}
                    {isSelf && <span className="text-gray-400 font-normal text-xs ml-1.5">(du)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isAdminRow && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
                      Admin
                    </span>
                  )}
                  {/* Passwort-Reset nur für Staff-Accounts (nicht für Admins
                      und nicht für sich selbst — eigenes Passwort ändert man
                      im Profil) */}
                  {!isSelf && !isAdminRow && (
                    <button
                      onClick={() => setResetTarget({ id: member.id, name: member.name })}
                      aria-label={`Passwort von ${member.name} zurücksetzen`}
                      title="Passwort zurücksetzen"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:brightness-95 active:scale-[0.95] transition"
                    >
                      <KeyRound size={14} />
                    </button>
                  )}
                  {!isSelf && !isProtected && (
                    <button
                      onClick={() => {
                        if (window.confirm(`„${member.name}" wirklich entfernen? Der Account wird dauerhaft gelöscht.`)) {
                          handleDeleteActiveStaff(member.id, member.name);
                        }
                      }}
                      disabled={deletingStaffId === member.id}
                      aria-label={`${member.name} entfernen`}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:brightness-95 active:scale-[0.95] transition disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          };

          return (
            <>
              {adminList.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-primary" />
                    Administratoren ({adminList.length})
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {adminList.map(m => renderRow(m, true))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-800 mb-3">Mitarbeitende ({memberList.length})</h3>
                {memberList.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Noch keine Mitarbeitenden.</p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {memberList.map(m => renderRow(m, false))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      <ResetPasswordDialog token={token} resetTarget={resetTarget} onClose={() => setResetTarget(null)} />
    </>
  );
};
