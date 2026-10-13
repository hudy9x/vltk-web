(async function () {
  'use strict';
  // The original game detects offline mode through CHAT_CFG. Never contact its production Supabase.
  Object.defineProperty(window, 'CHAT_CFG', { get: () => ({ url:'', key:'' }), set: () => {}, configurable:false });
  const storage = window.localStorage;
  const native = {
    set: Storage.prototype.setItem, remove: Storage.prototype.removeItem, clear: Storage.prototype.clear
  };
  const OUTBOX = '__volam_sqlite_outbox';
  const managed = key => /^(jxidle(?:$|_)|jx_|jxDev$|jxBanMark$|jxBanWiped_|jxCheat$)/.test(key) && !/^jxidle_(auth|sbvia|hb_)/.test(key);
  const entries = () => Object.fromEntries(Object.keys(storage).filter(managed).map(key => [key, storage.getItem(key)]));
  const status = document.createElement('div');
  status.id = 'sqliteStatus';
  status.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:100001;background:#211b12;color:#efd394;padding:5px 10px;font:12px monospace;border-radius:4px';
  status.textContent = 'Đang đọc SQLite…'; document.body.appendChild(status);
  async function request(url, options) {
    const response = await fetch(url, { cache:'no-store', ...options, signal:AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(response.status === 409 ? 'Database đã reset. Hãy tải lại trang.' : `SQLite HTTP ${response.status}`);
    return response.json();
  }
  const post = payload => ({ method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
  let queue = [], generation, busy = false;
  const persist = () => native.set.call(storage, OUTBOX, JSON.stringify({ generation, queue }));
  async function flush() {
    if (busy) return;
    busy = true;
    try {
      while (queue.length) {
        await request('/api/storage', post(queue[0]));
        queue.shift(); persist();
      }
      status.hidden = true;
    } catch (error) {
      status.hidden = false; status.textContent = `Chưa lưu SQLite: ${error.message}`;
    } finally { busy = false; }
  }
  try {
    const config = await request('/api/config');
    Object.defineProperty(window, 'localGameConfig', { value:Object.freeze({ development:config.development === true, combatSandbox:config.development === true && config.combatSandbox === true }), writable:false, configurable:false });
    let state = await request('/api/storage'); generation = state.generation;
    if (!state.initialized) state = await request('/api/storage/init', post({ entries:entries() }));
    let previous;
    try { previous = JSON.parse(storage.getItem(OUTBOX) || 'null'); } catch {}
    if (previous?.generation === generation && Array.isArray(previous.queue)) queue = previous.queue;
    // Replay writes left by a reload before reading the authoritative database snapshot.
    for (const batch of queue) await request('/api/storage', post(batch));
    queue = []; persist(); state = await request('/api/storage');
    Object.keys(storage).filter(managed).forEach(key => native.remove.call(storage, key));
    Object.entries(state.entries).forEach(([key, value]) => native.set.call(storage, key, value));
    function enqueue(key, value) {
      queue.push({ id:crypto.randomUUID(), generation, operations:[{ key, value }] });
      persist(); void flush();
    }
    Storage.prototype.setItem = function (key, value) {
      native.set.call(this, key, value);
      key = String(key); if (this === storage && managed(key)) enqueue(key, String(value));
    };
    Storage.prototype.removeItem = function (key) {
      native.remove.call(this, key);
      key = String(key); if (this === storage && managed(key)) enqueue(key, null);
    };
    Storage.prototype.clear = function () {
      const keys = this === storage ? Object.keys(storage).filter(managed) : [];
      native.clear.call(this);
      keys.forEach(key => enqueue(key, null));
    };
    window.localGameStorage = { flush, get pending() { return queue.length; } };
    window.addEventListener('online', flush);
    setInterval(flush, 5000);
    // Durable outbox survives navigation. Best-effort delivery also covers closing the tab.
    const sendPending = () => {
      // Only send the head: parallel delivery of later writes could reverse save order.
      for (const batch of queue.slice(0, 1)) {
        const payload = JSON.stringify(batch);
        if (payload.length < 60000) fetch('/api/storage', { ...post(batch), keepalive:true }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) sendPending(); });
    window.addEventListener('pagehide', sendPending);
    for (const src of ['data.js?v=622','setvi.js?v=622','app/game.js?v=622']) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = src;
        script.onload = resolve; script.onerror = () => reject(new Error(`Không tải được ${src}`));
        document.body.appendChild(script);
      });
    }
    status.hidden = true;
  } catch (error) {
    status.hidden = false; status.textContent = `Không thể mở game: ${error.message} — tải lại trang để thử lại.`;
    console.error(error);
  }
})();
