const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {compileTypeScriptEntry}=require('../tools/build-app');
const {collectLegacyDeclarations}=require('../tools/sim-balance/legacy-runtime.ts');
const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/war-rewards.ts','Rewards').code,scope);
const {createWarRewards,WAR_ITEMS,warItemStacks}=scope.Rewards;
const kinds=Object.keys(WAR_ITEMS);
function fixture() {
  const player={x:0,y:0}, ally={x:50,y:0,hp:100,battlefieldTeam:'song'},enemy={x:50,y:0,hp:100,battlefieldTeam:'jin'}, far={x:1000,y:0,hp:100,battlefieldTeam:'song'};
  const storage={}, triggered=[];let running=true,alive=true,space=true,roll=0,dropKind='resistance',rebuilds=0;
  const reward=createWarRewards({player:()=>player,team:()=> 'song',running:()=>running,alive:()=>alive,storage:()=>storage,actors:()=>[ally,enemy,far],changed(){},bonusesChanged(){rebuilds++;},canCollect:()=>space,trap:(actor,kind)=>triggered.push({actor,kind})},()=>roll++%2===0?0:(kinds.indexOf(dropKind)+.1)/kinds.length);
  return {player,ally,enemy,far,storage,reward,triggered,get rebuilds(){return rebuilds;},stop(){running=false;},die(){alive=false;},full(){space=false;},free(){space=true;},drop(kind='resistance',x=0){dropKind=kind;const victim={x,y:0,hp:0,battlefieldMonster:true,battlefieldTeam:'jin'};reward.record(player,victim);reward.killed(victim);},use(kind){storage['tk_'+kind]=(storage['tk_'+kind]||0)+1;reward.use(kind);}};
}
const stats=()=>({life:1000,res:{phys:10,cold:10,fire:10,poison:10,light:10},speed:1,speedFoot:1,aspdP:1,aspdC:1,def:20,ar:20,arBase:20,retMelee:100,retMeleeP:50,retRangeP:50});
test('all 26 items can drop and collect; stacks split at 50, stock survives match reset and reload',()=>{
  const f=fixture();assert.equal(kinds.length,26);
  for(const kind of kinds){f.drop(kind);f.reward.tick(.01);assert.equal(f.reward.state.inventory[kind],1,kind);}
  f.storage.tk_resistance=101;
  assert.deepEqual(Array.from(warItemStacks({resistance:101}),s=>s.count),[50,50,1]);
  f.reward.reset();assert.equal(f.reward.state.inventory.resistance,101);assert.equal(f.reward.drops.length,0);
  const reloaded=createWarRewards({player:()=>f.player,team:()=> 'song',running:()=>false,alive:()=>true,changed(){},storage:()=>JSON.parse(JSON.stringify(f.storage))});
  assert.equal(reloaded.state.inventory.resistance,101);assert.throws(()=>reloaded.use('resistance'),/trong trận/);
});
test('full bag leaves drops on ground, then collects when space is freed; expired drops cannot be picked',()=>{
  const f=fixture();f.full();f.drop();f.reward.tick(1);assert.equal(f.reward.drops.length,1);assert.equal(f.reward.state.inventory.resistance,0);
  f.free();f.reward.tick(.1);assert.equal(f.reward.drops.length,0);assert.equal(f.reward.state.inventory.resistance,1);
  f.full();f.drop();f.reward.tick(91);assert.equal(f.reward.drops.length,0);
  f.free();f.reward.tick(.1);assert.equal(f.reward.state.inventory.resistance,1);
});
test('personal pills affect their documented stat and expire; speed bonuses do not multiply each other',()=>{
  const expected={resistance:s=>assert.equal(s.res.phys,30),attack:s=>assert.equal(s.aspdP,1.25),movement:s=>assert.equal(s.speed,1.25),external:s=>assert.equal(s.warExternalMultiplier,1.5),externalCold:s=>assert.equal(s.warExternalCold,100),internal:s=>assert.equal(s.warInternalAdd.phys,100),internalPoison:s=>assert.equal(s.warInternalAdd.poison,50),internalCold:s=>assert.equal(s.warInternalAdd.cold,100),internalFire:s=>assert.equal(s.warInternalAdd.fire,100),internalLight:s=>assert.equal(s.warInternalAdd.light,100),life:s=>assert.equal(s.life,1500),sprint:s=>assert.equal(s.speed,1.2),evasion:s=>assert.equal(s.def,520),accuracy:s=>assert.equal(s.ar,520),haste:s=>assert.equal(s.aspdP,1.5),poisonRes:s=>assert.equal(s.res.poison,60),coldRes:s=>assert.equal(s.res.cold,60),lightRes:s=>assert.equal(s.res.light,60),physicalRes:s=>assert.equal(s.res.phys,60),fireRes:s=>assert.equal(s.res.fire,60)};
  for(const [kind,check]of Object.entries(expected)){const f=fixture();f.use(kind);const s=stats();f.reward.apply(s);check(s);f.reward.tick(180);const after=stats();f.reward.apply(after);assert.equal(after.life,1000);assert.equal(after.speed,1);assert.equal(after.res.phys,10);assert.equal(f.reward.state.buffs[kind],0);}
  const f=fixture();f.use('attack');f.use('haste');f.use('movement');f.use('sprint');const s=stats();f.reward.apply(s);assert.equal(s.aspdP,1.5);assert.equal(s.speed,1.25);
});
test('drum and command buff nearby allies, horn debuffs enemies; expiry rebuilds affected stats',()=>{
  for(const kind of ['drum','command','horn']){
    const f=fixture();f.use(kind);
    for(const actor of [f.player,f.ally,f.enemy,f.far]){
      const s=stats();f.reward.apply(s,actor);
      const affected=kind==='horn'?actor===f.enemy:actor===f.player||actor===f.ally;
      if(kind==='drum')assert.equal(s.life,affected?1300:1000);
      if(kind==='command')assert.equal(s.speed,affected?1.3:1);
      if(kind==='horn')assert.equal(s.retMelee,affected?80:100);
    }
    assert.equal(f.rebuilds,1);f.reward.tick(180);assert.equal(f.rebuilds,2);
    const s=stats();f.reward.apply(s,f.ally);assert.equal(s.life,1000);assert.equal(s.speed,1);
  }
});
test('traps trigger once on enemies, ignore allies, expire, and clear on reset',()=>{
  for(const kind of ['freezeTrap','stunTrap','slowTrap']){
    const f=fixture();f.enemy.x=1000;f.use(kind);f.reward.tick(.1);assert.equal(f.triggered.length,0);assert.equal(f.reward.traps.length,1);
    f.enemy.x=0;f.reward.tick(.1);assert.equal(f.triggered.length,1);assert.equal(f.triggered[0].actor,f.enemy);assert.equal(f.triggered[0].kind,kind);f.reward.tick(.1);assert.equal(f.triggered.length,1);
    f.enemy.x=1000;f.use(kind);f.reward.tick(31);assert.equal(f.reward.traps.length,0);f.enemy.x=0;f.reward.tick(.1);assert.equal(f.triggered.length,1);
    f.use(kind);f.reward.reset();assert.equal(f.reward.traps.length,0);
  }
});
test('dead players cannot consume stock; match end removes temporary effects',()=>{
  const f=fixture();f.use('drum');f.use('command');f.use('horn');f.use('resistance');f.stop();f.reward.tick(.1);
  const s=stats();f.reward.apply(s);assert.equal(s.life,1000);assert.equal(f.reward.state.buffs.drum,0);assert.equal(f.reward.state.buffs.resistance,0);
  const dead=fixture();dead.storage.tk_life=1;dead.die();assert.throws(()=>dead.reward.use('life'));assert.equal(dead.storage.tk_life,1);
});
test('battlefield kills bypass normal XP, money, materials and equipment; ordinary drops still work',()=>{
  const declarations=collectLegacyDeclarations('src/client');
  const s={l:{battlefield:true,ground:[]},o:{gold:0},Z:()=>0,X0:(x,y)=>[x,y],kp:40,o0(){},C(){},_0:[],D:x=>x};vm.createContext(s);
  vm.runInContext(declarations.get('cD')+'\n'+declarations.get('q4'),s);
  s.cD({});s.q4({d:1},{x:0,y:0});assert.equal(s.l.ground.length,0);assert.equal(s.o.gold,0);
  s.l.battlefield=false;s.cD({battlefieldMonster:true});s.q4({d:1},{x:0,y:0,battlefieldMonster:true});assert.equal(s.l.ground.length,0);
  const item={d:1,r:0};s.q4(item,{x:0,y:0});assert.equal(s.l.ground.length,1);assert.equal(s.l.ground[0].it,item);
});
test('the native bag renderer includes war stacks so every UI layout can display them',()=>{
  const declarations=collectLegacyDeclarations('src/client');const s={R:true,WA:()=>({groups:[],series:[],slots:[]}),Zr:[],Ha:[],Bp:[],g0:[],Np:[],Q6:[],vA:[],Fn:()=>false,I:{},o:{inv:[]},l:{ground:[]},L4:()=>[],INV_MAX:60,Nv:[],_v:()=>[],W1:()=>"",y0:()=>false,arenaSimulator:{warInventory:{html:()=>'<button data-war-item="resistance"><i>50</i></button>',slots:2}},m:()=>({innerHTML:''})};
  // Stop after the markup assignment, before unrelated filter event handlers.
  const source=declarations.get('An');const end=source.indexOf('  const w = () =>');
  const target={innerHTML:''};s.m=()=>target;vm.createContext(s);vm.runInContext(source.slice(0,end)+'};',s);s.An();
  assert.match(target.innerHTML,/class="invgrid"><button data-war-item="resistance"/);assert.match(target.innerHTML,/2\/60/);
});
test('small supplied icons have an alpha channel and are available for every item',()=>{
  for(const icon of new Set(Object.values(WAR_ITEMS).map(item=>item.icon))){const data=fs.readFileSync('public/'+icon);assert.equal(data.toString('ascii',1,4),'PNG');assert.ok(data.readUInt32BE(16)<=24);assert.ok(data.readUInt32BE(20)<=24);assert.equal(data[25],6);assert.ok(data.length<4096);}
});

test('war HUD shows precise countdowns, refreshes reused effects and hides expired ones',()=>{
 const s={};vm.runInNewContext(compileTypeScriptEntry('simulator/war-buff-hud.ts','HUD').code,s);
 const f=fixture();f.use('resistance');f.use('horn');
 let html=s.HUD.warBuffHud(f.reward.state.buffs);assert.match(html,/data-war-buff="resistance"/);assert.match(html,/data-war-buff="horn"/);assert.match(html,/>3:00<\/b>/);
 f.reward.tick(61);html=s.HUD.warBuffHud(f.reward.state.buffs);assert.match(html,/>1:59<\/b>/);
 f.use('resistance');html=s.HUD.warBuffHud(f.reward.state.buffs);assert.equal((html.match(/data-war-buff="resistance"/g)||[]).length,1);assert.match(html,/còn 3:00/);
 f.reward.tick(180);assert.equal(s.HUD.warBuffHud(f.reward.state.buffs),'');
});
test('native HUD renders consumable effects in a separate row after support skills',()=>{
 const acorn=require('acorn'),declarations=collectLegacyDeclarations('src/client');
 const source=declarations.get('Mv'),body=acorn.parse(source,{ecmaVersion:'latest'}).body[0].declarations[0].init.body.body;
 const block=body.find(node=>node.type==='BlockStatement'&&source.slice(node.start,node.end).includes('#skBuffs'));
 const target={innerHTML:''};let html='<div data-war-buff="life">2:59</div>';
 const s={m:()=>target,a6:()=>[{ic:'img/s/8.png',t:60,n:'Hỗ trợ'}],D:x=>x,$7:()=> '1m',arenaSimulator:{warBuffs:()=>html}};
 vm.createContext(s);const render=()=>vm.runInContext(source.slice(block.start,block.end),s);render();
 assert.match(target.innerHTML,/support-effects.*Hỗ trợ.*war-effects.*data-war-buff="life"/);
 html='';render();assert.doesNotMatch(target.innerHTML,/war-effects/);assert.match(target.innerHTML,/support-effects/);
});
