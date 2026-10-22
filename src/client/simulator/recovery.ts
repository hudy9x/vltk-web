import { advanceConsumableCooldowns, applyPotionRecovery } from '../combat/recovery';
import type { LegacyRecord, SimulatorActor } from './types';

/** SIMs have a private 60-bottle bag. Use the same instant recovery and shared
 * resource cooldowns as the player; no player inventory or supply is consumed. */
export function recoverSimulator(actor: SimulatorActor, dt: number, catalog: LegacyRecord[], minimumLevels: Record<number, number>, cooldown: number) {
  const bag = actor.potionBag ||= { life: 30, mana: 30, potCd: { life: 0, mana: 0 } };
  advanceConsumableCooldowns(bag, dt);
  if (actor.hp <= 0 || actor.dead || actor.profile.potOff) return;
  const state = { life: actor.hp, mana: actor.mana, P: { life: actor.max, mana: actor.stats.mana } };
  for (const resource of ['life', 'mana'] as const) {
    const threshold = Math.max(.05, Math.min(.95, (actor.profile[resource === 'life' ? 'potHp' : 'potMp'] ?? 50) / 100));
    const main = actor.stats.main;
    const needsMana = resource === 'mana' && !main.costLife && state.mana < (main.cost || 0) * 2;
    if (bag[resource] <= 0 || bag.potCd[resource] > 0 || (state[resource] >= state.P[resource] * threshold && !needsMana) || state[resource] >= state.P[resource]) continue;
    const potion = catalog.filter(item => item.kind === resource && actor.profile.lvl >= (minimumLevels[item.tier] ?? Infinity))
      .sort((a, b) => b.total - a.total)[0];
    if (!potion) continue;
    applyPotionRecovery(state, resource, { kind: potion.kind, total: potion.total });
    bag[resource]--; bag.potCd[resource] = cooldown;
  }
  actor.hp = state.life; actor.mana = state.mana;
}
