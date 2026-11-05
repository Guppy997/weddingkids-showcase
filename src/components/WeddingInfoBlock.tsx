import React from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, Baby, Users } from 'lucide-react';
import { Wedding } from '../types';
import { formatWeddingDateRange } from '../lib/weddingDates';

interface Props {
  wedding: Wedding;
  /** "compact" → kleinere Schrift (z.B. Board-Karten), "default" → normale Größe */
  size?: 'compact' | 'default';
}

/**
 * Einheitlicher Info-Block für Hochzeiten, der überall gleich aussieht:
 * Datum → Standort → Zeitraum → Kinderanzahl → benötigte Betreuer:innen
 *
 * Wird in WeddingCard (Board), RequestsView (Anfragen) und AdminPanel verwendet.
 */
export const WeddingInfoBlock: React.FC<Props> = ({ wedding, size = 'compact' }) => {
  const text = size === 'compact' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'compact' ? 12 : 14;
  const gap = size === 'compact' ? 'space-y-1.5' : 'space-y-2';

  return (
    <div className={`${gap}`}>
      <div className={`flex items-center ${text} text-gray-500`}>
        <CalendarIcon size={iconSize} className="mr-1.5 shrink-0" />
        {formatWeddingDateRange(wedding, {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </div>
      <div className={`flex items-center ${text} text-gray-500`}>
        <MapPin size={iconSize} className="mr-1.5 shrink-0" />
        <span className="truncate">{wedding.location}</span>
      </div>
      {wedding.betreuungszeit && (
        <div className={`flex items-center ${text} text-gray-500`}>
          <Clock size={iconSize} className="mr-1.5 shrink-0" />
          <span className="truncate">{wedding.betreuungszeit?.replace(/;\s*/g, ' · ')}</span>
        </div>
      )}
      <div className={`flex items-center ${text} text-gray-500`}>
        <Baby size={iconSize} className="mr-1.5 shrink-0" />
        {wedding.childrenCount > 0 ? `${wedding.childrenCount} Kinder` : 'Anzahl offen'}
      </div>
      {wedding.staffNeeded !== undefined && wedding.staffNeeded > 0 && (
        <div className={`flex items-center ${text} text-gray-500`}>
          <Users size={iconSize} className="mr-1.5 shrink-0" />
          {wedding.staffNeeded} {wedding.staffNeeded === 1 ? 'Betreuer:in' : 'Betreuer:innen'}
        </div>
      )}
    </div>
  );
};
