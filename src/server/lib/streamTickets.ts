import { randomBytes } from 'node:crypto';

// EventSource kann keine eigenen Header senden. Statt des Login-Tokens (der
// sonst in der URL und damit in den nginx-Logs landet) holt sich der Client per
// Auth-Header ein kurzlebiges Einmal-Ticket und öffnet damit den Stream.

const TICKET_TTL_MS = 60_000;
const MAX_OPEN_TICKETS = 1000;

const tickets = new Map<string, { token: string; expires: number }>();

function purgeExpired(now: number) {
  for (const [t, entry] of tickets) {
    if (entry.expires < now) tickets.delete(t);
  }
}

/** Stellt ein Ticket für den angegebenen (bereits geprüften) Login-Token aus. */
export function issueStreamTicket(token: string, now = Date.now()): string {
  purgeExpired(now);
  // Obergrenze gegen Speicherwachstum; im Normalbetrieb sind es eine Handvoll
  if (tickets.size >= MAX_OPEN_TICKETS) tickets.delete(tickets.keys().next().value!);
  const ticket = randomBytes(24).toString('base64url');
  tickets.set(ticket, { token, expires: now + TICKET_TTL_MS });
  return ticket;
}

/** Löst ein Ticket genau einmal ein und liefert den zugehörigen Login-Token. */
export function redeemStreamTicket(ticket: unknown, now = Date.now()): string | null {
  if (typeof ticket !== 'string') return null;
  const entry = tickets.get(ticket);
  tickets.delete(ticket);
  if (!entry || entry.expires < now) return null;
  return entry.token;
}
