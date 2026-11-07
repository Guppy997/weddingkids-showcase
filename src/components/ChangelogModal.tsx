import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { CHANGELOG } from '../config/changelog';

interface ChangelogModalProps {
  onClose: () => void;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
        <h2 className="font-bold text-gray-800">Neu in der App</h2>
        <button onClick={onClose} aria-label="Schließen"
          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto px-6 py-5 space-y-6">
        {CHANGELOG.map(entry => (
          <section key={entry.version}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-bold text-gray-800 text-sm">
                Version {entry.version}
                {entry.version === __APP_VERSION__ && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Installiert
                  </span>
                )}
              </h3>
              <span className="text-[11px] text-gray-400 shrink-0">{formatDate(entry.date)}</span>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-1">{entry.title}</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc pl-5">
              {entry.items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <div className="h-[env(safe-area-inset-bottom)]" />
    </motion.div>
  </div>
);
