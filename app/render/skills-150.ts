import type { CombatCast, SpriteMetadata, WorldPoint } from '../combat/types';
import { configureVanishingDartSplash } from '../combat/skill-effects/vo-anh-xuyen';
import { configureShaolinImpact } from '../combat/skill-effects/thieu-lam-impact';
import { configureTianwangImpact } from '../combat/skill-effects/thien-vuong-impact';
import { configureIcePeacockImpact } from '../combat/skill-effects/bang-tuoc-hoat-ky';
import { configureBeggarImpact } from '../combat/skill-effects/cai-bang-impact';

// Sprite sheets này đã chứa toàn bộ chuyển động của chiêu. Chỉ tiến frame,
// không rải thành lưới và không di chuyển tâm của từng frame.
const FIXED_ANCHORS: Readonly<Record<number, 'caster' | 'target'>> = {
  1056: 'caster', // Vi Đà Hiến Xử
  1062: 'target', // Băng Vũ Lạc Tinh
  1066: 'target', // Hình Tiêu Cốt Lập
  1070: 'target', // Thiết Liên Tứ Sát
  1076: 'target', // Tật Hỏa Liệu Nguyên
  1078: 'target', // Tạo Hóa Thái Thanh
  1079: 'target', // Kiếm Thùy Tinh Hà
  1081: 'target', // Thiên Lôi Trấn Nhạc
  1114: 'target', // Ngọc Tuyền Tâm Kinh
};

export const SOUL_PALM_SPACING = 96;
interface SkillSpritePlacement extends WorldPoint { angle: number; kind: 0 | 1 | 5 }

// Kiếm Thùy Tinh Hà: start event 1107 (form 7), tách khỏi vùng đánh ở mục tiêu.
const CAST_AURAS: Readonly<Record<number, string>> = { 1079: 'advanced-369' };

export function spawnAdvancedCastVisual(id: number, caster: WorldPoint,
  sprites: Readonly<Record<string, { fly?: SpriteMetadata | null }>>): void {
  const missileId = CAST_AURAS[id];
  const sprite = missileId && sprites[missileId]?.fly;
  if (!sprite || l.quiet) return;
  l.fx.push({
    k: 'boom', s: sprite, x: caster.x, y: caster.y - 14,
    t: 0, life: yn(sprite), dir: 0, cosmetic: true,
  });
}

/** null giữ bộ phát cũ; một phần tử = một animation nguyên vẹn tại một tâm. */
export function advancedSkillLayout(id: number, caster: WorldPoint, target: WorldPoint): SkillSpritePlacement[] | null {
  if (id === 1069) {
    const y = caster.y - 8; // Lower the old caster.y - 20 release by 12px.
    return [{ x: caster.x, y, angle: Math.atan2((target.y - 14 - y) * 2, target.x - caster.x), kind: 1 }];
  }
  const anchor = FIXED_ANCHORS[id];
  if (anchor) {
    const center = anchor === 'caster' ? caster : target;
    return [{ x: center.x, y: center.y - 14, angle: 0, kind: 0 }];
  }
  const angle = Math.atan2((target.y - caster.y) * 2, target.x - caster.x);
  if (id === 1074) {
    // Three abreast, aimed parallel at release; kind 5 follows the live target.
    return [-24, 0, 24].map(side => ({
      x: caster.x - Math.sin(angle) * side,
      y: caster.y - 14 + Math.cos(angle) * side / 2,
      angle, kind: 5,
    }));
  }
  if (id === 1063) {
    // Same origin, center blade straight ahead, outer blades fan only 5.7°.
    return [-.10, 0, .10].map(offset => ({
      x: caster.x, y: caster.y - 14, angle: angle + offset, kind: 1,
    }));
  }
  if (id === 1061) return swordFlowerFormation(caster, angle);
  if (id !== 1067) return null;
  // Hai tay xuất phát hai bên người, cùng hướng về mục tiêu thay vì nối đuôi.
  return [-1, 1].map(side => {
    const offset = side * SOUL_PALM_SPACING / 2;
    const x = caster.x - Math.sin(angle) * offset;
    const y = caster.y - 20 + Math.cos(angle) * offset / 2;
    return { x, y, angle: Math.atan2((target.y - 14 - y) * 2, target.x - x), kind: 5 };
  });
}

export const SWORD_FLOWER_FORMATION = { depth: 48, width: 42 } as const;

/** Một mũi nhọn, hai cánh tầng 1, hai cánh tầng 2. Cùng vận tốc/hướng bay
 * để giữ đội hình; không hội tụ hay đuổi theo mục tiêu đang di chuyển. */
function swordFlowerFormation(caster: WorldPoint, angle: number): SkillSpritePlacement[] {
  const { depth, width } = SWORD_FLOWER_FORMATION;
  return [[depth, 0], [0, -width], [0, width], [-depth, -width * 2], [-depth, width * 2]]
    .map(([forward, side]) => ({
      x: caster.x + Math.cos(angle) * forward - Math.sin(angle) * side,
      y: caster.y - 14 + (Math.sin(angle) * forward + Math.cos(angle) * side) / 2,
      angle, kind: 1,
    }));
}

/** Mỗi đạn phát impact đúng va chạm, độc lập quota damage của cả chiêu. */
export function configureAdvancedSkillImpact(id: number, cast: CombatCast | null, sprite?: SpriteMetadata): boolean {
  if (id === 1073 || id === 1074) configureBeggarImpact(cast);
  if (id === 1063) configureIcePeacockImpact(cast);
  if (id === 1058 || id === 1059 || id === 1060) configureTianwangImpact(cast);
  if (id === 1055 || id === 1057) configureShaolinImpact(cast);
  if (id === 1069) configureVanishingDartSplash(cast);
  const impact = id === 1069 ? A0.m['advanced-359']?.fly : sprite;
  if ((id !== 1067 && id !== 1069) || !cast || !impact) return false;
  if (id === 1069 && (cast.skill.L || 1) < 11) return false;
  const previous = cast.onImpact;
  cast.onImpact = (target, position) => {
    previous?.(target, position);
    if (!l.quiet && l.fx.length + (l.fxQ?.length || 0) < mf) (l.fxQ || (l.fxQ = [])).push({
      k: 'boom', s: impact, x: position.x, y: position.y - 14,
      t: 0, life: yn(impact), dir: 0, cosmetic: true,
    });
  };
  return true;
}
