import type { CastOptions, CombatCast, WorldPoint } from '../combat/types';
import type { LegacyEntity, LegacyRecord, SimulatorActor, SimulatorSkill } from './types';

declare function F5(skill: SimulatorSkill): LegacyRecord[];
declare function S5(skill: SimulatorSkill, event: LegacyRecord): Record<string, number>;
declare function nD(skill: SimulatorSkill, target: LegacyEntity, targets: LegacyEntity[]): LegacyEntity[];
declare function l8(skill: SimulatorSkill, target: LegacyEntity, distance: number, count: number): number;
declare function skillCastDistance(actor: LegacyEntity, target: LegacyEntity): number;
declare function queueSkillContact(actor: LegacyEntity, target: LegacyEntity, skill: SimulatorSkill,
  hit: (target: LegacyEntity) => void, options: CastOptions): CombatCast;
declare function spawnLotusImpact(actor: LegacyEntity, position: WorldPoint, skill: SimulatorSkill,
  hit: (target: LegacyEntity) => void, targets: () => LegacyEntity[]): CombatCast;
declare function G3(actor: LegacyEntity, target: LegacyEntity, skill: SimulatorSkill): unknown;
declare function showNhiepHonImpact(target: LegacyEntity, skill: SimulatorSkill): void;
declare function eD(skill: SimulatorSkill, target: LegacyEntity, targets: LegacyEntity[], collided: LegacyEntity[],
  event: LegacyRecord, context: SkillActorContext): void;

interface SkillActorContext {
  actor: SimulatorActor;
  targets(): LegacyEntity[];
  hit(skill: SimulatorSkill, target: LegacyEntity): number;
  visual<T>(action: () => T): T;
}

/** Same contact/event rules as oD, with every delayed hit bound to its SIM. */
export function castSimulatorSkill(actor: SimulatorActor, target: LegacyEntity, input: SimulatorSkill,
  valid: () => boolean, targets: () => LegacyEntity[],
  hit: SkillActorContext['hit'], withContext: SkillActorContext['visual']): CombatCast {
  const events = F5(input), lotus = +input.id! === 336 ? events.find(event => +event.sid === 382) : undefined;
  const skill = { ...input, ...(lotus ? { impactLotusHandled: true } : {}),
    ...(+input.id! === 339 ? { impactVisualTargets: new Set() } : {}) };
  const live = () => valid() ? targets() : [];
  const damage = (ability: SimulatorSkill, contact: LegacyEntity): number =>
    valid() && live().includes(contact) ? hit(ability, contact) : 0;
  const context: SkillActorContext = { actor, targets: live, hit: damage, visual: withContext };
  const extra = withContext(() => l8(skill, target, skillCastDistance(actor, target),
    1 + (skill.geo ? nD(skill, target, live()).length : 0)));
  let triggered = false;
  return queueSkillContact(actor, target, skill, contact => {
    if (!valid() || !live().includes(contact)) return;
    const amount = damage(skill, contact);
    if (+skill.id! === 339 && amount > 0) withContext(() => showNhiepHonImpact(contact, skill));
    if (!triggered) {
      triggered = true;
      const available = live();
      const collided = [contact, ...(skill.geo ? withContext(() => nD(skill, contact, available)) : [])];
      for (const event of events) withContext(() => eD(skill, contact, available, collided, event, context));
    }
  }, {
    targets: live,
    maxHits: contact => +skill.id! === 368 ? 3 : contact === target ? 1 + extra : 1,
    visual: () => { withContext(() => G3(actor, target, skill)); },
    onImpact: lotus ? (_contact, position) => {
      if (!valid()) return;
      const flower = { ...skill, parts: withContext(() => S5(skill, lotus)), stun: lotus.stun || 0, useAR: false, ev2: true, crit: 0 };
      withContext(() => spawnLotusImpact(actor, position, flower, contact => {
        if (!lotus.chance || Math.random() < lotus.chance) damage(flower, contact);
      }, live));
    } : undefined,
  });
}
