import type { CombatCast } from '../types';

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
