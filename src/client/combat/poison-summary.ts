interface PoisonSkill { parts?: Record<string, number>; poisonT?: number }
/** A poison part is a total damage budget per hit, not the damage of each tick. */
export function describePoisonDamage(skill: PoisonSkill | undefined, format = (n: number) => Math.round(n).toLocaleString('vi-VN')): string {
  const poison = Math.max(0, skill?.parts?.poison || 0);
  if (!poison) return '';
  const duration = skill?.poisonT && skill.poisonT > 0 ? skill.poisonT : 3;
  const direct = Object.entries(skill?.parts || {}).reduce((sum, [kind, value]) => sum + (kind === 'poison' ? 0 : Math.max(0, value)), 0);
  return `Trực tiếp: ${format(direct)} điểm/đòn. Tổng độc: ${format(poison)} điểm trong ${duration.toLocaleString('vi-VN', {maximumFractionDigits:2})} giây (~${format(poison / duration)} điểm/giây), trước kháng. Độc nhiều đòn được cộng dồn; PvP còn áp dụng hệ số riêng.`;
}
