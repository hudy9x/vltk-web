/** Wider detection/leash remain separate so a soldier can pursue a target beyond
 * its initial detection circle and still return to its own side's outpost.
 */
export const SOLDIER_DETECTION_RADIUS = 1200;
export const SOLDIER_LEASH_RADIUS = 1600;
export function soldierRank(index: number) {
  const commander = index % 4 === 0 || index % 4 === 2;
  return commander
    ? { name: 'Thống lĩnh', minimumHP: 2_700_000, attackIntervalFactor: .6, movementFactor: 1.3 }
    : { name: 'Binh sĩ', minimumHP: 1_200_000, attackIntervalFactor: .85, movementFactor: 1.15 };
}
