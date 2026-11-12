import { describe, it, expect, beforeAll } from 'vitest';
import { api, token, USERS } from './fixtures';

let weddingId: string;

beforeAll(async () => {
  const res = await api('POST', '/api/weddings', token('admin'), {
    coupleNames: 'Mia & Ben',
    date: '2027-06-12',
    location: 'Stuttgart',
    status: 'Anfrage',
    childrenCount: 8,
    staffNeeded: 2,
  });
  expect(res.status).toBe(201);
  weddingId = res.body.id;
});

describe('Hochzeiten', () => {
  it('Mitarbeitende sehen angelegte Hochzeiten', async () => {
    const res = await api('GET', '/api/weddings', token('staff'));
    expect(res.status).toBe(200);
    expect(res.body.some((w: any) => w.id === weddingId)).toBe(true);
  });

  it('nur Admins dürfen Hochzeiten anlegen', async () => {
    const res = await api('POST', '/api/weddings', token('staff'), {
      coupleNames: 'X', date: '2027-01-01', location: 'Y', status: 'Anfrage',
    });
    expect(res.status).toBe(403);
  });

  it.each([
    ['Hochzeitsdaten', { coupleNames: 'Manipuliert' }],
    ['Status', { status: 'Geplant' }],
    ['Einteilung', { assignedStaffIds: [USERS.staff.id] }],
  ])('Mitarbeitende dürfen %s nicht ändern', async (_label, body) => {
    const res = await api('PATCH', `/api/weddings/${weddingId}`, token('staff'), body);
    expect(res.status).toBe(403);

    const after = (await api('GET', '/api/weddings', token('admin'))).body.find((w: any) => w.id === weddingId);
    expect(after.coupleNames).toBe('Mia & Ben');
    expect(after.status).toBe('Anfrage');
    expect(after.assignedStaffIds).toEqual([]);
  });

  it('Admins dürfen Hochzeitsdaten ändern', async () => {
    const res = await api('PATCH', `/api/weddings/${weddingId}`, token('admin'), { location: 'Esslingen' });
    expect(res.status).toBe(200);
    expect(res.body.location).toBe('Esslingen');
  });
});

describe('Mehrtägige Hochzeiten', () => {
  it('Admins können einen Zeitraum anlegen, ändern und wieder entfernen', async () => {
    const created = await api('POST', '/api/weddings', token('admin'), {
      coupleNames: 'Wochenende', date: '2027-04-09', endDate: '2027-04-11', location: 'Ulm', status: 'Anfrage',
    });
    expect(created.status).toBe(201);
    expect(created.body.endDate).toBe('2027-04-11');
    const id = created.body.id;

    const longer = await api('PATCH', `/api/weddings/${id}`, token('admin'), { endDate: '2027-04-12' });
    expect(longer.body.endDate).toBe('2027-04-12');

    const single = await api('PATCH', `/api/weddings/${id}`, token('admin'), { endDate: null });
    expect(single.status).toBe(200);
    expect(single.body.endDate).toBeNull();
  });

  it('eintägig bleibt eintägig (kein End-Datum)', async () => {
    const res = (await api('GET', '/api/weddings', token('admin'))).body.find((w: any) => w.id === weddingId);
    expect(res.endDate).toBeNull();
  });

  it('End-Datum vor dem Start wird abgelehnt', async () => {
    const res = await api('POST', '/api/weddings', token('admin'), {
      coupleNames: 'Falsch', date: '2027-04-09', endDate: '2027-04-08', location: 'Ulm', status: 'Anfrage',
    });
    expect(res.status).toBe(400);
    const patch = await api('PATCH', `/api/weddings/${weddingId}`, token('admin'), { endDate: '2027-01-01' });
    expect(patch.status).toBe(400);
  });

  it('Start auf/hinter das End-Datum verschoben → wieder eintägig', async () => {
    const { body } = await api('POST', '/api/weddings', token('admin'), {
      coupleNames: 'Verschoben', date: '2027-05-07', endDate: '2027-05-09', location: 'Ulm', status: 'Anfrage',
    });
    const res = await api('PATCH', `/api/weddings/${body.id}`, token('admin'), { date: '2027-05-20' });
    expect(res.body.date).toBe('2027-05-20');
    expect(res.body.endDate).toBeNull();
  });

  it('Mitarbeitende dürfen das End-Datum nicht ändern', async () => {
    const res = await api('PATCH', `/api/weddings/${weddingId}`, token('staff'), { endDate: '2027-06-14' });
    expect(res.status).toBe(403);
  });
});

describe('Abstimmen', () => {
  it('Mitarbeitende können mit Kommentar abstimmen', async () => {
    const res = await api('PATCH', `/api/weddings/${weddingId}`, token('staff'), {
      assignments: [{ staffId: USERS.staff.id, status: 'Vielleicht', comment: '  mittags 3 Std. möglich  ' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.assignments).toContainEqual({
      staffId: USERS.staff.id, status: 'Vielleicht', comment: 'mittags 3 Std. möglich',
    });
  });

  it('Kommentare werden auf 200 Zeichen gekürzt', async () => {
    const res = await api('PATCH', `/api/weddings/${weddingId}`, token('staff'), {
      assignments: [{ staffId: USERS.staff.id, status: 'Ja', comment: 'x'.repeat(500) }],
    });
    const own = res.body.assignments.find((a: any) => a.staffId === USERS.staff.id);
    expect(own.comment).toHaveLength(200);
  });

  it('Mitarbeitende können nicht für andere abstimmen', async () => {
    const res = await api('PATCH', `/api/weddings/${weddingId}`, token('staff'), {
      assignments: [{ staffId: USERS.admin.id, status: 'Nein', comment: 'untergeschoben' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.assignments.some((a: any) => a.staffId === USERS.admin.id)).toBe(false);
  });

  it('Admins können den Kommentar anderer nicht überschreiben', async () => {
    await api('PATCH', `/api/weddings/${weddingId}`, token('admin'), {
      assignments: [{ staffId: USERS.staff.id, status: 'Ja', comment: 'vom Admin' }],
    });
    const after = (await api('GET', '/api/weddings', token('staff'))).body.find((w: any) => w.id === weddingId);
    const own = after.assignments.find((a: any) => a.staffId === USERS.staff.id);
    expect(own.comment).not.toBe('vom Admin');
  });
});

describe('News', () => {
  it('nur Admins dürfen News anlegen', async () => {
    expect((await api('POST', '/api/notes', token('staff'), { text: 'Hallo' })).status).toBe(403);
    expect((await api('POST', '/api/notes', token('admin'), { text: 'Hallo Team' })).status).toBe(201);
  });
});

describe('Geschützte Accounts', () => {
  it('werden in der Team-Liste markiert', async () => {
    const res = await api('GET', '/api/staff', token('admin'));
    const flag = (id: string) => res.body.find((s: any) => s.id === id)?.isProtected;
    expect(flag(USERS.admin.id)).toBe(true);
    expect(flag(USERS.staff.id)).toBe(false);
  });

  it('können nicht gelöscht werden', async () => {
    expect((await api('DELETE', `/api/staff/${USERS.admin.id}`, token('admin'))).status).toBe(403);
  });
});

describe('Versteckte System-Accounts', () => {
  it('erscheinen nicht in der Team-Liste', async () => {
    const res = await api('GET', '/api/staff', token('admin'));
    const ids = res.body.map((s: any) => s.id);
    expect(ids).toContain(USERS.staff.id);
    expect(ids).not.toContain(USERS.hidden.id);
  });

  it('ihre Stimmen sind für niemanden sichtbar', async () => {
    const res = await api('PATCH', `/api/weddings/${weddingId}`, token('hidden'), {
      assignments: [{ staffId: USERS.hidden.id, status: 'Ja' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.assignments.some((a: any) => a.staffId === USERS.hidden.id)).toBe(false);
  });

  it('können nicht gelöscht werden', async () => {
    expect((await api('DELETE', `/api/staff/${USERS.hidden.id}`, token('admin'))).status).toBe(403);
  });
});

describe('Aktivitätsprotokoll', () => {
  it('protokolliert Änderungen mit Text und handelnder Person', async () => {
    await api('POST', '/api/notes', token('admin'), { text: 'L'.repeat(80) });
    const res = await api('GET', '/api/admin/activity', token('admin'));
    expect(res.status).toBe(200);
    const entries = res.body.map((e: any) => `${e.eventType}|${e.description}|${e.actorName}`);
    expect(entries).toContain(`wedding_created|Neue Hochzeit angelegt (Anfrage)|${USERS.admin.name}`);
    expect(entries).toContain(`wedding_edited|Geändert: Ort|${USERS.admin.name}`);
    expect(entries).toContain(`vote_cast|${USERS.staff.name}: Vielleicht|${USERS.staff.name}`);
    expect(entries).toContain(`note_created|Neue Notiz: ${'L'.repeat(60)}…|${USERS.admin.name}`);
  });

  it('blendet Aktionen versteckter Accounts aus', async () => {
    // Geprüft wird über den Vorgang selbst, nicht über den angezeigten Namen:
    // Der Verlauf filtert nach Account-ID, und einen Namen kann jede:r tragen
    // (siehe tests/integrity.test.ts).
    const wedding = await api('POST', '/api/weddings', token('admin'), {
      coupleNames: 'Vera & Stefan', date: '2031-08-01', location: 'Testort', status: 'Anfrage',
    });
    const vote = await api('PATCH', `/api/weddings/${wedding.body.id}`, token('hidden'), {
      assignments: [{ staffId: USERS.hidden.id, status: 'Ja' }],
    });
    expect(vote.status).toBe(200);

    const all = await api('GET', '/api/admin/activity', token('admin'));
    expect(all.body.some((e: any) => e.weddingId === wedding.body.id && e.eventType === 'vote_cast')).toBe(false);
    const perWedding = await api('GET', `/api/weddings/${wedding.body.id}/activity`, token('admin'));
    expect(perWedding.body.map((e: any) => e.eventType)).toEqual(['wedding_created']);
  });
});

describe('Admin-Bereich', () => {
  it.each([
    ['GET', '/api/staff/pending'],
    ['GET', '/api/admin/dashboard'],
    ['GET', '/api/admin/activity'],
  ])('%s %s ist für Mitarbeitende gesperrt', async (method, path) => {
    expect((await api(method, path, token('staff'))).status).toBe(403);
  });
});
