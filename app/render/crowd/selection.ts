import type { CrowdActor, LabelLike } from './types';

/** Selected targets and all bosses remain visible even if their count exceeds a budget. */
export function protectedActor(actor: CrowdActor, selected: ReadonlySet<CrowdActor>): boolean {
  return selected.has(actor) || actor.cls === 'boss' || !!actor.goldBoss;
}
export function chooseRepresentatives(members: readonly CrowdActor[], budget: number,
  compare: (a: CrowdActor, b: CrowdActor) => number, selected: ReadonlySet<CrowdActor>): CrowdActor[] {
  const sorted = [...members].sort(compare);
  const protectedCount = sorted.filter(actor => protectedActor(actor, selected)).length;
  return sorted.slice(0, Math.max(budget, protectedCount));
}

/** One actual number per representative in a crowded group; never adds other mobs' damage. */
export function selectCrowdLabels<T extends LabelLike>(labels: readonly T[],
  clustered: ReadonlySet<CrowdActor>, representatives: ReadonlySet<CrowdActor>): T[] {
  const newest = new Map<CrowdActor, T>();
  for (const label of labels) if (label.life > 0 && label.target && clustered.has(label.target) && representatives.has(label.target))
    newest.set(label.target, label);
  return labels.filter(label => !label.target || !clustered.has(label.target) || newest.get(label.target) === label);
}
