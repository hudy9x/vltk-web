import { applyPotionRecovery } from '../combat/recovery';
import { DEFAULT_SIM_RECOVERY } from './sim-recovery';
import type { SimRecoverySettings } from './sim-recovery';
import type { LegacyRecord, SimulatorActor } from './types';

/** Private bag of 60 combined bottles; never consumes player supplies. */
export function recoverSimulator(actor: SimulatorActor, dt: number, catalog: LegacyRecord[], _minimumLevels: Record<number, number>, cooldown: number, settings: SimRecoverySettings = DEFAULT_SIM_RECOVERY) {
  const bag = actor.potionBag ||= { life: 30, mana: 30, elapsed: Infinity, recovering: {life:false,mana:false} };
  bag.elapsed = (bag.elapsed ?? Infinity) + dt;
  if (actor.hp <= 0 || actor.dead) { bag.recovering = {life:false,mana:false}; return; }
  bag.recovering ||= {life:false,mana:false};
  const state = { life: actor.hp, mana: actor.mana, P: { life: actor.max, mana: actor.stats.mana } };
  let urgent = false;
  for (const resource of ['life', 'mana'] as const) {
    const rule = settings[resource];
    const percent = state.P[resource] > 0 ? state[resource] / state.P[resource] * 100 : 100;
    if (!rule.enabled || percent >= rule.stop) bag.recovering[resource] = false;
    else if (percent <= rule.start) bag.recovering[resource] = true;
    urgent ||= rule.enabled && percent <= rule.urgent;
  }
  const interval = urgent ? cooldown : Math.max(cooldown, settings.interval);
  if ((!bag.recovering.life && !bag.recovering.mana) || bag.elapsed + 1e-9 < interval) return;
  const slot = bag.life > 0 ? 'life' : 'mana';
  if (bag[slot] <= 0) return;
  const potion = catalog.find(item => item.kind === 'both' && item.tier === 5);
  if (!potion) return;
  applyPotionRecovery(state, 'life', potion as {kind: string; total: number; mtotal: number});
  bag[slot]--; bag.elapsed = 0;
  actor.hp = state.life; actor.mana = state.mana;
}
