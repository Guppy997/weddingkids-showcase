import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

// Tokens laufen nach 30 Tagen ab. /api/auth/verify gibt bei jedem App-Start
// einen frischen Token aus — wer die App nutzt, bleibt also angemeldet.
const TOKEN_TTL = '30d';

// Tokens aus der Zeit vor dem Ablaufdatum (ohne exp) gelten noch bis zu diesem
// Stichtag. Wer die App bis dahin einmal öffnet, hat automatisch einen neuen.
export const LEGACY_TOKEN_CUTOFF_MS = Date.parse('2026-11-30T23:59:59+01:00');

export interface TokenPayload {
  userId: string;
  name: string;
  role: 'Admin' | 'Staff';
  department: string;
}

export interface VerifiedToken extends TokenPayload {
  /** Ausstellungszeitpunkt in Millisekunden (für den Abgleich mit Passwortänderungen). */
  iatMs?: number;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Für unbekannte Benutzernamen trotzdem einmal bcrypt rechnen — sonst verrät
// die schnellere Antwort, welche Benutzernamen es gibt.
let dummyHash: Promise<string> | undefined;
export async function comparePasswordOrDummy(password: string, hash: string | undefined): Promise<boolean> {
  if (hash) return comparePassword(password, hash);
  dummyHash ??= hashPassword('kein-echtes-passwort-nur-fuer-die-laufzeit');
  await comparePassword(password, await dummyHash);
  return false;
}

/** Gemeinsame Passwortregel für Zugangsanfrage, Registrierung, Änderung und Reset. */
export function passwordError(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'Passwort muss mindestens 8 Zeichen haben';
  if (password.length > 128) return 'Passwort zu lang (max 128 Zeichen)';
  return null;
}

export function generateToken(payload: TokenPayload): string {
  // Nur die Nutzdaten übernehmen — iat/exp eines alten Tokens dürfen nicht mitwandern.
  const { userId, name, role, department } = payload;
  return jwt.sign({ userId, name, role, department, iatMs: Date.now() }, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL,
  });
}

export function verifyToken(token: string, now = Date.now()): VerifiedToken | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      clockTimestamp: Math.floor(now / 1000),
    });
    if (typeof payload !== 'object' || typeof payload.userId !== 'string') return null;
    if (payload.exp === undefined && now > LEGACY_TOKEN_CUTOFF_MS) return null;
    return payload as VerifiedToken;
  } catch {
    return null;
  }
}

/** Ausstellungszeitpunkt eines Tokens in Millisekunden (alte Tokens haben nur iat in Sekunden). */
export function issuedAtMs(payload: VerifiedToken): number {
  if (typeof payload.iatMs === 'number') return payload.iatMs;
  return (payload.iat ?? 0) * 1000;
}
