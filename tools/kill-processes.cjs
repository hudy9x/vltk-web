// Stop this project's development servers, never every Node process on the machine.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
const root = path.resolve(__dirname, '..');

function processes() {
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,stat=,lstart=,command='], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('Không đọc được danh sách process bằng ps.');
  return result.stdout.split('\n').flatMap(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+\s+\S+\s+\d+\s+\S+\s+\d+)\s+(.+)$/);
    if (!match || match[3].startsWith('Z')) return [];
    return [{ pid: +match[1], ppid: +match[2], started: match[4], command: match[5] }];
  });
}

function candidate(command) {
  return /(?:src\/server\/index\.ts|tools\/dev-online\.cjs|vltk-multiplayer-webtransport)/.test(command) ||
    /(?:^|\/)cargo\s+(?:run|watch)\b/.test(command) ||
    /(?:^|[\/\s])(?:npm|pnpm|yarn|bun)(?:\.[cm]?js)?\s+(?:run\s+)?(?:dev(?::[\w-]+)?|start)(?:\s|$)/.test(command);
}

function workingDirectories(pids) {
  if (!pids.length) return new Map();
  const result = spawnSync('lsof', ['-a', '-p', pids.join(','), '-d', 'cwd', '-Fpn'], { encoding: 'utf8' });
  if (result.error) throw new Error('Cần lsof để xác định đúng thư mục dự án trước khi dừng process.');
  // lsof may return 1 when one candidate has already exited; keep other records.
  const directories = new Map();
  let pid;
  for (const line of result.stdout.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n') && pid) directories.set(pid, line.slice(1));
  }
  return directories;
}

function selectTargets(rows, directories, projectRoot, ownPid) {
  const byId = new Map(rows.map(row => [row.pid, row]));
  const protectedIds = new Set();
  for (let pid = ownPid; pid && !protectedIds.has(pid); pid = byId.get(pid)?.ppid) protectedIds.add(pid);
  const targets = new Map();
  for (const row of rows) {
    if (protectedIds.has(row.pid) || !candidate(row.command)) continue;
    const cwd = directories.get(row.pid);
    const inProject = cwd === projectRoot || cwd?.startsWith(projectRoot + path.sep);
    if (!inProject) continue;
    const node = /^(?:\S*\/)?(?:node|nodejs)\s/.test(row.command);
    const entry = /(?:^|\s)(?:\S*\/)?(?:src\/server\/index\.ts|tools\/dev-online\.cjs)(?:\s|$)/.test(row.command);
    const rust = /^(?:\S*\/)?vltk-multiplayer-webtransport(?:\s|$)/.test(row.command);
    const cargo = /^(?:\S*\/)?cargo\s+(?:run|watch)\b/.test(row.command) &&
      (cwd.startsWith(path.join(projectRoot, 'src/server/multiplayer')) || row.command.includes('src/server/multiplayer/webtransport/Cargo.toml'));
    const managerCommand = node ? row.command.replace(/^\S+\s+/, '') : row.command;
    const manager = /^(?:\S*\/)?(?:npm|pnpm|yarn|bun)(?:\.[cm]?js)?\s+(?:run\s+)?(?:dev(?::[\w-]+)?|start)(?:\s|$)/.test(managerCommand);
    if ((node && entry) || rust || cargo || manager) targets.set(row.pid, row);
  }
  // Include helpers such as esbuild and Cargo children, even if their cwd differs.
  let added;
  do {
    added = false;
    for (const row of rows) {
      if (!protectedIds.has(row.pid) && !targets.has(row.pid) && targets.has(row.ppid)) {
        targets.set(row.pid, row); added = true;
      }
    }
  } while (added);
  // Launchers/watchers first so they cannot respawn a child we just stopped.
  return [...targets.values()].sort((a, b) => {
    const depth = row => { let n = 0, seen = new Set(); while (targets.has(row.ppid) && !seen.has(row.pid)) { seen.add(row.pid); n++; row = targets.get(row.ppid); } return n; };
    return depth(a) - depth(b);
  });
}

function remaining(targets) {
  const current = new Map(processes().map(row => [row.pid, row]));
  // A reused PID must never be treated as the process originally selected.
  return targets.filter(row => {
    const live = current.get(row.pid);
    return live && live.started === row.started && live.command === row.command;
  });
}

async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('pnpm kill            Dừng server/watch, Rust multiplayer và process con của dự án.\npnpm kill --dry-run  Chỉ liệt kê PID, không dừng process.');
    return;
  }
  if (args.some(arg => arg !== '--dry-run')) throw new Error('Tham số không hợp lệ. Dùng --help để xem hướng dẫn.');
  if (process.platform === 'win32') throw new Error('Script này hỗ trợ macOS/Linux (ps và lsof).');
  const rows = processes();
  const targets = selectTargets(rows, workingDirectories(rows.filter(row => candidate(row.command)).map(row => row.pid)), root, process.pid);
  if (!targets.length) { console.log('Không có process dev của dự án đang chạy.'); return; }
  console.log(`${args.includes('--dry-run') ? 'Sẽ dừng' : 'Đang dừng'} ${targets.length} process của ${path.basename(root)}: ${targets.map(row => row.pid).join(', ')}`);
  if (args.includes('--dry-run')) return;
  const errors = [];
  function signal(rows, name) {
    for (const row of remaining(rows)) {
      try { process.kill(row.pid, name); }
      catch (error) { if (error.code !== 'ESRCH') errors.push(`PID ${row.pid}: ${error.code}`); }
    }
  }
  signal(targets, 'SIGTERM');
  const deadline = Date.now() + 2000;
  while (remaining(targets).length && Date.now() < deadline) await sleep(100);
  const stubborn = remaining(targets);
  if (stubborn.length) { signal(stubborn, 'SIGKILL'); await sleep(100); }
  const live = remaining(targets);
  if (live.length || errors.length) throw new Error(`Chưa dừng được hết process: ${[...live.map(row => `PID ${row.pid}`), ...errors].join(', ')}`);
  console.log('Đã dừng toàn bộ process dev của dự án. Bạn có thể start lại.');
}

module.exports = { selectTargets };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
