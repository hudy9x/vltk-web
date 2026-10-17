import type { CrowdActor, CrowdGroup } from './types';
import { CROWD_POLICY as P } from './policy';

/** Anchored ellipses, not connected components: chains never collapse a whole row. */
export function groupCrowd(actors: readonly CrowdActor[], previous: ReadonlyMap<CrowdActor, CrowdActor>,
  depthOrder: (a: CrowdActor, b: CrowdActor) => number): CrowdGroup[] {
  const alive = new Set(actors), assigned = new Set<CrowdActor>();
  const groups: CrowdGroup[] = [], byAnchor = new Map<CrowdActor, CrowdGroup>();
  const cells = new Map<string, CrowdGroup[]>();
  const cellX = P.radiusX * 2, cellY = P.radiusY * 2;
  const distance = (actor: CrowdActor, anchor: CrowdActor) =>
    ((actor.x - anchor.x) / P.radiusX) ** 2 + ((actor.y - anchor.y) / P.radiusY) ** 2;
  function assign(actor: CrowdActor): void {
    if (assigned.has(actor)) return;
    const oldAnchor = previous.get(actor), old = oldAnchor && byAnchor.get(oldAnchor);
    let group = old && distance(actor, old.anchor) <= P.exitScale ** 2 ? old : undefined;
    if (!group) {
      const cx = Math.floor(actor.x / cellX), cy = Math.floor(actor.y / cellY);
      let best = 1;
      for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
        for (const candidate of cells.get(`${x},${y}`) || []) {
          const d = distance(actor, candidate.anchor);
          if (d <= best) { best = d; group = candidate; }
        }
      }
    }
    if (!group) {
      group = { anchor: actor, members: [] }; groups.push(group);
      const key = `${Math.floor(actor.x / cellX)},${Math.floor(actor.y / cellY)}`;
      let bucket = cells.get(key);
      if (!bucket) cells.set(key, bucket = []);
      bucket.push(group);
    }
    assigned.add(actor); group.members.push(actor); byAnchor.set(actor, group);
  }
  // Existing anchors get first refusal, preserving clusters across tiny movements.
  const oldAnchors = [...new Set(previous.values())].filter(actor => alive.has(actor)).sort(depthOrder);
  for (const actor of oldAnchors) assign(actor);
  for (const actor of [...actors].sort(depthOrder)) assign(actor);
  return groups;
}
