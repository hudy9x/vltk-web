import { advancedSkillLayout } from '../../render/skills-150';
import type { CombatCast, CombatTarget, ContactEffect, SpriteMissile } from '../types';

export const BEGGAR_STAFF_IMPACT_RADIUS = 96;

export function configureBeggarImpact(cast: CombatCast | null): void {
  if (!cast) return;
  const id = Number(cast.skill.id);
  if (id !== 1073 && id !== 1074) return;
  cast.skill = { ...cast.skill, geo: {
    ...cast.skill.geo, k: 'line',
    // Lục Long passes through bodies; the staff rays stop on contact and splash.
    pierce: id === 1073, area: id === 1074 ? BEGGAR_STAFF_IMPACT_RADIUS : 0,
  } };
  cast.maxTargets = Infinity;
}

/** Missing/hidden images must retain the same native-frame flights and homing. */
export function spawnBeggarFallback(cast: CombatCast, target: CombatTarget): boolean {
  const id = Number(cast.skill.id);
  if (cast.skill.ev2 || (id !== 1073 && id !== 1074)) return false;
  const placements = advancedSkillLayout(id, cast.actor, target)!;
  const speed = id === 1073 ? 40 : 24, frames = id === 1073 ? 17 : 24;
  for (const placement of placements) {
    const effect = {
      k: 'jm' as const, m: { fly: null }, mid: id === 1073 ? 'advanced-335' : 'advanced-336',
      combat: cast, contactHits: new Set<CombatTarget>(),
      x: placement.x, y: placement.y, ang: placement.angle, kind: placement.kind,
      age: -cast.windup * K3 - (placement.delayFrames || 0), lf: frames,
      spd: speed, z: 0, hz: 0, za: 0, vz: 0,
      cv: true, still: false, loop: true, tgt: target, sh: 0, tr: [], traveled: 0,
    };
    (l.combatProjectiles ||= []).push(effect as SpriteMissile & ContactEffect);
    cast.emitted++;
  }
  return true;
}
