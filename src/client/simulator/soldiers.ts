import type { LegacyRecord } from "./types";
import type { Team } from "./battlefield";
import type { SoldierRank } from "./soldier-config";
/** Rank skins are shared by both armies; name color identifies the team. */
export const SOLDIER_RANK_SKINS: Record<SoldierRank, readonly number[]> = {
  soldier: [599, 588, 597],
  captain: [600, 598],
  commander: [595],
  general: [589],
  grandGeneral: [589],
  marshal: [144, 566],
};
export const SOLDIER_SKIN_NAMES: Record<number, string> = {
  599: "Lãnh Cung",
  588: "Bôn Lôi",
  597: "Đoạt Phách",
  600: "Giáng Chùy",
  598: "Sương Đao",
  595: "Lạc Quang",
  589: "Ngân Nha",
  144: "Hoa Bắc sơn tặc đầu lĩnh",
  566: "Cổ Bách",
};
const allRankSkins = Object.values(SOLDIER_RANK_SKINS).flat();
export const SOLDIER_SKINS = { song: allRankSkins, jin: allRankSkins };
export function soldierSkin(
  catalog: Record<string, LegacyRecord>,
  team: Team,
  index: number,
  rank: SoldierRank = "soldier",
): number {
  const available = SOLDIER_RANK_SKINS[rank].filter((id) => !!catalog[id]);
  if (!available.length)
    throw new Error(
      `Thiếu sprite binh sĩ phe ${team === "song" ? "Tống" : "Kim"}.`,
    );
  return available[index % available.length];
}
