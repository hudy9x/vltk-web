import type { CombatCast } from '../types';

/** Reuse Ngạo Tuyết's stationary column at each physical body contact. */
export function configureKunlunWindImpact(cast: CombatCast | null): void {
  if (!cast || Number(cast.skill.id) !== 1080) return;
  cast.skill = { ...cast.skill, geo: {
    ...cast.skill.geo, k: 'line', pierce: true, area: 0,
  } };
  cast.maxTargets = Infinity;
  const previous = cast.onImpact;
  cast.onImpact = (target, position) => {
    previous?.(target, position);
    const sprite = A0.m[179]?.fly;
    if (!sprite || l.quiet || l.fx.length + (l.fxQ?.length || 0) >= mf) return;
    // Missile 179 lives 15 legacy frames; fit its whole sheet into that time.
    const life = 15 / K3;
    (l.fxQ || (l.fxQ = [])).push({
      k: 'boom', s: sprite, x: position.x, y: position.y - 14,
      t: 0, life, sp: sprite.n * sprite.ms / 1000 / life, dir: 0, cosmetic: true,
    });
  };
}
