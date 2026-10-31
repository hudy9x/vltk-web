import type { ContactEffect, CombatTarget } from './types';
import { contactFraction, rectangleContactFraction } from './geometry';
import { applyContactHit } from './damage';
import { SKILL_RANGE_Y_RATIO, skillCastDistance } from './config';
import { queryContactTargets } from './spatial/contact-query';

/** Không gộp các đạn khác nhau đánh vào cùng quái; không phát lại qua mỗi tick. */
function notifyProjectileImpact(effect: ContactEffect, target: CombatTarget): void {
  if (!effect.combat.onImpact || effect.impactTargets?.has(target) || target.dead ||
    (target === v ? l.life <= 0 : target.hp! <= 0)) return;
  (effect.impactTargets || (effect.impactTargets = new Set())).add(target);
  effect.combat.onImpact(target, { x: target.x, y: target.y });
}

// Chọn va chạm theo thứ tự trên đường đi, rồi mới gọi damage và tạo FX trúng.
export function collideCombatEffect(effect: ContactEffect, x0: number, y0: number, x1: number, y1: number): boolean {
  const cast = effect.combat;
  if (cast.pulseCount) {
    // All sprites share this clock: never multiply damage by the FX count.
    // Catch up overdue strikes before expiry so low FPS does not lose hits.
    while (cast.pulse + 1 < cast.pulseCount && cast.elapsed + 1e-9 >= cast.nextPulse) {
      cast.pulse++;
      cast.nextPulse = cast.windup + (cast.pulse + 1) * cast.interval;
      collideCombatPulse(effect, x0, y0, x1, y1);
    }
    return false;
  }
  if (cast.interval) {
    if (cast.elapsed >= cast.duration! - 1e-9) return false;
    if (cast.elapsed + 1e-9 >= cast.nextPulse) {
      cast.pulse++;
      cast.nextPulse = cast.pulse === 0 ? cast.elapsed + cast.interval : cast.nextPulse + cast.interval;
      cast.pulseFrame = cast.elapsed;
    } else if (cast.pulseFrame !== cast.elapsed) return false;
  }
  return collideCombatPulse(effect, x0, y0, x1, y1);
}

function collideCombatPulse(effect: ContactEffect, x0: number, y0: number, x1: number, y1: number): boolean {
  const cast = effect.combat;
  const staticArea = effect.staticArea || effect.k === "boom" || (effect.k === "jm" && (!effect.kind || effect.still));
  const geo = cast.skill.geo || {};
  if (staticArea && geo.shape === "rect") {
    x0 = cast.origin.x; y0 = cast.origin.y;
    x1 = x0 + Math.cos(cast.direction) * geo.len! * QA;
    y1 = y0 + Math.sin(cast.direction) * geo.len! * QA / 2;
  }
  if (staticArea && geo.offsetY) { y0 += geo.offsetY; y1 += geo.offsetY; }
  const radius = staticArea
    ? Math.max(8, (geo.r || geo.area || 12) * QA)
    : 8;
  const yScale = staticArea ? geo.yScale || (geo.k === "self" ? 1 / SKILL_RANGE_Y_RATIO : 2) : 2;
  const extent = geo.shape === "rect" ? geo.width! * QA / 2 : radius;
  const candidates = queryContactTargets(cast, {
    minX: Math.min(x0, x1) - extent, maxX: Math.max(x0, x1) + extent,
    minY: Math.min(y0, y1) - extent / yScale, maxY: Math.max(y0, y1) + extent / yScale,
  });
  const contacts = candidates
    .filter(target => target && !target.dead && (target === v ? l.life > 0 : target.hp! > 0) && (cast.interval || !effect.contactHits.has(target)))
    .map(target => ({ target, fraction: geo.shape === "rect"
      ? rectangleContactFraction(x0, y0, x1, y1, target, geo.width! * QA / 2, cast.direction)
      : contactFraction(x0, y0, x1, y1, target, radius, yScale) }))
    .filter((contact): contact is { target: typeof contact.target; fraction: number } => contact.fraction != null)
    .sort((a, b) => a.fraction - b.fraction);
  for (const { target, fraction } of contacts) {
    const x = x0 + (x1 - x0) * fraction, y = y0 + (y1 - y0) * fraction;
    if (!cast.ignoreTerrain && typeof mt === "function" && !mt(x0, y0 + 14, target.x, target.y)) continue;
    if (effect.melee && !staticArea && skillCastDistance(cast.actor, target) > (cast.skill.rad || 75) + (target.r || 12) / QA) continue;
    // Va chạm vật lý vẫn phát impact khi một đạn khác đã dùng hết quota damage.
    if (!staticArea) notifyProjectileImpact(effect, target);
    if (applyContactHit(effect, target)) {
      if (effect.k === "jm") gf(effect, x, y);
      else if (effect.k === "mis" && effect.hit && !l.quiet) {
        (l.fxQ || (l.fxQ = [])).push({ k: "boom", s: effect.hit, x, y, t: 0, life: yn(effect.hit), dir: effect.dir || 0 });
      }
      else if (effect.k === "contact") x8(cast.actor, target, cast.skill);
      // An explosion splashes only after its projectile actually collides.
      if (geo.area) {
        for (const other of queryContactTargets(cast, {
          minX: x - geo.area * QA, maxX: x + geo.area * QA,
          minY: y - geo.area * QA / 2, maxY: y + geo.area * QA / 2,
        })) {
          if (other !== target && contactFraction(x, y, x, y, other, geo.area * QA) != null && (cast.ignoreTerrain || mt(x, y + 14, other.x, other.y))) {
            if (applyContactHit(effect, other) && effect.k === "jm") gf(effect, other.x, other.y - 14);
          }
        }
      }
    }
    const stops = !geo.pierce && ((!staticArea && (effect.k === "contact" || effect.k === "mis")) || (!staticArea && effect.cv));
    if (stops) {
      // A projectile stops at the impact, but every body overlapping that
      // same narrow impact receives the hit, including tightly stacked mobs.
      for (const contact of contacts) {
        const other = contact.target;
        if (other !== target && contactFraction(x, y, x, y, other, radius) != null &&
          (cast.ignoreTerrain || mt(x, y + 14, other.x, other.y))) {
          notifyProjectileImpact(effect, other);
          applyContactHit(effect, other);
        }
      }
      effect.x = x; effect.y = y;
      return true;
    }
  }
  return false;
}
