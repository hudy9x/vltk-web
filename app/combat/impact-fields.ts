import { queueSkillContact } from './casting';
import type { CombatCast, CombatSkill, CombatTarget, ContactHitHandler, SpriteMetadata, WorldPoint } from './types';

export const LOTUS_IMPACT_RADIUS = 80;

/**
 * Mỗi va chạm tạo một hoa sen/vùng độc lập, lấy bản sao tọa độ lúc trúng.
 * Mỗi quái nhận một hit từ mỗi hoa sen; nhiều hoa sen được phép cùng gây damage.
 * Mô phỏng vẫn tạo vùng khi quiet/lowFx hoặc thiếu ảnh; render không quyết định HP.
 */
export function spawnLotusImpact(actor: CombatTarget, position: WorldPoint, skill: CombatSkill,
  onHit: ContactHitHandler): CombatCast {
  const center = { x: position.x, y: position.y };
  const sprite: SpriteMetadata | undefined | null = A0.m[188]?.fly;
  const duration = sprite ? yn(sprite) : 1.2;
  const areaSkill: CombatSkill = { ...skill, ev2: true, geo: { k: 'spot', r: LOTUS_IMPACT_RADIUS, pierce: true } };
  return queueSkillContact(actor, center, areaSkill, onHit, {
    windup: 0, duration, maxHits: () => 1, hideFallbackVisual: true,
    visual: () => {
      if (!l.quiet && sprite) l.fx.push({
        k: 'boom', s: sprite, x: center.x, y: center.y - 14,
        t: 0, life: duration, dir: 0,
      });
    },
  });
}
