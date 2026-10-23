/** Read the match's respawn deadline rather than starting a separate UI timer. */
export function mountRespawnCountdown() {
  const notice = document.createElement('div');
  notice.id = 'battlefield-respawn-countdown';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.setAttribute('aria-atomic', 'true');
  notice.style.cssText = 'position:fixed;bottom:clamp(110px,18vh,200px);left:50%;transform:translateX(-50%);max-width:90vw;box-sizing:border-box;padding:12px 24px;border:1px solid #b29455;border-radius:6px;background:#181c16ed;color:#ffe1a0;font:700 clamp(24px,4vw,46px)/1.5 WarCalligraphy,cursive;text-align:center;text-shadow:0 2px 3px #000,0 0 12px #000,0 0 24px #9b3a12;z-index:95020;pointer-events:none';
  notice.hidden = true;
  document.body.appendChild(notice);
  function reset() { notice.hidden = true; notice.textContent = ''; }
  return {
    render(running: boolean, remaining: number) {
      if (!running || !Number.isFinite(remaining) || remaining <= 1e-9) { reset(); return; }
      const message = `Rời doanh trại sau ${Math.ceil(remaining - 1e-9)} giây`;
      if (notice.textContent !== message) notice.textContent = message;
      notice.hidden = false;
    },
    reset,
  };
}
