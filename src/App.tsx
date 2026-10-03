import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KanbanBoard } from './components/KanbanBoard';
import { CalendarView } from './components/calendar/CalendarView';
import { MyWeddings } from './components/MyWeddings';
import { RequestsView } from './components/RequestsView';
import { AdminPanel } from './components/admin/AdminPanel';
import { AufgabenView } from './components/AufgabenView';
import { NewsView } from './components/NewsView';
import { BottomNav, ViewType } from './components/BottomNav';
import { WeddingModal } from './components/WeddingModal';
import { ProfileModal } from './components/ProfileModal';
import { LegalModal, LegalPage } from './components/LegalModal';
import { LoginScreen } from './components/LoginScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { Wedding, Availability, ProjectStatus, BoardNote, AdminEvent, Poll, PollChoice } from './types';
import { Heart, LogOut } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import {
  apiGetWeddings, apiCreateWedding, apiUpdateWedding, apiDeleteWedding,
  apiGetNotes, apiCreateNote, apiDeleteNote,
  apiGetPolls, apiCreatePoll, apiDeletePoll, apiVotePoll,
  apiGetEvents, apiCreateEvent, apiUpdateEvent, apiDeleteEvent,
  apiGetStaff,
} from './api';

// ── localStorage key for "last seen" timestamps per tab ──
const LS_LAST_SEEN = 'wk_last_seen';
interface LastSeen { news: string; calendar: string; board: string; }
function loadLastSeen(): LastSeen {
  try {
    const raw = localStorage.getItem(LS_LAST_SEEN);
    if (raw) return JSON.parse(raw) as LastSeen;
  } catch { /* ignore */ }
  // Default: mark everything as seen 7 days ago so old content doesn't flood badges
  const ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return { news: ago, calendar: ago, board: ago };
}
function saveLastSeen(ls: LastSeen) {
  try { localStorage.setItem(LS_LAST_SEEN, JSON.stringify(ls)); } catch { /* ignore */ }
}

export default function App() {
  const { user, token, logout, isLoading } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('kanban');
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string; initials: string; department: string; avatarColor: string; avatarImage: string | null }[]>([]);
  const [selectedWedding, setSelectedWedding] = useState<Wedding | null>(null);
  const [focusWeddingId, setFocusWeddingId] = useState<string | undefined>(undefined);
  const [adminInitialTab, setAdminInitialTab] = useState<'weddings' | 'staff' | 'notes' | undefined>(undefined);
  const [showProfile, setShowProfile] = useState(false);
  const [legalPage, setLegalPage] = useState<LegalPage | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  // Wird nach dem allerersten erfolgreichen loadData() auf true gesetzt.
  // Nur solange das false ist, zeigen wir den Lade-Screen — Hintergrund-Refreshes
  // sollen den User nicht mehr unterbrechen.
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [lastSeen, setLastSeen] = useState<LastSeen>(loadLastSeen);

  const navigateToWedding = (weddingId: string) => {
    setFocusWeddingId(weddingId);
    handleSetView('admin');
  };

  const navigateToAdminTab = (tab: 'weddings' | 'staff' | 'notes') => {
    setAdminInitialTab(tab);
    handleSetView('admin');
    // Reset nach dem nächsten Render-Tick, damit ein erneutes Klicken auf denselben Tab erneut feuert
    setTimeout(() => setAdminInitialTab(undefined), 400);
  };

  const currentUser = user
    ? { id: user.id, name: user.name, department: user.department, initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase() }
    : { id: '', name: '', department: '', initials: '' };

  const isAdmin = user?.role === 'Admin';

  // When navigating to a tab, mark it as seen so badge clears
  const handleSetView = (view: ViewType) => {
    setActiveView(view);
    const now = new Date().toISOString();
    let updated: LastSeen | null = null;
    if (view === 'news')     updated = { ...lastSeen, news: now };
    if (view === 'calendar') updated = { ...lastSeen, calendar: now };
    if (view === 'kanban')   updated = { ...lastSeen, board: now };
    if (updated) { setLastSeen(updated); saveLastSeen(updated); }
  };

  // Unread counts (only relevant for staff – admins see different tabs)
  const today = new Date().toISOString().slice(0, 10);
  const newsCount = !isAdmin
    ? notes.filter(n => n.createdAt > lastSeen.news).length
      + polls.filter(p => p.createdAt > lastSeen.news).length
    : 0;
  const calendarCount = !isAdmin
    ? events.filter(e => e.public && e.date >= today && e.createdAt > lastSeen.calendar).length
    : 0;
  const boardCount = !isAdmin
    ? weddings.filter(w =>
        (w.updatedAt && w.updatedAt > lastSeen.board) ||
        (w.createdAt && w.createdAt > lastSeen.board)
      ).length
    : 0;

  // Load all data when logged in
  const loadData = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      const [w, n, e, s, p] = await Promise.all([apiGetWeddings(token), apiGetNotes(token), apiGetEvents(token), apiGetStaff(token), apiGetPolls(token)]);
      setWeddings(w);
      setNotes(n);
      setEvents(e);
      setPolls(p);
      setInitialLoadDone(true);
      setStaff(s.map(m => ({ id: m.id, name: m.name, department: m.department, initials: m.name.split(' ').map((p: string) => p[0]).join('').toUpperCase(), avatarColor: (m as any).avatarColor ?? '#008080', avatarImage: (m as any).avatarImage ?? null })));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) loadData();
  }, [user, token, loadData]);

  // Mark the initial view as seen when user first logs in
  useEffect(() => {
    if (!user) return;
    const now = new Date().toISOString();
    const updated = { ...loadLastSeen(), board: now }; // default tab is kanban
    setLastSeen(updated);
    saveLastSeen(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // When new data arrives while the user is already on that tab → mark as seen immediately
  useEffect(() => {
    if (!user || isAdmin) return;
    const now = new Date().toISOString();
    setLastSeen(prev => {
      let next = prev;
      if (activeView === 'kanban')   next = { ...prev, board: now };
      if (activeView === 'calendar') next = { ...prev, calendar: now };
      if (activeView === 'news')     next = { ...prev, news: now };
      if (next !== prev) saveLastSeen(next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddings, events, notes, polls]);

  // Echtzeit-Updates: SSE (sofort, Desktop/Android) + Polling (Fallback, iOS-sicher)
  useEffect(() => {
    if (!user || !token) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // ── SSE: sofortige Updates wenn Verbindung steht ──
    let es: EventSource | null = null;
    const connectSSE = () => {
      es?.close();
      es = new EventSource(`${API_URL}/api/stream?token=${token}`);
      es.onmessage = (e) => {
        try {
          const { type } = JSON.parse(e.data);
          if (type === 'weddings_changed') apiGetWeddings(token).then(w => setWeddings(w)).catch(() => {});
          else if (type === 'notes_changed')  apiGetNotes(token).then(n => setNotes(n)).catch(() => {});
          else if (type === 'polls_changed')  apiGetPolls(token).then(p => setPolls(p)).catch(() => {});
          else if (type === 'events_changed') apiGetEvents(token).then(ev => setEvents(ev)).catch(() => {});
          else if (type === 'staff_changed')  apiGetStaff(token).then(s => setStaff(s.map(m => ({
            id: m.id, name: m.name, department: m.department,
            initials: m.name.split(' ').map((p: string) => p[0]).join('').toUpperCase(),
            avatarColor: (m as any).avatarColor ?? '#008080', avatarImage: (m as any).avatarImage ?? null,
          })))).catch(() => {});
        } catch { /* ignore */ }
      };
    };
    connectSSE();

    // ── Polling: alle 15s kompletter Refresh (kein visibilityState-Check → iOS-sicher) ──
    const poll = setInterval(() => {
      loadData();
    }, 15000);

    // ── App kommt aus Hintergrund: visibilitychange + pageshow (iOS-zuverlässiger) ──
    const handleVisible = () => {
      loadData();
      connectSSE();
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      // persisted = aus iOS-Cache wiederhergestellt → definitiv neu laden
      if (e.persisted || document.visibilityState === 'visible') {
        loadData();
        connectSSE();
      }
    };

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleVisible);

    return () => {
      es?.close();
      clearInterval(poll);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleVisible);
    };
  }, [user, token, loadData]);

  const updateWedding = async (weddingId: string, updates: Partial<Wedding>) => {
    if (!token) return;
    try {
      const updated = await apiUpdateWedding(token, weddingId, updates);
      setWeddings(prev => prev.map(w => w.id === weddingId ? updated : w));
      if (selectedWedding?.id === weddingId) setSelectedWedding(updated);
      // Hochzeiten erscheinen automatisch in CalendarView (Quelle: weddings selbst).
      // Keine zusätzliche Event-Synchronisation mehr.
    } catch (err) {
      console.error('Failed to update wedding:', err);
    }
  };

  const handleUpdateAssignment = async (staffId: string, status: Availability) => {
    if (!selectedWedding || !token) return;
    const existing = selectedWedding.assignments.findIndex(a => a.staffId === staffId);
    const newAssignments = [...selectedWedding.assignments];
    if (existing >= 0) newAssignments[existing] = { staffId, status };
    else newAssignments.push({ staffId, status });
    await updateWedding(selectedWedding.id, { assignments: newAssignments });
  };

  const handleRequestsUpdate = async (weddingId: string, status: Availability, comment?: string) => {
    const wedding = weddings.find(w => w.id === weddingId);
    if (!wedding) return;
    const existing = wedding.assignments.findIndex(a => a.staffId === currentUser.id);
    const newAssignments = [...wedding.assignments];
    const own = comment?.trim() ? { staffId: currentUser.id, status, comment: comment.trim() } : { staffId: currentUser.id, status };
    if (existing >= 0) newAssignments[existing] = own;
    else newAssignments.push(own);
    await updateWedding(weddingId, { assignments: newAssignments });
  };

  // Eigenen Kommentar zur bestehenden Stimme setzen/ändern (leer = löschen)
  const handleUpdateOwnComment = async (comment: string) => {
    if (!selectedWedding) return;
    const own = selectedWedding.assignments.find(a => a.staffId === currentUser.id);
    if (!own) return;
    await updateWedding(selectedWedding.id, { assignments: [{ staffId: currentUser.id, status: own.status, comment }] });
  };

  const handleAddWedding = async (newWedding: Wedding) => {
    if (!token) return;
    try {
      const created = await apiCreateWedding(token, {
        coupleNames: newWedding.coupleNames,
        initials: newWedding.initials,
        date: newWedding.date,
        betreuungszeit: newWedding.betreuungszeit,
        location: newWedding.location,
        status: newWedding.status,
        childrenCount: newWedding.childrenCount,
        staffNeeded: newWedding.staffNeeded,
        notes: newWedding.notes,
      });

      // Direkt Mitarbeitende zuweisen wenn im Formular ausgewählt
      let final = created;
      if (newWedding.assignedStaffIds?.length > 0) {
        final = await apiUpdateWedding(token, created.id, { assignedStaffIds: newWedding.assignedStaffIds });
      }
      setWeddings(prev => [...prev, final]);
      // Hochzeit erscheint automatisch im Kalender — kein paralleler Event-Eintrag nötig.
    } catch (err) {
      console.error('Failed to create wedding:', err);
    }
  };

  const handleDeleteWedding = async (weddingId: string) => {
    if (!token) return;
    try {
      await apiDeleteWedding(token, weddingId);
      setWeddings(prev => prev.filter(w => w.id !== weddingId));
      if (selectedWedding?.id === weddingId) setSelectedWedding(null);
      // Kein parallel verknüpftes Event mehr → nichts weiter zu tun.
    } catch (err) {
      console.error('Failed to delete wedding:', err);
    }
  };

  const handleAddNote = async (text: string) => {
    if (!token) return;
    try {
      const note = await apiCreateNote(token, text);
      setNotes(prev => [note, ...prev]);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!token) return;
    try {
      await apiDeleteNote(token, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleAddPoll = async (question: string) => {
    if (!token) return;
    try {
      const poll = await apiCreatePoll(token, question);
      setPolls(prev => [poll, ...prev]);
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!token) return;
    try {
      await apiDeletePoll(token, pollId);
      setPolls(prev => prev.filter(p => p.id !== pollId));
    } catch (err) {
      console.error('Failed to delete poll:', err);
    }
  };

  const handleVotePoll = async (pollId: string, vote: PollChoice | null) => {
    if (!token) return;
    try {
      const updated = await apiVotePoll(token, pollId, vote);
      setPolls(prev => prev.map(p => p.id === pollId ? updated : p));
    } catch (err) {
      console.error('Failed to vote on poll:', err);
    }
  };

  const handleAddEvent = async (payload: Omit<AdminEvent, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!token) return;
    try {
      const ev = await apiCreateEvent(token, payload);
      setEvents(prev => [ev, ...prev]);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<AdminEvent>) => {
    if (!token) return;
    try {
      const ev = await apiUpdateEvent(token, eventId, updates);
      setEvents(prev => prev.map(e => e.id === eventId ? ev : e));
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!token) return;
    try {
      await apiDeleteEvent(token, eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleAdminStatusUpdate = async (weddingId: string, status: ProjectStatus) => {
    if (!isAdmin) return;
    const wedding = weddings.find(w => w.id === weddingId);
    if (!wedding) return;

    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      'Anfrage': ['Gebucht', 'Abgesagt'],
      'Gebucht': ['Geplant', 'Abgesagt', 'Anfrage'],
      'Geplant': ['Abgesagt', 'Gebucht'],
      'Abgesagt': ['Anfrage', 'Gebucht', 'Geplant'],
    };
    if (!validTransitions[wedding.status].includes(status)) return;
    await updateWedding(weddingId, { status });
  };

  const pendingRequestCount = weddings.filter(w => {
    if (w.status === 'Geplant' || w.status === 'Abgesagt') return false;
    // Fest eingeteilt → keine Anfrage mehr
    if (w.assignedStaffIds?.includes(currentUser.id)) return false;
    return !w.assignments.find(a => a.staffId === currentUser.id);
  }).length;

  const renderView = () => {
    switch (activeView) {
      case 'kanban':
        return <KanbanBoard weddings={weddings} onWeddingClick={setSelectedWedding} staff={staff} currentUser={currentUser} />;
      case 'news':
        return <NewsView notes={notes} polls={polls} currentUser={currentUser} isAdmin={isAdmin} onVotePoll={handleVotePoll} onDeletePoll={isAdmin ? handleDeletePoll : undefined} />;
      case 'calendar':
        return (
          <CalendarView
            weddings={weddings}
            events={events}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onWeddingClick={setSelectedWedding}
            currentUser={currentUser}
            isAdmin={isAdmin}
          />
        );
      case 'requests':
        return <RequestsView weddings={weddings} currentUser={currentUser} onUpdateAssignment={handleRequestsUpdate} />;
      case 'mines':
        return <MyWeddings weddings={weddings} currentUser={currentUser} onWeddingClick={setSelectedWedding} />;
      case 'aufgaben':
        return isAdmin ? (
          <AufgabenView weddings={weddings} token={token!} onNavigateToWedding={navigateToWedding} onNavigateToAdminTab={navigateToAdminTab} />
        ) : (
          <KanbanBoard weddings={weddings} onWeddingClick={setSelectedWedding} staff={staff} />
        );
      case 'admin':
        return isAdmin ? (
          <AdminPanel
            weddings={weddings}
            notes={notes}
            polls={polls}
            staff={staff}
            focusWeddingId={focusWeddingId}
            initialAdminTab={adminInitialTab}
            onAddWedding={handleAddWedding}
            onUpdateWedding={updateWedding}
            onUpdateWeddingStatus={handleAdminStatusUpdate}
            onDeleteWedding={handleDeleteWedding}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onAddPoll={handleAddPoll}
            onDeletePoll={handleDeletePoll}
          />
        ) : (
          <KanbanBoard weddings={weddings} onWeddingClick={setSelectedWedding} staff={staff} />
        );
      default:
        return null;
    }
  };

  // Lade-Screen NUR während der initiale Auth-Check läuft (max. 1-2s).
  // Sobald der User eingeloggt ist, rendern wir die App direkt — Daten kommen
  // im Hintergrund nach. Damit kann der Hintergrund-Refresh nie wieder den
  // Lade-Screen kurzzeitig einblenden.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main">
        <div className="text-center">
          <Heart size={48} className="text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!user) return (
    <>
      <UpdateBanner />
      <LoginScreen onShowLegal={setLegalPage} />
      <AnimatePresence>
        {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
      </AnimatePresence>
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-bg-main selection:bg-primary/20">
      <UpdateBanner />
      <header className="sticky top-0 z-30 bg-white px-6 py-4 flex justify-between items-center safe-pt">
        <div className="flex items-center">
          <h1 className="text-[26px] font-light text-text-main flex items-start tracking-tight" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
            WeddingKids
            <Heart size={14} fill="var(--color-primary)" className="text-primary ml-0.5 mt-1" />
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-right hidden sm:block">
            <p className="font-medium">{currentUser.name}</p>
            <p className="text-gray-500 text-xs">{currentUser.department}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Abmelden"
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            title="Abmelden"
          >
            <LogOut size={18} className="text-gray-600" />
          </button>
          <button
            onClick={() => setShowProfile(true)}
            aria-label="Profil bearbeiten"
            className="w-10 h-10 rounded-full border-2 border-white/60 flex items-center justify-center font-bold text-xs text-white transition-opacity hover:opacity-90 shrink-0"
            style={{ backgroundColor: user?.avatarColor || '#A8D8D8' }}
            title="Profil bearbeiten"
          >
            {currentUser.initials}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav
        currentView={activeView}
        setView={handleSetView}
        pendingRequestCount={pendingRequestCount}
        isAdmin={isAdmin}
        newsCount={newsCount}
        calendarCount={calendarCount}
        boardCount={boardCount}
      />

      {selectedWedding && (
        <WeddingModal
          wedding={selectedWedding}
          currentUser={currentUser}
          isAdmin={isAdmin}
          staff={staff}
          onClose={() => setSelectedWedding(null)}
          onUpdateAssignment={handleUpdateAssignment}
          onUpdateOwnComment={handleUpdateOwnComment}
        />
      )}

      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onShowLegal={setLegalPage} />}
      </AnimatePresence>

      <AnimatePresence>
        {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
      </AnimatePresence>
    </div>
  );
}
