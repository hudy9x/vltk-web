const native = require('./runtime.cjs');
// Physical flights use Wn/KP movement data, even when a skill is tagged melee.
// Advanced piercing flags retain the native level gates and fixed rectangles.
const rectangles = new Set([361, 368, 1075]);
exports.linearProjectile = function (skill) {
  const contact = native.contactGeometry(skill);
  const rectangle = rectangles.has(+skill.id);
  const geometry = contact.geometry;
  const piercing = rectangle || geometry?.k === 'line' && !!geometry.pierce;
  if (!piercing && (!contact.moving || ['spot','self'].includes(geometry?.k))) return null;
  return {
    range: Math.max(1, piercing ? (geometry?.len || skill.rad || 100) * contact.scale : contact.range),
    width: rectangle ? 24 * contact.scale : 16,
    speed: Math.max(1, Math.min(4000, contact.speed)),
    ignoreTerrain: contact.ignoreTerrain,
    pierce: !!piercing,
    area: Math.max(0,(geometry?.area || 0) * contact.scale),
    homing: contact.homing,
  };
};
