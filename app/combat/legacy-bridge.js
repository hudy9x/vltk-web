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
