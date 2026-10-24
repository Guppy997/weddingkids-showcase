import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { inject } from 'vitest';
import { api, token, signToken, USERS, PASSWORD } from './fixtures';

const THIRTY_DAYS = 30 * 24 * 60 * 60;

/** Öffnet den Stream, liest nur Status und Content-Type und bricht dann ab. */
async function openStream(query: string) {
  const ctrl = new AbortController();
  const res = await fetch(`${inject('baseUrl')}/api/stream?${query}`, { signal: ctrl.signal });
  const result = { status: res.status, type: res.headers.get('content-type') };
  ctrl.abort();
  return result;
}

describe('Token-Ablauf', () => {
  it('Login-Tokens laufen nach 30 Tagen ab', () => {
    const { iat, exp } = jwt.decode(token('staff')) as { iat: number; exp: number };
    expect(exp - iat).toBe(THIRTY_DAYS);
  });

  it('verify liefert einen frischen, gültigen Token', async () => {
    const res = await api('POST', '/api/auth/verify', token('staff'));
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect((await api('GET', '/api/weddings', res.body.token)).status).toBe(200);
  });

  it('lehnt abgelaufene Tokens ab', async () => {
    const expired = signToken({ userId: USERS.staff.id, name: 'x', role: 'Staff', department: '' }, undefined, { expiresIn: -60 });
    expect((await api('GET', '/api/weddings', expired)).status).toBe(401);
  });

  it('lehnt unsignierte Tokens (alg: none) ab', async () => {
    const unsigned = jwt.sign({ userId: USERS.admin.id, name: 'x', role: 'Admin', department: '' }, '', { algorithm: 'none' });
    expect((await api('GET', '/api/weddings', unsigned)).status).toBe(401);
  });
});

describe('Passwortänderung', () => {
  it('meldet alle anderen Geräte ab, das eigene bekommt einen neuen Token', async () => {
    const old = token('pwchange');
    expect((await api('GET', '/api/weddings', old)).status).toBe(200);

    const res = await api('POST', '/api/auth/change-password', old, { currentPassword: PASSWORD, newPassword: 'Neues-Passwort-456' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');

    expect((await api('GET', '/api/weddings', old)).status).toBe(401);
    expect((await api('GET', '/api/weddings', res.body.token)).status).toBe(200);

    const login = await api('POST', '/api/auth/login', undefined, { username: USERS.pwchange.username, password: 'Neues-Passwort-456' });
    expect(login.status).toBe(200);
  });

  it('lehnt zu kurze und zu lange neue Passwörter ab', async () => {
    const short = await api('POST', '/api/auth/change-password', token('staff'), { currentPassword: PASSWORD, newPassword: 'kurz' });
    expect(short.status).toBe(400);
    const long = await api('POST', '/api/auth/change-password', token('staff'), { currentPassword: PASSWORD, newPassword: 'x'.repeat(129) });
    expect(long.status).toBe(400);
  });

  it('Admin-Reset meldet die betroffene Person überall ab', async () => {
    expect((await api('GET', '/api/weddings', token('resetme'))).status).toBe(200);
    const reset = await api('POST', `/api/staff/${USERS.resetme.id}/reset-password`, token('admin'), { newPassword: 'Vom-Admin-gesetzt-1' });
    expect(reset.status).toBe(200);
    expect((await api('GET', '/api/weddings', token('resetme'))).status).toBe(401);
  });
});

describe('Login-Eingaben', () => {
  it('lehnt Nicht-Text als Benutzername ab', async () => {
    const res = await api('POST', '/api/auth/login', undefined, { username: { $gt: '' }, password: PASSWORD });
    expect(res.status).toBe(400);
  });

  it('lehnt überlange Passwörter ab, bevor bcrypt rechnet', async () => {
    // Greift schon in der Feldlängen-Prüfung (validation.ts), vor der Route
    const res = await api('POST', '/api/auth/login', undefined, { username: USERS.staff.username, password: 'x'.repeat(10_000) });
    expect(res.status).toBe(400);
  });

  it('Zugangsanfrage verlangt gültigen Benutzernamen und Passwort', async () => {
    const badName = await api('POST', '/api/auth/request-access', undefined, { username: 'a b', password: 'Gutes-Passwort-1', name: 'Test' });
    expect(badName.status).toBe(400);
    const badPw = await api('POST', '/api/auth/request-access', undefined, { username: 'neu.person', password: 'kurz', name: 'Test' });
    expect(badPw.status).toBe(400);
  });
});

describe('Live-Stream per Einmal-Ticket', () => {
  it('verlangt für ein Ticket einen gültigen Login', async () => {
    expect((await api('POST', '/api/stream/ticket')).status).toBe(401);
  });

  it('öffnet den Stream mit Ticket — und nur ein einziges Mal', async () => {
    const { body } = await api('POST', '/api/stream/ticket', token('staff'));
    const first = await openStream(`ticket=${encodeURIComponent(body.ticket)}`);
    expect(first.status).toBe(200);
    expect(first.type).toMatch(/text\/event-stream/);

    const second = await openStream(`ticket=${encodeURIComponent(body.ticket)}`);
    expect(second.status).toBe(401);
  });

  it('lehnt erfundene Tickets ab', async () => {
    expect((await openStream('ticket=gibt-es-nicht')).status).toBe(401);
  });
});

describe('Push-Abo', () => {
  const keys = { p256dh: 'BOr7test-public-key', auth: 'auth-secret' };

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://127.0.0.1:3001/api/admin/dashboard',
    'https://192.168.178.1/',
    'https://evil.example.com/push',
    'https://fcm.googleapis.com.evil.example.com/x',
    'https://fcm.googleapis.com:8443/fcm/send/abc',
    'kein-url',
  ])('lehnt %s ab', async (endpoint) => {
    expect((await api('POST', '/api/push/subscribe', token('staff'), { endpoint, keys })).status).toBe(400);
  });

  it('nimmt echte Push-Dienste an', async () => {
    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/test-endpoint',
      'https://updates.push.services.mozilla.com/wpush/v2/test',
      'https://web.push.apple.com/test',
    ]) {
      expect((await api('POST', '/api/push/subscribe', token('staff'), { endpoint, keys })).status).toBe(201);
    }
  });

  it('lehnt Schlüssel ab, die kein Text sind', async () => {
    const res = await api('POST', '/api/push/subscribe', token('staff'), {
      endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: { p256dh: { a: 1 }, auth: 'x' },
    });
    expect(res.status).toBe(400);
  });
});
