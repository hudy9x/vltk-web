import type { CombatCast, SpriteMetadata, WorldPoint } from '../combat/types';

// Sprite sheets này đã chứa toàn bộ chuyển động của chiêu. Chỉ tiến frame,
// không rải thành lưới và không di chuyển tâm của từng frame.
const FIXED_ANCHORS: Readonly<Record<number, 'caster' | 'target'>> = {
  1056: 'caster', // Vi Đà Hiến Xử
  1062: 'target', // Băng Vũ Lạc Tinh
  1066: 'target', // Hình Tiêu Cốt Lập
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
  const anchor = FIXED_ANCHORS[id];
  if (anchor) {
    const center = anchor === 'caster' ? caster : target;
    return [{ x: center.x, y: center.y - 14, angle: 0, kind: 0 }];
  }
  const angle = Math.atan2((target.y - caster.y) * 2, target.x - caster.x);
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

/** Mỗi bàn tay phát impact đúng va chạm, kể cả khi tay kia đã dùng quota damage. */
export function configureAdvancedSkillImpact(id: number, cast: CombatCast | null, sprite?: SpriteMetadata): boolean {
  if (id !== 1067 || !cast || !sprite) return false;
  const previous = cast.onImpact;
  cast.onImpact = (target, position) => {
    previous?.(target, position);
    if (!l.quiet) (l.fxQ || (l.fxQ = [])).push({
      k: 'boom', s: sprite, x: position.x, y: position.y - 14,
      t: 0, life: yn(sprite), dir: 0, cosmetic: true,
    });
  };
  return true;
}
