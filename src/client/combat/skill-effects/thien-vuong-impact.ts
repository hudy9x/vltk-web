import { queueSkillContact } from '../casting';
import { collideCombatEffect } from '../collision';
import type { CombatCast, ContactEffect, WorldPoint } from '../types';

export const TIANWANG_IMPACT_RADIUS = 96;
const configured = new WeakSet<CombatCast>();
const groundMarks = new WeakMap<CombatCast, WorldPoint[]>();
const groundDistances = new WeakMap<ContactEffect, { distance: number; next: number }>();

/** Cosmetic earth bursts follow each blade; they never own a damage field. */
export function spawnHaoHungGround(effect: ContactEffect, x0: number, y0: number, x1: number, y1: number): void {
  if (![1058, 1084].includes(Number(effect.combat.skill.id)) || l.quiet) return;
  const sprite = A0.m['advanced-320']?.ground;
  if (!sprite) return;
  const length = Math.hypot(x1 - x0, (y1 - y0) * 2);
  const state = groundDistances.get(effect) || { distance: 0, next: 0 };
  const before = state.distance;
  const spacing = 128;
  state.next = Math.max(state.next, Math.ceil(before / spacing) * spacing);
  const marks = groundMarks.get(effect.combat) || [];
  groundMarks.set(effect.combat, marks);
  for (; state.next <= before + length; state.next += spacing) {
    if (l.fx.length + (l.fxQ?.length || 0) >= mf) break;
    const fraction = length ? (state.next - before) / length : 0;
    const x = x0 + (x1 - x0) * fraction, y = y0 + (y1 - y0) * fraction;
    // Nearby fan rays share earth marks instead of stacking the same patch.
    if (marks.some(mark => Math.hypot(mark.x - x, (mark.y - y) * 2) < spacing / 2)) continue;
    marks.push({ x, y });
    (l.fxQ ||= []).push({ k: 'boom', s: sprite, x, y,
      t: 0, life: yn(sprite), dir: 0, cosmetic: true, behindProjectiles: true });
  }
  state.distance += length;
  groundDistances.set(effect, state);
}

/** Clip a late frame at terrain, preserving contacts on the clear part of the path. */
export function collideHaoHungFlight(effect: ContactEffect, x0: number, y0: number, x1: number, y1: number): boolean | null {
  if (![1058, 1084].includes(Number(effect.combat.skill.id))) return null;
  const clear = (x: number, y: number) => effect.combat.ignoreTerrain || !Z0.g ||
    (R2(x, y + 14) && mt(x0, y0 + 14, x, y + 14));
  const blocked = !clear(x1, y1);
  if (blocked) {
    let lo = 0, hi = 1;
    for (let index = 0; index < 12; index++) {
      const mid = (lo + hi) / 2;
      if (clear(x0 + (x1 - x0) * mid, y0 + (y1 - y0) * mid)) lo = mid;
      else hi = mid;
    }
    x1 = x0 + (x1 - x0) * lo; y1 = y0 + (y1 - y0) * lo;
    effect.x = x1; effect.y = y1;
  }
  const stopped = collideCombatEffect(effect, x0, y0, x1, y1);
  spawnHaoHungGround(effect, x0, y0, stopped ? effect.x : x1, stopped ? effect.y : y1);
  return stopped || blocked;
}

/** Impact animation is shared by sprite missiles and their fallback contacts. */
function spawnHaoHungImpact(position: WorldPoint): void {
  const sprite = A0.m['advanced-320']?.hit;
  if (l.quiet || !sprite || l.fx.length + (l.fxQ?.length || 0) >= mf) return;
  (l.fxQ ||= []).push({ k: 'boom', s: sprite, x: position.x, y: position.y - 14,
    t: 0, life: yn(sprite), dir: 0, cosmetic: true });
}

/** Three forward fan blades inherit the primary hit's components and critical chance. */
function spawnHaoHungRays(parent: CombatCast, position: WorldPoint): void {
  const skill = { ...parent.skill, id: 1084, n: 'Hào Hùng Trảm — tầng 2', ev2: true,
    ev: false, melee: false, useAR: false, geo: { k: 'line' as const, pierce: true, area: 0 } };
  const sprite = A0.m['advanced-320']?.fly || undefined;
  const reach = (parent.skill.rad || 480) * QA * 0.5, life = reach / (36 * K3);
  const cast = queueSkillContact(parent.actor, position, skill, target => parent.onHit(target, skill), {
    windup: 0, maxHits: () => 3, maxTargets: Infinity, targets: parent.targets,
    onImpact: (_target, point) => spawnHaoHungImpact(point),
    visual: () => {
      for (const offset of [-Math.PI / 8, 0, Math.PI / 8]) {
        const angle = parent.direction + offset, x = position.x, y = position.y - 14;
        // Register real contacts even when quiet or the image is unavailable.
        l.fx.push({ k: 'mis', s: sprite, x, y, x1: x, y1: y,
          x2: x + Math.cos(angle) * reach, y2: y + Math.sin(angle) * reach / 2,
          t: 0, life, dir: ((Math.round(Math.atan2(-Math.cos(angle), Math.sin(angle) / 2) / (Math.PI / 8)) % 16) + 16) % 16 });
      }
    },
  });
  for (const effect of l.combatProjectiles || []) if (effect.combat === cast)
    spawnHaoHungGround(effect, effect.x, effect.y, effect.x, effect.y);
  if (l.quiet || !sprite) l.fx = l.fx.filter(effect => effect.combat !== cast);
}

/** Hào Hùng splits only at its first collision. The other two keep their splash. */
export function configureTianwangImpact(cast: CombatCast | null): void {
  if (!cast || ![1058, 1059, 1060].includes(Number(cast.skill.id)) || cast.skill.ev2 || configured.has(cast)) return;
  configured.add(cast);
  if (Number(cast.skill.id) === 1058) {
    cast.skill = { ...cast.skill, useAR: false, geo: { k: 'line', area: 0, pierce: false } };
    const previous = cast.onImpact;
    let split = false;
    cast.onImpact = (target, position, projectile) => {
      previous?.(target, position, projectile);
      if (split) return;
      split = true;
      spawnHaoHungImpact(position);
      spawnHaoHungRays(cast, position);
    };
  } else {
    cast.skill = { ...cast.skill, geo: { ...cast.skill.geo, k: 'line', area: TIANWANG_IMPACT_RADIUS } };
  }
  cast.maxTargets = Infinity;
}
