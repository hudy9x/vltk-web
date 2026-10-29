import { createHmac, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import { createCharacters } from '../persistence/characters.ts';
import { parseJsonBody, sendJson } from '../../http.ts';

/** Short-lived, binary HMAC ticket. The account ID always comes from the cookie session. */
export function issueMultiplayerTicket(
  accountId: string,
  secret: string,
  now = Date.now(),
): Buffer {
  const account = Buffer.from(accountId.replaceAll('-', ''), 'hex');
  if (account.length !== 16 || secret.length < 32)
    throw new Error('Invalid multiplayer ticket configuration');
  const payload = Buffer.alloc(37);
  payload[0] = 1;
  payload.writeUInt32LE(Math.floor(now / 1000) + 30, 1);
  account.copy(payload, 5);
  randomBytes(16).copy(payload, 21);
  return Buffer.concat([payload, createHmac('sha256', secret).update(payload).digest()]);
}

export function registerMultiplayerWebTransport(
  app: FastifyInstance,
  requireUser: (request: FastifyRequest) => Record<string, unknown>,
  db?: DatabaseSync,
): void {
  const characters = db ? createCharacters(db) : undefined;
  let polling: Promise<void> | undefined;
  const stopped = new AbortController();
  async function controlCall(path: string, body?: unknown) {
    const response = await fetch(new URL(path, process.env.MULTIPLAYER_WT_CONTROL_URL!), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'x-multiplayer-secret': process.env.MULTIPLAYER_SECRET || '',
        'content-type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.any([stopped.signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok)
      throw Object.assign(new Error('Máy chủ thế giới chưa sẵn sàng.'), { status: 503 });
    return response.json();
  }
  const timer = setInterval(() => {
    if (polling || !characters || !process.env.MULTIPLAYER_WT_CONTROL_URL) return;
    polling = (async () => {
      try {
        const grants = await controlCall('/rewards');
        const ids: string[] = [];
        const refresh = new Set<string>();
        for (const grant of grants) {
          characters.apply(grant);
          ids.push(grant.id);
          refresh.add(grant.account + ':' + grant.slot);
        }
        for (const key of refresh) {
          const [account, slot] = key.split(':');
          const saved = characters.read(account, Number(slot));
          await controlCall('/refresh', {
            nonce: '',
            account,
            slot: Number(slot),
            profile: characters.character(saved.profile),
          });
        }
        if (ids.length) await controlCall('/rewards/ack', ids);
      } catch (error) {
        if (!stopped.signal.aborted)
          app.log.warn({ err: error }, 'Online reward delivery will retry');
      }
    })().finally(() => {
      polling = undefined;
    });
  }, 1000);
  timer.unref();
  app.addHook('onClose', async () => {
    clearInterval(timer);
    stopped.abort();
    await polling;
  });
  app.get('/api/multiplayer/character', (request, reply) => {
    const user = requireUser(request);
    const slot = Number((request.query as { slot?: string }).slot);
    if (!characters) return sendJson(reply, 503, { error: 'Online storage unavailable' });
    const previous = Number((request.query as { revision?: string }).revision);
    if (
      Number.isInteger(slot) &&
      slot >= 0 &&
      slot <= 2 &&
      Number.isInteger(previous) &&
      previous >= 0 &&
      characters.revision(String(user.id), slot) === previous
    )
      return reply.code(204).send();
    const saved = characters.read(String(user.id), slot);
    const profile =
      Number.isInteger(previous) && previous >= 0
        ? Object.fromEntries(
            ['lvl', 'xp', 'gold', 'attrPts', 'skPts', 'potStock', 'potUsed', 'onlinePotionSpent'].map((key) => [key, saved.profile[key]]),
          )
        : saved.profile;
    return sendJson(reply, 200, { revision: saved.revision, profile });
  });
  app.post('/api/multiplayer/webtransport/session', async (request, reply) => {
    const user = requireUser(request);
    const control = process.env.MULTIPLAYER_WT_CONTROL_URL;
    const secret = process.env.MULTIPLAYER_SECRET || '';
    if (!control || secret.length < 32) return sendJson(reply, 200, { enabled: false });
    const response = await fetch(new URL('/config', control), {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok)
      throw Object.assign(new Error('Máy chủ multiplayer chưa sẵn sàng.'), { status: 503 });
    const config = (await response.json()) as Record<string, unknown>;
    const ticket = issueMultiplayerTicket(String(user.id), secret);
    // The shared Fastify parser deliberately returns a raw JSON string.
    const payload = parseJsonBody(request.body) as { slot?: unknown } | null;
    const slot = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload.slot === undefined ? 0 : payload.slot)
      : null;
    if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot > 2)
      return sendJson(reply, 400, { error: 'Ô nhân vật không hợp lệ.' });
    if (characters) {
      const saved = characters.read(String(user.id), slot);
      await controlCall('/catalog', characters.world());
      await controlCall('/admit', {
        nonce: ticket.subarray(21, 37).toString('hex'),
        account: String(user.id),
        slot,
        profile: characters.character(saved.profile),
      });
    }
    return sendJson(reply, 200, { enabled: true, ...config, ticket: ticket.toString('base64') });
  });
}
