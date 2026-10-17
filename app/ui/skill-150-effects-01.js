// Use the existing modal's yellow tier headings and blue stat lines.
// Return null for legacy skills so Gf retains their existing table rendering.
var skill150EffectRows = function (skill, level) {
  const detail = skill && skill.tier === 150 && window.SKILL_150_DETAILS && window.SKILL_150_DETAILS[skill.id];
  if (!detail || !detail.effects || !detail.effects.length) return null;
  const rows = [], labels = {phys:'Sát thương vật lý',cold:'Băng sát',poison:'Độc sát',fire:'Hỏa sát',light:'Lôi sát'};
  for (const effect of detail.effects) {
    if (level < effect.minLevel) {
      rows.push(['h',`Tầng ${effect.tier} (từ cấp ${effect.minLevel}): ${effect.name}`]);
      continue;
    }
    rows.push(['ev',`Tầng ${effect.tier}: ${effect.name}`]);
    if (effect.coefficient != null) rows.push(['m',`${labels[effect.element]}: ${Math.round(effect.coefficient*100)}% sát thương chiêu chính`]);
    if (effect.count) rows.push(['m',`Số tia: ${effect.count}`]);
    if (effect.delay) rows.push(['m',`Độ trễ: ${effect.delay} giây`]);
    if (effect.trigger === 'impact') rows.push(['m','Kích hoạt khi đánh trúng mục tiêu']);
    if (effect.trigger === 'expire') rows.push(['m','Kích hoạt khi đòn chính kết thúc']);
  }
  return rows;
};
