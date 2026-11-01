import { queueSkillContact } from '../casting';
import type { CombatCast, ContactEffect, WorldPoint } from '../types';

export const ICE_PEACOCK_IMPACT_RADIUS = 96;
export const ICE_PEACOCK_SHARD_DAMAGE = .1;
const configured = new WeakSet<CombatCast>();

function spawnIcePeacockShards(parent: CombatCast, position: WorldPoint): void {
  const skill = { ...parent.skill, id: 1064, n: 'Băng Ngưng Hàn Yên', ev2: true, melee: false, useAR: false, hitScale: ICE_PEACOCK_SHARD_DAMAGE,
    parts: Object.fromEntries(Object.entries(parent.skill.parts || {}).map(([key, value]) => [key, Number(value) * ICE_PEACOCK_SHARD_DAMAGE])),
    geo: { k: 'fan' as const, n: 5, pierce: true, area: 0 } };
  const sprite = A0.m['advanced-326']?.fly || undefined, radius = ICE_PEACOCK_IMPACT_RADIUS * QA;
  const life = radius / 432;
  const cast = queueSkillContact(parent.actor, position, skill, target => parent.onHit(target, skill), {
    windup: 0, maxHits: () => 5, maxTargets: Infinity, targets: parent.targets,
    visual: () => {
      for (let index = 0; index < 5; index++) {
        const angle = parent.direction + index * Math.PI * 2 / 5;
        l.fx.push({ k: 'mis', s: sprite, x: position.x, y: position.y - 14,
          x1: position.x, y1: position.y - 14,
          x2: position.x + Math.cos(angle) * radius, y2: position.y - 14 + Math.sin(angle) * radius / 2,
          t: 0, life, dir: ((Math.round(angle / (Math.PI / 8)) % 16) + 16) % 16 });
      }
    },
  });
  if (l.quiet || !sprite) l.fx = l.fx.filter(effect => effect.combat !== cast);
}

/** Each blade triggers five 10% shards once; no full-strength primary splash. */
export function configureIcePeacockImpact(cast: CombatCast | null): void {
  if (!cast || Number(cast.skill.id) !== 1063 || cast.skill.ev2 || configured.has(cast)) return;
  configured.add(cast);
  cast.skill = { ...cast.skill, geo: {
    ...cast.skill.geo, area: 0,
  } };
  cast.maxTargets = Infinity;
  const previous = cast.onImpact, impacts = new WeakSet<ContactEffect>();
  cast.onImpact = (target, position, projectile) => {
    previous?.(target, position, projectile);
    if ((cast.skill.L || 1) < 11 || !projectile || impacts.has(projectile)) return;
    impacts.add(projectile);
    spawnIcePeacockShards(cast, position);
  };
}
