import { createHmac, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { sendJson } from '../../http.ts';

/** Short-lived, binary HMAC ticket. The account ID always comes from the cookie session. */
export function issueMultiplayerTicket(accountId: string, secret: string, now = Date.now()): Buffer {
  const account = Buffer.from(accountId.replaceAll('-', ''), 'hex');
  if (account.length !== 16 || secret.length < 32) throw new Error('Invalid multiplayer ticket configuration');
  const payload = Buffer.alloc(37);
  payload[0] = 1;
  payload.writeUInt32LE(Math.floor(now / 1000) + 30, 1);
  account.copy(payload, 5);
  randomBytes(16).copy(payload, 21);
  return Buffer.concat([payload, createHmac('sha256', secret).update(payload).digest()]);
}

export function registerMultiplayerWebTransport(app: FastifyInstance,
  requireUser: (request: FastifyRequest) => Record<string, unknown>): void {
  app.post('/api/multiplayer/webtransport/session', async (request, reply) => {
    const user = requireUser(request);
    const control = process.env.MULTIPLAYER_WT_CONTROL_URL;
    const secret = process.env.MULTIPLAYER_SECRET || '';
    if (!control || secret.length < 32) return sendJson(reply, 200, { enabled: false });
    const response = await fetch(new URL('/config', control), { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw Object.assign(new Error('Máy chủ multiplayer chưa sẵn sàng.'), { status: 503 });
    const config = await response.json() as Record<string, unknown>;
    return sendJson(reply, 200, { enabled: true, ...config,
      ticket: issueMultiplayerTicket(String(user.id), secret).toString('base64') });
  });
}
