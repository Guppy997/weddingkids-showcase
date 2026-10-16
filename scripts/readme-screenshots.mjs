// Erzeugt die Screenshots für die README per headless Chrome (DevTools-Protokoll,
// keine zusätzlichen Pakete). Voraussetzungen: Node 22+, Google Chrome, und die
// App läuft mit DEMO-Daten (siehe scripts/seed-demo.ts):
//
//   DB_PATH=./data/demo.db npm run seed:demo
//   npm run dev                                   (Backend :3001, Frontend :3000)
//   node scripts/readme-screenshots.mjs
//
// Umgebungsvariablen: APP_URL (Standard http://localhost:3000/), API_URL
// (Standard http://localhost:3001), CHROME_PATH, OUT_DIR (Standard
// docs/screenshots), CDP_PORT (Standard 9335)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_URL = (process.env.APP_URL || 'http://localhost:3000/').replace(/\/?$/, '/');
const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
const OUT_DIR = path.resolve(process.env.OUT_DIR || path.join(root, 'docs', 'screenshots'));
const CDP_PORT = Number(process.env.CDP_PORT) || 9335;
const CHROME_PATH = process.env.CHROME_PATH || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : 'google-chrome');
const DEMO_PASSWORD = 'demo1234';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sicherung: nur fotografieren, wenn die App die Demo-Daten zeigt. Echte Konten
// haben weder dieses Passwort noch die erfundene Hochzeit "Mia & Ben".
const login = await fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'lena', password: DEMO_PASSWORD })
}).catch(() => null);
const token = login?.ok ? (await login.json()).token : null;
const weddings = token
  ? await fetch(`${API_URL}/api/weddings`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => [])
  : [];
const list = Array.isArray(weddings) ? weddings : weddings.weddings ?? [];
if (!token || !list.some((w) => w.coupleNames === 'Mia & Ben')) {
  console.error('Abbruch: Die App zeigt keine Demo-Daten. Backend mit DB_PATH auf die Demo-Datenbank starten.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weddingkids-shots-'));
const chrome = spawn(CHROME_PATH, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profileDir}`, 'about:blank'
], { stdio: 'ignore' });

const cdpJson = async (p) => (await fetch(`http://127.0.0.1:${CDP_PORT}${p}`)).json();
let version;
for (let i = 0; i < 50 && !version; i++) {
  await sleep(200);
  try { version = await cdpJson('/json/version'); } catch {}
}
const connect = async (url) => {
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
  const send = (method, params = {}) => new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return { ws, send };
};

// Benachrichtigungen ablehnen, damit kein Push-Hinweis im Bild ist
const browser = await connect(version.webSocketDebuggerUrl);
await browser.send('Browser.setPermission', { origin: new URL(APP_URL).origin, permission: { name: 'notifications' }, setting: 'denied' });
const page = await connect((await cdpJson('/json')).find((t) => t.type === 'page').webSocketDebuggerUrl);
const { send } = page;

const evaluate = async (expr) =>
  (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr) => {
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (await evaluate(`Boolean(${expr})`)) return;
  }
  throw new Error(`Timeout beim Warten auf: ${expr}`);
};
// Klickt das innerste passende Element (z. B. den Titel statt der ganzen Spalte);
// der Klick wandert von dort zum onClick der Karte hoch
const clickText = async (selector, text) => {
  const ok = await evaluate(`(() => {
    const sel = ${JSON.stringify(selector)}, txt = ${JSON.stringify(text)};
    const hits = [...document.querySelectorAll(sel)].filter((e) => e.textContent.includes(txt));
    const el = hits.find((e) => ![...e.querySelectorAll(sel)].some((c) => c.textContent.includes(txt)));
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  })()`);
  if (!ok) throw new Error(`Nicht gefunden: ${selector} "${text}"`);
  await sleep(600);
};
// React bekommt Eingaben nur über den nativen Setter + input-Event mit
const type = (selector, value) => evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
const shot = async (name) => {
  await sleep(500);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(result.data, 'base64'));
  console.log(`✓ ${path.relative(root, path.join(OUT_DIR, name))}`);
};
const loginAs = async (username) => {
  await send('Page.navigate', { url: APP_URL });
  await sleep(800);
  await evaluate('localStorage.clear()');
  await send('Page.navigate', { url: APP_URL });
  await waitFor('document.querySelector("input[autocomplete=username]")');
  await type('input[autocomplete=username]', username);
  await type('input[type=password]', DEMO_PASSWORD);
  await sleep(200);
  await evaluate('document.querySelector("button[type=submit]").click()');
  await waitFor('document.querySelector("nav")');
  await sleep(1200);
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  // Mitarbeiterin: Anfragen beantworten, Hochzeit im Detail
  await loginAs('marie');
  await clickText('nav button', 'Anfragen');
  await evaluate('window.scrollTo(0, 0)');
  await shot('anfragen.png');

  await clickText('nav button', 'Board');
  await clickText('h3, h4, div', 'Mia & Ben');
  await waitFor('document.body.innerText.includes("PERSONAL-STATUS") || document.body.innerText.includes("Personal-Status")');
  await shot('hochzeit-detail.png');

  // Admin: Rückmeldungen sehen und einteilen, Kalender
  await loginAs('lena');
  await clickText('nav button', 'Admin');
  await clickText('h3, h4, div', 'Mia & Ben');
  await evaluate(`(() => {
    const title = [...document.querySelectorAll('h3, h4')].find((e) => e.textContent.trim() === 'Mia & Ben');
    if (title) window.scrollTo(0, title.getBoundingClientRect().top + scrollY - 110);
  })()`);
  await shot('admin-einteilung.png');

  await clickText('nav button', 'Plan');
  await clickText('button', 'Kalender');
  await evaluate('window.scrollTo(0, 0)');
  await shot('kalender.png');
} finally {
  page.ws.close();
  browser.ws.close();
  chrome.kill();
  await sleep(500); // Chrome schreibt beim Beenden noch kurz ins Profil
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3 });
}
