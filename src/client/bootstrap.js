(async function () {
  'use strict';
  // The original game detects offline mode through CHAT_CFG. Never contact its production Supabase.
  Object.defineProperty(window, 'CHAT_CFG', { get: () => ({ url:'', key:'' }), set: () => {}, configurable:false });
  const loading = window.localGameLoading;
  if (!loading) document.getElementById?.('appLoading')?.remove();
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
  status.textContent = 'Đang kết nối máy chủ…'; document.body.appendChild(status);
  // Both storage delivery and authoritative combat must recover before this closes.
  window.localGameConnection=(()=>{
    const failures=new Set();let panel=null,reloadButton=null;
    function set(source,failed){
      if(failed)failures.add(source);else failures.delete(source);
      if(!failures.size){panel?.remove();panel=null;reloadButton=null;return;}
      if(panel)return;
      const style=document.createElement('style');style.textContent=`
@font-face{font-family:DisconnectCharm;src:url('/fonts/charm-bold.ttf') format('truetype');font-weight:700;font-display:swap}
#serverDisconnect{position:fixed;inset:0;z-index:200000;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:radial-gradient(ellipse at center,#20060875 12%,#190204d9 72%,#080102f2)}
#serverDisconnect .disconnect-card{box-sizing:border-box;width:min(480px,100%);padding:42px 28px 32px;text-align:center;border:1px solid #7c3332;border-radius:3px;background:linear-gradient(160deg,#271314f5,#140b0df7 70%);color:#d7bdb0;box-shadow:0 24px 80px #000c}
#serverDisconnect h2{font:700 36px/1.4 DisconnectCharm,Georgia,serif;margin:0 0 18px;color:#e5b4a0;text-shadow:0 2px 16px #ba182e66}
#serverDisconnect p{font:13px/1.9 'IBM Plex Mono',monospace;margin:0 0 25px}
#serverDisconnect button{min-width:168px;min-height:46px;padding:9px 28px;border:1px solid #ab5651;border-radius:3px;background:linear-gradient(#64262b,#3e171e);color:#f0d4bf;font:700 23px/1.3 DisconnectCharm,Georgia,serif;cursor:pointer}
`;document.head?.appendChild(style);
      panel=document.createElement('section');panel.id='serverDisconnect';panel.setAttribute('role','alertdialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','serverDisconnectTitle');
      const card=document.createElement('div');card.className='disconnect-card';const title=document.createElement('h2');title.id='serverDisconnectTitle';title.textContent='Mất kết nối máy chủ';
      const message=document.createElement('p');message.textContent='Kết nối đang bị gián đoạn. Dữ liệu chờ đồng bộ được giữ trên trình duyệt. Bạn có thể tải lại để kết nối lại.';
      const reload=document.createElement('button');reloadButton=reload;reload.id='serverDisconnectReload';reload.textContent='Tải lại';reload.onclick=()=>window.location.reload();
      card.append(title,message,reload);panel.appendChild(card);document.body.appendChild(panel);reload.focus?.();
    }
    window.addEventListener?.('offline',()=>set('network',true));window.addEventListener?.('online',()=>set('network',false));
    window.addEventListener?.('keydown',event=>{if(!panel)return;event.stopImmediatePropagation();if(!['Enter',' '].includes(event.key)){event.preventDefault();reloadButton?.focus();}},true);
    return {set};
  })();
  async function request(url, options) {
    // Storage batches have stable IDs and server-side deduplication, so replay is safe.
    // Other POSTs (registration, initialization, login) must not be retried here.
    const retryable = !options?.method || options.method === 'GET' ||
      (url === '/api/storage' && options.method === 'POST');
    const attempts = retryable ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      let response;
      try {
        response = await fetch(url, { cache:'no-store', ...options, signal:AbortSignal.timeout(10000) });
      } catch (error) {
        if (attempt + 1 < attempts) continue;
        throw new Error(`${url}: ${error.name === 'TimeoutError' ? 'máy chủ phản hồi quá chậm' : error.message}`);
      }
      if (!response.ok) {
        if ([502, 503, 504].includes(response.status) && attempt + 1 < attempts) continue;
        const detail = await response.json().catch(() => ({}));
        throw new Error(`${url}: ${detail.error || `HTTP ${response.status}`}`);
      }
      try { return await response.json(); }
      catch (error) {
        if (error.name === 'SyntaxError') throw new Error(`${url}: phản hồi máy chủ không phải JSON hợp lệ.`);
        if (attempt + 1 < attempts) continue;
        throw new Error(`${url}: ${error.name === 'TimeoutError' ? 'máy chủ phản hồi quá chậm' : error.message}`);
      }
    }
  }
  const post = payload => ({ method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
  async function waitForAccount() {
    status.textContent = 'Đang kiểm tra đăng nhập…';
    loading?.stage(status.textContent);
    const session = await request('/api/auth/session');
    if (session.user) return { user:session.user, signedIn:false };
    status.hidden = true;
    loading?.hide();
    const style = document.createElement('style');
    style.textContent = `#accountGate{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;overflow:auto;padding:24px 16px;background:linear-gradient(#090c10a8,#080b0fe8),url(img/u2/login/bg20a.jpg) center/cover #101512;color:#ecdfc1;font-family:inherit;box-sizing:border-box}
#accountGate *{box-sizing:border-box}#accountGate .account-shell{width:min(100%,390px);text-align:center}#accountGate h1{font-family:serif;letter-spacing:4px;font-size:32px;color:#f3d27a;text-shadow:0 2px 12px #000;margin:0 0 6px}#accountGate .account-tagline{color:#c4b68f;font-size:13px;margin:0 0 28px}
#accountGate form{text-align:left;padding:28px 24px 22px;border:1px solid #8a6a3e;border-radius:10px;background:linear-gradient(145deg,#302315f5,#100f0bf5);box-shadow:0 16px 60px #0008}#accountGate h2{margin:0 0 24px;font-size:20px;color:#f3dfae}#accountGate label{display:block;font-size:13px;color:#d5c6a4;margin:16px 0 8px}#accountGate input{display:block;width:100%;height:46px;padding:10px 12px;background:#080c0c;border:1px solid #685638;border-radius:5px;color:#fff2d5;font:16px inherit;outline:none}#accountGate input:focus{border-color:#e3ba6c;box-shadow:0 0 0 2px #d5ae4f26}#accountGate .account-actions{display:flex;gap:10px;margin-top:24px}#accountGate button{flex:1;padding:12px 6px;border:1px solid #917443;border-radius:5px;background:#272116;color:#ebd6ac;font:inherit;font-size:14px;font-weight:bold;cursor:pointer}#accountGate button.primary{background:linear-gradient(#bd913e,#80591f);border-color:#dfb865;color:#fff6df}#accountGate button:disabled{opacity:.55;cursor:wait}#accountGate .account-message{font-size:13px;color:#ffb4a0;line-height:1.5;min-height:20px;margin:14px 0 0}#accountGate .account-note{font-size:12px;color:#b2a589;line-height:1.7;margin:20px 0 0}`;
    document.head.appendChild(style);
    const screen = document.createElement('div');
    screen.id = 'accountGate';
    screen.innerHTML = `<div class="account-shell"><h1>VÕ LÂM IDLE</h1><p class="account-tagline">Trở lại giang hồ</p><form id="accountForm"><h2>Đăng nhập / Đăng ký</h2><label for="accountUsername">Username</label><input id="accountUsername" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="16" pattern="[a-zA-Z0-9_]{3,16}" placeholder="Tên đăng nhập" required><label for="accountPassword">Password</label><input id="accountPassword" name="password" type="password" autocomplete="current-password" minlength="6" maxlength="64" placeholder="Mật khẩu từ 6 ký tự" required><div class="account-actions"><button class="primary" type="submit">Đăng nhập</button><button type="submit" id="accountRegister">Đăng ký</button></div><p class="account-message" role="status" aria-live="polite"></p><p class="account-note">Username: 3–16 ký tự không dấu, số hoặc _.<br>Đăng ký bằng chính hai ô trên.</p></form></div>`;
    document.body.appendChild(screen);
    const form = screen.querySelector('form');
    const username = screen.querySelector('[name="username"]');
    const password = screen.querySelector('[name="password"]');
    username.focus();
    return new Promise(resolve => {
      let busy = false;
      form.onsubmit = async event => {
        event.preventDefault();
        if (busy || !form.reportValidity()) return;
        busy = true;
        const buttons = [...form.querySelectorAll('button')];
        buttons.forEach(button => { button.disabled = true; });
        const registering = event.submitter?.id === 'accountRegister';
        const message = form.querySelector('.account-message');
        message.textContent = registering ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…';
        try {
          const result = await request('/api/auth/' + (registering ? 'register' : 'login'), post({ username:username.value, password:password.value }));
          password.value = '';
          screen.remove(); style.remove();
          status.hidden = false;
          loading?.stage('Đang tải dữ liệu nhân vật…');
          resolve({ user:result.user, signedIn:true });
        } catch (error) {
          message.textContent = error.message;
          password.focus();
        } finally { busy = false; buttons.forEach(button => { button.disabled = false; }); }
      };
    });
  }
  let queue = [], generation, flushing = null;
  const persist = () => native.set.call(storage, OUTBOX, JSON.stringify({ generation, queue }));
  function flush() {
    if (flushing) return flushing;
    // Navigation callers must await an in-flight autosave as well as a new save.
    flushing = (async () => {
      try {
        while (queue.length) {
          await request('/api/storage', post(queue[0]));
          queue.shift(); persist();
        }
        status.hidden = true;
        window.localGameConnection.set('storage',false);
      } catch (error) {
        status.hidden = true;
        window.localGameConnection.set('storage',true);
      }
    })().finally(() => { flushing = null; });
    return flushing;
  }
  try {
    const config = await request('/api/config');
    Object.defineProperty(window, 'localGameConfig', { value:Object.freeze({ development:config.development === true, gameMasterMode:config.gameMasterMode === 'development' ? 'development' : 'all', onlineProgression:config.onlineProgression === true, progressionFields:Object.freeze(config.progressionFields||[]), combatSandbox:config.development === true && config.combatSandbox === true }), writable:false, configurable:false });
    // Start installation while loading account/storage/scripts, before the sprite burst.
    // A blocked/unsupported worker must never prevent the game from opening.
    if (window.navigator && 'serviceWorker' in window.navigator && location.protocol.startsWith('http')) {
      window.navigator.serviceWorker.register('/sw.js', { updateViaCache:'none' }).catch(() => {});
    }
    const account = await waitForAccount();
    window.localGameAuth = { user:account.user, logout:() => request('/api/auth/logout', post({})) };
    status.textContent = 'Đang tải dữ liệu nhân vật…';
    loading?.stage(status.textContent);
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
    // Resolve existing canonical progression BEFORE game initialization selects a map.
    if(config.onlineProgression&&!config.combatSandbox&&new URLSearchParams(location.search).get('multiplayer')!=='off'){
      await Promise.all([0,1,2].map(async slot=>{
        const key=slot===0?'jxidle':`jxidle_${slot+1}`,raw=storage.getItem(key);
        if(!raw)return;
        const saved=await request('/api/multiplayer/character?slot='+slot+'&existing=1');
        if(!saved.profile)return;
        const wrapper=JSON.parse(raw),legacy=typeof wrapper.d==='string'?JSON.parse(wrapper.d):wrapper;
        for(const field of config.progressionFields||[])if(saved.profile[field]!==undefined)legacy[field]=saved.profile[field];
        native.set.call(storage,key,JSON.stringify(legacy));
      }));
    }
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
    if (account.signedIn || storage.getItem('jxidle_slot') === 'login') {
      storage.setItem('jxidle_slot', 'menu');
      sessionStorage.removeItem('jxidle_in');
      await flush();
    }
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
    status.textContent = 'Đang tải game…';
    const scripts = ['data.js?v=622','setvi.js?v=622','jxlook.js?v=622','app/game.js?v=622'];
    for (const [index, src] of scripts.entries()) {
      loading?.stage(`Đang chuẩn bị game (${index + 1}/${scripts.length})…`);
      await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = src;
        const timer = setTimeout(() => { script.remove(); reject(new Error(`Hết thời gian tải ${src}`)); }, 30000);
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); reject(new Error(`Không tải được ${src}`)); };
        document.body.appendChild(script);
      });
    }
    if (loading && window.localGameAssets) await loading.preload(window.localGameAssets);
    loading?.finish();
    status.hidden = queue.length === 0;
  } catch (error) {
    status.hidden = false; status.textContent = `Không thể mở game: ${error.message} — tải lại trang để thử lại.`;
    loading?.failed(error);
    console.error(error);
  }
})();
