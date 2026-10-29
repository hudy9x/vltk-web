const native = require('./runtime.cjs');
// Same narrow rectangles as combat/casting.ts. Advanced piercing flags come
// from the native configureAdvancedSkillImpact functions, including level gates.
const rectangles = new Set([361, 368, 1075]);
exports.linearProjectile = function (skill) {
  const contact = native.contactGeometry(skill);
  const rectangle = rectangles.has(+skill.id);
  const geometry = contact.geometry;
  if (!rectangle && !(geometry?.k === 'line' && geometry.pierce)) return null;
  return {
    range: Math.max(1, (geometry?.len || skill.rad || 100) * contact.scale),
    width: rectangle ? 24 * contact.scale : 16,
    speed: Math.max(1, Math.min(4000, contact.speed)),
    ignoreTerrain: contact.ignoreTerrain,
  };
};
