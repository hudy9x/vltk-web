import type { CombatCast, CombatTarget, ContactEffect, SpriteMetadata } from '../types';

// Cùng bán kính 170 với các đòn phụ quanh người của engine hiện tại.
export const SWORD_FLOWER_CHARGE_RADIUS = 170;
const CHARGE_DURATION = 5 * 56 / 1000;

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
  return cast;
}
