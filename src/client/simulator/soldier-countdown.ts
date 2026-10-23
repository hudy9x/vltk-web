/** Match-time countdown: its final frame is the same tick that spawns the NPCs. */
export function mountSoldierCountdown() {
  const notice = document.createElement('div');
  notice.id = 'battlefield-soldier-countdown';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.setAttribute('aria-atomic', 'true');
  notice.style.cssText = "position:fixed;top:clamp(64px,12vh,140px);left:50%;transform:translateX(-50%);width:min(92vw,900px);z-index:95020;pointer-events:none;text-align:center;color:#ffe1a0;font:700 clamp(24px,4vw,46px)/1.5 WarCalligraphy,cursive;text-shadow:0 2px 3px #000,0 0 12px #000,0 0 24px #9b3a12";
  notice.hidden = true;
  document.body.appendChild(notice);
  function reset() { notice.hidden = true; notice.textContent = ''; }
  return {
    render(running: boolean, remaining: number, count: number) {
      if (!running || remaining <= 1e-9 || count === 0) { reset(); return; }
      const message = `Binh sĩ xuất hiện sau ${Math.ceil(remaining - 1e-9)} giây`;
      if (notice.textContent !== message) notice.textContent = message;
      notice.hidden = false;
    },
    reset,
  };
}
