/**
 * BẮT ĐẦU ĐỌC COMBAT TẠI ĐÂY.
 *
 * 1. JS oD/eD chọn skill, kiểm tra mana/cooldown rồi gọi castSkill.
 * 2. casting.ts tạo cast, nối đạn/vùng chiêu với callback onHit.
 * 3. Game loop Td gọi updateCombat(dt), kể cả khi tắt/giảm FX.
 * 4. simulation.ts cập nhật chuyển động; collision.ts tìm hitbox giao nhau.
 * 5. damage.ts kiểm tra số lượt trúng/pulse rồi mới gọi onHit.
 * 6. Callback JS cũ tính damage/debuff/HP/log; render.ts chỉ vẽ fallback.
 *
 * config.ts: phạm vi xuất chiêu và địa hình.
 * casting.ts: hiệu chỉnh vùng ảnh hưởng theo skill, giữ nguyên số liệu cũ.
 * impact-fields.ts: hoa sen theo từng va chạm của tia Băng Tung Vô Ảnh, vùng 80.
 * geometry.ts: công thức hình tròn/chữ nhật; types.ts: dữ liệu đi qua từng bước.
 *
 * legacy-bridge.js nối API cũ với các export này. legacy-globals.d.ts mô tả
 * state/FX JS dùng chung; không nhân bản player/world và không đổi thứ tự tick.
 */
export { queueSkillContact, queueSkillContact as castSkill, registerCombatMissile } from './casting';
export { advanceSkillContacts, advanceSkillContacts as updateCombat, advanceContactEffect, advanceCombatMissile } from './simulation';
export { contactFraction, rectangleContactFraction } from './geometry';
export { collideCombatEffect } from './collision';
export { applyContactHit } from './damage';
export { drawContactProjectile, drawContactProjectile as drawFallbackProjectile } from './render';
export { SKILL_RANGE_Y_RATIO, skillCastDistance, skillIgnoresTerrain } from './config';
export { spawnLotusImpact, LOTUS_IMPACT_RADIUS } from './impact-fields';
export type { CombatCast, CombatTarget, CombatSkill, SkillGeometry, ContactEffect, CastOptions, ContactHitHandler, ContactImpactHandler, WorldPoint } from './types';
