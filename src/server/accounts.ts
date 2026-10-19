import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { isGameKey, snapshot } from './database.ts';
import { parseJsonBody, sendJson } from './http.ts';
import type { StorageSnapshot, StorageBatch, StorageOperation } from './types.ts';

const derive = promisify(scrypt);
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const fail = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };
const cookieName = 'volam_session';
const tokenFrom = (request: FastifyRequest) => (request.headers.cookie || '').split(';')
  .map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';

export function registerAccounts(app: FastifyInstance, db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL,
    generation TEXT NOT NULL, initialized INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS account_sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS account_storage (account_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(account_id,key));
  CREATE TABLE IF NOT EXISTS account_batches (account_id TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY(account_id,id));`);
  const attempts = new Map<string, { count: number; until: number }>();
  const getUser = (request: FastifyRequest) => db.prepare(`SELECT a.id,a.username FROM accounts a
    JOIN account_sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires>?`).get(hashToken(tokenFrom(request)), Date.now());
  const requireUser = (request: FastifyRequest) => getUser(request) || fail(401, 'Vui lòng đăng nhập.');
  const setSession = (request: FastifyRequest, reply: FastifyReply, id: string) => {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM account_sessions WHERE expires<=? OR token_hash=?').run(Date.now(), hashToken(tokenFrom(request)));
    db.prepare('INSERT INTO account_sessions VALUES (?,?,?)').run(hashToken(token), id, Date.now() + 30 * 86400000);
    reply.header('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${request.protocol === 'https' ? '; Secure' : ''}`);
  };
  app.get('/api/auth/session', (request, reply) => sendJson(reply, 200, { user: getUser(request) || null }));
  for (const mode of ['register', 'login']) app.post('/api/auth/' + mode, async (request, reply) => {
    const key = request.ip, now = Date.now();
    if (attempts.size > 1000) for (const [ip, value] of attempts) if (value.until <= now) attempts.delete(ip);
    let limit = attempts.get(key);
    if (!limit || limit.until <= now) { limit = { count: 0, until: now + 60000 }; attempts.set(key, limit); }
    if (++limit.count > 20) fail(429, 'Bạn thử quá nhiều lần. Vui lòng đợi một phút.');
    const payload = parseJsonBody(request.body) as { username?: unknown; password?: unknown } | null;
    const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
    const password = typeof payload?.password === 'string' ? payload.password : '';
    if (!/^[a-z0-9_]{3,16}$/.test(username)) fail(400, 'Username cần 3–16 ký tự: chữ không dấu, số hoặc _.');
    if (password.length < 6 || password.length > 64) fail(400, 'Password cần từ 6 đến 64 ký tự.');
    let account = db.prepare('SELECT * FROM accounts WHERE username=?').get(username);
    if (mode === 'register') {
      if (account) fail(409, 'Username đã được sử dụng.');
      const salt = randomBytes(16).toString('hex');
      const digest = await derive(password, salt, 64) as Buffer;
      // Serialize the first-account claim after the asynchronous password derivation.
      db.exec('BEGIN IMMEDIATE');
      try {
        if (db.prepare('SELECT 1 FROM accounts WHERE username=?').get(username)) fail(409, 'Username đã được sử dụng.');
        const first = !db.prepare('SELECT 1 FROM accounts LIMIT 1').get();
        const legacy = first ? snapshot(db) : null;
        const id = randomUUID();
        db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?,?)').run(id, username, salt, digest.toString('hex'), randomUUID(), legacy && !legacy.initialized ? 0 : 1);
        const insert = db.prepare('INSERT INTO account_storage VALUES (?,?,?)');
        for (const [name, value] of Object.entries(legacy?.entries || {})) insert.run(id, name, value);
        account = { id, username };
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    } else {
      // Derive even for unknown usernames to avoid a fast username-discovery path.
      const salt = account?.salt as string || '00000000000000000000000000000000';
      const digest = await derive(password, salt, 64) as Buffer;
      if (!account || !timingSafeEqual(digest, Buffer.from(account.password_hash as string, 'hex')))
        fail(401, 'Username hoặc password không đúng.');
    }
    setSession(request, reply, account!.id as string);
    return sendJson(reply, 200, { user: { id: account!.id, username } });
  });
  app.post('/api/auth/logout', (request, reply) => {
    db.prepare('DELETE FROM account_sessions WHERE token_hash=?').run(hashToken(tokenFrom(request)));
    reply.header('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    return sendJson(reply, 200, { ok: true });
  });
  const read = (request: FastifyRequest): StorageSnapshot => {
    const user = requireUser(request);
    const account = db.prepare('SELECT generation,initialized FROM accounts WHERE id=?').get(user.id)!;
    // A database reset invalidates every account's pending browser writes, too.
    const generation = db.prepare("SELECT value FROM metadata WHERE key='generation'").get()!.value + ':' + account.generation;
    return { generation, initialized: !!account.initialized,
      entries: Object.fromEntries(db.prepare('SELECT key,value FROM account_storage WHERE account_id=? ORDER BY key').all(user.id).map(row => [row.key as string, row.value as string])) };
  };
  const validate: (operations: unknown) => asserts operations is StorageOperation[] = (operations) => {
    if (!Array.isArray(operations) || operations.length > 256) fail(400, 'Invalid operations');
    for (const op of operations as StorageOperation[]) if (!op || !isGameKey(op.key) ||
      !(op.value === null || typeof op.value === 'string') || (op.value?.length || 0) > 2_000_000) fail(400, 'Invalid storage key/value');
  };
  const write = (request: FastifyRequest, input: unknown) => {
    const user = requireUser(request), batch = input as StorageBatch | null;
    if (!batch) fail(400, 'Invalid batch');
    validate(batch!.operations);
    if (typeof batch!.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(batch!.id)) fail(400, 'Invalid batch ID');
    if (batch!.generation !== read(request).generation) fail(409, 'Database đã thay đổi. Vui lòng tải lại trang.');
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!db.prepare('SELECT 1 FROM account_batches WHERE account_id=? AND id=?').get(user.id, batch!.id)) {
        const put = db.prepare('INSERT INTO account_storage VALUES (?,?,?) ON CONFLICT(account_id,key) DO UPDATE SET value=excluded.value');
        const remove = db.prepare('DELETE FROM account_storage WHERE account_id=? AND key=?');
        for (const op of batch!.operations) op.value === null ? remove.run(user.id, op.key) : put.run(user.id, op.key, op.value);
        db.prepare('INSERT INTO account_batches VALUES (?,?)').run(user.id, batch!.id);
        db.prepare('UPDATE accounts SET initialized=1 WHERE id=?').run(user.id);
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const initialize = (request: FastifyRequest, entries: unknown) => {
    requireUser(request);
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) fail(400, 'Invalid entries');
    const operations = Object.entries(entries as Record<string, string>).map(([key, value]) => ({ key, value }));
    validate(operations);
    const state = read(request);
    if (!state.initialized) write(request, { id: randomUUID(), generation: state.generation, operations });
    return read(request);
  };
  return { read, write, initialize };
}
