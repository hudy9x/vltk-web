import type { LegacyNavigation, MapKey, MovingActor, NavigationGrid, Point, Size } from './types';
import { canStandAt, clamp, clearSegment, decodeGrid, isWalkable, nearestWalkable } from './navigation/grid';
import { findPath } from './navigation/pathfinding';
import { createFlowField } from './navigation/flow-field';

export function createNavigationRuntime(actionLocked: (actor: MovingActor) => boolean = () => false) {
  const bounds = { w: 3072, h: 3072, pad: 20 };
  const state: { g: NavigationGrid | null; key: MapKey | null } = { g: null, key: null };
  const flow = createFlowField();
  const actorRevisions = new WeakMap<MovingActor, number>();
  let pathBudget = 2, revision = 0;

  function load(key: MapKey, definition?: LegacyNavigation | null, openSize?: Size): boolean {
    // Prepare before replacing the old grid: invalid input must leave the world intact.
    const next = definition ? decodeGrid({ kind: 'grid', columns: definition.gw, rows: definition.gh,
      cellSize: { width: definition.cw, height: definition.ch }, blockedBase64: definition.obs },
    { width: definition.w, height: definition.h }) : null;
    if (next && !next.free) throw new Error(`Map ${String(key)}: no walkable region`);
    state.g = next; state.key = key;
    bounds.w = next?.w ?? openSize?.width ?? 3072;
    bounds.h = next?.h ?? openSize?.height ?? 3072;
    flow.reset(); revision++;
    return next !== null;
  }
  function clampPosition(x: number, y: number): [number, number] {
    return [clamp(x, bounds.pad, bounds.w - bounds.pad), clamp(y, bounds.pad + 30, bounds.h - bounds.pad)];
  }
  function resolvePosition(x: number, y: number): [number, number] {
    const [px, py] = clampPosition(x, y);
    return nearestWalkable(state.g, px, py);
  }
  const walkable = (x: number, y: number) => isWalkable(state.g, x, y);
  const canStand = (x: number, y: number) => canStandAt(state.g, x, y);
  const nearest = (x: number, y: number) => nearestWalkable(state.g, x, y);
  const clear = (x: number, y: number, tx: number, ty: number) => clearSegment(state.g, { x, y }, { x: tx, y: ty }, true);
  const sight = (x: number, y: number, tx: number, ty: number) => clearSegment(state.g, { x, y }, { x: tx, y: ty }, false);
  const path = (x: number, y: number, tx: number, ty: number, budget = 8000) => findPath(state.g, { x, y }, { x: tx, y: ty }, budget);
  const distances = (x: number, y: number) => flow.distances(state.g, { x, y });
  function cell(x: number, y: number): [number, number] {
    const grid = state.g;
    return grid ? [Math.floor(x / grid.cw), Math.floor(y / grid.ch)] : [0, 0];
  }
  function selectIsland(index: number): [number, number] | false {
    const grid = state.g;
    if (!grid || grid.isl.length < 2) return false;
    const component = grid.isl[((index % grid.isl.length) + grid.isl.length) % grid.isl.length];
    let x = 0, y = 0, count = 0;
    for (let cell = 0; cell < grid.ok.length; cell++) {
      grid.ok[cell] = grid.comp[cell] === component ? 1 : 0;
      if (grid.ok[cell]) { x += cell % grid.gw; y += Math.floor(cell / grid.gw); count++; }
    }
    grid.free = count; flow.reset(); revision++;
    return nearest((x / count + 0.5) * grid.cw, (y / count + 0.5) * grid.ch);
  }
  function tryMove(actor: Point, x: number, y: number): boolean {
    if (canStand(x, y)) { actor.x = x; actor.y = y; return true; }
    if (canStand(x, actor.y)) { actor.x = x; return true; }
    if (canStand(actor.x, y)) { actor.y = y; return true; }
    return false;
  }
  function stepToward(actor: MovingActor, target: Point, distance: number): boolean {
    const length = Math.hypot(target.x - actor.x, target.y - actor.y) || 1;
    const fraction = Math.min(1, distance / length);
    return tryMove(actor, actor.x + (target.x - actor.x) * fraction, actor.y + (target.y - actor.y) * fraction);
  }
  function moveAlongPath(actor: MovingActor, x: number, y: number, distance: number): void {
    if (actionLocked(actor)) return;
    if (actorRevisions.get(actor) !== revision) {
      actor._pp = null; actor._pk = undefined; actor._pr = 0; actorRevisions.set(actor, revision);
    }
    if (!state.g) { stepToward(actor, { x, y }, distance); return; }
    if (clear(actor.x, actor.y, x, y)) {
      actor._pp = null;
      actor._stuck = stepToward(actor, { x, y }, distance) ? 0 : (actor._stuck || 0) + 1;
      return;
    }
    const [col, row] = cell(x, y), key = `${col},${row}`;
    if ((actor._pk !== key || (!actor._pp && (actor._pr = (actor._pr || 0) - 1) < 0)) && pathBudget > 0) {
      pathBudget--; actor._pp = path(actor.x, actor.y, x, y); actor._pk = key;
      actor._pi = 0; actor._pr = actor._pp ? 0 : 30;
    }
    const points = actor._pp;
    if (!points?.length) return;
    let index = actor._pi || 0;
    while (index < points.length - 1 && Math.hypot(points[index].x - actor.x, points[index].y - actor.y) < 10) index++;
    actor._pi = index;
    stepToward(actor, points[Math.min(index, points.length - 1)], distance);
  }
  function moveWithFlow(actor: MovingActor, x: number, y: number, distance: number): void {
    if (actionLocked(actor)) return;
    const grid = state.g;
    // Preserve the current lane whenever the whole segment is walkable.
    // Equal-cost BFS diagonals otherwise drift a straight march toward obstacle edges.
    if (!grid || clear(actor.x, actor.y, x, y)) {
      stepToward(actor, { x, y }, distance); return;
    }
    const field = distances(x, y);
    if (!field) return;
    const col = clamp(Math.floor(actor.x / grid.cw), 0, grid.gw - 1), row = clamp(Math.floor(actor.y / grid.ch), 0, grid.gh - 1);
    const current = field[row * grid.gw + col];
    let best = current, goalDistance = Infinity, nx = col, ny = row;
    if (best >= 0) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const px = col + dx, py = row + dy;
      if ((!dx && !dy) || px < 0 || py < 0 || px >= grid.gw || py >= grid.gh) continue;
      const value = field[py * grid.gw + px];
      const cx = (px + 0.5) * grid.cw, cy = (py + 0.5) * grid.ch;
      const remaining = Math.hypot(x - cx, y - cy);
      if (value < 0 || value >= current || value > best || (value === best && remaining >= goalDistance) ||
          !canStand(cx, cy) || (dx && dy && (!grid.ok[row * grid.gw + px] || !grid.ok[py * grid.gw + col]))) continue;
      best = value; goalDistance = remaining; nx = px; ny = py;
    }
    const beforeX = actor.x, beforeY = actor.y;
    stepToward(actor, nx === col && ny === row ? { x, y } : { x: (nx + 0.5) * grid.cw, y: (ny + 0.5) * grid.ch }, distance);
    if (Math.hypot(actor.x - beforeX, actor.y - beforeY) < 0.001 && distance > 0) moveAlongPath(actor, x, y, distance);
  }
  return { bounds, state, flowCache: flow.cache, load, clampPosition, resolvePosition, selectIsland,
    walkable, canStand, nearest, clear, sight, path, distances, cell, tryMove, moveAlongPath, moveWithFlow,
    beginTick: () => { pathBudget = 2; } };
}
export type NavigationRuntime = ReturnType<typeof createNavigationRuntime>;
