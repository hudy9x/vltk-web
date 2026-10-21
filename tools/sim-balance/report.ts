import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import type { DuelDataset, ProfileDataset } from './types.ts';

const outputDirectory = path.resolve(process.argv[2] || '/tmp/vltk-sim-balance');
const distanceDatasets = [40, 160, 320].map(distance => JSON.parse(fs.readFileSync(path.join(outputDirectory, `duels-${distance}.json`), 'utf8')) as DuelDataset);
const profiles = JSON.parse(fs.readFileSync(path.join(outputDirectory, 'profiles.json'), 'utf8')) as ProfileDataset;
// Equal budgets are a precondition of this comparison. Fail instead of publishing
// misleading win rates if gear generation or recommendation rules have drifted.
for (const build of profiles.builds) {
  assert.equal(Object.values(build.profile.attr).reduce((sum, points) => sum + points, 0), 745);
  const regularSkillPoints = Object.entries(build.profile.sk).filter(([skillId]) => ![90, 150].includes(profiles.T[skillId]?.tier))
    .reduce((sum, [, points]) => sum + points, 0);
  assert.equal(regularSkillPoints, 149);
  assert.equal(build.profile.attrPts, 0);
  assert.equal(build.profile.skPts, 0);
  assert.equal(Object.values(build.profile.eq).length, 10);
  assert.ok(Object.values(build.profile.eq).every(item => item.set ? item.mag.length > 0 : item.mag.length === 5));
}
const results = distanceDatasets.flatMap(dataset => dataset.results.map(duel => ({ ...duel, distance: dataset.config.distance })));
const summary = distanceDatasets.map(dataset => {
  assert.equal(dataset.results.length, 450);
  assert.equal(new Set(dataset.results.map(duel => `${duel.a}|${duel.b}`)).size, 45);
  const sortedDurations = dataset.results.map(duel => duel.seconds).sort((first, second) => first - second);
  return { distance: dataset.config.distance, duels: sortedDurations.length, medianSeconds: sortedDurations[sortedDurations.length / 2],
    under2Seconds: dataset.results.filter(duel => duel.seconds < 2).length,
    timeouts: dataset.results.filter(duel => duel.winner === 'timeout').length };
});
fs.writeFileSync(path.join(outputDirectory, 'report.json'), JSON.stringify({ config: distanceDatasets[0].config, summary, builds: profiles.builds, results }, null, 2));
const factionKeys = profiles.builds.map(build => build.faction);
const matrixRows = ['faction,' + factionKeys.join(',')];
for (const factionKey of factionKeys) {
  const cells = factionKeys.map(opponentKey => {
    if (opponentKey === factionKey) return '';
    const pairDuels = results.filter(duel => (duel.a === factionKey && duel.b === opponentKey) || (duel.b === factionKey && duel.a === opponentKey));
    return `${pairDuels.filter(duel => duel.winner === factionKey).length}/${pairDuels.length}`;
  });
  matrixRows.push(factionKey + ',' + cells.join(','));
}
fs.writeFileSync(path.join(outputDirectory, 'win-matrix.csv'), matrixRows.join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
