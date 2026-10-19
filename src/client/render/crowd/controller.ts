import type { CrowdActor, CrowdFrame, CrowdView } from './types';
import { CROWD_POLICY as P } from './policy';
import { groupCrowd } from './grouping';
import { chooseRepresentatives, selectCrowdLabels } from './selection';

/** Renderer-owned memory. No flags, positions, health or hitboxes are written to actors. */
export function createCrowdVisibility() {
  let time = 0;
  let membership = new Map<CrowdActor, CrowdActor>();
  const ids = new WeakMap<CrowdActor, number>(); let nextId = 0;
  const bodyMemory = new Map<CrowdActor, number>(), damageMemory = new Map<CrowdActor, number>();
  const id = (actor: CrowdActor) => {
    let value = ids.get(actor); if (value == null) ids.set(actor, value = ++nextId);
    return value;
  };
  function update(actors: readonly CrowdActor[], dt: number, view?: CrowdView,
    selected: ReadonlySet<CrowdActor> = new Set(), labelTargets: readonly CrowdActor[] = []): CrowdFrame {
    time += Math.max(0, dt);
    const margin = P.viewportMargin;
    const onScreen = (actor: CrowdActor) => !actor.arenaSim && (!view ||
      actor.x >= view.x - margin && actor.x <= view.x + view.width + margin &&
      actor.y >= view.y - margin && actor.y <= view.y + view.height + margin);
    const bodyActors = actors.filter(actor => !actor.dead && !(actor.hp != null && actor.hp <= 0) && onScreen(actor));
    const bodySet = new Set(bodyActors);
    // Dying bodies may already have left l.enemies while their numbers are alive.
    // Keep them in display groups only; they can never become visible bodies.
    const eligible = [...new Set([...bodyActors, ...labelTargets.filter(onScreen)])];
    for (const actor of eligible) id(actor);
    const live = new Set(eligible);
    for (const memory of [bodyMemory, damageMemory]) for (const actor of memory.keys()) if (!live.has(actor)) memory.delete(actor);
    const depthOrder = (a: CrowdActor, b: CrowdActor) => b.y - a.y || id(a) - id(b);
    const groups = groupCrowd(eligible, membership, depthOrder);
    const bodies = new Set<CrowdActor>(), damageTargets = new Set<CrowdActor>(), clustered = new Set<CrowdActor>();
    const counts = new Map<CrowdActor, number>(), nextMembership = new Map<CrowdActor, CrowdActor>();
    const priority = (actor: CrowdActor) => selected.has(actor) ? 3 : actor.goldBoss ? 2 : actor.cls === 'boss' ? 1 : 0;
    const compare = (memory: Map<CrowdActor, number>, preferred?: ReadonlySet<CrowdActor>) => (a: CrowdActor, b: CrowdActor) =>
      priority(b) - priority(a) || Number(preferred?.has(b) || false) - Number(preferred?.has(a) || false) ||
      Number((memory.get(b) || 0) > time) - Number((memory.get(a) || 0) > time) || depthOrder(a, b);
    const remember = (memory: Map<CrowdActor, number>, chosen: CrowdActor[]) => {
      for (const actor of chosen) if ((memory.get(actor) || 0) <= time) memory.set(actor, time + P.holdSeconds);
    };
    for (const group of groups) {
      for (const actor of group.members) nextMembership.set(actor, group.anchor);
      const aliveMembers = group.members.filter(actor => bodySet.has(actor));
      if (group.members.length <= P.bodies) {
        for (const actor of aliveMembers) bodies.add(actor);
        for (const actor of group.members) damageTargets.add(actor);
        continue;
      }
      for (const actor of group.members) clustered.add(actor);
      const visible = chooseRepresentatives(aliveMembers, P.bodies, compare(bodyMemory), selected);
      for (const actor of visible) bodies.add(actor);
      const damage = chooseRepresentatives(group.members, P.damageTargets, compare(damageMemory, new Set(visible)), selected);
      for (const actor of damage) damageTargets.add(actor);
      remember(bodyMemory, visible);
      if (aliveMembers.length > P.bodies) counts.set(visible[0], aliveMembers.length);
    }
    membership = nextMembership;
    return { bodies, damageTargets, clustered, counts,
      selectLabels: labels => {
        // Hidden bodies can be the only recipients of an AOE hit. Choose from
        // the live label queue so the group still gives real hit feedback.
        const actual = new Set(labels.filter(label => label.life > 0 && label.target).map(label => label.target));
        damageTargets.clear();
        for (const group of groups) {
          const candidates = group.members.filter(actor => actual.has(actor));
          const chosen = group.members.length <= P.bodies ? candidates :
            chooseRepresentatives(candidates, P.damageTargets, compare(damageMemory, bodies), selected);
          for (const actor of chosen) damageTargets.add(actor);
          remember(damageMemory, chosen);
        }
        return selectCrowdLabels(labels, clustered, damageTargets);
      } };
  }
  return { update };
}
