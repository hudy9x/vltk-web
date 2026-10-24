/**
 * BẮT ĐẦU ĐỌC SERVER TẠI ĐÂY.
 * createServer: mở/nhận SQLite -> build game -> seed catalog -> tạo Fastify
 * -> cấu hình headers/parser/error -> đăng ký API -> đăng ký static.
 * Import trong test/tool chỉ tạo factory; chạy file trực tiếp mới listen.
 */
import Fastify from 'fastify';
import path from 'node:path';
import { ROOT, PUBLIC_ROOT, isMainModule } from './paths.ts';
import { openDatabase } from './database.ts';
import { createAssetCache } from './assets.ts';
import { seedCatalog } from '../../database/seeds/catalog.ts';
import { buildApp } from '../../tools/build-app.js';
import { sendJson, toHttpError } from './http.ts';
import { registerApiRoutes } from './routes/api.ts';
import { registerStaticRoutes } from './routes/static.ts';
import type { ServerOptions, ServerServices } from './types.ts';

export function createServer({
  db = openDatabase(), downloadAssets = true,
  development = process.env.NODE_ENV === 'development',
  combatSandbox = process.env.COMBAT_SANDBOX === '1',
}: ServerOptions = {}) {
  const bundle = buildApp();
  seedCatalog(db);
  const services: ServerServices = {
    db, assets: createAssetCache({ root: PUBLIC_ROOT }), development, combatSandbox, downloadAssets,
    moduleFiles: new Set(bundle.map.sources.map(file => 'app/' + file)),
  };
  const app = Fastify({
    // TLS terminates at the local nginx proxy; remote clients cannot supply trusted forwarding headers.
    trustProxy: ['127.0.0.1', '::1'],
    logger: false, bodyLimit: 8_000_000, exposeHeadRoutes: false,
    frameworkErrors: (error, _request, reply) => sendJson(reply, 400,
      { error: error.code === 'FST_ERR_BAD_URL' ? 'Invalid path' : error.message }),
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
    const headers = request.headers;
    if (headers.origin && headers.origin !== `${request.protocol}://${headers.host}`) return sendJson(reply, 403, { error: 'Origin rejected' });
    // Shared links may be cross-site navigations; only allow the public game document.
    const gameNavigation = ['GET', 'HEAD'].includes(request.method) &&
      headers['sec-fetch-mode'] === 'navigate' && headers['sec-fetch-dest'] === 'document' &&
      ['/', '/index.html'].includes(request.raw.url!.split('?')[0]);
    if (headers['sec-fetch-site'] === 'cross-site' && !gameNavigation) return sendJson(reply, 403, { error: 'Cross-site request rejected' });
    // Từ chối route/method lạ trước khi đọc body, giống HTTP server cũ.
    if (request.is404) {
      const pathname = new URL(request.raw.url!, 'http://localhost').pathname;
      return sendJson(reply, pathname.startsWith('/api/') ? 404 : ['GET', 'HEAD'].includes(request.method) ? 404 : 405,
        { error: pathname.startsWith('/api/') ? 'API not found' : ['GET', 'HEAD'].includes(request.method) ? 'Not found' : 'Method not allowed' });
    }
  });
  // Giữ raw JSON string để validation ở database.ts không bị coercion/default của framework.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', { parseAs: 'string' }, (_request, body, done) => done(null, body));
  app.setErrorHandler((cause, _request, reply) => {
    const error = toHttpError(cause);
    const status = error.status || error.statusCode || 500;
    if (status >= 500 && !error.status) console.error(error);
    return sendJson(reply, status, { error: error.code === 'FST_ERR_CTP_BODY_TOO_LARGE' ? 'Request too large' :
      status === 500 && !error.status ? 'Server error' : error.message });
  });
  registerApiRoutes(app, services);
  registerStaticRoutes(app, services);
  // app là Fastify lifecycle/test interface; server là Node HTTP handle hiện có.
  return { app, server: app.server, db };
}

export async function startServer(): Promise<void> {
  const { app, db } = createServer();
  const port = Number(process.env.PORT || 3000);
  try { await app.listen({ port, host: '127.0.0.1' }); }
  catch (error) { await app.close(); db.close(); throw error; }
  console.log(`Võ Lâm Idle: http://127.0.0.1:${port}\nSQLite: ${process.env.DB_PATH || path.join(ROOT, 'database/game.sqlite')}`);
  const stop = async () => {
    try { await app.close(); db.close(); process.exit(0); }
    catch (error) { console.error(error); process.exit(1); }
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (isMainModule(import.meta.url)) startServer().catch(error => { console.error(error); process.exitCode = 1; });
