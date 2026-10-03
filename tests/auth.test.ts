import { describe, it, expect } from 'vitest';
import { api, token, signToken, USERS, PASSWORD } from './fixtures';

describe('Login', () => {
  it('liefert bei falschem Passwort 401', async () => {
    const res = await api('POST', '/api/auth/login', undefined, { username: USERS.staff.username, password: 'falsch' });
    expect(res.status).toBe(401);
  });

  it('lässt nicht freigegebene Accounts nicht rein', async () => {
    const res = await api('POST', '/api/auth/login', undefined, { username: USERS.pending.username, password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it('gibt den Passwort-Hash nie zurück', async () => {
    const res = await api('POST', '/api/auth/verify', token('staff'));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
  });
});

describe('Token-Prüfung', () => {
  it('lehnt Anfragen ohne Token ab', async () => {
    expect((await api('GET', '/api/weddings')).status).toBe(401);
  });

  it('lehnt Tokens mit falschem Secret ab', async () => {
    const forged = signToken({ userId: USERS.admin.id, name: 'x', role: 'Admin', department: '' }, 'falsches-secret');
    expect((await api('GET', '/api/weddings', forged)).status).toBe(401);
  });

  it('lehnt Tokens für nicht existierende Accounts ab', async () => {
    const ghost = signToken({ userId: 'gibt-es-nicht', name: 'x', role: 'Admin', department: '' });
    expect((await api('GET', '/api/weddings', ghost)).status).toBe(401);
  });

  it('lehnt nicht freigegebene Accounts auch mit gültigem Token ab', async () => {
    const t = signToken({ userId: USERS.pending.id, name: 'x', role: 'Staff', department: '' });
    expect((await api('GET', '/api/weddings', t)).status).toBe(401);
  });

  it('nimmt die Rolle aus der Datenbank, nicht aus dem Token', async () => {
    const fakeAdmin = signToken({ userId: USERS.staff.id, name: 'x', role: 'Admin', department: '' });
    expect((await api('GET', '/api/staff/pending', fakeAdmin)).status).toBe(403);
  });

  it('sperrt den Live-Stream für unbekannte Accounts', async () => {
    const ghost = signToken({ userId: 'gibt-es-nicht', name: 'x', role: 'Admin', department: '' });
    expect((await api('GET', `/api/stream?token=${ghost}`)).status).toBe(401);
  });
});

describe('Gelöschte Mitarbeitende', () => {
  it('verlieren sofort den Zugriff, ohne dass der Token abläuft', async () => {
    expect((await api('GET', '/api/weddings', token('leaver'))).status).toBe(200);

    const del = await api('DELETE', `/api/staff/${USERS.leaver.id}`, token('admin'));
    expect(del.status).toBe(200);

    expect((await api('GET', '/api/weddings', token('leaver'))).status).toBe(401);
  });
});
