// Transport-independent display and mouse input. No gameplay/save imports.
const WIDTH = 1200, HEIGHT = 760;
const COLORS = ['#476b70', '#8c5b4e', '#72608a', '#6b7950', '#a57b44', '#506a91', '#925b75', '#5b8170'];

export function startDemo({ kind, connect }) {
  const serverParam = new URLSearchParams(location.search).get('server');
  // An explicit HTTPS base keeps the local UI but moves both config and gameplay to the VPS.
  let remoteBase = null;
  let remoteError = null;
  if (serverParam) {
    try {
      remoteBase = new URL(serverParam);
      if (remoteBase.protocol !== 'https:' || remoteBase.username || remoteBase.password || remoteBase.search || remoteBase.hash) {
        throw new Error('Địa chỉ server cần là HTTPS, không chứa tài khoản, query hoặc fragment.');
      }
      if (!remoteBase.pathname.endsWith('/')) remoteBase.pathname += '/';
    } catch (error) { remoteError = error; }
  }
  const isWT = kind === 'webtransport';
  const title = isWT ? 'WebTransport' : 'WebSocket';
  document.querySelector('#demo').innerHTML = `
    <main class="shell">
      <header class="masthead">
        <div class="brand"><div class="seal" aria-hidden="true">武</div><div><div class="brand-name">VÕ LÂM</div><small>MULTIPLAYER PLAYGROUND</small></div></div>
        <nav class="tabs" aria-label="Chọn cơ chế kết nối"><a id="tab-ws" ${!isWT ? 'aria-current="page"' : ''}>01 · WebSocket</a><a id="tab-wt" ${isWT ? 'aria-current="page"' : ''}>02 · WebTransport</a></nav>
      </header>
      <div class="heading"><div><p class="eyebrow">Thử nghiệm kết nối / ${isWT ? '02' : '01'}</p><h1>Cùng một sân. Nhiều người chơi.</h1><p class="subtitle">Mở thêm tab để gặp nhau. Bấm chuột trái vào sân để di chuyển.</p></div><span class="badge">${title} · ${isWT ? 'QUIC / UDP' : 'TCP'}</span></div>
      <div class="workspace">
        <section class="arena" aria-label="Sân chơi"><div class="arena-head"><strong>Sân luyện võ</strong><span id="capacity">0 / 8 người chơi</span></div><div class="stage"><canvas id="world" width="1200" height="760" aria-label="Bấm chuột trái vào vị trí muốn di chuyển"></canvas><div class="hint">CHUỘT TRÁI → ĐIỂM ĐẾN &nbsp; · &nbsp; CHỈ NHẬN ĐIỀU KHIỂN BẰNG CHUỘT</div></div></section>
        <aside class="sidebar"><p class="section-label">Kết nối trực tiếp</p><div class="connection" id="connection" data-state="connecting"><span class="dot"></span><span id="status" role="status" aria-live="polite">Đang kết nối…</span></div><p id="detail">Đang mở phiên với server Rust.</p><button id="reconnect" type="button">Kết nối lại</button>
          <div class="stats"><div class="stat"><span>Ping · RTT</span><output id="ping">— ms</output></div><div class="stat"><span>Snapshot nhận</span><output id="rate">0 / s</output></div><div class="stat"><span>Server tick</span><output id="tick">20 Hz</output></div><div class="stat"><span>Hiển thị</span><output id="fps">— FPS</output></div></div>
          <p class="section-label">Đang trên sân</p><div id="roster" class="roster"><span class="empty">Chưa có người chơi.</span></div>
          <div class="notes"><strong>Nhân vật có vòng vàng là bạn.</strong><br>Server quyết định vị trí và tốc độ.<br>Hai cơ chế có phòng chơi riêng.</div>
        </aside>
      </div>
      <footer class="footer"><span><strong>Rust authoritative server</strong> · 220 px/s · Sân 1.200 × 760</span><span>${isWT ? 'Khởi tạo: reliable stream · Di chuyển & snapshot: datagram' : 'Khởi tạo, di chuyển & snapshot: WebSocket'}</span></footer>
    </main>`;
  const $ = selector => document.querySelector(selector);
  const canvas = $('#world'), ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * dpr; canvas.height = HEIGHT * dpr;
  ctx.scale(dpr, dpr);
  const background = makeBackground();
  let epoch = 0, link = null, me = null, seq = 0, lastTick = -1, pending = null;
  let online = false, lastSnapshot = 0, connectedAt = 0, click = null;
  let received = 0, frames = 0, lastStats = performance.now(), lastFrame = performance.now(), rosterAt = 0;
  let players = new Map();

  function state(status, detail, mode) {
    $('#status').textContent = status;
    $('#detail').textContent = detail;
    $('#connection').dataset.state = mode;
    canvas.dataset.connected = String(mode === 'online');
  }

  function reset() {
    online = false; me = null; seq = 0; lastTick = -1; pending = null; click = null;
    players.clear(); received = 0; lastSnapshot = 0;
    $('#ping').textContent = '— ms'; $('#rate').textContent = '0 / s';
    renderRoster();
  }

  function fail(version, error) {
    if (version !== epoch) return;
    epoch++;
    link?.close(); link = null;
    reset();
    $('#reconnect').disabled = false;
    state('Chưa kết nối', error?.message || String(error), 'error');
  }

  function receive(version, data) {
    if (version !== epoch) return;
    if (data.type === 'error') { fail(version, new Error(data.message)); return; }
    if (data.type === 'welcome') {
      me = data.id; online = true;
      lastSnapshot = performance.now();
      $('#tick').textContent = `${data.tickHz} Hz`;
      $('#reconnect').disabled = false;
      state('Đã kết nối', `${remoteBase ? `VPS · ${remoteBase.host}. ` : ''}Bạn là lữ khách #${me}. Bấm vào sân để bắt đầu.`, 'online');
    }
    if (data.type === 'pong') {
      const rtt = Date.now() - data.nonce;
      if (rtt >= 0 && rtt < 15000) $('#ping').textContent = `${Math.round(rtt)} ms`;
    }
    if (data.type !== 'snapshot' || !online || data.tick <= lastTick) return;
    lastTick = data.tick; lastSnapshot = performance.now(); received++;
    const next = new Map();
    for (const p of data.players) {
      const old = players.get(p.id);
      next.set(p.id, { ...p, rx: old?.rx ?? p.x, ry: old?.ry ?? p.y, face: old?.face ?? 1 });
      if (p.id === me && pending && p.ack >= pending.seq) pending = null;
    }
    players = next;
    canvas.dataset.tick = String(lastTick);
  }

  async function begin() {
    const version = ++epoch;
    link?.close(); link = null; reset();
    $('#reconnect').disabled = true;
    connectedAt = performance.now();
    state('Đang kết nối…', 'Đang mở phiên với server Rust.', 'connecting');
    try {
      if (remoteError) throw remoteError;
      const configUrl = remoteBase ? new URL(`${kind}/config`, remoteBase) : '/config';
      const response = await fetch(configUrl, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Không tải được cấu hình demo.');
      const config = await response.json();
      if (config.transport !== kind) throw new Error('Trang này không thuộc server đang chạy. Chọn đúng cổng của demo.');
      for (const [id, transport] of [['#tab-ws', 'websocket'], ['#tab-wt', 'webtransport']]) {
        const url = new URL(`/${transport}/`, location.href);
        if (transport !== kind) url.port = config.otherPort;
        if (remoteBase) url.searchParams.set('server', remoteBase.href);
        $(id).href = url.href;
      }
      const connection = await connect({ config, message: data => receive(version, data), closed: error => fail(version, error) });
      if (version !== epoch) { connection.close(); return; }
      link = connection;
    } catch (error) { fail(version, error); }
  }

  function send(value) {
    if (!link || !online) return;
    const version = epoch;
    try { Promise.resolve(link.send(value)).catch(error => fail(version, error)); }
    catch (error) { fail(version, error); }
  }

  // Mouse-only: keyboard, right clicks and touch do not create movement commands.
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !online) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(28, Math.min(WIDTH - 28, (event.clientX - rect.left) * WIDTH / rect.width));
    const y = Math.max(28, Math.min(HEIGHT - 28, (event.clientY - rect.top) * HEIGHT / rect.height));
    pending = { type: 'move', seq: ++seq, x, y };
    click = { x, y, at: performance.now() };
    send(pending);
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  $('#reconnect').addEventListener('click', begin);
  // Repeat the newest destination until acknowledged; lost datagrams cannot swallow a click.
  const resend = setInterval(() => { if (pending) send(pending); }, 100);
  const ping = setInterval(() => send({ type: 'ping', nonce: Date.now() }), 1000);
  const watchdog = setInterval(() => {
    if (online && performance.now() - lastSnapshot > 5000) fail(epoch, new Error('Không nhận được trạng thái trong 5 giây. Hãy kết nối lại.'));
    else if (!online && $('#reconnect').disabled && performance.now() - connectedAt > 10000) fail(epoch, new Error('Hết thời gian vào phòng chơi.'));
  }, 500);
  window.addEventListener('pagehide', () => {
    epoch++; online = false; link?.close();
    clearInterval(resend); clearInterval(ping); clearInterval(watchdog);
  }, { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

  function renderRoster() {
    $('#capacity').textContent = `${players.size} / 8 người chơi`;
    const roster = $('#roster');
    const visible = new Set();
    roster.querySelector('.empty')?.remove();
    for (const p of players.values()) {
      visible.add(String(p.id));
      let row = roster.querySelector(`[data-player="${p.id}"]`);
      if (!row) {
        row = document.createElement('div'); row.className = 'roster-row'; row.dataset.player = p.id;
        row.innerHTML = `<span class="avatar" style="--color:${COLORS[(p.id - 1) % COLORS.length]}">侠</span><div><div class="roster-name">Lữ khách #${p.id}${p.id === me ? '<span class="you">BẠN</span>' : ''}</div><div class="roster-coords"></div></div>`;
        roster.appendChild(row);
      }
      row.dataset.x = p.x; row.dataset.y = p.y; row.dataset.ack = p.ack;
      row.dataset.me = String(p.id === me);
      row.querySelector('.roster-coords').textContent = `X ${Math.round(p.x)} · Y ${Math.round(p.y)}`;
    }
    for (const row of roster.querySelectorAll('[data-player]')) if (!visible.has(row.dataset.player)) row.remove();
    if (!players.size) roster.innerHTML = '<span class="empty">Đang chờ người chơi vào sân.</span>';
  }

  function render(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.1); lastFrame = now; frames++;
    ctx.drawImage(background, 0, 0);
    if (click && online) {
      const age = (now - click.at) / 1000;
      if (age < 2) {
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 2); ctx.strokeStyle = '#4e6854'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(click.x, click.y, 16 + Math.min(age * 9, 12), 8 + Math.min(age * 4, 6), 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(click.x - 5, click.y); ctx.lineTo(click.x + 5, click.y); ctx.moveTo(click.x, click.y - 5); ctx.lineTo(click.x, click.y + 5); ctx.stroke(); ctx.restore();
      }
    }
    const sorted = [...players.values()].sort((a, b) => a.ry - b.ry);
    for (const p of sorted) {
      const moving = Math.hypot(p.x - p.rx, p.y - p.ry) > 0.4;
      if (Math.abs(p.x - p.rx) > 0.3) p.face = p.x >= p.rx ? 1 : -1;
      const factor = 1 - Math.exp(-18 * dt);
      p.rx += (p.x - p.rx) * factor; p.ry += (p.y - p.ry) * factor;
      drawCharacter(ctx, p, p.id === me, moving ? now / 1000 : 0);
    }
    if (now - rosterAt > 100) { renderRoster(); rosterAt = now; }
    if (now - lastStats >= 1000) {
      const seconds = (now - lastStats) / 1000;
      $('#rate').textContent = `${Math.round(received / seconds)} / s`;
      $('#fps').textContent = `${Math.round(frames / seconds)} FPS`;
      received = 0; frames = 0; lastStats = now;
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  void begin();
}

function makeBackground() {
  const surface = document.createElement('canvas'); surface.width = WIDTH; surface.height = HEIGHT;
  const c = surface.getContext('2d');
  c.fillStyle = '#aeb39b'; c.fillRect(0, 0, WIDTH, HEIGHT);
  // Deterministic courtyard; decorative marks do not introduce hidden obstacles.
  c.fillStyle = '#c0c0aa'; c.fillRect(32, 32, WIDTH - 64, HEIGHT - 64);
  for (let y = 32; y < HEIGHT - 32; y += 48) {
    for (let x = 32; x < WIDTH - 32; x += 64) {
      const n = Math.sin(x * 17 + y * 31);
      c.fillStyle = n > 0.4 ? '#c5c4ae' : n < -0.4 ? '#babda7' : '#bfc1ab';
      c.fillRect(x + 1, y + 1, 62, 46);
      c.strokeStyle = '#adb39e'; c.lineWidth = .7; c.strokeRect(x, y, 64, 48);
    }
  }
  c.strokeStyle = '#a6af94'; c.lineWidth = 2;
  c.strokeRect(47, 47, WIDTH - 94, HEIGHT - 94);
  c.beginPath(); c.ellipse(WIDTH / 2, HEIGHT / 2, 160, 107, 0, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.ellipse(WIDTH / 2, HEIGHT / 2, 147, 98, 0, 0, Math.PI * 2); c.stroke();
  c.save(); c.translate(WIDTH / 2, HEIGHT / 2); c.scale(1, .7);
  c.fillStyle = '#aab198'; c.font = '105px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('武', 0, 0); c.restore();
  c.fillStyle = '#7c8c6c';
  for (let i = 0; i < 140; i++) {
    const x = (i * 173 + 11) % WIDTH, y = (i * 277 + 7) % HEIGHT;
    if (x > 27 && x < WIDTH - 27 && y > 27 && y < HEIGHT - 27) continue;
    c.fillRect(x, y, 3, 6); c.fillRect(x + 4, y + 2, 2, 4);
  }
  return surface;
}

function drawCharacter(c, p, mine, time) {
  const bob = time ? Math.sin(time * 17) * 1.5 : 0;
  const stride = time ? Math.sin(time * 17) * 4 : 0;
  const color = COLORS[(p.id - 1) % COLORS.length];
  c.save(); c.translate(p.rx, p.ry);
  c.fillStyle = '#26392d35'; c.beginPath(); c.ellipse(0, 0, 17, 7, 0, 0, Math.PI * 2); c.fill();
  if (mine) { c.strokeStyle = '#f1d17e'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, 23, 12, 0, 0, Math.PI * 2); c.stroke(); }
  c.save(); c.scale(p.face, 1); c.translate(0, bob);
  c.strokeStyle = '#394540'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-5, -10); c.lineTo(-6 + stride, -2); c.moveTo(5, -10); c.lineTo(6 - stride, -2); c.stroke();
  c.strokeStyle = '#565e53'; c.lineWidth = 3; c.beginPath(); c.moveTo(-11, -15); c.lineTo(12, -41); c.stroke();
  c.strokeStyle = '#dedec8'; c.lineWidth = 2; c.beginPath(); c.moveTo(-11, -15); c.lineTo(7, -35); c.stroke();
  c.fillStyle = color; c.strokeStyle = '#35483e'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-7, -31); c.lineTo(7, -31); c.lineTo(12, -10); c.quadraticCurveTo(0, -5, -12, -10); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#c9b687'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-7, -19); c.lineTo(8, -19); c.stroke();
  c.strokeStyle = color; c.lineWidth = 6; c.beginPath(); c.moveTo(-7, -29); c.lineTo(-13, -19 + stride / 2); c.moveTo(7, -29); c.lineTo(13, -20 - stride / 2); c.stroke();
  c.fillStyle = '#d5b18a'; c.beginPath(); c.arc(0, -37, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#303c36'; c.beginPath(); c.ellipse(-1, -41, 8, 5, -.1, Math.PI, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(-3, -48, 3.5, 0, Math.PI * 2); c.fill();
  c.fillRect(-8, -42, 4, 9); c.fillStyle = '#353b32'; c.fillRect(4, -38, 1.5, 1.5);
  c.restore();
  c.font = `${mine ? '600' : '400'} 11px ui-sans-serif, sans-serif`; c.textAlign = 'center';
  const label = mine ? `Bạn · #${p.id}` : `Lữ khách #${p.id}`;
  const width = c.measureText(label).width + 14;
  c.fillStyle = '#24372ce6'; c.fillRect(-width / 2, -73, width, 19);
  c.fillStyle = mine ? '#ffe5a1' : '#edf0de'; c.fillText(label, 0, -60);
  c.restore();
}
