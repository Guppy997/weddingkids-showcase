import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { COMPANY, CONTENT_RESPONSIBLE } from '../config/legal';

export type LegalPage = 'impressum' | 'datenschutz';

interface LegalModalProps {
  page: LegalPage;
  onClose: () => void;
}


export const LegalModal: React.FC<LegalModalProps> = ({ page, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
          <h2 className="font-bold text-gray-800">
            {page === 'impressum' ? 'Impressum' : 'Datenschutzerklärung'}
          </h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 text-sm text-gray-700 leading-relaxed space-y-4">
          {page === 'impressum' ? <ImpressumContent /> : <DatenschutzContent />}
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </motion.div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────
// IMPRESSUM
// ───────────────────────────────────────────────────────────────
const ImpressumContent: React.FC = () => (
  <>
    <h3 className="font-bold text-gray-900 text-base mt-2">Angaben gemäß § 5 TMG</h3>
    <p>
      {COMPANY.name}<br />
      {COMPANY.street}<br />
      {COMPANY.city}<br />
      {COMPANY.country}
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">Vertreten durch</h3>
    <p>{COMPANY.representedBy}</p>

    <h3 className="font-bold text-gray-900 text-base mt-4">Kontakt</h3>
    <p>
      Telefon: {COMPANY.phone}<br />
      E-Mail: {COMPANY.email}
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">Umsatzsteuer-ID</h3>
    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: {COMPANY.vatId}</p>

    <h3 className="font-bold text-gray-900 text-base mt-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
    <p>
      {CONTENT_RESPONSIBLE.name}<br />
      {CONTENT_RESPONSIBLE.street}<br />
      {CONTENT_RESPONSIBLE.city}
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">Haftungsausschluss</h3>
    <p className="text-xs">
      Die Inhalte dieser Anwendung wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit
      und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Die Nutzung der Anwendung erfolgt auf
      eigenes Risiko.
    </p>
  </>
);

// ───────────────────────────────────────────────────────────────
// DATENSCHUTZERKLÄRUNG
// ───────────────────────────────────────────────────────────────
const DatenschutzContent: React.FC = () => (
  <>
    <h3 className="font-bold text-gray-900 text-base mt-2">1. Verantwortlicher</h3>
    <p>
      Verantwortlich für die Verarbeitung personenbezogener Daten ist:<br />
      {COMPANY.name}<br />
      vertreten durch {COMPANY.representedBy}<br />
      {COMPANY.street}<br />
      {COMPANY.city}<br />
      Telefon: {COMPANY.phone}<br />
      E-Mail: {COMPANY.email}
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">2. Welche Daten werden verarbeitet?</h3>
    <p>Im Rahmen der Nutzung dieser Anwendung werden folgende Daten verarbeitet:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><b>Account-Daten:</b> Vor- und Nachname, Benutzername, verschlüsseltes Passwort, Rolle (Admin/Mitarbeiter), Bereich, gewählte Profilfarbe</li>
      <li><b>Hochzeits- und Einsatzdaten:</b> Termine, Orte, Kinderanzahl, Notizen, Statusänderungen, Einteilungen</li>
      <li><b>Aktivitätsprotokoll:</b> Zeitstempel von Statusänderungen, Einteilungen, Hochzeits-Bearbeitungen, Votes, Notizen und Account-Aktionen mit Verursacher-Name (die letzten 100 Einträge sind im Verlauf sichtbar)</li>
      <li><b>Technische Daten:</b> Authentifizierungs-Token (im Browser-Speicher), bei API-Anfragen die IP-Adresse (nur kurzzeitig im Server-Log)</li>
    </ul>

    <h3 className="font-bold text-gray-900 text-base mt-4">3. Zweck und Rechtsgrundlage</h3>
    <p>
      Die Datenverarbeitung erfolgt zum Zweck der Personalplanung und Koordination von Hochzeitsbetreuungen. Rechtsgrundlage
      ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung gegenüber Mitarbeitenden) sowie Art. 6 Abs. 1 lit. f DSGVO
      (berechtigtes Interesse an einem effizienten Betrieb).
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">4. Speicherort und Auftragsverarbeitung</h3>
    <p>
      Sämtliche Anwendungsdaten werden ausschließlich auf einem Server der Oracle Cloud Infrastructure mit Standort
      in Frankfurt, Deutschland, gespeichert. Mit Oracle besteht ein Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO.
    </p>
    <p className="mt-2">
      <b>Push-Benachrichtigungen (optional):</b> Wenn du Push-Benachrichtigungen aktivierst, wird ein Geräte-spezifisches
      Push-Token an den Push-Dienst deines Browsers übermittelt – das ist je nach Gerät Google (FCM, USA),
      Apple (APNs, USA) oder Mozilla (autopush, USA). Diese Dienste sind technisch erforderlich, um Push-Nachrichten
      an dein Gerät zuzustellen, und stellen eine Übermittlung in ein Drittland (USA) dar. Rechtsgrundlage ist
      deine Einwilligung (Art. 6 Abs. 1 lit. a, Art. 49 Abs. 1 lit. a DSGVO), die du jederzeit über den
      Schalter im Profil zurücknehmen kannst. Eine Übermittlung erfolgt nur, solange du Push-Notifications aktiviert hast.
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">5. Speicherdauer</h3>
    <p>
      Account-Daten werden so lange gespeichert, wie der Account aktiv ist. Bei Konto-Löschung werden alle persönlichen
      Daten unverzüglich entfernt. Hochzeitsbezogene Daten werden so lange aufbewahrt, wie sie für die Betriebsführung
      benötigt werden, und können vom Administrator manuell gelöscht werden. Backups werden 30 Tage aufbewahrt.
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">6. Cookies / Lokaler Speicher</h3>
    <p>
      Diese Anwendung verwendet keine Cookies. Im lokalen Speicher (localStorage) des Browsers wird ausschließlich
      ein Authentifizierungs-Token sowie die zuletzt geladenen Nutzerdaten gespeichert. Diese werden bei der Abmeldung
      automatisch gelöscht.
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">7. Deine Rechte</h3>
    <p>Du hast jederzeit folgende Rechte:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><b>Auskunft</b> über die zu deiner Person gespeicherten Daten (Art. 15 DSGVO)</li>
      <li><b>Berichtigung</b> unrichtiger Daten (Art. 16 DSGVO)</li>
      <li><b>Löschung</b> deiner Daten (Art. 17 DSGVO) — direkt im Profil-Bereich möglich</li>
      <li><b>Datenübertragbarkeit</b> — Export deiner Daten als JSON-Datei (Art. 20 DSGVO) — direkt im Profil-Bereich</li>
      <li><b>Widerspruch</b> gegen die Verarbeitung (Art. 21 DSGVO)</li>
      <li><b>Beschwerde</b> bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
    </ul>

    <h3 className="font-bold text-gray-900 text-base mt-4">8. Sicherheit</h3>
    <p>
      Die Übertragung erfolgt verschlüsselt über HTTPS (TLS). Passwörter werden ausschließlich als bcrypt-Hashes
      gespeichert — auch wir können dein Passwort nicht einsehen. Der Server ist durch eine Firewall und Brute-Force-Schutz
      abgesichert.
    </p>

    <h3 className="font-bold text-gray-900 text-base mt-4">9. Änderungen</h3>
    <p className="text-xs">
      Diese Datenschutzerklärung wurde zuletzt am {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })} aktualisiert.
      Bei wesentlichen Änderungen werden alle Nutzer in der Anwendung informiert.
    </p>
  </>
);
