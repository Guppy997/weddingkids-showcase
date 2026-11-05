import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid, CalendarDays, Users, Clock, X, ArrowRight, Loader2,
} from 'lucide-react';
import { Wedding, ActivityLogEntry, DashboardStats } from '../types';
import { apiGetDashboard, apiGetGlobalActivity, apiGetPendingStaff } from '../api';
import { formatWeddingDateRange } from '../lib/weddingDates';

interface AufgabenViewProps {
  weddings: Wedding[];
  token: string;
  onNavigateToWedding: (weddingId: string) => void;
  onNavigateToAdminTab?: (tab: 'weddings' | 'staff' | 'notes') => void;
}

const EVENT_COLORS: Record<string, { dot: string; label: string }> = {
  status_change:   { dot: 'bg-[#A8C4E8]', label: 'Status' },
  staff_assigned:  { dot: 'bg-[#A8E4C8]', label: 'Einteilung' },
  staff_removed:   { dot: 'bg-[#F4A8A8]', label: 'Entfernt' },
  todo_created:    { dot: 'bg-[#C8C8D8]', label: 'Aufgabe' },
  todo_completed:  { dot: 'bg-primary',    label: 'Erledigt' },
  wedding_created: { dot: 'bg-[#BFD9E6]', label: 'Hochzeit neu' },
  wedding_edited:  { dot: 'bg-[#E0D4A8]', label: 'Bearbeitet' },
  wedding_deleted: { dot: 'bg-[#F4A8A8]', label: 'Gelöscht' },
  vote_cast:       { dot: 'bg-[#F8D8A8]', label: 'Antwort' },
  note_created:    { dot: 'bg-[#D4C8F0]', label: 'Notiz' },
  note_deleted:    { dot: 'bg-[#F4A8A8]', label: 'Notiz weg' },
  staff_approved:  { dot: 'bg-[#A8E4C8]', label: 'Freigegeben' },
  staff_rejected:  { dot: 'bg-[#F4A8A8]', label: 'Abgelehnt' },
  staff_deleted:   { dot: 'bg-[#F4A8A8]', label: 'Account weg' },
  password_reset:  { dot: 'bg-[#E0D4A8]', label: 'Passwort-Reset' },
  poll_created:    { dot: 'bg-[#BFD9E6]', label: 'Abstimmung' },
  poll_deleted:    { dot: 'bg-[#F4A8A8]', label: 'Abstimmung weg' },
};

function relativeTime(iso: string): string {
  // SQLite stores datetime('now') as UTC without timezone suffix.
  // Append 'Z' so the browser parses it correctly as UTC, not local time.
  const normalized = iso.includes('Z') || iso.includes('+') ? iso : iso.replace(' ', 'T') + 'Z';
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

type FilterType = 'withoutStaff' | 'thisMonth' | 'active' | 'pendingStaff' | null;
interface PendingStaffMember { id: string; name: string; username?: string; department: string; }

export const AufgabenView: React.FC<AufgabenViewProps> = ({ weddings, token, onNavigateToWedding, onNavigateToAdminTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>(null);
  const [pendingStaff, setPendingStaff] = useState<PendingStaffMember[]>([]);

  const activeWeddings = weddings.filter(w => w.status !== 'Abgesagt');

  useEffect(() => {
    apiGetDashboard(token).then(setStats).catch(console.error);
    setActivityLoading(true);
    apiGetGlobalActivity(token)
      .then(setActivity)
      .catch(console.error)
      .finally(() => setActivityLoading(false));
  }, [token]);

  // Pending Staff erst dann nachladen, wenn das Modal geöffnet wird
  useEffect(() => {
    if (filter === 'pendingStaff') {
      apiGetPendingStaff(token).then(setPendingStaff).catch(console.error);
    }
  }, [filter, token]);

  // Filtered wedding list for the modal
  const filteredWeddings = (() => {
    if (!filter) return [];
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (filter === 'withoutStaff') return activeWeddings.filter(w => w.assignedStaffIds.length === 0);
    if (filter === 'thisMonth') return activeWeddings.filter(w => w.date.startsWith(ym));
    if (filter === 'active') return activeWeddings;
    return [];
  })();

  const statCards: Array<{
    label: string; value: number; icon: any; color: string; filter: FilterType;
  }> = stats ? [
    {
      label: 'Aktive Hochzeiten',
      value: stats.totalActive,
      icon: LayoutGrid,
      color: 'bg-primary/10 text-primary',
      filter: 'active',
    },
    {
      label: 'Diesen Monat',
      value: stats.weddingsThisMonth,
      icon: CalendarDays,
      color: 'bg-[#EBF4FB] text-[#5A7A90]',
      filter: 'thisMonth',
    },
    {
      label: 'Ohne Personal',
      value: stats.weddingsWithoutStaff,
      icon: Users,
      color: stats.weddingsWithoutStaff > 0 ? 'bg-[#FAE8E8] text-[#8A4848]' : 'bg-[#E4F5EC] text-[#4A7A5A]',
      filter: 'withoutStaff',
    },
    {
      label: 'Mitarbeiteranfragen',
      value: stats.pendingAccessRequests,
      icon: Clock,
      color: stats.pendingAccessRequests > 0 ? 'bg-[#FBF4E0] text-[#8A6A30]' : 'bg-[#E4F5EC] text-[#4A7A5A]',
      filter: 'pendingStaff',
    },
  ] : [];

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto no-scrollbar px-4 pt-4 space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Aufgaben</h2>
        <p className="text-sm text-gray-500 mt-1">Dashboard & Verlauf</p>
      </div>

      {/* Dashboard Stats */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, filter: f }) => (
            <motion.button
              key={label}
              type="button"
              onClick={() => setFilter(f)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.97] cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-black text-gray-800">{value}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-gray-500">{label}</p>
                <ArrowRight size={12} className="text-gray-300" />
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="bg-gray-100 rounded-2xl h-24 animate-pulse" />)}
        </div>
      )}

      {/* Global Activity Log */}
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Letzte Änderungen</p>
        {activityLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <LayoutGrid size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Noch keine Änderungen protokolliert.</p>
            <p className="text-xs mt-1">Ändere einen Status oder teile Personal ein.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {activity.map((entry, idx) => {
              const ev = EVENT_COLORS[entry.eventType] ?? { dot: 'bg-gray-300', label: '' };
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{ev.label}</span>
                      {entry.weddingName && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                          {entry.weddingName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{entry.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{entry.actorName} · {relativeTime(entry.createdAt)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wedding filter modal */}
      <AnimatePresence>
        {filter && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilter(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h3 className="font-bold text-gray-800">
                  {filter === 'withoutStaff'  ? 'Hochzeiten ohne Personal'
                  : filter === 'thisMonth'    ? 'Hochzeiten diesen Monat'
                  : filter === 'active'       ? 'Aktive Hochzeiten'
                  : filter === 'pendingStaff' ? 'Mitarbeiteranfragen'
                  : ''}
                </h3>
                <button onClick={() => setFilter(null)} className="w-9 h-9 flex items-center justify-center text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {filter === 'pendingStaff' ? (
                  pendingStaff.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Keine offenen Anfragen.</p>
                  ) : (
                    pendingStaff.map(member => (
                      <div key={member.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate">{member.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.username ? `${member.username} · ` : ''}{member.department}
                          </p>
                        </div>
                        <button
                          onClick={() => { setFilter(null); onNavigateToAdminTab?.('staff'); }}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition shrink-0"
                        >
                          Admin <ArrowRight size={12} />
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  filteredWeddings.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Keine Hochzeiten.</p>
                  ) : (
                    filteredWeddings.map(w => (
                      <div key={w.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate">{w.coupleNames}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {formatWeddingDateRange(w)} · {w.location}
                          </p>
                        </div>
                        <button
                          onClick={() => { setFilter(null); onNavigateToWedding(w.id); }}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition shrink-0"
                        >
                          Admin <ArrowRight size={12} />
                        </button>
                      </div>
                    ))
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
