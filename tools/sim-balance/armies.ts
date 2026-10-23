import fs from 'node:fs';
import path from 'node:path';
import { createSimulation } from './simulation.ts';
import type { BattleActor } from './types.ts';

const outputDirectory = path.resolve(process.argv[2] || '/tmp/vltk-sim-balance');
const { game, dataset, resetCombat, spawnFighter } = createSimulation(outputDirectory);
const results: { total: number; seconds: number; firstDeath: number | null; alive: number; casts: number }[] = [];
const timeStep = 1 / 60;
const scenarioSeconds = 30;
for (const totalFighters of [20, 40, 100]) {
  resetCombat();
  game.Math.random = () => 0.5;
  // Five columns keep initial spawn positions separate on Hoang Nguyên.
  for (let fighterIndex = 0; fighterIndex < totalFighters / 2; fighterIndex++) for (const team of ['song', 'jin'] as const) {
    const positionX = team === 'song' ? 1640 - Math.floor(fighterIndex / 5) * 30 : 1860 + Math.floor(fighterIndex / 5) * 30;
    const actor = spawnFighter(dataset.builds[fighterIndex % dataset.builds.length], team, positionX);
    actor.y = 1792 + (fighterIndex % 5 - 2) * 22;
  }
  game.l.enemies = game.arenaSimulator.actors;
  let firstDeath: number | null = null;
  for (let elapsedSeconds = 0; elapsedSeconds < scenarioSeconds; elapsedSeconds += timeStep) {
    game.l.clock = elapsedSeconds;
    game.arenaSimulator.tick(timeStep);
    game.advanceSkillContacts(timeStep);
    if (firstDeath === null && (game.arenaSimulator.actors as BattleActor[]).some(actor => actor.hp <= 0)) firstDeath = +(elapsedSeconds + timeStep).toFixed(3);
  }
  const actors = game.arenaSimulator.actors as BattleActor[];
  if (actors.some(actor => !Number.isFinite(actor.hp) || !Number.isFinite(actor.mana) || actor.mana < -0.001)) throw new Error('Invalid HP/MP in army simulation.');
  results.push({ total: totalFighters, seconds: scenarioSeconds, firstDeath,
    alive: actors.filter(actor => actor.hp > 0).length, casts: actors.reduce((sum, actor) => sum + actor.casts, 0) });
}
fs.writeFileSync(path.join(outputDirectory, 'army-smoke.json'), JSON.stringify({ note: 'Headless 30-second mixed-faction team combat; no respawn, bosses, soldiers or player targets. Resource/contact stress test only.', results }, null, 2));
console.log(JSON.stringify(results));
