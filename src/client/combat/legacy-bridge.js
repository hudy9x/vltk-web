// API tương thích: các module JS cũ dùng đúng cùng hàm/state với combat TS.
// CombatEngine được builder tạo từ index.ts, trong cùng IIFE với JS hiện tại.
var activeCombatCast = null;
var SKILL_RANGE_Y_RATIO = CombatEngine.SKILL_RANGE_Y_RATIO;
var skillCastDistance = CombatEngine.skillCastDistance;
var skillIgnoresTerrain = CombatEngine.skillIgnoresTerrain;
var queueSkillContact = CombatEngine.castSkill;
var registerCombatMissile = CombatEngine.registerCombatMissile;
var contactFraction = CombatEngine.contactFraction;
var rectangleContactFraction = CombatEngine.rectangleContactFraction;
var applyContactHit = CombatEngine.applyContactHit;
var collideCombatEffect = CombatEngine.collideCombatEffect;
var advanceCombatMissile = CombatEngine.advanceCombatMissile;
var advanceContactEffect = CombatEngine.advanceContactEffect;
var advanceSkillContacts = CombatEngine.updateCombat;
var drawContactProjectile = CombatEngine.drawFallbackProjectile;
var spawnLotusImpact = CombatEngine.spawnLotusImpact;
var spawnSnowTrail = CombatEngine.spawnSnowTrail;
var actorActionLocked = CombatEngine.actorActionLocked;
var beginActorCast = CombatEngine.beginActorCast;
var applyActorHurt = CombatEngine.applyActorHurt;
var applyPotionRecovery = CombatEngine.applyPotionRecovery;
var advanceConsumableCooldowns = CombatEngine.advanceConsumableCooldowns;
var applyColdSlow = CombatEngine.applyColdSlow;
var coldSpeedFactor = CombatEngine.coldSpeedFactor;
var resolveSpeed = CombatEngine.resolveSpeed;
var speedSpriteFrame = CombatEngine.speedSpriteFrame;
// Adapt legacy world/actor state here; speed/*.ts stays independent of items and skills.
var actorRunSpeed = function (actor) {
  const player = typeof v !== 'undefined' && actor === v;
  const stats = player ? l.P : actor.battlefieldMonster ? null : actor.stats;
  const mounted = player ? l.mounted : actor.mounted;
  const base = stats ? (mounted ? stats.speed : stats.speedFoot ?? stats.speed) ?? 1 : 1;
  const curse = actor.curse && typeof Rn === 'function' ? Rn(actor) : null;
  const cold = coldSpeedFactor(player ? l : actor);
  return resolveSpeed('run', Math.max(0, base + (curse?.run || 0) / 100) * cold * 100).multiplier;
};
var actorAttackTiming = function (actor, skill) {
  const player = typeof v !== 'undefined' && actor === v;
  const curse = actor.curse && typeof Rn === 'function' ? Rn(actor) : null;
  const raw = skill.rawRate ?? skill.rate ?? 1;
  const castPenalty = skill.phys === false ? (curse?.cast || 0) / 100 : 0;
  const recovery = !actor.stats && !player ? 1 + Math.max(0, curse?.slow || 0) / 100 : 1;
  return resolveSpeed('attack', Math.max(0, raw + castPenalty) * coldSpeedFactor(player ? l : actor) / recovery * 100);
};
// Feed raw damage and the recipient into the display queue, after HP is resolved.
var showDamageNumber = function (target, amount, kind = "phys", critical = false, suffix = "") {
  return CombatEngine.enqueueDamageLabel(l.txt || (l.txt = []), target, amount, kind,
    { critical, suffix, quiet: l.quiet, lowFx: o.lowFx, context: typeof W !== "undefined" ? W : undefined,
      priority: typeof v !== "undefined" && target === v ? 3 : target === l.tgt || target === l.manTgt ? 2 : target.cls === "boss" ? 1 : 0,
      viewport: typeof B0 !== "undefined" && typeof M0 !== "undefined"
        ? { x: B0.x, y: B0.y, width: M0.w, height: M0.h } : undefined });
};
var updateDamageLabels = CombatEngine.updateDamageLabels;
