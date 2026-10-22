import type { Team } from "./battlefield";

export const ALLIED_HEALTH_COLOR = "#4fd04f";
export const HOSTILE_HEALTH_COLOR = "#ff6038";
/** Health shows relation to the viewer; name colors still identify Tống/Kim. */
export function battlefieldHealthColor(
  actorTeam: Team,
  playerTeam: Team,
): string {
  return actorTeam === playerTeam ? ALLIED_HEALTH_COLOR : HOSTILE_HEALTH_COLOR;
}
const TITLE_COLORS: Record<string, string> = {
  "Binh sĩ": "#d6d3b8",
  "Hiệu úy": "#65cfff",
  "Thống lĩnh": "#80e06f",
  "Đại thống lĩnh": "#f2a0c5",
  "Tướng quân": "#ff805f",
  "Nguyên soái": "#ff6385",
};
/** The same rank palette is shared by humans, SIMs, soldiers and standings. */
export function battlefieldTitleColor(title: string): string {
  return TITLE_COLORS[title] || TITLE_COLORS["Binh sĩ"];
}
