// Einstiegspunkt des API-Servers (wird von systemd gestartet: `tsx src/server/server.ts`).
//
// WICHTIG: dotenv/config MUSS vor allen anderen Imports stehen, da ES-Modul-Imports
// sofort ausgeführt werden. config.ts und lib/push.ts lesen process.env beim Import.
import 'dotenv/config';
import { initializeDatabase, closeDatabase } from './database.js';
import { createApp } from './app.js';
import { PORT, HOST } from './config.js';

function startServer() {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable must be set');
    initializeDatabase();
    const server = createApp().listen(PORT, HOST, () => console.log(`✅ Server running on ${HOST}:${PORT}`));
    process.on('SIGTERM', () => server.close(() => { closeDatabase(); process.exit(0); }));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
