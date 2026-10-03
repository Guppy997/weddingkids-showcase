import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, BarChart3, Trash2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { BoardNote, Poll, PollChoice, Staff } from '../types';

interface NewsViewProps {
  notes: BoardNote[];
  polls: Poll[];
  currentUser?: Staff | null;
  isAdmin?: boolean;
  onVotePoll: (pollId: string, vote: PollChoice | null) => void;
  onDeletePoll?: (pollId: string) => void;
}

// Reihenfolge wie überall sonst in der App (Hochzeits-Modal, Anfragen-Tab):
// Ja → Nein → Vielleicht.
const CHOICES: { value: PollChoice; icon: typeof CheckCircle2; bg: string; text: string; border: string; ring: string }[] = [
  { value: 'Ja',         icon: CheckCircle2, bg: 'bg-status-green-bg', text: 'text-status-green-text', border: 'border-status-green-text/30', ring: 'ring-status-green-text/30' },
  { value: 'Nein',       icon: XCircle,       bg: 'bg-status-red-bg',   text: 'text-status-red-text',   border: 'border-status-red-text/30',   ring: 'ring-status-red-text/30' },
  { value: 'Vielleicht', icon: HelpCircle,    bg: 'bg-[#FBF4E0]',       text: 'text-[#8A6A30]',         border: 'border-[#8A6A30]/30',         ring: 'ring-[#8A6A30]/30' },
];

interface FeedItem {
  type: 'note' | 'poll';
  id: string;
  createdAt: string;
  note?: BoardNote;
  poll?: Poll;
}

export const NewsView: React.FC<NewsViewProps> = ({ notes, polls, isAdmin = false, onVotePoll, onDeletePoll }) => {
  // Notizen + Abstimmungen chronologisch mischen
  const feed: FeedItem[] = [
    ...notes.map(n => ({ type: 'note' as const, id: n.id, createdAt: n.createdAt, note: n })),
    ...polls.map(p => ({ type: 'poll' as const, id: p.id, createdAt: p.createdAt, poll: p })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto no-scrollbar px-4 pt-4">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-800">Neuigkeiten</h2>
        <p className="text-sm text-gray-500 mt-1">Aktuelle Hinweise vom Admin-Team</p>
      </div>

      <AnimatePresence>
        {feed.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Newspaper size={28} className="text-primary/50" />
            </div>
            <p className="font-bold text-gray-400">Keine Neuigkeiten</p>
            <p className="text-sm text-gray-300 mt-1">Hier erscheinen Hinweise und Abstimmungen vom Admin-Team.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {feed.map((item, i) => {
              if (item.type === 'note') {
                const note = item.note!;
                return (
                  <motion.div
                    key={`note-${note.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border border-[#AFCFDA] shadow-sm p-4"
                  >
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                    <p className="text-[11px] text-gray-400 mt-3 font-medium">
                      {note.createdBy} · {new Date(note.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </motion.div>
                );
              }
              // Poll
              const poll = item.poll!;
              const counts: Record<PollChoice, number> = { Ja: 0, Nein: 0, Vielleicht: 0 };
              for (const v of poll.votes) counts[v.vote]++;
              const total = poll.votes.length;
              return (
                <motion.div
                  key={`poll-${poll.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-primary/40 shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <BarChart3 size={16} className="text-primary shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Abstimmung</span>
                      </div>
                      {isAdmin && onDeletePoll && (
                        <button
                          onClick={() => {
                            if (window.confirm('Diese Abstimmung wirklich löschen?')) onDeletePoll(poll.id);
                          }}
                          aria-label="Abstimmung löschen"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-status-red-text hover:bg-status-red-bg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-base font-bold text-gray-800 whitespace-pre-wrap leading-snug mb-4">
                      {poll.question}
                    </p>

                    {/* Vote-Buttons */}
                    <div className="flex gap-2 mb-3">
                      {CHOICES.map(({ value, icon: Icon, bg, text, border, ring }) => {
                        const isMine = poll.myVote === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={isMine}
                            title={isMine ? 'Stimme zurücknehmen' : undefined}
                            onClick={() => onVotePoll(poll.id, isMine ? null : value)}
                            className={`flex-1 py-2.5 rounded-lg border-2 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 ${bg} ${text} ${border} ${isMine ? `ring-2 ${ring}` : ''}`}
                          >
                            <Icon size={14} />
                            <span>{value}</span>
                            {counts[value] > 0 && (
                              <span className="font-normal opacity-60">({counts[value]})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Wer hat wie abgestimmt */}
                    {total > 0 && (
                      <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
                        {CHOICES.map(({ value, text }) => {
                          const voters = poll.votes.filter(v => v.vote === value);
                          if (voters.length === 0) return null;
                          return (
                            <div key={value} className="flex items-start gap-2 text-xs">
                              <span className={`font-bold w-20 shrink-0 ${text}`}>{value}</span>
                              <span className="text-gray-600 leading-relaxed">
                                {voters.map(v => v.userName).join(', ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[11px] text-gray-400 mt-3 font-medium">
                      {poll.createdBy} · {new Date(poll.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {total > 0 && ` · ${total} ${total === 1 ? 'Antwort' : 'Antworten'}`}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
