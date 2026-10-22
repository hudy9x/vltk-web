import diagonalLayout from '../maps/content/9002/layout.json';
export const SOLDIER_RANKS = [
  "soldier",
  "captain",
  "commander",
  "general",
  "marshal",
] as const;
export type SoldierRank = (typeof SOLDIER_RANKS)[number];
export const SOLDIER_TITLES: Record<SoldierRank, string> = {
  soldier: "Binh sĩ",
  captain: "Hiệu úy",
  commander: "Thống lĩnh",
  general: "Đại thống lĩnh",
  marshal: "Nguyên soái",
};
export interface SoldierSettings {
  count: number;
  hp: number;
  /** Empty means native basic attacks. At most two native attacks in level 50–70. */
  skills?: number[];
  patrolRadius?: number;
  leashRadius?: number;
}
export type SoldierConfiguration = Record<SoldierRank, SoldierSettings>;
export const DEFAULT_SOLDIERS: SoldierConfiguration = {
  soldier: { count: 2, hp: 1_200_000 },
  captain: { count: 1, hp: 1_800_000 },
  commander: { count: 1, hp: 2_700_000 },
  general: { count: 1, hp: 4_000_000 },
  marshal: { count: 1, hp: 8_000_000 },
};
export interface SoldierSpawn {
  x: number;
  y: number;
  rank: SoldierRank;
  hp: number;
  skills: number[];
  patrolRadius: number;
  leashRadius: number;
}
/** Counts are per side. Store a validated snapshot so later edits cannot mutate
 * an active spawn/respawn plan. Golden bosses remain separate from these NPCs.
 */
export function validateSoldierConfiguration(
  configuration: SoldierConfiguration,
): SoldierConfiguration {
  let total = 0;
  const snapshot = {} as SoldierConfiguration;
  for (const rank of SOLDIER_RANKS) {
    const entry = configuration[rank];
    if (
      !entry ||
      !Number.isSafeInteger(entry.count) ||
      entry.count < 0 ||
      entry.count > 100 ||
      !Number.isSafeInteger(entry.hp) ||
      entry.hp < 1 ||
      entry.hp > 1_000_000_000_000
    )
      throw new Error(
        `${SOLDIER_TITLES[rank]}: số lượng 0–100, HP 1–1.000 tỷ.`,
      );
    total += entry.count;
    const skills = [...new Set(entry.skills || [])];
    const patrolRadius = entry.patrolRadius ?? 180,
      leashRadius = entry.leashRadius ?? 800;
    if (
      skills.length > 2 ||
      skills.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
      ((rank === "soldier" || rank === "captain") && skills.length)
    )
      throw new Error(
        `${SOLDIER_TITLES[rank]}: chỉ Thống lĩnh trở lên được chọn tối đa 2 chiêu.`,
      );
    if (
      !Number.isFinite(patrolRadius) ||
      patrolRadius < 40 ||
      patrolRadius > 1200 ||
      !Number.isFinite(leashRadius) ||
      leashRadius < patrolRadius ||
      leashRadius > 1600
    )
      throw new Error(
        "Tuần tra 40–1.200; truy đuổi từ bán kính tuần tra đến 1.600.",
      );
    snapshot[rank] = { ...entry, skills, patrolRadius, leashRadius };
  }
  if (total > 200) throw new Error("Tối đa 200 quái mỗi phe.");
  return snapshot;
}
export function soldierSpawnPlan(
  configuration: SoldierConfiguration,
  mapId = 9001,
): SoldierSpawn[] {
  const settings = validateSoldierConfiguration(configuration);
  const units = SOLDIER_RANKS.flatMap((rank) =>
    Array.from({ length: settings[rank].count }, () => ({
      rank,
      hp: settings[rank].hp,
      skills: [...settings[rank].skills!],
      patrolRadius: settings[rank].patrolRadius!,
      leashRadius: settings[rank].leashRadius!,
    })),
  );
  // Low-discrepancy points spread units across each bank, outside camp walls.
  // Mirroring keeps the same coverage for both teams without spawning in water.
  function fraction(index: number, base: number) {
    let result = 0,
      divisor = 1;
    while (index > 0) {
      divisor *= base;
      result += (index % base) / divisor;
      index = Math.floor(index / base);
    }
    return result;
  }
  return units.flatMap((unit, index) => {
    if (mapId === 9002) {
      const point = diagonalLayout.patrolPoints[index % diagonalLayout.patrolPoints.length];
      return [point,{x:3584-point.x,y:3584-point.y}].map(position=>({...unit,...position}));
    }
    const x = 800 + fraction(index + 1, 2) * 704;
    const y = 256 + fraction(index + 1, 3) * 3072;
    return [x, 3584 - x].map((positionX) => ({ ...unit, x: positionX, y }));
  });
}
