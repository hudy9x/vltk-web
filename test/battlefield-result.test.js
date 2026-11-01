const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts');
test('result badge follows the human team for both winners, and draws never reuse a win/loss badge',()=>{
 const game=createHeadlessGame(process.cwd()),dialog=game.arenaSimulator.resultDialog;
 const panel=game.simNodes.find(node=>node.id==='battlefield-result');
 for(const winner of ['song','jin'])for(const player of ['song','jin']){
  const result=`${winner==='song'?'Tống':'Kim'} thắng · Tổng quân trạng`;
  dialog.open(result,{song:182900,jin:73550},player);
  assert.equal(panel.querySelector('.war-result-card').attributes['data-outcome'],winner===player?'win':'loss');
  assert.equal(panel.querySelector('#battlefield-result-title').textContent,winner===player?'Chiến thắng':'Thất bại');
  assert.equal(panel.querySelector('#battlefield-result-badge').hidden,false);
  assert.equal(panel.querySelector(`#battlefield-result-${winner}`).attributes['data-winner'],'true');
  assert.equal(panel.querySelector('#battlefield-result-reason').textContent,result);
  assert.equal(panel.querySelector('#battlefield-result-song-points').textContent,'182.900');
 }
 dialog.open('Hòa · Hai phe bằng quân trạng',{song:0,jin:0},'jin');
 assert.equal(panel.querySelector('#battlefield-result-badge').hidden,true);
 assert.equal(panel.querySelector('#battlefield-result-title').textContent,'Hòa trận');
 assert.equal(panel.querySelector('#battlefield-result-song').attributes['data-winner'],'false');
 assert.equal(panel.querySelector('#battlefield-result-jin').attributes['data-winner'],'false');
});
test('runtime passes the human Jin team to the final result, retaining mandatory acknowledgement',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;sim.battlefield.start('jin');
 const victim={hp:0,n:'Binh sĩ Tống',battlefieldMonster:true,battlefieldTeam:'song',x:0,y:0};
 sim.warRewards.record(game.v,victim);sim.warRewards.killed(victim);sim.tick(1200);
 const panel=game.simNodes.find(node=>node.id==='battlefield-result');
 assert.equal(sim.resultDialog.isOpen,true);assert.equal(panel.querySelector('#battlefield-result-title').textContent,'Chiến thắng');
 assert.equal(panel.querySelector('#battlefield-result-team').textContent,'Bạn thuộc phe Kim');
 assert.throws(()=>sim.battlefield.reset(),/Đồng ý/);
 game.simListeners.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(sim.resultDialog.isOpen,true);
 panel.querySelector('#battlefield-result-accept').onclick();assert.equal(sim.resultDialog.isOpen,false);assert.equal(sim.battlefield.active,false);
});
test('finish clears held input and pending movement, freezes SIMs/NPCs/player, and acknowledgement removes the locks',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;sim.battlefield.start('song');
 sim.battlefield.add({team:'jin',faction:'shaolin',level:150,strength:'normal',count:1});
 const units=[game.v,...sim.actors,...sim.roadMonsters.actors];
 for(const actor of units){actor.moving=true;actor.target=game.v;}
 Object.assign(game.Y,{keys:{w:true},target:{x:900,y:900},active:true});
 Object.assign(game.l,{moveTo:{x:900,y:900},clickHold:true,dash:{x:900,y:900}});
 sim.tick(1200);
 assert.deepEqual(Object.keys(game.Y.keys),[]);assert.equal(game.Y.target,null);assert.equal(game.Y.active,false);
 assert.equal(game.l.moveTo,null);assert.equal(game.l.dash,null);assert.equal(game.l.clickHold,false);
 const positions=units.map(actor=>[actor.x,actor.y]);
 for(const actor of units){assert.equal(actor.battlefieldFrozen,true);assert.equal(actor.moving,false);}
 sim.tick(5);assert.deepEqual(units.map(actor=>[actor.x,actor.y]),positions);
 const panel=game.simNodes.find(node=>node.id==='battlefield-result');
 panel.querySelector('#battlefield-result-accept').onclick();
 for(const actor of units)assert.equal(actor.battlefieldFrozen,undefined);
});
test('PvP uses the same result dialog and acknowledgement leaves online instead of resetting the private match',()=>{
 const game=createHeadlessGame(process.cwd()),dialog=game.arenaSimulator.resultDialog;
 const panel=game.simNodes.find(node=>node.id==='battlefield-result');let sent=0,accepted=false;
 game.OnlineBattlefield={state:{phase:'finished'},leave:()=>{sent++;return accepted;}};
 dialog.open('Kim thắng · Tổng quân trạng',{song:20,jin:40},'song');
 assert.equal(panel.querySelector('#battlefield-result-title').textContent,'Thất bại');
 panel.querySelector('#battlefield-result-accept').onclick();assert.equal(dialog.isOpen,true,'failed leave can be retried');
 accepted=true;panel.querySelector('#battlefield-result-accept').onclick();assert.equal(sent,2);assert.equal(dialog.isOpen,false);
 assert.equal(game.arenaSimulator.battlefield.active,false);
});
test('short private match uses the configured duration, spawns marshals halfway and ends with the existing result screen',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;
 sim.battlefield.start('song',{song:3,jin:2},9003,20);
 assert.equal(sim.battlefield.state.remaining,20);
 sim.battlefield.tick(9);assert.equal(sim.actors.filter(actor=>actor.battlefieldBoss).length,0);
 sim.battlefield.tick(1);assert.equal(sim.actors.filter(actor=>actor.battlefieldBoss).length,2);
 sim.battlefield.tick(10);assert.equal(sim.battlefield.state.phase,'finished');assert.equal(sim.resultDialog.isOpen,true);
 const panel=game.simNodes.find(node=>node.id==='battlefield-result');panel.querySelector('#battlefield-result-accept').onclick();
 sim.battlefield.start('song');assert.equal(sim.battlefield.state.remaining,1200,'default duration does not inherit the previous short match');
});
test('recruitment reads the saved private duration from server before starting a match',async()=>{
 const game=createHeadlessGame(process.cwd());let requests=0;
 game.OnlineBattlefield={active:false,matchDuration:async mode=>{assert.equal(mode,'private');requests++;return 30;}};
 game.arenaSimulator.openSettings();
 const panel=game.simNodes.find(node=>node.id==='battlefield-panel');
 for(const [field,value]of Object.entries({player:'song','boss-song':'3','boss-jin':'2',map:'9003'}))panel.querySelector('#battlefield-'+field).value=value;
 panel.querySelector('#battlefield-start').onclick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(requests,1);assert.equal(game.arenaSimulator.battlefield.state.duration,30);
 assert.equal(game.arenaSimulator.battlefield.running,true);
});
test('private marshals roll elements per match and use the server HP/resistance snapshot',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;let roll=0;
 game.Math.random=()=>[0,.99][roll++%2];
 game.OnlineBattlefield={marshalSettings:{song:{hp:432100,res:[11,12,13,14,15]},jin:{hp:543200,res:[21,22,23,24,25]}}};
 sim.battlefield.start('song');const elements=sim.battlefield.state.elements;
 assert.equal(elements.song,0);assert.equal(elements.jin,4);
 game.OnlineBattlefield.marshalSettings.song.hp=999;
 sim.battlefield.tick(600);
 for(const boss of sim.actors.filter(actor=>actor.battlefieldBoss)){
   const song=boss.battlefieldTeam==='song';assert.equal(boss.max,song?432100:543200);
   assert.equal(boss.res.fire,song?14:24);assert.equal(boss.res.poison,song?12:22);
   assert.equal(boss.battlefieldDeck.length,2);
 }
});
