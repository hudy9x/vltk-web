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
