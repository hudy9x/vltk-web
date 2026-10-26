import type { CombatTarget, CombatSkill } from './types';

/** Phạm vi xuất chiêu elip: North/South = 60% West/East (giữ logic cũ). */
export const SKILL_RANGE_Y_RATIO = 0.6;
export const skillCastDistance = (actor: CombatTarget, target: CombatTarget): number =>
  Math.hypot(target.x - actor.x, (target.y - actor.y) / SKILL_RANGE_Y_RATIO) / QA;

/** Bỏ qua địa hình, nhưng vẫn phải đúng tầm và chạm hitbox/vùng đang hoạt động. */
export const skillIgnoresTerrain = (skill?: CombatSkill | null): boolean => !!skill &&
  (skill.ignoreTerrain === true || [302, 362, 365, 375, 380, 1066, 1070, 1078, 1081].includes(Number(skill.id)));
