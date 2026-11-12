import { describe, it, expect, beforeAll } from 'vitest';
import { inject } from 'vitest';
import { api, token, USERS } from './fixtures';

// Wem gehört ein Verlaufseintrag, und was passiert mit Inhalten, wenn ihr
// Autor gelöscht wird? Hintergrund: Sicherheits-Update v1.19.1.

// Kleinstes gültiges PNG (1×1 Pixel) als Data-URL
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let weddingId: string;

beforeAll(async () => {
  const res = await api('POST', '/api/weddings', token('admin'), {
    coupleNames: 'Ina & Ole', date: '2031-06-01', location: 'Testort', status: 'Anfrage',
  });
  weddingId = res.body.id;
});

const vote = (who: 'renamer', status: string) =>
  api('PATCH', `/api/weddings/${weddingId}`, token(who), { assignments: [{ staffId: USERS[who].id, status }] });

const activity = async () =>
  (await api('GET', `/api/weddings/${weddingId}/activity`, token('admin'))).body as { actorName: string; description: string }[];

describe('Anzeigename', () => {
  it('lässt sich nicht auf den Namen einer anderen Person ändern', async () => {
    const res = await api('PATCH', '/api/auth/profile', token('renamer'), { name: USERS.admin.name });
    expect(res.status).toBe(409);
  });

  it('erkennt denselben Namen auch mit anderer Schreibweise', async () => {
    const res = await api('PATCH', '/api/auth/profile', token('renamer'), { name: '  ada   ADMIN ' });
    expect(res.status).toBe(409);
  });

  it('bleibt beim Speichern ohne Namensänderung erlaubt (z. B. nur neue Farbe)', async () => {
    const res = await api('PATCH', '/api/auth/profile', token('renamer'), { name: USERS.renamer.name, avatarColor: '#123456' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe(USERS.renamer.name);
  });

  it('wird beim Anlegen eines Accounts durch Admins geprüft', async () => {
    const res = await api('POST', '/api/auth/register', token('admin'), {
      username: 'doppelt1', password: 'Test-Passwort-123', name: USERS.staff.name, department: 'Team',
    });
    expect(res.status).toBe(409);
  });

  it('wird bei der Freigabe einer Zugangsanfrage geprüft', async () => {
    const request = await api('POST', '/api/auth/request-access', undefined, {
      username: 'doppelt2', password: 'Test-Passwort-123', name: USERS.staff.name,
    });
    // Die Anfrage selbst verrät nicht, dass es den Namen schon gibt
    expect(request.status).toBe(201);
    const pending = (await api('GET', '/api/staff/pending', token('admin'))).body as { id: string; username: string }[];
    const id = pending.find(p => p.username === 'doppelt2')!.id;
    expect((await api('POST', `/api/staff/${id}/approve`, token('admin'))).status).toBe(409);
    expect((await api('DELETE', `/api/staff/${id}`, token('admin'))).status).toBe(200);
  });
});

describe('Verlauf und Datenexport hängen am Account, nicht am Namen', () => {
  it('der Datenexport enthält nur eigene Einträge, auch nach einer Umbenennung', async () => {
    await vote('renamer', 'Ja');
    const renamed = await api('PATCH', '/api/auth/profile', token('renamer'), { name: 'Rita Neu' });
    expect(renamed.status).toBe(200);

    const res = await api('GET', '/api/auth/export-data', token('renamer'));
    const descriptions = (res.body.activityLog as { description: string }[]).map(a => a.description);
    // Der eigene Eintrag steht noch unter dem alten Namen im Verlauf und gehört trotzdem dazu
    expect(descriptions).toEqual([`${USERS.renamer.name}: Ja`]);
    // Einträge der Admin (Hochzeit angelegt) tauchen nicht auf
    expect(descriptions.some(d => d.includes('Neue Hochzeit'))).toBe(false);

    await api('PATCH', '/api/auth/profile', token('renamer'), { name: USERS.renamer.name });
  });

  it('wer sich wie ein versteckter Account nennt, bleibt im Verlauf sichtbar', async () => {
    // Der Name versteckter Accounts ist bewusst nicht gesperrt (sonst verriete
    // die Fehlermeldung, dass es sie gibt). Er bringt aber nichts mehr.
    const renamed = await api('PATCH', '/api/auth/profile', token('renamer'), { name: USERS.hidden.name });
    expect(renamed.status).toBe(200);
    await vote('renamer', 'Nein');
    expect((await activity()).some(a => a.description === `${USERS.hidden.name}: Nein`)).toBe(true);
    await api('PATCH', '/api/auth/profile', token('renamer'), { name: USERS.renamer.name });
  });
});

describe('Profilbild', () => {
  it('lehnt Web-Adressen ab', async () => {
    const res = await api('PATCH', '/api/auth/profile', token('renamer'), { avatarImage: 'https://tracker.example/pixel.png' });
    expect(res.status).toBe(400);
  });

  it('lehnt andere Formate als JPEG, PNG und WebP ab', async () => {
    const svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    expect((await api('PATCH', '/api/auth/profile', token('renamer'), { avatarImage: svg })).status).toBe(400);
  });

  it('ändert bei einem abgelehnten Bild auch den Rest nicht', async () => {
    const res = await api('PATCH', '/api/auth/profile', token('renamer'), { avatarColor: '#abcdef', avatarImage: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
    const me = await api('POST', '/api/auth/verify', token('renamer'));
    expect(me.body.user.avatarColor).not.toBe('#abcdef');
  });

  it('nimmt ein eingebettetes Bild an und entfernt es wieder', async () => {
    const set = await api('PATCH', '/api/auth/profile', token('renamer'), { avatarImage: TINY_PNG });
    expect(set.status).toBe(200);
    expect(set.body.user.avatarImage).toBe(TINY_PNG);
    const removed = await api('PATCH', '/api/auth/profile', token('renamer'), { avatarImage: null });
    expect(removed.body.user.avatarImage).toBeNull();
  });
});

describe('Account löschen', () => {
  it('das eigene Konto lässt sich nicht über die Team-Verwaltung löschen', async () => {
    const res = await api('DELETE', `/api/staff/${USERS.author.id}`, token('author'));
    expect(res.status).toBe(400);
    expect((await api('GET', '/api/weddings', token('author'))).status).toBe(200);
  });

  it('News, Termine und Abstimmungen bleiben erhalten, wenn ihre Autorin gelöscht wird', async () => {
    const note = await api('POST', '/api/notes', token('author'), { text: 'News von Anke' });
    const event = await api('POST', '/api/events', token('author'), { title: 'Teamtreffen', date: '2031-07-01', public: true });
    const poll = await api('POST', '/api/polls', token('author'), { question: 'Sommerfest?' });
    await api('POST', `/api/polls/${poll.body.id}/vote`, token('staff'), { vote: 'Ja' });

    // Vorher scheiterte das mit einem Serverfehler, sobald die Person eine Abstimmung angelegt hatte
    const del = await api('DELETE', `/api/staff/${USERS.author.id}`, token('admin'));
    expect(del.status).toBe(200);
    expect((await api('GET', '/api/weddings', token('author'))).status).toBe(401);

    const notes = (await api('GET', '/api/notes', token('admin'))).body as { id: string; createdBy: string }[];
    expect(notes.find(n => n.id === note.body.id)?.createdBy).toBe(USERS.author.name);

    const events = (await api('GET', '/api/events', token('admin'))).body as { id: string; createdBy: string }[];
    expect(events.find(e => e.id === event.body.id)?.createdBy).toBe(USERS.author.name);

    const polls = (await api('GET', '/api/polls', token('staff'))).body as { id: string; createdBy: string; myVote: string }[];
    const kept = polls.find(p => p.id === poll.body.id);
    expect(kept?.createdBy).toBe(USERS.author.name);
    expect(kept?.myVote).toBe('Ja');
  });
});

describe('Fehlerantworten', () => {
  it('sind immer JSON, auch bei kaputtem Request-Body', async () => {
    const res = await fetch(`${inject('baseUrl')}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{kaputt',
    });
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: 'Ungültige Anfrage' });
  });
});
