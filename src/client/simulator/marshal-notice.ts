import { TEAM_NAMES } from './battlefield';
import type { Team } from './battlefield';

export const MARSHAL_NOTICE_SECONDS = 6;
/** Screen-space announcement, visible only to the opposing army. */
export function mountMarshalNotice() {
  const style = document.createElement('style');
  style.textContent = `@font-face{font-family:WarCalligraphy;src:url('/fonts/charm-bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}`;
  document.head.appendChild(style);
  const notice = document.createElement('div');
  notice.id = 'battlefield-marshal-notice';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.setAttribute('aria-atomic', 'true');
  notice.style.cssText = "position:fixed;top:clamp(64px,12vh,140px);left:50%;transform:translateX(-50%);width:min(92vw,900px);z-index:95020;pointer-events:none;text-align:center;color:#ffe1a0;font:700 clamp(24px,4vw,46px)/1.5 WarCalligraphy,cursive;text-shadow:0 2px 3px #000,0 0 12px #000,0 0 24px #9b3a12";
  notice.hidden = true;
  document.body.appendChild(notice);
  void document.fonts?.load('700 32px WarCalligraphy');
  let remaining = 0;
  function reset() { remaining = 0; notice.hidden = true; notice.textContent = ''; }
  return {
    show(side: Team, viewer: Team) {
      if (side === viewer) return;
      notice.textContent = `Nguyên soái phe ${TEAM_NAMES[side]} xuất hiện`;
      remaining = MARSHAL_NOTICE_SECONDS;
      notice.hidden = false;
    },
    tick(dt: number, running: boolean) {
      if (!running) { reset(); return; }
      if (!Number.isFinite(dt) || dt <= 0) return;
      remaining = Math.max(0, remaining - dt);
      if (remaining === 0) reset();
    },
    reset,
  };
}
