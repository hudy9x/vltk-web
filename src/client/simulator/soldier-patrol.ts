import type { LegacyEntity } from "./types";
interface PatrolHost {
  clear(x: number, y: number, targetX: number, targetY: number): boolean;
  move(actor: LegacyEntity, x: number, y: number, distance: number): void;
  direction(x: number, y: number): number;
}
/** Idle wandering stays in an ellipse around the original spawn. Invalid routes
 * are skipped; chasing beyond the leash latches a return until close to home.
 */
export function patrolSoldier(
  actor: LegacyEntity,
  dt: number,
  host: PatrolHost,
  random = Math.random,
) {
  const home = actor.battlefieldHome;
  if (!home) return;
  const distance = Math.hypot(actor.x - home.x, (actor.y - home.y) * 2);
  if (actor.battlefieldReturning || distance > actor.battlefieldLeashRadius) {
    actor.battlefieldReturning = distance > 30;
    actor.moving = actor.battlefieldReturning;
    if (actor.moving) host.move(actor, home.x, home.y, actor.spd * dt);
    return;
  }
  actor.battlefieldWanderTime = (actor.battlefieldWanderTime || 0) - dt;
  if (actor.battlefieldWanderTime <= 0) {
    actor.battlefieldWanderTime = 2 + random() * 3;
    actor.battlefieldWanderGoal = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = random() * Math.PI * 2,
        radius = Math.sqrt(random()) * actor.battlefieldPatrolRadius;
      const goal = {
        x: home.x + Math.cos(angle) * radius,
        y: home.y + (Math.sin(angle) * radius) / 2,
      };
      if (host.clear(actor.x, actor.y, goal.x, goal.y)) {
        actor.battlefieldWanderGoal = goal;
        break;
      }
    }
  }
  const goal = actor.battlefieldWanderGoal;
  actor.moving =
    !!goal && Math.hypot(actor.x - goal.x, (actor.y - goal.y) * 2) > 8;
  if (actor.moving) {
    actor.face = goal.x >= actor.x ? 1 : -1;
    actor.dir = host.direction(goal.x - actor.x, goal.y - actor.y);
    host.move(actor, goal.x, goal.y, actor.spd * 0.4 * dt);
  }
}
