import type { ContactEffect, SpriteMissile } from '../combat/types';

const FIRE_DELAY = 4 / 18;

/** Original fly event 1103 (missile 344): leave one flame at each movement
 * frame, visible four frames after the head passes. The small core (1101)
 * follows the same path independently so it can finish after the head expires.
 * Both layers are visual only; the piercing dragon owns all damage. */
export function spawnDragonFlame(effect: SpriteMissile & ContactEffect, step: number): void {
  if (Number(effect.combat.skill.id) !== 1073 || l.quiet) return;
  const queue = l.fxQ || (l.fxQ = []);
  const fire = A0.m['advanced-363']?.fly;
  if (step === 1 && fire && l.fx.length + queue.length < mf) {
    const { ang, spd } = effect as typeof effect & { ang: number; spd: number };
    const dx = Math.cos(ang), dy = Math.sin(ang) / 2;
    const x = effect.x - dx * spd;
    const y = effect.y - dy * spd - (effect.z + effect.hz) * wf + 12;
    const distance = spd * Math.floor(effect.lf);
    queue.push({
      k: 'mis', s: fire, cosmetic: true, x, y, x1: x, y1: y,
      x2: x + dx * distance, y2: y + dy * distance,
      t: -FIRE_DELAY, life: Math.floor(effect.lf) / K3,
      dir: (Math.round(Math.atan2(-dx, dy) / (Math.PI / 8)) + 16) % 16,
    });
  }
  const sprite = A0.m['advanced-344']?.fly;
  if (!sprite || l.fx.length + queue.length >= mf) return;
  queue.push({
    k: 'boom', s: sprite, x: effect.x,
    y: effect.y - (effect.z + effect.hz) * wf + 12,
    t: -FIRE_DELAY, life: yn(sprite), dir: 0, cosmetic: true,
  });
}
