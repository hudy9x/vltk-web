import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { collectLegacyDeclarations, createHeadlessGame, installNativeDeclarations } from './legacy-runtime.ts';
import type { BattleActor, FactionBuild, ProfileDataset, Team } from './types.ts';
const require = createRequire(import.meta.url);

/** All scenarios share the same native damage, contact and navigation setup.
 * Visual-only fixture stubs remain, but G3/Be must be native: they emit physical
 * missiles and secondary contacts, so stubbing them changes combat results.
 */
export function createSimulation(outputDirectory: string) {
  const repositoryRoot = process.cwd();
  const dataset = JSON.parse(fs.readFileSync(path.join(outputDirectory, 'profiles.json'), 'utf8')) as ProfileDataset;
  const game = createHeadlessGame(repositoryRoot);
  Object.assign(game, { T: dataset.T, S: dataset.S, JFX: dataset.JFX, A0: dataset.JFX, JW: { mon: game.r0, anim: {} } });
  Object.assign(game.window, { JFX: dataset.JFX, JW: game.JW });
  const nativeSymbols = ['b0', 'F5', 'S5', 'l8', 'nD', 'eD', 'y1', 'Z', 'za', 'Rn', 'Jr', 'Ct', 'f8', 'Od', 'Ed', 'cw', 'Qa', 'QA', 'kn', 'G3', 'Be', 'Y3'];
  for (const symbolName of nativeSymbols) delete game[symbolName];
  installNativeDeclarations(game, collectLegacyDeclarations(path.join(repositoryRoot, 'src/client')));
  game.performance = { now: () => game.l.clock * 1000 };
  game.combatLog.simulatorLog.enabled = false;
  game.l.corpses = [];
  const mapsEngine = require(path.join(repositoryRoot, 'test/helpers/maps-engine')).loadMapsEngine(game);
  const navigation = mapsEngine.createNavigationRuntime((actor: BattleActor) => game.actorActionLocked(actor));
  navigation.load(9003, mapsEngine.createLegacyCatalog().navigation[9003]);
  game.mapNavigation = navigation;
  game.Mw = navigation.moveWithFlow;
  const battlefield = game.arenaSimulator.battlefield;
  battlefield.start('song');
  game.v.x = game.v.y = -100000;
  // Duels/stress tests isolate fighters: no human, boss, soldier or respawn target.
  battlefield.tick = () => {};
  battlefield.targets = (actor: BattleActor) => (game.arenaSimulator.actors as BattleActor[]).filter(other => other !== actor && other.hp > 0 && !other.dead && other.battlefieldTeam !== actor.battlefieldTeam);

  function resetCombat(): void {
    for (const actor of game.arenaSimulator.actors as BattleActor[]) game.arenaSimulator.remove(actor);
    Object.assign(game.l, { fx: [], fxQ: [], combatProjectiles: [], clock: 0, deadT: 0 });
  }
  function spawnFighter(build: FactionBuild, team: Team, positionX: number): BattleActor {
    // Isolate mutable HP, stats and profiles between every scenario.
    const profile = structuredClone(build.profile), stats = structuredClone(build.stats);
    const actor = game.arenaSimulator.create(build.faction, profile.main, false, false, {
      version: 1, id: 'duel', name: build.name, updatedAt: '', profile,
      autoSkills: false, autoPotential: false, pk: true, farm: false,
    }) as BattleActor;
    Object.assign(actor, { profile, stats, battlefieldTeam: team, battlefieldBoss: false, x: positionX, y: 1792,
      hp: stats.life, max: stats.life, mana: stats.mana, res: stats.res, series: stats.series,
      def: stats.def, ar: stats.ar, look: null, spd: 100 * (stats.speed || 1), r: 17,
      stun: 0, poison: 0, poisonDmg: 0, slowT: 0 });
    return actor;
  }
  resetCombat();
  return { game, dataset, resetCombat, spawnFighter };
}

/** Fixed LCG seeds let the before/after runs use the same combat RNG sequence. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}
