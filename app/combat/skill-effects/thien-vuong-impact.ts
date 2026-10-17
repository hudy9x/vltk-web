import type { CombatCast } from '../types';

export const TIANWANG_IMPACT_RADIUS = 96;

/** Hào Hùng Trảm, Tung Hoành Bát Hoang và Bá Vương Tạm Kim gây sát thương
 * quanh điểm trúng. Giữ quota chung giữa các đạn để không nhân damage. */
export function configureTianwangImpact(cast: CombatCast | null): void {
  if (!cast || ![1058, 1059, 1060].includes(Number(cast.skill.id))) return;
  cast.skill = { ...cast.skill, geo: {
    ...cast.skill.geo, k: 'line', area: TIANWANG_IMPACT_RADIUS,
  } };
  cast.maxTargets = Infinity;
}
