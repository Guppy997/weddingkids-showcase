import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database.js';
import { hashPassword, comparePassword, comparePasswordOrDummy, passwordError, generateToken } from '../lib/credentials.js';
import { sendPushToUsers } from '../lib/push.js';
import { authMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { isNameTaken, isAllowedAvatarImage, NAME_TAKEN_ERROR } from '../lib/profile.js';
import type { UserRow, CountRow, IdRow } from '../types.js';

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────

router.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    // Überlange Eingaben gar nicht erst hashen
    if (username.length > 100 || password.length > 128) return res.status(401).json({ error: 'Invalid credentials' });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    const isValid = await comparePasswordOrDummy(password, user?.password_hash);
    if (!user || !isValid) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Dein Account wartet noch auf Freigabe durch einen Admin.' });
    const token = generateToken({ userId: user.id, name: user.name, role: user.role, department: user.department });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, department: user.department, avatarColor: user.avatar_color ?? '#008080', avatarImage: user.avatar_image ?? null } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/api/auth/register', authLimiter, authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, department, role } = req.body ?? {};
    if (!username || !password || !name || !department) return res.status(400).json({ error: 'All fields required' });
    if (typeof username !== 'string' || typeof name !== 'string' || typeof department !== 'string') {
      return res.status(400).json({ error: 'All fields required' });
    }
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    if (isNameTaken(name)) return res.status(409).json({ error: NAME_TAKEN_ERROR });
    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    db.prepare('INSERT INTO users (id, username, name, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, username, name, passwordHash, role === 'Admin' ? 'Admin' : 'Staff', department);
    res.status(201).json({ message: 'User created', user: { id, name, role: role ?? 'Staff', department } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/api/auth/verify', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const dbUser = db.prepare('SELECT avatar_color, avatar_image, name FROM users WHERE id = ?').get(req.user!.userId) as Pick<UserRow, 'avatar_color' | 'avatar_image' | 'name'> | undefined;
  // Frischer Token bei jedem App-Start: verlängert die 30 Tage und löst alte
  // Tokens ohne Ablaufdatum unbemerkt ab.
  res.json({
    valid: true,
    token: generateToken(req.user!),
    user: { ...req.user, avatarColor: dbUser?.avatar_color ?? '#008080', avatarImage: dbUser?.avatar_image ?? null, name: dbUser?.name ?? req.user!.name },
  });
});

router.patch('/api/auth/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatarColor, avatarImage } = req.body ?? {};
    const db = getDb();
    const userId = req.user!.userId;

    // Erst alles prüfen, dann speichern: Ein abgelehntes Feld darf die anderen
    // nicht schon geändert haben.
    let newName: string | undefined;
    if (name !== undefined && name !== null && name !== '') {
      if (typeof name !== 'string') return res.status(400).json({ error: 'Ungültiger Name' });
      const trimmed = name.trim();
      if (trimmed.length > 80) return res.status(400).json({ error: 'Name zu lang (max 80 Zeichen)' });
      // Nur prüfen, wenn sich der Name wirklich ändert: Das Profil schickt ihn
      // bei jedem Speichern mit, auch wenn nur die Farbe gewechselt wurde.
      if (trimmed && trimmed !== req.user!.name) {
        if (isNameTaken(trimmed, userId)) return res.status(409).json({ error: NAME_TAKEN_ERROR });
        newName = trimmed;
      }
    }
    if (avatarColor) {
      // Hex-Farbe validieren (#RRGGBB oder #RGB)
      if (typeof avatarColor !== 'string' || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(avatarColor)) {
        return res.status(400).json({ error: 'Ungültige Farbe' });
      }
    }
    // avatarImage: eingebettetes Bild (Data-URL) oder null zum Entfernen.
    // Web-Adressen werden abgelehnt, siehe lib/profile.ts.
    if (avatarImage !== undefined && avatarImage !== null && !isAllowedAvatarImage(avatarImage)) {
      return res.status(400).json({ error: 'Profilbild ungültig oder zu groß. Erlaubt sind JPEG, PNG und WebP bis ca. 185 KB.' });
    }

    if (newName) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(newName, userId);
    if (avatarColor) db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(avatarColor, userId);
    if (avatarImage !== undefined) db.prepare('UPDATE users SET avatar_image = ? WHERE id = ?').run(avatarImage, userId);

    const updated = db.prepare('SELECT id, name, role, department, avatar_color, avatar_image FROM users WHERE id = ?').get(req.user!.userId) as Pick<UserRow, 'id' | 'name' | 'role' | 'department' | 'avatar_color' | 'avatar_image'>;
    const newToken = generateToken({ userId: updated.id, name: updated.name, role: updated.role, department: updated.department });
    res.json({ token: newToken, user: { id: updated.id, name: updated.name, role: updated.role, department: updated.department, avatarColor: updated.avatar_color, avatarImage: updated.avatar_image ?? null } });
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

router.post('/api/auth/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || !currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
    const pwErr = passwordError(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as UserRow;
    if (currentPassword.length > 128 || !await comparePassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is wrong' });
    }
    const hash = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?')
      .run(hash, new Date().toISOString(), req.user!.userId);
    // Alle anderen Geräte sind ab jetzt abgemeldet; dieses bekommt einen neuen Token.
    res.json({ message: 'Password changed successfully', token: generateToken(req.user!) });
  } catch (error) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ─── DSGVO: Datenexport (Art. 20) ────────────────────────────────────────────
router.get('/api/auth/export-data', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const user = db.prepare('SELECT id, username, name, role, department, status, avatar_color, created_at FROM users WHERE id = ?').get(userId) as Pick<UserRow, 'id' | 'username' | 'name' | 'role' | 'department' | 'status' | 'avatar_color' | 'created_at'> | undefined;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const assignments = db.prepare(`
      SELECT a.wedding_id, a.status, a.assigned, w.couple_names, w.date, w.location
      FROM assignments a JOIN weddings w ON a.wedding_id = w.id
      WHERE a.staff_id = ?
    `).all(userId);

    const activityLog = db.prepare(`
      SELECT al.event_type, al.description, al.created_at, w.couple_names
      FROM activity_log al LEFT JOIN weddings w ON al.wedding_id = w.id
      WHERE al.actor_id = ?
      ORDER BY al.created_at DESC
    `).all(userId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportNote: 'Dies sind alle zu deinem Account gespeicherten personenbezogenen Daten gemäß Art. 20 DSGVO.',
      account: user,
      assignments,
      activityLog,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="weddingkids-export-${user.username}-${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ─── DSGVO: Konto-Löschung (Art. 17) ─────────────────────────────────────────
router.delete('/api/auth/delete-account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !password || password.length > 128) {
      return res.status(400).json({ error: 'Passwort zur Bestätigung erforderlich' });
    }
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as UserRow | undefined;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!await comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Falsches Passwort' });
    }
    // Prevent admins from deleting themselves if they're the last admin
    if (user.role === 'Admin') {
      const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'Admin' AND status = 'active'").get() as CountRow).c;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Du bist der letzte Admin. Bestimme zuerst einen anderen Admin.' });
      }
    }
    // Cascade deletes will remove assignments, notes, etc. (FK ON DELETE CASCADE)
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user!.userId);
    res.json({ message: 'Account gelöscht' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Konto-Löschung fehlgeschlagen' });
  }
});

// ─── Self-registration (no auth required) ────────────────────────────────────

router.post('/api/auth/request-access', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, name, department } = req.body ?? {};
    if (typeof username !== 'string' || typeof name !== 'string' || !username || !password || !name.trim()) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }
    if (department !== undefined && typeof department !== 'string') {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }
    // Buchstaben (auch Umlaute), Ziffern, Punkt, Unterstrich, Bindestrich — keine Leer- oder Steuerzeichen
    if (!/^[\p{L}\p{N}._-]{3,40}$/u.test(username)) {
      return res.status(400).json({ error: 'Benutzername: 3–40 Zeichen, nur Buchstaben, Ziffern und . _ -' });
    }
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
      return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    }
    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    db.prepare('INSERT INTO users (id, username, name, password_hash, role, department, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, username, name, passwordHash, 'Staff', department ?? '', 'pending');
    res.status(201).json({ message: 'Anfrage gesendet. Ein Admin wird deinen Account freigeben.' });

    // Push: alle Admins → "Neue Mitarbeiteranfrage"
    try {
      const adminIds = (db.prepare(
        "SELECT id FROM users WHERE role = 'Admin' AND status = 'active'"
      ).all() as IdRow[]).map(r => r.id);
      sendPushToUsers(adminIds, {
        title: 'Neue Mitarbeiteranfrage',
        body: `${name} möchte sich registrieren`,
        url: '/',
        tag: `staff-request-${id}`,
      }).catch(err => console.error('Push (request-access) failed:', err));
    } catch (err) {
      console.error('Push trigger error (request-access):', err);
    }
  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen' });
  }
});

export default router;
