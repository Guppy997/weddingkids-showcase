# Changelog

Alle wichtigen Änderungen an diesem Projekt stehen hier. Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), die Versionen folgen [Semantic Versioning](https://semver.org/lang/de/).

Die Einträge für die Nutzer:innen der App stehen in Alltagssprache in [`src/config/changelog.ts`](src/config/changelog.ts) und erscheinen in der App unter **Profil → Neu in der App**. Ältere Versionen vor 1.11.0 sind nur im privaten Produktiv-Repository dokumentiert.

## [1.19.1] - 2026-11-10

### Sicherheit
- Verlauf und Datenexport hängen an der Account-ID statt am frei wählbaren Anzeigenamen (neue Spalte `activity_log.actor_id`). Vorher bekam, wer sich wie eine andere Person nannte, deren Verlauf im Datenexport und trat im Verlauf und in Push-Nachrichten unter ihrem Namen auf.
- Anzeigenamen sind unter aktiven Accounts eindeutig, unabhängig von Groß- und Kleinschreibung und Leerzeichen. Geprüft wird beim Ändern im Profil, beim Anlegen durch Admins und bei der Freigabe einer Zugangsanfrage.
- Profilbilder werden nur noch als eingebettetes Bild (Data-URL mit JPEG, PNG oder WebP) angenommen. Eine Web-Adresse wäre bei allen im Team geladen worden und hätte dem fremden Server deren IP-Adresse verraten.
- Das eigene Konto lässt sich nicht mehr über die Team-Verwaltung (`DELETE /api/staff/:id`) löschen. Dieser Weg umging die Passwortabfrage und die Prüfung auf den letzten Admin.
- Fehlerantworten kommen immer als JSON, ohne Stacktrace oder Serverpfade.

### Behoben
- Accounts, die eine Abstimmung angelegt hatten, ließen sich nicht löschen, auch nicht über „Konto löschen“.
- Beim Löschen eines Admins verschwanden dessen News und Termine. News, Termine und Abstimmungen bleiben jetzt erhalten, `created_by_id` wird geleert und der Name bleibt stehen.

### Geändert
- Datenbank-Migration beim ersten Start: `activity_log` bekommt die Spalte `actor_id`, ältere Einträge werden zugeordnet, wenn genau ein Account den Namen trägt. `notes`, `events` und `polls` werden neu aufgebaut, ohne dass Daten verloren gehen. Ein neuer Test spielt das Update auf eine Datenbank im Stand 1.19.0 ein.
- Die Rate-Limits lassen sich für die Testsuite über `AUTH_LIMIT_PER_15_MIN` und `WRITE_LIMIT_PER_MIN` anheben. Im Betrieb gelten weiter 20 Anmeldeversuche pro 15 Minuten und 60 schreibende Anfragen pro Minute.

## [1.19.0] - 2026-11-07

### Hinzugefügt
- Abgesagte Hochzeiten werden automatisch gelöscht, sobald ihr (letzter) Tag vorbei ist. Der Server prüft das beim Start und danach stündlich (`src/server/lib/cleanup.ts`). Rückmeldungen und Aufgaben gehen per `ON DELETE CASCADE` mit, im Aktivitätsprotokoll steht pro Hochzeit ein Eintrag.

### Geändert
- Der Admin-Bereich zeigt abgesagte Hochzeiten nur noch bis zu ihrem Datum.
- Die abgesagte Demo-Hochzeit in `scripts/seed-demo.ts` liegt in der Zukunft, damit sie in der Demo sichtbar bleibt.

## [1.18.1] - 2026-11-05

### Geändert
- Bei „Mehrere Tage“ ist das Bis-Datum mit dem Tag nach „Von“ vorbelegt, damit die Datumsauswahl auf dem Handy direkt in der richtigen Woche öffnet.

### Behoben
- Eine eingetragene Betreuungszeit lässt sich mit „Zeit entfernen“ wieder löschen. Uhrzeit-Felder lassen sich auf dem Handy sonst nicht leeren.

## [1.18.0] - 2026-11-05

### Hinzugefügt
- Hochzeiten über mehrere Tage, zum Beispiel eine Betreuung übers ganze Hochzeitswochenende (Spalte `end_date`). Mehrtägige Hochzeiten stehen im Kalender an jedem ihrer Tage.

## [1.17.0] - 2026-10-24

### Hinzugefügt
- Versionsverlauf „Neu in der App“ im Profil.
- Der Hinweis „Neue Version verfügbar“ nennt die Neuerung. Dafür schreibt der Build `dist/version.json`, die der Service Worker immer frisch aus dem Netz lädt.

## [1.16.0] - 2026-10-24

### Sicherheit
- Login-Tokens laufen nach 30 Tagen ab und verlängern sich bei jeder Nutzung. Eine Passwortänderung meldet alle anderen Geräte ab.
- Live-Updates öffnen die Verbindung mit einem Einmal-Ticket statt mit dem Login-Token in der URL.
- Push-Abos werden nur für die Push-Dienste der Browser angenommen.
- Die API lauscht standardmäßig nur auf `127.0.0.1`.
- Abhängigkeiten aktualisiert (`npm audit fix`, express 4.22.3).

## [1.15.2] - 2026-10-06

### Geändert
- Abgesagte Hochzeiten werden nach ihrem Datum vom Board ausgeblendet.

## [1.15.1] - 2026-10-04

### Behoben
- Hochzeiten rund um die Zeitumstellung im Oktober zeigten teils das falsche Datum.

### Geändert
- Die Status-Farben kommen überall aus einer gemeinsamen Quelle.

## [1.15.0] - 2026-10-03

### Geändert
- Interne Aufräumarbeiten für mehr Stabilität und bessere Erweiterbarkeit.

### Sicherheit
- Beim Zurücksetzen eines Passworts wird kein festes Beispiel-Passwort mehr vorgeschlagen.

## [1.14.0] - 2026-10-03

### Hinzugefügt
- Kommentar zur eigenen Antwort bei Abstimmungen.

## [1.13.0] - 2026-09-24

### Sicherheit
- Gelöschte oder deaktivierte Konten verlieren sofort den Zugriff.
- Die Rechte von Admins und Mitarbeitenden werden serverseitig strenger geprüft.

## [1.12.2] - 2026-09-24

### Geändert
- Hochzeiten im Admin-Bereich lassen sich aufklappen, abgeschlossene stehen mit der neuesten zuerst.

## [1.12.1] - 2026-09-13

### Behoben
- Anfragen für 2027 werden in Liste, Zählern und Benachrichtigungen genauso behandelt wie 2026.

## [1.12.0] - 2026-07-03

### Geändert
- Der Status „Gebucht“ ist gelb, Scrollen im Admin-Bereich verbessert, kompaktere Abstimmungs-Buttons.

## [1.11.0] - 2026-05-25

### Hinzugefügt
- Neues Formular „Neuer Termin“ mit mehrtägigen Terminen, Farbe und Uhrzeit.
- Admins können Termine im Kalender bearbeiten und löschen.
