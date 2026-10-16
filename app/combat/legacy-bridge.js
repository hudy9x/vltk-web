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
var actorActionLocked = CombatEngine.actorActionLocked;
var beginActorCast = CombatEngine.beginActorCast;
var applyActorHurt = CombatEngine.applyActorHurt;
var applyPotionRecovery = CombatEngine.applyPotionRecovery;
var advanceConsumableCooldowns = CombatEngine.advanceConsumableCooldowns;
var applyColdSlow = CombatEngine.applyColdSlow;
var coldSpeedFactor = CombatEngine.coldSpeedFactor;
// Feed raw damage and the recipient into the display queue, after HP is resolved.
var showDamageNumber = function (target, amount, kind = "phys", critical = false, suffix = "") {
  return CombatEngine.enqueueDamageLabel(l.txt || (l.txt = []), target, amount, kind,
    { critical, suffix, quiet: l.quiet, lowFx: o.lowFx, context: typeof W !== "undefined" ? W : undefined });
};
var updateDamageLabels = CombatEngine.updateDamageLabels;
