import { resolveSkillImpactGeometry } from './skill-geometry';
import type { CombatTarget, CombatSkill, ContactHitHandler, CastOptions, CombatCast, SpriteMissile, ContactEffect, FallbackContact } from './types';
import { skillIgnoresTerrain, SKILL_RANGE_Y_RATIO } from './config';
import { beginActorCast } from './action-state';
import { defaultCombatTargets } from './spatial/contact-query';
import { resolveSpeed } from '../speed/runtime';
import type { ResolvedSpeed } from '../speed/types';
import { playSkillSound } from './audio/runtime';
declare function actorAttackTiming(actor: CombatTarget, skill: CombatSkill): ResolvedSpeed;
// Secondary fields created synchronously at release inherit the same tick remainder.
let releaseStep: number | undefined;

// Một cast giữ chung bộ đếm hit/pulse cho mọi đạn của cùng lần xuất chiêu.
export function queueSkillContact(actor: CombatTarget, target: CombatTarget, skill: CombatSkill, onHit: ContactHitHandler, options: CastOptions = {}): CombatCast {
  // Secondary impacts do not start another attack pose. Primary resolved skills
  // provide rate; effect-only callers without one keep their explicit windup.
  const timed = !skill.ev2 && skill.rate != null;
  const timing = timed ? (typeof actorAttackTiming === 'function' ? actorAttackTiming(actor, skill)
    : resolveSpeed('attack', (skill.rawRate ?? skill.rate!) * 100)) : null;
  const blocked = !timed && !skill.ev2 && !beginActorCast(actor);
  const visualSkill = !skill.ev2 && [1075,1078,1081,1076].includes(+skill.id!) ? skill : null;
  skill = resolveSkillImpactGeometry(skill);
  const cast: CombatCast = {
    actionRevision: skill.ev2 ? undefined : actor.actionRevision || 0,
    actor,
    skill,
    ignoreTerrain: skillIgnoresTerrain(skill),
    onHit: contact => {
      if (!impactSoundPlayed && !skill.ev2) {
        impactSoundPlayed = true;
        playSkillSound(contact, skill.id || 0, 'hit');
      }
      onHit(contact);
    },
    onImpact: options.onImpact,
    duration: options.duration,
    targets: options.targets || defaultCombatTargets,
    maxTargets: options.maxTargets || (skill.geo && skill.geo.pierce ? Infinity : Math.max(1, skill.targets || (skill.geo && skill.geo.n) || 1)),
    maxHits: options.maxHits || (() => +skill.id! === 368 && !skill.ev2 ? 3 : 1),
    hits: new Map(),
    zone: l.zoneShown,
    windup: timed ? 0 : options.windup == null ? 0.12 : options.windup,
    emitted: 0,
    origin: { x: actor.x, y: actor.y - 14 },
    direction: Math.atan2((target.y - actor.y) * 2, target.x - actor.x),
    elapsed: 0, pulse: -1, nextPulse: 0, pulseFrame: -1, targetPulses: new Map(),
    firstStep: releaseStep,
    interval: [362, 375].includes(+skill.id!) ? 0.3 : 0,
  };
  let impactSoundPlayed = false;
  if (blocked) return cast;
  if (+skill.id! === 1075 && !skill.ev2) {
    // Same fixed forward rectangle as Vân Long Kích. Keep the original
    // skill passed to G3 so Giang Hải still plays its own traveling wave.
    cast.maxTargets = Infinity;
  }
  if ([1078, 1081].includes(+skill.id!) && !skill.ev2) {
    // These fields use a 150-unit impact radius, independent of cast range.
    const duration = +skill.id! === 1081 ? 20 / 18 : 30 / 18;
    cast.pulseCount = +skill.id! === 1081 ? 5 : 7;
    cast.interval = duration / cast.pulseCount;
    cast.nextPulse = cast.windup;
    cast.duration = cast.windup + duration;
  }
  if ([365, 1076].includes(+skill.id!) && !skill.ev2) {
    // Finite damage beats; the existing renderer keeps one uninterrupted FX.
    const duration = +skill.id! === 365 ? 20 / 18 : 16 / 18;
    cast.pulseCount = +skill.id! === 365 ? 5 : 3;
    cast.interval = duration / cast.pulseCount;
    cast.nextPulse = cast.windup;
    cast.duration = cast.windup + duration;
  }
  if (skill.geo || cast.interval) cast.maxTargets = Infinity;
  if (cast.interval) {
    const spriteId = A0.f && A0.f[skill.id!] && A0.f[skill.id!].c || A0.s && A0.s[skill.id!];
    const sprite = A0.m[spriteId!] && A0.m[spriteId!].fly;
    if (!cast.pulseCount) cast.duration = +skill.id! === 375 ? 3 : Math.max(cast.interval, sprite && sprite.n * sprite.ms / 1000 || 1);
  }
  const emit = (remainingDt?: number) => {
    if (remainingDt != null) cast.firstStep = remainingDt;
    const previous = activeCombatCast;
    const previousStep = releaseStep;
    releaseStep = remainingDt ?? releaseStep;
    const start = l.fx.length;
    // SIM visuals temporarily swap l for a shallow world copy. Initialize the
    // shared array BEFORE that swap so native missiles stay in the real world.
    l.combatProjectiles ||= [];
    activeCombatCast = cast;
    try {
      if (options.visual) options.visual();
      else G3(actor, target, visualSkill || skill);
      // Older secondary effects use interpolated missiles / stationary sprites.
      for (const effect of l.fx.slice(start)) {
        if (!effect.combat && !effect.cosmetic && (effect.k === "mis" || effect.k === "boom") && !effect.follow && !effect.add) {
          effect.combat = cast;
          effect.contactHits = new Set();
          effect.t -= cast.windup;
          if (cast.interval) effect.life = Math.max(effect.life, cast.duration!);
          (l.combatProjectiles || (l.combatProjectiles = [])).push(effect as ContactEffect);
          cast.emitted++;
        }
      }
      if (!cast.emitted) {
        // Missing sprite metadata and hidden FX still need a physical attack.
        l.fx.splice(start);
        const melee = skill.melee !== false;
        const giangHai = +skill.id! === 1075 && !skill.ev2;
        const area = giangHai || skill.geo && (skill.geo.k === "self" || skill.geo.k === "spot");
        const effect: FallbackContact & ContactEffect = {
          k: "contact", combat: cast, contactHits: new Set(),
          x: melee || area ? target.x : actor.x,
          y: (melee || area ? target.y : actor.y) - 14,
          x2: target.x, y2: target.y - 14,
          age: area && !giangHai ? 0 : -cast.windup, life: area ? cast.duration || 0.3 : melee ? 0.1 : 2,
          melee, speed: 360, color: Hi[Object.keys(skill.parts || {})[0]] || "#ffd24a",
          ang: Y3(target.x - actor.x, target.y - actor.y),
          staticArea: !!area,
        };
        (l.combatProjectiles || (l.combatProjectiles = [])).push(effect);
        if (!l.quiet && !options.hideFallbackVisual) l.fx.push(effect);
      }
      // One sound per primary release, shared by world combat and arena.
      if (!skill.ev2) {
        playSkillSound(actor, skill.id || 0, 'cast');
        playSkillSound(actor, skill.id || 0, 'release');
      }
      options.afterRelease?.();
    } finally {
      activeCombatCast = previous;
      releaseStep = previousStep;
    }
  };
  const seconds = options.windup ?? timing?.cycleSeconds;
  if (timing && seconds! > 0) beginActorCast(actor, seconds, emit);
  else { if (timing) beginActorCast(actor, 0); emit(); }
  return cast;
}

export function registerCombatMissile(missile: SpriteMissile): void {
  if (!activeCombatCast) return;
  if (activeCombatCast.pulseCount) {
    missile.visualLifetime = missile.lf;
    missile.loop = false;
  }
  missile.combat = activeCombatCast;
  missile.contactHits = new Set();
  if (missile.kind && !missile.still) missile.age -= activeCombatCast.windup * K3;
  missile.lf = Math.max(missile.lf, 2);
  if (activeCombatCast.interval) missile.lf = Math.max(missile.lf, Math.ceil(activeCombatCast.duration! * K3));
  if (+activeCombatCast.skill.id! === 362 && !activeCombatCast.skill.ev2) {
    const spriteId = A0.f?.[362]?.c || A0.s?.[362];
    const animation = spriteId != null ? A0.m[spriteId] : undefined;
    // Let the visual finish its landing after the damage field has expired.
    const fall = animation?.fly ? animation.fly.n * animation.fly.ms / 1000 : 0;
    const landing = animation?.hit ? animation.hit.n * animation.hit.ms / 1000 : 0;
    missile.lf = Math.max(missile.lf, Math.ceil((fall + landing) * K3));
  }
  if (+activeCombatCast.skill.id! === 1075 && !activeCombatCast.skill.ev2) {
    missile.staticArea = true;
    const reach = (activeCombatCast.skill.geo?.len || activeCombatCast.skill.rad || 198) * QA;
    // A short thrust: traverse the bounded reach in three ticks (~167ms),
    // then disappear. Play its whole sheet once within that brief lifetime.
    missile.lf = 3;
    missile.loop = false;
    missile.spd = reach / missile.lf;
    const angle = missile.ang || 0;
    missile.travelLimit = reach * Math.hypot(Math.cos(angle), Math.sin(angle) / (2 * SKILL_RANGE_Y_RATIO));
    missile.traveled = 0;
  }
  (l.combatProjectiles || (l.combatProjectiles = [])).push(missile as SpriteMissile & ContactEffect);
  activeCombatCast.emitted++;
}
