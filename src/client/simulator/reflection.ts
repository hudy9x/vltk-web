import type { SimulatorStats } from './types';

/** Native U9 reflection rules, applied once after direct damage defenses. */
export function reflectedSkillDamage(damage: number, stats: Partial<SimulatorStats>, ranged: boolean) {
  if (!(damage > 0)) return 0;
  return Math.max(0, ranged ? damage * (stats.retRangeP || 0) / 100 : (stats.retMelee || 0) + damage * (stats.retMeleeP || 0) / 100);
}
