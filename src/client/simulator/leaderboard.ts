import { battlefieldTitleColor } from './presentation';
import { mountWarDialogStyle } from "./dialog-style";
export interface WarStanding {
  id: string;
  name: string;
  team: string;
  points: number;
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
) {
  mountWarDialogStyle();
  const panel = document.createElement("section");
  panel.className = "war-dialog";
  panel.id = "war-leaderboard";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Bảng xếp hạng Tống Kim");
  panel.innerHTML =
    '<header><h2>Bảng xếp hạng · Tống Kim</h2><button class="war-close" aria-label="Đóng bảng xếp hạng">×</button></header><div class="war-content"><p id="war-personal-rank"></p><table><thead><tr><th>Hạng</th><th>Nhân vật</th><th>Phe</th><th>Danh hiệu</th><th>Điểm</th></tr></thead><tbody></tbody></table><p>Top 10 quân trạng · Esc để đóng</p></div>';
  const close = () => {
    panel.hidden = true;
  };
  panel.querySelector<HTMLButtonElement>(".war-close")!.onclick = close;
  function render() {
    if (panel.hidden) return;
    const rows = standings(),
      player = rows.find((row) => row.player);
    panel.querySelector("#war-personal-rank")!.textContent = player
      ? `Bạn: ${player.name} · Hạng ${player.position}/${rows.length} · ${player.points} điểm · <${player.title}>`
      : "";
    panel.querySelector("tbody")!.innerHTML = rows
      .slice(0, 10)
      .map(
        (row) =>
          `<tr class="${row.player ? "war-self" : ""}"><td>${row.position}</td><td style="color:${row.team === "song" ? "#ffcc00" : "#c77bff"}">${escape(row.name)}</td><td>${row.team === "song" ? "Tống" : "Kim"}</td><td class="war-title" style="color:${battlefieldTitleColor(row.title)}">&lt;${escape(row.title)}&gt;</td><td>${row.points}</td></tr>`,
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
