// Versionsverlauf für „Neu in der App“ (Profil) und den Update-Hinweis.
// Neueste Version zuerst. Bei jedem Release einen Eintrag ergänzen (zusammen
// mit dem Versions-Bump in package.json) — in Alltagssprache, ohne Technik.

export interface ChangelogEntry {
  version: string;
  date: string; // ISO (YYYY-MM-DD)
  title: string; // eine Zeile, erscheint auch im Update-Hinweis
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.19.1',
    date: '2026-11-10',
    title: 'Sicherheits-Update',
    items: [
      'Jeden Namen gibt es im Team nur noch einmal. Wer seinen Namen ändert, kann keinen nehmen, den schon jemand trägt.',
      'Wird ein Account gelöscht, bleiben dessen News, Termine und Abstimmungen erhalten.',
      'Das eigene Konto löschst du nur noch im Profil unter „Konto löschen“.',
    ],
  },
  {
    version: '1.19.0',
    date: '2026-11-07',
    title: 'Abgesagte Hochzeiten räumen sich selbst auf',
    items: [
      'Abgesagte Hochzeiten werden nach ihrem Datum automatisch gelöscht und verschwinden aus dem Admin-Bereich.',
      'Im Verlauf steht dazu jeweils ein Eintrag.',
    ],
  },
  {
    version: '1.18.1',
    date: '2026-11-05',
    title: 'Datum und Uhrzeit leichter eintragen',
    items: [
      'Bei „Mehrere Tage“ steht das Bis-Datum schon auf dem Tag nach „Von“ — die Auswahl öffnet direkt dort.',
      'Eine eingetragene Betreuungszeit lässt sich mit „Zeit entfernen“ wieder löschen.',
    ],
  },
  {
    version: '1.18.0',
    date: '2026-11-05',
    title: 'Betreuung über mehrere Tage',
    items: [
      'Beim Anlegen einer Hochzeit kannst du jetzt „Mehrere Tage“ anhaken, z. B. für eine Betreuung übers ganze Wochenende.',
      'Mehrtägige Hochzeiten stehen im Kalender an jedem Tag und zeigen überall den ganzen Zeitraum.',
    ],
  },
  {
    version: '1.17.0',
    date: '2026-10-24',
    title: 'Versionsverlauf im Profil',
    items: [
      'Im Profil findest du jetzt unter „Neu in der App“, was sich in den letzten Versionen geändert hat.',
      'Der Hinweis „Neue Version verfügbar“ verrät dir jetzt, was neu ist.',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-10-24',
    title: 'Mehr Sicherheit bei der Anmeldung',
    items: [
      'Deine Anmeldung bleibt 30 Tage gültig und verlängert sich bei jedem Öffnen der App. Du musst dich nicht neu anmelden.',
      'Wenn du dein Passwort änderst, werden alle anderen Geräte automatisch abgemeldet.',
      'Die Live-Aktualisierung und die Benachrichtigungen wurden sicherer gemacht.',
      'Außerdem wurden die Server-Software und alle Bausteine der App auf den neuesten Stand gebracht.',
    ],
  },
  {
    version: '1.15.2',
    date: '2026-10-06',
    title: 'Abgesagte Hochzeiten verschwinden vom Board',
    items: ['Abgesagte Hochzeiten werden nach ihrem Datum automatisch vom Board ausgeblendet.'],
  },
  {
    version: '1.15.1',
    date: '2026-10-04',
    title: 'Datumsfehler bei der Zeitumstellung behoben',
    items: [
      'Hochzeiten rund um die Zeitumstellung im Oktober zeigten teils das falsche Datum — das ist behoben.',
      'Die Status-Farben sehen jetzt überall gleich aus.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-10-03',
    title: 'Aufgeräumt und sicherer',
    items: [
      'Die App wurde intern gründlich aufgeräumt, damit sie stabiler läuft und sich leichter erweitern lässt.',
      'Beim Zurücksetzen eines Passworts wird kein festes Beispiel-Passwort mehr vorgeschlagen.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-10-03',
    title: 'Kommentar zur eigenen Abstimmung',
    items: ['Bei einer Abstimmung kannst du jetzt einen kurzen Kommentar zu deiner Antwort hinzufügen.'],
  },
  {
    version: '1.13.0',
    date: '2026-09-24',
    title: 'Sicherheits-Update',
    items: [
      'Gelöschte oder deaktivierte Konten verlieren sofort den Zugriff.',
      'Die Rechte von Admins und Mitarbeiter:innen werden jetzt strenger geprüft.',
    ],
  },
  {
    version: '1.12.2',
    date: '2026-09-24',
    title: 'Admin: übersichtlichere Hochzeitsliste',
    items: [
      'Im Admin-Bereich lassen sich Hochzeiten aufklappen.',
      'Abgeschlossene Hochzeiten stehen mit der neuesten zuerst.',
    ],
  },
  {
    version: '1.12.1',
    date: '2026-09-13',
    title: '2027-Anfragen wie 2026',
    items: ['Anfragen für 2027 werden in Liste, Zählern und Benachrichtigungen genauso behandelt wie 2026.'],
  },
  {
    version: '1.12.0',
    date: '2026-07-03',
    title: 'Kleine Verbesserungen',
    items: [
      'Der Status „gebucht“ ist jetzt gelb.',
      'Im Admin-Bereich funktioniert das Scrollen besser.',
      'Die Abstimmungs-Buttons sind kompakter.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-05-25',
    title: 'Neuer Termin im Kalender',
    items: [
      'Das Formular „Neuer Termin“ ist neu gestaltet: mehrtägige Termine, Farbe und Uhrzeit sind möglich.',
      'Admins können Termine im Kalender bearbeiten und löschen.',
      'Termine zeigen die gewählte Farbe im Kalender.',
    ],
  },
];

export const LATEST_ENTRY = CHANGELOG[0];
