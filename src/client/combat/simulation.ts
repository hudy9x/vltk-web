import type { ContactEffect, SpriteMissile } from './types';
import { collideCombatEffect } from './collision';
import { SKILL_RANGE_Y_RATIO } from './config';
import { advanceActorActions } from './action-state';
import { beginContactFrame, endContactFrame } from './spatial/contact-query';
import { advanceIronLotusVisual } from '../render/iron-lotus';
import { spawnDragonFlame } from '../render/dragon-fire';
import { advanceSwordFlowerVisual } from './skill-effects/kiem-hoa-van-tinh';

// dt luôn tính bằng giây. Riêng đạn sprite đổi sang frame bằng K3 như code cũ.
export function advanceCombatMissile(effect: SpriteMissile & ContactEffect, dt: number): boolean {
  const before = effect.age;
  effect.age += dt * K3;
  if (effect.age < 0) return true;
  advanceIronLotusVisual(effect, before);
  if ((!effect.kind || effect.still) && !(effect.za && effect.z > 20)) {
    if (collideCombatEffect(effect, effect.x, effect.y - (effect.z + effect.hz) * wf, effect.x, effect.y - (effect.z + effect.hz) * wf)) return false;
  }
  for (let step = Math.max(0, Math.floor(before)) + 1; step <= Math.floor(effect.age) && step <= effect.lf; step++) {
    const x = effect.x, y = effect.y - (effect.z + effect.hz) * wf;
    const age = effect.age;
    effect.age = step;
    KP(effect);
    effect.age = age;
    let reachedLimit = false;
    if (effect.travelLimit) {
      const distance = Math.hypot(effect.x - x, (effect.y - (effect.z + effect.hz) * wf - y) / SKILL_RANGE_Y_RATIO);
      const remaining = Math.max(0, effect.travelLimit - effect.traveled);
      if (distance > remaining) {
        const fraction = remaining / distance;
        effect.x = x + (effect.x - x) * fraction;
        effect.y = y + (effect.y - (effect.z + effect.hz) * wf - y) * fraction + (effect.z + effect.hz) * wf;
        reachedLimit = true;
      }
      effect.traveled += Math.min(distance, remaining);
    }
    if (!effect.combat.ignoreTerrain && Z0.g && effect.kind && (!R2(effect.x, effect.y + 14) || !mt(x, y + 14, effect.x, effect.y + 14))) return false;
    spawnDragonFlame(effect, step);
    if (!(effect.za && effect.z > 20) && collideCombatEffect(effect, x, y, effect.x, effect.y - (effect.z + effect.hz) * wf)) return false;
    if (reachedLimit) return false;
  }
  return effect.age < effect.lf;
}

export function advanceContactEffect(effect: ContactEffect, dt: number): boolean {
  if (effect.k === "jm") return advanceCombatMissile(effect, dt);
  if (effect.k === "contact") {
    const before = effect.age;
    effect.age += dt;
    if (effect.age < 0) return true;
    const x = effect.x, y = effect.y;
    if (!effect.melee && !effect.staticArea) {
      const angle = effect.ang;
      const distance = effect.speed * (effect.age - Math.max(0, before));
      effect.x += Math.cos(angle) * distance;
      effect.y += Math.sin(angle) * distance / 2;
    }
    if (!effect.combat.ignoreTerrain && Z0.g && (!R2(effect.x, effect.y + 14) || !mt(x, y + 14, effect.x, effect.y + 14))) return false;
    return !collideCombatEffect(effect, x, y, effect.x, effect.y) && effect.age < effect.life;
  }
  const before = effect.t;
  const oldProgress = E(Math.max(0, before) / effect.life, 0, 1);
  effect.t += dt;
  if (effect.t < 0) return true;
  if (effect.k === "mis") {
    const progress = E(effect.t / effect.life, 0, 1);
    const x = effect.x1 + (effect.x2 - effect.x1) * progress;
    const y = effect.y1 + (effect.y2 - effect.y1) * progress;
    const x0 = effect.x1 + (effect.x2 - effect.x1) * oldProgress;
    const y0 = effect.y1 + (effect.y2 - effect.y1) * oldProgress;
    if (!effect.combat.ignoreTerrain && Z0.g && (!R2(x, y + 14) || !mt(x0, y0 + 14, x, y + 14))) return false;
    if (collideCombatEffect(effect, x0, y0, x, y)) return false;
  } else collideCombatEffect(effect, effect.x, effect.y, effect.x, effect.y);
  return effect.t < effect.life;
}

export function advanceSkillContacts(dt: number): void {
  beginContactFrame();
  try {
    advanceActorActions(dt);
    const pending = l.combatProjectiles || [];
    for (const cast of new Set(pending.map(effect => effect.combat))) cast.elapsed += dt;
    l.combatProjectiles = [];
    for (const effect of pending) {
      const cast = effect.combat;
      const interrupted = cast.actionRevision != null && cast.actionRevision !== (cast.actor.actionRevision || 0) && cast.elapsed - dt < cast.windup;
      effect.contactAlive = !interrupted && !l.town && (!(l.deadT > 0) || !!l.battlefield) && cast.zone === l.zoneShown && advanceContactEffect(effect, dt);
      if (effect.contactAlive) l.combatProjectiles.push(effect);
    }
    l.fx = l.fx.filter(effect => {
      const flower = advanceSwordFlowerVisual(effect, dt);
      if (flower !== null) return flower;
      if (effect.combat) return effect.contactAlive !== false;
      if (effect.k === "jm") return RP(effect, dt);
      if (effect.k === "mis" || effect.k === "boom") return TP(effect, dt);
      return true;
    });
    if (l.fxQ && l.fxQ.length) {
      l.fx.push(...l.fxQ);
      l.fxQ.length = 0;
    }
  } finally { endContactFrame(); }
}
