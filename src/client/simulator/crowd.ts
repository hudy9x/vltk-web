import { findCrowdDetour } from './dynamic-route';
import type { Point } from '../maps/types';

interface Member extends Point { simId?: string; dead?: boolean; hp: number; battlefieldTeam?: string; battlefieldBoss?: boolean }
const CELL = 96, SPACE = 46;
/** Local steering uses a spatial grid; no all-pairs scan for 500 soldiers. */
export function createCrowdSteering() {
  const grid = new Map<string, Member[]>();
  let members: Member[] = [], time = 0, searches = 0;
  const routes = new WeakMap<Member, { goal: Point; points: Point[]; expires: number }>();
  const key = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y * 2 / CELL)}`;
  function begin(actors: Member[], dt = .016) {
    members = actors; time += Math.max(0, dt); searches = 0;
    grid.clear();
    for (const actor of actors) if (!actor.dead && actor.hp > 0) {
      const id = key(actor.x, actor.y), group = grid.get(id) || [];
      group.push(actor); grid.set(id, group);
    }
  }
  function route(actor: Member, goal: Point, clear: (x: number, y: number, tx: number, ty: number) => boolean): Point {
    const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x, (a.y-b.y)*2);
    let detour = routes.get(actor);
    if (detour && (detour.expires < time || distance(detour.goal, goal) > 80 || distance(actor, detour.points[0] || actor) > 400)) { routes.delete(actor); detour = undefined; }
    if (detour) {
      if (!detour.points.length) return goal;
      while (detour.points.length && distance(actor, detour.points[0]) < 13) detour.points.shift();
      if (detour.points.length && clear(actor.x, actor.y, detour.points[0].x, detour.points[0].y)) return detour.points[0];
      routes.delete(actor);
    }
    const length = distance(actor, goal);
    if (length < 48 || searches >= 3) return goal;
    // A capsule around the route detects walls of actors before they cause a queue.
    const blocked = members.some(body => {
      if (body === actor || body.dead || body.hp <= 0 || distance(actor, body) > 320) return false;
      const t = Math.max(0, Math.min(1, ((body.x-actor.x)*(goal.x-actor.x) + (body.y-actor.y)*(goal.y-actor.y)*4) / (length*length)));
      return t*length > 12 && distance(body, { x: actor.x+(goal.x-actor.x)*t, y: actor.y+(goal.y-actor.y)*t }) < 44;
    });
    if (!blocked) return goal;
    searches++;
    const points = findCrowdDetour(actor, goal, members, clear);
    if (!points) { routes.set(actor, { goal: { ...goal }, points: [], expires: time + .4 }); return goal; }
    routes.set(actor, { goal: { ...goal }, points, expires: time + 1.5 });
    return points[0];
  }
  function steer(actor: Member, proposed: Point, distance: number, clear: (x: number, y: number, tx: number, ty: number) => boolean): Point {
    const cx = Math.floor(actor.x / CELL), cy = Math.floor(actor.y * 2 / CELL), neighbors: Member[] = [];
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++)
      for (const other of grid.get(`${x},${y}`) || []) if (other !== actor && !other.dead && other.hp > 0 && Math.hypot(actor.x - other.x, (actor.y - other.y) * 2) < CELL * 1.5) neighbors.push(other);
    if (!neighbors.length || distance <= 0) return proposed;
    const dx = proposed.x - actor.x, dy = (proposed.y - actor.y) * 2;
    const length = Math.hypot(dx, dy);
    if (length < .001) return proposed;
    const heading = Math.atan2(dy, dx), step = Math.min(length, distance);
    const clearance = (point: Point) => Math.min(...neighbors.map(other => Math.hypot(point.x - other.x, (point.y - other.y) * 2)));
    const before = clearance(actor);
    let result: Point = { x: actor.x, y: actor.y }, best = -Infinity;
    // Allow a side-step to pass a stopped fighter. Opposing streams each keep right.
    for (const angle of [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2]) {
      const candidate = { x: actor.x + Math.cos(heading + angle) * step, y: actor.y + Math.sin(heading + angle) * step / 2 };
      const gap = clearance(candidate);
      if (gap < Math.min(SPACE * .72, before) - .001 || !clear(actor.x, actor.y, candidate.x, candidate.y)) continue;
      const cost = neighbors.reduce((sum, other) => sum + Math.pow(Math.max(0, SPACE - Math.hypot(candidate.x - other.x, (candidate.y - other.y) * 2)) / SPACE, 2), 0);
      const score = Math.cos(angle) * .25 - cost * 4 + (angle > 0 ? .001 : 0);
      if (score > best) { best = score; result = candidate; }
    }
    return result;
  }
  return { begin, route, steer };
}
