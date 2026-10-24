import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wedding, Staff } from '../types';
import { STATUS_COLUMNS } from '../constants';
import { WeddingCard } from './WeddingCard';
import { isWeddingOver } from '../lib/weddingDates';

interface KanbanBoardProps {
  weddings: Wedding[];
  onWeddingClick: (wedding: Wedding) => void;
  staff?: Staff[];
  currentUser?: Staff | null;
}

// Jahres-Auswahl für das Board. Standard 2026 — sobald die Saison 2027
// produktiv ist, kommt 2028 als weitere Option dazu.
const AVAILABLE_YEARS = [2026, 2027] as const;
type WeddingYear = typeof AVAILABLE_YEARS[number];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ weddings, onWeddingClick, staff = [], currentUser }) => {
  const [year, setYear] = useState<WeddingYear>(2026);
  const getStatusLabel = (status: string) => (status === 'Anfrage' ? 'Anfragen' : status);
  // Vergangene Hochzeiten (>1 Tag her) verschwinden aus dem Board für alle —
  // auch abgesagte. Admins finden sie im Admin-Panel in den aufklappbaren
  // Blöcken "Abgeschlossen" bzw. "Abgesagt"; gelöscht wird nichts.
  const weddingsForYear = weddings.filter(
    w => new Date(w.date).getFullYear() === year && !isWeddingOver(w)
  );

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto no-scrollbar px-4 gap-4 pt-4">
      {/* Jahres-Wechsel */}
      <div className="inline-flex self-start rounded-xl border border-gray-200 bg-white p-1 items-center">
        {AVAILABLE_YEARS.map(y => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              year === y ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {STATUS_COLUMNS.map((col) => {
        const filtered = weddingsForYear.filter((w) => w.status === col);

        return (
          <div key={col} className="flex-none bg-bg-light rounded-xl flex flex-col p-3 overflow-hidden">
            <div className="flex justify-between items-center mb-4 px-1">
              <h2 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 flex items-center">
                {getStatusLabel(col)} ({filtered.length})
              </h2>
            </div>
            
            <div className="flex flex-col gap-2">
              {filtered.map((wedding) => (
                <motion.div
                  key={wedding.id}
                  layoutId={wedding.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <WeddingCard wedding={wedding} onClick={() => onWeddingClick(wedding)} staff={staff} currentUser={currentUser} />
                </motion.div>
              ))}
              
              {filtered.length === 0 && (
                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-gray-300 font-medium">Keine Aufträge in dieser Phase</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
