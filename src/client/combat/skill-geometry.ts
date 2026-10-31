import type { CombatSkill } from './types';

// Shared by native casting and the authoritative online catalog.
export function resolveSkillImpactGeometry(skill: CombatSkill): CombatSkill {
  const narrow = [361, 368].includes(+skill.id!);
  if (narrow) skill = Object.assign({}, skill, {
    geo: Object.assign({}, skill.geo, {
      k: "line", shape: "rect", width: 24, len: (skill.geo && skill.geo.len) || skill.rad || 100, pierce: true, area: 0,
    })
  });
  const impactScale = [353, 355].includes(+skill.id!) ? 2 / 3 : [302, 339, 342, 357, 318, 321].includes(+skill.id!) ? 1 / 3 : 1;
  if (impactScale !== 1 && skill.geo && skill.geo.area) {
    skill = Object.assign({}, skill, { geo: Object.assign({}, skill.geo, { area: skill.geo.area * impactScale }) });
  }
  if (!skill.ev2 && +skill.id! === 1075) skill = { ...skill, geo: { k: 'line', shape: 'rect', width: 24, len: skill.rad || 198, pierce: true, area: 0 } };
  if (!skill.ev2 && [1078, 1081, 1076].includes(+skill.id!)) skill = { ...skill, geo: { k: 'spot', r: 150, pierce: true } };
  // Fixed world-space footprint; cast range remains independent.
  if (!skill.ev2 && +skill.id! === 1070) {
    // World pixels, shared by collision, the GM overlay and the online server.
    const radiusX = 45;  // Horizontal radius (total width = radiusX * 2).
    const radiusY = 25;  // Vertical radius (total height = radiusY * 2).
    const offsetY = -12; // Negative moves the impact center upward.
    skill = {
      ...skill, geo: {
        k: 'spot', r: radiusX / QA, yScale: radiusX / radiusY, offsetY, pierce: true,
      }
    };
  }
  return skill;
}
