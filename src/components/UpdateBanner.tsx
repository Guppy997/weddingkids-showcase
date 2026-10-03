import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

/**
 * Erkennt neue Service-Worker-Versionen und bietet dem User einen Reload an.
 *
 * Wie es funktioniert:
 * 1. Nach Page-Load wird der SW registriert (siehe index.html).
 * 2. Wir holen die Registration und hören auf `updatefound`.
 * 3. Sobald ein neuer SW im Status `installed` ist (und ein alter SW noch
 *    aktiv ist) → Update verfügbar → Banner anzeigen.
 * 4. User tippt → wir senden `SKIP_WAITING` an den neuen SW → der übernimmt
 *    → wir reloaden die Seite, damit der neue Bundle geladen wird.
 * 5. Zusätzlich: alle 60 Sekunden (wenn App sichtbar) prüfen wir aktiv auf
 *    neue Versionen via registration.update().
 */
export const UpdateBanner: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const handleNewWorker = (sw: ServiceWorker) => {
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          // Neuer SW wartet → Update bereit
          setWaitingWorker(sw);
        }
      });
    };

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      registration = reg;

      // Falls beim Page-Load schon ein neuer SW wartet
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
      }

      // Neuer SW wird gerade installiert
      if (reg.installing) handleNewWorker(reg.installing);

      // Künftige Updates beobachten
      reg.addEventListener('updatefound', () => {
        if (reg.installing) handleNewWorker(reg.installing);
      });
    });

    // Wenn der neue SW übernimmt → Seite neu laden
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Update-Check nur dann, wenn App tatsächlich aus dem Hintergrund kommt
    // (kein Polling-Intervall mehr → kein „nervt-immer"-Effekt während die App offen ist).
    // Zusätzlich entprellt: max. einmal pro 30 Min.
    let lastCheck = Date.now();
    const checkForUpdate = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastCheck < 30 * 60 * 1000) return; // max alle 30 Min
      lastCheck = now;
      registration?.update().catch(() => { /* ignore */ });
    };

    document.addEventListener('visibilitychange', checkForUpdate);
    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('pageshow', checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', checkForUpdate);
      window.removeEventListener('focus', checkForUpdate);
      window.removeEventListener('pageshow', checkForUpdate);
    };
  }, []);

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {waitingWorker && (
        <motion.button
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          onClick={applyUpdate}
          className="fixed top-3 left-3 right-3 z-50 bg-primary text-white rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between gap-3 safe-pt active:opacity-90"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <RefreshCw size={16} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold leading-tight">Neue Version verfügbar</p>
              <p className="text-[11px] opacity-90 leading-tight">Tippen zum Aktualisieren</p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider bg-white/15 px-3 py-1.5 rounded-full">
            Aktualisieren
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
