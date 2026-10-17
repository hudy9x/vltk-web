import type { CombatCast, CombatTarget } from '../types';
import { TargetGrid } from './target-grid';
import type { Bounds } from './target-grid';

type Provider = CombatCast['targets'];
interface TargetSnapshot { targets: CombatTarget[]; grid?: TargetGrid }
let frame: Map<Provider, TargetSnapshot> | undefined;
export function defaultCombatTargets(): CombatTarget[] { return _1(); }
export function beginContactFrame(): void { frame = new Map(); }
export function endContactFrame(): void { frame = undefined; }

/** Providers are sampled once per simulation tick; dead/HP checks remain live. */
export function queryContactTargets(cast: CombatCast, bounds: Bounds): CombatTarget[] {
  // Direct calls (tools/tests) must never retain snapshots between invocations.
  if (!frame) return cast.targets();
  let snapshot = frame.get(cast.targets);
  if (!snapshot) {
    const targets = cast.targets();
    snapshot = { targets, grid: targets.length >= 64 ? new TargetGrid(targets) : undefined };
    frame.set(cast.targets, snapshot);
  }
  return snapshot.grid ? snapshot.grid.query(bounds) : snapshot.targets;
}
