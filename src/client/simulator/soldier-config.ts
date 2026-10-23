import wildernessLayout from '../maps/content/9003/layout.json';
export const SOLDIER_RANKS = [
  "soldier",
  "captain",
  "commander",
  "general",
  "grandGeneral",
  "marshal",
] as const;
export type SoldierRank = (typeof SOLDIER_RANKS)[number];
export const SOLDIER_TITLES: Record<SoldierRank, string> = {
  soldier: "Binh sĩ",
  captain: "Hiệu úy",
  commander: "Thống lĩnh",
  general: "Phó tướng",
  grandGeneral: "Đại tướng",
  marshal: "Nguyên soái",
};
export interface SoldierSettings {
  count: number;
  hp: number;
  respawnSeconds?: number;
  /** Empty means native basic attacks. At most two native attacks in level 50–70. */
  skills?: number[];
  patrolRadius?: number;
  leashRadius?: number;
}
export type SoldierConfiguration = Record<SoldierRank, SoldierSettings>;
export const DEFAULT_SOLDIERS: SoldierConfiguration = {
  soldier: { count: 50, hp: 50_000 },
  captain: { count: 10, hp: 60_000 },
  commander: { count: 6, hp: 80_000 },
  general: { count: 4, hp: 100_000 },
  grandGeneral: { count: 0, hp: 120_000 },
  marshal: { count: 1, hp: 200_000 },
};
export interface SoldierSpawn {
  team: "song" | "jin";
  respawnSeconds: number;
  x: number;
  y: number;
  rank: SoldierRank;
  hp: number;
  skills: number[];
  patrolRadius: number;
  leashRadius: number;
}
/** Patrol counts are totals across both teams. Store a validated snapshot so later edits cannot mutate
 * an active spawn/respawn plan. Marshals are the two camp bosses and are excluded from patrol spawns.
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
    const respawnSeconds = entry.respawnSeconds ?? 20;
    if (![10, 20, 30].includes(respawnSeconds)) throw new Error("Hồi sinh binh sĩ: chọn 10, 20 hoặc 30 giây.");
    snapshot[rank] = { ...entry, skills, patrolRadius, leashRadius, respawnSeconds };
  }
  if (total > 200) throw new Error("Tối đa 200 quái tổng hai phe.");
  return snapshot;
}
export function soldierSpawnPlan(
  configuration: SoldierConfiguration,
  mapId = 9003,
): SoldierSpawn[] {
  if (mapId !== 9003) throw new Error("Chiến trường không hợp lệ.");
  const settings = validateSoldierConfiguration(configuration);
  const result: SoldierSpawn[] = [];
  let sideIndex = { song: 0, jin: 0 };
  for (const rank of SOLDIER_RANKS.filter(rank => rank !== "marshal")) {
    const entry = settings[rank];
    for (let index = 0; index < entry.count; index++) {
      const team = index % 2 ? "jin" : "song";
      const ordinal = sideIndex[team]++;
      const point = wildernessLayout.patrolPoints[ordinal % wildernessLayout.patrolPoints.length];
      const x = team === "song" ? point.x : 3584 - point.x;
      const y = team === "song" ? point.y : 3584 - point.y;
      result.push({ x, y, team, rank, hp: entry.hp, skills: [...entry.skills!], patrolRadius: entry.patrolRadius!, leashRadius: entry.leashRadius!, respawnSeconds: entry.respawnSeconds! });
    }
  }
  return result;
}

/** Assign each point to its nearest camp on Hoang Nguyên. */
export function soldierTeamAt(x: number, y: number, mapId = 9003): "song" | "jin" {
  if (mapId !== 9003) throw new Error("Chiến trường không hợp lệ.");
  const {song, jin} = wildernessLayout.camps;
  return (x-song.x)**2 + (y-song.y)**2 <= (x-jin.x)**2 + (y-jin.y)**2 ? "song" : "jin";
}
