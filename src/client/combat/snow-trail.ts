import { queueSkillContact } from './casting';
import { skillIgnoresTerrain } from './config';
import type { CastOptions, CombatCast, CombatSkill, CombatTarget, ContactEffect, ContactHitHandler, StationaryEffect, VisualEffect } from './types';

// Same radius as the former Băng Tâm Tiên Tử secondary impact in eD.
export const SNOW_TRAIL_RADIUS = 150;
const visualTrails = new WeakMap<StationaryEffect, { owner: CombatCast; elapsed: number; firstStep?: number }>();

/** Thủy Anh's mist follows the same fixed patches as Băng Tâm Tiên Tử.
 * Its fairy keeps all primary damage; cosmetic patches never register hits. */
export function spawnSnowTrailVisual(owner: CombatCast, target: CombatTarget, speed: number): void {
  const sprite = A0.m[148]?.fly;
  if (l.quiet || !sprite) return;
  const start = { x: owner.actor.x, y: owner.actor.y };
  const distance = Math.hypot(target.x - start.x, (target.y - start.y) * 2);
  const segments = Math.max(1, Math.ceil(distance / (SNOW_TRAIL_RADIUS * QA * .75)));
  for (let index = 0; index <= segments && l.fx.length < mf; index++) {
    if (!distance && index) break;
    const progress = index / segments;
    const x = start.x + (target.x - start.x) * progress, y = start.y + (target.y - start.y) * progress;
    if (!owner.ignoreTerrain && !mt(start.x, start.y, x, y)) break;
    const effect: StationaryEffect = {
      k: 'boom', s: sprite, sp: 2, x, y: y - 14,
      t: -owner.windup - distance * progress / Math.max(1, speed), life: yn(sprite), dir: 0, cosmetic: true,
    };
    visualTrails.set(effect, { owner, elapsed: 0, firstStep: owner.firstStep });
    l.fx.push(effect);
  }
}

export function advanceSnowTrailVisual(effect: VisualEffect, dt: number): boolean | null {
  if (effect.k !== 'boom') return null;
  const state = visualTrails.get(effect);
  if (!state) return null;
  const { owner } = state, before = state.elapsed, step = state.firstStep ?? dt;
  delete state.firstStep;
  state.elapsed += step;
  if (l.quiet || l.town || l.deadT > 0 || owner.zone !== l.zoneShown ||
    (before < owner.windup && owner.actionRevision != null && owner.actionRevision !== (owner.actor.actionRevision || 0))) return false;
  effect.t += step;
  return effect.t < effect.life;
}

/** Fixed snow patches appear in order, beginning immediately at the caster.
 * All patches share one hit ledger: overlapping snow does not multiply damage.
 * Hidden/missing sprites retain the same timed area contacts.
 */
export function spawnSnowTrail(actor: CombatTarget, target: CombatTarget, skill: CombatSkill,
  onHit: ContactHitHandler, targets?: CastOptions['targets'], speed = 540): CombatCast {
  const start = { x: actor.x, y: actor.y }, end = { x: target.x, y: target.y };
  const distance = Math.hypot(end.x - start.x, (end.y - start.y) * 2);
  const segments = Math.max(1, Math.ceil(distance / (SNOW_TRAIL_RADIUS * QA * 0.75)));
  const sprite = A0.m[148]?.fly || undefined;
  const life = sprite ? yn(sprite) : 1.2;
  const areaSkill = { ...skill, ev2: true, geo: { k: 'spot' as const, r: SNOW_TRAIL_RADIUS, pierce: true } };
  const cast = queueSkillContact(actor, start, areaSkill, onHit, {
    windup: 0, maxTargets: Infinity, maxHits: () => 1, targets, hideFallbackVisual: true,
    visual: () => {
      for (let index = 0; index <= segments; index++) {
        if (!distance && index) break;
        const progress = index / segments;
        const x = start.x + (end.x - start.x) * progress;
        const y = start.y + (end.y - start.y) * progress;
        if (!skillIgnoresTerrain(skill) && !mt(start.x, start.y, x, y)) break;
        // Register physical fields even in quiet mode; cosmetic FPS never drives HP.
        const effect = {
          k: 'boom' as const, s: sprite, sp: 2, x, y: y - 14,
          t: index === 0 ? 0 : -distance * progress / Math.max(1, speed), life, dir: 0,
          combat: activeCombatCast!, contactHits: new Set<CombatTarget>(), staticArea: true,
        };
        (l.combatProjectiles || (l.combatProjectiles = [])).push(effect as ContactEffect);
        activeCombatCast!.emitted++;
        if (!l.quiet && sprite) l.fx.push(effect);
      }
    },
  });
  return cast;
}
