import type { Team } from './battlefield';
/** Acknowledgement is the only exit; keyboard and backdrop cannot dismiss it. */
export function mountBattlefieldResult(acknowledge: () => void) {
  const overlay = document.createElement('section');
  overlay.id = 'battlefield-result'; overlay.hidden = true;
  overlay.setAttribute('role','alertdialog'); overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','battlefield-result-title');
  overlay.setAttribute('aria-describedby','battlefield-result-points');
  overlay.style.cssText='position:fixed;inset:0;z-index:100010;background:#000c;display:grid;place-items:center;padding:20px';
  overlay.innerHTML='<div style="width:min(480px,90vw);box-sizing:border-box;padding:28px;text-align:center;background:#20241b;border:2px solid #b6a36b;border-radius:10px;color:#f3df9e;box-shadow:0 10px 70px #000"><h2 id="battlefield-result-title"></h2><p id="battlefield-result-points"></p><p>Trận Tống Kim đã kết thúc.</p><button id="battlefield-result-accept" type="button" style="padding:10px 32px;background:#465239;border:1px solid #c9b979;color:#fff0c4;font:inherit;cursor:pointer">Đồng ý</button></div>';
  const accept = overlay.querySelector<HTMLButtonElement>('#battlefield-result-accept')!;
  accept.onclick=()=>{ if(overlay.hidden)return; acknowledge(); overlay.hidden=true; };
  document.addEventListener('keydown',event=>{
    if(overlay.hidden)return;
    if(event.key==='Escape'||event.key==='Tab'){event.preventDefault();event.stopImmediatePropagation();accept.focus();}
  },true);
  document.body.appendChild(overlay);
  return {
    open(result: string, points: Record<Team,number>) {
      overlay.querySelector('#battlefield-result-title')!.textContent=result;
      overlay.querySelector('#battlefield-result-points')!.textContent=`Tống: ${points.song.toLocaleString('vi-VN')} quân trạng · Kim: ${points.jin.toLocaleString('vi-VN')} quân trạng`;
      overlay.hidden=false; accept.focus();
    },
    get isOpen(){return !overlay.hidden;},
  };
}
