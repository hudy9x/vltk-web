import type { CombatTarget } from '../types';
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

/** Conservative broad phase. Exact circle/rectangle tests stay in geometry.ts. */
export class TargetGrid {
  private readonly cells = new Map<string, number[]>();
  constructor(private readonly targets: CombatTarget[], private readonly cellSize = 128) {
    targets.forEach((target, index) => {
      const r = Math.max(8, target.r || 12), y = target.y - 14;
      const box = this.cellBounds({ minX: target.x - r, maxX: target.x + r, minY: y - r * .6, maxY: y + r * .6 });
      for (let x = box.minX; x <= box.maxX; x++) for (let y = box.minY; y <= box.maxY; y++) {
        const key = `${x},${y}`;
        let bucket = this.cells.get(key);
        if (!bucket) this.cells.set(key, bucket = []);
        bucket.push(index);
      }
    });
  }
  private cellBounds(bounds: Bounds): Bounds {
    return { minX: Math.floor(bounds.minX / this.cellSize), maxX: Math.floor(bounds.maxX / this.cellSize),
      minY: Math.floor(bounds.minY / this.cellSize), maxY: Math.floor(bounds.maxY / this.cellSize) };
  }
  query(bounds: Bounds): CombatTarget[] {
    const box = this.cellBounds(bounds);
    // Large fields are cheaper to scan directly than to visit many empty cells.
    if ((box.maxX - box.minX + 1) * (box.maxY - box.minY + 1) > Math.max(16, this.cells.size * 2)) return this.targets;
    const found = new Set<number>();
    for (let x = box.minX; x <= box.maxX; x++) for (let y = box.minY; y <= box.maxY; y++) {
      const bucket = this.cells.get(`${x},${y}`);
      if (bucket) for (const index of bucket) found.add(index);
    }
    // Keep source order so equal contact fractions retain the old tie-breaking.
    return [...found].sort((a, b) => a - b).map(index => this.targets[index]);
  }
}
