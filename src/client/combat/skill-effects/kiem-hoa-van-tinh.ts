import type { CombatCast, CombatTarget, ContactEffect, SpriteMetadata, InterpolatedMissile, StationaryEffect, VisualEffect } from '../types';

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

/** Tụ khí p6 của Kiếm Hoa (JFX.f[1061].pre), theo docs/SKILL_SPRITES.md.
 * Một vùng riêng, một lượt
 * sát thương mỗi mục tiêu. Không nhân vùng theo năm kiếm khí của chiêu chính.
 * Giữ actor/targets/onHit của cast để game và SIM dùng đúng ngữ cảnh damage.
 */
export function spawnSwordFlowerCharge(parent: CombatCast | null, sprite?: SpriteMetadata): CombatCast | null {
  if (!parent || +parent.skill.id! !== 1061 || parent.skill.ev2) return null;
  const cast: CombatCast = {
    ...parent,
    skill: { ...parent.skill, ev2: true, melee: false,
      geo: { k: 'self', r: SWORD_FLOWER_CHARGE_RADIUS, pierce: true } },
    hits: new Map(), targetPulses: new Map(), maxTargets: Infinity, maxHits: () => 1,
    onImpact: undefined, emitted: 1, elapsed: 0, interval: 0,
    duration: sprite ? yn(sprite) : CHARGE_DURATION,
    origin: { ...parent.origin },
  };
  const effect: ContactEffect = {
    k: 'boom', s: sprite, x: cast.origin.x, y: cast.origin.y,
    t: -cast.windup, life: cast.duration!, dir: 0, staticArea: true,
    combat: cast, contactHits: new Set<CombatTarget>(),
  };
  (l.combatProjectiles || (l.combatProjectiles = [])).push(effect);
  // FX budget only controls visuals; physical damage still runs in quiet mode.
  if (!l.quiet && sprite && l.fx.length <= 160) l.fx.push(effect);
  spawnSwordFlowerOpening(parent);
  return cast;
}
