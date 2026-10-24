import { INSPECTION_TABS } from './inspection';
import type { InspectionTab } from './inspection';
import { WAR_RANKS, warRank } from './war-rewards';
import type { createBattlefield } from './battlefield';
import { TEAM_NAMES } from './battlefield';
import { battlefieldTitleColor } from './presentation';
import { mountWarDialogStyle } from "./dialog-style";
export interface WarStanding {
  id: string;
  name: string;
  team: string;
  points: number;
  soldierKills?: number;
  title: string;
  player: boolean;
  position: number;
}
export function buildWarStandings(
  entries: Omit<WarStanding, "position">[],
): WarStanding[] {
  return [...entries]
    .sort(
      (first, second) =>
        second.points - first.points ||
        first.name.localeCompare(second.name, "vi") ||
        first.id.localeCompare(second.id),
    )
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}
/** Keep the player's own row visible even when they are outside the top ten. */
export function mountWarLeaderboard(
  standings: () => WarStanding[],
  escape: (text: string) => string,
  totals?: () => {song:number; jin:number},
  match?: () => ReturnType<typeof createBattlefield>["state"],
  inspect?: (id:string,tab:InspectionTab)=>string|null,
) {
  mountWarDialogStyle();
  const panel = document.createElement("section");
  panel.className = "war-dialog";
  panel.id = "war-leaderboard";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Bảng xếp hạng Tống Kim");
  panel.innerHTML =
    '<header><h2>Bảng xếp hạng · Tống Kim</h2><button class="war-close" aria-label="Đóng bảng xếp hạng">×</button></header><div class="war-content" id="war-ranking-content"><p id="war-match-status"></p><p id="war-team-totals"></p><p id="war-personal-rank"></p><p id="war-personal-bonus"></p><table><thead><tr><th>Hạng</th><th>Nhân vật</th><th>Phe</th><th>Danh hiệu</th><th>Binh sĩ hạ</th><th>Điểm</th></tr></thead><tbody></tbody></table><p>Top 10 quân trạng · Esc để đóng</p><details><summary>Mốc quân hàm và chỉ số thưởng (tối đa 20%)</summary><div id="war-rank-guide"></div><p>Thưởng theo quân hàm hiện tại, không cộng dồn. Kháng tăng theo tỷ lệ trên giá trị dương hiện có; 50% kháng → 60% ở Đại tướng. Giữ thưởng qua hồi sinh, hết hiệu lực khi rời trận. Boss doanh trại mang danh hiệu Nguyên soái.</p></details></div>';
  panel.innerHTML += '<section id="war-sim-inspector" hidden aria-label="Thông tin SIM">'+ '<div class="war-content"><button type="button" id="war-inspect-back">← Bảng xếp hạng</button><h3 id="war-inspect-name"></h3></div><div class="war-tabs" role="tablist" aria-label="Thông tin SIM">'+
    Object.entries(INSPECTION_TABS).map(([tab,name])=>`<button type="button" id="war-inspect-tab-${tab}" role="tab" aria-controls="war-inspect-content" data-inspect-tab="${tab}" aria-selected="false">${name}</button>`).join('')+
    '</div><div class="war-content" id="war-inspect-content" role="tabpanel"></div></section>';
  const inspector=panel.querySelector<HTMLElement>('#war-sim-inspector')!;
  inspector.hidden=true;
  let selectedId:string|null=null;
  const back = () => {
    selectedId=null;inspector.hidden=true;panel.querySelector<HTMLElement>('#war-ranking-content')!.hidden=false;render();
  };
  inspector.querySelector<HTMLButtonElement>('#war-inspect-back')!.onclick=back;
  function inspectTab(tab:InspectionTab) {
    if(!selectedId)return;
    inspector.querySelector('#war-inspect-content')!.innerHTML=inspect?.(selectedId,tab) || '<p>SIM không còn trên chiến trường.</p>';
    inspector.querySelector('#war-inspect-content')!.setAttribute('aria-labelledby',`war-inspect-tab-${tab}`);
    for(const key of Object.keys(INSPECTION_TABS)) inspector.querySelector(`[data-inspect-tab="${key}"]`)!.setAttribute('aria-selected',String(key===tab));
  }
  panel.addEventListener('click',event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if(!button)return;
    const tab=button.dataset.inspectTab;
    if(tab && Object.prototype.hasOwnProperty.call(INSPECTION_TABS,tab)) {inspectTab(tab as InspectionTab);return;}
    const id=button.dataset.inspectId;
    if(!id || !inspect)return;
    selectedId=id;
    inspector.querySelector('#war-inspect-name')!.textContent=standings().find(row=>row.id===id)?.name || 'Thông tin SIM';
    inspector.hidden=false;panel.querySelector<HTMLElement>('#war-ranking-content')!.hidden=true;
    inspectTab('overview');
    inspector.querySelector<HTMLButtonElement>('#war-inspect-tab-overview')!.focus?.();
  });
  panel.querySelector("#war-rank-guide")!.innerHTML = '<table><thead><tr><th>Danh hiệu</th><th>Quân trạng</th><th>ST vật lý ngoại/nội công</th><th>Tốc độ đánh/thi triển</th><th>Kháng</th><th>Hạ NPC</th><th>Hạ SIM/người chơi</th></tr></thead><tbody>' + WAR_RANKS.map((rank,index) => {
    const next = WAR_RANKS[index+1];
    const range = next ? `${rank.points.toLocaleString("vi-VN")}–${(next.points-1).toLocaleString("vi-VN")}` : `Từ ${rank.points.toLocaleString("vi-VN")}`;
    const bonus = Math.round(rank.bonus*100);
    return `<tr><td style="color:${battlefieldTitleColor(rank.name)}">${rank.name}</td><td>${range}</td><td>+${bonus}%</td><td>+${bonus}%</td><td>+${bonus}%</td><td>+${50*(index+1)}</td><td>+${150*(index+1)}</td></tr>`;
  }).join('') + '</tbody></table>';
  const close = () => {
    panel.hidden = true;
  };
  panel.querySelector<HTMLButtonElement>(".war-close")!.onclick = close;
  function render() {
    if (panel.hidden || selectedId) return;
    const state = match?.();
    const seconds = Math.max(0, Math.ceil(state?.remaining || 0));
    panel.querySelector("#war-match-status")!.textContent = state
      ? `${state.phase === "idle" ? "Chưa vào trận" : state.result || "Đang giao chiến"} · Còn ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} · Phe của bạn: ${TEAM_NAMES[state.team]}` +
        (state.playerRespawn > 0 ? ` · Tái xuất chiến sau ${Math.ceil(state.playerRespawn)} giây${state.playerDeaths >= 5 ? " (×2)" : ""}` : "")
      : "";
    const rows = standings(),
      player = rows.find((row) => row.player);
    const points = totals?.() || rows.reduce((sum,row) => { if(row.team === "song" || row.team === "jin") sum[row.team] += row.points; return sum; }, {song:0,jin:0});
    panel.querySelector("#war-team-totals")!.innerHTML = `<span style="color:#ffcc00">Tống: ${points.song.toLocaleString("vi-VN")}</span> · <span style="color:#c77bff">Kim: ${points.jin.toLocaleString("vi-VN")}</span> quân trạng`;
    panel.querySelector("#war-personal-rank")!.textContent = player
      ? `Bạn: ${player.name} · Hạng ${player.position}/${rows.length} · ${player.points} điểm · <${player.title}>`
      : "";
    const rank = player && warRank(player.points);
    const next = player && WAR_RANKS.find(rank=>rank.points>player.points);
    panel.querySelector("#war-personal-bonus")!.textContent = rank
      ? `Thưởng quân hàm: +${Math.round(rank.bonus*100)}% sát thương vật lý ngoại/nội công, tốc độ đánh/thi triển và kháng` +
        (next ? ` · Còn ${(next.points-player!.points).toLocaleString("vi-VN")} điểm để đạt ${next.name}` : " · Quân hàm cao nhất")
      : "";
    panel.querySelector("tbody")!.innerHTML = rows
      .slice(0, 10)
      .map(
        (row) =>
          `<tr class="${row.player ? "war-self" : ""}" ${row.player ? 'aria-current="true"' : ""}><td>${row.position}</td><td style="color:${row.team === "song" ? "#ffcc00" : "#c77bff"}">${row.player ? `<strong style="color:#fff4ad;font-weight:700;text-shadow:0 0 6px #b99b36">${escape(row.name)} <small>(Bạn)</small></strong>` : inspect ? `<button type="button" class="war-inspect-name" data-inspect-id="${escape(row.id)}" aria-label="Xem thông tin ${escape(row.name)}" style="color:inherit">${escape(row.name)}</button>` : escape(row.name)}</td><td>${row.team === "song" ? "Tống" : "Kim"}</td><td class="war-title" style="color:${battlefieldTitleColor(row.title)}">&lt;${escape(row.title)}&gt;</td><td>${row.soldierKills || 0}</td><td>${row.points}</td></tr>`,
      )
      .join("");
  }
  function open() {
    selectedId=null;inspector.hidden=true;panel.querySelector<HTMLElement>('#war-ranking-content')!.hidden=false;
    panel.hidden = false;
    render();
  }
  document.body.appendChild(panel);
  return {
    open,
    close,
    render,
    get isOpen() {
      return !panel.hidden;
    },
  };
}
