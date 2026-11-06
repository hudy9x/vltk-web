import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSimulation, seededRandom } from './simulation.ts';
import type { BattleActor } from './types.ts';
import type { SimulatorSkill, LegacyEntity } from '../../src/client/simulator/types.ts';

const directory = path.resolve(process.argv[2] || 'output/tianwang-150/blue');
const repeats = Number(process.argv[3] || 3);
const maximumSeconds = Number(process.argv[4] || 60);
const resistanceMode = process.argv[5] || 'native';
assert.ok(['native','75'].includes(resistanceMode));
const suffix = resistanceMode === 'native' ? '' : '-res75';
const hurtEnabled = process.argv[7] !== 'no-hurt';
assert.ok(process.argv[7] === undefined || process.argv[7] === 'no-hurt');
assert.ok(Number.isInteger(repeats) && repeats > 0);
assert.ok(Number.isFinite(maximumSeconds) && maximumSeconds > 0);
const { game, dataset, resetCombat, spawnFighter } = createSimulation(directory);
const tianwang = dataset.builds.find(build => build.faction === 'tianwang');
assert.ok(tianwang);
assert.equal(tianwang.profile.main, 1058, 'Generate profiles with the optional 1058 argument');
assert.equal(dataset.builds.length, 10);
const elements = ['phys', 'poison', 'cold', 'fire', 'light'];
const builds = dataset.builds.map(build => {
  const { profile, stats } = build;
  assert.equal(profile.lvl, 150);
  assert.equal(Object.values(profile.attr).reduce((sum, value) => sum + value, 0), 745, build.faction);
  assert.equal(profile.attrPts, 0);
  assert.equal(profile.skPts, 0);
  const regular = Object.entries(profile.sk).filter(([id]) => ![90,150].includes(dataset.T[id]?.tier))
    .reduce((sum, [, value]) => sum + value, 0);
  assert.equal(regular, 149, build.faction);
  assert.ok(stats.life > 0 && stats.mana > 0);
  assert.ok(elements.every(element => Number.isFinite(stats.res[element])));
  assert.equal(Object.values(profile.eq).filter(item => item.d !== 10).length, 10);
  assert.equal(stats.main.id, profile.main);
  const gear = Object.entries(profile.eq).map(([slot, item]) => ({ slot, name: item.n, kind: item.set?.kind || 'blue', affixes: item.mag?.length || 0 }));
  return { faction: build.faction, name: build.name, series: stats.series, level: profile.lvl,
    attr: profile.attr, regularPoints: regular, skills: profile.sk, supports: profile.simSupportSkills,
    life: stats.life, mana: stats.mana, regen: stats.regen, manaRegen: stats.manaRegen,
    resistance: stats.res, resistanceCap: stats.resMaxE, defense: stats.def,
    absorption: stats.sorb, flatShield: stats.dmgShield, manaShield: stats.manaShield,
    damageToMana: stats.dmg2mana, reflectMelee: stats.retMeleeP, reflectRange: stats.retRangeP,
    main: stats.main, gear };
});
interface DamageMetrics {
  contacts: number;
  direct: number;
  poison: number;
  hurtSeconds: number;
  incomingHurtHits: number;
  interruptedWindups: number;
  bySkill: Record<string, { contacts: number; damage: number }>;
}
const emptyMetrics = (): DamageMetrics => ({ contacts: 0, direct: 0, poison: 0, hurtSeconds: 0, incomingHurtHits: 0, interruptedWindups: 0, bySkill: {} });
let metrics: Record<string, DamageMetrics> = {};
const originalHit = game.hs;
// Observe HP after the native PvP, resistance and shield rules. Do not replace
// damage callbacks, rolls, skill components, or hit deduplication.
game.hs = (skill: SimulatorSkill, target: LegacyEntity) => {
  const faction = game.v.profile?.fac as string | undefined;
  const before = target.hp;
  const revision = target.actionRevision || 0, winding = (target.castT || 0) > 0;
  const result = originalHit(skill, target);
  if (faction && metrics[faction] && target.arenaSim) {
    const row = metrics[faction], damage = Math.max(0, before - Math.max(0, target.hp));
    row.contacts++; row.direct += damage;
    const layer = row.bySkill[String(skill.id || 0)] ||= { contacts: 0, damage: 0 };
    layer.contacts++; layer.damage += damage;
    const defender = metrics[target.profile?.fac];
    if (defender && (target.actionRevision || 0) !== revision) {
      defender.incomingHurtHits++;
      if (winding) defender.interruptedWindups++;
    }
  }
  return result;
};
const results: Array<Record<string, unknown>> = [];
const secondsPerTick = 1 / 60;
const config = { repeats, distances: [40,160,320], maximumSeconds, secondsPerTick,
  resistanceMode: resistanceMode === 'native' ? 'native equipment and supports' : 'controlled: both actors have all five resistances set to 75%',
  hurtMechanics: hurtEnabled ? 'native: 15% max HP hit interrupts windup and applies hurt' : 'diagnostic only: hurtProxy suppresses hurt/interrupts; damage and other statuses unchanged',
  level: 150, potential: 745, regularPoints: 149, skillTier: 150, tianwangMain: 1058,
  pvpScale: game.arenaSimulator.pvpDamageScale({ arenaSim: true }, { arenaSim: true }),
  speed: game.CombatEngine.SPEED_CONFIG,
  potions: 'native automatic private bag: 30 life + 30 mana per actor; native cooldowns and thresholds',
  seed: '1000 + opponentIndex * 100 + repetition; identical across distances/gear and mirrored order',
  note: 'Native recommended builds, full ordinary point budgets and learned 90/150 attacks. Native self support assumed; no active curse/aura AI, respawn, players or NPC targets. Each faction uses one primary weapon branch. Timeout is not a draw. Direct damage excludes poison ticks, reflection and life costs; poison is reported separately.' };
fs.writeFileSync(path.join(directory, `build-audit${suffix}.json`), JSON.stringify({ config, builds }, null, 2));
const opponentOrder = ['gaibang','tianren','tangmen','wudu','shaolin','emei','cuiyan','wudang','kunlun'];
const requestedOpponents = process.argv[6]?.split(',') || opponentOrder;
assert.ok(requestedOpponents.length > 0 && new Set(requestedOpponents).size === requestedOpponents.length && requestedOpponents.every(faction => opponentOrder.includes(faction)));
const opponents = requestedOpponents.map(faction => dataset.builds.find(build => build.faction === faction)!);
for (const opponent of opponents) {
  const opponentIndex = opponentOrder.indexOf(opponent.faction);
  for (const distance of config.distances) for (let repetition = 0; repetition < repeats; repetition++) for (const reverse of [false,true]) {
    resetCombat();
    game.Math.random = seededRandom(1000 + opponentIndex * 100 + repetition);
    metrics = { tianwang: emptyMetrics(), [opponent.faction]: emptyMetrics() };
    const first = spawnFighter(reverse ? opponent : tianwang, 'song', 1700);
    const second = spawnFighter(reverse ? tianwang : opponent, 'jin', 1700 + distance);
    const actors = [first,second];
    if (!hurtEnabled) for (const actor of actors) actor.hurtProxy = true;
    game.l.enemies = game.arenaSimulator.actors;
    let ticks = 0;
    for (; ticks < Math.ceil(maximumSeconds / secondsPerTick); ticks++) {
      game.l.clock = ticks * secondsPerTick;
      for (const actor of actors) metrics[actor.profile.fac].hurtSeconds += Math.min(secondsPerTick, actor.hurtT || 0);
      if (resistanceMode === '75') for (const actor of actors) {
        actor.res = Object.fromEntries(elements.map(element => [element,75]));
        actor.stats.res = actor.res;
      }
      // tickActor applies this native poison pool before attacking. Attribute it
      // to the sole opponent and clip lethal poison to the available HP.
      for (const [index, actor] of actors.entries()) if (actor.hp > 0 && actor.poison > 0) {
        metrics[actors[1-index].profile.fac].poison += Math.min(actor.hp + (actor.stats.regen || 0) * secondsPerTick,
          actor.poisonDmg * Math.min(secondsPerTick, actor.poison));
      }
      game.arenaSimulator.tick(secondsPerTick);
      game.advanceSkillContacts(secondsPerTick);
      for (const actor of actors) {
        assert.ok(Number.isFinite(actor.hp) && Number.isFinite(actor.mana) && actor.mana >= -0.001);
        assert.equal(actor.stats.main.id, actor.profile.main, 'Runtime changed the configured primary');
        assert.notEqual(actor.stats.main.n, 'Test skill');
      }
      if (actors.some(actor => actor.hp <= 0)) { ticks++; break; }
    }
    const seconds = Math.min(maximumSeconds, ticks * secondsPerTick);
    const survivors = actors.filter(actor => actor.hp > 0);
    const winner = survivors.length === 1 ? survivors[0].profile.fac : survivors.length === 0 ? 'draw' : 'timeout';
    const state = (actor: BattleActor) => ({ faction: actor.profile.fac, skill: actor.stats.main.n,
      hp: actor.hp, max: actor.max, hpPercent: 100 * actor.hp / actor.max, mana: actor.mana,
      casts: actor.casts, stats: { resistance: actor.res, critical: actor.stats.main.crit },
      potionsUsed: { life: 30 - (actor.potionBag?.life ?? 30), mana: 30 - (actor.potionBag?.mana ?? 30) },
      ...metrics[actor.profile.fac], directDps: metrics[actor.profile.fac].direct / seconds });
    results.push({ opponent: opponent.faction, distance, repetition, reverse, seconds, winner,
      tianwang: state(actors.find(actor => actor.profile.fac === 'tianwang')!),
      defender: state(actors.find(actor => actor.profile.fac !== 'tianwang')!) });
    // Keep completed evidence even if a later scenario fails or is interrupted.
    fs.writeFileSync(path.join(directory, `tianwang-duels${suffix}.json`), JSON.stringify({ config, builds, results }, null, 2));
  }
  const pair = results.filter(result => result.opponent === opponent.faction);
  console.log(JSON.stringify({ opponent: opponent.faction, duels: pair.length,
    wins: pair.filter(result => result.winner === 'tianwang').length,
    losses: pair.filter(result => result.winner === opponent.faction).length,
    timeouts: pair.filter(result => result.winner === 'timeout').length }));
}
