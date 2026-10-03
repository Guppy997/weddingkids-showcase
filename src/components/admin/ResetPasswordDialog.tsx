import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound } from 'lucide-react';
import { apiResetStaffPassword } from '../../api';
import { inputClass, labelClass } from './styles';

interface ResetPasswordDialogProps {
  token: string | null;
  resetTarget: { id: string; name: string } | null;
  onClose: () => void;
}

/** Dialog, in dem Admins ein temporäres Passwort für einen Staff-Account setzen. */
export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({ token, resetTarget, onClose }) => {
  const [resetPassword, setResetPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const handleResetPassword = async () => {
    if (!token || !resetTarget) return;
    if (resetPassword.length < 8) {
      setResetMessage({ kind: 'error', text: 'Mindestens 8 Zeichen' });
      return;
    }
    setResetBusy(true);
    setResetMessage(null);
    try {
      await apiResetStaffPassword(token, resetTarget.id, resetPassword);
      setResetMessage({
        kind: 'success',
        text: `Passwort für „${resetTarget.name}" wurde gesetzt. Bitte das temporäre Passwort sicher weitergeben — die Person sollte es im Profil sofort ändern.`,
      });
      setResetPassword('');
    } catch (err: any) {
      setResetMessage({ kind: 'error', text: err.message || 'Reset fehlgeschlagen' });
    } finally {
      setResetBusy(false);
    }
  };

  const closeResetDialog = () => {
    setResetPassword('');
    setResetMessage(null);
    setResetBusy(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeResetDialog}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="shrink-0 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <KeyRound size={18} className="text-primary" />
                Passwort zurücksetzen
              </h3>
              <button onClick={closeResetDialog} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Setze ein temporäres Passwort für <b>{resetTarget.name}</b>. Diese Person sollte
                es nach dem nächsten Login direkt in ihrem Profil ändern.
              </p>
              <div>
                <label className={labelClass}>Neues Passwort</label>
                <input
                  type="text"
                  autoFocus
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="mind. 8 Zeichen"
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-400 mt-2">
                  Tipp: Für jede Person ein eigenes Passwort wählen, z. B. drei zufällige Wörter mit Zahl.
                </p>
              </div>
              {resetMessage && (
                <div className={`text-sm p-3 rounded-xl ${resetMessage.kind === 'success' ? 'bg-status-green-bg text-status-green-text' : 'bg-status-red-bg text-status-red-text'}`}>
                  {resetMessage.text}
                </div>
              )}
            </div>
            <div className="shrink-0 px-6 py-4 border-t bg-bg-light grid grid-cols-2 gap-2">
              <button
                onClick={closeResetDialog}
                className="h-11 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:brightness-95 active:scale-[0.98] transition"
              >
                Schließen
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetBusy || resetPassword.length < 8}
                className="h-11 rounded-xl text-sm font-bold bg-primary text-white shadow-sm hover:brightness-95 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resetBusy ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
            <div className="h-[var(--safe-bottom)] bg-bg-light" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
