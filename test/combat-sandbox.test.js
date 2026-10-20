const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { createServer } = require('../src/server/index.ts');
const { openDatabase } = require('../src/server/database.ts');
const { loadCombatEngine } = require('./helpers/combat-engine');
const { compileTypeScriptEntry } = require('../tools/build-app');
function loadSimulator(s) { vm.runInContext(compileTypeScriptEntry('simulator/index.ts','arenaSimulator').code,s); }
const ROOT = path.resolve(__dirname, '..');
function loadDeclaration(s,file,name) {
  const text=fs.readFileSync(path.join(ROOT,file),'utf8');
  const node=acorn.parse(text,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
  vm.runInContext(text.slice(node.start,node.end),s);
}
function game(enabled=true, entries=new Map()) {
  const catalog={};catalog.window=catalog;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'public/data.js'),'utf8'),catalog);
  catalog.window.JFX = {m:{},c:{},f:{}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'src/client/data/advanced-skills-01.js'),'utf8'),catalog);
  for(const skill of Object.values(catalog.JX.skills)) if(skill.learn==='90') Object.assign(skill,{tier:90,req:80});
  const factions=catalog.JX.factions.filter(f=>f.skills?.length);
  for(const faction of factions)faction.starter=faction.skills[0];
  const fields=new Map();
  function field(id){if(!fields.has(id))fields.set(id,{value:'',checked:false,options:[],classList:{toggle(){}}});return fields.get(id);}
  const panel={querySelector:field,querySelectorAll:()=>[],appendChild(){},id:'',innerHTML:''};
  const s={window:{localGameConfig:{development:enabled,combatSandbox:enabled}},
    document:{createElement:tag=>tag==='details'?panel:{},head:{appendChild(){}},body:{appendChild(){}}},
    localStorage:{getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)},
    Math,JSON,Date,b8:1,mP:'test-save-salt', z2:5, Zt:{emei:1,cuiyan:1},
    I:Object.fromEntries(factions.map(f=>[f.key,f])),T:catalog.JX.skills,
    o:{fac:null},l:{P:{life:100,mana:100}},v:{x:500,y:500},Y:{},HA:false,m0:0,
    r0:{0:{n:'Hổ'},1:{n:'Sói'}},k0:[{lo:1,hi:10,m:[0],boss:1},{lo:140,hi:150,m:[1],boss:0}],O0:{w:1000,h:1000},
    originalDamage:0, U9:()=>s.originalDamage++, $A(){},$:()=>{},
    o8(){},cD(){},lD(){},rD(){},v8:state=>state,Vf(){},D0(){},pi(){},n0(){},M1(){},uo(){},tt(){},fA(){},V(){},
    AA:()=>({id:1,bg:'test'}),ma(){},bA:()=>null,X0:(x,y)=>[x,y],
    UA:skill=>!!skill.enemy,j1:()=>null,_A:()=>({}),D:text=>text,k(){},
    n1:(id,level,cls,x,y)=>({tid:id,L:level,cls,x,y,spd:40,hp:1,max:1,dmg:9999}),
  };
  vm.createContext(s);
  loadCombatEngine(s);
  for(const name of ['I3','Yd','bn','t1'])loadDeclaration(s,'src/client/core/state-and-save-03.js',name);
  for(const name of ['ee','SA'])loadDeclaration(s,'src/client/gameplay/shop-and-books-01.js',name);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/client/dev/combat-sandbox-01.js'),'utf8'),s);
  s.entries=entries;s.fields=fields;return s;
}
test('arena creates ten independent level 150 profiles with 500 skill points and saves their progress across swaps/restarts',()=>{
  const s=game();
  const stored=JSON.parse(s.entries.get('jxidle_arena_profiles'));
  assert.equal(Object.keys(stored).length,10);
  for(const faction of Object.keys(s.I)){
    s.combatSandbox.switchFaction(faction);
    assert.equal(s.o.fac,faction);assert.equal(s.o.lvl,150);assert.equal(s.o.skPts,500);
    assert.equal(s.o.sk9Free,1);assert.equal(s.o.sk9m,1);
    for(const id of s.I[faction].skills.filter(id=>s.T[id].tier===90&&!s.SA(id))){assert.equal(s.o.sk[id],s.T[id].max);assert.equal(s.o.skL[id].lv,s.T[id].max);}
  }
  s.combatSandbox.switchFaction('wudang');s.o.skPts=477;s.o.attr.str=25;
  const skill90=s.I.wudang.skills.find(id=>s.T[id].tier===90&&!s.SA(id));
  s.o.sk[skill90]=1;s.o.skL[skill90]={lv:1,xp:50};
  s.combatSandbox.switchFaction('gaibang');assert.equal(s.o.skPts,500);
  s.combatSandbox.switchFaction('wudang');assert.equal(s.o.skPts,477);assert.equal(s.o.attr.str,25);
  assert.equal(s.o.sk[skill90],s.T[skill90].max);assert.equal(s.o.skL[skill90].xp,0);
  const restarted=game(true,s.entries);assert.equal(restarted.o.fac,'wudang');assert.equal(restarted.o.skPts,477);
});
test('arena spawns the selected monster/count with 100k HP, exact one-point incoming damage, and cancels old combat on swap',()=>{
  const s=game();s.combatSandbox.spawnMonsters(1,4,true);
  assert.equal(s.l.enemies.length,4);
  for(const enemy of s.l.enemies){assert.equal(enemy.tid,1);assert.equal(enemy.hp,100000);assert.equal(enemy.max,100000);assert.equal(enemy.dmg,1);assert.equal(enemy.spd,0);}
  s.l.life=80;s.U9(s.l.enemies[0]);assert.equal(s.l.life,79);assert.equal(s.originalDamage,0);
  s.U9({});assert.equal(s.originalDamage,1);
  s.l.combatProjectiles=[{}];s.l.manTgt=s.l.enemies[0];s.Y.target={x:10,y:10};
  s.combatSandbox.switchFaction('wudang');
  assert.equal(s.l.combatProjectiles.length,0);assert.equal(s.l.manTgt,null);assert.equal(s.Y.target,null);
  s.combatSandbox.spawnMonsters(1,500,false);assert.equal(s.l.enemies.length,500);assert.equal(s.l.enemies[0].spd,40);
  assert.throws(()=>s.combatSandbox.spawnMonsters(999,1,false),/không hợp lệ/);
  const before=s.o.lvl;s.cD(s.l.enemies[0]);s.o8();assert.equal(s.o.lvl,before);
});
test('ordinary mode does not create profiles or replace combat functions',()=>{
  const s=game(false);assert.equal(s.combatSandbox,null);assert.equal(s.entries.size,0);
  s.U9({});assert.equal(s.originalDamage,1);
});
test('arena config is advertised only when development and arena mode are both enabled',async()=>{
  for(const development of [true,false]){
    const db=openDatabase(':memory:');const {app,server}=createServer({db,development,combatSandbox:true,downloadAssets:false});
    await app.ready();
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{const config=await(await fetch(`http://127.0.0.1:${server.address().port}/api/config`)).json();assert.equal(config.development,development);assert.equal(config.combatSandbox,development?true:undefined);}
    finally{await app.close();db.close();}
  }
});

test('monster filters use native level ranges and distinguish normal, boss and gold variants',()=>{
  const s=game();
  const normal=s.combatSandbox.filterMonsters(150,'normal');
  assert.equal(normal.length,1);assert.equal(normal[0].id,1);
  const bosses=s.combatSandbox.filterMonsters(150,'boss');assert.equal(bosses.length,1);assert.equal(bosses[0].id,0);
  const gold=s.combatSandbox.filterMonsters(150,'gold');assert.equal(gold.length,1);assert.equal(gold[0].id,0);
  assert.equal(s.combatSandbox.filterMonsters(50,'all').length,0);
  assert.equal(s.combatSandbox.filterMonsters(5,'gold','sói').length,1);
  s.combatSandbox.spawnMonsters(1,2,false,5,'gold');
  for(const monster of s.l.enemies){assert.equal(monster.L,5);assert.equal(monster.cls,'boss');assert.equal(monster.goldBoss,true);assert.equal(monster.hp,100000);}
  s.combatSandbox.spawnMonsters(1,1,false,5,'boss');assert.equal(s.l.enemies[0].goldBoss,undefined);
  assert.throws(()=>s.combatSandbox.spawnMonsters(1,1,false,50,'normal'),/cấp đã chọn/);
});
test('creating monsters preserves current character health and its default computed maximum',()=>{
  const s=game();s.l.life=73;s.l.mana=65;
  s.combatSandbox.spawnMonsters(1,3,false,145,'normal');
  assert.equal(s.l.life,73);assert.equal(s.l.mana,65);assert.equal(s.l.P.life,100);
  s.U9(s.l.enemies[0]);assert.equal(s.l.life,72);
});

test('arena HP checkbox shows exact current health and persists the choice',()=>{
  const s=game(),monster=s.l.enemies[0];
  monster.hp=98765.1;assert.equal(s.combatSandbox.healthLabel(monster),'');
  s.fields.get('#arena-show-health').onchange({target:{checked:true}});
  assert.match(s.combatSandbox.healthLabel(monster),/98\.766\/100\.000/);
  assert.equal(s.combatSandbox.healthLabel({hp:10,max:100}), '');
  assert.equal(JSON.parse(s.entries.get('jxidle_arena_options')).showHealth,true);
  const restored=game(true,s.entries);assert.match(restored.combatSandbox.healthLabel(restored.l.enemies[0]),/100\.000/);
});
test('each dead arena slot respawns after exactly three seconds without duplicating slots, and clear cancels timers',()=>{
  const s=game();s.combatSandbox.spawnMonsters(1,4,true,145,'normal');
  const dead=s.l.enemies[0];dead.hp=0;dead.dead=true;s.cD(dead);s.cD(dead);
  s.combatSandbox.tick(2.999);assert.equal(s.l.enemies.length,3);
  s.combatSandbox.tick(.001);assert.equal(s.l.enemies.length,4);
  const respawn=s.l.enemies.find(e=>e.arenaSlot===dead.arenaSlot);
  assert.notEqual(respawn,dead);assert.equal(respawn.hp,100000);assert.equal(respawn.L,145);assert.equal(respawn.spd,0);
  s.combatSandbox.tick(5);assert.equal(s.l.enemies.length,4);
  for(const e of s.l.enemies){e.hp=0;e.dead=true;s.cD(e);}
  s.combatSandbox.tick(3);assert.equal(s.l.enemies.length,4);assert.equal(new Set(s.l.enemies.map(e=>e.arenaSlot)).size,4);
  const e=s.l.enemies[0];e.hp=0;e.dead=true;s.cD(e);s.combatSandbox.clearCombat();s.combatSandbox.tick(10);
  assert.equal(s.l.enemies.length,0);
});
test('switching factions cancels old pending respawns before creating the new full set',()=>{
  const s=game();s.combatSandbox.spawnMonsters(1,2,false,145,'normal');
  const dead=s.l.enemies[0];dead.hp=0;dead.dead=true;s.cD(dead);
  s.combatSandbox.switchFaction('wudang');s.combatSandbox.tick(10);
  assert.equal(s.l.enemies.length,2);assert.ok(s.l.enemies.every(e=>e.hp===100000));
});

test('sandbox incoming one-point attacks emit one combat-log entry with the actual HP loss',()=>{
  const s=game(),events=[];s.combatLog={record:(...args)=>events.push(args)};
  s.l.life=.5;s.U9(s.l.enemies[0]);assert.equal(events.length,1);assert.equal(events[0][0],'in');assert.equal(events[0][2],.5);assert.equal(s.l.life,0);
});

test('one damage can be disabled for living monsters and future respawns, and survives restart',()=>{
  const s=game(), monster=s.l.enemies[0];
  assert.equal(monster.nativeDamage,9999);
  s.combatSandbox.setOneDamage(false);
  assert.equal(monster.dmg,9999);s.U9(monster);assert.equal(s.originalDamage,1);
  monster.hp=0;monster.dead=true;s.cD(monster);s.combatSandbox.tick(3);
  assert.ok(s.l.enemies.every(e=>e.dmg===9999));
  const restored=game(true,s.entries);assert.equal(restored.combatSandbox.oneDamage,false);
  assert.ok(restored.l.enemies.every(e=>e.dmg===9999));
  restored.combatSandbox.setOneDamage(true);assert.ok(restored.l.enemies.every(e=>e.dmg===1));
});

function simulatorGame(entries) {
  const s=game(true,entries), fields=s.fields;
  s.Math=Object.create(Math);s.Math.random=()=>.5;
  const element=()=>({value:'',checked:false,hidden:false,attributes:{},listeners:{},
    setAttribute(key,value){this.attributes[key]=value;},addEventListener(key,fn){this.listeners[key]=fn;},
    focus(){this.focused=true;},querySelector:id=>field(id)});
  function field(id){if(!fields.has(id))fields.set(id,element());return fields.get(id);}
  s.simNodes=[];s.simListeners={};
  s.gmToggle=element();s.gmToggle.id='gm-toggle';s.gmPanel=element();s.gmPanel.id='gm-panel';
  s.document.createElement=element;
  s.document.getElementById=id=>[...s.simNodes,s.gmToggle,s.gmPanel].find(node=>node.id===id)||null;
  s.document.addEventListener=(key,fn)=>{s.simListeners[key]=fn;};
  s.document.body.appendChild=node=>s.simNodes.push(node);
  Object.assign(s, { Z:()=>1, E:(x,lo,hi)=>Math.max(lo,Math.min(hi,x)), y1:()=>false, cw:75,
    Q0:['phys','cold','fire','poison','light'], y5:2, Ct:.2, ve:3, f8:1, Od:0, Jr:.5,
    ea:()=>1,E8(){},Tt(){},W3(){},za(){},Rn:()=>null,
    Jt:()=>null,x8(){},Ya(){},kn:()=>0,Mw:(actor,x,y)=>Object.assign(actor,{x,y}),Qa:.5,QA:.81,Z0:{g:false},R2:()=>true,A0:{m:{},f:{},s:{}},Hi:{phys:"#fff"},Y3:()=>0,mt:()=>true,G3(){},
    F5:()=>[],l8:()=>0,nD:()=>[],showNhiepHonImpact(){},
    $d(){},Pt(){s.o.skPts=0;},yt(){s.o.attr.str+=s.o.attrPts;s.o.attrPts=0;},
    j0:()=>({life:1000,mana:100,manaRegen:10,series:0,def:0,res:{phys:0,cold:0,fire:0,poison:0,light:0},
      main:{id:s.o.main==='basic'?0:s.o.main,n:'Test skill',parts:{phys:100},rad:1000,rate:2,cost:0,crit:0,series:0,series5:0},
      basic:{parts:{phys:100},rad:1000,rate:2,series:0}}),
  });
  for(const name of ['Pe','ja','hs'])loadDeclaration(s,'src/client/core/state-and-save-01.js',name);
  s.l.P=s.j0();for(const enemy of s.l.enemies)Object.assign(enemy,{n:"Quái",res:s.l.P.res,def:0,series:0,act:"at"});s.l.life=1000;s.l.mana=100;s.l.zoneShown=1;s.l.quiet=false;
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/client/ui/combat-log-01.js'),'utf8'),s);
  loadSimulator(s);
  return s;
}
test('SIM creates each faction and selected skill, auto allocation is isolated from the player',()=>{
  const s=simulatorGame(),player=s.o,world=s.l,hero=s.v;
  for(const faction of Object.keys(s.I)){
    const skill=s.I[faction].skills.find(id=>s.UA(s.T[id]));
    const sim=s.arenaSimulator.create(faction,skill,true,true);
    assert.equal(sim.profile.fac,faction);assert.equal(sim.stats.main.id,skill);
    assert.equal(sim.profile.skPts,0);assert.equal(sim.profile.attrPts,0);
    assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(s.v,hero);
    assert.equal(s.o.attr.str,0);assert.equal(s.o.skPts,500);
    assert.equal(s.l.enemies.filter(e=>e.arenaSim).length,Object.keys(s.I).indexOf(faction)+1);
  }
  assert.throws(()=>s.arenaSimulator.create('no-such-faction'),/không hợp lệ/);
});
function advanceSimulator(s, duration=.4) {for(let t=0;t<duration;t+=.02)s.advanceSkillContacts(.02);}
test('SIM farms via real contact, never hurts the player with PK off, and produces formula inputs/results',()=>{
  const s=simulatorGame(),sim=s.arenaSimulator.create('wudang'),monster=s.l.enemies[0];
  sim.x=monster.x;sim.y=monster.y;
  const before=monster.hp;
  s.arenaSimulator.tick(.1);advanceSimulator(s);assert.equal(monster.hp,before);
  s.arenaSimulator.setFarm(true);s.arenaSimulator.tick(.1);
  assert.equal(monster.hp,before,'damage waits for contact');
  advanceSimulator(s);assert.equal(monster.hp,before-100);assert.equal(s.l.life,1000);
  const event=s.arenaSimulator.events.find(e=>e.source===sim.n);
  assert.ok(event.steps.some(row=>row.formula.startsWith('Kháng:')));
  assert.equal(event.steps.at(-1).values.actualLoss,100);
  const exported=JSON.parse(s.arenaSimulator.text());assert.equal(exported.format,'arena-damage-v1');
  assert.equal(exported.simulator.faction,'wudang');
});
test('PK checkbox cancellation invalidates existing contacts; enabled PK applies player absorption and mana shield',()=>{
  const s=simulatorGame(),sim=s.arenaSimulator.create('wudang');
  sim.x=s.v.x;sim.y=s.v.y;
  s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);
  const pending=s.l.combatProjectiles[0];assert.ok(pending);
  s.arenaSimulator.setPK(false);pending.combat.onHit(s.v);advanceSimulator(s);
  assert.equal(s.l.life,1000);assert.equal(s.l.combatProjectiles.length,0);
  Object.assign(s.l.P,{sorb:20,manaShield:50});
  sim.cooldown=0;s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);advanceSimulator(s);
  assert.equal(s.l.life,960);assert.equal(s.l.mana,60);
  assert.equal(s.o.fac,'shaolin');assert.equal(s.combatLog.entries().length,1);
  assert.equal(s.combatLog.entries()[0].type,'in');
  assert.equal(s.combatLog.entries()[0].amount,40);
  const event=s.arenaSimulator.events.at(-1);assert.equal(event.steps.at(-1).values.actualLoss,40);
});
test('explicit SIM removal cancels its damage while clearing monsters keeps other SIM alive',()=>{
  const s=simulatorGame(),sim=s.arenaSimulator.create('wudang');
  s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);
  const pending=s.l.combatProjectiles[0];s.arenaSimulator.remove();
  pending.combat.onHit(s.v);assert.equal(s.l.life,1000);
  const kept=s.arenaSimulator.create('wudang');s.combatSandbox.clearCombat();s.combatSandbox.tick(.1);
  assert.equal(s.arenaSimulator.actor,kept);assert.ok(s.l.enemies.includes(kept));
  assert.ok(!s.l.enemies.includes(sim));
});
test('formula log is bounded, clearable and disabling logging does not disable attacks',()=>{
  const s=simulatorGame();
  for(let i=0;i<205;i++)s.U9(s.l.enemies[0]);
  assert.equal(s.arenaSimulator.events.length,200);
  s.arenaSimulator.clearLog();assert.equal(JSON.parse(s.arenaSimulator.text()).events.length,0);
  s.combatLog.simulatorLog.enabled=false;
  s.U9(s.l.enemies[0]);assert.equal(s.arenaSimulator.events.length,0);
});

test('SIM context always restores the player even when automatic allocation fails',()=>{
  const s=simulatorGame(),player=s.o,world=s.l,hero=s.v;
  s.Pt=()=>{throw new Error('allocation failed');};
  assert.throws(()=>s.arenaSimulator.create('wudang','basic',true,false),/allocation failed/);
  assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(s.v,hero);
});
test('SIM and formula hooks are absent outside Arena Test',()=>{
  const s=game(false),incoming=s.U9;
  loadSimulator(s);
  assert.equal(s.arenaSimulator,null);assert.equal(s.U9,incoming);
});

test('SIM attack context preserves the existing player combat log owner and history',()=>{
  const s=simulatorGame();s.combatLog.record('out',s.l.enemies[0],7,'Trước SIM');
  const sim=s.arenaSimulator.create('wudang');sim.x=s.v.x;sim.y=s.v.y;
  s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);advanceSimulator(s);
  const entries=s.combatLog.entries();
  assert.equal(entries.length,2);assert.equal(entries[0].amount,7);
  assert.equal(entries[1].type,'in');assert.equal(entries[1].amount,100);
});

test('SIM skill menu defaults to an explicitly marked level-90 skill',()=>{
  const s=simulatorGame(),selection=s.fields.get('#sim-skill');
  assert.match(selection.innerHTML,/Kỹ năng 9x/);
  assert.equal(s.T[selection.value].tier,90);
  assert.ok(s.UA(s.T[selection.value]));
});
test('every active 9x skill is mastered, cast with its own id and records contact damage',()=>{
  const s=simulatorGame();let checked=0;
  s.Math=Object.create(Math);s.Math.random=()=>.5;
  for(const [faction,info] of Object.entries(s.I))for(const id of info.skills.filter(id=>s.T[id].tier===90&&s.UA(s.T[id])&&!s.SA(id))){
    for(const actor of s.arenaSimulator.actors)s.arenaSimulator.remove(actor);
    s.arenaSimulator.clearLog();
    const sim=s.arenaSimulator.create(faction,id),monster=s.l.enemies[0];
    sim.x=monster.x;sim.y=monster.y;sim.stats.main.cost=10;
    assert.equal(sim.profile.sk[id],s.T[id].max);
    s.arenaSimulator.setFarm(true);s.arenaSimulator.tick(.01);
    assert.equal(sim.casts,1);assert.equal(sim.lastCast.id,id);assert.equal(sim.mana,100);
    assert.equal(s.l.combatProjectiles[0].combat.skill.id,id);
    advanceSimulator(s);
    assert.ok(s.arenaSimulator.events.some(event=>event.source===sim.n&&event.skillInput.id===id&&event.steps.some(row=>row.values.actualLoss>0)),`${faction} ${id} must cause damage through skill contact`);
    checked++;
  }
  assert.ok(checked>=10,'all ten factions must be covered');
});
test('changing the SIM skill dropdown updates the existing actor and invalidates its old skill contacts',()=>{
  const s=simulatorGame(),ids=s.I.wudang.skills.filter(id=>s.T[id].tier===90&&s.UA(s.T[id]));
  assert.ok(ids.length>=2);
  const sim=s.arenaSimulator.create('wudang',ids[0]),monster=s.l.enemies[0];
  sim.x=monster.x;sim.y=monster.y;sim.profile.attr.str=123;sim.hp=500;sim.mana=40;
  s.arenaSimulator.setFarm(true);s.arenaSimulator.tick(.01);
  const pending=s.l.combatProjectiles[0],hp=monster.hp;
  s.fields.get('#sim-faction').value='wudang';s.fields.get('#sim-skill').value=String(ids[1]);
  s.fields.get('#sim-skill').onchange();
  assert.equal(s.arenaSimulator.actor,sim);assert.equal(sim.profile.main,ids[1]);
  assert.equal(sim.stats.main.id,ids[1]);assert.equal(sim.profile.attr.str,123);assert.equal(sim.hp,500);
  assert.equal(s.l.combatProjectiles.length,0);pending.combat.onHit(monster);assert.equal(monster.hp,hp);
  s.arenaSimulator.tick(.01);assert.equal(sim.lastCast.id,ids[1]);advanceSimulator(s);
  assert.ok(s.arenaSimulator.events.some(event=>event.skillInput.id===ids[1]));
});
test('an unavailable selected skill reports an error and retains the current SIM skill instead of falling back to basic',()=>{
  const s=simulatorGame(),id=s.I.wudang.skills.find(id=>s.T[id].tier===90&&s.UA(s.T[id]));
  const sim=s.arenaSimulator.create('wudang',id),state=JSON.stringify(sim.profile),stats=sim.stats;
  const compute=s.j0;s.j0=()=>{const result=compute();result.main=result.basic;result.actives=[];return result;};
  assert.throws(()=>s.arenaSimulator.selectSkill(id),/chưa thể dùng chiêu/);
  assert.equal(sim.stats,stats);assert.equal(JSON.stringify(sim.profile),state);
});

test('SIM has its own initially hidden panel and toggle, and closing it does not stop simulation',()=>{
  const s=simulatorGame(),toggle=s.simNodes.find(node=>node.id==='sim-toggle'),panel=s.simNodes.find(node=>node.id==='sim-panel');
  assert.ok(toggle);assert.ok(panel);assert.equal(toggle.textContent,'SIM');
  assert.equal(panel.hidden,true);assert.equal(toggle.attributes['aria-expanded'],'false');
  toggle.onclick();assert.equal(panel.hidden,false);assert.equal(toggle.attributes['aria-expanded'],'true');
  assert.equal(s.gmPanel.hidden,true);assert.equal(s.gmToggle.attributes['aria-expanded'],'false');
  const actor=s.arenaSimulator.create('wudang');s.arenaSimulator.setFarm(true);
  s.fields.get('#sim-close').onclick();assert.equal(panel.hidden,true);assert.equal(s.arenaSimulator.actor,actor);
  assert.equal(toggle.focused,true);s.arenaSimulator.tick(.1);assert.equal(actor.casts,1);
  toggle.onclick();s.simListeners.keydown({key:'Escape'});assert.equal(panel.hidden,true);
  toggle.onclick();s.gmToggle.listeners.click();assert.equal(panel.hidden,true);
});

test('creating SIM repeatedly adds independent actors and farms never target another SIM',()=>{
  const s=simulatorGame(),one=s.arenaSimulator.create('wudang'),two=s.arenaSimulator.create('shaolin');
  assert.notEqual(one.simId,two.simId);assert.equal(s.arenaSimulator.actors.length,2);
  assert.ok(s.l.enemies.includes(one));assert.ok(s.l.enemies.includes(two));
  s.arenaSimulator.selectActor(one.simId);s.arenaSimulator.setFarm(true);
  s.arenaSimulator.selectActor(two.simId);s.arenaSimulator.setPK(true);
  s.arenaSimulator.tick(.1);
  assert.ok(one.casts>0);assert.ok(two.casts>0);
  assert.ok(!one.target.arenaSim);assert.equal(two.target,s.v);
  const twoCast=s.l.combatProjectiles.find(effect=>effect.combat.actor===two);
  s.arenaSimulator.remove(one);
  assert.equal(s.arenaSimulator.actors.length,1);assert.equal(s.arenaSimulator.actor,two);
  assert.ok(s.l.combatProjectiles.includes(twoCast));
  const before=s.l.life;twoCast.combat.onHit(s.v);assert.ok(s.l.life<before);
});
test('toggling PK on one SIM invalidates only its own cast and does not alter another SIM',()=>{
  const s=simulatorGame(),one=s.arenaSimulator.create('wudang');s.arenaSimulator.setPK(true);
  const two=s.arenaSimulator.create('wudang');s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);
  const a=s.l.combatProjectiles.find(effect=>effect.combat.actor===one),b=s.l.combatProjectiles.find(effect=>effect.combat.actor===two);
  s.arenaSimulator.selectActor(one.simId);s.arenaSimulator.setPK(false);
  a.combat.onHit(s.v);assert.equal(s.l.life,1000);
  b.combat.onHit(s.v);assert.equal(s.l.life,900);assert.equal(two.pk,true);
});
test('SIM keeps casting with empty mana and high mana costs while HP stays finite',()=>{
  const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');
  actor.stats.main.cost=999999;actor.mana=0;s.arenaSimulator.setFarm(true);
  for(let i=0;i<8;i++){s.arenaSimulator.tick(.6);advanceSimulator(s);}
  assert.equal(actor.casts,8);assert.equal(actor.mana,actor.stats.mana);
  actor.hp=0;s.arenaSimulator.tick(.1);assert.equal(s.arenaSimulator.actors.length,0);
});
test('monster-style pursuit keeps a target, attacks after approaching and tracks a moving PK target',()=>{
  const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');actor.stats.main.rad=50;
  actor.x=s.v.x+500;actor.y=s.v.y;let moves=0;
  s.Mw=(who,x,y)=>{moves++;Object.assign(who,{x,y});};
  s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);
  assert.equal(moves,1);assert.equal(actor.casts,1);assert.equal(actor.target,s.v);
  s.v.x+=200;s.arenaSimulator.tick(.1);
  assert.equal(moves,1,'SIM stays still until its cast finishes');
  advanceSimulator(s,.6);s.arenaSimulator.tick(.6);
  assert.equal(moves,2);assert.equal(actor.casts,2);assert.equal(actor.x,s.v.x);
});
test('manual potential and skill allocation is isolated, budgeted and live for the selected SIM',()=>{
  const s=simulatorGame(),one=s.arenaSimulator.create('wudang'),two=s.arenaSimulator.create('wudang');
  s.arenaSimulator.selectActor(one.simId);s.arenaSimulator.setAttribute('str',100);
  assert.equal(one.profile.attr.str,100);assert.equal(one.profile.attrPts,645);assert.equal(two.profile.attr.str,0);assert.equal(s.o.attr.str,0);
  assert.throws(()=>s.arenaSimulator.setAttribute('str',100000),/Không đủ/);
  assert.equal(one.profile.attr.str,100);
  const id=s.I.wudang.skills.find(id=>(one.profile.sk[id]||0)<s.T[id].max);
  const before=one.profile.sk[id]||0,points=one.profile.skPts;
  s.arenaSimulator.setSkill(id,before+1);assert.equal(one.profile.sk[id],before+1);assert.equal(one.profile.skPts,points-1);
  assert.throws(()=>s.arenaSimulator.setSkill(id,s.T[id].max+1),/không hợp lệ/);
  assert.match(s.fields.get('#sim-build').innerHTML,/Tiềm năng/);assert.match(s.fields.get('#sim-build').innerHTML,/Kỹ năng/);
});
test('SIM templates preserve exact builds and survive SQLite close/reopen before creating more actors',async()=>{
  const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'sim-template-')),filename=path.join(dir,'save.sqlite');
  const {initialize,snapshot}=require('../src/server/database.ts');
  const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');
  s.arenaSimulator.setAttribute('str',120);
  const id=s.I.wudang.skills.find(id=>(actor.profile.sk[id]||0)<s.T[id].max);
  s.arenaSimulator.setSkill(id,(actor.profile.sk[id]||0)+1);s.arenaSimulator.setFarm(true);
  const template=await s.arenaSimulator.saveTemplate('Võ Đang test');
  let db;
  try {
    db=openDatabase(filename);initialize(db,{jxidle_sim_templates:s.entries.get('jxidle_sim_templates')});db.close();
    db=openDatabase(filename);const stored=snapshot(db).entries;db.close();db=null;
    const restored=simulatorGame(new Map(Object.entries(stored)));
    assert.equal(restored.arenaSimulator.templates()[0].name,'Võ Đang test');
    const first=restored.arenaSimulator.createFromTemplate(template.id),second=restored.arenaSimulator.createFromTemplate(template.id);
    assert.equal(restored.arenaSimulator.actors.length,2);assert.notEqual(first.simId,second.simId);
    assert.equal(JSON.stringify(first.profile.attr),JSON.stringify(actor.profile.attr));
    assert.equal(JSON.stringify(first.profile.sk),JSON.stringify(actor.profile.sk));assert.equal(first.profile.main,actor.profile.main);assert.equal(first.farm,true);
    restored.arenaSimulator.setAttribute('str',121);assert.equal(first.profile.attr.str,120);
    assert.equal(restored.arenaSimulator.templates()[0].profile.attr.str,120,'template must not share mutable state with actors');
  } finally {if(db)db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('template save waits for SQLite sync and reports pending writes instead of claiming success',async()=>{
  const s=simulatorGame();s.arenaSimulator.create('wudang');let flushed=0;
  s.window.localGameStorage={pending:1,async flush(){flushed++;}};
  await assert.rejects(()=>s.arenaSimulator.saveTemplate('Waiting'),/chờ đồng bộ SQLite/);assert.equal(flushed,1);
  s.window.localGameStorage.pending=0;await s.arenaSimulator.saveTemplate('Waiting');assert.equal(s.arenaSimulator.templates().length,1);
  await assert.rejects(()=>s.arenaSimulator.saveTemplate(''),/Tên template/);
});

test('applying the point table commits potential and skill changes together and saving keeps them',async()=>{
  const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');
  const id=s.I.wudang.skills.find(id=>(actor.profile.sk[id]||0)<s.T[id].max),value=(actor.profile.sk[id]||0)+2;
  s.fields.get('#sim-build').querySelectorAll=()=>[{dataset:{potential:'str'},value:'100'},{dataset:{skillLevel:String(id)},value:String(value)}];
  s.fields.get('#sim-build').onclick({target:{closest:()=>({dataset:{buildApply:'1'}})}});
  assert.equal(actor.profile.attr.str,100);assert.equal(actor.profile.sk[id],value);
  await s.arenaSimulator.saveTemplate('Applied');assert.equal(s.arenaSimulator.templates()[0].profile.attr.str,100);
});
test('template save waits for a bootstrap flush already in progress to finish',async()=>{
  const s=simulatorGame();s.arenaSimulator.create('wudang');let waited=0;
  s.window.localGameStorage={pending:1,async flush(){}};
  s.window.setTimeout=callback=>{waited++;s.window.localGameStorage.pending=0;callback();};
  await s.arenaSimulator.saveTemplate('Busy queue');assert.equal(waited,1);
});

test('SIM nameplate anchor ignores attack animation height just like ordinary characters', () => {
  const s=simulatorGame(), actor=s.arenaSimulator.create('wudang'), positions=[];
  actor.look={anim:'sim-body'};
  Object.assign(s,{E0:{anim:{'sim-body':{st:{h:80}}}},Jn:1,H8(){},ps(){},M8:()=>true,bA:()=>({}),L3:(x,y)=>positions.push({x,y})});
  vm.runInContext(compileTypeScriptEntry('render/nameplates.ts','nameplateOffset').code,s);
  for(const height of [80,200,0,30]){
    s.kf=()=>height;
    s.arenaSimulator.draw({},actor,1/60);
  }
  assert.ok(positions.every(position=>position.x===actor.x&&position.y===actor.y-80));
});

test('SIM renders live curse sprites above its nameplate, expires them and obeys the look FX switch', () => {
  const s=simulatorGame(),actor=s.arenaSimulator.create('wudang'),draws=[];
  actor.look={anim:'sim-body'};actor.curse={390:10};s.l.clock=1;
  Object.assign(s,{E0:{anim:{'sim-body':{st:{h:80}}}},Jn:1,nv:.6,H8(){},ps(){},kf:()=>80,M8:()=>true,
    bA:()=>({complete:true,naturalWidth:100}),L3(){},U1:{390:{f:'curse.webp',pos:'head',n:1,w:52,h:46,ax:23,ay:97,ms:60}}});
  vm.runInContext(compileTypeScriptEntry('render/nameplates.ts','nameplateOffset').code,s);
  for(const name of ['F3','WP'])loadDeclaration(s,'src/client/render/effects-and-look-01.js',name);
  const context={drawImage:(...args)=>draws.push(args)};
  s.arenaSimulator.draw(context,actor,1/60);
  assert.equal(draws.length,1);assert.ok(draws[0][6]+draws[0][8]<actor.y-80-20);
  s.l.clock=11;s.arenaSimulator.draw(context,actor,1/60);assert.equal(draws.length,1);
  s.l.clock=1;s.o.lookFx=false;s.arenaSimulator.draw(context,actor,1/60);assert.equal(draws.length,1);
});

test('SIM list exposes each actor and deletes the clicked actor without touching another selected SIM',()=>{
 const s=simulatorGame(),one=s.arenaSimulator.create('wudang'),two=s.arenaSimulator.create('shaolin');
 const list=s.fields.get('#sim-list');assert.match(list.innerHTML,new RegExp(one.simId));assert.match(list.innerHTML,new RegExp(two.simId));
 assert.match(list.innerHTML,/data-sim-delete/);
 list.onclick({target:{closest:()=>({dataset:{simDelete:one.simId}})}});
 assert.equal(s.arenaSimulator.actors.length,1);assert.equal(s.arenaSimulator.actor,two);assert.ok(!s.l.enemies.includes(one));
 assert.doesNotMatch(list.innerHTML,new RegExp(one.simId));
 const panel=s.simNodes.find(node=>node.id==='sim-panel');assert.doesNotMatch(panel.innerHTML,/sim-copy|sim-log-enabled|id="sim-log"/);
});

test('SIM log filter keeps complete formulas after actor deletion and clears only SIM events',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang'),monster=s.l.enemies[0];
 s.U9(monster);actor.x=s.v.x;actor.y=s.v.y;
 s.arenaSimulator.setFarm(true);s.arenaSimulator.tick(.1);advanceSimulator(s);
 const provider=s.combatLog.simulatorLog;
 const events=JSON.parse(provider.text(true)).events;
 assert.ok(events.length>0);assert.ok(events.every(event=>event.simId===actor.simId));assert.ok(events.some(event=>event.steps.length>1));
 assert.ok(JSON.parse(provider.text(false)).events.some(event=>!event.simId));
 s.arenaSimulator.remove(actor);assert.equal(JSON.parse(provider.text(true)).events.length,events.length);
 assert.match(provider.html(true),/sim-formula-event/);
 provider.clear(true);assert.equal(JSON.parse(provider.text(true)).events.length,0);assert.ok(JSON.parse(provider.text(false)).events.length>0);
});

test('template table creates from the clicked row and deletes only its template with durable sync',async()=>{
 const s=simulatorGame();s.arenaSimulator.create('wudang');
 const one=await s.arenaSimulator.saveTemplate('Kiếm template'),two=await s.arenaSimulator.saveTemplate('Template giữ lại');
 const table=s.fields.get('#sim-templates');assert.match(table.innerHTML,/<table/);assert.match(table.innerHTML,/data-template-create/);assert.match(table.innerHTML,/data-template-delete/);
 await table.onclick({target:{closest:()=>({dataset:{templateCreate:one.id}})}});
 assert.equal(s.arenaSimulator.actors.length,2);const actor=s.arenaSimulator.actor;
 let flushes=0;s.window.localGameStorage={pending:0,flush:async()=>{flushes++;}};
 await table.onclick({target:{closest:()=>({dataset:{templateDelete:one.id}})}});
 assert.equal(flushes,1);assert.equal(s.arenaSimulator.templates().length,1);assert.equal(s.arenaSimulator.templates()[0].id,two.id);
 assert.equal(s.arenaSimulator.actor,actor,'deleting a template keeps spawned actors alive');
 const reopened=simulatorGame(s.entries);assert.equal(reopened.arenaSimulator.templates().length,1);assert.equal(reopened.arenaSimulator.templates()[0].id,two.id);
 await assert.rejects(()=>s.arenaSimulator.deleteTemplate(one.id),/không tồn tại/);
});

test('real skill damage preserves monster actions above the old five percent threshold',()=>{
 const s=simulatorGame(),monster=s.l.enemies[0];Object.assign(monster,{hp:1000,max:1000,act:'at'});
 const skill={parts:{phys:50},crit:0,series:0,series5:0};
 s.hs(skill,monster);assert.equal(monster.hp,950);assert.ok(!(monster.hurtT>0));assert.equal(monster.act,'at');
 s.hs({...skill,parts:{phys:51}},monster);assert.equal(monster.hp,899);assert.equal(monster.act,'at');assert.ok(!(monster.hurtT>0));
});

test('SIM PK damage respects absorption without freezing player actions',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');actor.x=s.v.x;actor.y=s.v.y;
 s.l.P.sorb=80;s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);advanceSimulator(s,.2);
 assert.equal(s.l.life,980);assert.ok(!(s.v.hurtT>0),'100 raw but 20 actual damage is below 5%');
 advanceSimulator(s,.4);s.l.P.sorb=0;actor.cooldown=0;s.arenaSimulator.tick(.6);advanceSimulator(s,.2);
 assert.equal(s.l.life,880);assert.notEqual(s.v.act,'hurt');assert.ok(!(s.v.hurtT>0));
 assert.equal(s.actorActionLocked(s.v),false);
});

test('large hits do not block SIM casting after mode changes',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');s.arenaSimulator.setFarm(true);
 s.applyActorHurt(actor,51,1000);
 s.arenaSimulator.setFarm(false);s.arenaSimulator.setFarm(true);s.arenaSimulator.tick(.1);
 assert.equal(actor.casts,1);assert.notEqual(actor.act,'hurt');assert.ok(!(actor.hurtT>0));
});

test('native monster damage no longer freezes the player above five percent',()=>{
 const s=simulatorGame();loadDeclaration(s,'src/client/core/state-and-save-01.js','U9');
 Object.assign(s,{Dw:['phys'],Yr:75,Pe:()=>100});s.l.life=1000;s.v.act='at';
 const attacker={...s.l.enemies[0],dmg:50,ar:100,series:0};
 s.U9(attacker);assert.equal(s.l.life,950);assert.ok(!(s.v.hurtT>0));assert.equal(s.v.act,'at');
 attacker.dmg=51;s.U9(attacker);assert.equal(s.l.life,899);assert.equal(s.v.act,'at');assert.ok(!(s.v.hurtT>0));
 advanceSimulator(s,.3);s.l.P.manaShield=100;s.l.mana=1000;attacker.dmg=100;
 s.U9(attacker);assert.equal(s.l.life,899);assert.ok(!(s.v.hurtT>0),'mana absorption leaves no HP damage to trigger hurt');
});

test('cold damage increases slow intensity independently of duration and stronger hits refresh it',()=>{
 const s=simulatorGame(),base=s.l.enemies[0];
 const low={...base,hp:10000,max:10000,slowT:0},high={...low};
 s.hs({parts:{cold:100},crit:0,series:0,series5:0},low);
 s.hs({parts:{cold:500},crit:0,series:0,series5:0},high);
 assert.equal(low.slowT,s.f8);assert.equal(high.slowT,low.slowT);assert.ok(high.hp<low.hp);
 assert.equal(low.slowPower,.25);assert.ok(high.slowPower>low.slowPower);
 low.slowT=.2;s.l.P.coldEnh=18;
 s.hs({parts:{cold:500},coldT:3,crit:0,series:0,series5:0},low);
 assert.equal(low.slowT,4,'stronger cold refreshes its independently calculated duration');
 low.slowT=0;s.hs({parts:{cold:100},coldT:3,crit:0,series:0,series5:0},low);
 assert.equal(low.slowT,4);
});

test('poison adds remaining damage into the refreshed duration without immediate HP loss',()=>{
 const s=simulatorGame(),monster=s.l.enemies[0];Object.assign(monster,{hp:1000,max:1000,poison:0});
 const skill={parts:{poison:90},poisonT:3,crit:0,series:0,series5:0};
 s.hs(skill,monster);assert.equal(monster.hp,1000);assert.equal(monster.poison,3);assert.equal(monster.poisonDmg,30);
 monster.poison=2;s.hs(skill,monster);
 assert.equal(monster.poison,3);assert.equal(monster.poisonDmg,50,'60 remaining plus 90 new damage over 3s');
 assert.ok(!(s.l.txt||[]).some(label=>label.kind==='poison'),'deferred poison is not displayed as HP damage on application');
});

test('SIM poison loss uses green aggregated damage numbers, stops at expiry and never displays overkill HP',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');
 actor.farm=false;actor.pk=false;actor.hp=100;actor.poison=.1;actor.poisonDmg=10;s.l.txt=[];
 s.arenaSimulator.tick(.05);s.arenaSimulator.tick(.05);
 assert.equal(actor.hp,99);assert.equal(s.l.txt.length,1);assert.equal(s.l.txt[0].target,actor);
 assert.equal(s.l.txt[0].amount,1);assert.equal(s.l.txt[0].color,'#8fe34a');
 s.arenaSimulator.tick(.1);assert.equal(actor.hp,99);assert.equal(s.l.txt[0].amount,1);
 actor.hp=.2;actor.poison=1;actor.poisonDmg=100;s.l.txt=[];
 s.arenaSimulator.tick(.1);assert.equal(actor.hp,0);assert.equal(s.l.txt[0].amount,.2);
});

test('explicit stun refreshes to the configured duration rather than adding hit durations',()=>{
 const s=simulatorGame(),monster=s.l.enemies[0];Object.assign(monster,{hp:10000,max:10000,stun:0});
 s.l.P.stunLong=100;
 const skill={parts:{phys:1},stun:100,crit:0,series:0,series5:0};
 s.hs(skill,monster);assert.equal(monster.stun,1.6);
 monster.stun=.4;s.hs(skill,monster);assert.equal(monster.stun,1.6);
 monster.stun=2;s.hs(skill,monster);assert.equal(monster.stun,2,'a shorter incoming stun never shortens the existing one');
});

test('cold power grows with diminishing returns, stays bounded, expires and rejects weaker refreshes',()=>{
 const s=simulatorGame(),engine=s.CombatEngine,target={};
 const values=[1,100,500,1000,1e9].map(engine.coldSlowPower);
 for(let i=1;i<values.length;i++)assert.ok(values[i]>values[i-1]);
 assert.equal(values[1],.25);assert.ok(Math.abs(values[2]-.5357142857142857)<1e-12);
 assert.ok(values[3]-values[2]<values[2]-values[1]);assert.ok(values.at(-1)<.75);
 for(const damage of [0,-1,NaN,Infinity])assert.equal(engine.coldSlowPower(damage),0);
 s.applyColdSlow(target,500,2);target.slowT=.3;
 assert.equal(s.applyColdSlow(target,100,10),false);assert.equal(target.slowT,.3);
 assert.equal(s.applyColdSlow(target,500,2),true);assert.equal(target.slowT,2);
 target.slowT=0;assert.equal(s.coldSpeedFactor(target),1);
 s.applyColdSlow(target,100,1);assert.equal(s.coldSpeedFactor(target),.75);
 assert.equal(s.applyColdSlow({},100,0),false);
});

test('cold intensity uses only the cold component after resistance, not physical damage or target HP',()=>{
 const s=simulatorGame(),base=s.l.enemies[0],hit=(cold,phys,res,max=10000)=>{
  const target={...base,hp:max,max,slowT:0,res:{...base.res,cold:res}};
  s.hs({parts:{cold,phys},crit:0,series:0,series5:0},target);return target;
 };
 const low=hit(100,0,0),high=hit(500,0,0),resisted=hit(500,0,75),mixed=hit(100,3000,0);
 assert.ok(high.slowPower>resisted.slowPower);assert.ok(resisted.slowPower>low.slowPower);
 assert.equal(mixed.slowPower,low.slowPower);assert.equal(hit(100,0,0,100000).slowPower,low.slowPower);
 const zero=hit(0,100,0);assert.equal(zero.slowT,0);
});

test('native monster cold applies the same strength curve while freeze reduction changes only duration',()=>{
 const s=simulatorGame();loadDeclaration(s,'src/client/core/state-and-save-01.js','U9');
 Object.assign(s,{Dw:['cold'],Yr:75,Pe:()=>100});s.l.life=10000;s.l.P.freezeRed=50;
 const attacker={...s.l.enemies[0],dmg:500,ar:100,series:0};s.U9(attacker);
 assert.equal(s.l.slowT,s.f8*.5);assert.equal(s.l.slowPower,s.CombatEngine.coldSlowPower(500));
 s.l.slowT=0;s.l.P.res.cold=75;s.U9(attacker);assert.equal(s.l.slowPower,s.CombatEngine.coldSlowPower(125));
 s.l.slowT=0;s.l.P.freezeRed=100;s.U9(attacker);assert.equal(s.l.slowT,0);
});

test('SIM PK transfers resolved cold strength and defender duration reduction, keeping stronger active cold',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');actor.x=s.v.x;actor.y=s.v.y;
 actor.stats.main.parts={cold:500};s.l.P.freezeRed=50;s.arenaSimulator.setPK(true);
 s.arenaSimulator.tick(.1);advanceSimulator(s,.2);
 assert.ok(s.l.slowT>0);assert.equal(s.l.slowPower,s.CombatEngine.coldSlowPower(500));
 assert.equal(s.l.slowT,s.f8*.5);
 advanceSimulator(s,.4);s.l.slowT=.2;actor.stats.main.parts={cold:100};actor.cooldown=0;
 s.arenaSimulator.tick(.6);advanceSimulator(s,.2);
 assert.equal(s.l.slowT,.2);assert.equal(s.l.slowPower,s.CombatEngine.coldSlowPower(500));
});

test('monster and SIM movement and attack cooldowns use the same cold speed factor',()=>{
 const s=simulatorGame();loadDeclaration(s,'src/client/core/state-and-save-01.js','$d');
 s.q0=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);s.r0[0].anim='monster';
 let moved=0;s.Mw=(_actor,_x,_y,distance)=>moved=distance;
 const monster={x:0,y:0,hp:1000,max:1000,r:17,tid:0,spd:100,reach:40,atkCd:2,cd:1,ar:1};
 s.applyColdSlow(monster,100,2);s.$d(monster,.2);assert.equal(moved,15);assert.equal(monster.atkCd,1.85);
 const actor=s.arenaSimulator.create('wudang');actor.cooldown=2;actor.spd=100;
 s.applyColdSlow(actor,500,2);s.arenaSimulator.setFarm(true);actor.stats.main.rad=10;actor.x=0;actor.y=0;
 s.arenaSimulator.tick(.2);const speed=s.coldSpeedFactor(actor);
 assert.ok(Math.abs(actor.cooldown-(2-.2*speed))<1e-12);assert.ok(Math.abs(moved-20*speed)<1e-12);
});

test('allied cold attacks use resisted cold damage for slow intensity',()=>{
 const s=simulatorGame(),target=s.l.enemies[0];Object.assign(target,{x:550,y:500,hp:10000,max:10000,res:{...target.res,cold:50}});
 Object.assign(s,{H2:()=>1,L:{},jh:1000,_1:()=>[target],q0:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),fB(){},
  queueSkillContact:(_actor,_target,_skill,onHit)=>onHit(target)});
 const ally={x:500,y:500,t:0,hp:1000,hpMax:1000,owner:'ally',pf:{cold:1},dps:100,rt:1,atkT:0,atT:0,se:0,ct:2};
 s.l.allies=[ally];loadDeclaration(s,'src/client/online/party-01.js','Am');s.Am(.1);
 assert.equal(target.slowT,2);assert.equal(target.slowPower,s.CombatEngine.coldSlowPower(50));
});

test('SIM animation follows its cold speed and returns to normal after expiry',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');let elapsed;
 Object.assign(s,{H8:(_actor,dt)=>elapsed=dt,ps(){},M8:()=>true,L3(){},nameplateOffset:()=>55,Jn:1});
 const context={fillStyle:'',beginPath(){},arc(){},fill(){}};
 s.applyColdSlow(actor,100,1);s.arenaSimulator.draw(context,actor,.2);assert.ok(Math.abs(elapsed-.15)<1e-12);
 actor.slowT=0;s.arenaSimulator.draw(context,actor,.2);assert.equal(elapsed,.2);
});

test('native hits hurt at fifteen percent after shields and further damage still lands during hurt',()=>{
 const s=simulatorGame();loadDeclaration(s,'src/client/core/state-and-save-01.js','U9');
 Object.assign(s,{Dw:['phys'],Yr:75,Pe:()=>100});s.l.life=1000;
 const attacker={...s.l.enemies[0],dmg:150,ar:100,series:0};
 s.l.P.sorb=50;s.U9(attacker);assert.equal(s.l.life,925);assert.ok(!(s.v.hurtT>0));
 s.l.P.sorb=0;s.U9(attacker);assert.equal(s.l.life,775);assert.equal(s.v.hurtT,.5);
 attacker.dmg=10;s.U9(attacker);assert.equal(s.l.life,765);assert.equal(s.v.act,'hurt');
 advanceSimulator(s,.52);assert.ok(!(s.v.hurtT>0));
 s.l.P.manaShield=100;s.l.mana=1000;attacker.dmg=200;s.U9(attacker);
 assert.equal(s.l.life,765);assert.ok(!(s.v.hurtT>0));
});

test('real outgoing damage hurts monsters at fifteen percent but poison ticks remain independent',()=>{
 const s=simulatorGame(),monster=s.l.enemies[0];Object.assign(monster,{hp:1000,max:1000,act:'at',animKey:'monster'});
 s.hs({parts:{phys:149},crit:0,series:0,series5:0},monster);assert.ok(!(monster.hurtT>0));
 s.hs({parts:{phys:150},crit:0,series:0,series5:0},monster);assert.equal(monster.hurtT,.5);assert.equal(monster.act,'hurt');
 s.hs({parts:{phys:10},crit:0,series:0,series5:0},monster);assert.equal(monster.hp,691);
 s.hs({parts:{poison:1000},crit:0,series:0,series5:0},monster);assert.equal(monster.hp,691);assert.equal(monster.poison,3);
});

test('SIM PK uses final HP damage for hurt and SIM cannot bypass hurt by switching modes',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');actor.x=s.v.x;actor.y=s.v.y;
 actor.stats.main.parts={phys:200};s.l.P.sorb=50;s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);advanceSimulator(s,.2);
 assert.equal(s.l.life,900);assert.ok(!(s.v.hurtT>0));
 advanceSimulator(s,.4);s.l.P.sorb=0;actor.cooldown=0;s.arenaSimulator.tick(.6);advanceSimulator(s,.2);
 assert.equal(s.l.life,700);assert.ok(s.v.hurtT>0);assert.equal(s.v.act,'hurt');
 const casts=actor.casts;s.applyActorHurt(actor,150,1000);
 s.arenaSimulator.setPK(false);s.arenaSimulator.setFarm(true);s.arenaSimulator.tick(.1);
 assert.equal(actor.casts,casts);assert.equal(actor.act,'hurt');advanceSimulator(s,.52);actor.cooldown=0;s.arenaSimulator.tick(.1);
 assert.equal(actor.casts,casts+1);
});

test('replacing or clearing monsters preserves all SIM identities, profiles, HP and mode settings',()=>{
 const s=simulatorGame(),one=s.arenaSimulator.create('wudang'),two=s.arenaSimulator.create('shaolin');
 s.arenaSimulator.setFarm(true);two.hp=777;const profile=JSON.stringify(two.profile);
 s.combatSandbox.spawnMonsters(1,75,false,145,'normal',1000000);
 assert.equal(s.l.enemies.filter(e=>e.arenaMonster).length,75);assert.equal(s.arenaSimulator.actors.length,2);
 assert.ok(s.l.enemies.includes(one)&&s.l.enemies.includes(two));assert.equal(two.hp,777);assert.equal(two.farm,true);
 assert.equal(JSON.stringify(two.profile),profile);assert.equal(s.arenaSimulator.actor,two);
 s.combatSandbox.tick(.1);assert.equal(s.arenaSimulator.actors.length,2);
 s.combatSandbox.clearCombat();assert.equal(s.l.enemies.length,2);s.combatSandbox.tick(.1);
 assert.equal(s.arenaSimulator.actors.length,2);
});

test('stress creation builds every requested monster synchronously and spreads packs over the viewport',()=>{
 const s=game();s.M0={w:900,h:600};
 s.combatSandbox.spawnMonsters(1,1000,true,145,'normal',10000000);
 assert.equal(s.l.enemies.length,1000);assert.equal(new Set(s.l.enemies.map(e=>e.arenaSlot)).size,1000);
 const xs=s.l.enemies.map(e=>e.x),ys=s.l.enemies.map(e=>e.y);
 assert.ok(Math.max(...xs)-Math.min(...xs)>600);assert.ok(Math.max(...ys)-Math.min(...ys)>300);
 assert.equal(new Set(s.l.enemies.map(e=>`${e.x}:${e.y}`)).size,1000);
 assert.ok(s.l.enemies.every(e=>e.hp===10000000&&e.spd===0&&e.x>=0&&e.x<=1000&&e.y>=0&&e.y<=1000));
 for(const e of s.l.enemies){e.hp=0;e.dead=true;s.cD(e);}s.combatSandbox.tick(3);
 assert.equal(s.l.enemies.length,1000);assert.ok(s.l.enemies.every(e=>e.hp===10000000));
});

test('all four monster health options persist through respawn and restart, and the UI submits exact count and HP',()=>{
 for(const health of [100000,1000000,10000000,100000000]){
  const s=game();s.combatSandbox.spawnMonsters(1,3,true,145,'normal',health);
  assert.ok(s.l.enemies.every(e=>e.hp===health&&e.max===health));
  const dead=s.l.enemies[0];dead.hp=0;dead.dead=true;s.cD(dead);s.combatSandbox.tick(3);
  assert.ok(s.l.enemies.every(e=>e.hp===health));const restored=game(true,s.entries);
  assert.ok(restored.l.enemies.every(e=>e.hp===health));assert.equal(restored.fields.get('#arena-health').value,String(health));
 }
 const s=game(),panel=s.document.createElement('details');
 s.fields.get('#arena-monster').value='1:normal';s.fields.get('#arena-level').value='145';
 s.fields.get('#arena-count').value='125';s.fields.get('#arena-health').value='100000000';panel.querySelector('#arena-still').checked=true;
 panel.onclick({target:{closest:()=>({dataset:{},hasAttribute:attr=>attr==='data-spawn'})}});
 assert.equal(s.l.enemies.length,125);assert.ok(s.l.enemies.every(e=>e.hp===100000000));
});

test('invalid spawn counts and health never silently truncate or erase the current field',()=>{
 const s=game(),before=s.l.enemies;
 for(const count of [0,-1,1.5,NaN,Infinity,10001])assert.throws(()=>s.combatSandbox.spawnMonsters(1,count,false,145,'normal'),/Số lượng/);
 assert.throws(()=>s.combatSandbox.spawnMonsters(1,10,false,145,'normal',123),/Máu quái/);
 assert.equal(s.l.enemies,before);
});

test('arena monsters continuously choose the nearest living player or SIM, excluding dead SIM and ordinary monsters',()=>{
 const s=simulatorGame(),one=s.arenaSimulator.create('wudang'),two=s.arenaSimulator.create('shaolin');
 const monster=s.l.enemies.find(e=>e.arenaMonster);Object.assign(monster,{x:0,y:0});
 Object.assign(s.v,{x:100,y:0});Object.assign(one,{x:30,y:0});Object.assign(two,{x:70,y:0});
 assert.equal(s.combatSandbox.nearestTarget(monster),one);
 one.x=150;assert.equal(s.combatSandbox.nearestTarget(monster),two);
 s.v.x=20;assert.equal(s.combatSandbox.nearestTarget(monster),s.v);
 s.l.life=0;assert.equal(s.combatSandbox.nearestTarget(monster),two);
 two.hp=0;assert.equal(s.combatSandbox.nearestTarget(monster),one);
 one.dead=true;assert.equal(s.combatSandbox.nearestTarget(monster),null);
});

test('native monster AI pursues its nearest SIM and damages it only at physical contact',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang'),monster=s.l.enemies.find(e=>e.arenaMonster);
 loadDeclaration(s,'src/client/core/state-and-save-01.js','$d');
 Object.assign(s,{q0:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),ws:()=>.4});s.r0[monster.tid].anim='monster';
 Object.assign(s.v,{x:400,y:0});Object.assign(actor,{x:40,y:0,r:17});
 Object.assign(monster,{x:0,y:0,r:17,atkCd:0,reach:60,ranged:false,ar:100,cd:1});
 let hits=0;s.arenaSimulator.receiveMonsterHit=(target,attacker)=>{assert.equal(target,actor);assert.equal(attacker,monster);target.hp-=10;hits++;};
 s.$d(monster,.01);assert.equal(hits,0);advanceSimulator(s,.2);assert.equal(hits,1);assert.equal(actor.hp,990);assert.equal(s.l.life,1000);
 actor.x=500;s.v.x=100;monster.castT=0;monster.atkCd=0;s.$d(monster,.01);
 assert.equal(monster.face,1);assert.equal(monster.moving,true);assert.equal(monster.x,100,'native movement now follows the closer player');
});

test('monster hits on SIM reuse real defenses and transfer cold/poison without changing the player context',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');loadDeclaration(s,'src/client/core/state-and-save-01.js','U9');
 Object.assign(s,{Dw:['phys','cold','poison'],Yr:75,Pe:()=>100});
 const attacker={...s.l.enemies.find(e=>e.arenaMonster),hp:100000,max:100000,dmg:100,ar:100,series:0,ranged:true};
 const player=s.o,world=s.l,hero=s.v;actor.stats.sorb=80;
 s.arenaSimulator.receiveMonsterHit(actor,attacker);assert.equal(actor.hp,980);assert.equal(s.l.life,1000);
 actor.stats.sorb=0;attacker.series=1;s.arenaSimulator.receiveMonsterHit(actor,attacker);
 assert.equal(actor.slowT,s.f8);assert.equal(actor.slowPower,.25);assert.ok(!(s.l.slowT>0));
 attacker.series=2;s.arenaSimulator.receiveMonsterHit(actor,attacker);assert.equal(actor.poison,3);assert.equal(actor.poisonDmg,40/3);
 assert.ok(!(s.l.hpDotT>0));assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(s.v,hero);
});

test('arena masters 120/150 for all factions, exposes support info and selects every 150 skill across reloads',()=>{
  const s=game(), manifest=require('../docs/skill_assets_manifest.json');
  for(const faction of Object.keys(s.I)) {
    s.combatSandbox.switchFaction(faction);
    const html=s.fields.get('.arena-skills').innerHTML;
    for(const entry of Object.values(manifest).filter(skill=>skill.faction===faction)) {
      assert.equal(s.o.sk[entry.id],s.T[entry.id].max);
      assert.match(html,new RegExp(`Lv${entry.tier} · ${entry.name}`));
      if(entry.tier===150) {
        s.combatSandbox.selectSkill(entry.id);assert.equal(s.o.main,entry.id);
      } else {
        assert.match(html,new RegExp(`data-skill-info="${entry.id}"`));
        assert.throws(()=>s.combatSandbox.selectSkill(entry.id),/không thuộc/);
      }
    }
  }
  s.combatSandbox.switchFaction('cuiyan');s.combatSandbox.selectSkill(1065);s.$();
  const restored=game(true,s.entries);assert.equal(restored.o.main,1065);assert.equal(restored.o.sk[1065],25);
  assert.equal(restored.o.skPts,s.o.skPts);
});
test('SIM exposes every active 150 skill and includes support 120 in the build table',()=>{
  const s=simulatorGame(),manifest=require('../docs/skill_assets_manifest.json');
  for(const faction of Object.keys(s.I)) {
    s.fields.get('#sim-faction').value=faction;
    s.fields.get('#sim-faction').onchange();
    const menu=s.fields.get('#sim-skill').innerHTML;
    assert.match(menu,/Kỹ năng 150/);
    for(const entry of Object.values(manifest).filter(skill=>skill.faction===faction&&skill.tier===150)) {
      assert.match(menu,new RegExp(`value="${entry.id}"`));
      const actor=s.arenaSimulator.create(faction,entry.id);
      assert.equal(actor.stats.main.id,entry.id);assert.equal(actor.profile.sk[entry.id],25);
      const support=Object.values(manifest).find(skill=>skill.faction===faction&&skill.tier===120);
      assert.match(s.fields.get('#sim-build').innerHTML,new RegExp(`data-skill-level="${support.id}"`));
    }
  }
});

test('SIM health presets stay independent through selection, skills, builds and templates',async()=>{
  const s=simulatorGame(),health=s.fields.get('#sim-health');
  const playerHP=s.l.life;
  const presets=[20000,50000,100000,500000,1000000,10000000,20000000,100000000];
  health.value='20000';
  const one=s.arenaSimulator.create('wudang');
  assert.equal(one.hp,20000);assert.equal(one.stats.life,20000);
  const two=s.arenaSimulator.create('shaolin');
  for(const hp of presets){
    health.value=String(hp);health.onchange();
    assert.equal(two.hp,hp);assert.equal(two.max,hp);assert.equal(two.stats.life,hp);
    assert.equal(one.hp,20000);
  }
  two.hp=two.max/2;
  s.arenaSimulator.selectSkill('basic');
  assert.equal(two.max,100000000);assert.equal(two.hp,50000000);
  s.arenaSimulator.setAttribute('str',two.profile.attr.str+1);
  assert.equal(two.max,100000000);assert.equal(two.hp,50000000);
  s.arenaSimulator.selectActor(one.simId);assert.equal(health.value,'20000');
  s.arenaSimulator.selectActor(two.simId);assert.equal(health.value,'100000000');
  const template=await s.arenaSimulator.saveTemplate('HP 100m');
  const copy=s.arenaSimulator.createFromTemplate(template.id);
  assert.equal(copy.max,100000000);assert.equal(copy.hp,100000000);
  health.value='';health.onchange();assert.equal(copy.max,1000);assert.equal(copy.hp,1000);
  assert.equal(two.max,100000000);assert.equal(s.l.life,playerHP);
  health.value='123';health.onchange();assert.equal(copy.max,1000);
  assert.match(s.fields.get('#sim-status').textContent,/không hợp lệ/);
});
