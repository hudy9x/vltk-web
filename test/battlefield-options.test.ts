const { test }: typeof import('node:test') = require('node:test');
const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const vm: typeof import('node:vm') = require('node:vm');
const { compileTypeScriptEntry }: typeof import('../tools/build-app.js') = require('../tools/build-app.js');

function loadModule<Module>(entry: string, globalName: string): Module {
  const scope: Record<string, unknown> = {};
  vm.runInNewContext(compileTypeScriptEntry(entry, globalName).code, scope);
  return scope[globalName] as Module;
}

test('war supplies enforce a combined capacity of 60 potions, successful uses only, and purchases at any time', () => {
  const { createWarSupplies } = loadModule<typeof import('../src/client/simulator/supplies.ts')>('simulator/supplies.ts', 'Supplies');
  let running = true, alive = true, canRecover = true;
  const camp = require('../src/client/maps/content/9003/layout.json').camps.song;
    const position = { ...camp };
  const supplies = createWarSupplies({ running: () => running, alive: () => alive, team: () => 'song', position: () => position,
    recover: () => canRecover, changed() {} });
  supplies.reset(true);
  assert.equal(supplies.state.life + supplies.state.mana, 60);
  canRecover = false; assert.equal(supplies.use('life'), false); assert.equal(supplies.state.life, 30);
  canRecover = true;
  for (let index = 0; index < 30; index++) { assert.equal(supplies.use('life'), true); assert.equal(supplies.use('mana'), true); }
  assert.equal(supplies.use('life'), false); assert.equal(supplies.use('mana'), false);
  position.x = 3134; alive = false; running = false;
  supplies.buy('life', 1); assert.equal(supplies.state.life, 1);
  assert.equal(supplies.use('life'), false);
  supplies.reset();
  supplies.refill(); assert.equal(supplies.state.life, 30); assert.equal(supplies.state.mana, 30);
  running = false; assert.equal(supplies.use('life'), false);
});

test('commander soldiers have substantially more HP and faster attacks than ordinary soldiers', () => {
  const rules = loadModule<typeof import('../src/client/simulator/soldier-rules.ts')>('simulator/soldier-rules.ts', 'Rules');
  const commander = rules.soldierRank(0), soldier = rules.soldierRank(1);
  assert.ok(commander.minimumHP > soldier.minimumHP * 2);
  assert.ok(commander.attackIntervalFactor < soldier.attackIntervalFactor);
  assert.ok(rules.SOLDIER_DETECTION_RADIUS > 800); assert.ok(rules.SOLDIER_LEASH_RADIUS > 900);
});

test('set equipment retains uncovered blue slots and upgrades only native-supported Thiên Tứ pieces', () => {
  const { applyArmySetEquipment } = loadModule<typeof import('../src/client/simulator/set-equipment.ts')>('simulator/set-equipment.ts', 'SetGear');
  const weapon = { n: 'Phục Ma Côn', d: 0, k: 4, req: [] }, armor = { n: 'Phục Ma Cà Sa', d: 2, k: 1, req: [] };
  const fallback = { weapon: { n: 'Blue weapon' }, armor: { n: 'Blue armor' }, boot: { n: 'Blue boot' } };
  const source = { goldCatalog: () => [{ key: 'native', items: [weapon, armor] }], canUpgrade: (template: { d: number }) => template.d === 0,
    make(template: typeof weapon, kind: string) { return kind === 'thientu' && template.d !== 0 ? null : { ...template, set: { kind: kind === 'gold' ? 'gold' : 'platina' } }; } };
  const equipment = applyArmySetEquipment(source, fallback, { faction: 'shaolin', sex: 0, level: 150, weapon: [0, 4], kind: 'thientu' });
  assert.equal(equipment.weapon.set.kind, 'platina'); assert.equal(equipment.armor.set.kind, 'gold');
  assert.equal(equipment.boot, fallback.boot); assert.equal(fallback.weapon.n, 'Blue weapon');
  const unarmedEquipment = applyArmySetEquipment(source, fallback, { faction: 'shaolin', sex: 0, level: 150, weapon: [0, 6], kind: 'gold' });
  assert.equal(unarmedEquipment.weapon, fallback.weapon);assert.equal(unarmedEquipment.armor.set.kind, 'gold');
});

test('manual and automatic battlefield potions share finite stock and preserve normal inventory/gold', () => {
  const { createHeadlessGame }: typeof import('../tools/sim-balance/legacy-runtime.ts') = require('../tools/sim-balance/legacy-runtime.ts');
  const game = createHeadlessGame(process.cwd());
  game.be = { 0: 1 }; game.ao = 1;
  game.k = () => {};
  game.S.potions = [{ kind: 'life', tier: 0, total: 100 }, { kind: 'mana', tier: 0, total: 50 }];
  const normalStock = JSON.stringify(game.o.potStock), goldBefore = game.o.gold;
  const match = game.arenaSimulator.battlefield;
  match.start('song');
  game.l.life = 1;
  game.Ms('life'); assert.equal(game.l.life, 101); assert.equal(game.arenaSimulator.supplies.state.life, 29);
  game.Ms('life'); assert.equal(game.arenaSimulator.supplies.state.life, 29, 'cooldown prevents a second spend');
  for (let index = 0; index < 29; index++) { game.l.life = 1; game.l.potCd.life = 0; game.Ms('life'); }
  game.l.life = 1; game.l.potCd.life = 0; game.X9(.1);
  assert.equal(game.l.life, 1, 'auto potion must not fall back to persistent stock or buying');
  assert.equal(game.arenaSimulator.supplies.state.life, 0);
  assert.equal(JSON.stringify(game.o.potStock), normalStock); assert.equal(game.o.gold, goldBefore);
  game.v.x = 1700; assert.equal(game.arenaSimulator.supplies.state.nearCamp, false);
  game.l.life = 0; match.playerDied(); game.arenaSimulator.tick(30);
  assert.equal(game.arenaSimulator.supplies.state.life, 0, 'respawn does not give free potions');
  game.arenaSimulator.supplies.refill(); assert.equal(game.arenaSimulator.supplies.state.life, 30);
  match.reset(); assert.equal(game.arenaSimulator.supplies.state.life, 0);
});

test('war inventory stacks at 50, remains visible outside the match and uses one item per click', () => {
  type WarRewards = import('../src/client/simulator/war-rewards.ts').WarRewards;
  let clickListener: EventListener = () => {}, used = 0, refreshed = 0, error = '';
  const scope: Record<string, unknown> = { document: { addEventListener(_type: string, listener: EventListener) { clickListener = listener; } } };
  vm.runInNewContext(compileTypeScriptEntry('simulator/war-inventory.ts', 'WarInventory').code, scope);
  const { createWarInventory } = scope.WarInventory as typeof import('../src/client/simulator/war-inventory.ts');
  const rewards = { state: { inventory: { resistance: 51 } }, use() { used++; } } as unknown as WarRewards;
  const inventory = createWarInventory({ active: () => false, rewards, refresh() { refreshed++; }, error(message) { error = message; } });
  assert.equal(inventory.slots, 2);
  assert.equal((inventory.html().match(/data-war-item="resistance"/g) || []).length, 2);
  assert.match(inventory.html(), /<i>50<\/i>/);
  assert.match(inventory.html(), /<i>1<\/i>/);
  clickListener({ target: { closest: () => ({ dataset: { warItem: 'resistance' } }) }, stopPropagation() {} } as unknown as Event);
  assert.equal(used, 1); assert.equal(refreshed, 1); assert.equal(error, '');
  rewards.use = () => { throw new Error('Chỉ dùng trong trận'); };
  clickListener({ target: { closest: () => ({ dataset: { warItem: 'resistance' } }) }, stopPropagation() {} } as unknown as Event);
  assert.equal(refreshed, 1); assert.match(error, /trong trận/);
});
