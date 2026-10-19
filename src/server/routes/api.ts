import type { FastifyInstance } from 'fastify';
import { snapshot, initialize, applyBatch } from '../database.ts';
import { parseJsonBody, sendJson } from '../http.ts';
import type { ServerServices } from '../types.ts';

/** Giữ nguyên URL/payload/status để client/bootstrap.js tiếp tục dùng API cũ. */
export function registerApiRoutes(app: FastifyInstance, services: ServerServices): void {
  const { db, assets, development, combatSandbox } = services;
  app.get('/api/config', (_request, reply) => sendJson(reply, 200,
    { development, ...(development && combatSandbox ? { combatSandbox: true } : {}) }));
  app.get('/api/health', (_request, reply) => sendJson(reply, 200, { ok: true, database: 'sqlite', mode: 'local' }));
  app.get('/api/assets', (_request, reply) => sendJson(reply, 200, assets.report()));
  app.get('/api/storage', (_request, reply) => sendJson(reply, 200, snapshot(db)));
  app.post('/api/storage/init', (request, reply) => {
    const payload = parseJsonBody(request.body) as { entries: unknown };
    return sendJson(reply, 200, initialize(db, payload.entries));
  });
  app.post('/api/storage', (request, reply) => {
    applyBatch(db, parseJsonBody(request.body));
    return sendJson(reply, 200, { ok: true });
  });
  app.get('/api/catalog', (_request, reply) => sendJson(reply, 200,
    db.prepare('SELECT section,count(*) AS entries FROM game_data GROUP BY section').all()));
  app.get('/api/catalog/entry', (request, reply) => {
    const url = new URL(request.raw.url!, 'http://localhost');
    const row = db.prepare('SELECT data FROM game_data WHERE section=? AND entry_key=?')
      .get(url.searchParams.get('section'), url.searchParams.get('key'));
    return sendJson(reply, row ? 200 : 404, row ? JSON.parse(row.data as string) : { error: 'Entry not found' });
  });
}
