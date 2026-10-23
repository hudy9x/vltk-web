/* Startup UI and a bounded image loader; ordinary requests retain HTTP/PWA caching. */
(function () {
  'use strict';
  const screen = document.getElementById('appLoading');
  if (!screen) return;
  const label = screen.querySelector('[data-loading-label]');
  const count = screen.querySelector('[data-loading-count]');
  const progress = screen.querySelector('progress');
  const retry = screen.querySelector('button');
  let active = true, running = null;
  document.addEventListener('keydown', event => {
    if (active && !screen.hidden) event.stopImmediatePropagation();
  }, true);
  document.addEventListener('pointerdown', event => {
    if (active && !screen.hidden) event.stopImmediatePropagation();
  }, true);
  const images = /\.(?:png|jpe?g|webp|gif|svg)(?:\?|$)/i;
  function imageUrl(value, base = location.href) {
    try {
      const url = new URL(value, base);
      return url.origin === location.origin && images.test(url.pathname) &&
        /^\/(?:img|fx|ui|app\/maps|app\/npcs)\//.test(url.pathname) ? url.href : null;
    } catch { return null; }
  }
  function commonAssets() {
    const urls = new Set();
    const add = (value, base) => { const url = imageUrl(value, base); if (url) urls.add(url); };
    document.querySelectorAll('img[src]').forEach(image => add(image.getAttribute('src')));
    // Same-origin CSS also includes the currently mounted login/character-selection UI.
    function rules(list, base) {
      for (const rule of list) {
        if (rule.style) for (const match of rule.style.cssText.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) add(match[1], base);
        if (rule.cssRules) rules(rule.cssRules, base);
      }
    }
    for (const sheet of document.styleSheets) {
      try { rules(sheet.cssRules, sheet.href || location.href); } catch { /* Cross-origin styles are outside our asset contract. */ }
    }
    return [...urls];
  }
  function stage(text) {
    active = true;
    screen.hidden = false;
    label.textContent = text;
    count.textContent = '';
    progress.removeAttribute('value');
    retry.hidden = true;
  }
  function failed(error) {
    active = true;
    screen.hidden = false;
    label.textContent = `Không thể tải game: ${error.message}`;
    count.textContent = 'Kiểm tra kết nối rồi thử lại. Dữ liệu nhân vật vẫn được giữ.';
    retry.textContent = 'Tải lại trang';
    retry.hidden = false;
    retry.onclick = () => location.reload();
  }
  async function loadImage(host, url) {
    let timer;
    try {
      await Promise.race([
        (async () => {
          const image = host.imageFor(url);
          await image.decode();
          if (!image.naturalWidth) throw new Error('Ảnh rỗng');
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Hết thời gian tải')), 20000); }),
      ]);
    } catch (error) {
      host.invalidate(url);
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function preload(host) {
    if (running) return running;
    stage('Đang tải tài nguyên…');
    const urls = [...new Set([...commonAssets(), ...host.collect().map(value => imageUrl(value)).filter(Boolean)])];
    // Use the renderer's relative keys so decoded images are reused by the canvas.
    const pending = urls.map(url => new URL(url).pathname.slice(1) + new URL(url).search);
    const total = pending.length;
    let completed = 0;
    const update = () => {
      progress.value = total ? completed / total : 1;
      count.textContent = `${completed}/${total} tài nguyên · ${Math.floor(progress.value * 100)}%`;
    };
    update();
    running = (async () => {
      let remaining = pending;
      do {
        retry.hidden = true;
        label.textContent = 'Đang tải tài nguyên…';
        const errors = [];
        let next = 0;
        async function worker() {
          while (next < remaining.length) {
            const url = remaining[next++];
            try { await loadImage(host, url); completed++; update(); }
            catch { errors.push(url); }
          }
        }
        await Promise.all(Array.from({ length: Math.min(4, remaining.length) }, worker));
        if (!errors.length) break;
        label.textContent = `Chưa tải được ${errors.length} tài nguyên`;
        count.textContent = `${completed}/${total} đã tải. Kiểm tra kết nối và thử lại.`;
        retry.textContent = 'Thử tải lại';
        retry.hidden = false;
        await new Promise(resolve => { retry.onclick = () => { retry.onclick = null; retry.hidden = true; resolve(); }; });
        remaining = errors;
      } while (remaining.length);
    })().finally(() => { running = null; });
    return running;
  }
  window.localGameLoading = {
    get active() { return active; }, stage, preload, failed,
    hide() { screen.hidden = true; },
    finish() { active = false; screen.hidden = true; retry.onclick = null; },
  };
})();
