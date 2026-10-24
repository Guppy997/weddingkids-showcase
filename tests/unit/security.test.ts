import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'unit-test-secret';
const { verifyToken, generateToken, passwordError, LEGACY_TOKEN_CUTOFF_MS } = await import('../../src/server/lib/credentials');
const { issueStreamTicket, redeemStreamTicket } = await import('../../src/server/lib/streamTickets');

const payload = { userId: 'u1', name: 'Test', role: 'Staff' as const, department: '' };
const DAY = 24 * 60 * 60 * 1000;

describe('Tokens ohne Ablaufdatum (Altbestand)', () => {
  const legacy = jwt.sign(payload, 'unit-test-secret'); // wie vor dem Update: ohne exp

  it('gelten bis zum Stichtag', () => {
    expect(verifyToken(legacy, LEGACY_TOKEN_CUTOFF_MS - DAY)?.userId).toBe('u1');
  });

  it('werden nach dem Stichtag abgelehnt', () => {
    expect(verifyToken(legacy, LEGACY_TOKEN_CUTOFF_MS + 1000)).toBeNull();
  });
});

describe('Neue Tokens', () => {
  it('gelten 30 Tage, danach nicht mehr', () => {
    const now = Date.now();
    const t = generateToken(payload);
    expect(verifyToken(t, now + 29 * DAY)?.userId).toBe('u1');
    expect(verifyToken(t, now + 31 * DAY)).toBeNull();
  });

  it('übernehmen iat/exp eines alten Tokens nicht', () => {
    const t = generateToken({ ...payload, exp: 1, iat: 1 } as typeof payload);
    const decoded = jwt.decode(t) as { exp: number; iat: number };
    expect(decoded.exp - decoded.iat).toBe(30 * 24 * 60 * 60);
  });

  it('lehnen Tokens ohne userId ab', () => {
    expect(verifyToken(jwt.sign({ foo: 'bar' }, 'unit-test-secret', { expiresIn: '1h' }))).toBeNull();
  });
});

describe('Passwortregel', () => {
  it.each([
    [undefined, false], [12345678, false], ['kurz', false], ['x'.repeat(129), false],
    ['genau-8!', true], ['x'.repeat(128), true],
  ])('%s → gültig: %s', (pw, ok) => {
    expect(passwordError(pw) === null).toBe(ok);
  });
});

describe('Stream-Tickets', () => {
  it('lassen sich genau einmal einlösen', () => {
    const t = issueStreamTicket('login-token');
    expect(redeemStreamTicket(t)).toBe('login-token');
    expect(redeemStreamTicket(t)).toBeNull();
  });

  it('verfallen nach 60 Sekunden', () => {
    const now = Date.now();
    const t = issueStreamTicket('login-token', now);
    expect(redeemStreamTicket(t, now + 61_000)).toBeNull();
  });

  it('akzeptieren nur Text', () => {
    expect(redeemStreamTicket(['a'])).toBeNull();
  });
});
