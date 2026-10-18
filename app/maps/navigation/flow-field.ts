import type { NavigationGrid, Point } from '../types';
import { clamp, nearestWalkable } from './grid';

/** Legacy flow field is an equal-cost BFS, not weighted Dijkstra. */
export function createFlowField() {
  const cache: { g: NavigationGrid | null; cell: number; d: Int32Array | null; q: Int32Array | null } = { g: null, cell: -1, d: null, q: null };
  function reset(): void { cache.g = null; cache.cell = -1; }
  function distances(grid: NavigationGrid | null, target: Point): Int32Array | null {
    if (!grid || !grid.free) return null;
    const x = clamp(Math.floor(target.x / grid.cw), 0, grid.gw - 1), y = clamp(Math.floor(target.y / grid.ch), 0, grid.gh - 1);
    const cell = y * grid.gw + x;
    if (cache.g === grid && cache.cell === cell) return cache.d;
    const count = grid.gw * grid.gh;
    const result = cache.g === grid && cache.d ? cache.d : new Int32Array(count);
    result.fill(-1);
    const queue = cache.q?.length === count ? cache.q : new Int32Array(count);
    let start = cell;
    if (!grid.ok[start]) {
      const [px, py] = nearestWalkable(grid, target.x, target.y);
      start = clamp(Math.floor(py / grid.ch), 0, grid.gh - 1) * grid.gw + clamp(Math.floor(px / grid.cw), 0, grid.gw - 1);
    }
    let head = 0, tail = 1;
    queue[0] = start; result[start] = 0;
    while (head < tail) {
      const current = queue[head++], col = current % grid.gw, row = Math.floor(current / grid.gw);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = col + ox, ny = row + oy;
        if ((!ox && !oy) || nx < 0 || ny < 0 || nx >= grid.gw || ny >= grid.gh) continue;
        const next = ny * grid.gw + nx;
        if (result[next] >= 0 || !grid.ok[next] || (ox && oy && (!grid.ok[row * grid.gw + nx] || !grid.ok[ny * grid.gw + col]))) continue;
        result[next] = result[current] + 1; queue[tail++] = next;
      }
    }
    Object.assign(cache, { g: grid, cell, d: result, q: queue });
    return result;
  }
  return { cache, reset, distances };
}
