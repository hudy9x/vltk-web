{
  const { test }: typeof import('node:test') = require('node:test');
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const { createHeadlessGame } = require('../tools/sim-balance/legacy-runtime.ts');

  test('recruitment saves form edits and reloads both team ratios, patrols and skills for the character', async () => {
    const first = createHeadlessGame(process.cwd());
    first.localStorage.setItem('jxidle_slot', '0');
    first.arenaSimulator.openSettings();
    const panel = first.simNodes.find((node: any) => node.id === 'battlefield-panel');
    const field = (id: string) => panel.querySelector('#battlefield-' + id);
    field('map').value = '9002';
    field('soldier-soldier-count').value = '0';
    field('soldier-commander-hp').value = '87654';
    field('soldier-marshal-hp').value = '234567';
    field('soldier-commander-patrol').value = '250';
    field('soldier-commander-respawn').value = '30';
    field('soldier-commander-leash').value = '950';
    field('soldier-commander-skill-0').value = '11';
    field('soldier-commander-skill-1').value = '19';
    field('soldier-setup-rank').value = 'commander';
    field('prefer-pk').checked = true;
    field('team').value = 'song';
    field('team').onchange();
    field('ratio-shaolin').value = '20';
    field('ratio-tianwang').value = '0';
    field('team').value = 'jin';
    field('team').onchange();
    field('ratio-wudang').value = '20';
    field('ratio-kunlun').value = '0';
    field('soldier-commander-hp').onchange();
    const key = 'jxidle_battlefield_settings_0';
    const saved = first.entries.get(key);
    assert.ok(saved);
    assert.equal(JSON.parse(saved).fields['soldier-soldier-count'], '0');

    const second = createHeadlessGame(process.cwd());
    second.entries.set(key, saved);
    second.entries.set('jxidle_slot', '0');
    second.arenaSimulator.openSettings();
    const restoredPanel = second.simNodes.find((node: any) => node.id === 'battlefield-panel');
    const restored = (id: string) => restoredPanel.querySelector('#battlefield-' + id);
    assert.equal(restored('map').value, '9002');
    assert.equal(restored('soldier-soldier-count').value, '0');
    assert.equal(restored('soldier-commander-hp').value, '87654');
    assert.equal(restored('soldier-commander-patrol').value, '250');
    assert.equal(restored('soldier-commander-respawn').value, '30');
    assert.equal(restored('soldier-commander-leash').value, '950');
    assert.equal(restored('soldier-commander-skill-0').value, '11');
    assert.equal(restored('soldier-commander-skill-1').value, '19');
    assert.equal(restored('prefer-pk').checked, true);
    assert.equal(restored('ratio-wudang').value, '20');
    restored('team').value = 'song';
    restored('team').onchange();
    assert.equal(restored('ratio-shaolin').value, '20');
    assert.equal(restored('ratio-tianwang').value, '0');
    assert.ok(restored('skill-summary-commander-0').innerHTML.includes('<img'));
    assert.ok(restored('skill-summary-commander-0').innerHTML.includes(second.T[11].ic));
    const configuration = second.arenaSimulator.roadMonsters.configuration;
    assert.equal(configuration.soldier.count, 0);
    assert.equal(configuration.commander.hp, 87654);
    assert.deepEqual(Array.from(configuration.commander.skills), [11, 19]);
    second.arenaSimulator.battlefield.start('song');
    second.arenaSimulator.battlefield.tick(600);
    const bosses = second.arenaSimulator.actors.filter((actor: any) => actor.battlefieldBoss);
    assert.equal(bosses.length, 2);
    assert.ok(bosses.every((actor: any) => actor.max === 234567 && actor.hp === 234567));
    assert.ok(second.arenaSimulator.roadMonsters.actors.every((actor: any) => actor.battlefieldRank !== 'Nguyên soái'));
    assert.ok(restoredPanel.innerHTML.includes('Bảng xếp hạng'));
    assert.ok(!restoredPanel.innerHTML.includes('Dược điếm'));
    assert.ok(restoredPanel.innerHTML.includes('data-war-skill="commander:0:11"'));
    assert.ok(!restoredPanel.innerHTML.includes('battlefield-soldier-marshal-skill-0'));
    // A failed database flush must not report successful synchronization.
    second.window.localGameStorage = { pending:1, flush:async () => {} };
    restored('save-settings').onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(restored('settings-status').textContent, /chờ đồng bộ database/);
  });

  test('default ranks spawn 70 total patrol units and exactly one 200k marshal per side', () => {
    const game = createHeadlessGame(process.cwd());
    const simulator = game.arenaSimulator;
    simulator.battlefield.start('song');simulator.tick(5);
    simulator.battlefield.tick(600);
    const expected = [ ['Binh sĩ', 50, 50000], ['Hiệu úy', 10, 60000], ['Thống lĩnh', 6, 80000], ['Phó tướng', 4, 100000] ];
    for (const team of ['song', 'jin']) {
      for (const [title, count, hp] of expected) {
        const units = simulator.roadMonsters.actors.filter((actor: any) => actor.battlefieldTeam === team && actor.battlefieldRank === title);
        assert.equal(units.length, Number(count)/2, String(title));
        assert.ok(units.every((actor: any) => actor.max === hp));
      }
      const bosses = simulator.actors.filter((actor: any) => actor.battlefieldTeam === team && actor.battlefieldBoss);
      assert.equal(bosses.length, 1);
      assert.equal(bosses[0].max, 200000);
      const camp = simulator.battlefield.state.camps[team];
      assert.equal(bosses[0].x, camp.x);
      assert.equal(bosses[0].y, camp.y);
    }
  });
}
