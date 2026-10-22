import { BATTLE_MAP } from './battlefield';
import type { Point } from '../maps/types';
import { BATTLEFIELD_LAYOUT, BATTLEFIELD_ROUTES } from './routes';
export { BATTLEFIELD_ROUTES } from './routes';

const { leftBank: LEFT_BANK, rightBank: RIGHT_BANK, leftEntry: ENTRY_LEFT, rightEntry: ENTRY_RIGHT } = BATTLEFIELD_LAYOUT;
interface Walker extends Point { battlefieldLane?: number; generation?: number }
interface Crossing { direction: 1 | -1; entered: boolean; y: number; revision?: number }

/** Hold a crossing's route until its exit, including when its combat target moves.
 * Army lane assignments spread soldiers over the upper, middle and lower bridges.
 */
export function createBattlefieldApproach() {
  const crossings = new WeakMap<Point, Crossing>();
  const safe = (point: Point, y: number) => point.x >= ENTRY_LEFT && point.x <= ENTRY_RIGHT && Math.abs(point.y - y) <= 96;
  const nearest = (point: Point) => BATTLEFIELD_ROUTES.reduce((best,y) => Math.abs(point.y-y) < Math.abs(point.y-best) ? y : best, BATTLEFIELD_ROUTES[1]);
  return (actor: Walker, target: Point): Point | null => {
    if (BATTLE_MAP === 9002) { crossings.delete(actor); return null; }
    if (BATTLEFIELD_ROUTES.some(y => safe(actor,y) && safe(target,y))) { crossings.delete(actor); return null; }
    let route = crossings.get(actor);
    if (route && (route.revision !== actor.generation || (route.direction === 1 ? target.x <= LEFT_BANK : target.x >= RIGHT_BANK))) {
      crossings.delete(actor); route = undefined;
    }
    if (!route) {
      const direction = actor.x < LEFT_BANK && target.x > LEFT_BANK ? 1 : actor.x > RIGHT_BANK && target.x < RIGHT_BANK ? -1 :
        actor.x >= LEFT_BANK && actor.x <= RIGHT_BANK ? (target.x >= actor.x ? 1 : -1) : 0;
      if (!direction) return null;
      const onBridge = actor.x >= LEFT_BANK && actor.x <= RIGHT_BANK;
      const targetOnBridge = target.x >= LEFT_BANK && target.x <= RIGHT_BANK;
      const y = onBridge ? nearest(actor) : targetOnBridge ? nearest(target) : BATTLEFIELD_ROUTES[actor.battlefieldLane ?? 1] ?? BATTLEFIELD_ROUTES[1];
      route = { direction, entered: onBridge, y, revision: actor.generation };
      crossings.set(actor, route);
    }
    const entry = { x: route.direction === 1 ? ENTRY_LEFT : ENTRY_RIGHT, y: route.y };
    const exit = { x: route.direction === 1 ? ENTRY_RIGHT : ENTRY_LEFT, y: route.y };
    if (!route.entered && Math.hypot(actor.x-entry.x,actor.y-entry.y) <= 40) route.entered = true;
    if (route.entered && Math.hypot(actor.x-exit.x,actor.y-exit.y) <= 40) { crossings.delete(actor); return null; }
    return route.entered ? exit : entry;
  };
}
