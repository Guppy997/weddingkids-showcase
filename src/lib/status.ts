import type { Availability, ProjectStatus } from '../types';

// Farben für Abstimmungen (Ja / Vielleicht / Nein) und Hochzeits-Status —
// an einer Stelle, damit Anfragen, Detail-Ansicht und Admin-Bereich gleich aussehen.

type Vote = Exclude<Availability, 'Ausstehend'>;

export const VOTE_STYLES: Record<Vote, { box: string; text: string; title: string }> = {
  Ja:         { box: 'bg-status-green-bg border-status-green-text/20', text: 'text-status-green-text', title: 'Zugesagt' },
  Vielleicht: { box: 'bg-[#FBF4E0] border-[#F8D8A8]',                   text: 'text-[#8A6A30]',         title: 'Vielleicht' },
  Nein:       { box: 'bg-status-red-bg border-status-red-text/20',     text: 'text-status-red-text',   title: 'Abgesagt' },
};

/** Hintergrund + Rahmen für eine Zeile mit dieser Stimme (grau, wenn noch offen). */
export const voteBoxClass = (status: Availability) =>
  status === 'Ausstehend' ? 'bg-gray-50 border-gray-200' : VOTE_STYLES[status].box;

export const WEDDING_STATUS_BADGE: Record<ProjectStatus, string> = {
  Anfrage:  'bg-primary/10 text-primary border border-primary/20',
  Gebucht:  'bg-status-yellow-bg text-status-yellow-text border border-status-yellow-text/20',
  Geplant:  'bg-status-green-bg text-status-green-text border border-status-green-text/20',
  Abgesagt: 'bg-status-red-bg text-status-red-text border border-status-red-text/20',
};
