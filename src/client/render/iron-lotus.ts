import type { ContactEffect, SpriteMissile } from '../combat/types';

// Original fly event: 1070 -> 1098 every 18 frames, unlocked at level 11.
// Child 1098 is form 3 / num 8, using missile 360 (fly + impact).
const EVENT_INTERVAL = 18;
const RAYS = 8;

/** Cosmetic child event, driven by the live parent instead of wall-clock timers.
 * Damage remains owned by combat; these rays never reuse its primary hit callback. */
export function advanceIronLotusVisual(effect: SpriteMissile & ContactEffect, before: number): void {
  if (+effect.combat.skill.id! !== 1070 || (effect.combat.skill.L || 1) < 11 || l.quiet) return;
  const missile = A0.m['advanced-360'];
  if (!missile?.fly) return;
  const end = Math.min(effect.age, effect.lf);
  for (let frame = (Math.floor((Math.max(0, before) + 1e-9) / EVENT_INTERVAL) + 1) * EVENT_INTERVAL;
    frame <= end + 1e-9; frame += EVENT_INTERVAL) {
    const queue = l.fxQ || (l.fxQ = []);
    if (l.fx.length + queue.length + RAYS > mf) continue;
    const life = missile.life || .67;
    const distance = (missile.spd || 576) * life;
    for (let ray = 0; ray < RAYS; ray++) {
      const angle = ray * Math.PI * 2 / RAYS;
      const dx = Math.cos(angle), dy = Math.sin(angle) / 2;
      // Same 16-direction mapping as Ds in the legacy sprite renderer.
      const dir = (Math.round(Math.atan2(-dx, dy) / (Math.PI / 8)) + 16) % 16;
      queue.push({
        k: 'mis', s: missile.fly, hit: missile.hit, cosmetic: true,
        x: effect.x, y: effect.y, x1: effect.x, y1: effect.y,
        x2: effect.x + dx * distance, y2: effect.y + dy * distance,
        t: 0, life, dir,
      });
    }
  }
}
