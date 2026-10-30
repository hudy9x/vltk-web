const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const collector = fs.readFileSync(require.resolve('../src/client/core/asset-preload-01.js'), 'utf8');
function session({ menu = false } = {}) {
  const monsters = { 1:{ img:'img/monster.png', anim:'wolf' } };
  const maps = { 2:{ id:2, layers:[{ type:'ground', image:'./ground.jpg' }, { type:'world', objects:[{ image:'./tree.png' }] }] } };
  const scope = { window:{}, Set, Object, bA:() => ({}), of:{},
    E0:{ anim:{ hero:{ st:{ f:'hero.png' } }, wolf:{ st:{ f:'wolf.png' } } }, town:{ id:37 } },
    o:{ fac:'shaolin', stage:1, sk:{ 10:1 } }, l:{ town:false, jx:null },
    Jt:() => ({ img:'img/hero.png', anim:'hero' }), J3:() => false,
    P0:null, JP:() => [{ f:'fx/buff.png' }], sectPortraits:['shaolin'],
    u0:{ on:menu, st:[{ fac:'shaolin' }] },
    AA:() => ({ id:2, m:[1], boss:1 }), d0:99, r0:monsters,
    A0:{ f:{ 10:{ c:2 } }, m:{ 2:{ fly:{ f:'fx/fly.png' }, hit:{ f:'fx/hit.png' } } }, s:{} }, U1:{},
    MapsEngine:{ getMap:id => maps[id], resolveMapAsset:(id, file) => `app/maps/content/${id}/${file.slice(2)}`,
      mapNpcs:() => [{ npcId:'shop' }], getNpc:() => ({ image:'app/npcs/assets/shop.webp' }) } };
  const source = fs.readFileSync(require.resolve('../src/client/ui/character-select-01.js'),'utf8');
  const declaration = require('acorn').parse(source,{ecmaVersion:'latest'}).body
    .filter(node=>node.type==='VariableDeclaration').flatMap(node=>node.declarations).filter(node=>['sectPortraits','characterPortrait'].includes(node.id.name));
  for(const node of declaration)vm.runInNewContext('var '+source.slice(node.start,node.end)+';',scope);
  vm.runInNewContext(collector, scope); return scope;
}
test('critical session assets include the active map, monsters, player and learned effects without loading other maps', () => {
  const scope = session(), assets = Array.from(scope.window.localGameAssets.collect());
  for (const file of ['img/hero.png','img/a/hero.png','img/monster.png','img/a/wolf.png',
    'app/maps/content/2/ground.jpg','app/maps/content/2/tree.png','app/npcs/assets/shop.webp','fx/fly.png','fx/hit.png','fx/buff.png'])
    assert.ok(assets.includes(file), file);
  assert.equal(new Set(assets).size, assets.length);
  assert.equal(assets.some(file => file.includes('/37/')), false);
});
test('character selection preloads portraits without downloading maps, combat effects or monster sprites', () => {
  const assets = Array.from(session({ menu:true }).window.localGameAssets.collect());
  assert.deepEqual(assets.sort(), ['img/hero.png','img/portraits/shaolin.webp']);
});
test('all five novice character slots share one portrait and skip unknown factions', () => {
  const scope = session({ menu:true });
  scope.u0.st = ['vo0','vo1','vo2','vo3','vo4','huashan','shaolin'].map(fac => ({ fac, sex:0 }));
  const assets = Array.from(scope.window.localGameAssets.collect());
  assert.deepEqual(assets.sort(), ['img/hero.png','img/portraits/novice.webp','img/portraits/shaolin.webp']);
  for(const faction of ['vo0','vo1','vo2','vo3','vo4'])assert.equal(scope.characterPortrait(faction),'img/portraits/novice.webp');
  assert.equal(scope.characterPortrait('unknown'),null);
});
test('all ten playable sects and five novice elements resolve to valid portrait assets', () => {
  const scope=session({menu:true}),{validBytes}=require('../src/server/assets.ts');
  assert.equal(scope.sectPortraits.length,10);
  for(const faction of [...scope.sectPortraits,'vo0','vo1','vo2','vo3','vo4']){
    const url=scope.characterPortrait(faction);
    assert.ok(url,faction);
    assert.ok(validBytes(url,fs.readFileSync('public/'+url)),url);
  }
});
test('new-character preparation waits for all asset jobs before releasing the game', async () => {
  const scope = session(); let release, finished = false;
  scope.window.localGameLoading = { preload:() => new Promise(resolve => { release = resolve; }), finish:() => { finished = true; } };
  const pending = scope.window.localGameAssets.prepare();
  assert.equal(finished, false); release(); await pending; assert.equal(finished, true);
});
test('visible and background simulation both pause while startup assets load', () => {
  const source = fs.readFileSync(require.resolve('../src/client/core/game-loop-01.js'), 'utf8');
  const { parse } = require('acorn');
  const program = parse(source, { ecmaVersion:'latest' });
  const bodies = ['P_', 'Ym'].map(name => {
    const declaration = program.body.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations).find(node => node.id.name === name);
    return `var ${source.slice(declaration.start, declaration.end)};`;
  });
  const queued = [];
  const scope = { window:{ localGameLoading:{ active:true } }, Date, requestAnimationFrame:callback => queued.push(callback),
    o5:0, Wm:0, yi:99, L2:99 };
  vm.runInNewContext(bodies.join('\n'), scope);
  scope.P_(1000); scope.Ym();
  assert.equal(scope.o5, 1000); assert.equal(scope.yi, 0); assert.equal(scope.L2, 0);
  assert.equal(queued.length, 1, 'the frame loop remains alive to resume without a time jump');
});
