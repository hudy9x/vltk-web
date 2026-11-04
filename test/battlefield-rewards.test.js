const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/war-rewards.ts','Rewards').code,scope);
const {createWarRewards,warRank}=scope.Rewards;
function fixture(random=()=>0){const player={x:0,y:0,hp:100},enemy={x:30,y:0,hp:100,battlefieldMonster:true,battlefieldTeam:'jin'};let running=true,alive=true,changed=0;const reward=createWarRewards({player:()=>player,team:()=> 'song',running:()=>running,alive:()=>alive,changed(){changed++}},random);return{player,enemy,reward,stop(){running=false},die(){alive=false},get changed(){return changed}};}
test('military merit is credited once to the last hostile attacker including poison, with all five rank thresholds',()=>{
 const {player,enemy,reward}=fixture();reward.record(player,enemy);enemy.hp=0;reward.killed(enemy);reward.killed(enemy);assert.equal(reward.state.points,50);
 for(const [points,name]of [[0,'Binh sĩ'],[2999,'Binh sĩ'],[3000,'Hiệu úy'],[8999,'Hiệu úy'],[9000,'Thống lĩnh'],[17999,'Thống lĩnh'],[18000,'Phó tướng'],[29999,'Phó tướng'],[30000,'Đại tướng'],[1000000,'Đại tướng']])assert.equal(warRank(points).name,name);
 const ally={...enemy,hp:100,battlefieldTeam:'song'};reward.record(player,ally);reward.killed(ally);assert.equal(reward.state.points,50);
 const sim={x:0,y:0,hp:100,battlefieldTeam:'song'};const victim={...enemy,hp:100};reward.record(player,victim);reward.record(sim,victim);reward.killed(victim);assert.equal(reward.state.points,50);assert.equal(reward.rank(sim).points,50);
 for(let i=0;i<59;i++){const target={...enemy,hp:100};reward.record(player,target);reward.killed(target)}assert.equal(reward.state.title,'Hiệu úy');
 reward.reset();assert.equal(reward.state.points,0);assert.equal(reward.drops.length,0);
});
test('drops stay on the ground until approached, inventory is consumed, buffs last 180 seconds and refresh without stacking',()=>{
 for(const [kind,index]of [['resistance',0],['attack',1],['movement',2]]){
  let roll=0;const {player,enemy,reward,stop}=fixture(()=>roll++%2===0?0:(index+.1)/Object.keys(scope.Rewards.WAR_ITEMS).length);
  enemy.x=200;reward.record(player,enemy);reward.killed(enemy);assert.equal(reward.drops.length,1);reward.tick(.01);assert.equal(reward.state.inventory[kind],0);
  player.x=200;reward.tick(.01);assert.equal(reward.drops.length,0);assert.equal(reward.state.inventory[kind],1);reward.use(kind);assert.equal(reward.state.inventory[kind],0);
  const stats=()=>({res:{phys:0,cold:0,fire:0,poison:0,light:0},speed:1,speedFoot:1,aspdP:1,aspdC:1,aspd:1});let p=stats();reward.apply(p);
  if(kind==='resistance')assert.equal(p.res.phys,20);if(kind==='attack')assert.equal(p.aspdP,1.25);if(kind==='movement')assert.equal(p.speed,1.25);
  reward.tick(179.99);assert.ok(reward.state.buffs[kind]>0);reward.tick(.01);p=stats();reward.apply(p);assert.equal(p.speed,1);assert.equal(p.aspdP,1);assert.equal(p.res.phys,0);
  const next={...enemy,hp:100};reward.record(player,next);reward.killed(next);reward.tick(.01);reward.use(kind);stop();reward.tick(.01);assert.equal(reward.state.buffs[kind],0);assert.throws(()=>reward.use(kind));
 }
});
test('stale attribution and failed drop rolls never grant free merit or consumables',()=>{
 const {player,enemy,reward}=fixture(()=>.99);reward.record(player,enemy);reward.tick(16);reward.killed(enemy);assert.equal(reward.state.points,0);
 const target={...enemy,hp:100};reward.record(player,target);reward.killed(target);assert.equal(reward.state.points,50);assert.equal(reward.drops.length,0);assert.throws(()=>reward.use('attack'));
});

test('using another pill refreshes 180 seconds without doubling stats',()=>{
 const fixtureState=fixture();const {reward,player,enemy}=fixtureState;
 // Resistance fixture always rolls the resistance pill.
 reward.record(player,enemy);reward.killed(enemy);reward.tick(.01);reward.use('resistance');reward.tick(60);
 const second={...enemy,hp:100};reward.record(player,second);reward.killed(second);reward.tick(.01);reward.use('resistance');assert.equal(reward.state.buffs.resistance,180);
 const stats={res:{phys:10,cold:10,fire:10,poison:10,light:10},speed:1,speedFoot:1,aspdP:1,aspdC:1};reward.apply(stats);assert.equal(stats.res.phys,30);
 reward.tick(179.9);assert.ok(reward.state.buffs.resistance>0);reward.tick(.1);assert.equal(reward.state.buffs.resistance,0);
});

test('rank bonuses use the current tier for both teams, persist through revival, and exclude bosses and training SIMs',()=>{
 const {player,enemy,reward,stop}=fixture(()=>.99),sim={x:0,y:0,hp:100,battlefieldTeam:'jin',arenaSim:true};
 const stats=()=>({res:{phys:50,cold:25,fire:0,poison:-10,light:10},aspdP:1,aspdC:.9,aspd:1,speed:1});
 function earn(actor,count){for(let i=0;i<count;i++){const victim={...enemy,battlefieldBoss:true,battlefieldTeam:actor===player?'jin':'song'};reward.record(actor,victim);reward.killed(victim);}}
 for(const actor of [player,sim]){
  let previous=0;
  for(const [points,bonus]of [[0,0],[3000,.05],[9000,.10],[18000,.15],[30000,.20],[50000,.20]]){
   earn(actor,(points-previous)/1000);previous=points;
   const p=stats();reward.apply(p,actor);
   assert.equal(reward.rank(actor).bonus,bonus);assert.equal(p.warPhysicalMultiplier,1+bonus);
   assert.equal(p.res.phys,50*(1+bonus));assert.equal(p.res.cold,25*(1+bonus));
   assert.equal(p.res.fire,0);assert.equal(p.res.poison,-10);
   assert.equal(p.aspdP,1+bonus);assert.equal(p.aspdC,.9*(1+bonus));assert.equal(p.speed,1);
   assert.ok(p.aspdP<=1.2);assert.ok(p.res.phys<=60);
  }
  reward.revived(actor);const p=stats();reward.apply(p,actor);assert.equal(p.warPhysicalMultiplier,1.2);
 }
 for(const actor of [{...sim,battlefieldBoss:true},{...sim,battlefieldMonster:true},{...sim,battlefieldTeam:undefined}]){
  const p=stats();reward.apply(p,actor);assert.equal(p.warPhysicalMultiplier,undefined);assert.equal(p.res.phys,50);
 }
 const capped={...stats(),aspdP:2.9,aspdC:2.6};reward.apply(capped);assert.equal(capped.aspdP,2.9*1.2);assert.equal(capped.aspdC,2.6*1.2); // Final phase/cap is applied after debuffs by speed/runtime.
 stop();let p=stats();reward.apply(p);assert.equal(p.res.phys,50);assert.equal(p.aspdP,1);
 reward.reset();assert.equal(reward.rank(player).bonus,0);assert.equal(reward.rank(sim).points,0);
});

test('native external, internal and basic physical damage receive one multiplier capped at 20%, leaving elemental damage unchanged',()=>{
 const {collectLegacyDeclarations}=require('../tools/sim-balance/legacy-runtime.ts');
 const declarations=collectLegacyDeclarations('src/client');
 const s={Math,b0:(skill,key)=>skill.attr[key]||null,Q0:['phys','cold','fire','poison','light'],Rr:{phys:'physical',cold:'cold',fire:'fire',poison:'poison',light:'light'},s7:true,h4:{},Fw:{},Cw:()=>1,r4:()=>1,n7:()=>[],j1:()=>null,U2:()=>false,i4:()=>false,r7:new Set(),J5:1,y5:2,Li:()=>1,w4:1,q5:()=>1,Zw:()=>0,t4:()=>0,o:{eq:{}},l:{mounted:false}};
 vm.createContext(s);vm.runInContext(declarations.get('F2')+'\n'+declarations.get('Ow'),s);
 const base={wmin:100,wmax:200,physPct:25,physStat:1,add:{fire:30},magAdd:{phys:40,fire:50},enh:{},eng:100,skillBonus:{},seriesSkill:0,dmgMul:1,crit:0,ignoreDef:0,series:0,aspdP:1,aspdC:.9,aspd:1};
 for(const skill of [{id:1,phys:true,attr:{physicsenhance_p:[100],physical:[80],fire:[50]}},{id:2,phys:false,attr:{physical:[80],fire:[50]}}]){
  const normal=s.F2(base,skill,20),boosted=s.F2({...base,warPhysicalMultiplier:1.2,aspdP:1.2,aspdC:1.08},skill,20),capped=s.F2({...base,warPhysicalMultiplier:9},skill,20);
  assert.equal(boosted.parts.phys,normal.parts.phys*1.2);assert.equal(capped.parts.phys,boosted.parts.phys);
  assert.equal(boosted.parts.fire,normal.parts.fire);assert.ok(Math.abs(boosted.rate/normal.rate-1.2)<1e-10);
 }
 const normal=s.Ow(base),boosted=s.Ow({...base,warPhysicalMultiplier:1.2}),capped=s.Ow({...base,warPhysicalMultiplier:9});
 assert.equal(boosted.parts.phys,normal.parts.phys*1.2);assert.equal(capped.parts.phys,boosted.parts.phys);assert.equal(boosted.parts.fire,normal.parts.fire);
 const external={id:1,phys:true,attr:{physicsenhance_p:[100],physical:[80],fire:[50]}},internal={id:2,phys:false,attr:{physical:[80],fire:[50]}};
 const externalBase=s.F2(base,external,20),internalBase=s.F2(base,internal,20);
 const buffed={...base,warExternalMultiplier:1.5,warExternalCold:100,warInternalAdd:{phys:100,cold:100,fire:100,light:100,poison:50}};
 const ext=s.F2(buffed,external,20),int=s.F2(buffed,internal,20),basic=s.Ow(buffed);
 assert.equal(ext.parts.phys,externalBase.parts.phys*1.5);assert.equal(ext.parts.cold,100);assert.equal(ext.parts.fire,externalBase.parts.fire);
 assert.equal(int.parts.phys,internalBase.parts.phys+100);assert.equal(int.parts.fire,internalBase.parts.fire+100);assert.equal(int.parts.poison,50);assert.equal(int.parts.cold,100);assert.equal(int.parts.light,100);
 assert.equal(basic.parts.phys,normal.parts.phys*1.5);assert.equal(basic.parts.cold,100);
});

test('online pill snapshots reach native external/internal hand damage without changing unrelated elements',()=>{
 const {createHeadlessGame,collectLegacyDeclarations}=require('../tools/sim-balance/legacy-runtime.ts');
 const game=createHeadlessGame(process.cwd()),declarations=collectLegacyDeclarations('src/client');
 const s={Math,F:String,b0:(skill,key)=>skill.attr[key]||null,Q0:['phys','cold','fire','poison','light'],Rr:{phys:'physical',cold:'cold',fire:'fire',poison:'poison',light:'light'},s7:true,h4:{},Fw:{},Cw:()=>1,r4:()=>1,n7:()=>[],j1:()=>null,U2:()=>false,i4:()=>false,r7:new Set(),J5:1,y5:2,Li:()=>1,w4:1,q5:()=>1,Zw:()=>0,t4:()=>0,o:{eq:{}},l:{mounted:false}};
 vm.createContext(s);vm.runInContext(declarations.get('F2')+'\n'+declarations.get('Ow')+'\n'+declarations.get('Ki'),s);
 const base={wmin:100,wmax:200,physPct:25,physStat:1,add:{fire:30},magAdd:{phys:40,fire:50},enh:{},eng:100,skillBonus:{},seriesSkill:30,dmgMul:1.2,crit:0,ignoreDef:0,series:0,aspdP:1,aspdC:1,aspd:1};
 const external={id:1,phys:true,attr:{physicsenhance_p:[100],physical:[80],fire:[50]}},internal={id:2,phys:false,attr:{physical:[80],fire:[50]}};
 for(const [kind,skill,key,amount]of [['external',external,'phys',null],['externalCold',external,'cold',100],['internal',internal,'phys',100],['internalPoison',internal,'poison',50],['internalCold',internal,'cold',100],['internalFire',internal,'fire',100],['internalLight',internal,'light',100]]){
  const before=s.F2(base,skill,20);
  game.OnlineBattlefield={state:{phase:'running',itemBuffs:{[kind]:180}}};
  const stats={...base};game.arenaSimulator.applyBattlefieldBonuses(stats);const after=s.F2(stats,skill,20);
  assert.equal(after.parts[key],amount===null?before.parts[key]*1.5:(before.parts[key]||0)+amount,kind);
  assert.notEqual(s.Ki(after),s.Ki(before),kind+' changes displayed hand damage');
  const basicBefore=s.Ow(base),basicAfter=s.Ow(stats);
  assert.equal(basicAfter.parts.phys,kind==='external'?basicBefore.parts.phys*1.5:basicBefore.parts.phys);
  assert.equal(basicAfter.parts.cold||0,(basicBefore.parts.cold||0)+(kind==='externalCold'?100:0));
  for(const element of s.Q0)if(element!==key)assert.equal(after.parts[element]||0,before.parts[element]||0,kind+' preserves '+element);
  const opposite=skill===external?internal:external;
  assert.equal(s.Ki(s.F2(stats,opposite,20)),s.Ki(s.F2(base,opposite,20)),kind+' does not affect opposite attack type');
  const refresh={...base};game.arenaSimulator.applyBattlefieldBonuses(refresh);assert.equal(s.Ki(s.F2(refresh,skill,20)),s.Ki(after),'refresh does not stack');
  game.OnlineBattlefield.state.itemBuffs={};const expired={...base};game.arenaSimulator.applyBattlefieldBonuses(expired);assert.equal(s.Ki(s.F2(expired,skill,20)),s.Ki(before));
 }
 game.OnlineBattlefield={state:{phase:'running',itemBuffs:{accuracy:180}}};
 const accurate={...base,ar:300,arBase:200,arPct:50};game.arenaSimulator.applyBattlefieldBonuses(accurate);
 const weapon={...external,attr:{...external.attr,attackrating_p:[100]}};
 const accuracyBefore=s.F2({...base,ar:300,arBase:200,arPct:50},weapon,20),accuracyAfter=s.F2(accurate,weapon,20);
 assert.equal(accurate.ar,800);assert.equal(accuracyAfter.ar,accuracyBefore.ar+500,'accuracy is added after skill percentages');
 assert.equal(s.F2(accurate,internal,20).ar,0,'auto-hit skills remain auto-hit');
 game.OnlineBattlefield={state:{phase:'finished',itemBuffs:{external:180}}};const ended={...base};game.arenaSimulator.applyBattlefieldBonuses(ended);assert.equal(s.Ki(s.F2(ended,external,20)),s.Ki(s.F2(base,external,20)));
});

test('online defensive, speed, life and accuracy items update native stats and expire without stacking',()=>{
 const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts'),game=createHeadlessGame(process.cwd());
 const base=()=>({life:1000,res:{phys:10,poison:20,cold:30,fire:40,light:50},def:100,ar:200,arBase:120,aspdP:1.2,aspdC:.9,aspd:1.2,speed:1.1,speedFoot:1,retMelee:100,retMeleeP:50,retRangeP:20});
 const cases={
  resistance:s=>assert.deepEqual(Object.values(s.res),[30,40,50,60,70]),
  poisonRes:s=>assert.equal(s.res.poison,70),coldRes:s=>assert.equal(s.res.cold,80),fireRes:s=>assert.equal(s.res.fire,90),lightRes:s=>assert.equal(s.res.light,100),physicalRes:s=>{assert.equal(s.res.phys,60);assert.equal(s.def,100);},
  drum:s=>{assert.equal(s.life,1300);assert.deepEqual(Object.values(s.res),[40,50,60,70,80]);},life:s=>assert.equal(s.life,1500),
  evasion:s=>assert.equal(s.def,600),accuracy:s=>{assert.equal(s.ar,700);assert.equal(s.arBase,120);},
  attack:s=>{assert.equal(s.aspdP,1.5);assert.equal(s.aspdC,1.125);},haste:s=>assert.ok(Math.abs(s.aspdP-1.8)<1e-9),
  movement:s=>{assert.equal(s.speed,1.375);assert.equal(s.speedFoot,1.25);},sprint:s=>assert.ok(Math.abs(s.speed-1.32)<1e-9),
  command:s=>{assert.ok(Math.abs(s.speed-1.43)<1e-9);assert.ok(Math.abs(s.aspdP-1.8)<1e-9);},
  horn:s=>{assert.equal(s.retMelee,80);assert.equal(s.retMeleeP,40);assert.equal(s.retRangeP,16);},
 };
 for(const [kind,check]of Object.entries(cases)){
  game.OnlineBattlefield={state:{phase:'running',itemBuffs:{[kind]:180}}};
  const stats=base();game.arenaSimulator.applyBattlefieldBonuses(stats);check(stats);
  const refresh=base();game.arenaSimulator.applyBattlefieldBonuses(refresh);assert.equal(JSON.stringify(refresh),JSON.stringify(stats),kind+' does not stack on refresh');
  game.OnlineBattlefield.state.itemBuffs={[kind]:0};const expired=base();game.arenaSimulator.applyBattlefieldBonuses(expired);
  for(const key of Object.keys(base()))assert.equal(JSON.stringify(expired[key]),JSON.stringify(base()[key]),kind+' expires: '+key);
 }
 game.OnlineBattlefield={state:{phase:'running',itemBuffs:{attack:180,haste:180,command:180,movement:180,sprint:180,life:180,drum:180}}};
 const combined=base();game.arenaSimulator.applyBattlefieldBonuses(combined);assert.equal(combined.life,1800);assert.ok(Math.abs(combined.aspdP-1.8)<1e-9);assert.ok(Math.abs(combined.speed-1.43)<1e-9);
});
