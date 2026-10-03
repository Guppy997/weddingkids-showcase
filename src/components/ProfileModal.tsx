import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Eye, EyeOff, Download, Trash2, Shield, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiExportData, apiDeleteAccount } from '../api';
import { isPushSupported, isPushSubscribed, isStandalonePWA, subscribeToPush, unsubscribeFromPush } from '../lib/push';

const AVATAR_COLORS = [
  '#A8D8D8', // pastel teal
  '#A8C4E8', // pastel blue
  '#B8D4F0', // pastel sky
  '#C4B4E8', // pastel violet
  '#D4B8E8', // pastel purple
  '#F4B8D4', // pastel pink
  '#F8C8D4', // pastel rose
  '#F8D8A8', // pastel amber
  '#F8E4A8', // pastel yellow
  '#A8E4C8', // pastel emerald
  '#B8E8B8', // pastel green
  '#F4A8A8', // pastel red/coral
  '#F4C4A8', // pastel peach
  '#C8C8D8', // pastel lavender gray
];

interface ProfileModalProps {
  onClose: () => void;
  onShowLegal?: (page: 'impressum' | 'datenschutz') => void;
}

type Section = 'profile' | 'password' | 'privacy';

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, onShowLegal }) => {
  const { user, token, logout, updateProfile, changePassword } = useAuth();
  const [section, setSection] = useState<Section>('profile');

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? '#A8D8D8');

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Push-Notifications: Status laden
  const [pushSupported] = useState(isPushSupported());
  const [pushStandalone] = useState(isStandalonePWA());
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    isPushSubscribed().then(setPushOn).catch(() => setPushOn(false));
  }, []);

  const handleTogglePush = async () => {
    if (!token) return;
    setPushBusy(true); setError(''); setSuccess('');
    try {
      if (pushOn) {
        await unsubscribeFromPush(token);
        setPushOn(false);
        setSuccess('Benachrichtigungen deaktiviert.');
      } else {
        await subscribeToPush(token);
        setPushOn(true);
        setSuccess('Benachrichtigungen aktiviert!');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Fehler beim Ändern der Benachrichtigungen.');
    } finally {
      setPushBusy(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initials = (name || user?.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(''); setSuccess(''); setIsLoading(true);
    try {
      await updateProfile({ name: name.trim(), avatarColor });
      setSuccess('Profil gespeichert!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── DSGVO: Datenexport ───
  const [deletePw, setDeletePw] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    if (!token) return;
    setError(''); setSuccess('');
    try {
      const blob = await apiExportData(token);
      // Download as file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weddingkids-meine-daten-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess('Daten heruntergeladen!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Export fehlgeschlagen.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    if (!deletePw) { setError('Bitte Passwort eingeben.'); return; }
    setError(''); setSuccess(''); setIsLoading(true);
    try {
      await apiDeleteAccount(token, deletePw);
      // Account deleted → log out
      logout();
    } catch (err: any) {
      setError(err.message || 'Löschung fehlgeschlagen.');
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPw !== confirmPw) { setError('Passwörter stimmen nicht überein.'); return; }
    if (newPw.length < 8) { setError('Mindestens 8 Zeichen.'); return; }
    setIsLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setSuccess('Passwort geändert!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Ändern.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-sm';
  const labelClass = 'block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Mein Profil</h2>
          <button onClick={onClose} aria-label="Profil schließen" className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg transition-colors"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <p className="font-bold text-gray-800 mt-3">{name || user?.name}</p>
          <p className="text-xs text-gray-500">{user?.department} · {user?.role}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-6 mb-4 bg-gray-100 rounded-xl p-1">
          {(['profile', 'password', 'privacy'] as Section[]).map(s => (
            <button key={s} onClick={() => { setSection(s); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${section === s ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
              {s === 'profile' ? 'Profil' : s === 'password' ? 'Passwort' : 'Daten'}
            </button>
          ))}
        </div>

        {/* Feedback */}
        <div className="px-6">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 mb-3 bg-[#FAE8E8] border border-[#F4A8A8] rounded-xl text-sm text-[#8A4848]">
                <AlertCircle size={15} className="shrink-0" />{error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 mb-3 bg-[#E4F5EC] border border-[#A8E4C8] rounded-xl text-sm text-[#4A7A5A]">
                <CheckCircle2 size={15} className="shrink-0" />{success}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile section */}
        {section === 'profile' && (
          <form onSubmit={handleSaveProfile} className="px-6 pb-8 space-y-4">
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Profilfarbe</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    aria-label={`Profilfarbe ${color}`}
                    aria-pressed={avatarColor === color}
                    className="w-9 h-9 rounded-full transition-all relative"
                    style={{ backgroundColor: color }}
                  >
                    {avatarColor === color && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-white drop-shadow" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={isLoading || !name.trim()}
              className="w-full bg-primary text-white font-bold h-12 rounded-xl disabled:opacity-50 transition-all mt-2">
              {isLoading ? 'Wird gespeichert...' : 'Speichern'}
            </button>

            {/* Push-Notifications */}
            <div className="pt-5 mt-5 border-t border-gray-100">
              <p className={labelClass}>Benachrichtigungen</p>
              {!pushSupported ? (
                <p className="text-xs text-gray-500">
                  Dein Browser unterstützt keine Benachrichtigungen.
                </p>
              ) : !pushStandalone && /iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                <div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  📱 Auf dem iPhone musst du die App zuerst <strong>zum Home-Bildschirm hinzufügen</strong>{' '}
                  (Safari → Teilen → „Zum Home-Bildschirm"), erst dann kannst du Benachrichtigungen erhalten.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={pushBusy}
                  className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition disabled:opacity-50 ${
                    pushOn ? 'bg-status-green-bg text-status-green-text' : 'bg-primary/15 text-primary'
                  }`}
                >
                  {pushOn ? <Bell size={16} /> : <BellOff size={16} />}
                  {pushBusy ? 'Bitte warten…' : pushOn ? 'Benachrichtigungen aktiv' : 'Benachrichtigungen aktivieren'}
                </button>
              )}
              <p className="text-[11px] text-gray-400 mt-2">
                Du erhältst eine Mitteilung, wenn neue Hochzeiten angelegt werden.
              </p>
              <p className="text-[10px] text-gray-300 mt-1">
                Installierte Version: {__APP_VERSION__}
              </p>
            </div>
          </form>
        )}

        {/* Password section */}
        {section === 'password' && (
          <form onSubmit={handleChangePassword} className="px-6 pb-8 space-y-4">
            <div>
              <label className={labelClass}>Aktuelles Passwort</label>
              <div className="relative">
                <input type={showCurrentPw ? 'text' : 'password'} value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)} required className={inputClass + ' pr-12'} />
                <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                  aria-label={showCurrentPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Neues Passwort</label>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} value={newPw}
                  onChange={e => setNewPw(e.target.value)} required className={inputClass + ' pr-12'} />
                <button type="button" onClick={() => setShowNewPw(v => !v)}
                  aria-label={showNewPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Passwort bestätigen</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                required className={inputClass} />
            </div>
            <button type="submit" disabled={isLoading || !currentPw || !newPw || !confirmPw}
              className="w-full bg-primary text-white font-bold h-12 rounded-xl disabled:opacity-50 transition-all mt-2">
              {isLoading ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        )}

        {/* Privacy / DSGVO section */}
        {section === 'privacy' && (
          <div className="px-6 pb-8 space-y-5">
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-xl">
              <Shield size={18} className="text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-gray-700 leading-relaxed">
                Hier kannst du deine bei uns gespeicherten Daten herunterladen oder dein Konto vollständig löschen — gemäß DSGVO.
              </p>
            </div>

            {/* Export */}
            <div>
              <p className={labelClass}>Daten herunterladen</p>
              <p className="text-xs text-gray-500 mb-2">Erhalte alle zu deinem Konto gespeicherten Daten als JSON-Datei.</p>
              <button
                type="button"
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary/15 text-primary font-bold text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition"
              >
                <Download size={16} /> Meine Daten exportieren
              </button>
            </div>

            {/* Delete */}
            <div className="pt-4 border-t border-gray-100">
              <p className={`${labelClass} text-[#8A4848]`}>Konto löschen</p>
              <p className="text-xs text-gray-500 mb-3">
                Dein Konto und alle persönlichen Daten werden unwiderruflich gelöscht.
                Hochzeitsdaten bleiben für die anderen Mitarbeitenden erhalten.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-status-red-bg text-status-red-text font-bold text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition"
                >
                  <Trash2 size={16} /> Konto löschen
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Aktuelles Passwort zur Bestätigung"
                    value={deletePw}
                    onChange={e => setDeletePw(e.target.value)}
                    className={inputClass}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeletePw(''); setError(''); }}
                      className="h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isLoading || !deletePw}
                      className="h-11 rounded-xl bg-status-red-bg text-status-red-text font-bold text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition disabled:opacity-40"
                    >
                      {isLoading ? 'Löschen...' : 'Endgültig löschen'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Legal links */}
            {onShowLegal && (
              <div className="pt-4 border-t border-gray-100 flex justify-center gap-4 text-xs">
                <button onClick={() => onShowLegal('impressum')} className="text-gray-400 hover:text-primary underline">
                  Impressum
                </button>
                <button onClick={() => onShowLegal('datenschutz')} className="text-gray-400 hover:text-primary underline">
                  Datenschutzerklärung
                </button>
              </div>
            )}

            {/* App version */}
            <div className="pt-3 text-center">
              <p className="text-[11px] text-gray-300 font-medium tracking-wide">
                WeddingKids · Version {__APP_VERSION__}
              </p>
            </div>
          </div>
        )}

        <div className="h-[env(safe-area-inset-bottom)]" />
      </motion.div>
    </div>
  );
};
