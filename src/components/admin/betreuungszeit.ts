// ── Hilfsfunktionen für Betreuungszeit ──────────────────────────────────────
// Speicherformat in DB: "HH:MM Uhr - HH:MM Uhr; X Stunden"
// Beispiel: "15:00 Uhr - 17:30 Uhr; 2,5 Stunden"

/** Parst gespeicherte Betreuungszeit zurück in {start, end} im HH:MM-Format. */
export function parseBetreuungszeit(value: string): { start: string; end: string } {
  if (!value) return { start: '', end: '' };
  const m = value.match(/(\d{1,2}):(\d{2})\s*Uhr?\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return { start: '', end: '' };
  const pad = (s: string) => s.padStart(2, '0');
  return { start: `${pad(m[1])}:${m[2]}`, end: `${pad(m[3])}:${m[4]}` };
}

/** Berechnet die Stundenzahl zwischen zwei HH:MM-Zeiten (immer positiv, in 0,25h-Schritten). */
export function calculateHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return 0;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60; // Über Mitternacht
  return Math.round((diff / 60) * 4) / 4; // auf Viertelstunde gerundet
}

/** Formatiert Stundenzahl als deutsche Anzeige (z.B. 2.5 → "2,5 Stunden", 1 → "1 Stunde"). */
export function formatHours(h: number): string {
  if (h <= 0) return '';
  const display = h.toString().replace('.', ',');
  return `${display} ${h === 1 ? 'Stunde' : 'Stunden'}`;
}

/** Setzt die finale Speicher-Form zusammen, oder leerer String wenn keine Zeit gewählt. */
export function buildBetreuungszeit(start: string, end: string): string {
  if (!start || !end) return '';
  const h = calculateHours(start, end);
  return h > 0
    ? `${start} Uhr - ${end} Uhr; ${formatHours(h)}`
    : `${start} Uhr - ${end} Uhr`;
}
