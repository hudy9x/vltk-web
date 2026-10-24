const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function inspection(){const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/inspection.ts','Inspection').code,scope);return scope.Inspection;}
test('inspection tabs read allocated points and existing hand damage; item HTML is lazy, cached and invalidated with stats',()=>{
 const {createSimInspectionCache}=inspection();let renders=0;
 const item={n:'Áo <địch>',lvl:10},actor={n:'SIM <script>',battlefieldTeam:'jin',profile:{fac:'shaolin',lvl:150,attr:{str:50},attrPts:12,sk:{1:20,2:0},skPts:9,main:1,eq:{armor:item}},stats:{basic:{tot:100},main:{n:'Chiêu chính',tot:200},life:1000,mana:300,str:75}};
 const cache=createSimInspectionCache({factions:{shaolin:{n:'Thiếu Lâm'}},skills:{1:{n:'Chiêu <1>'}}},escape,(owner,gear)=>{assert.equal(owner,actor);assert.equal(gear,item);renders++;return '<div class="idet">Native item</div>';});
 const overview=cache.html(actor,'overview');assert.match(overview,/85 – 115/);assert.match(overview,/170 – 230/);assert.doesNotMatch(overview,/<script>/);assert.equal(renders,0);
 assert.match(cache.html(actor,'potential'),/<td>50<\/td><td>75<\/td>/);
 assert.match(cache.html(actor,'skills'),/Chiêu &lt;1&gt;.*<td>20<\/td>/);
 const equipment=cache.html(actor,'equipment');assert.match(equipment,/Áo &lt;địch&gt;/);assert.match(equipment,/class="idet"/);
 for(let i=0;i<100;i++)assert.equal(cache.html(actor,'equipment'),equipment);assert.equal(renders,1);
 actor.stats={...actor.stats,main:{tot:400}};assert.match(cache.html(actor,'overview'),/340 – 460/);cache.html(actor,'equipment');assert.equal(renders,2);
 actor.profile={...actor.profile,attr:{str:80}};assert.match(cache.html(actor,'potential'),/<td>80<\/td>/);
});
test('ranking name clicks open four read-only tabs, periodic ranking refresh retains the tab and closing/reopening resets it',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;
 sim.battlefield.start('song');const [enemy]=sim.battlefield.add({team:'jin',faction:'shaolin',level:150,strength:'normal',count:1});
 const before=JSON.stringify(enemy.profile),stats=enemy.stats,hero=game.o;
 sim.leaderboard.open();const panel=game.simNodes.find(node=>node.id==='war-leaderboard');
 assert.match(panel.querySelector('tbody').innerHTML,/data-inspect-id=/);
 const click=dataset=>panel.listeners.click({target:{closest:()=>({dataset})}});
 click({inspectId:enemy.simId});const inspector=panel.querySelector('#war-sim-inspector');assert.equal(inspector.hidden,false);
 assert.equal(panel.querySelector('#war-ranking-content').hidden,true);
 assert.match(panel.querySelector('#war-inspect-content').innerHTML,/Lực tay phải/);
 for(const tab of ['equipment','potential','skills']){
  click({inspectTab:tab});assert.equal(panel.querySelector(`[data-inspect-tab="${tab}"]`).attributes['aria-selected'],'true');
  const content=panel.querySelector('#war-inspect-content').innerHTML;sim.leaderboard.render();assert.equal(panel.querySelector('#war-inspect-content').innerHTML,content);
 }
 assert.equal(JSON.stringify(enemy.profile),before);assert.equal(enemy.stats,stats);assert.equal(game.o,hero);
 panel.querySelector('#war-inspect-back').onclick();assert.equal(inspector.hidden,true);
 click({inspectId:enemy.simId});sim.remove(enemy);click({inspectTab:'potential'});assert.match(panel.querySelector('#war-inspect-content').innerHTML,/không còn/);
 game.simListeners.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(sim.leaderboard.isOpen,false);
 sim.leaderboard.open();assert.equal(inspector.hidden,true);
});
test('personal war log includes kills and deaths against SIMs and NPCs but excludes unrelated kills, promotions and item events',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;sim.battlefield.start('song');
 const hero=game.v;
 const [enemy]=sim.battlefield.add({team:'jin',faction:'shaolin',level:150,strength:'normal',count:1});
 const [ally]=sim.battlefield.add({team:'song',faction:'shaolin',level:150,strength:'normal',count:1});
 const npc=()=>({n:'Lính địch',battlefieldMonster:true,battlefieldTeam:'jin',hp:0,x:hero.x,y:hero.y});
 for(const source of [hero,ally]){const victim=npc();sim.warRewards.record(source,victim);sim.warRewards.killed(victim);sim.warRewards.killed(victim);}
 sim.warRewards.record(hero,enemy);sim.warRewards.killed(enemy);
 sim.warRewards.record(enemy,hero);sim.warRewards.killed(hero);sim.warRewards.revived(hero);
 const soldier=npc();sim.warRewards.record(soldier,hero);sim.warRewards.killed(hero);sim.warRewards.revived(hero);
 sim.warRewards.record(hero,ally);sim.warRewards.killed(ally);
 const boss={...enemy,n:'Nguyên soái',battlefieldBoss:true};sim.warRewards.record(hero,boss);sim.warRewards.killed(boss);
 sim.warRewards.record(boss,hero);sim.warRewards.killed(hero);
 sim.warRewards.tick(.01); // Nearby loot pickup must not enter the kill feed.
 sim.tick(.01);
 const entries=game.combatLog.entries('war');assert.equal(entries.length,6);
 const simEntries=game.combatLog.entries('war-sim');assert.equal(simEntries.length,2);assert.ok(simEntries.every(entry=>entry.target.includes(enemy.n)));
 const log=game.combatLog.text('war');assert.match(log,/Lính địch/);assert.match(log,new RegExp(enemy.n));assert.doesNotMatch(log,/Nhặt|Dùng|danh hiệu mới|xuất hiện/);
 assert.equal(sim.warRewards.rank(ally).points,50,'hidden ally kills still grant merit');
});
