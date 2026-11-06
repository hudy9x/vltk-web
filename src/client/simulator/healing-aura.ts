import type { LegacyEntity, SimulatorActor } from './types';
/** Native Phổ Độ Chúng Sinh regeneration; the strongest nearby aura wins. */
export function simulatorHealingAura(target: LegacyEntity, sources: SimulatorActor[]): number {
  if (target.dead || target.hp <= 0 || target.profile?.sk?.[332] > 0) return 0;
  let amount = 0;
  for (const source of sources) {
    if (source === target || source.dead || source.hp <= 0 || source.battlefieldTeam !== target.battlefieldTeam ||
      Math.hypot(source.x - target.x, (source.y - target.y) * 2) > 410) continue;
    amount = Math.max(amount, source.healingAura || 0);
  }
  return amount;
}
