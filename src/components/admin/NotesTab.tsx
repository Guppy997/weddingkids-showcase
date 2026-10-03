import React from 'react';
import { X } from 'lucide-react';
import type { BoardNote, Poll } from '../../types';
import { inputClass } from './styles';

interface NotesTabProps {
  notes: BoardNote[];
  polls: Poll[];
  // Entwürfe liegen im AdminPanel, damit sie beim Tab-Wechsel erhalten bleiben
  noteText: string;
  setNoteText: (text: string) => void;
  pollQuestion: string;
  setPollQuestion: (text: string) => void;
  onAddNote?: (text: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onAddPoll?: (question: string) => void;
  onDeletePoll?: (pollId: string) => void;
}

/** Admin-Tab „Notizen“: News und Abstimmungen für das Team anlegen und verwalten. */
export const NotesTab: React.FC<NotesTabProps> = ({
  notes, polls, noteText, setNoteText, pollQuestion, setPollQuestion,
  onAddNote, onDeleteNote, onAddPoll, onDeletePoll,
}) => (
  <>
    {/* Neue Notiz */}
    <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Neue Notiz</p>
      <p className="text-sm text-gray-500 mb-3">Diese Nachricht wird im News-Tab für alle Mitarbeitenden angezeigt.</p>
      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Neue Notiz eingeben..."
        className={`${inputClass} mb-3`} rows={3} />
      <button onClick={() => { if (noteText.trim()) { onAddNote?.(noteText.trim()); setNoteText(''); } }}
        disabled={!noteText.trim()} className="w-full bg-primary text-white font-bold h-10 rounded-xl disabled:opacity-50">
        Notiz hinzufügen
      </button>
    </div>

    {/* Neue Abstimmung */}
    <div className="bg-white rounded-2xl p-4 border border-primary/30 mb-4">
      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Neue Abstimmung</p>
      <p className="text-sm text-gray-500 mb-3">
        Stell eine Frage — Mitarbeitende antworten mit Ja, Nein oder Vielleicht.
      </p>
      <textarea
        value={pollQuestion}
        onChange={e => setPollQuestion(e.target.value)}
        placeholder="z.B. Wer kann am 15.06. beim Team-Meeting dabei sein?"
        maxLength={280}
        className={`${inputClass} mb-3`}
        rows={3}
      />
      <button
        onClick={() => { if (pollQuestion.trim()) { onAddPoll?.(pollQuestion.trim()); setPollQuestion(''); } }}
        disabled={!pollQuestion.trim()}
        className="w-full bg-primary text-white font-bold h-10 rounded-xl disabled:opacity-50"
      >
        Abstimmung erstellen
      </button>
    </div>

    {/* Bestehende Notizen */}
    {notes.length > 0 && (
      <>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2">Notizen</p>
        <div className="space-y-2 mb-4">
          {notes.map(note => (
            <div key={note.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
                <p className="text-xs text-gray-400 mt-1">{note.createdBy} · {new Date(note.createdAt).toLocaleDateString('de-DE')}</p>
              </div>
              <button onClick={() => onDeleteNote?.(note.id)} aria-label="Notiz löschen" className="text-gray-300 hover:text-red-400 shrink-0"><X size={16} /></button>
            </div>
          ))}
        </div>
      </>
    )}

    {/* Bestehende Abstimmungen */}
    {polls.length > 0 && (
      <>
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 mt-2">Abstimmungen</p>
        <div className="space-y-2">
          {polls.map(poll => {
            const counts = { Ja: 0, Nein: 0, Vielleicht: 0 } as Record<'Ja' | 'Nein' | 'Vielleicht', number>;
            for (const v of poll.votes) counts[v.vote]++;
            // Pro Option die Namen sammeln (für die Anzeige unter den Chips)
            const voters: Record<'Ja' | 'Nein' | 'Vielleicht', string[]> = {
              Ja: poll.votes.filter(v => v.vote === 'Ja').map(v => v.userName),
              Nein: poll.votes.filter(v => v.vote === 'Nein').map(v => v.userName),
              Vielleicht: poll.votes.filter(v => v.vote === 'Vielleicht').map(v => v.userName),
            };
            return (
              <div key={poll.id} className="bg-white rounded-xl p-4 border border-primary/30 flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-800 whitespace-pre-wrap">{poll.question}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-status-green-bg text-status-green-text font-bold">{counts.Ja} Ja</span>
                    <span className="px-2 py-0.5 rounded-full bg-status-red-bg text-status-red-text font-bold">{counts.Nein} Nein</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FBF4E0] text-[#8A6A30] font-bold">{counts.Vielleicht} Vielleicht</span>
                  </div>

                  {/* Wer hat wie abgestimmt — pro Option eine Zeile */}
                  {poll.votes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                      {voters.Ja.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-bold w-20 shrink-0 text-status-green-text">Ja</span>
                          <span className="text-gray-600 leading-relaxed">{voters.Ja.join(', ')}</span>
                        </div>
                      )}
                      {voters.Nein.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-bold w-20 shrink-0 text-status-red-text">Nein</span>
                          <span className="text-gray-600 leading-relaxed">{voters.Nein.join(', ')}</span>
                        </div>
                      )}
                      {voters.Vielleicht.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-bold w-20 shrink-0 text-[#8A6A30]">Vielleicht</span>
                          <span className="text-gray-600 leading-relaxed">{voters.Vielleicht.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-3">
                    {poll.createdBy} · {new Date(poll.createdAt).toLocaleDateString('de-DE')} · {poll.votes.length} {poll.votes.length === 1 ? 'Antwort' : 'Antworten'}
                  </p>
                </div>
                <button
                  onClick={() => { if (window.confirm('Abstimmung wirklich löschen?')) onDeletePoll?.(poll.id); }}
                  aria-label="Abstimmung löschen"
                  className="text-gray-300 hover:text-red-400 shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </>
    )}
  </>
);
