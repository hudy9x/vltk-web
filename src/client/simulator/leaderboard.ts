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
) {
  mountWarDialogStyle();
  const panel = document.createElement("section");
  panel.className = "war-dialog";
  panel.id = "war-leaderboard";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Bảng xếp hạng Tống Kim");
  panel.innerHTML =
    '<header><h2>Bảng xếp hạng · Tống Kim</h2><button class="war-close" aria-label="Đóng bảng xếp hạng">×</button></header><div class="war-content"><p id="war-match-status"></p><p id="war-team-totals"></p><p id="war-personal-rank"></p><table><thead><tr><th>Hạng</th><th>Nhân vật</th><th>Phe</th><th>Danh hiệu</th><th>Binh sĩ hạ</th><th>Điểm</th></tr></thead><tbody></tbody></table><p>Top 10 quân trạng · Esc để đóng</p></div>';
  const close = () => {
    panel.hidden = true;
  };
  panel.querySelector<HTMLButtonElement>(".war-close")!.onclick = close;
  function render() {
    if (panel.hidden) return;
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
    panel.querySelector("tbody")!.innerHTML = rows
      .slice(0, 10)
      .map(
        (row) =>
          `<tr class="${row.player ? "war-self" : ""}" ${row.player ? 'aria-current="true"' : ""}><td>${row.position}</td><td style="color:${row.team === "song" ? "#ffcc00" : "#c77bff"}">${row.player ? `<strong style="color:#fff4ad;font-weight:700;text-shadow:0 0 6px #b99b36">${escape(row.name)} <small>(Bạn)</small></strong>` : escape(row.name)}</td><td>${row.team === "song" ? "Tống" : "Kim"}</td><td class="war-title" style="color:${battlefieldTitleColor(row.title)}">&lt;${escape(row.title)}&gt;</td><td>${row.soldierKills || 0}</td><td>${row.points}</td></tr>`,
      )
      .join("");
  }
  function open() {
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
