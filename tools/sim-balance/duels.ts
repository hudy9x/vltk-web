import fs from 'node:fs';
import path from 'node:path';
import { createSimulation, seededRandom } from './simulation.ts';
import type { DuelResult } from './types.ts';

const outputDirectory = path.resolve(process.argv[5] || '/tmp/vltk-sim-balance');
const repetitions = Number(process.argv[2] || 1);
const duelLimit = Number(process.argv[3] || 1);
const openingDistance = Number(process.argv[4] || 40);
if (![repetitions, duelLimit, openingDistance].every(Number.isFinite) || repetitions < 1 || duelLimit < 1 || openingDistance < 0) throw new Error('Invalid duel arguments.');
const { game, dataset, resetCombat, spawnFighter } = createSimulation(outputDirectory);
const results: DuelResult[] = [];
const timeStep = 1 / 60;
const maximumSeconds = 60;
// Mirror spawn/processing order for each seed to expose first-actor advantages.
matchups: for (let firstIndex = 0; firstIndex < dataset.builds.length; firstIndex++) {
  for (let secondIndex = firstIndex + 1; secondIndex < dataset.builds.length; secondIndex++) {
    for (let repetition = 0; repetition < repetitions; repetition++) for (const reverse of [0, 1]) {
      resetCombat();
      game.Math.random = seededRandom(1000 + firstIndex * 100 + secondIndex * 10 + repetition);
      const songBuild = dataset.builds[reverse ? secondIndex : firstIndex];
      const jinBuild = dataset.builds[reverse ? firstIndex : secondIndex];
      const songActor = spawnFighter(songBuild, 'song', 1700);
      const jinActor = spawnFighter(jinBuild, 'jin', 1700 + openingDistance);
      game.l.enemies = game.arenaSimulator.actors;
      let elapsedSeconds = 0;
      for (; elapsedSeconds < maximumSeconds; elapsedSeconds += timeStep) {
        game.l.clock = elapsedSeconds;
        game.arenaSimulator.tick(timeStep);
        game.advanceSkillContacts(timeStep);
        if (songActor.hp <= 0 || jinActor.hp <= 0) break;
      }
      results.push({ a: dataset.builds[firstIndex].faction, b: dataset.builds[secondIndex].faction, repetition, reverse,
        winner: songActor.hp <= 0 && jinActor.hp <= 0 ? 'draw' : songActor.hp <= 0 ? jinActor.profile.fac : jinActor.hp <= 0 ? songActor.profile.fac : 'timeout',
        seconds: +Math.min(maximumSeconds, elapsedSeconds + timeStep).toFixed(3),
        states: [songActor, jinActor].map(actor => ({ faction: actor.profile.fac, hp: actor.hp, max: actor.max, mana: actor.mana, casts: actor.casts, skill: actor.stats.main.n || '' })),
      });
      if (results.length >= duelLimit) break matchups;
    }
  }
}
const config = { level: 150, potential: 745, regularSkills: 149,
  gear: 'tier 10, blue, 5 affixes, normal, deterministic 0.5', advanced: '90/150 learned as arena rules',
  distance: openingDistance, dt: timeStep, maxSeconds: maximumSeconds, repeats: repetitions,
  mana: 'finite MP, passive recovery and skill-defense fixes',
  pvpDamage: game.arenaSimulator.pvpDamageScale({ arenaSim: true }, { arenaSim: true }),
  movement: 'central bridge with real navigation',
  note: 'Native attributes, skills, G3/Be missiles, secondary contacts and navigation. One primary tier-90 skill per faction, basic attacks while MP recovers. Support attributes assumed; no active support/curse/aura AI, player/soldier/boss targets, respawn or consumables. Canvas/UI stubs only.',
};
fs.writeFileSync(path.join(outputDirectory, `duels-${openingDistance}.json`), JSON.stringify({ config, builds: dataset.builds, results }, null, 2));
console.log(`Completed ${results.length} duels`);
