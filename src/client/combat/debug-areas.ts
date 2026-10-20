import { SKILL_RANGE_Y_RATIO } from './config';

/** GM overlay in world coordinates. Mirrors collision geometry, without
 * including target body radii or changing the combat/visual clocks. */
export function drawSkillDamageAreas(context: CanvasRenderingContext2D): void {
  const seen = new Set<string>();
  context.save();
  context.globalAlpha = 1;
  context.lineWidth = 2;
  context.strokeStyle = '#ffb65c';
  context.fillStyle = 'rgba(255,160,64,0.10)';
  context.setLineDash([6, 4]);
  const ellipse = (x: number, y: number, radius: number, ratio: number): void => {
    const key = `${x}:${y}:${radius}:${ratio}`;
    if (seen.has(key)) return;
    seen.add(key);
    context.beginPath();
    context.ellipse(x, y + 14, radius, radius * ratio, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  };
  try {
    for (const effect of l.combatProjectiles || []) {
      const cast = effect.combat, geo = cast.skill.geo || {};
      if (effect.contactAlive === false || cast.zone !== l.zoneShown || l.town || l.deadT > 0) continue;
      if ((effect.k === 'jm' || effect.k === 'contact') ? effect.age < 0 : effect.t < 0) continue;
      const fixed = effect.staticArea || effect.k === 'boom' || (effect.k === 'jm' && (!effect.kind || effect.still));
      let x = effect.x, y = effect.y;
      if (effect.k === 'jm') y -= (effect.z + effect.hz) * wf;
      if (effect.k === 'mis') {
        const progress = E(effect.t / effect.life, 0, 1);
        x = effect.x1 + (effect.x2 - effect.x1) * progress;
        y = effect.y1 + (effect.y2 - effect.y1) * progress;
      }
      if (geo.shape === 'rect') {
        const direction = cast.direction;
        const start = fixed ? cast.origin : { x, y };
        const length = fixed ? (geo.len || 0) * QA : 0;
        const width = (geo.width || 0) * QA / 2;
        const cos = Math.cos(direction), sin = Math.sin(direction);
        context.beginPath();
        for (const [index, [along, side]] of [[0, -width], [length, -width], [length, width], [0, width]].entries()) {
          const px = start.x + cos * along - sin * side;
          const py = start.y + 14 + (sin * along + cos * side) / 2;
          if (index === 0) context.moveTo(px, py); else context.lineTo(px, py);
        }
        context.closePath(); context.fill(); context.stroke();
      } else {
        ellipse(x, y, fixed ? Math.max(8, (geo.r || geo.area || 12) * QA) : 8,
          fixed && geo.k === 'self' ? SKILL_RANGE_Y_RATIO : .5);
      }
      if (geo.area) ellipse(x, y, geo.area * QA, .5);
    }
  } finally { context.restore(); }
}
