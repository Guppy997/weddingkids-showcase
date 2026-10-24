import jwt from 'jsonwebtoken';
import { inject } from 'vitest';

// Feste Testdaten, die Setup und Tests gemeinsam nutzen.

export const TEST_SECRET = 'test-secret-only-used-in-tests';
export const PASSWORD = 'Test-Passwort-123';
export const HIDDEN_ID = 'hidden-0000-0000-0000-000000000000';

export const USERS = {
  admin:   { id: 'admin-0000-0000-0000-000000000000',   username: 'admin1',   name: 'Ada Admin',     role: 'Admin', status: 'active' },
  staff:   { id: 'staff-0000-0000-0000-000000000000',   username: 'staff1',   name: 'Sam Staff',     role: 'Staff', status: 'active' },
  leaver:  { id: 'leaver-000-0000-0000-000000000000',   username: 'leaver1',  name: 'Lea Leaving',   role: 'Staff', status: 'active' },
  pending: { id: 'pending-00-0000-0000-000000000000',   username: 'pending1', name: 'Pia Pending',   role: 'Staff', status: 'pending' },
  hidden:  { id: HIDDEN_ID,                             username: 'hidden1',  name: 'Hidden System', role: 'Staff', status: 'active' },
  // Eigene Accounts für Passwortänderung und Admin-Reset — die machen alte
  // Tokens ungültig und dürfen die Tokens der anderen Tests nicht berühren.
  pwchange: { id: 'pwchange-0-0000-0000-000000000000',  username: 'pwchange1', name: 'Paula Passwort', role: 'Staff', status: 'active' },
  resetme:  { id: 'resetme-00-0000-0000-000000000000',  username: 'resetme1',  name: 'Rudi Reset',     role: 'Staff', status: 'active' },
} as const;

/**
 * Signiert einen Token mit beliebigem Inhalt — für Manipulationstests.
 * Standardmäßig mit Ablauf, damit die Tests nach dem Übergangsstichtag für
 * Tokens ohne exp weiter dasselbe prüfen.
 */
export function signToken(payload: object, secret = TEST_SECRET, options: jwt.SignOptions = { expiresIn: '1h' }): string {
  return jwt.sign(payload, secret, options);
}

/** Kleiner fetch-Wrapper gegen den Test-Server. */
export async function api(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(inject('baseUrl') + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch { /* kein JSON */ }
  return { status: res.status, body: json };
}

export const token = (who: keyof typeof USERS) => inject('tokens')[who];
