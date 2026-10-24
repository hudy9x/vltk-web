import type { Team } from './battlefield';
import { TEAM_NAMES } from './battlefield';

function mountResultStyle() {
  if(document.getElementById('war-result-style'))return;
  const style=document.createElement('style');style.id='war-result-style';
  style.textContent=`
@font-face{font-family:WarResultCharm;src:url('fonts/charm-bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}
#battlefield-result{position:fixed;inset:0;z-index:100010;background:#090b08c9;display:grid;place-items:center;padding:20px;box-sizing:border-box;overflow:auto;animation:war-result-shade .8s ease-out both}
#battlefield-result[hidden],#battlefield-result [hidden]{display:none!important}
#battlefield-result .war-result-card{width:min(580px,100%);max-height:calc(100dvh - 40px);text-align:center;color:#e8dfbf;font:14px 'IBM Plex Mono',monospace;animation:war-result-reveal .95s cubic-bezier(.16,1,.3,1) .3s both}
#battlefield-result .war-result-body{padding:0 20px;text-align:center}
#battlefield-result .war-result-badge{width:300px;aspect-ratio:1;height:auto;max-width:100%;margin:0 auto 4px;background:url('img/tong-kim/result-badges.png') left center/200% 100% no-repeat;filter:drop-shadow(0 12px 25px #000b);animation:war-result-emblem 1.2s cubic-bezier(.16,1,.3,1) .3s both}
#battlefield-result [data-outcome=loss] .war-result-badge{background-position:right center}
#battlefield-result #battlefield-result-title{display:block;text-align:center;border:0;padding:0;font:700 clamp(40px,6vw,58px)/1.35 WarResultCharm,Georgia,serif;letter-spacing:.025em;color:#ebd186;margin:-4px 0 4px;text-shadow:0 3px 18px #000,0 1px 2px #000}
#battlefield-result [data-outcome=loss] #battlefield-result-title{color:#d4aaa0}
#battlefield-result [data-outcome=draw] #battlefield-result-title{color:#d4d6c9}
#battlefield-result .war-result-card p{font-size:12px;line-height:1.6;margin:0;color:#b8b9a8;text-shadow:0 2px 6px #000}
#battlefield-result #battlefield-result-reason{color:#d3c9aa;margin-top:5px}
#battlefield-result .war-result-scores{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px auto 0;max-width:420px;text-align:center}
#battlefield-result .war-result-score{padding:10px 8px;min-width:0;border-top:1px solid #77715755}
#battlefield-result .war-result-score[data-winner=true]{border-color:#c7af6f}
#battlefield-result .war-result-team{font-size:12px;display:flex;justify-content:center;gap:10px;color:#ebcf72}
#battlefield-result .war-result-team.jin{color:#c9a7e1}
#battlefield-result .war-result-number{display:block;font-size:26px;line-height:1.4;font-variant-numeric:tabular-nums;color:#ece1bb;margin:6px 0 1px;font-weight:500;text-shadow:0 3px 10px #000}
#battlefield-result .war-result-score small{font-size:10px;color:#9da38d}
#battlefield-result .war-result-note{padding-top:10px}
#battlefield-result .war-result-actions{padding:20px 0 0;display:flex;justify-content:center}
#battlefield-result .war-result-actions button{min-width:160px;padding:10px 28px;background:#303629d9;border:1px solid #99895a;border-radius:4px;color:#f1e1ae;font:inherit;cursor:pointer;box-shadow:0 5px 25px #0007}
#battlefield-result .war-result-actions button:hover{background:#4a533c;border-color:#c7b579}
#battlefield-result .war-result-actions button:focus-visible{outline:2px solid #e0ca7f;outline-offset:3px}
#battlefield-result .war-result-accessible{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@keyframes war-result-shade{from{background:#090b0800}to{background:#090b08c9}}
@keyframes war-result-reveal{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes war-result-emblem{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
@media(max-width:420px){#battlefield-result{padding:16px}#battlefield-result .war-result-body{padding:0 8px}#battlefield-result .war-result-badge{width:280px;height:auto}#battlefield-result .war-result-number{font-size:22px}#battlefield-result .war-result-scores{gap:18px}}
@media(max-height:700px){#battlefield-result .war-result-card{max-height:none}#battlefield-result{align-items:start}#battlefield-result .war-result-badge{width:280px;height:auto}}
@media(prefers-reduced-motion:reduce){#battlefield-result,#battlefield-result .war-result-card,#battlefield-result .war-result-badge{animation:none}}
`;
  document.head.appendChild(style);
}

/** Acknowledgement is the only exit; keyboard and backdrop cannot dismiss it. */
export function mountBattlefieldResult(acknowledge: () => void) {
  mountResultStyle();
  const overlay = document.createElement('section');
  overlay.id = 'battlefield-result'; overlay.hidden = true;
  overlay.setAttribute('role','alertdialog'); overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','battlefield-result-title');
  overlay.setAttribute('aria-describedby','battlefield-result-points');
  overlay.innerHTML=`<div class="war-result-card" data-outcome="draw">
    <div class="war-result-body">
      <div class="war-result-badge" id="battlefield-result-badge" aria-hidden="true"></div>
      <h3 id="battlefield-result-title"></h3>
      <p id="battlefield-result-team"></p><p id="battlefield-result-reason"></p>
      <p class="war-result-accessible" id="battlefield-result-points"></p>
      <div class="war-result-scores" aria-hidden="true">
        <div class="war-result-score" id="battlefield-result-song"><div class="war-result-team">Tống <span id="battlefield-result-song-tag"></span></div><b class="war-result-number" id="battlefield-result-song-points"></b><small>quân trạng</small></div>
        <div class="war-result-score" id="battlefield-result-jin"><div class="war-result-team jin">Kim <span id="battlefield-result-jin-tag"></span></div><b class="war-result-number" id="battlefield-result-jin-points"></b><small>quân trạng</small></div>
      </div>
      <p class="war-result-note">Trận đấu đã kết thúc. Xác nhận để rời chiến trường.</p>
    </div>
    <footer class="war-result-actions"><button id="battlefield-result-accept" type="button">Đồng ý</button></footer>
  </div>`;
  const accept = overlay.querySelector<HTMLButtonElement>('#battlefield-result-accept')!;
  accept.onclick=()=>{ if(overlay.hidden)return; acknowledge(); overlay.hidden=true; };
  document.addEventListener('keydown',event=>{
    if(overlay.hidden)return;
    event.stopImmediatePropagation();
    if(event.key!=='Enter'){event.preventDefault();accept.focus();}
  },true);
  document.body.appendChild(overlay);
  return {
    open(result: string, points: Record<Team,number>, playerTeam: Team = 'song') {
      const winner:Team|null=result.startsWith('Tống thắng')?'song':result.startsWith('Kim thắng')?'jin':null;
      const outcome=winner ? winner===playerTeam?'win':'loss' : 'draw';
      overlay.querySelector('.war-result-card')!.setAttribute('data-outcome',outcome);
      overlay.querySelector<HTMLElement>('#battlefield-result-badge')!.hidden=outcome==='draw';
      overlay.querySelector('#battlefield-result-title')!.textContent=outcome==='win'?'Chiến thắng':outcome==='loss'?'Thất bại':'Hòa trận';
      overlay.querySelector('#battlefield-result-team')!.textContent=`Bạn thuộc phe ${TEAM_NAMES[playerTeam]}`;
      overlay.querySelector('#battlefield-result-reason')!.textContent=result;
      overlay.querySelector('#battlefield-result-points')!.textContent=`Tống: ${points.song.toLocaleString('vi-VN')} quân trạng · Kim: ${points.jin.toLocaleString('vi-VN')} quân trạng`;
      for(const side of ['song','jin'] as const) {
        overlay.querySelector(`#battlefield-result-${side}`)!.setAttribute('data-winner',String(side===winner));
        overlay.querySelector(`#battlefield-result-${side}-points`)!.textContent=points[side].toLocaleString('vi-VN');
        overlay.querySelector(`#battlefield-result-${side}-tag`)!.textContent=side===playerTeam?'Bạn':side===winner?'Thắng':'';
      }
      overlay.hidden=false; accept.focus();
    },
    get isOpen(){return !overlay.hidden;},
  };
}
