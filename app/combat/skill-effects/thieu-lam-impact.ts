import type { CombatCast } from '../types';

export const SHAOLIN_IMPACT_RADIUS = 96;

/** Chưởng/đao ảnh hưởng các thân quái cạnh điểm trúng. Các đạn trong cùng
 * lượt xuất chiêu chia sẻ quota để giao nhau không cộng sát thương nhiều lần. */
export function configureShaolinImpact(cast: CombatCast | null): void {
  if (!cast || ![1055, 1057].includes(Number(cast.skill.id))) return;
  cast.skill = { ...cast.skill, geo: {
    ...cast.skill.geo, k: 'line', area: SHAOLIN_IMPACT_RADIUS,
  } };
  cast.maxTargets = Infinity;
}
