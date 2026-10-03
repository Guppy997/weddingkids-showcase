import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequestAccess } from '../api';

type Screen = 'login' | 'register';

interface LoginScreenProps {
  onShowLegal?: (page: 'impressum' | 'datenschutz') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onShowLegal }) => {
  const { login } = useAuth();
  const [screen, setScreen] = useState<Screen>('login');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regForm, setRegForm] = useState({ name: '', username: '', password: '', passwordConfirm: '' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Ungültige Anmeldedaten.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.passwordConfirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    if (regForm.password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    setIsLoading(true);
    try {
      await apiRequestAccess({ name: regForm.name, username: regForm.username, password: regForm.password });
      setSuccess('Anfrage gesendet! Ein Admin wird deinen Zugang freigeben.');
      setRegForm({ name: '', username: '', password: '', passwordConfirm: '' });
    } catch (err: any) {
      setError(err.message || 'Anfrage fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white";
  const labelClass = "block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary/10 via-bg-main to-bg-main items-center justify-center p-4 safe-pt safe-pb">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4">
            <img src="/icon-512.png" alt="WeddingKids Logo" className="w-full h-full object-cover rounded-full shadow-lg shadow-primary/20" />
          </div>
          <h1 className="text-4xl font-light text-text-main tracking-tight flex items-start" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
            WeddingKids<Heart size={14} fill="white" className="text-white ml-0.5 mt-2" />
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {screen === 'login' ? 'Hochzeitsverwaltung für Mitarbeitende' : 'Zugang beantragen'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {screen === 'login' ? (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-[#FAE8E8] border border-[#F4A8A8] rounded-xl">
                  <AlertCircle size={16} className="text-[#8A4848] shrink-0" />
                  <p className="text-sm text-[#8A4848] font-medium">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>Benutzername</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="Benutzername eingeben" autoComplete="username" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Passwort</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Passwort eingeben" autoComplete="current-password" className={inputClass} />
                </div>
                <button type="submit" disabled={isLoading || !username || !password}
                  className="w-full bg-primary text-white font-bold h-12 rounded-xl mt-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                  {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
                </button>
              </form>

              <div className="pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-2">Noch kein Zugang?</p>
                <button onClick={() => { setScreen('register'); setError(''); }}
                  className="text-sm font-bold text-primary hover:underline">
                  Zugang beantragen
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-[#FAE8E8] border border-[#F4A8A8] rounded-xl">
                  <AlertCircle size={16} className="text-[#8A4848] shrink-0" />
                  <p className="text-sm text-[#8A4848] font-medium">{error}</p>
                </motion.div>
              )}

              {success ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle2 size={48} className="text-[#4A7A5A]" />
                  <p className="font-bold text-gray-800">Anfrage gesendet!</p>
                  <p className="text-sm text-gray-500">Ein Admin wird deinen Zugang freigeben. Du bekommst dann Bescheid.</p>
                  <button onClick={() => { setScreen('login'); setSuccess(''); }}
                    className="mt-4 text-sm font-bold text-primary hover:underline">
                    Zurück zum Login
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className={labelClass}>Vollständiger Name</label>
                    <input type="text" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="z.B. Max Mustermann" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Benutzername</label>
                    <input type="text" value={regForm.username} onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                      placeholder="z.B. max.mustermann" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Passwort</label>
                    <input type="password" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Mindestens 8 Zeichen" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Passwort bestätigen</label>
                    <input type="password" value={regForm.passwordConfirm} onChange={e => setRegForm({ ...regForm, passwordConfirm: e.target.value })}
                      placeholder="Passwort wiederholen" required className={inputClass} />
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full bg-primary text-white font-bold h-12 rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                    {isLoading ? 'Wird gesendet...' : 'Zugang beantragen'}
                  </button>
                  <button type="button" onClick={() => { setScreen('login'); setError(''); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                    ← Zurück zum Login
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-gray-400 text-center mt-8">Sichere Verbindung · HTTPS verschlüsselt</p>

        {onShowLegal && (
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <button onClick={() => onShowLegal('impressum')} className="text-gray-400 hover:text-primary underline">
              Impressum
            </button>
            <button onClick={() => onShowLegal('datenschutz')} className="text-gray-400 hover:text-primary underline">
              Datenschutzerklärung
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
