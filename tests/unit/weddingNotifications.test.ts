import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// Push-Versand abfangen: wir prüfen nur, WER WELCHE Nachricht bekäme.
const sent: { to: string[]; title: string; body: string }[] = [];
vi.mock('../../src/server/lib/push.js', () => ({
  sendPushToUsers: vi.fn(async (to: string[], p: { title: string; body: string }) => {
    sent.push({ to: [...to].sort(), title: p.title, body: p.body });
  }),
}));

let notifyWeddingUpdate: typeof import('../../src/server/lib/weddingNotifications.js').notifyWeddingUpdate;

const wedding = { id: 'w1', coupleNames: 'Mia & Ben', date: '2027-06-12', location: 'Stuttgart' };
const actorAdmin = { userId: 'adminA', name: 'Ada', role: 'Admin' as const, department: '' };

beforeAll(async () => {
  vi.stubEnv('DB_PATH', ':memory:');
  const db = await import('../../src/server/database.js');
  db.initializeDatabase();
  const insertUser = db.getDb().prepare(
    "INSERT INTO users (id, username, name, password_hash, role, department) VALUES (?, ?, ?, 'x', ?, '')"
  );
  insertUser.run('adminA', 'a', 'Ada', 'Admin');
  insertUser.run('adminB', 'b', 'Bea', 'Admin');
  insertUser.run('staff1', 's1', 'Sam', 'Staff');
  insertUser.run('staff2', 's2', 'Tom', 'Staff');
  db.getDb().prepare(
    "INSERT INTO weddings (id, couple_names, initials, date, location, status) VALUES ('w1', 'Mia & Ben', 'M&B', '2027-06-12', 'Stuttgart', 'Gebucht')"
  ).run();
  db.getDb().prepare("INSERT INTO assignments (wedding_id, staff_id, status, assigned) VALUES ('w1', 'staff2', 'Ja', 1)").run();
  ({ notifyWeddingUpdate } = await import('../../src/server/lib/weddingNotifications.js'));
});

beforeEach(() => { sent.length = 0; });

describe('Push nach Hochzeits-Änderung', () => {
  it('benachrichtigt neu Eingeteilte und informiert die anderen Admins', () => {
    notifyWeddingUpdate({
      wedding, actor: actorAdmin, previousStatus: 'Gebucht', previouslyAssigned: [],
      changes: { assignedStaffIds: ['staff1'] },
    });
    expect(sent).toContainEqual({ to: ['staff1'], title: 'Du wurdest eingeteilt', body: 'Mia & Ben – 12. Juni 2027 in Stuttgart' });
    expect(sent).toContainEqual({ to: ['adminB'], title: 'Neue Einteilung', body: 'Sam → Mia & Ben (12. Juni 2027)' });
    // Die handelnde Admin bekommt keine Nachricht über die eigene Aktion
    expect(sent.some(s => s.to.includes('adminA'))).toBe(false);
  });

  it('informiert Admins, wenn jemand ausgeteilt wird', () => {
    notifyWeddingUpdate({
      wedding, actor: actorAdmin, previousStatus: 'Gebucht', previouslyAssigned: ['staff1'],
      changes: { assignedStaffIds: [] },
    });
    expect(sent).toEqual([{ to: ['adminB'], title: 'Einteilung entfernt', body: 'Sam ← Mia & Ben' }]);
  });

  it('meldet Status-Änderungen an Eingeteilte und andere Admins', () => {
    notifyWeddingUpdate({
      wedding, actor: actorAdmin, previousStatus: 'Gebucht', previouslyAssigned: ['staff2'],
      changes: { status: 'Geplant' },
    });
    expect(sent).toEqual([{ to: ['adminB', 'staff2'], title: 'Status geändert: Geplant', body: 'Mia & Ben – 12. Juni 2027' }]);
  });

  it('meldet Abstimmungen von Mitarbeitenden an alle Admins', () => {
    notifyWeddingUpdate({
      wedding, actor: { userId: 'staff1', name: 'Sam', role: 'Staff', department: '' },
      previousStatus: 'Gebucht', previouslyAssigned: ['staff2'],
      changes: { assignments: [{ staffId: 'staff1', status: 'Vielleicht' }] },
    });
    expect(sent).toEqual([{ to: ['adminA', 'adminB'], title: 'Sam: Vielleicht', body: 'Mia & Ben – 12. Juni 2027' }]);
  });

  it('schickt nichts, wenn eine Stimme zurückgezogen wird', () => {
    notifyWeddingUpdate({
      wedding, actor: { userId: 'staff1', name: 'Sam', role: 'Staff', department: '' },
      previousStatus: 'Gebucht', previouslyAssigned: [],
      changes: { assignments: [{ staffId: 'staff1', status: 'Ausstehend' }] },
    });
    expect(sent).toEqual([]);
  });
});
