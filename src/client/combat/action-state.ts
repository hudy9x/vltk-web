import type { CombatTarget } from './types';

declare function ws(animation: string, action: string): number;
declare var Y: { target: unknown; mouse?: boolean };

const active = new Set<CombatTarget>();
const releases = new Map<CombatTarget, {
  world: typeof l; zone: typeof l.zoneShown; revision: number;
  complete(remainingDt: number): void;
}>();

export function actorActionLocked(actor: CombatTarget): boolean {
  return !!actor.battlefieldFrozen || (actor.castT || 0) > 0 || (actor.hurtT || 0) > 0;
}

/** Stop locomotion at the start of a cast, independent of drawing/animation FPS. */
export function beginActorCast(actor: CombatTarget, seconds?: number, complete?: (remainingDt: number) => void): boolean {
  if (actor.battlefieldFrozen || (actor.hurtT || 0) > 0 || (complete && actorActionLocked(actor))) return false;
  const duration = seconds ?? (actor.animKey && typeof ws === 'function' ? ws(actor.animKey, 'at') : 0);
  actor.castT = seconds == null ? Math.max(actor.castT || 0, 0.25, duration || 0.4) : duration;
  actor.speedCastDuration = seconds;
  actor.speedCastProgress = 0;
  releases.delete(actor);
  if (complete) releases.set(actor, { world: l, zone: l.zoneShown, revision: actor.actionRevision || 0, complete });
  actor.moving = false; actor.mv = false; actor.act = 'at'; actor.actT = 0;
  if (typeof v !== 'undefined' && actor === v) {
    l.moveTo = null; l.pickTarget = null;
    if (typeof Y !== 'undefined') { Y.target = null; Y.mouse = false; }
  }
  active.add(actor);
  return true;
}

/** A single resolved HP hit of at least 15% maximum HP interrupts the windup. */
export function applyActorHurt(actor: CombatTarget, damage: number, maximumHP: number): boolean {
  // SIM PK first calculates against a disposable proxy, then applies the player's
  // shields. Only the final HP damage may put the real player into hurt.
  if (actor.hurtProxy || !Number.isFinite(damage) || !Number.isFinite(maximumHP) ||
    maximumHP <= 0 || damage < maximumHP * 0.15) return false;
  actor.hurtT = 0.5;
  actor.castT = 0; actor.atT = 0;
  actor.actionRevision = (actor.actionRevision || 0) + 1;
  actor.moving = false; actor.mv = false; actor.act = 'hurt'; actor.actT = 0;
  if (typeof v !== 'undefined' && actor === v) {
    l.hurtT = actor.hurtT; l.moveTo = null; l.pickTarget = null;
    (l as CombatWorldWithDash).dash = null;
    if (typeof Y !== 'undefined') { Y.target = null; Y.mouse = false; }
  }
  active.add(actor);
  return true;
}

type CombatWorldWithDash = typeof l & { dash?: unknown };

/** Advanced once by the shared combat simulation, including headless/offline ticks. */
export function advanceActorActions(dt: number): void {
  for (const actor of active) {
    const release = releases.get(actor);
    const player = typeof v !== 'undefined' && actor === v;
    const stunned = player ? (l as typeof l & { stunT?: number }).stunT : (actor as CombatTarget & { stun?: number }).stun;
    const cancelled = release && (release.world !== l || release.zone !== l.zoneShown || l.town ||
      release.revision !== (actor.actionRevision || 0) || actor.dead || (actor.hp != null && actor.hp <= 0) ||
      (player && l.life <= 0) || actor.battlefieldFrozen || (stunned || 0) > 0 || !(actor.castT! > 0));
    if (cancelled) { releases.delete(actor); actor.castT = 0; actor.speedCastDuration = undefined; }
    const before = actor.castT || 0;
    actor.castT = Math.max(0, before - dt);
    if (actor.castT < 1e-9) actor.castT = 0;
    if (actor.speedCastDuration) actor.speedCastProgress = Math.min(1, 1 - actor.castT / actor.speedCastDuration);
    actor.hurtT = Math.max(0, (actor.hurtT || 0) - dt);
    if (typeof v !== 'undefined' && actor === v) l.hurtT = actor.hurtT;
    if (!actorActionLocked(actor)) {
      if (actor.act === 'at' || actor.act === 'hurt') { actor.act = 'st'; actor.actT = 0; }
      active.delete(actor);
    }
    if (release && !cancelled && actor.castT === 0) {
      releases.delete(actor);
      actor.speedCastDuration = undefined;
      release.complete(Math.max(0, dt - before));
    }
  }
}
