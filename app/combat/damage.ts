import type { ContactEffect, CombatTarget } from './types';

/**
 * Chỉ xác nhận lượt trúng và chống tính trùng. onHit của JS cũ tiếp tục tính
 * damage, giảm HP, áp debuff và ghi log; không đổi công thức trong lần migration.
 */
export function applyContactHit(effect: ContactEffect, target: CombatTarget): boolean {
  const cast = effect.combat;
  if ((!cast.interval && effect.contactHits.has(target)) || target.dead || (target === v ? l.life <= 0 : target.hp! <= 0)) return false;
  if (cast.interval) {
    if (cast.targetPulses.get(target) === cast.pulse) return false;
    cast.targetPulses.set(target, cast.pulse);
    cast.onHit(target);
    return true;
  }
  effect.contactHits.add(target);
  const count = cast.hits.get(target) || 0;
  if ((!count && cast.hits.size >= cast.maxTargets) || count >= cast.maxHits(target)) return false;
  cast.hits.set(target, count + 1);
  cast.onHit(target);
  return true;
}
