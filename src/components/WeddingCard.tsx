import React from 'react';
import { Users, Heart } from 'lucide-react';
import { Wedding, Staff, Availability } from '../types';
import { WeddingInfoBlock } from './WeddingInfoBlock';


interface WeddingCardProps {
  staff?: { id: string; name: string; initials: string; department: string; }[];
  wedding: Wedding;
  onClick: () => void;
  currentUser?: Staff | null;
}

// Pastell-Palette pro Antwort — passt zum bestehenden Vielleicht-Gelb &
// Status-Grün/Rot, sodass die Herzchen sich nahtlos ins UI einfügen.
const VOTE_STYLE: Record<Exclude<Availability, 'Ausstehend'>, { bg: string; text: string; label: string }> = {
  Ja:         { bg: 'bg-status-green-bg', text: 'text-status-green-text', label: 'Du hast mit Ja abgestimmt' },
  Vielleicht: { bg: 'bg-[#FBF4E0]',       text: 'text-[#8A6A30]',         label: 'Du hast mit Vielleicht abgestimmt' },
  Nein:       { bg: 'bg-status-red-bg',   text: 'text-status-red-text',   label: 'Du hast mit Nein abgestimmt' },
};

export const WeddingCard: React.FC<WeddingCardProps> = ({ wedding, onClick, staff = [], currentUser }) => {
  // Only show staff that the admin has explicitly assigned
  const assignedStaff = wedding.assignedStaffIds
    .map((staffId) => staff.find((s) => s.id === staffId))
    .filter((member): member is Staff => Boolean(member));

  // Eigene Abstimmung des aktuellen Users (nur anzeigen wenn Ja/Nein/Vielleicht,
  // nicht bei "Ausstehend" oder fehlendem Eintrag)
  const myVote = currentUser
    ? wedding.assignments.find(a => a.staffId === currentUser.id)?.status
    : undefined;
  const voteStyle = myVote && myVote !== 'Ausstehend' ? VOTE_STYLE[myVote] : null;

  return (
    <button
      id={`wedding-card-${wedding.id}`}
      onClick={onClick}
      className="card w-full text-left active:scale-[0.98] transition-transform relative"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-text-main">{wedding.coupleNames}</h3>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
          wedding.status === 'Gebucht'
            ? 'bg-status-yellow-bg text-status-yellow-text'
            : wedding.status === 'Geplant'
            ? 'bg-status-green-bg text-status-green-text'
            : wedding.status === 'Abgesagt'
            ? 'bg-status-red-bg text-status-red-text'
            : 'bg-primary/10 text-primary'
        }`}>
          {wedding.status}
        </span>
      </div>

      <div className="mb-3">
        <WeddingInfoBlock wedding={wedding} size="compact" />
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <div className="flex -space-x-1.5">
          {assignedStaff.slice(0, 5).map((member) => (
            <div
              key={member.id}
              title={member.name}
              className="w-7 h-7 rounded-full border-2 border-white overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={member.avatarImage ? undefined : { backgroundColor: member.avatarColor || '#008080' }}
            >
              {member.avatarImage
                ? <img src={member.avatarImage} alt={member.name} className="w-full h-full object-cover" />
                : member.initials
              }
            </div>
          ))}
          {assignedStaff.length > 5 && (
            <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">
              +{assignedStaff.length - 5}
            </div>
          )}
          {assignedStaff.length === 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
              <Users size={10} className="text-gray-300" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {assignedStaff.length > 0 && (
            <span className="text-[10px] text-gray-400">{assignedStaff.length} eingeteilt</span>
          )}
          {voteStyle && (
            <span
              aria-label={voteStyle.label}
              title={voteStyle.label}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${voteStyle.bg} ${voteStyle.text}`}
            >
              <Heart size={13} fill="currentColor" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
