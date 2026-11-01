import type { CombatCast, SpriteMetadata, InterpolatedMissile, StationaryEffect, VisualEffect } from '../types';

// Cùng bán kính 170 với các đòn phụ quanh người của engine hiện tại.
export const SWORD_FLOWER_CHARGE_RADIUS = 170;
const CHARGE_DURATION = 5 * 56 / 1000;
type OpeningVisual = InterpolatedMissile | StationaryEffect;
const openingStates = new WeakMap<OpeningVisual, { owner: CombatCast; elapsed: number; phase: number }>();

/** Source event 1089: eight radial swords, followed by event 1091 at their ends.
 * Cosmetic only: the charge and real secondary keep their own damage quotas. */
function spawnSwordFlowerOpening(owner: CombatCast): void {
  const missile = A0.m['advanced-325'];
  if (l.quiet || !missile?.fly || l.fx.length + 8 > mf) return;
  const life = Math.max(.12, Math.min(.9, missile.life || .17));
  const radius = Math.min(280, Math.max(90, (missile.spd || 576) * Math.min(life, 1)));
  const x = owner.actor.x, y = owner.actor.y - 20;
  for (let index = 0; index < 8; index++) {
    const angle = owner.direction + index * Math.PI / 4;
    const dx = Math.cos(angle) * radius, dy = Math.sin(angle) * radius * .75;
    const effect: InterpolatedMissile = {
      k: 'mis', s: missile.fly, x, y, x1: x, y1: y, x2: x + dx, y2: y + dy,
      t: -owner.windup, life, cosmetic: true,
      dir: ((Math.round(Math.atan2(-dx, dy) / (Math.PI / 8)) % 16) + 16) % 16,
    };
    openingStates.set(effect, { owner, elapsed: 0, phase: 0 });
    l.fx.push(effect);
  }
}

/** null leaves unrelated FX to the existing updater. Never registers contacts. */
export function advanceSwordFlowerVisual(effect: VisualEffect, dt: number): boolean | null {
  if (effect.k !== 'mis' && effect.k !== 'boom') return null;
  const state = openingStates.get(effect);
  if (!state) return null;
  const { owner } = state, before = state.elapsed;
  state.elapsed += dt;
  if (l.quiet || l.town || l.deadT > 0 || owner.zone !== l.zoneShown ||
    (before < owner.windup && owner.actionRevision != null &&
      owner.actionRevision !== (owner.actor.actionRevision || 0))) return false;
  effect.t += dt;
  while (effect.t >= effect.life) {
    const remaining = effect.t - effect.life;
    const sprite = state.phase === 0 ? A0.m['advanced-353']?.fly
      : state.phase === 1 ? A0.m['advanced-353']?.hit : null;
    if (!sprite) return false;
    if (state.phase === 0) {
      const ray = effect as InterpolatedMissile;
      Object.assign(effect, { x: ray.x2, y: ray.y2 });
    }
    Object.assign(effect, { k: 'boom', s: sprite, t: remaining, life: yn(sprite), dir: 0 });
    state.phase++;
  }
  return true;
}

/** Tụ khí p6 is cosmetic. eD owns the delayed tier-2 field and its damage. */
export function spawnSwordFlowerCharge(parent: CombatCast | null, sprite?: SpriteMetadata): CombatCast | null {
  if (!parent || +parent.skill.id! !== 1061 || parent.skill.ev2) return null;
  const effect: StationaryEffect = {
    k: 'boom', s: sprite, x: parent.origin.x, y: parent.origin.y,
    t: -parent.windup, life: sprite ? yn(sprite) : CHARGE_DURATION, dir: 0,
    cosmetic: true,
  };
  // Tier-2 damage is scheduled by eD at release; this pre-cast sheet is visual.
  openingStates.set(effect, { owner: parent, elapsed: 0, phase: 2 });
  if (!l.quiet && sprite && l.fx.length <= 160) l.fx.push(effect);
  spawnSwordFlowerOpening(parent);
  return parent;
}
