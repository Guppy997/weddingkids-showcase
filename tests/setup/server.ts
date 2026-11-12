import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import type { TestProject } from 'vitest/node';
import { TEST_SECRET, USERS, PASSWORD, HIDDEN_ID } from '../fixtures';

// Startet den Server als eigenen Prozess gegen eine Wegwerf-Datenbank im
// Temp-Ordner. Produktivdaten werden dabei nie berührt.

declare module 'vitest' {
  export interface ProvidedContext {
    baseUrl: string;
    tokens: Record<keyof typeof USERS, string>;
  }
}

let child: ChildProcess | undefined;
let tmpDir: string | undefined;

async function waitForHealth(baseUrl: string, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch { /* Server startet noch */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Test-Server ist nicht rechtzeitig gestartet');
}

export default async function setup(project: TestProject) {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weddingkids-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const port = 40_000 + Math.floor(Math.random() * 10_000);
  const baseUrl = `http://127.0.0.1:${port}`;

  // Ein einziger Node-Prozess mit tsx-Loader (statt des tsx-Wrappers, der einen
  // zweiten Prozess startet) — so beendet teardown() den Server zuverlässig.
  child = spawn(process.execPath, ['--import', 'tsx', 'src/server/server.ts'], {
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: dbPath,
      JWT_SECRET: TEST_SECRET,
      CLIENT_ORIGIN: 'http://localhost',
      HIDDEN_USER_IDS: HIDDEN_ID,
      PROTECTED_USER_IDS: USERS.admin.id,
      // Die Suite stellt in Sekunden mehr Anfragen, als die Limits pro Minute erlauben
      AUTH_LIMIT_PER_15_MIN: '200',
      WRITE_LIMIT_PER_MIN: '1000',
      VAPID_PUBLIC_KEY: '',
      VAPID_PRIVATE_KEY: '',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  await waitForHealth(baseUrl);

  // Testnutzer direkt in die (vom Server angelegte) Datenbank schreiben.
  const db = new Database(dbPath);
  const hash = bcrypt.hashSync(PASSWORD, 4);
  const insert = db.prepare(
    'INSERT INTO users (id, username, name, password_hash, role, department, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const u of Object.values(USERS)) {
    insert.run(u.id, u.username, u.name, hash, u.role, 'Team', u.status);
  }
  db.close();

  // Einmal pro Nutzer einloggen (Login ist rate-limitiert) und Tokens teilen.
  const tokens = {} as Record<keyof typeof USERS, string>;
  for (const [key, u] of Object.entries(USERS) as [keyof typeof USERS, typeof USERS[keyof typeof USERS]][]) {
    if (u.status !== 'active') continue;
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u.username, password: PASSWORD }),
    });
    tokens[key] = (await res.json()).token;
  }

  project.provide('baseUrl', baseUrl);
  project.provide('tokens', tokens);

  return teardown;
}

async function teardown() {
  if (child && child.exitCode === null) {
    const exited = new Promise<void>(resolve => child!.once('exit', () => resolve()));
    child.kill('SIGTERM');
    // Fallback, falls der Server beim Herunterfahren auf offene Verbindungen wartet
    const timer = setTimeout(() => child?.kill('SIGKILL'), 3_000);
    await exited;
    clearTimeout(timer);
  }
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
}
