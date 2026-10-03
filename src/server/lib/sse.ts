import type { Response } from 'express';

// ─── SSE: Echtzeit-Updates für alle verbundenen Clients ──────────────────────
// Clients bekommen nur das Signal „X hat sich geändert“ und laden dann selbst
// neu — es werden keine Daten über diesen Kanal verschickt.
export const sseClients = new Set<Response>();

export function broadcastUpdate(type: string = 'data_changed') {
  const payload = `data: ${JSON.stringify({ type, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch { sseClients.delete(client); }
  }
}
