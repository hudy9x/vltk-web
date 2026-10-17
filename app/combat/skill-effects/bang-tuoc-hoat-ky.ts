import type { CombatCast } from '../types';

export const ICE_PEACOCK_IMPACT_RADIUS = 96;

/** Ba đao dùng chung lượt trúng; vùng va chạm chỉ lan sang quái lân cận. */
export function configureIcePeacockImpact(cast: CombatCast | null): void {
  if (!cast || Number(cast.skill.id) !== 1063) return;
  cast.skill = { ...cast.skill, geo: {
    ...cast.skill.geo, area: ICE_PEACOCK_IMPACT_RADIUS,
  } };
  cast.maxTargets = Infinity;
}
