import { mountBattlefieldResult } from './battlefield-result';
import { chooseWarMount, warMountOptions } from './war-mounts';
import { mapNpcs } from '../npcs';
import type { MapDefinition } from '../maps/types';
import { recoverSimulator } from './recovery';
import { randomSimulatorClothes } from './appearance';
import { reflectedSkillDamage } from './reflection';
import { prioritizeLevel60Support } from './support-skills';
import { battlefieldHealthColor, battlefieldTitleColor } from './presentation';
import { createSimNames } from './sim-names';
import { SOLDIER_TITLES, SOLDIER_RANKS } from './soldier-config';
import { mountWarPharmacy } from './pharmacy';
import { buildWarStandings, mountWarLeaderboard } from './leaderboard';
import { createWarSupplies, SUPPLY_RADIUS } from './supplies';
import { createWarInventory } from './war-inventory';
import { applyArmySetEquipment } from './set-equipment';
import { SOLDIER_DETECTION_RADIUS, SOLDIER_LEASH_RADIUS, soldierRank } from './soldier-rules';
import { skillDefense, statusDuration } from './defense';
import { BATTLEFIELD_PVP_DAMAGE } from './balance';
import { patrolSoldier } from './soldier-patrol';
import { soldierSkillOptions } from './soldier-skills';
import { SOLDIER_RANK_SKINS, soldierSkin } from './soldiers';
import { createWarRewards, WAR_ITEMS } from './war-rewards';
import { createRoadMonsters } from './road-monsters';
import { createArmyEquipment } from './equipment';
import { createCrowdSteering } from './crowd';
import { createBattlefieldApproach } from './approach';
import { createBattlefield, BATTLE_MAP, CAMPS, ELEMENT_FACTIONS, estimateDPS } from './battlefield';
import type { ArmyBuild } from './battlefield';
import { mountBattlefieldPanel } from './battlefield-panel';
import type { CombatTarget, CombatCast } from '../combat/types';
import type { Faction, LegacyEntity, LegacyRecord, SandboxAPI, SimulatorActor, SimulatorProfile, SimulatorSkill, SimulatorStats, SimulatorWorld, SkillId } from './types';
import { clone, createDiagnostics } from './diagnostics';
import { createSimulatorLogView } from './log-view';
import { renderSimulatorRoster } from './roster';
import { renderTemplateTable } from './template-table';
import type { SimulatorLogProvider } from './types';
import { mountSimulatorPanel, renderSimulatorControls, SIM_HEALTH_PRESETS } from './panel';
import { createTemplateStore } from './templates';
import { POTENTIALS, setPotential, setSkillLevel, skillLimit } from './build';
import { castSimulatorSkill } from './skill-cast';
import { applyColdPower, coldSpeedFactor } from '../combat/cold-status';
import type { Potential } from './build';
import type { SimulatorTemplate } from './types';

// These declarations bind to the existing shared game IIFE. No duplicate state
// and no window globals: the bundler keeps these references in the original scope.
declare var combatSandbox: SandboxAPI | null;
declare var horseTrader: { close(): void; readonly isOpen: boolean } | null;
declare var o: SimulatorProfile, l: SimulatorWorld, v: LegacyEntity;
declare var I: Record<string, Faction>, T: Record<string, LegacyRecord>, r0: Record<string, LegacyRecord>;
declare var MapsEngine: { getMapBackground(id: number): string; getMap?(id: number): MapDefinition | undefined };
declare var Z0: LegacyRecord;
declare var P0: LegacyRecord;
declare function ea(): number;
declare var k0: LegacyRecord[];
declare var z2: number;
declare var mapNavigation: { clear(x: number, y: number, tx: number, ty: number): boolean };
declare var equipmentTrader: { blueCatalog(sex: number): LegacyRecord[]; goldCatalog(faction: string): {key: string; items: LegacyRecord[]}[]; affixes(item: LegacyRecord, series: number, index: number): LegacyRecord[]; place?(options:LegacyRecord):LegacyRecord };
declare var G5: Record<string, string[]>, V2: Record<number, number>;
declare function yf(): LegacyRecord;
declare function N8(): LegacyRecord | null;
declare function J3(): boolean;
declare function wn(skill: LegacyRecord): string;
declare function E3(skill: LegacyRecord | undefined, mounted?: boolean): boolean;
declare var S: LegacyRecord, R: boolean;
declare var X9: (dt: number) => void, Ms: (kind: 'life' | 'mana') => void;
declare var be: Record<number, number>, ao: number;
declare function applyPotionRecovery(world: SimulatorWorld, kind: 'life' | 'mana', potion: LegacyRecord): void;
declare function Ot(potion:LegacyRecord):number;
declare function Ta(kind: string, template: LegacyRecord, quality: number): LegacyRecord;
declare function g3(name: string): LegacyRecord | null;
declare function os(item: LegacyRecord): void;
declare function J(html: string, ready?: () => void): void;
declare function m(selector: string): HTMLElement;
declare function n0(close?: boolean): void;
declare function An(): void;
declare function k(message: string): void;
declare function ma(id: number | string): unknown;
declare function j2(id: number): number;
declare function Kr(faction: Faction): [number, number];
declare var cw: number, Jr: number, Qa: number, Jn: number, ve: number;
declare var ja: (base: number, kind: string, from: number, to: number, res: Record<string, number>, cap: number, series: number) => number;
declare var Z: (lo: number, hi: number) => number;
declare var Pe: (attack: number, defense: number, ignore?: number) => number;
declare var hs: (skill: SimulatorSkill, target: LegacyEntity) => number;
declare var U9: (attacker: LegacyEntity) => unknown;
declare var $d: (monster: LegacyEntity, dt: number) => unknown;
declare var combatLog: { war?(message:string):void; registerSimulatorLog?(provider: SimulatorLogProvider): void; record(type: string, target: LegacyEntity | string, amount: number, detail?: string, outcome?: string): void } | null;
declare function Rn(target: LegacyEntity): LegacyRecord | null;
declare function y1(from: number, to: number): boolean;
declare function j1(skill: LegacyRecord): number | null;
declare function _A(kind: number, weapon: number, level: number, rarity: number, series?: number): LegacyRecord | null;
declare function X0(x: number, y: number): [number, number];
declare function n1(id: SkillId, level: number, rarity: string, x: number, y: number): LegacyEntity;
declare function p0(item: LegacyRecord): boolean;
declare function j5(): unknown;
declare function Pt(): unknown;
declare function yt(): unknown;
declare function j0(): SimulatorStats;
declare function Jt(faction: string, sex: number): LegacyRecord | null;
declare function UA(skill: LegacyRecord): boolean;
declare function D(text: string): string;
declare function kn(x: number, y: number): number;
declare function Mw(actor: LegacyEntity, x: number, y: number, distance: number): unknown;
declare function skillCastDistance(actor: CombatTarget, target: CombatTarget): number;
declare function skillIgnoresTerrain(skill: SimulatorSkill): boolean;
declare function queueSkillContact(actor: LegacyEntity, target: LegacyEntity, skill: SimulatorSkill, hit: (target: LegacyEntity) => void, options: { targets(): LegacyEntity[]; visual(): unknown }): CombatCast;
declare function showDamageNumber(target: LegacyEntity, damage: number, kind?: string): unknown;
declare function H8(actor: LegacyEntity, dt: number, action: string): unknown;
declare function ps(actor: LegacyEntity, action: string): unknown;
declare function kf(...args: unknown[]): number;
declare function M8(...args: unknown[]): unknown;
declare function bA(path: string): unknown;
declare function L3(...args: unknown[]): unknown;
declare function WP(context: CanvasRenderingContext2D, actor: LegacyEntity, scale: number): void;
declare function ZP(context: CanvasRenderingContext2D, actor: LegacyEntity, height: number, scale: number, dt: number): void;
declare function nameplateOffset(animation: string | undefined, scale: number, ratio: number, padding: number, fallback: number): number;
declare function actorActionLocked(actor: CombatTarget): boolean;
declare function applyActorHurt(actor: CombatTarget, damage: number, maximumHP: number): boolean;

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

export function createSimulator() {
  if (typeof combatSandbox === "undefined" || !combatSandbox) return null;
  const sandbox = combatSandbox;
  const battlefieldApproach = createBattlefieldApproach();
  const crowd = createCrowdSteering();
  let sim: SimulatorActor | null = null, nextSimId = 0, refreshTime = 0;
  const actors: SimulatorActor[] = [];
  const templateStore = createTemplateStore(localStorage);
  let pk = false, farm = false;
  const diagnostics = createDiagnostics(() => o.name, (source, target) =>
    l.sim && v.arenaSim ? v.simId : actors.find(actor => actor.n === source || actor.n === target.n)?.simId);
  const { step, capture } = diagnostics;
  function statsSnapshot(stats: SimulatorStats) {
    return Object.fromEntries(Object.entries(stats).filter(([key]) => !["A", "actives", "basic", "main", "bestAuto"].includes(key)));
  }
  const originalResistance = ja;
  ja = function (base, kind, from, to, res, cap, series) {
    const value = originalResistance(base, kind, from, to, res, cap, series);
    let resistance = res[kind];
    if (y1(from, to)) resistance -= series;
    else if (y1(to, from)) resistance += series;
    step("Kháng: base × (100 − clamp(res ± khắc hệ, −cap, min(cap, cw))) / 100", {
      kind, base, from, to, resistanceBefore: res[kind], series, cap, globalCap: cw,
      effectiveResistance: E(resistance, -cap, Math.min(cap, cw)), result: value,
    });
    return value;
  };
  const originalRandom = Z;
  Z = function (lo, hi) {
    const value = originalRandom(lo, hi);
    step("Hệ số ngẫu nhiên thực tế", { min: lo, max: hi, result: value });
    return value;
  };
  const originalAccuracy = Pe;
  Pe = function (attack, defense, ignore) {
    const result = originalAccuracy(attack, defense, ignore);
    step("Tỉ lệ trúng Pe(AR, phòng thủ, bỏ qua phòng thủ) (%)", { attack, defense, ignore: ignore || 0, result });
    return result;
  };
  let battlefield: ReturnType<typeof createBattlefield> | undefined;
  const warEvents: string[] = [];
  const simNames=createSimNames();
  // Local Tống Kim balance parameter, not an asserted original-VLTK formula.
  function pvpDamageScale(source: LegacyEntity, target: LegacyEntity): number {
    const fighter = (actor: LegacyEntity) => !actor.battlefieldBoss && !actor.battlefieldMonster &&
      (actor.arenaSim || actor.battlefieldPlayer || actor === battlefieldHero);
    return battlefield?.active && fighter(source) && fighter(target) ? BATTLEFIELD_PVP_DAMAGE : 1;
  }
  const originalHit = hs;
  hs = function (skill, target) {
    if (battlefield?.active && !battlefield.canHit(v, target)) return 0;
    return capture(o.name, target, skill, () => {
      const before = target.hp, poisonBefore = (target.poison || 0) * (target.poisonDmg || 0);
      const statusBefore = { poison: target.poison || 0, slow: target.slowT || 0, stun: target.stun || 0 };
      step("Đầu vào nhân vật gây sát thương", { faction: o.fac, level: o.lvl, attr: o.attr, stats: statsSnapshot(l.P), target: { defense: target.def, resistance: target.res, series: target.series, hp: before } });
      // Boss resistance is an effective floor AFTER penetration and elemental adjustment.
      const boss = battlefield?.active && target.battlefieldBoss;
      const resistance = target.res, anti = l.P.anti, antiMax = l.P.antiMax, breakTime = target.resBrkT;
      if (boss) {
        const floor = y1(skill.series, target.series) ? 50 : 25;
        const curseResistance = typeof Rn === 'function' ? Rn(target)?.res : undefined;
        target.res = Object.fromEntries(Object.keys(resistance).map(key => [key, Math.max(floor, resistance[key]) + Math.max(0, -(curseResistance?.[key] || 0))]));
        l.P.anti = {}; l.P.antiMax = 0; target.resBrkT = 0;
      }
      const scale = pvpDamageScale(v, target), flat = l.P.series5, proxy = target.hurtProxy;
      const defendedSim = battlefield?.active && target.arenaSim && !target.battlefieldBoss;
      if (defendedSim) target.hurtProxy = true;
      let result;
      try {
        if (scale !== 1) step("Hệ số sát thương PvP Tống Kim trước kháng", { scale, parts: skill.parts, seriesFlat: flat || 0 });
        l.P.series5 = (flat || 0) * scale;
        const ability = scale === 1 ? skill : { ...skill, parts: Object.fromEntries(Object.entries(skill.parts).map(([kind, damage]) => [kind, damage * scale])) };
        result = originalHit(boss ? { ...ability, series5: 0 } : ability, target);
      }
      finally { target.hurtProxy = proxy; l.P.series5 = flat; if (boss) { target.res = resistance; l.P.anti = anti; l.P.antiMax = antiMax; target.resBrkT = breakTime; } }
      if (battlefield?.active && target.arenaSim && !target.battlefieldBoss) {
        const defender = target as SimulatorActor, defense = defender.stats;
        const resolved = skillDefense(Math.max(0, before - defender.hp), defense, defender.mana, v.series, Jr);
        defender.mana = resolved.mana; defender.hp = Math.max(0, before - resolved.damage);
        // Reduce only the newly applied poison, preserving an existing poison pool.
        const addedPoison = Math.max(0, (defender.poison || 0) * (defender.poisonDmg || 0) - poisonBefore);
        const seconds = statusDuration(skill.poisonT || (typeof ve !== 'undefined' ? ve : 4), defense.poisonRed);
        const duration = Math.max(statusBefore.poison, addedPoison > 0 ? seconds : 0);
        defender.poison = duration;
        defender.poisonDmg = duration > 0 ? (poisonBefore + statusDuration(addedPoison, defense.poisonRed)) / duration : 0;
        defender.slowT = Math.max(statusBefore.slow, statusDuration(defender.slowT || 0, defense.freezeRed));
        defender.stun = Math.max(statusBefore.stun, statusDuration(defender.stun || 0, defense.stunRed));
        if (!(skill.parts.cold > 0)) applyActorHurt(defender, resolved.damage, defender.max);
        reflectHit(defender, v, skill, resolved.damage);
        step("Phòng thủ SIM sau kháng: khiên → hấp thụ → hồi MP → nội lực hộ thân", resolved);
      }
      if (before > target.hp || (target.poison || 0) * (target.poisonDmg || 0) > poisonBefore) recordBattlefieldHit(v,target);
      step("HP thực mất = max(0, min(HP trước, HP trước − HP sau))", { before, after: target.hp, actualLoss: Math.max(0, Math.min(before, before - target.hp)), returnedDamage: result, poisonDps: target.poisonDmg || 0, poisonSeconds: target.poison || 0 });
      return result;
    });
  };
  const originalIncoming = U9;
  U9 = function (attacker) {
    if (battlefield?.active && attacker.battlefieldTeam && !battlefield.canHit(attacker,l.sim ? v : battlefieldHero)) return 0;
    return capture(attacker.n, { n: o.name }, { n: "Đòn đánh quái", damage: attacker.dmg, ar: attacker.ar, series: attacker.series }, () => {
      const before = l.life;
      step("Đầu vào phòng thủ người chơi", { faction: o.fac, level: o.lvl, stats: statsSnapshot(l.P), hp: before, mana: l.mana });
      const result = originalIncoming(attacker);
      step("HP thực mất", { before, after: l.life, actualLoss: Math.max(0, Math.min(before, before - l.life)) });
      return result;
    });
  };
  if (typeof combatLog !== "undefined" && combatLog) {
    const record = combatLog.record;
    combatLog.record = function (type, target, amount, detail, outcome) {
      if (!l.sim && detail === "Hiệu ứng duy trì" && amount > 0) {
        capture(type === "in" ? "Độc" : o.name, { n: type === "in" ? o.name : (typeof target === "string" ? target : target.n) }, { n: detail }, () =>
          step("HP thực mất do hiệu ứng duy trì", { direction: type, actualLoss: amount, hpAfter: type === "in" ? l.life : (typeof target === "string" ? undefined : target.hp), remainingDamage: type === "in" ? l.hpDot : (typeof target === "string" ? undefined : target.poisonDmg * target.poison), remainingSeconds: type === "in" ? l.hpDotT : (typeof target === "string" ? undefined : target.poison) }));
      }
      return record(type, target, amount, detail, outcome);
    };
  }
  function forcedDamage(attacker: LegacyEntity, before: number, after: number) {
    step("Arena ép sát thương 1 máu: max(0, HP − 1); bỏ qua công thức thường", { attacker: attacker.n, before, after, actualLoss: before - after });
  }
  // Only swap the synchronous calculation context; always restore it before a frame,
  // a projectile callback, a save or a UI handler can run.
  function asSim<T>(actor: SimulatorActor, action: () => T, quiet = true, loadout?: { profile: SimulatorProfile; stats: SimulatorStats }): T {
    const player = o, world = l, hero = v;
    o = loadout?.profile || actor.profile; v = actor;
    l = Object.assign({}, world, { P: actor.battlefieldBoss && loadout ? { ...loadout.stats, life: actor.max } : loadout?.stats || actor.stats || world.P, life: actor.hp, mana: actor.mana, sim: true, quiet, mounted: !!actor.mounted && !actor.battlefieldBoss && !actor.battlefieldMonster,
      buffs: {}, skCd: {}, look: null, jx: null, ignoreEqt: null, buffAssume: true });
    try { return action(); }
    finally { actor.hp = l.life; actor.mana = actor.battlefieldTeam && !actor.battlefieldBoss ? l.mana : actor.stats.mana; o = player; l = world; v = hero; }
  }
  function equipSkill(profile: SimulatorProfile, id: SkillId) {
    if (profile.battlefieldBuild) return;
    const weapon = id === "basic" ? null : j1(T[id]);
    if (weapon !== null) {
      const kind = weapon >= 100 ? 1 : 0, type = weapon >= 100 ? weapon - 100 : weapon === -1 ? 6 : weapon;
      if (profile.eq.weapon?.d === kind && profile.eq.weapon?.k === type) return;
      const player = o;
      try {
        o = profile;
        const item = _A(kind, type, profile.battlefieldBuild ? profile.lvl : 1, profile.battlefieldBuild?.rarity || 0);
        if (item) { item.enh = profile.battlefieldBuild?.enh || 0; profile.eq.weapon = item; }
      } finally { o = player; }
    }
  }
  function cancelCasts(actor: SimulatorActor | null = sim) {
    if (!actor) return;
    actor.castT = 0;
    if (actor.act === "at") { actor.act = "st"; actor.actT = 0; }
    actor.generation++;
    for (const field of ["combatProjectiles", "fx", "fxQ"]) {
      if (l[field]) l[field] = l[field].filter((effect: LegacyRecord) => !effect.combat || effect.combat.actor !== actor);
    }
  }
  function remove(actor: SimulatorActor | null = sim) {
    if (!actor) return;
    cancelCasts(actor);
    const index = actors.indexOf(actor);
    if (index >= 0) actors.splice(index, 1);
    l.enemies = l.enemies.filter(enemy => enemy !== actor);
    if (l.manTgt === actor) l.manTgt = null;
    if (l.tgt === actor) l.tgt = null;
    if (sim === actor) sim = actors[actors.length - 1] || null;
    syncSelection();
  }
  function resolvedSkill(stats: SimulatorStats, id: SkillId): SimulatorSkill {
    const skill = id === "basic" ? stats.basic :
      (stats.actives || []).find(skill => Number(skill.id) === +id) || (stats.main && Number(stats.main.id) === +id ? stats.main : null);
    if (!skill) throw new Error("SIM chưa thể dùng chiêu đã chọn. Hãy kiểm tra vũ khí và điều kiện kỹ năng.");
    return skill;
  }
  function selectSkill(id: SkillId) {
    if (!sim) return;
    const actor = sim, faction = I[actor.profile.fac];
    if (actor.battlefieldBoss) throw new Error("Boss luân phiên bộ kỹ năng chiến trường riêng.");
    if (id !== "basic" && (!faction.skills.includes(+id) || !T[id] || !UA(T[id]))) throw new Error("Chiêu SIM không thuộc môn phái.");
    const previous = clone(actor.profile), statsBefore = actor.stats;
    const hpRatio = actor.hp / actor.max, manaRatio = actor.mana / Math.max(1, actor.stats.mana);
    try {
      actor.profile.main = id === "basic" ? "basic" : +id;
      actor.profile.mainLock = true; actor.profile.rot = false;
      actor.profile.slots = id === "basic" ? [] : [+id];
      if (id !== "basic" && !actor.profile.sk[id]) actor.profile.sk[id] = 1;
      equipSkill(actor.profile, id);
      asSim(actor, () => {
        const stats = j0();
        stats.life = actor.profile.simMaxHP ?? stats.life;
        stats.main = resolvedSkill(stats, actor.profile.main);
        actor.stats = stats;
      });
    } catch (error) { actor.profile = previous; actor.stats = statsBefore; throw error; }
    syncMount(actor); cancelCasts(); actor.cooldown = 0; actor.waiting = "";
    Object.assign(actor, { hp: actor.stats.life * hpRatio, max: actor.stats.life, mana: actor.stats.mana * manaRatio,
      series: actor.stats.series, res: actor.stats.res, def: actor.stats.def, ar: actor.stats.ar, spd: 100 * (actor.stats.speed || 1) });
    field("sim-skill").value = String(actor.profile.main);
    updateInfo(); renderBuild();
  }
  function create(faction: string, skillId: SkillId = "basic", autoSkills = false, autoPotential = false, template?: SimulatorTemplate) {
    if (!I[faction] || I[faction].novice) throw new Error("Môn phái SIM không hợp lệ.");
    if (skillId !== "basic" && (!I[faction].skills.includes(+skillId) || !UA(T[skillId]))) throw new Error("Chiêu SIM không thuộc môn phái.");
    const profile = template ? clone(template.profile) : sandbox.createProfile(I[faction]);
    if (!template && field("sim-health").value) profile.simMaxHP = Number(field("sim-health").value);
    validateProfile(profile);
    const id = ++nextSimId;
    profile.name = (template ? template.name : "SIM · " + I[faction].n) + " #" + id;
    profile.main = skillId === "basic" ? "basic" : +skillId;
    profile.slots = skillId === "basic" ? [] : [+skillId];
    if (skillId !== "basic" && !profile.sk[skillId]) profile.sk[skillId] = 1;
    equipSkill(profile, skillId);
    const angle = actors.length * 2.399963;
    const [x, y] = X0(v.x + Math.cos(angle) * 120, v.y + Math.sin(angle) * 70);
    const actor: SimulatorActor = Object.assign(n1(Object.keys(r0)[0], profile.lvl, "normal", x, y), {
      arenaSim: true as const, simId: "sim-" + id, generation: 0, target: null,
      pk: template?.pk ?? pk, farm: template?.farm ?? farm,
      profile, n: profile.name, stats: l.P, mana: 0, hp: 1, max: 1, cooldown: 0,
      autoSkills: template?.autoSkills ?? !!autoSkills, autoPotential: template?.autoPotential ?? !!autoPotential,
      casts: 0, lastCast: null, waiting: "",
    });
    asSim(actor, () => {
      if (!template && autoSkills) Pt();
      if (!template && autoPotential) yt();
      actor.stats = j0();
      actor.stats.life = profile.simMaxHP ?? actor.stats.life;
      actor.stats.main = resolvedSkill(actor.stats, profile.main);
      actor.look = Jt(faction, profile.sex);
    });
    Object.assign(actor, { hp: actor.stats.life, max: actor.stats.life, mana: actor.stats.mana,
      series: actor.stats.series, res: actor.stats.res, def: actor.stats.def, ar: actor.stats.ar, spd: 100 * (actor.stats.speed || 1) });
    actors.push(actor); sim = actor; l.enemies.push(actor); syncSelection();
    return actor;
  }
  function setPK(enabled: boolean) {
    pk = !!enabled;
    if (sim) { sim.pk = pk; sim.target = null; sim.seeT = 0; cancelCasts(sim); }
    updateInfo();
  }
  function setFarm(enabled: boolean) {
    farm = !!enabled;
    if (sim) { sim.farm = farm; sim.target = null; sim.seeT = 0; cancelCasts(sim); }
    updateInfo();
  }
  function playerTarget(actor: SimulatorActor): LegacyEntity {
    const world = battlefield?.active ? battlefieldWorld : l, hero = battlefield?.active ? battlefieldHero : v;
    return { x: hero.x, y: hero.y, n: previousField?.name || o.name, hp: world.life, max: world.P.life, hurtProxy: true, battlefieldPlayer: true, r: 17, cls: "normal", tid: actor.tid,
      def: world.P.def, series: world.P.series, res: world.P.res, act: "at", poison: 0, poisonDmg: 0, slowT: 0, stun: 0 };
  }
  function receiveMonsterHit(actor: SimulatorActor, attacker: LegacyEntity): void {
    if (battlefield?.active && !battlefield.canHit(attacker,actor)) return;
    if (!actors.includes(actor) || actor.dead || actor.hp <= 0 || !l.enemies.includes(actor)) return;
    // Reuse U9, including the arena one-damage option and actual SIM defenses.
    // Translate sustained statuses at the boundary so no temporary world state
    // or damage leaks onto the real player.
    asSim(actor, () => {
      l.hpDotT = actor.poison || 0; l.hpDot = (actor.poisonDmg || 0) * l.hpDotT;
      l.slowT = actor.slowT || 0; l.slowPower = actor.slowPower || 0; l.stunT = actor.stun || 0;
      U9(attacker);
      actor.poison = l.hpDotT; actor.poisonDmg = l.hpDotT > 0 ? l.hpDot / l.hpDotT : 0;
      actor.slowT = l.slowT; actor.slowPower = l.slowPower; actor.stun = l.stunT;
    }, false);
  }
  function reflectHit(defender: LegacyEntity, attacker: LegacyEntity, skill: SimulatorSkill, damage: number, stats: SimulatorStats = defender.stats) {
    const amount = reflectedSkillDamage(damage, stats, skill.melee === false) * (typeof ea === 'function' ? ea() : 1);
    if (!(amount > 0)) return;
    if (attacker === v) l.life = Math.max(0, l.life - amount);
    else attacker.hp = Math.max(0, attacker.hp - amount);
    applyActorHurt(attacker, amount, attacker === v ? l.P.life : attacker.max);
    showDamageNumber(attacker, amount);
    recordBattlefieldHit(defender, attacker);
    if (battlefield?.running && attacker === battlefieldHero && battlefieldWorld.life <= 0) battlefield.playerDied();
  }
  function hit(actor: SimulatorActor, skill: SimulatorSkill, target: LegacyEntity) {
    const world = battlefield?.active ? battlefieldWorld : l, hero = battlefield?.active ? battlefieldHero : v;
    const isPlayer = target === hero;
    if (isPlayer && (!(battlefield?.active ? battlefield.canHit(actor, target) : actor.pk) || world.life <= 0)) return 0;
    const receiver = isPlayer ? playerTarget(actor) : target;
    const before = receiver.hp;
    const defense = world.P;
    asSim(actor, () => hs(skill, receiver), true, actor.battlefieldLoadout);
    let damage = Math.max(0, before - receiver.hp);
    if (isPlayer) {
      // hs supplies the shared skill/accuracy/resistance calculation. Apply the
      // player's absorption and mana shield using the same order as U9.
      capture(actor.n, { n: receiver.n }, { n: "PK · phòng thủ sau sát thương kỹ năng" }, () => {
        const resolved = skillDefense(damage, defense, world.mana, actor.series, Jr);
        world.mana = resolved.mana; damage = resolved.damage;
        step("PK sau kháng: khiên → hấp thụ → hồi MP → nội lực hộ thân", resolved);
        world.life = Math.max(0, world.life - damage);
        // The disposable receiver has no hurt state; preserve cold-only movement semantics here too.
        if (!(skill.parts.cold > 0)) applyActorHurt(hero, damage, defense.life);
        if (receiver.poison > 0) {
          const seconds = receiver.poison * (1 - (defense.poisonRed || 0) / 100);
          if (seconds > .05) { world.hpDot = (world.hpDot || 0) + receiver.poisonDmg * seconds; world.hpDotT = Math.max(world.hpDotT || 0, seconds); }
          step("Độc PK chuyển sang DoT; không tính thành HP mất ngay", { dps: receiver.poisonDmg, seconds, pending: world.hpDot || 0 });
        }
        if ((receiver.slowT || 0) > 0) {
          const seconds = (receiver.slowT || 0) * (1 - (defense.freezeRed || 0) / 100);
          // Transfer the resolved intensity without applying resistance a second time.
          applyColdPower(world, receiver.slowPower || 0, seconds);
        }
        world.stunT = Math.max(world.stunT || 0, receiver.stun * (1 - (defense.stunRed || 0) / 100));
        reflectHit(hero, actor, skill, damage, defense);
        step("HP thực mất", { before, after: world.life, actualLoss: before - world.life });
      });
    }
    if (typeof combatLog !== "undefined" && combatLog) combatLog.record(isPlayer ? "in" : "out", isPlayer ? actor : target, Math.min(before, damage), actor.n + " · " + (skill.n || "Đánh thường"));
    showDamageNumber(isPlayer ? hero : target, Math.min(before, damage));
    if (isPlayer && world.life <= 0 && battlefield?.running) battlefield.playerDied();
    return damage;
  }
  const monsterTick = $d;
  $d = function (monster, dt) { if (!monster.arenaSim && !monster.battlefieldMonster) return monsterTick(monster, dt); };
  function cancelRoadMonster(actor: LegacyEntity) {
    actor.actionRevision = (actor.actionRevision || 0) + 1; actor.castT = 0; actor.moving = false;
    for (const field of ['combatProjectiles', 'fx', 'fxQ']) l[field] = (l[field] || []).filter((effect: LegacyRecord) => effect.combat?.actor !== actor);
  }
  const arenaTargets = sandbox as SandboxAPI & { nearestTarget(monster: LegacyEntity): LegacyEntity | null };
  const nearestArenaTarget = arenaTargets.nearestTarget;
  arenaTargets.nearestTarget = function (monster) {
    if (!monster.battlefieldMonster) return nearestArenaTarget.call(sandbox,monster);
    if (!battlefield?.running) return null;
    const home = monster.battlefieldHome;
    if (home && Math.hypot(monster.x-home.x,(monster.y-home.y)*2) > (monster.battlefieldLeashRadius || SOLDIER_LEASH_RADIUS) || monster.battlefieldReturning) return null;
    const candidates: LegacyEntity[] = actors.filter(actor => !actor.dead && actor.hp > 0);
    if (battlefieldWorld.life > 0 && !(battlefieldWorld.deadT > 0)) candidates.push(battlefieldHero);
    const distance = (target: LegacyEntity) => Math.hypot(target.x-monster.x,(target.y-monster.y)*2);
    candidates.push(...roadMonsters.actors.filter(target => target !== monster && !target.dead && target.hp>0));
    return candidates.filter(target => battlefield!.canHit(monster,target) && distance(target) < Math.min(SOLDIER_DETECTION_RADIUS, monster.battlefieldLeashRadius || SOLDIER_LEASH_RADIUS) && (!home || Math.hypot(target.x-home.x,(target.y-home.y)*2) <= (monster.battlefieldLeashRadius || SOLDIER_LEASH_RADIUS))).sort((a,b) => distance(a)-distance(b))[0] || null;
  };
  const roadMonsters = createRoadMonsters({
    mapId: () => BATTLE_MAP,
    appearanceDelay: () => battlefield ? Math.max(0, battlefield.state.deployment.soldierAppearanceSeconds - battlefield.state.elapsed) : 0,
    create(index, x, y, spawn) {
      const team = spawn?.team || (x < 1792 ? 'song' : 'jin');
      const id = soldierSkin(r0,team,Math.floor(index/2),spawn?.rank || 'soldier');
      const [px,py] = X0(x,y), monster = n1(id,120,'normal',px,py);
      const rankIndex=spawn?SOLDIER_RANKS.indexOf(spawn.rank):0;
      const rank = spawn?{name:SOLDIER_TITLES[spawn.rank],minimumHP:spawn.hp,attackIntervalFactor:Math.max(.4,.85-rankIndex*.1),movementFactor:1.15+rankIndex*.08}:soldierRank(index);
      const maximum = spawn?spawn.hp:Math.max(rank.minimumHP, monster.max || 0);
      Object.assign(monster, { battlefieldMonster: true, battlefieldTeam: team, arenaMonster: true, n: r0[id].n, battlefieldRank: rank.name,
        cd: Math.max(.25, (monster.cd || 1) * rank.attackIntervalFactor), spd: (monster.spd || 40) * rank.movementFactor,
        hp: maximum, max: maximum, nativeDamage: monster.dmg, dmg: monster.dmg, battlefieldPatrolRadius: spawn?.patrolRadius || 180, battlefieldLeashRadius: spawn?.leashRadius || 800, battlefieldSkills: spawn?.skills || [], battlefieldHome: { x:px, y:py } });
      delete monster.home; l.enemies.push(monster); return monster;
    },
    defeated(actor) { warRewards.killed(actor); },
    cancel: cancelRoadMonster,
    remove(actor) { cancelRoadMonster(actor); l.enemies = l.enemies.filter(enemy => enemy !== actor); l.corpses = (l.corpses || []).filter((corpse: LegacyEntity) => corpse !== actor); },
    tick(actor,dt) {
      const home = actor.battlefieldHome;
      if (Math.hypot(actor.x-home.x,(actor.y-home.y)*2) > actor.battlefieldLeashRadius) actor.battlefieldReturning = true;
      const target = arenaTargets.nearestTarget(actor);
      const loadouts = (actor.battlefieldSkills as number[]).map(id => soldierLoadout(id));
      actor.battlefieldSkillCooldown = Math.max(0,(actor.battlefieldSkillCooldown || 0)-dt*coldSpeedFactor(actor));
      const loadout = loadouts.length ? loadouts[(actor.battlefieldSkillIndex || 0) % loadouts.length] : null;
      if (loadout) {
        // Native AI still handles statuses/movement; suppress its basic contact
        // when the configurable skill deck owns this unit's attacks.
        actor.atkCd = Math.max(1,dt*2); actor.ranged = true; actor.reach = loadout.stats.main.rad;
      }
      monsterTick(actor,dt);
      if (actor.hp <= 0 || actorActionLocked(actor) || actor.stun > 0) return;
      if (!target || actor.battlefieldReturning) {
        patrolSoldier(actor,dt*coldSpeedFactor(actor),{move:Mw,direction:kn,clear:(x,y,tx,ty)=>typeof mapNavigation!=='undefined'?mapNavigation.clear(x,y,tx,ty):mt(x,y,tx,ty)});
      } else if (loadout && actor.battlefieldSkillCooldown <= 0) {
        castSoldierSkill(actor, target, loadout);
      }
    },
  });
  const arenaTick = sandbox.tick;
  sandbox.tick = function (dt) { arenaTick(dt); tick(dt); };
  function tick(dt: number) {
    if (battlefield?.running && battlefield.state.remaining <= dt) for (const unit of roadMonsters.actors) if (unit.dead || unit.hp <= 0) warRewards.killed(unit);
    battlefield?.tick(dt);
    updateWarNpcs();
    refreshTime += dt;
    if (refreshTime >= .25) { refreshTime = 0; updateInfo(); battlePanel.render(); pharmacy.refresh(); leaderboard.render(); }
    warRewards.tick(dt);
    roadMonsters.tick(dt, !!battlefield?.running);
    const bodies = battlefield?.active ? [...actors, ...roadMonsters.actors, { ...battlefieldHero, hp: battlefieldWorld.life, dead: !battlefieldWorld.life || battlefieldWorld.deadT > 0 }] : actors;
    crowd.begin(bodies, dt);
    for (const actor of [...actors]) {
      if (battlefield?.active && actor.battlefieldTeam) {
        if (!l.enemies.includes(actor)) l.enemies.push(actor);
        if (!battlefield.running || actor.dead || actor.hp <= 0) continue;
        tickActor(actor, dt); continue;
      }
      if (!l.enemies.includes(actor) || actor.dead || actor.hp <= 0) { remove(actor); continue; }
      if (!l.town && !(l.deadT > 0)) tickActor(actor, dt);
    }
    if (typeof combatLog !== "undefined" && combatLog?.war) for (const message of warEvents.splice(0)) combatLog.war(message);
  }
  function availableTargets(actor: SimulatorActor): LegacyEntity[] {
    if (battlefield?.active && actor.battlefieldTeam) return battlefield.targets(actor);
    return actor.pk && l.life > 0 ? [v] : actor.farm ?
      l.enemies.filter(enemy => !enemy.arenaSim && !enemy.dead && enemy.hp > 0) : [];
  }
  function syncMount(actor:SimulatorActor, skillId:SkillId=actor.profile.main) {
    const mounted = !actor.battlefieldBoss && !actor.battlefieldMonster && !!actor.profile.eq.horse &&
      (skillId==='basic' || typeof E3!=='function' || E3(T[skillId],true));
    if (!!actor.mounted===mounted) return;
    actor.mounted=mounted;
    asSim(actor,()=>{const stats=j0();stats.main=resolvedSkill(stats,actor.profile.main);actor.stats=stats;});
    actor.spd=100*(mounted?actor.stats.speed:actor.stats.speedFoot||actor.stats.speed||1);
  }
  function tickActor(actor: SimulatorActor, dt: number) {
    if (battlefield?.active && actor.target === battlefieldHero && !battlefield.canHit(actor,battlefieldHero)) { actor.target=null; actor.moving=false; }
    actor.resBrkT = Math.max(0, (actor.resBrkT || 0) - dt);
    if (actor.battlefieldTeam && !actor.battlefieldBoss) {
      actor.hp = Math.min(actor.max, actor.hp + (actor.stats.regen || 0) * dt);
      actor.mana = Math.min(actor.stats.mana, actor.mana + (actor.stats.manaRegen || 0) * dt);
      recoverSimulator(actor, dt, S.potions || [], typeof be === 'undefined' ? {} : be, typeof ao === 'undefined' ? 1 : ao);
    } else actor.mana = actor.stats.mana;
    const stunned = actor.stun > 0;
    actor.stun = Math.max(0, (actor.stun || 0) - dt);
    const speed = coldSpeedFactor(actor);
    actor.slowT = Math.max(0, (actor.slowT || 0) - dt);
    if (actor.poison > 0) {
      const duration = Math.min(dt, actor.poison), before = actor.hp;
      actor.poison -= duration; actor.hp = Math.max(0, actor.hp - actor.poisonDmg * duration);
      showDamageNumber(actor, before - actor.hp, "poison");
      capture("Độc", actor, { n: "DoT SIM" }, () => step("DoT = DPS × min(dt, giây còn lại)", { dps: actor.poisonDmg, duration, before, after: actor.hp }));
      if (actor.hp <= 0) return;
    }
    if (stunned) { actor.moving = false; return; }
    actor.cooldown = Math.max(0, actor.cooldown - dt * speed);
    if (actorActionLocked(actor)) { actor.moving = false; return; }
    const targets = availableTargets(actor);
    const hostilePlayer = battlefield?.running && targets.includes(battlefieldHero) && battlefield.canHit(actor,battlefieldHero) ? battlefieldHero : null;
    if (battlefield?.running && actor.battlefieldTeam && !actor.battlefieldBoss) actor.target = targets[0] || null;
    else if (hostilePlayer) actor.target = hostilePlayer;
    if (!actor.target || !targets.includes(actor.target)) {
      actor.target = targets.sort((a, b) => skillCastDistance(actor, a) - skillCastDistance(actor, b))[0] || null;
      actor.seeT = 0;
    }
    const target = actor.target;
    if (!target) { actor.moving = false; return; }
    const deck = actor.battlefieldDeck as { profile: SimulatorProfile; stats: SimulatorStats }[] | undefined;
    if (deck?.length && actor.cooldown <= 0) {
      actor.battlefieldDeckIndex = ((actor.battlefieldDeckIndex ?? -1) + 1) % deck.length;
      actor.battlefieldLoadout = deck[actor.battlefieldDeckIndex];
    }
    const loadout = actor.battlefieldLoadout as { profile: SimulatorProfile; stats: SimulatorStats } | undefined;
    const preferred = loadout?.stats.main || actor.stats.main;
    const recovering = actor.battlefieldTeam && !actor.battlefieldBoss && !preferred.costLife && actor.mana < (preferred.cost || 0);
    // Keep fighting with the equipped weapon while MP recovers, rather than
    // standing still until the expensive primary skill is affordable again.
    let skill = recovering ? actor.stats.basic : preferred;
    syncMount(actor, skill.id || 'basic');
    // Re-read the resolved skill after a mount change: horseback cooldowns differ.
    skill = recovering ? actor.stats.basic : loadout?.stats.main || actor.stats.main;
    actor.spd=100*(actor.mounted?actor.stats.speed||1:actor.stats.speedFoot||actor.stats.speed||1);
    const reach = skill.geo?.k === "self" ? skill.geo.r || skill.rad : skill.rad;
    const distance = () => Math.max(0, skillCastDistance(actor, target) - (target.r || 12) / QA);
    actor.dir = kn(target.x - actor.x, target.y - actor.y);
    actor.face = target.x >= actor.x ? 1 : -1;
    actor.seeT = (actor.seeT || 0) - dt;
    if (actor.seeT <= 0) { actor.seeT = .25; actor.see = skillIgnoresTerrain(skill) || mt(actor.x, actor.y, target.x, target.y); }
    // Same approach/line-of-sight/cooldown cadence as the monster $d loop.
    const approach = actor.battlefieldTeam && !actor.battlefieldBoss ? battlefieldApproach(actor, target) : null;
    actor.moving = !!approach || distance() > reach || !actor.see;
    if (actor.battlefieldBoss && actor.moving) { actor.moving = false; return; }
    if (actor.moving) {
      const before = { x: actor.x, y: actor.y }, step = actor.spd * speed * dt;
      // Different bridge lanes keep both armies from converging on one waypoint.
      const lane = actor.battlefieldTeam ? ((Number(actor.simId.replace('sim-', '')) % 5) - 2) * 16 : 0;
      const goal = { x: approach?.x ?? target.x, y: approach ? approach.y + lane : target.y };
      const clear = (x: number,y: number,tx: number,ty: number) => typeof mapNavigation !== 'undefined' ? mapNavigation.clear(x,y,tx,ty) : mt(x,y,tx,ty);
      const waypoint = actor.battlefieldTeam ? crowd.route(actor,goal,clear) : goal;
      Mw(actor, waypoint.x, waypoint.y, step);
      if (actor.battlefieldTeam) {
        const proposed = { x: actor.x, y: actor.y };
        Object.assign(actor, before);
        const next = crowd.steer(actor, proposed, step, (x, y, tx, ty) => typeof mapNavigation !== 'undefined' ? mapNavigation.clear(x, y, tx, ty) : mt(x, y, tx, ty));
        Object.assign(actor, next);
      }
    }
    if (approach) { actor.waiting = "Hành quân qua cầu"; return; }
    if (distance() > reach + 4 || !actor.see || actor.cooldown > 0) return;
    const cost = skill.cost || 0;
    if (skill.costLife && actor.hp <= cost) { actor.waiting = "Chưa đủ sinh lực để ra chiêu"; return; }
    if (actor.battlefieldTeam && !actor.battlefieldBoss && !skill.costLife && actor.mana < cost) { actor.waiting = "Chờ hồi nội lực để ra chiêu"; return; }
    actor.waiting = recovering ? "Đánh thường trong lúc hồi nội lực" : "";
    if (skill.costLife) actor.hp -= cost;
    else if (actor.battlefieldTeam && !actor.battlefieldBoss) actor.mana -= cost;
    actor.cooldown = Math.max(1 / Math.max(.1, skill.rate || 1), skill.cd || 0);
    const token = actor.generation;
    castSimulatorSkill(actor, target, skill,
      () => token === actor.generation && actors.includes(actor) && actor.hp > 0,
      () => availableTargets(actor), (ability, contact) => {
        const previous = actor.battlefieldLoadout; actor.battlefieldLoadout = loadout;
        try { return hit(actor, ability, contact); } finally { actor.battlefieldLoadout = previous; }
      },
      action => asSim(actor, action, false, loadout));
    actor.casts++; actor.lastCast = { id: skill.id || 0, name: skill.n || "Đánh thường", level: skill.L || 1 };
    actor.act = "at"; actor.actT = 0;
  }
  function draw(context: CanvasRenderingContext2D, actor: SimulatorActor, dt: number) {
    const look = actor.battlefieldBoss ? r0[actor.tid] : actor.look;
    actor.animKey = look && look.anim;
    H8(actor, dt * coldSpeedFactor(actor), actor.moving ? "run" : "st");
    if (actor.act !== "at" && actor.act !== "hurt") ps(actor, actor.moving ? "run" : "st");
    const height = look && look.anim ? asSim(actor, () => {
      // Composite sprites read the current profile/world. Give each SIM its own equipment.
      l.look = actor.battlefieldBoss || typeof yf !== 'function' ? null : yf();
      l.jx = !actor.battlefieldBoss && typeof J3 === 'function' && J3() && typeof N8 === 'function' ? N8() : null;
      if (actor.battlefieldTeam && !actor.battlefieldBoss && l.jx && typeof P0 !== 'undefined' && P0) {
        const key = `${l.jx.sx}:${l.jx.ride}:${l.jx.rows.weapon}`;
        const wardrobe = actor.wardrobe ||= {};
        const clothes = wardrobe[key] ||= randomSimulatorClothes(P0.tabs[l.jx.sx] || {}, l.jx.asc, l.jx.sx);
        Object.assign(l.jx.rows, clothes);
        l.jx.key = JSON.stringify([l.jx.sx, l.jx.rows, l.jx.ride]);
      }
      return kf(look.anim, actor.act || 'st', actor.dir || 0, actor.actT || 0, actor.x, actor.y, Jn);
    }) : 0;
    if (!height && !(look && M8(bA(look.img), look.sz, actor.x, actor.y, 1, actor.face < 0, 1))) {
      context.fillStyle = "#6ee7e0"; context.beginPath(); context.arc(actor.x, actor.y - 18, 14, 0, Math.PI * 2); context.fill();
    }
    if (actor.curse && typeof WP === "function") WP(context, actor, Jn);
    if (actor.stFx && typeof ZP === "function") ZP(context, actor, height ? Math.min(height, 110) : 50, Jn, dt);
    const earned = battlefield?.active ? warRewards.rank(actor) : null;
    const actorName = actor.n;
    const title=actor.battlefieldBoss?'<Nguyên soái>':earned?`<${earned.name}>`:'';
    const color = actor.battlefieldTeam === 'song' ? '#ffcc00' : actor.battlefieldTeam === 'jin' ? '#c77bff' : '#6ee7e0';
    L3(actor.x, actor.y - nameplateOffset(look?.anim, Jn, 1, 0, 55), actorName, color, 12, actor.hp / actor.max, actor.battlefieldTeam && battlefield?.active ? battlefieldHealthColor(actor.battlefieldTeam, battlefield.state.team) : color, title, battlefieldTitleColor(actor.battlefieldBoss ? 'Nguyên soái' : earned?.name || 'Binh sĩ'));
  }
  function text(simOnly = false) { return JSON.stringify({ format: "arena-damage-v1", exportedAt: new Date().toISOString(), oneDamage: sandbox.oneDamage,
    simulators: actors.map(actor => ({ id: actor.simId, name: actor.n, faction: actor.profile.fac, skill: actor.profile.main, attr: actor.profile.attr, skills: actor.profile.sk, pk: actor.pk, farm: actor.farm })),
    player: { name: o.name, faction: o.fac, level: o.lvl, attr: o.attr, skills: o.sk },
    simulator: sim ? { faction: sim.profile.fac, skill: sim.profile.main, attr: sim.profile.attr, skills: sim.profile.sk, stats: statsSnapshot(sim.stats), pk, farm } : null,
    note: "Log thô tối đa 200 sự kiện. SIM PK dùng hs cho kỹ năng rồi áp hấp thụ/khiên người chơi; từng bước nằm trong steps. Độc là sát thương theo thời gian, không phải HP mất ngay.", events: diagnostics.entries.filter(event => !simOnly || event.simId) }, null, 2); }
  function clearLog(simOnly = false) { diagnostics.clear(simOnly ? event => !!event.simId : undefined); }
  function validateProfile(profile: SimulatorProfile): void {
    if (profile?.simMaxHP !== undefined && !SIM_HEALTH_PRESETS.some(hp => hp === profile.simMaxHP)) throw new Error("Mức máu SIM không hợp lệ.");
    if (!profile || !I[profile.fac] || !Number.isSafeInteger(profile.lvl) || profile.lvl < 1 || profile.lvl > 200 || !profile.attr || !profile.sk || !profile.eq) throw new Error("Dữ liệu template không hợp lệ.");
    for (const value of [profile.attrPts, profile.skPts, ...Object.values(profile.attr)]) if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) throw new Error("Điểm template không hợp lệ.");
    for (const [id, value] of Object.entries(profile.sk)) {
      if (!I[profile.fac].skills.includes(+id) || !Number.isSafeInteger(value) || value < 0 || value > skillLimit(profile, T[id])) throw new Error("Kỹ năng template không hợp lệ.");
    }
  }
  function refreshRoster() {
    field("sim-roster").innerHTML = '<option value="">Cấu hình SIM mới</option>' + actors.map(actor => `<option value="${actor.simId}">${D(actor.n)}</option>`).join("");
    field("sim-roster").value = sim?.simId || "";
  }
  function syncSelection() {
    field("sim-health").value = sim?.profile.simMaxHP ? String(sim.profile.simMaxHP) : "";
    if (sim) {
      field("sim-faction").value = sim.profile.fac;
      field("sim-auto-skills").checked = sim.autoSkills; field("sim-auto-potential").checked = sim.autoPotential;
      pk = sim.pk; farm = sim.farm;
      field("sim-pk").checked = pk; field("sim-farm").checked = farm;
    }
    refreshRoster(); updateSkills(); renderBuild(); updateInfo();
  }
  function selectActor(id: string) {
    const actor = actors.find(actor => actor.simId === id);
    if (id && !actor) throw new Error("SIM không còn trên sân.");
    sim = actor || null; syncSelection();
    return sim;
  }
  function renderBuild() {
    if (!sim) { field("sim-build").innerHTML = '<p>Tạo hoặc chọn một SIM để cộng điểm và lưu template.</p>'; return; }
    const profile = sim.profile;
    field("sim-build").innerHTML = `<p>Trấn phái & hỗ trợ: ${(profile.simSupportSkills || []).map((skill:LegacyRecord)=>`${D(skill.name)} cấp ${profile.sk[skill.id] || 0}`).join(" · ") || "Chưa có"}. Bị động, hào quang và buff được đưa vào chỉ số SIM qua cơ chế gốc.</p><h3>Tiềm năng · còn ${profile.attrPts} điểm</h3><table><thead><tr><th>Thuộc tính</th><th>Đã cộng</th><th>Tổng</th><th></th></tr></thead><tbody>${Object.entries(POTENTIALS).map(([key, name]) => `<tr><td>${name}</td><td><input aria-label="${name}" data-potential="${key}" type="number" min="0" max="${(profile.attr[key] || 0) + profile.attrPts}" value="${profile.attr[key] || 0}"></td><td>${sim!.stats[key] ?? "—"}</td><td><button type="button" data-attr-plus="${key}" ${profile.attrPts ? "" : "disabled"}>+1</button></td></tr>`).join("")}</tbody></table><h3>Kỹ năng · còn ${profile.skPts} điểm</h3><table><thead><tr><th>Kỹ năng</th><th>Cấp</th><th>Tối đa</th><th></th></tr></thead><tbody>${I[profile.fac].skills.filter(id => T[id]).map(id => { const value = profile.sk[id] || 0, cap = skillLimit(profile, T[id]); return `<tr><td>${T[id].tier === 90 ? "9x · " : ""}${D(T[id].n)}</td><td><input aria-label="Cấp ${D(T[id].n)}" data-skill-level="${id}" type="number" min="0" max="${Math.min(cap, value + profile.skPts)}" value="${value}"></td><td>${cap}</td><td><button type="button" data-skill-plus="${id}" ${profile.skPts && value < cap ? "" : "disabled"}>+1</button></td></tr>`; }).join("")}</tbody></table><button type="button" data-build-apply="1">Áp dụng điểm đã nhập</button>`;
  }
  function editProfile(action: () => void) {
    if (!sim) throw new Error("Hãy chọn một SIM trước.");
    if (sim.battlefieldBoss) throw new Error("Chỉ số boss do cấu hình chiến trường quản lý.");
    const actor = sim, previous = clone(actor.profile), stats = actor.stats;
    const ratio = actor.hp / Math.max(1, actor.max);
    try {
      action();
      asSim(actor, () => { actor.stats = j0(); actor.stats.life = actor.profile.simMaxHP ?? actor.stats.life; actor.stats.main = resolvedSkill(actor.stats, actor.profile.main); });
    } catch (error) { actor.profile = previous; actor.stats = stats; renderBuild(); throw error; }
    cancelCasts(actor); actor.cooldown = 0;
    Object.assign(actor, { hp: actor.stats.life * ratio, max: actor.stats.life, mana: actor.stats.mana,
      series: actor.stats.series, res: actor.stats.res, def: actor.stats.def, ar: actor.stats.ar, spd: 100 * (actor.stats.speed || 1) });
    renderBuild(); updateInfo();
  }
  function setAttribute(key: Potential, value: number) { editProfile(() => setPotential(sim!.profile, key, value)); }
  function setSkill(id: number, value: number) {
    if (!sim || !I[sim.profile.fac].skills.includes(id)) throw new Error("Kỹ năng không thuộc SIM này.");
    editProfile(() => setSkillLevel(sim!.profile, id, value, T[id]));
  }
  function applyBuildInputs() {
    if (!sim) throw new Error("Hãy chọn một SIM trước.");
    const profile = sim.profile;
    const inputs = Array.from(field("sim-build").querySelectorAll<HTMLInputElement>("input[data-potential],input[data-skill-level]"));
    const potential = inputs.filter(input => input.dataset.potential).sort((a, b) => (+a.value - (profile.attr[a.dataset.potential!] || 0)) - (+b.value - (profile.attr[b.dataset.potential!] || 0)));
    const skills = inputs.filter(input => input.dataset.skillLevel).sort((a, b) => (+a.value - (profile.sk[a.dataset.skillLevel!] || 0)) - (+b.value - (profile.sk[b.dataset.skillLevel!] || 0)));
    editProfile(() => {
      for (const input of potential) setPotential(profile, input.dataset.potential as Potential, +input.value);
      for (const input of skills) {
        const id = +input.dataset.skillLevel!;
        if (!I[profile.fac].skills.includes(id)) throw new Error("Kỹ năng không thuộc SIM này.");
        setSkillLevel(profile, id, +input.value, T[id]);
      }
    });
  }
  function refreshTemplates() {
    field("sim-templates").innerHTML = renderTemplateTable(templateStore.list(), id => I[id]?.n || id,
      id => T[id]?.n || "Đánh thường", D);
  }
  async function saveTemplate(name: string) {
    if (!sim) throw new Error("Hãy chọn một SIM để lưu template.");
    const template = templateStore.save(name, { profile: sim.profile, autoSkills: sim.autoSkills, autoPotential: sim.autoPotential, pk: sim.pk, farm: sim.farm });
    refreshTemplates();
    await flushTemplates();
    return template;
  }
  async function flushTemplates() {
    const sync = (window as Window & { localGameStorage?: { flush(): Promise<void>; readonly pending: number } }).localGameStorage;
    if (sync) {
      await sync.flush();
      // flush() may return early when the existing bootstrap queue is already busy.
      // Wait for that queue before reporting a durable save.
      const deadline = Date.now() + 5000;
      while (sync.pending > 0 && typeof window.setTimeout === "function" && Date.now() < deadline) {
        await new Promise<void>(resolve => window.setTimeout(resolve, 100));
        await sync.flush();
      }
      if (sync.pending > 0) throw new Error("Template đang chờ đồng bộ SQLite. Kiểm tra kết nối rồi lưu lại.");
    }
  }
  async function deleteTemplate(id: string) {
    templateStore.remove(id); refreshTemplates();
    await flushTemplates();
  }
  function createFromTemplate(id: string) {
    const template = templateStore.list().find(template => template.id === id);
    if (!template) throw new Error("Template không tồn tại.");
    return create(template.profile.fac, template.profile.main, false, false, template);
  }

  const { field } = mountSimulatorPanel(renderSimulatorControls(Object.values(I), D));
  function updateSkills() {
    const faction = I[field("sim-faction").value];
    const active = faction.skills.filter(id => T[id] && UA(T[id]));
    const skills90 = active.filter(id => T[id].tier === 90);
    const skills150 = active.filter(id => T[id].tier === 150);
    const option = (id: number) => `<option value="${id}">${T[id].tier >= 90 ? `Lv${T[id].tier} · ` : ""}${D(T[id].n)}</option>`;
    field("sim-skill").innerHTML = '<option value="basic">Đánh thường</option>' +
      (skills90.length ? `<optgroup label="Kỹ năng 9x · cấp tối đa">${skills90.map(option).join("")}</optgroup>` : "") +
      (skills150.length ? `<optgroup label="Kỹ năng 150 · cấp tối đa">${skills150.map(option).join("")}</optgroup>` : "") +
      `<optgroup label="Kỹ năng khác">${active.filter(id => ![90, 150].includes(T[id].tier)).map(option).join("")}</optgroup>`;
    field("sim-skill").value = String(sim && sim.profile.fac === faction.key ? sim.profile.main : skills90[0] || active[0] || "basic");
  }
  function updateInfo() {
    const rosterHTML = renderSimulatorRoster(actors, sim?.simId, D);
    if (field("sim-list").innerHTML !== rosterHTML) field("sim-list").innerHTML = rosterHTML;
    field("sim-info").textContent = sim ? `${actors.length} SIM trên sân · ${sim.n} · HP ${Math.ceil(Math.max(0, sim.hp))}/${Math.ceil(sim.max)} · MP ${sim.battlefieldTeam ? Math.ceil(sim.mana) + "/" + Math.ceil(sim.stats.mana) : "∞"} · Chiêu ${T[sim.profile.main]?.tier === 90 ? "9x · " : ""}${sim.stats.main.n || "Đánh thường"} cấp ${sim.stats.main.L || 1} · Đã tung ${sim.casts} lần${sim.waiting ? " · " + sim.waiting : ""} · Điểm KN ${sim.profile.skPts} / TN ${sim.profile.attrPts} · ${sim.pk ? "PK" : sim.farm ? "Đánh quái" : "Đứng chờ"}` : `${actors.length} SIM trên sân. Chọn cấu hình rồi bấm Tạo thêm SIM.`;
  }
  field("sim-faction").value = o.fac;
  function applySelectedSkill() {
    if (!sim) return;
    try { selectSkill(field("sim-skill").value); renderBuild(); }
    catch (error) { updateSkills(); field("sim-status").textContent = errorMessage(error); }
  }
  field("sim-faction").onchange = () => { sim = null; updateSkills(); refreshRoster(); renderBuild(); updateInfo(); };
  field("sim-skill").onchange = applySelectedSkill;
  field("sim-health").onchange = () => {
    if (!sim) return;
    try {
      const hp = field("sim-health").value ? Number(field("sim-health").value) : undefined;
      if (hp !== undefined && !SIM_HEALTH_PRESETS.some(value => value === hp)) throw new Error("Mức máu SIM không hợp lệ.");
      editProfile(() => { if (hp === undefined) delete sim!.profile.simMaxHP; else sim!.profile.simMaxHP = hp; });
      sim.hp = sim.max;
      updateInfo();
      field("sim-status").textContent = "Đã cập nhật máu và hồi đầy HP cho SIM được chọn.";
    } catch (error) { field("sim-status").textContent = errorMessage(error); }
  };
  field("sim-create").onclick = () => {
    try { create(field("sim-faction").value, field("sim-skill").value, field("sim-auto-skills").checked, field("sim-auto-potential").checked); }
    catch (error) { field("sim-info").textContent = errorMessage(error); }
  };
  for (const id of ["sim-auto-skills", "sim-auto-potential"] as const) field(id).onchange = () => {
    if (sim) { try { editProfile(() => { if (field(id).checked) asSim(sim!, () => { if (id === "sim-auto-skills") Pt(); else yt(); }); sim!.autoSkills = field("sim-auto-skills").checked; sim!.autoPotential = field("sim-auto-potential").checked; }); } catch (error) { field("sim-status").textContent = errorMessage(error); } }
  };
  field("sim-roster").onchange = () => { try { selectActor(field("sim-roster").value); } catch (error) { field("sim-status").textContent = errorMessage(error); } };
  field("sim-build").onchange = event => {
    const input = event.target as HTMLInputElement;
    try {
      if (input.dataset.potential) setAttribute(input.dataset.potential as Potential, +input.value);
      else if (input.dataset.skillLevel) setSkill(+input.dataset.skillLevel, +input.value);
      field("sim-status").textContent = "Đã cập nhật điểm của SIM được chọn.";
    } catch (error) { field("sim-status").textContent = errorMessage(error); renderBuild(); }
  };
  field("sim-build").onclick = event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!button || !sim) return;
    try {
      if (button.dataset.buildApply) applyBuildInputs();
      else if (button.dataset.attrPlus) { const key = button.dataset.attrPlus as Potential; setAttribute(key, (sim.profile.attr[key] || 0) + 1); }
      else if (button.dataset.skillPlus) { const id = +button.dataset.skillPlus; setSkill(id, (sim.profile.sk[id] || 0) + 1); }
      field("sim-status").textContent = "Đã cộng điểm.";
    } catch (error) { field("sim-status").textContent = errorMessage(error); }
  };
  field("sim-template-save").onclick = async () => {
    try { applyBuildInputs(); await saveTemplate(field("sim-template-name").value); field("sim-status").textContent = "Đã lưu template và đồng bộ dữ liệu."; }
    catch (error) { field("sim-status").textContent = errorMessage(error); }
  };
  field("sim-templates").onclick = async event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!button) return;
    try {
      if (button.dataset.templateCreate) {
        createFromTemplate(button.dataset.templateCreate);
        field("sim-status").textContent = "Đã tạo thêm SIM từ template.";
      } else if (button.dataset.templateDelete) {
        button.disabled = true;
        await deleteTemplate(button.dataset.templateDelete);
        field("sim-status").textContent = "Đã xóa template và đồng bộ dữ liệu.";
      }
    } catch (error) { field("sim-status").textContent = errorMessage(error); }
  };
  field("sim-remove").onclick = () => { remove(); updateInfo(); };
  field("sim-pk").onchange = event => setPK((event.target as HTMLInputElement).checked);
  field("sim-farm").onchange = event => setFarm((event.target as HTMLInputElement).checked);
  field("sim-list").onclick = event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!button) return;
    const id = button.dataset.simDelete || button.dataset.simSelect;
    const actor = actors.find(actor => actor.simId === id);
    if (!actor) return;
    if (button.dataset.simDelete) { remove(actor); updateInfo(); }
    else selectActor(actor.simId);
  };
  let previousField: LegacyRecord | null = null;
  function battleProfile(build: ArmyBuild, faction = build.faction, boss = false, main?: number) {
    if (!I[faction] || I[faction].novice) throw new Error("Môn phái không hợp lệ.");
    const profile = sandbox.createProfile(I[faction]);
    const power = { weak: { enh: 0 }, normal: { enh: 0 }, strong: { enh: 8 } }[build.strength];
    profile.lvl = build.level; profile.attr = { str: 0, dex: 0, vit: 0, eng: 0 }; profile.attrPts = (build.level - 1) * z2;
    profile.sk = {}; profile.skL = {}; profile.bkOk = {}; profile.skPts = boss ? 500 : Math.max(0, build.level - 1);
    profile.eq = {}; profile.inv = []; profile.battlefieldBuild = { ...power, equipped: build.equipped !== false };
    const eligible = I[faction].skills.filter(id => T[id] && profile.lvl >= (T[id].req || 0));
    for (const id of eligible) {
      const skill = T[id]; profile.bkOk[id] = 1;
      if (boss || [90, 150].includes(skill.tier)) {
        const points = Math.min(skill.max || 1, boss && ![90, 150].includes(skill.tier) ? profile.skPts : Infinity);
        profile.sk[id] = points;
        if (boss && ![90, 150].includes(skill.tier)) profile.skPts -= points;
        profile.skL[id] = { lv: points, xp: 0 };
      }
    }
    const active = eligible.filter(id => UA(T[id]));
    const preferred = active.filter(id => T[id].tier === (build.skillTier || 90));
    if (!boss && build.skillTier === 150 && !preferred.length) throw new Error('Cấp hiện tại chưa dùng được chiêu 150 của môn phái này.');
    const selected = main || preferred[Math.floor(Math.random() * preferred.length)] || active[0];
    // Unarmed builds use the game's basic attack, which has no weapon requirement.
    profile.main = build.equipped === false ? 'basic' : selected || 'basic';
    profile.mainLock = true; profile.slots = profile.main === 'basic' ? [] : [+profile.main];
    if (profile.main !== 'basic' && !profile.sk[profile.main]) { profile.sk[profile.main] = 1; profile.skPts = Math.max(0, profile.skPts - 1); }
    const player = o, world = l;
    try {
      o = profile; l = Object.assign({}, world, { quiet: true, sim: true, buffAssume: true, look: null, jx: null, ignoreEqt: null });
      if (build.equipped !== false) {
        const code = selected ? j1(T[selected]) : null;
        const weapon: [number, number] = code === null ? Kr(I[faction]) : [code >= 100 ? 1 : 0, code >= 100 ? code - 100 : code === -1 ? 6 : code];
        profile.eq = createArmyEquipment(equipmentTrader, { sex: profile.sex || 0, level: build.level, factionId: Number((I[faction] as unknown as LegacyRecord).id), series: I[faction].series || 0, weapon, points: profile.attrPts, enh: power.enh, strength: build.strength }, G5, V2);
        if (!boss && build.equipmentKind && build.equipmentKind !== 'blue') {
          const findThienTuTemplate = (name: string) => {
            const template = g3(name);
            return template && /^\[Thiên Tứ\]/iu.test(template.n) ? template : null;
          };
          profile.eq = applyArmySetEquipment({ goldCatalog: factionKey => equipmentTrader.goldCatalog(factionKey), canUpgrade: template => !!findThienTuTemplate(template.n),
            make(template, kind) {
              const nativeTemplate = kind === 'gold' ? template : findThienTuTemplate(template.n);
              if (!nativeTemplate) return null;
              const item = Ta(kind === 'gold' ? 'gold' : 'platina', nativeTemplate, 10);
              Object.assign(item, { lock: true, enh: power.enh });
              if (kind === 'thientu') { Object.assign(item, { plv:0, pv2:1, pv3:1 }); os(item); }
              return item;
            },
          }, profile.eq, { faction, sex:profile.sex || 0, level:build.level, weapon, kind:build.equipmentKind });
        }
      }
      if (!boss) {
        const horse = build.equipped !== false ? chooseWarMount(S.items?.[10]?.list || [], build.level, build.mount) : null;
        if (horse) { const item = _A(10,horse.k,horse.lvl,0); if(item)profile.eq.horse=item; }
        profile.simSupportSkills = prioritizeLevel60Support(profile, eligible.map(id=>T[id]), skill=>typeof wn==='function'?wn(skill):UA(skill)?'atk':'passive');
      }
      // Use the existing suggestion engines, after assigning gear so its requirements are met.
      if (typeof j5 === 'function') j5();
      if (!boss) Pt();
      yt();
      if (build.equipmentKind && build.equipmentKind !== 'blue' && typeof p0 === 'function' && Object.values(profile.eq).some(item => !p0(item))) throw new Error('Chưa đủ điều kiện mặc bộ môn phái. Tăng level hoặc chọn đồ xanh.');
    } finally { o = player; l = world; }
    return profile;
  }
  type SoldierLoadout = { profile: SimulatorProfile; stats: SimulatorStats };
  const soldierLoadouts = new Map<number,SoldierLoadout>();
  function soldierLoadout(id: number): SoldierLoadout {
    const cached = soldierLoadouts.get(id);
    if (cached) return cached;
    const option = soldierSkillOptions(T,Object.values(I),UA).find(skill => skill.id === id);
    if (!option) throw new Error('Quái chỉ dùng chiêu tấn công cấp 50–70.');
    const profile = battleProfile({team:'song',faction:option.faction,level:120,strength:'weak',count:1},option.faction,true,id);
    profile.sk[id] = T[id].max || 1; profile.skL[id] = {lv:profile.sk[id],xp:0};
    const player = o, world = l;
    try {
      o = profile; l = Object.assign({},world,{sim:true,quiet:true,buffAssume:true,look:null,jx:null,ignoreEqt:null});
      const stats = j0(); stats.main = resolvedSkill(stats,id);
      const loadout = {profile,stats}; soldierLoadouts.set(id,loadout); return loadout;
    } finally { o = player; l = world; }
  }
  function castSoldierSkill(monster: LegacyEntity,target: LegacyEntity,loadout: SoldierLoadout) {
    const skill = loadout.stats.main;
    const reach = skill.geo?.k === 'self' ? skill.geo.r || skill.rad : skill.rad;
    if (skillCastDistance(monster,target) > reach + (target.r || 12)/QA + 4 ||
      (!skillIgnoresTerrain(skill) && !mt(monster.x,monster.y,target.x,target.y))) return;
    const caster = monster as SimulatorActor;
    Object.assign(caster,{profile:loadout.profile,stats:loadout.stats,mana:loadout.stats.mana,battlefieldLoadout:loadout});
    const revision = caster.actionRevision || 0;
    const targets = () => [...actors,...roadMonsters.actors,battlefieldHero].filter(candidate=>battlefield!.canHit(caster,candidate));
    castSimulatorSkill(caster,target,skill,
      ()=>!!battlefield?.running && roadMonsters.actors.includes(caster) && !caster.dead && caster.hp>0 && (caster.actionRevision || 0)===revision,
      targets,(ability,contact)=>{
        // Delayed missiles keep the profile of the skill that launched them,
        // even after the monster rotates to a different faction's next skill.
        const previous = caster.battlefieldLoadout; caster.battlefieldLoadout = loadout;
        try { return hit(caster,ability,contact); } finally { caster.battlefieldLoadout = previous; }
      },action=>asSim(caster,action,false,loadout));
    caster.battlefieldSkillCooldown = Math.max(caster.cd || 1,1/Math.max(.1,skill.rate || 1),skill.cd || 0);
    caster.battlefieldSkillIndex = (caster.battlefieldSkillIndex || 0)+1;
    caster.lastCast = {id:skill.id || 0,name:skill.n || '',level:skill.L || 1};
    caster.act = 'at'; caster.actT = 0; caster.casts = (caster.casts || 0)+1;
  }
  function spawnBattleActor(build: ArmyBuild, bossElement?: number) {
    const profile = battleProfile(build, build.faction, bossElement !== undefined);
    const skill = profile.main;
    const actor = create(profile.fac, skill, false, false, { version: 1, id: 'battle', name: I[profile.fac].n, updatedAt: '', profile, autoSkills: false, autoPotential: true, pk: true, farm: false });
    if(bossElement===undefined){actor.n=simNames.next(actor.profile.sex);actor.profile.name=actor.n;}
    actor.battlefieldTeam = build.team;
    if (bossElement === undefined) syncMount(actor);
    if (bossElement !== undefined) {
      const ids = SOLDIER_RANK_SKINS.marshal.filter(id => r0[id]);
      const bossId = ids.find(id => j2(id) === bossElement) ?? ids[0];
      if (bossId === undefined) { remove(actor); throw new Error('Không có boss Hoàng Kim trong catalog.'); }
      actor.tid = bossId; actor.n = r0[bossId].n; actor.goldBoss = true; actor.cls = 'boss';
      actor.series = bossElement; actor.stats.series = bossElement;
      actor.res = actor.stats.res = Object.fromEntries(['phys', 'cold', 'fire', 'poison', 'light'].map(key => [key, 25]));
      const deck: { profile: SimulatorProfile; stats: SimulatorStats }[] = [];
      for (const faction of ELEMENT_FACTIONS[bossElement]) {
        const source = battleProfile(build, faction, true);
        for (const id of I[faction].skills.filter(id => source.sk[id] && UA(T[id]) && [90, 150].includes(T[id].tier))) {
          const profile = battleProfile(build, faction, true, id); profile.main = id; profile.slots = [id];
          asSim(actor, () => {
            const stats = j0(); stats.main = resolvedSkill(stats, id);
            deck.push({ profile, stats });
          }, true, { profile, stats: actor.stats });
        }
      }
      if (!deck.length) { remove(actor); throw new Error('Boss không có kỹ năng 90/150 phù hợp.'); }
      actor.battlefieldDeck = deck;
    }
    return actor;
  }
  // asSim swaps v/l synchronously; team identity must always refer to the real player.
  const battlefieldHero = v, battlefieldWorld = l;
  const warRewards = createWarRewards({
    event(message) { warEvents.push(message); if(warEvents.length>300)warEvents.shift(); },
    name: actor => actor === battlefieldHero ? previousField?.name || battlefieldHero.n || "Người chơi" : actor.n,
    player: () => battlefieldHero, team: () => battlefield!.state.team,
    running: () => !!battlefield?.running, alive: () => battlefieldWorld.life>0 && !(battlefieldWorld.deadT>0), changed: () => { battlefieldWorld.dirty=true; if(typeof R !== 'undefined')R=true; } });
  const supplies = createWarSupplies({ running: () => !!battlefield?.running,
    pharmacyPositions: () => {
      const state = battlefield?.state, map = state && typeof MapsEngine !== 'undefined' && MapsEngine.getMap?.(state.mapId);
      return map ? mapNpcs(map).filter(npc => npc.npcId === 'pharmacy' && (!npc.team || npc.team === state!.team)).map(npc => npc.position) : undefined;
    },
    alive: () => battlefieldWorld.life > 0 && !(battlefieldWorld.deadT > 0),
    team: () => battlefield!.state.team, position: () => battlefieldHero,
    changed: () => { if(typeof R !== 'undefined')R=true; },
    catalog: () => (S.potions || []).filter((potion:LegacyRecord) => typeof be==='undefined'||o.lvl >= (be[potion.tier] || 999)).map((potion:LegacyRecord) => ({...potion,key:`${potion.kind}:${potion.tier}`,price:typeof Ot==='function'?Ot(potion):potion.price||0})),
    pay(amount){if(!Number.isFinite(amount)||amount<0||o.gold<amount)return false;o.gold-=amount;battlefieldWorld.dirty=true;return true;},
    recover(resource,selectedPotion) {
      if ((battlefieldWorld.potCd?.[resource] || 0) > 0) return false;
      const potion=selectedPotion;
      if (!potion || (potion.kind==='both' ? battlefieldWorld.life>=battlefieldWorld.P.life && battlefieldWorld.mana>=battlefieldWorld.P.mana : battlefieldWorld[resource]>=battlefieldWorld.P[resource])) return false;
      applyPotionRecovery(battlefieldWorld, resource, potion);
      battlefieldWorld.potCd ||= { life:0, mana:0 }; battlefieldWorld.potCd[resource] = ao;
      if(potion.kind==='both')battlefieldWorld.potCd.life=battlefieldWorld.potCd.mana=ao;
      return true;
    },
  });
  const nativeManualPotion = typeof Ms === 'function' ? Ms : null;
  Ms = function(resource) {
    if (!battlefield?.active) { nativeManualPotion?.(resource); return; }
    if (!supplies.use(resource)) k('Không dùng được bình. Hết bình hãy về điểm tập trung nhận tiếp tế.');
  };
  const nativeAutoPotion = typeof X9 === 'function' ? X9 : null;
  X9 = function(dt) {
    if (!battlefield?.active) { nativeAutoPotion?.(dt); return; }
    if (o.potOff || !battlefield.running) return;
    for (const resource of ['life','mana'] as const) {
      const threshold = E((o[resource === 'life' ? 'potHp' : 'potMp'] ?? 50)/100,.05,.95);
      const primarySkill = battlefieldWorld.P.main;
      const needsCastingMana = resource === 'mana' && !primarySkill.costLife && battlefieldWorld.mana < (primarySkill.cost || 0)*2;
      if (battlefieldWorld[resource] < battlefieldWorld.P[resource]*threshold || needsCastingMana) supplies.use(resource);
    }
  };
  const warInventory = createWarInventory({ active: () => !!battlefield?.active, rewards: warRewards,
    refresh: () => { R=true; An(); },
    details(title, description, use) {
      J(`<h3>${D(title)}</h3><p>${D(description)}</p><button class="btn" id="war-item-use">Sử dụng</button><button class="btn" id="war-item-close">Đóng</button>`, () => {
        m('#war-item-use').onclick = () => { try { use(); n0(true); } catch(error) { k(errorMessage(error)); } };
        m('#war-item-close').onclick = () => n0(true);
      });
    },
  });
  function recordBattlefieldHit(source: LegacyEntity,target: LegacyEntity) { warRewards.record(source,target); }
  function applyBattlefieldBonuses(stats: LegacyRecord) { if (!l.sim && l.battlefield) warRewards.apply(stats); }
  function drawBattlefieldLoot(context: CanvasRenderingContext2D) {
    if (!battlefield?.active) return;
    context.save(); context.textAlign='center'; context.font='11px sans-serif';
    const supplyCamp = CAMPS[battlefield.state.team];
    context.fillStyle='#ffdf9788';context.beginPath();context.ellipse(supplyCamp.x,supplyCamp.y,SUPPLY_RADIUS,SUPPLY_RADIUS/2,0,0,Math.PI*2);context.strokeStyle='#ffdf97';context.stroke();
    context.fillText('Điểm tập trung · Tiếp tế',supplyCamp.x,supplyCamp.y-55);
    for(const drop of warRewards.drops) {
      context.fillStyle='#0008';context.beginPath();context.ellipse(drop.x,drop.y+3,12,5,0,0,Math.PI*2);context.fill();
      context.fillStyle=WAR_ITEMS[drop.kind].color;context.beginPath();context.arc(drop.x,drop.y-8,7,0,Math.PI*2);context.fill();
      context.strokeStyle='#fff8';context.stroke();context.fillText(WAR_ITEMS[drop.kind].name,drop.x,drop.y-23);
    }
    context.restore();
  }
  function receiveSoldierHit(target: LegacyEntity,source: LegacyEntity) {
    if(!battlefield?.canHit(source,target))return;
    if(Math.random()*100>=Pe(source.ar||0,target.def||0))return;
    const damage=Math.max(0,ja((source.dmg||0)*Z(.8,1.2),'phys',source.series,target.series,target.res,75,0));
    target.hp=Math.max(0,target.hp-damage);if(target.arenaSim)reflectHit(target,source,{parts:{phys:damage},rad:source.reach||0,melee:!source.ranged},damage);if(damage>0)recordBattlefieldHit(source,target);applyActorHurt(target,damage,target.max);showDamageNumber(target,damage);
  }
  battlefield = createBattlefield({
    actors: () => [...actors], monsters: () => roadMonsters.actors, monsterCount: () => roadMonsters.totalCount, player: () => battlefieldHero, playerAlive: () => battlefieldWorld.life > 0 && !(battlefieldWorld.deadT > 0),
    teamPoints: () => warRewards.totals,
    finished(result, points) {
      battlePanel.close(); pharmacy.close(); leaderboard.close();
      if(typeof horseTrader !== "undefined") horseTrader?.close();
      resultDialog.open(result,points);
    },
    marshalHP: () => roadMonsters.configuration.marshal.hp,
    inAttackRange(actor, target) {
      const preferred = actor.stats.main;
      const skill = !preferred.costLife && actor.mana < (preferred.cost || 0) ? actor.stats.basic : preferred;
      const reach = skill.geo?.k === 'self' ? skill.geo.r || skill.rad : skill.rad;
      return skillCastDistance(actor,target) <= reach + (target.r || 12)/QA + 4 &&
        (skillIgnoresTerrain(skill) || mt(actor.x,actor.y,target.x,target.y));
    },
    playerDPS: () => estimateDPS({ stats: battlefieldWorld.P } as SimulatorActor), create: spawnBattleActor, cancel: actor => {if(actor.hp<=0)warRewards.killed(actor);cancelCasts(actor);}, remove,
    enter(team) {
      previousField = { key: Z0.key, bgImg: l.bgImg, zoneShown: l.zoneShown, town: l.town, name: o.name, x: v.x, y: v.y, life: l.life, mana: l.mana, ctrl: o.ctrl, autoMap: o.autoMap };
      for (const actor of [...actors]) remove(actor);
      sandbox.clearCombat?.(false);
      ma(BATTLE_MAP); l.bgImg = bA(MapsEngine.getMapBackground(BATTLE_MAP)); l.zoneShown = BATTLE_MAP;
      l.town = false; l.battlefield = true; o.ctrl = 'manual'; o.autoMap = false;
      const arenaPanel = document.getElementById('combat-sandbox'); if (arenaPanel) arenaPanel.inert = true;
      Object.assign(v, CAMPS[team]); l.life = l.P.life; l.mana = l.P.mana;
      simNames.reset(); warEvents.length=0; warRewards.reset(); supplies.reset(true); roadMonsters.start(); updateWarNpcs();
    },
    leave() {
      roadMonsters.clear(); warRewards.reset(); supplies.reset();
      if (!previousField) return;
      sandbox.clearCombat?.(false);
      ma(previousField.key); Object.assign(v, { x: previousField.x, y: previousField.y });
      Object.assign(l, { bgImg: previousField.bgImg, zoneShown: previousField.zoneShown, town: previousField.town, life: previousField.life, mana: previousField.mana, battlefield: false, deadT: 0 });
      o.ctrl = previousField.ctrl; o.autoMap = previousField.autoMap; previousField = null;
      const arenaPanel = document.getElementById('combat-sandbox'); if (arenaPanel) arenaPanel.inert = false;
    },
    respawnPlayer(team) {
      warRewards.revived(battlefieldHero);
      l.life = l.P.life; l.mana = l.P.mana; l.deadT = 0;
      l.slowT = l.slowPower = l.stunT = l.hpDotT = l.hpDot = 0;
      Object.assign(v, CAMPS[team], { act: 'st', actT: 0, castT: 0, hurtT: 0 });
      v.actionRevision = (v.actionRevision || 0) + 1;
    },
    setPlayerDead(team, waitSeconds) {
      warRewards.killed(battlefieldHero);
      Object.assign(battlefieldHero, CAMPS[team]);
      battlefieldWorld.life = 0; battlefieldWorld.deadT = waitSeconds; battlefieldWorld.manTgt = battlefieldWorld.tgt = battlefieldWorld.moveTo = null;
      battlefieldWorld.slowT = battlefieldWorld.stunT = battlefieldWorld.hpDotT = battlefieldWorld.hpDot = 0;
      battlefieldHero.actionRevision = (battlefieldHero.actionRevision || 0) + 1;
      for (const key of ['combatProjectiles', 'fx', 'fxQ']) battlefieldWorld[key] = (battlefieldWorld[key] || []).filter((effect: LegacyRecord) => effect.combat?.actor !== battlefieldHero);
    },
    position(actor, x, y) { [actor.x, actor.y] = X0(x, y); actor._pp = null; actor._pk = ''; },
    restore(actor) {
      warRewards.revived(actor);
      cancelCasts(actor); actor.hp = actor.max; actor.mana = actor.stats.mana;
      actor.dead = false; actor.target = null; actor.cooldown = 0;
      actor.poison = actor.poisonDmg = actor.stun = actor.slowT = actor.slowPower = actor.hurtT = actor.castT = 0;
      actor.act = 'st'; actor.actT = 0;
      l.corpses = (l.corpses || []).filter((corpse: LegacyEntity) => corpse !== actor);
    },
  });
  const pharmacy=mountWarPharmacy(supplies,D);
  const leaderboard=mountWarLeaderboard(()=>buildWarStandings([
    {id:'player',name:previousField?.name||o.name,team:battlefield!.state.team,points:warRewards.rank(battlefieldHero).points,title:warRewards.rank(battlefieldHero).name,soldierKills:warRewards.rank(battlefieldHero).soldierKills,player:true},
    ...actors.filter(actor=>actor.battlefieldTeam&&!actor.battlefieldBoss).map(actor=>({id:actor.simId,name:actor.n,team:actor.battlefieldTeam,points:warRewards.rank(actor).points,title:warRewards.rank(actor).name,soldierKills:warRewards.rank(actor).soldierKills,player:false})),
  ]),D,()=>warRewards.totals,()=>battlefield!.state);
  const resultDialog = mountBattlefieldResult(() => battlefield!.acknowledgeResult());
  const battlePanel=mountBattlefieldPanel(battlefield,Object.values(I),D,warRewards,supplies,{configureSoldiers: (configuration,applyNow=false) => {
      const available = soldierSkillOptions(T,Object.values(I),UA);
      for (const settings of Object.values(configuration)) for (const id of settings.skills || []) {
        if (!available.some(skill => skill.id === id)) throw new Error('Chỉ chọn chiêu tấn công cấp 50–70 trong catalog.');
      }
      if (applyNow && !battlefield!.running) throw new Error('Trận không còn chạy.');
      roadMonsters.configure(configuration);
      if (applyNow) roadMonsters.restart();
    }, skills: soldierSkillOptions(T,Object.values(I),UA),
    mounts: warMountOptions(S.items?.[10]?.list || []),
    preferPKSim: () => !!o.preferPKSim,
    setPreferPKSim(value) { o.preferPKSim = value; l.tgt = null; l.dirty = true; },
    openPharmacy:()=>pharmacy.open(),openLeaderboard:()=>leaderboard.open()});
  const idleNpcPosition={x:battlefieldHero.x+110,y:battlefieldHero.y};
  let recruitmentNpc:LegacyRecord|null=null,pharmacyNpc:LegacyRecord|null=null;
  function updateWarNpcs(){
    if(typeof equipmentTrader==='undefined'||!equipmentTrader.place)return;
    if(!recruitmentNpc)recruitmentNpc=equipmentTrader.place({...idleNpcPosition,name:'Chiêu Mộ Sứ',animation:r0[716].anim,subtitle:'Cài đặt Tống Kim',onInteract:()=>battlePanel.open(),visible:()=>true});
    if(!pharmacyNpc)pharmacyNpc=equipmentTrader.place({...idleNpcPosition,name:'Chủ Dược Điếm',animation:r0[852].anim,subtitle:'Thuốc sinh lực · Nội lực',onInteract:()=>pharmacy.open(),visible:()=>!!battlefield?.active});
    const camp=battlefield?.active?CAMPS[battlefield.state.team]:idleNpcPosition;
    Object.assign(recruitmentNpc,battlefield?.active?{x:camp.x+105,y:camp.y+50}:idleNpcPosition);
    Object.assign(pharmacyNpc,{x:camp.x+145,y:camp.y-45});
  }
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||event.repeat)return;
    if(resultDialog.isOpen){event.preventDefault?.();event.stopImmediatePropagation?.();return;}
    if(!battlefield?.active){if(battlePanel.isOpen)battlePanel.close();return;}
    event.preventDefault?.();event.stopImmediatePropagation?.();
    if(typeof horseTrader !== 'undefined' && horseTrader?.isOpen)horseTrader.close();else if(battlePanel.isOpen)battlePanel.close();else if(pharmacy.isOpen)pharmacy.close();else if(leaderboard.isOpen)leaderboard.close();
    else {const modal=typeof m==='function'?m('#modal'):null;if(modal&&!modal.classList.contains('hidden'))n0(true);else leaderboard.open();}
  },true);
  updateWarNpcs();
  updateSkills(); updateInfo(); refreshRoster(); renderBuild(); refreshTemplates();
  if (typeof combatLog !== "undefined" && combatLog) combatLog.registerSimulatorLog?.(createSimulatorLogView(diagnostics, text, clearLog, D));
  return { battlefieldHealthColor, battlefieldTitleColor, battlefield, resultDialog, openSettings:()=>battlePanel.open(), openPharmacy:(resource:'life'|'mana'='life',selectOnly=false)=>pharmacy.open(resource,selectOnly), leaderboard, roadMonsters, supplies, warInventory, pvpDamageScale, warRewards, applyBattlefieldBonuses, recordBattlefieldHit, drawBattlefieldLoot, receiveSoldierHit, create, selectSkill, selectActor, remove, setPK, setFarm, tick, draw, step, capture, forcedDamage, receiveMonsterHit, text, clearLog, setAttribute, setSkill, saveTemplate, deleteTemplate, createFromTemplate, templates: templateStore.list,
    get actor() { return sim; }, get actors() { return [...actors]; }, get events() { return clone(diagnostics.entries); } };
}
