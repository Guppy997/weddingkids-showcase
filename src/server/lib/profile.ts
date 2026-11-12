import { getDb } from '../database.js';
import { HIDDEN_USER_IDS } from '../config.js';

// Anzeigenamen müssen im Team eindeutig sein. Der Name steht in Verlauf,
// Abstimmungen und Push-Nachrichten. Wer sich wie eine andere Person nennen
// konnte, trat dort unter ihrem Namen auf.

/** Vergleichsform: Groß/Klein, Leerzeichen und Unicode-Schreibweise egal. */
export function normalizeName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
}

/**
 * Trägt schon ein anderer aktiver Account diesen Anzeigenamen?
 * Versteckte System-Accounts zählen nicht mit, sonst ließe sich über die
 * Fehlermeldung herausfinden, dass es sie gibt.
 */
export function isNameTaken(name: string, exceptUserId?: string): boolean {
  const wanted = normalizeName(name);
  const hidden = new Set(HIDDEN_USER_IDS);
  const users = getDb().prepare("SELECT id, name FROM users WHERE status = 'active'").all() as { id: string; name: string }[];
  return users.some(u => u.id !== exceptUserId && !hidden.has(u.id) && normalizeName(u.name) === wanted);
}

export const NAME_TAKEN_ERROR = 'Diesen Namen gibt es im Team schon. Bitte ergänze z. B. den Anfangsbuchstaben des Nachnamens.';

// Profilbilder: nur eingebettete Bilder (Data-URL). Eine normale Web-Adresse
// würde bei allen im Team geladen und verriete dem fremden Server deren
// IP-Adresse und wann sie die App öffnen.
const AVATAR_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const AVATAR_MAX_LENGTH = 250_000; // ca. 185 KB Bilddaten

export function isAllowedAvatarImage(value: unknown): value is string {
  return typeof value === 'string' && value.length <= AVATAR_MAX_LENGTH && AVATAR_DATA_URL.test(value);
}
