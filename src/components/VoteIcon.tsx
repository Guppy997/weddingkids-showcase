import React from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { Availability } from '../types';

/** Icon für eine Abstimmung: ✓ Ja, ✗ Nein, ? Vielleicht (nichts, wenn noch offen). */
export const VoteIcon: React.FC<{ status: Availability; size?: number }> = ({ status, size = 16 }) => {
  switch (status) {
    case 'Ja': return <CheckCircle2 size={size} className="text-status-green-text" />;
    case 'Nein': return <XCircle size={size} className="text-status-red-text" />;
    case 'Vielleicht': return <HelpCircle size={size} className="text-[#8A6A30]" />;
    default: return null;
  }
};
