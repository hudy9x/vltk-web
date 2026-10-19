import type { GridDefinition, NavigationGrid, Point, Size } from '../types';

export const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

export function decodeGrid(definition: GridDefinition, size: Size): NavigationGrid {
  const { columns: gw, rows: gh, cellSize, blockedBase64 } = definition;
  if (!Number.isInteger(gw) || !Number.isInteger(gh) || gw <= 0 || gh <= 0 ||
      cellSize.width <= 0 || cellSize.height <= 0 || !Number.isFinite(size.width) || !Number.isFinite(size.height) ||
      gw * cellSize.width !== size.width || gh * cellSize.height !== size.height) throw new Error('Navigation: invalid grid dimensions');
  let bytes: string;
  try { bytes = atob(blockedBase64); } catch { throw new Error('Navigation: invalid Base64'); }
  const count = gw * gh;
  if (bytes.length !== Math.ceil(count / 8)) throw new Error('Navigation: invalid bitmask length');
  const walkable = new Uint8Array(count);
  for (let cell = 0; cell < count; cell++) walkable[cell] = (bytes.charCodeAt(cell >> 3) >> (cell & 7)) & 1 ? 0 : 1;
  const components = new Int32Array(count).fill(-1);
  const queue = new Int32Array(count), sizes: number[] = [];
  let largest = -1, free = 0;
  for (let cell = 0; cell < count; cell++) {
    if (!walkable[cell] || components[cell] >= 0) continue;
    const component = sizes.length;
    let head = 0, tail = 1;
    queue[0] = cell; components[cell] = component;
    while (head < tail) {
      const current = queue[head++], x = current % gw, y = Math.floor(current / gw);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const next = ny * gw + nx;
        if (!walkable[next] || components[next] >= 0 ||
            (dx && dy && (!walkable[y * gw + nx] || !walkable[ny * gw + x]))) continue;
        components[next] = component; queue[tail++] = next;
      }
    }
    sizes.push(tail);
    if (tail > free) { free = tail; largest = component; }
  }
  // No component must mean no walkable cells, rather than matching all -1 labels.
  for (let cell = 0; cell < count; cell++) walkable[cell] = largest >= 0 && components[cell] === largest ? 1 : 0;
  return { w: size.width, h: size.height, gw, gh, cw: cellSize.width, ch: cellSize.height,
    ok: walkable, free, comp: components,
    isl: sizes.map((length, id) => ({ length, id })).filter(part => part.length >= Math.max(300, free * 0.25))
      .sort((a, b) => b.length - a.length).map(part => part.id) };
}

export function isWalkable(grid: NavigationGrid | null, x: number, y: number): boolean {
  if (!grid) return true;
  const col = Math.floor(x / grid.cw), row = Math.floor(y / grid.ch);
  return col >= 0 && row >= 0 && col < grid.gw && row < grid.gh && grid.ok[row * grid.gw + col] === 1;
}
/** Preserve the legacy horizontal 9px clearance, including its projection. */
export function canStandAt(grid: NavigationGrid | null, x: number, y: number): boolean {
  return isWalkable(grid, x, y) && isWalkable(grid, x - 9, y) && isWalkable(grid, x + 9, y);
}
export function nearestWalkable(grid: NavigationGrid | null, x: number, y: number): [number, number] {
  if (!grid || canStandAt(grid, x, y)) return [x, y];
  if (!grid.free) throw new Error('Navigation: no walkable region');
  const col = Math.floor(clamp(x, 0, grid.w - 1) / grid.cw), row = Math.floor(clamp(y, 0, grid.h - 1) / grid.ch);
  for (let radius = 1; radius < Math.max(grid.gw, grid.gh); radius++) {
    let distance = Infinity, best: [number, number] | null = null;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
      const px = (col + dx + 0.5) * grid.cw, py = (row + dy + 0.5) * grid.ch;
      if (!canStandAt(grid, px, py)) continue;
      const candidate = (px - x) ** 2 + (py - y) ** 2;
      if (candidate < distance) { distance = candidate; best = [px, py]; }
    }
    if (best) return best;
  }
  throw new Error('Navigation: no position with actor clearance');
}
export function clearSegment(grid: NavigationGrid | null, start: Point, end: Point, clearance: boolean): boolean {
  if (!grid) return true;
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / (clearance ? 8 : 10));
  const limit = clearance ? steps + 1 : steps;
  for (let step = 1; step < limit; step++) {
    const fraction = step / steps;
    const x = start.x + (end.x - start.x) * fraction, y = start.y + (end.y - start.y) * fraction;
    if (!(clearance ? canStandAt(grid, x, y) : isWalkable(grid, x, y))) return false;
  }
  return true;
}
