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
declare var o: SimulatorProfile, l: SimulatorWorld, v: LegacyEntity;
declare var I: Record<string, Faction>, T: Record<string, LegacyRecord>, r0: Record<string, LegacyRecord>;
declare var cw: number, Jr: number, Qa: number, Jn: number;
declare var ja: (base: number, kind: string, from: number, to: number, res: Record<string, number>, cap: number, series: number) => number;
declare var Z: (lo: number, hi: number) => number;
declare var Pe: (attack: number, defense: number, ignore?: number) => number;
declare var hs: (skill: SimulatorSkill, target: LegacyEntity) => number;
declare var U9: (attacker: LegacyEntity) => unknown;
declare var $d: (monster: LegacyEntity, dt: number) => unknown;
declare var combatLog: { registerSimulatorLog?(provider: SimulatorLogProvider): void; record(type: string, target: LegacyEntity | string, amount: number, detail?: string, outcome?: string): void } | null;
declare function y1(from: number, to: number): boolean;
declare function j1(skill: LegacyRecord): number | null;
declare function _A(kind: number, weapon: number, level: number, rarity: number): LegacyRecord | null;
declare function X0(x: number, y: number): [number, number];
declare function n1(id: SkillId, level: number, rarity: string, x: number, y: number): LegacyEntity;
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
  const originalHit = hs;
  hs = function (skill, target) {
    return capture(o.name, target, skill, () => {
      const before = target.hp;
      step("Đầu vào nhân vật gây sát thương", { faction: o.fac, level: o.lvl, attr: o.attr, stats: statsSnapshot(l.P), target: { defense: target.def, resistance: target.res, series: target.series, hp: before } });
      const result = originalHit(skill, target);
      step("HP thực mất = max(0, min(HP trước, HP trước − HP sau))", { before, after: target.hp, actualLoss: Math.max(0, Math.min(before, before - target.hp)), returnedDamage: result, poisonDps: target.poisonDmg || 0, poisonSeconds: target.poison || 0 });
      return result;
    });
  };
  const originalIncoming = U9;
  U9 = function (attacker) {
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
  function asSim<T>(actor: SimulatorActor, action: () => T, quiet = true): T {
    const player = o, world = l, hero = v;
    o = actor.profile; v = actor;
    l = Object.assign({}, world, { P: actor.stats || world.P, life: actor.hp, mana: actor.mana, sim: true, quiet,
      buffs: {}, skCd: {}, look: null, jx: null, ignoreEqt: null, buffAssume: true });
    try { return action(); }
    finally { actor.hp = l.life; actor.mana = actor.stats.mana; o = player; l = world; v = hero; }
  }
  function equipSkill(profile: SimulatorProfile, id: SkillId) {
    const weapon = id === "basic" ? null : j1(T[id]);
    if (weapon !== null) {
      const item = _A(weapon >= 100 ? 1 : 0, weapon >= 100 ? weapon - 100 : weapon === -1 ? 6 : weapon, 1, 0);
      if (item) profile.eq.weapon = item;
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
    cancelCasts(); actor.cooldown = 0; actor.waiting = "";
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
    const actor: SimulatorActor = Object.assign(n1(Object.keys(r0)[0], 150, "normal", x, y), {
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
    return { x: v.x, y: v.y, n: o.name, hp: l.life, max: l.P.life, hurtProxy: true, r: 17, cls: "normal", tid: actor.tid,
      def: l.P.def, series: l.P.series, res: l.P.res, act: "at", poison: 0, poisonDmg: 0, slowT: 0, stun: 0 };
  }
  function receiveMonsterHit(actor: SimulatorActor, attacker: LegacyEntity): void {
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
  function hit(actor: SimulatorActor, skill: SimulatorSkill, target: LegacyEntity) {
    const isPlayer = target === v;
    if (isPlayer && (!actor.pk || l.life <= 0)) return 0;
    const receiver = isPlayer ? playerTarget(actor) : target;
    const before = receiver.hp;
    const defense = l.P;
    asSim(actor, () => hs(skill, receiver));
    let damage = Math.max(0, before - receiver.hp);
    if (isPlayer) {
      // hs supplies the shared skill/accuracy/resistance calculation. Apply the
      // player's absorption and mana shield using the same order as U9.
      capture(actor.n, { n: o.name }, { n: "PK · phòng thủ sau sát thương kỹ năng" }, () => {
        const raw = damage;
        const shield = Math.min(defense.dmgShield || 0, damage * Jr);
        damage -= shield;
        damage *= 1 - (defense.sorb || 0) / 100;
        damage *= 1 - ((defense.from && defense.from[actor.series]) || 0) / 100;
        const mana = Math.min(l.mana, damage * (defense.manaShield || 0) / 100);
        l.mana -= mana; damage -= mana;
        step("PK: (kỹ năng − min(khiên, damage × Jr)) × (1 − sorb/100) × (1 − from/100) − khiên mana", { raw, shield, sorb: defense.sorb || 0, from: (defense.from && defense.from[actor.series]) || 0, manaAbsorbed: mana, damage, hpBefore: l.life, hpAfter: Math.max(0, l.life - damage) });
        l.life = Math.max(0, l.life - damage);
        applyActorHurt(v, damage, defense.life);
        if (receiver.poison > 0) {
          const seconds = receiver.poison * (1 - (defense.poisonRed || 0) / 100);
          if (seconds > .05) { l.hpDot = (l.hpDot || 0) + receiver.poisonDmg * seconds; l.hpDotT = Math.max(l.hpDotT || 0, seconds); }
          step("Độc PK chuyển sang DoT; không tính thành HP mất ngay", { dps: receiver.poisonDmg, seconds, pending: l.hpDot || 0 });
        }
        if ((receiver.slowT || 0) > 0) {
          const seconds = (receiver.slowT || 0) * (1 - (defense.freezeRed || 0) / 100);
          // Transfer the resolved intensity without applying resistance a second time.
          applyColdPower(l, receiver.slowPower || 0, seconds);
        }
        l.stunT = Math.max(l.stunT || 0, receiver.stun * (1 - (defense.stunRed || 0) / 100));
        step("HP thực mất", { before, after: l.life, actualLoss: before - l.life });
      });
    }
    if (typeof combatLog !== "undefined" && combatLog) combatLog.record(isPlayer ? "in" : "out", isPlayer ? actor : target, Math.min(before, damage), actor.n + " · " + (skill.n || "Đánh thường"));
    showDamageNumber(isPlayer ? v : target, Math.min(before, damage));
    return damage;
  }
  const monsterTick = $d;
  $d = function (monster, dt) { if (!monster.arenaSim) return monsterTick(monster, dt); };
  const arenaTick = sandbox.tick;
  sandbox.tick = function (dt) { arenaTick(dt); tick(dt); };
  function tick(dt: number) {
    refreshTime += dt;
    if (refreshTime >= .25) { refreshTime = 0; updateInfo(); }
    for (const actor of [...actors]) {
      if (!l.enemies.includes(actor) || actor.dead || actor.hp <= 0) { remove(actor); continue; }
      if (!l.town && !(l.deadT > 0)) tickActor(actor, dt);
    }
  }
  function availableTargets(actor: SimulatorActor): LegacyEntity[] {
    return actor.pk && l.life > 0 ? [v] : actor.farm ?
      l.enemies.filter(enemy => !enemy.arenaSim && !enemy.dead && enemy.hp > 0) : [];
  }
  function tickActor(actor: SimulatorActor, dt: number) {
    actor.mana = actor.stats.mana;
    if (actor.stun > 0) { actor.stun = Math.max(0, actor.stun - dt); return; }
    const speed = coldSpeedFactor(actor);
    actor.slowT = Math.max(0, (actor.slowT || 0) - dt);
    if (actor.poison > 0) {
      const duration = Math.min(dt, actor.poison), before = actor.hp;
      actor.poison -= duration; actor.hp = Math.max(0, actor.hp - actor.poisonDmg * duration);
      showDamageNumber(actor, before - actor.hp, "poison");
      capture("Độc", actor, { n: "DoT SIM" }, () => step("DoT = DPS × min(dt, giây còn lại)", { dps: actor.poisonDmg, duration, before, after: actor.hp }));
      if (actor.hp <= 0) return;
    }
    actor.cooldown = Math.max(0, actor.cooldown - dt * speed);
    if (actorActionLocked(actor)) { actor.moving = false; return; }
    const targets = availableTargets(actor);
    if (!actor.target || !targets.includes(actor.target)) {
      actor.target = targets.sort((a, b) => skillCastDistance(actor, a) - skillCastDistance(actor, b))[0] || null;
      actor.seeT = 0;
    }
    const target = actor.target;
    if (!target) { actor.moving = false; return; }
    const skill = actor.stats.main;
    const reach = skill.geo?.k === "self" ? skill.geo.r || skill.rad : skill.rad;
    const distance = () => Math.max(0, skillCastDistance(actor, target) - (target.r || 12) / QA);
    actor.dir = kn(target.x - actor.x, target.y - actor.y);
    actor.face = target.x >= actor.x ? 1 : -1;
    actor.seeT = (actor.seeT || 0) - dt;
    if (actor.seeT <= 0) { actor.seeT = .25; actor.see = skillIgnoresTerrain(skill) || mt(actor.x, actor.y, target.x, target.y); }
    // Same approach/line-of-sight/cooldown cadence as the monster $d loop.
    actor.moving = distance() > reach || !actor.see;
    if (actor.moving) Mw(actor, target.x, target.y, actor.spd * speed * dt);
    if (distance() > reach + 4 || !actor.see || actor.cooldown > 0) return;
    const cost = skill.cost || 0;
    if (skill.costLife && actor.hp <= cost) { actor.waiting = "Chưa đủ sinh lực để ra chiêu"; return; }
    actor.waiting = "";
    if (skill.costLife) actor.hp -= cost;
    actor.cooldown = Math.max(1 / Math.max(.1, skill.rate || 1), skill.cd || 0);
    const token = actor.generation;
    castSimulatorSkill(actor, target, skill,
      () => token === actor.generation && actors.includes(actor) && actor.hp > 0,
      () => availableTargets(actor), (ability, contact) => hit(actor, ability, contact),
      action => asSim(actor, action, false));
    actor.casts++; actor.lastCast = { id: skill.id || 0, name: skill.n || "Đánh thường", level: skill.L || 1 };
    actor.act = "at"; actor.actT = 0;
  }
  function draw(context: CanvasRenderingContext2D, actor: SimulatorActor, dt: number) {
    const look = actor.look;
    actor.animKey = look && look.anim;
    H8(actor, dt * coldSpeedFactor(actor), actor.moving ? "run" : "st");
    if (actor.act !== "at" && actor.act !== "hurt") ps(actor, actor.moving ? "run" : "st");
    const height = look && look.anim ? kf(look.anim, actor.act || "st", actor.dir || 0, actor.actT || 0, actor.x, actor.y, Jn) : 0;
    if (!height && !(look && M8(bA(look.img), look.sz, actor.x, actor.y, 1, actor.face < 0, 1))) {
      context.fillStyle = "#6ee7e0"; context.beginPath(); context.arc(actor.x, actor.y - 18, 14, 0, Math.PI * 2); context.fill();
    }
    if (actor.curse && typeof WP === "function") WP(context, actor, Jn);
    if (actor.stFx && typeof ZP === "function") ZP(context, actor, height ? Math.min(height, 110) : 50, Jn, dt);
    L3(actor.x, actor.y - nameplateOffset(look?.anim, Jn, 1, 0, 55), actor.n, "#6ee7e0", 12, actor.hp / actor.max, "#6ee7e0");
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
    field("sim-build").innerHTML = `<h3>Tiềm năng · còn ${profile.attrPts} điểm</h3><table><thead><tr><th>Thuộc tính</th><th>Đã cộng</th><th>Tổng</th><th></th></tr></thead><tbody>${Object.entries(POTENTIALS).map(([key, name]) => `<tr><td>${name}</td><td><input aria-label="${name}" data-potential="${key}" type="number" min="0" max="${(profile.attr[key] || 0) + profile.attrPts}" value="${profile.attr[key] || 0}"></td><td>${sim!.stats[key] ?? "—"}</td><td><button type="button" data-attr-plus="${key}" ${profile.attrPts ? "" : "disabled"}>+1</button></td></tr>`).join("")}</tbody></table><h3>Kỹ năng · còn ${profile.skPts} điểm</h3><table><thead><tr><th>Kỹ năng</th><th>Cấp</th><th>Tối đa</th><th></th></tr></thead><tbody>${I[profile.fac].skills.filter(id => T[id]).map(id => { const value = profile.sk[id] || 0, cap = skillLimit(profile, T[id]); return `<tr><td>${T[id].tier === 90 ? "9x · " : ""}${D(T[id].n)}</td><td><input aria-label="Cấp ${D(T[id].n)}" data-skill-level="${id}" type="number" min="0" max="${Math.min(cap, value + profile.skPts)}" value="${value}"></td><td>${cap}</td><td><button type="button" data-skill-plus="${id}" ${profile.skPts && value < cap ? "" : "disabled"}>+1</button></td></tr>`; }).join("")}</tbody></table><button type="button" data-build-apply="1">Áp dụng điểm đã nhập</button>`;
  }
  function editProfile(action: () => void) {
    if (!sim) throw new Error("Hãy chọn một SIM trước.");
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
    field("sim-info").textContent = sim ? `${actors.length} SIM trên sân · ${sim.n} · HP ${Math.ceil(Math.max(0, sim.hp))}/${Math.ceil(sim.max)} · MP ∞ · Chiêu ${T[sim.profile.main]?.tier === 90 ? "9x · " : ""}${sim.stats.main.n || "Đánh thường"} cấp ${sim.stats.main.L || 1} · Đã tung ${sim.casts} lần${sim.waiting ? " · " + sim.waiting : ""} · Điểm KN ${sim.profile.skPts} / TN ${sim.profile.attrPts} · ${sim.pk ? "PK" : sim.farm ? "Đánh quái" : "Đứng chờ"}` : `${actors.length} SIM trên sân. Chọn cấu hình rồi bấm Tạo thêm SIM.`;
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
  updateSkills(); updateInfo(); refreshRoster(); renderBuild(); refreshTemplates();
  if (typeof combatLog !== "undefined" && combatLog) combatLog.registerSimulatorLog?.(createSimulatorLogView(diagnostics, text, clearLog, D));
  return { create, selectSkill, selectActor, remove, setPK, setFarm, tick, draw, step, capture, forcedDamage, receiveMonsterHit, text, clearLog, setAttribute, setSkill, saveTemplate, deleteTemplate, createFromTemplate, templates: templateStore.list,
    get actor() { return sim; }, get actors() { return [...actors]; }, get events() { return clone(diagnostics.entries); } };
}
