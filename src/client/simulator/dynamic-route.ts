import { findPath } from '../maps/navigation/pathfinding';
import type { NavigationGrid, Point } from '../maps/types';
interface Body extends Point { hp: number; dead?: boolean }
const CELL = 24, RADIUS = 360, SIZE = 31;
const metric = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) * 2);
/** Temporary local occupancy overlays people onto terrain; never edits the map grid. */
export function findCrowdDetour(actor: Point, goal: Point, bodies: Body[], clear: (x: number, y: number, tx: number, ty: number) => boolean): Point[] | null {
  const origin = { x: actor.x - RADIUS - CELL / 2, y: actor.y * 2 - RADIUS - CELL / 2 };
  const toLocal = (p: Point) => ({ x: p.x - origin.x, y: p.y * 2 - origin.y });
  const toWorld = (p: Point) => ({ x: p.x + origin.x, y: (p.y + origin.y) / 2 });
  const distance = metric(actor, goal), fraction = Math.min(1, (RADIUS - CELL * 2) / Math.max(1, distance));
  const destination = { x: actor.x + (goal.x - actor.x) * fraction, y: actor.y + (goal.y - actor.y) * fraction };
  const neighbors = bodies.filter(body => body !== actor && !body.dead && body.hp > 0 && metric(actor, body) < RADIUS + 64);
  const ok = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const point = toWorld({ x: (x + .5) * CELL, y: (y + .5) * CELL });
    const walkable = clear(point.x, point.y, point.x, point.y) && neighbors.every(body => metric(point, body) >= 40);
    ok[y * SIZE + x] = walkable ? 1 : 0;
  }
  // Permit the current cell even when someone walked into it; steering handles escape.
  ok[15 * SIZE + 15] = 1;
  const grid: NavigationGrid = { w: SIZE * CELL, h: SIZE * CELL, gw: SIZE, gh: SIZE, cw: CELL, ch: CELL, ok, free: ok.reduce((a,b)=>a+b,0), comp: new Int32Array(), isl: [] };
  const path = findPath(grid, toLocal(actor), toLocal(destination), 1800);
  if (!path || path.length < 2) return null;
  const result = path.map(toWorld);
  // Cell validity alone cannot detect a thin obstacle between two cell centers.
  for (let i = 1; i < result.length; i++) if (!clear(result[i-1].x, result[i-1].y, result[i].x, result[i].y)) return null;
  return result.slice(1);
}
