import type { NavigationGrid, Point } from '../types';
import { clamp, nearestWalkable } from './grid';

type Candidate = [score: number, x: number, y: number];

export function findPath(grid: NavigationGrid | null, start: Point, destination: Point, budget = 8000): Point[] | null {
  if (!grid || !grid.free) return null;
  const sx = clamp(Math.floor(start.x / grid.cw), 0, grid.gw - 1), sy = clamp(Math.floor(start.y / grid.ch), 0, grid.gh - 1);
  let dx = clamp(Math.floor(destination.x / grid.cw), 0, grid.gw - 1), dy = clamp(Math.floor(destination.y / grid.ch), 0, grid.gh - 1);
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < grid.gw && y < grid.gh && grid.ok[y * grid.gw + x] === 1;
  if (!open(dx, dy)) {
    const [x, y] = nearestWalkable(grid, destination.x, destination.y);
    dx = Math.floor(x / grid.cw); dy = Math.floor(y / grid.ch);
  }
  const key = (x: number, y: number) => y * grid.gw + x;
  const previous = new Map<number, number>(), costs = new Map<number, number>([[key(sx, sy), 0]]);
  const estimate = (x: number, y: number) => Math.hypot((x - dx) * grid.cw, (y - dy) * grid.ch);
  const heap: Candidate[] = [[estimate(sx, sy), sx, sy]];
  function push(value: Candidate): void {
    heap.push(value);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heap[parent][0] <= heap[index][0]) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]]; index = parent;
    }
  }
  function pop(): Candidate {
    const first = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let index = 0;
      for (;;) {
        const left = 2 * index + 1, right = left + 1;
        let next = index;
        if (left < heap.length && heap[left][0] < heap[next][0]) next = left;
        if (right < heap.length && heap[right][0] < heap[next][0]) next = right;
        if (next === index) break;
        [heap[next], heap[index]] = [heap[index], heap[next]]; index = next;
      }
    }
    return first;
  }
  let visited = 0;
  while (heap.length && visited++ < budget) {
    const [, x, y] = pop();
    if (x === dx && y === dy) {
      const result: Point[] = [];
      let cell: number | undefined = key(x, y);
      while (cell !== undefined) {
        result.push({ x: (cell % grid.gw + 0.5) * grid.cw, y: (Math.floor(cell / grid.gw) + 0.5) * grid.ch });
        cell = previous.get(cell);
      }
      return result.reverse();
    }
    const cost = costs.get(key(x, y))!;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const nx = x + ox, ny = y + oy;
      if ((!ox && !oy) || !open(nx, ny) || (ox && oy && (!open(x + ox, y) || !open(x, y + oy)))) continue;
      const nextCost = cost + Math.hypot(ox * grid.cw, oy * grid.ch), cell = key(nx, ny);
      if (nextCost < (costs.get(cell) ?? Infinity)) {
        costs.set(cell, nextCost); previous.set(cell, key(x, y)); push([nextCost + estimate(nx, ny), nx, ny]);
      }
    }
  }
  return null;
}
