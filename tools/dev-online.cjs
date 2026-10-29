// Local development only: one parent owns Cargo/Rust and Node's watch process tree.
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const net = require('node:net');
const { setTimeout: sleep } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');
const port = process.env.PORT || '3000';
const control = new URL(`http://${process.env.WT_HTTP_BIND || '127.0.0.1:3104'}`);
if (control.hostname === '0.0.0.0') control.hostname = '127.0.0.1';
if (control.hostname === '[::]') control.hostname = '[::1]';
const env = { ...process.env, NODE_ENV: 'development', PORT: port,
  ONLINE_DEBUG: process.env.ONLINE_DEBUG || '1',
  MULTIPLAYER_SECRET: process.env.MULTIPLAYER_SECRET || randomBytes(32).toString('hex'),
  MULTIPLAYER_WT_CONTROL_URL: control.origin,
  PVE_OUTBOX_FILE: process.env.PVE_OUTBOX_FILE || path.resolve(root,(process.env.DB_PATH || 'database/game.sqlite')+'.online-outbox.jsonl'),
  WT_ORIGINS: process.env.WT_ORIGINS || `http://localhost:${port},http://127.0.0.1:${port}` };
const children = new Set();
const cancelled = new AbortController();
let stopping = false, exitCode = 0;

function signal(child, signalName) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).on('error', () => child.kill());
    } else process.kill(-child.pid, signalName);
  } catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true; exitCode = code; process.exitCode = code; cancelled.abort();
  for (const child of children) signal(child, 'SIGTERM');
  // Watch mode and Cargo may own grandchildren; stop the complete groups on Unix.
  setTimeout(() => {
    for (const child of children) signal(child, 'SIGKILL');
    process.exit(exitCode);
  }, 4000).unref();
}

function launch(command, args) {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', detached: process.platform !== 'win32' });
  children.add(child);
  child.once('error', error => { console.error(`Không chạy được ${command}: ${error.message}`); stop(1); });
  child.once('close', code => {
    children.delete(child);
    if (!stopping) stop(code ?? 1);
    if (!children.size) process.exit(exitCode);
  });
  return child;
}

process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());

function available(host, port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => reject(new Error(`Không thể dùng ${host}:${port}: ${error.message}`)));
    probe.listen(Number(port), host, () => probe.close(resolve));
  });
}

async function main() {
  if (env.MULTIPLAYER_SECRET.length < 32) throw new Error('MULTIPLAYER_SECRET cần ít nhất 32 ký tự.');
  await Promise.all([available(process.env.HOST || '127.0.0.1', port),
    available(control.hostname.replace(/^\[|\]$/g, ''), control.port || '80')]);
  if (stopping) return;
  console.log('Đang bật Rust WebTransport (lần build đầu có thể mất vài phút)…');
  launch('cargo', ['run', '--locked', '--manifest-path', 'src/server/multiplayer/webtransport/Cargo.toml']);
  const deadline = Date.now() + 15 * 60 * 1000;
  while (!stopping) {
    if (Date.now() > deadline) throw new Error('Rust server chưa sẵn sàng sau 15 phút.');
    try {
      const response = await fetch(new URL('/config', control), {
        signal: AbortSignal.any([cancelled.signal, AbortSignal.timeout(1000)]),
      });
      if (response.ok && (await response.json()).protocol === 7) break;
    } catch { /* Cargo may still be building. */ }
    if (!stopping) await sleep(200, undefined, { signal: cancelled.signal }).catch(() => {});
  }
  if (stopping) return;
  console.log(`Rust đã sẵn sàng. Đang bật game tại http://localhost:${port} — Ctrl+C để dừng cả hai.`);
  launch(process.execPath, ['--watch', 'src/server/index.ts']);
}
main().catch(error => { console.error(error.message); stop(1); });
