import type { CombatTarget } from './types';

declare function ws(animation: string, action: string): number;
declare var Y: { target: unknown; mouse?: boolean };

const active = new Set<CombatTarget>();

export function actorActionLocked(actor: CombatTarget): boolean {
  return (actor.castT || 0) > 0 || (actor.hurtT || 0) > 0;
}

/** Stop locomotion at the start of a cast, independent of drawing/animation FPS. */
export function beginActorCast(actor: CombatTarget): boolean {
  if ((actor.hurtT || 0) > 0) return false;
  const duration = actor.animKey && typeof ws === 'function' ? ws(actor.animKey, 'at') : 0;
  actor.castT = Math.max(actor.castT || 0, 0.25, duration || 0.4);
  actor.moving = false; actor.mv = false; actor.act = 'at'; actor.actT = 0;
  if (typeof v !== 'undefined' && actor === v) {
    l.moveTo = null; l.pickTarget = null;
    if (typeof Y !== 'undefined') { Y.target = null; Y.mouse = false; }
  }
  active.add(actor);
  return true;
}

/** Legacy hit-handler hook: damage alone never locks actions or interrupts a cast.
 * Keep the bridge signature while explicit poison, cold and stun remain independent.
 */
export function applyActorHurt(_actor: CombatTarget, _damage: number, _maximumHP: number): boolean {
  return false;
}

/** Advanced once by the shared combat simulation, including headless/offline ticks. */
export function advanceActorActions(dt: number): void {
  for (const actor of active) {
    actor.castT = Math.max(0, (actor.castT || 0) - dt);
    actor.hurtT = Math.max(0, (actor.hurtT || 0) - dt);
    if (typeof v !== 'undefined' && actor === v) l.hurtT = actor.hurtT;
    if (!actorActionLocked(actor)) {
      if (actor.act === 'at' || actor.act === 'hurt') { actor.act = 'st'; actor.actT = 0; }
      active.delete(actor);
    }
  }
}
