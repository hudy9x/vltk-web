import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { CLIENT_ROOT, PUBLIC_ROOT } from '../paths.ts';
import { isAssetPath } from '../assets.ts';
import { sendJson } from '../http.ts';
import { buildApp } from '../../../tools/build-app.js';
import type { ServerServices } from '../types.ts';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
};
const STATIC = new Set(['index.html', 'data.js', 'setvi.js', 'jxlook.js', 'style.css', 'jx1ui.css',
  'jx1ui2.css', 'ui20.css', 'manifest.json', 'sw.js', 'client/bootstrap.js', 'fonts/ibm-plex-mono.css',
  'app/maps/availability.json']);

/** Không mở toàn bộ ROOT làm static: save SQLite, source server và .git vẫn riêng tư. */
export function registerStaticRoutes(app: FastifyInstance, services: ServerServices): void {
  app.route({ method: ['GET', 'HEAD'], url: '/ver.json', handler: (_request, reply) => sendJson(reply, 200, { v: 622, bt: false }) });
  app.route({ method: ['GET', 'HEAD'], url: '/*', handler: async (request, reply) => {
    const url = new URL(request.raw.url!, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return sendJson(reply, 404, { error: 'API not found' });
    let relative: string;
    try { relative = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html'; }
    catch { return sendJson(reply, 400, { error: 'Invalid path' }); }
    // Retired map URLs must not make the asset proxy recreate img/z/.
    if (relative.startsWith('img/z/')) return sendJson(reply, 404, { error: 'Map assets moved' });
    const appFile = ['app/game.js', 'app/game.js.map', 'app/modules.json'].includes(relative) || services.moduleFiles.has(relative);
    // Editor-authored map images are local assets; never fetch them from upstream.
    const mapAsset = /^app\/maps\/(?:content\/[1-9]\d*|objects)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(relative);
    if (relative.split('/').some(part => part === '..' || part.startsWith('.')) || relative.includes('\\') ||
      !(STATIC.has(relative) || appFile || mapAsset || isAssetPath(relative))) return sendJson(reply, 404, { error: 'Not found' });
    // Cả game thường lẫn arena dùng cùng bundle. Imported TS edits được rebuild khi reload.
    if (relative === 'app/game.js') {
      for (const source of buildApp().map.sources) services.moduleFiles.add('app/' + source);
    }
    // Keep browser URLs stable while source and public files live separately.
    const filename = relative === 'client/bootstrap.js' ? path.join(CLIENT_ROOT, 'bootstrap.js')
      : relative.startsWith('app/') ? path.join(CLIENT_ROOT, relative.slice(4))
      : path.join(PUBLIC_ROOT, relative);
    if (isAssetPath(relative)) await services.assets.ensure(relative, { download: services.downloadAssets });
    const info = await fs.promises.stat(filename).catch(() => null);
    if (!info?.isFile() || !info.size) return sendJson(reply, 404, { error: 'Not found' });
    reply.code(200).header('Content-Type', TYPES[path.extname(filename)] || 'application/octet-stream')
      .header('Content-Length', info.size).header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
    if (request.method === 'HEAD') return reply.send();
    // Fastify pipe stream trực tiếp: không đọc toàn bộ sprite/audio vào RAM.
    return reply.send(fs.createReadStream(filename));
  } });
}
