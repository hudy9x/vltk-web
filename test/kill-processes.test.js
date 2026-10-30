const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectTargets } = require('../tools/kill-processes.cjs');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

test('shutdown selects this project server trees and protects unrelated apps and its own ancestors', () => {
  const root = '/workspace/game';
  const rows = [
    { pid: 1, ppid: 0, command: 'shell' },
    { pid: 2, ppid: 1, command: 'pnpm run dev' },
    { pid: 3, ppid: 2, command: '/usr/bin/node --watch src/server/index.ts' },
    { pid: 4, ppid: 3, command: '/usr/bin/node src/server/index.ts' },
    { pid: 5, ppid: 4, command: '/workspace/game/node_modules/esbuild --service' },
    { pid: 6, ppid: 1, command: '/usr/bin/node --watch src/server/index.ts' },
    { pid: 7, ppid: 1, command: '/usr/bin/node mcp-server.js' },
    { pid: 8, ppid: 1, command: '/usr/bin/cargo run --manifest-path src/server/multiplayer/webtransport/Cargo.toml' },
    { pid: 9, ppid: 8, command: 'target/debug/vltk-multiplayer-webtransport' },
    { pid: 10, ppid: 1, command: 'pnpm run dev' },
    { pid: 11, ppid: 10, command: '/usr/bin/node tools/kill-processes.cjs' },
    { pid: 12, ppid: 1, command: '/usr/bin/cargo run' },
    { pid: 13, ppid: 1, command: '/usr/bin/node mcp-server.js --example /workspace/game/target/debug/vltk-multiplayer-webtransport' },
  ];
  const directories = new Map(rows.map(row => [row.pid, root]));
  directories.set(6, '/workspace/game-other');
  directories.set(12, root + '/src/server/multiplayer/webtransport');
  const actual = selectTargets(rows, directories, root, 11).map(row => row.pid);
  assert.deepEqual([...actual].sort((a, b) => a - b), [2, 3, 4, 5, 8, 9, 12]);
  assert.ok(actual.indexOf(2) < actual.indexOf(3));
  assert.ok(actual.indexOf(3) < actual.indexOf(4));
});

test('unknown working directories never authorize stopping a process', () => {
  assert.deepEqual(selectTargets([{ pid: 3, ppid: 1, command: 'node src/server/index.ts' }], new Map(), '/workspace/game', 9), []);
});

test('CLI stops a real server and child, leaves unrelated Node alive, and is safe to repeat', { timeout: 15000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'volam-kill-'));
  const children = [];
  t.after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.mkdir(path.join(root, 'tools'), { recursive: true });
  await fs.mkdir(path.join(root, 'src/server'), { recursive: true });
  await fs.copyFile(path.resolve('tools/kill-processes.cjs'), path.join(root, 'tools/kill-processes.cjs'));
  await fs.writeFile(path.join(root, 'src/server/index.ts'), `const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(child.pid);setInterval(()=>{},1000);`);
  const server = spawn(process.execPath, ['src/server/index.ts'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(server);
  const childPid = Number((await once(server.stdout, 'data'))[0].toString().trim());
  const unrelated = spawn(process.execPath, ['-e', 'console.log("ready");setInterval(()=>{},1000)'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(unrelated);
  await once(unrelated.stdout, 'data');
  async function run(...args) {
    const child = spawn(process.execPath, ['tools/kill-processes.cjs', ...args], { cwd: root });
    children.push(child);
    let stdout = '', stderr = '';
    child.stdout.on('data', bytes => { stdout += bytes; });
    child.stderr.on('data', bytes => { stderr += bytes; });
    const [code] = await once(child, 'close');
    assert.equal(code, 0, stderr);
    return stdout;
  }
  const preview = await run('--dry-run');
  assert.ok(preview.includes(String(server.pid)) && preview.includes(String(childPid)));
  assert.ok(!preview.includes(String(unrelated.pid)));
  assert.match(await run(), /Đã dừng toàn bộ/);
  assert.equal(unrelated.exitCode, null);
  assert.equal(unrelated.signalCode, null);
  assert.match(await run(), /Không có process dev/);
});
