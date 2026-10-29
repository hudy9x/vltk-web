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
function loadSimulator(s, options) {
  vm.runInContext(compileTypeScriptEntry('simulator/runtime.ts','SimulatorRuntime').code,s);
  // The fixture has always used a cheap allocator; exercise the real worker separately.
  s.arenaSimulator=s.SimulatorRuntime.createSimulator(options || {optimize:(profile,autoSkills,autoPotential)=>({attr:{...profile.attr,str:profile.attr.str+(autoPotential?profile.attrPts:0)},attrPts:autoPotential?0:profile.attrPts,sk:profile.sk,skL:profile.skL,skPts:autoSkills?0:profile.skPts})});
}
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
    originalDamage:0, U9:attacker=>{s.originalDamage++;return s.nativeIncoming?.(attacker);}, $A(){},$:()=>{},
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

function simulatorGame(entries, arena=true, nativeMonsters=false, options) {
  const s=game(arena,entries), fields=s.fields;
  s.Math=Object.create(Math);s.Math.random=()=>.5;
  const element=()=>({value:'',checked:false,hidden:false,style:{},attributes:{},listeners:{},
    setAttribute(key,value){this.attributes[key]=value;},addEventListener(key,fn){this.listeners[key]=fn;},
    focus(){this.focused=true;},querySelectorAll:()=>[],querySelector:id=>field(id)});
  function field(id){if(!fields.has(id))fields.set(id,element());return fields.get(id);}
  s.simNodes=[];s.simListeners={};
  s.gmToggle=element();s.gmToggle.id='gm-toggle';s.gmPanel=element();s.gmPanel.id='gm-panel';
  s.document.createElement=element;
  s.document.getElementById=id=>[...s.simNodes,s.gmToggle,s.gmPanel].find(node=>node.id===id)||null;
  s.document.addEventListener=(key,fn)=>{const previous=s.simListeners[key];s.simListeners[key]=event=>{previous?.(event);fn(event);};};
  s.document.body.appendChild=node=>s.simNodes.push(node);
  Object.assign(s, { S:{potions:[]}, Z:()=>1, E:(x,lo,hi)=>Math.max(lo,Math.min(hi,x)), y1:()=>false, cw:75,
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
  s.l.enemies ||= [];
  s.l.P=s.j0();for(const enemy of s.l.enemies)Object.assign(enemy,{n:"Quái",res:s.l.P.res,def:0,series:0,act:"at"});s.l.life=1000;s.l.mana=100;s.l.zoneShown=1;s.l.quiet=false;
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/client/ui/combat-log-01.js'),'utf8'),s);
  if (nativeMonsters) loadDeclaration(s,'src/client/core/state-and-save-01.js','$d');
  loadSimulator(s, options);
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
function advanceSimulator(s, duration=.6) {for(let t=0;t<duration;t+=.02)s.advanceSkillContacts(.02);}
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
  advanceSimulator(s,.5);const pending=s.l.combatProjectiles[0];assert.ok(pending);
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
  advanceSimulator(s,.5);const pending=s.l.combatProjectiles[0];s.arenaSimulator.remove();
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
  const s=simulatorGame(undefined,true,false,{optimize(){throw new Error('allocation failed');}}),player=s.o,world=s.l,hero=s.v;
  assert.throws(()=>s.arenaSimulator.create('wudang','basic',true,false),/allocation failed/);
  assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(s.v,hero);
});
test('production initializes Tống Kim without Arena Test profiles or SIM tools',()=>{
  const s=simulatorGame(undefined,false);
  assert.equal(s.combatSandbox,null);
  assert.ok(s.arenaSimulator);
  assert.equal(s.entries.has('jxidle_arena_profiles'),false);
  assert.equal(s.simNodes.some(node=>['sim-panel','sim-toggle','combat-sandbox'].includes(node.id)),false);
  s.U9({n:'Quái',dmg:20});assert.equal(s.originalDamage,1);
  assert.equal(s.arenaSimulator.events.length,0);
  s.arenaSimulator.openSettings();
  assert.equal(s.simNodes.find(node=>node.id==='battlefield-panel').hidden,false);
});

test('production can initialize before the player selects a faction or has combat stats',()=>{
  const s=simulatorGame(undefined,false);
  s.o.fac=null;s.l.P=null;
  loadSimulator(s);
  assert.ok(s.arenaSimulator);
  assert.equal(s.arenaSimulator.battlefield.active,false);
  assert.equal(s.o.fac,null);assert.equal(s.l.P,null);
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
    advanceSimulator(s,.5);assert.equal(s.l.combatProjectiles[0].combat.skill.id,id);
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
  advanceSimulator(s,.5);const pending=s.l.combatProjectiles[0],hp=monster.hp;
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
  advanceSimulator(s,.5);const twoCast=s.l.combatProjectiles.find(effect=>effect.combat.actor===two);
  s.arenaSimulator.remove(one);
  assert.equal(s.arenaSimulator.actors.length,1);assert.equal(s.arenaSimulator.actor,two);
  assert.ok(s.l.combatProjectiles.includes(twoCast));
  const before=s.l.life;twoCast.combat.onHit(s.v);assert.ok(s.l.life<before);
});
test('toggling PK on one SIM invalidates only its own cast and does not alter another SIM',()=>{
  const s=simulatorGame(),one=s.arenaSimulator.create('wudang');s.arenaSimulator.setPK(true);
  const two=s.arenaSimulator.create('wudang');s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);
  advanceSimulator(s,.5);const a=s.l.combatProjectiles.find(effect=>effect.combat.actor===one),b=s.l.combatProjectiles.find(effect=>effect.combat.actor===two);
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
 s.l.P.sorb=80;s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);advanceSimulator(s,.6);
 assert.equal(s.l.life,980);assert.ok(!(s.v.hurtT>0),'100 raw but 20 actual damage is below 5%');
 advanceSimulator(s,.4);s.l.P.sorb=0;actor.cooldown=0;s.arenaSimulator.tick(.6);advanceSimulator(s,.6);
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
 s.arenaSimulator.tick(.1);advanceSimulator(s,.6);
 assert.ok(s.l.slowT>0);assert.equal(s.l.slowPower,s.CombatEngine.coldSlowPower(500));
 assert.equal(s.l.slowT,s.f8*.5);
 advanceSimulator(s,.4);s.l.slowT=.2;actor.stats.main.parts={cold:100};actor.cooldown=0;
 s.arenaSimulator.tick(.6);advanceSimulator(s,.6);
 assert.equal(s.l.slowT,.2);assert.equal(s.l.slowPower,s.CombatEngine.coldSlowPower(500));
});

test('monster and SIM movement uses final speed phases while cooldowns count real seconds',()=>{
 const s=simulatorGame();loadDeclaration(s,'src/client/core/state-and-save-01.js','$d');
 s.q0=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);s.r0[0].anim='monster';
 let moved=0;s.Mw=(_actor,_x,_y,distance)=>moved=distance;
 const monster={x:0,y:0,hp:1000,max:1000,r:17,tid:0,spd:100,reach:40,atkCd:2,cd:1,ar:1};
 s.applyColdSlow(monster,100,2);s.$d(monster,.2);assert.equal(moved,15);assert.equal(monster.atkCd,1.8);
 const actor=s.arenaSimulator.create('wudang');actor.cooldown=2;actor.spd=100;
 s.applyColdSlow(actor,500,2);s.arenaSimulator.setFarm(true);actor.stats.main.rad=10;actor.x=0;actor.y=0;
 s.arenaSimulator.tick(.2);const speed=s.coldSpeedFactor(actor);
 assert.ok(Math.abs(actor.cooldown-1.8)<1e-12);assert.ok(Math.abs(moved-20*s.actorRunSpeed(actor))<1e-12);
});

test('distance scale reaches native monster pursuit and SIM movement without accelerating cooldowns',()=>{
 for(const scale of [1,1.3]) {
  const s=simulatorGame();loadDeclaration(s,'src/client/core/state-and-save-01.js','$d');
  s.CombatEngine.SPEED_CONFIG.run.distanceScale=scale;
  s.q0=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);s.r0[0].anim='monster';
  let moved=0;s.Mw=(_actor,_x,_y,distance)=>moved=distance;
  const monster={x:0,y:0,hp:1000,max:1000,r:17,tid:0,spd:100,reach:40,atkCd:2,cd:1,ar:1};
  s.$d(monster,.2);assert.ok(Math.abs(moved-20*scale)<1e-12);assert.equal(monster.atkCd,1.8);
  const actor=s.arenaSimulator.create('wudang');actor.cooldown=2;
  s.arenaSimulator.setFarm(true);actor.stats.main.rad=10;actor.x=0;actor.y=0;
  s.arenaSimulator.tick(.2);
  assert.ok(Math.abs(moved-20*s.actorRunSpeed(actor)*scale)<1e-12);
  assert.ok(Math.abs(actor.cooldown-1.8)<1e-12);
 }
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
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');
 Object.assign(s,{ws:()=>.4,M8:()=>true,L3(){},nameplateOffset:()=>55,Jn:1});
 for(const name of ['H8','ps'])loadDeclaration(s,'src/client/render/arena-01.js',name);
 Object.assign(actor,{moving:true,act:'run',actT:0});
 const context={fillStyle:'',beginPath(){},arc(){},fill(){}};
 s.applyColdSlow(actor,100,1);s.arenaSimulator.draw(context,actor,.2);assert.ok(Math.abs(actor.actT-.15)<1e-12);
 actor.slowT=0;s.arenaSimulator.draw(context,actor,.2);assert.ok(Math.abs(actor.actT-.35)<1e-12);
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
 actor.stats.main.parts={phys:200};s.l.P.sorb=50;s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);advanceSimulator(s,.6);
 assert.equal(s.l.life,900);assert.ok(!(s.v.hurtT>0));
 advanceSimulator(s,.4);s.l.P.sorb=0;actor.cooldown=0;s.arenaSimulator.tick(.6);advanceSimulator(s,.6);
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
 s.$d(monster,.01);assert.equal(hits,0);advanceSimulator(s,1.1);assert.equal(hits,1);assert.equal(actor.hp,990);assert.equal(s.l.life,1000);
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

test('cold skill hits slow a moving SIM without hurt locks, while physical hits still interrupt',()=>{
 for(const cold of [false,true]){
  const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');
  actor.moving=true;actor.mv=true;actor.act='run';
  s.hs({parts:cold?{cold:200}:{phys:200},crit:0,series:0,series5:0},actor);
  assert.ok(actor.hp<850);
  assert.equal(s.actorActionLocked(actor),!cold);
  assert.equal(actor.moving,cold);
  if(cold){assert.ok(s.coldSpeedFactor(actor)>0&&s.coldSpeedFactor(actor)<1);assert.equal(actor.act,'run');}
 }
});

test('native cold hits preserve player movement and destination even above the hurt threshold',()=>{
 const s=simulatorGame();loadDeclaration(s,'src/client/core/state-and-save-01.js','U9');
 Object.assign(s,{Dw:['cold'],Yr:75,Pe:()=>100});
 const destination={x:900,y:500};s.Y={target:destination,mouse:true};s.l.moveTo=destination;s.v.moving=true;
 s.U9({hp:10000,max:10000,dmg:200,ar:100,series:0,ranged:true});
 assert.equal(s.l.life,800);assert.ok(s.l.slowT>0);
 assert.equal(s.actorActionLocked(s.v),false);assert.equal(s.v.moving,true);
 assert.equal(s.Y.target,destination);assert.equal(s.l.moveTo,destination);
 const navigation=require('./helpers/maps-engine').loadMapsEngine(s).createNavigationRuntime(a=>s.actorActionLocked(a));
 Object.assign(s,{Ra:()=>s.actorRunSpeed(s.v),H5:(x,y)=>[x,y],Qv:()=>[1,0],hA:()=>false,gt:navigation.tryMove});
 loadDeclaration(s,'src/client/ui/legacy-panels-and-audio-03.js','Ah');
 const start=s.v.x,speed=s.actorRunSpeed(s.v);
 for(let frame=0;frame<144;frame++)assert.equal(s.Ah(1/144),true);
 assert.ok(Math.abs(s.v.x-start-150*speed)<1e-8,'cold movement stays continuous even at 144 FPS');
});

test('SIM cold PK leaves player free to move and retains its movement destination',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');
 actor.x=s.v.x;actor.y=s.v.y;actor.stats.main.parts={cold:200};s.arenaSimulator.setPK(true);
 const destination={x:900,y:500};s.Y={target:destination,mouse:true};s.l.moveTo=destination;s.v.moving=true;
 s.arenaSimulator.tick(.01);advanceSimulator(s,.6);
 assert.ok(s.l.life<=800);assert.ok(s.l.slowT>0);assert.equal(s.actorActionLocked(s.v),false);
 assert.equal(s.Y.target,destination);assert.equal(s.l.moveTo,destination);
});

function battlefieldGame(arena=true, nativeMonsters=false, options) {
  const s=simulatorGame(undefined,arena,nativeMonsters,options);
  if (!arena) s.o=Object.assign(s.I3(),{name:'Production hero',fac:'wudang',lvl:90,main:'basic',ctrl:'manual'});
  const catalog={};catalog.window=catalog;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'public/data.js'),'utf8'),catalog);
  s.S=catalog.JX; s.m=()=>null;
  const sprites={MapsEngine:{createLegacyCatalog:()=>({})}};sprites.window=sprites;
  for(let i=1;i<=4;i++)vm.runInNewContext(fs.readFileSync(path.join(ROOT,`src/client/data/monsters-and-zones-0${i}.js`),'utf8'),sprites);
  s.r0={...sprites.JW.mon,...s.r0};
  for (const name of ['G5','V2']) loadDeclaration(s,'src/client/combat/skills-01.js',name);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/client/gameplay/equipment-trader-01.js'),'utf8'),s);
  Object.assign(s, {MapsEngine:{getMapBackground:()=> 'battle-ground'}, Z0:{g:false,key:2},
    ma:id=>{s.Z0.key=id;}, j2:id=>id===0?3:2, Kr:()=>[0,0],
    _A:(d,k,lvl,rarity)=>({d,k,lvl,r:rarity,n:`Item ${d}`,base:[],req:[],mag:[]}),
  });
  s.bA=path=>({path});
  return s;
}
test('Tống Kim runtime enters a new map, generates equipped armies and restores player field on exit',()=>{
  const s=battlefieldGame(), match=s.arenaSimulator.battlefield, player=s.o, hero=s.v;
  const old={x:hero.x,y:hero.y,life:s.l.life};
  match.start('song');s.arenaSimulator.tick(5);
  assert.equal(s.Z0.key,9003);assert.equal(s.l.battlefield,true);assert.equal(s.l.zoneShown,9003);
  const [sim]=match.add({team:'song',faction:'wudang',level:90,strength:'strong',count:1});
  assert.equal(sim.profile.lvl,90);assert.ok(sim.profile.eq.armor);assert.ok(sim.profile.eq.weapon);
  assert.equal(sim.profile.eq.armor.enh,8);assert.equal(sim.profile.eq.armor.r,1);assert.equal(sim.profile.eq.armor.mag.length,5);
  assert.equal(s.o,player);assert.equal(s.v,hero);assert.equal(s.o.lvl,150);
  const [weak]=match.add({team:'jin',faction:'gaibang',level:50,strength:'weak',count:1,equipped:false});
  assert.equal(Object.keys(weak.profile.eq).length,0);
  assert.ok(Object.keys(weak.profile.sk).every(id=>(s.T[id].req||0)<=50));
  match.reset();assert.equal(s.Z0.key,2);assert.equal(s.l.battlefield,false);
  assert.equal(hero.x,old.x);assert.equal(hero.y,old.y);assert.equal(s.l.life,old.life);
  assert.equal(s.arenaSimulator.actors.length,0);
});
test('production recruitment NPC works on arbitrary maps and the game loop advances and restores the battle',()=>{
  const s=battlefieldGame(false), match=s.arenaSimulator.battlefield;
  const npc={npcId:'tongkim',position:{x:345,y:678}};
  Object.assign(s.MapsEngine,{
    npcCatalog:[{name:'Chiêu Mộ Sứ'}],
    getMap:id=>({id,npcs:[npc]}),mapNpcs:map=>map.npcs,
    getNpc:()=>({name:'Chiêu Mộ Sứ',subtitle:'Tống Kim',animation:'enemy050'}),
  });
  for(const mapId of [37,12345]) {
    s.Z0.key=mapId;s.l.town=mapId===37;
    Object.assign(s.v,{x:456,y:789});s.l.life=321;s.l.mana=42;
    const before=JSON.stringify(s.o), panel=s.simNodes.find(node=>node.id==='battlefield-panel');
    const [recruiter]=s.equipmentTrader.entities();
    assert.equal(recruiter.name,'Chiêu Mộ Sứ');assert.equal(recruiter.x,345);
    recruiter.onInteract();assert.equal(panel.hidden,false);
    s.fields.get('#battlefield-player').value='song';
    s.fields.get('#battlefield-map').value='9003';
    s.fields.get('#battlefield-start').onclick();
    assert.equal(match.running,true,s.fields.get('#battlefield-status')?.textContent);
    assert.equal(s.Z0.key,9003);
    Object.assign(s,{$w(){},Sb(){},advanceSkillContacts(){throw new Error('after-runtime-tick');}});
    s.l.sweepT=0;s.l.dirty=false;
    loadDeclaration(s,'src/client/core/state-and-save-02.js','Td');
    assert.throws(()=>s.Td(5),/after-runtime-tick/);
    assert.equal(match.state.elapsed,5);
    assert.ok(s.arenaSimulator.roadMonsters.actors.length>0);
    const [fighter]=match.add({team:'jin',faction:'gaibang',level:90,strength:'normal',count:1});
    assert.equal(fighter.profile.fac,'gaibang');assert.ok(fighter.profile.eq.weapon);
    match.reset();
    assert.equal(s.Z0.key,mapId);assert.equal(s.v.x,456);assert.equal(s.v.y,789);
    assert.equal(s.l.life,321);assert.equal(s.l.mana,42);assert.equal(JSON.stringify(s.o),before);
    assert.equal(s.combatSandbox,null);
  }
});
test('Hoàng Kim boss decks include active 90 and 150 skills from both same-element factions',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;
  for(let element=0;element<5;element++) {
    match.start('song',{song:element,jin:element});match.tick(600);
    const bosses=s.arenaSimulator.actors.filter(actor=>actor.battlefieldBoss);
    assert.equal(bosses.length,2);
    for(const boss of bosses) {
      assert.equal(boss.goldBoss,true);assert.equal(boss.cls,'boss');assert.equal(boss.series,element);
      assert.equal(boss.max,200_000);
      const deck=boss.battlefieldDeck;
      assert.ok(deck.length>=2);
      const factions=new Set(deck.map(entry=>entry.profile.fac));assert.equal(factions.size,2);
      for(const faction of factions) for(const tier of [90,150]) {
        assert.ok(deck.some(entry=>entry.profile.fac===faction && s.T[entry.profile.main].tier===tier),`${element}/${faction}/${tier}`);
      }
    }
  }
});
test('Tống Kim player attacks reject allies and boss effective resistance survives penetration and elemental break',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);match.tick(600);
  const [ally]=match.add({team:'song',faction:'wudang',level:150,strength:'normal',count:1});
  const skill={...s.l.P.main,parts:{phys:100},series:0,series5:0};
  const before=ally.hp;s.hs(skill,ally);assert.equal(ally.hp,before);
  const boss=s.arenaSimulator.actors.find(actor=>actor.battlefieldBoss&&actor.battlefieldTeam==='jin');
  s.l.P.series5=0;s.l.P.anti={phys:100};s.l.P.antiMax=100;boss.resBrkT=3;
  s.y1=(a,b)=>a===0&&b===boss.series;
  const hp=boss.hp;s.hs({...skill,series5:100},boss);
  assert.ok(Math.abs(hp-boss.hp-60)<.001,'50% effective resistance before the existing 1.2 elemental multiplier');
  assert.equal(s.l.P.anti.phys,100);assert.equal(boss.resBrkT,3);
  s.Rn=()=>({res:{phys:-40}});const cursedHP=boss.hp;s.hs({...skill,series5:100},boss);
  assert.ok(Math.abs(cursedHP-boss.hp-60)<.001,'curse cannot lower the effective resistance floor');
  loadDeclaration(s,'src/client/core/state-and-save-02.js','_1');
  assert.ok(!s._1().includes(ally));assert.ok(s._1().includes(boss));
});
test('Tống Kim SIMs fight the opposing side, cancel old contacts on death and continue while player respawns',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const [song]=match.add({team:'song',faction:'wudang',level:150,strength:'normal',count:1});
  const [jin]=match.add({team:'jin',faction:'gaibang',level:150,strength:'normal',count:1});
  song.x=jin.x=s.v.x=1700;song.y=jin.y=s.v.y=1700;
  s.arenaSimulator.tick(.1);advanceSimulator(s,.5);const pending=s.l.combatProjectiles.find(e=>e.combat.actor===song);assert.ok(pending);
  const hp=jin.hp;advanceSimulator(s);assert.ok(jin.hp<hp);
  s.l.life=0;match.playerDied();assert.equal(s.l.deadT,30);
  song.cooldown=0;const before=jin.hp;s.arenaSimulator.tick(.1);advanceSimulator(s);assert.ok(jin.hp<before);
  song.hp=0;s.arenaSimulator.tick(.1);assert.equal(song.dead,true);assert.ok(s.arenaSimulator.actors.includes(song));
  const after=jin.hp;pending.combat.onHit(jin);assert.equal(jin.hp,after);
  s.arenaSimulator.tick(30);assert.equal(song.dead,false);assert.equal(song.hp,song.max);
  assert.equal(s.l.deadT,0);assert.equal(s.v.x,match.state.camps.song.x);assert.equal(s.v.y,match.state.camps.song.y);
});

test('Tống Kim bosses actually rotate both factions 90/150 casts with boss HP in each captured loadout',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.combatLog.simulatorLog.enabled=true;s.arenaSimulator.tick(5);match.tick(600);
  const boss=s.arenaSimulator.actors.find(actor=>actor.battlefieldBoss&&actor.battlefieldTeam==='song');
  const [target]=match.add({team:'jin',faction:'wudang',level:150,strength:'normal',count:1});
  target.hp=target.max=1_000_000_000;target.x=boss.x+10;target.y=boss.y;
  const seen=new Set();
  for(let i=0;i<80;i++) {s.arenaSimulator.tick(.1);advanceSimulator(s,.1);if(boss.lastCast)seen.add(+boss.lastCast.id);}
  for(const faction of ['gaibang','tianren']) for(const tier of [90,150]) {
    assert.ok([...seen].some(id=>s.I[faction].skills.includes(id)&&s.T[id].tier===tier),`${faction} ${tier} was cast`);
  }
  assert.ok(boss.casts>=4);assert.ok(target.hp<target.max);
  const event=s.arenaSimulator.events.find(event=>event.simId===boss.simId&&event.steps.some(step=>step.values.stats));
  assert.ok(event);assert.equal(event.steps.find(step=>step.values.stats).values.stats.life,boss.max);
});

test('lethal Tống Kim PK immediately enters the player respawn state before normal regeneration can revive them',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const [enemy]=match.add({team:'jin',faction:'gaibang',level:150,strength:'normal',count:1});
  s.v.x += 100; enemy.x=s.v.x;enemy.y=s.v.y;s.l.life=1;
  s.arenaSimulator.tick(.1);advanceSimulator(s);
  assert.equal(s.l.life,0);assert.ok(s.l.deadT>0);assert.equal(match.state.score.jin,150);
  assert.equal(match.canHit(enemy,s.v),false);
});

test('Tống Kim synchronous secondary skills resolve against the real player even inside a SIM visual context',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const [enemy]=match.add({team:'jin',faction:'gaibang',level:150,strength:'normal',count:1});
  const player=s.v,world=s.l;player.x+=100;enemy.x=player.x;enemy.y=player.y;
  for(const actor of s.arenaSimulator.actors)if(actor.battlefieldBoss)actor.cooldown=99999;
  s.F5=()=>[{sid:1}];
  let secondary=0;
  s.eD=(skill,target,targets,collided,event,context)=>{
    if(target===player) {secondary++;context.hit({...skill,ev2:true},player);}
  };
  const before=world.life;s.arenaSimulator.tick(.1);advanceSimulator(s);
  assert.equal(secondary,1);assert.equal(world.life,before-200*s.arenaSimulator.pvpDamageScale(enemy,player));
  assert.equal(s.l,world);assert.equal(s.v,player);assert.equal(enemy.hp,enemy.max);
});

test('Tống Kim percentage roster creates exact factions and every equipped item has five valid lines with active support elements',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const player=s.o,oldEq=JSON.stringify(player.eq), oldAttr=JSON.stringify(player.attr);
  const composition=Object.fromEntries(Object.keys(s.I).map(key=>[key,10]));
  const army=match.add({team:'song',faction:'shaolin',composition,level:150,strength:'normal',count:20,equipped:true});
  assert.equal(army.length,20);
  for(const faction of Object.keys(s.I)) assert.equal(army.filter(actor=>actor.profile.fac===faction).length,2);
  for(const actor of army) {
    const eq=actor.profile.eq; assert.equal(Object.keys(eq).length,11);
    assert.equal(eq.horse.d,10); // Native horse is separate from the ten five-line armor/weapon slots.
    assert.equal(actor.profile.skPts,0);assert.equal(actor.profile.attrPts,0);
    for(const [slot,item] of Object.entries(eq).filter(([slot])=>slot!=="horse")) {
      assert.equal(item.lvl,10);assert.equal(item.r,1);assert.equal(item.mag.length,5);
      assert.equal(new Set(item.mag.map(line=>line.a)).size,5);
      for(let i=0;i<5;i++) assert.ok(s.equipmentTrader.affixes(item,item.s,i).some(entry=>entry.a===item.mag[i].a));
      for(const support of s.G5[slot]) assert.equal(s.V2[eq[support].s],item.s);
    }
  }
  assert.equal(JSON.stringify(player.eq),oldEq);assert.equal(JSON.stringify(player.attr),oldAttr);
  const count=s.arenaSimulator.actors.length;
  assert.throws(()=>match.add({team:'jin',faction:'shaolin',composition:{emei:99},level:150,strength:'normal',count:10}),/100%/);
  assert.equal(s.arenaSimulator.actors.length,count);
  assert.throws(()=>match.add({team:'jin',faction:'shaolin',level:1,strength:'normal',count:1,equipped:true}),/chưa đủ/);
  assert.equal(s.arenaSimulator.actors.length,count);
});

test('SIM renderer uses each own profile and equipment instead of the current player outfit',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const [actor]=match.add({team:'song',faction:'wudang',level:150,strength:'normal',count:1});
  const player=s.o,world=s.l;world.look={owner:'player'};world.jx={owner:'player'};
  actor.look={anim:'own-actor'};
  s.yf=()=>({owner:s.o.fac});s.J3=()=>true;s.N8=()=>({weapon:s.o.eq.weapon});
  s.H8=()=>{};s.ps=()=>{};s.L3=()=>{};s.nameplateOffset=()=>55;s.Jn=1;
  s.kf=()=>{assert.equal(s.o,actor.profile);assert.equal(s.l.look.owner,'wudang');assert.equal(s.l.jx.weapon,actor.profile.eq.weapon);return 80;};
  s.arenaSimulator.draw({},actor,.01);
  assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(world.look.owner,'player');
});

test('Tống Kim road monsters join real combat targets, can damage SIMs, respawn and disappear on exit',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const monsters=s.l.enemies.filter(actor=>actor.battlefieldMonster);
  assert.equal(monsters.length,70);assert.equal(match.state.monsters.alive,70);
  assert.ok(s.combatSandbox.nearestTarget(monsters[0])?.battlefieldTeam!==monsters[0].battlefieldTeam,'soldiers acquire hostile soldiers across the wider lane');
  for(const monster of monsters)Object.assign(monster,{res:{...s.l.P.res},def:0,series:0,act:'st'});
  const [sim]=match.add({team:'song',faction:'wudang',level:150,strength:'normal',count:1});
  const monster=monsters.find(actor=>actor.battlefieldTeam==='jin');sim.x=monster.x;sim.y=monster.y;
  assert.equal(s.combatSandbox.nearestTarget(monster),sim);
  assert.equal(match.canHit(s.v,monster),true);assert.ok(match.targets(sim).includes(monster));
  const hp=monster.hp;s.arenaSimulator.tick(.1);advanceSimulator(s);assert.ok(monster.hp<hp,'SIM skills hurt neutral monsters');
  const before=sim.hp;s.nativeIncoming=attacker=>{s.l.life=Math.max(0,s.l.life-attacker.dmg);};s.arenaSimulator.receiveMonsterHit(sim,monster);assert.equal(sim.hp,Math.max(0,before-monster.nativeDamage),'native damage is forwarded instead of forcing one HP');
  monster.hp=0;s.arenaSimulator.tick(.01);assert.equal(match.state.monsters.alive,69);
  s.arenaSimulator.tick(20);assert.equal(match.state.monsters.alive,70);
  assert.ok(!s.l.enemies.includes(monster));
  match.reset();assert.equal(s.l.enemies.filter(actor=>actor.battlefieldMonster).length,0);assert.equal(match.state.monsters.count,0);
});

test('Vô Hình Độc only poisons opposing SIMs and enemy soldiers, preserving allies and allied bosses for either player team',()=>{
  for(const side of ['song','jin']) {
    const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start(side);s.arenaSimulator.tick(5);match.tick(600);
    const other=side==='song'?'jin':'song';
    const [ally]=match.add({team:side,faction:'wudu',level:150,strength:'normal',count:1});
    const [enemy]=match.add({team:other,faction:'gaibang',level:150,strength:'normal',count:1});
    const friendlyBoss=s.arenaSimulator.actors.find(actor=>actor.battlefieldBoss&&actor.battlefieldTeam===side);
    const hostileBoss=s.arenaSimulator.actors.find(actor=>actor.battlefieldBoss&&actor.battlefieldTeam===other);
    const monster=s.l.enemies.find(actor=>actor.battlefieldMonster&&actor.battlefieldTeam===other);
    Object.assign(monster,{res:{...s.l.P.res},def:0,series:0});
    for(const actor of [ally,enemy,friendlyBoss,hostileBoss,monster]) Object.assign(actor,{x:s.v.x+40,y:s.v.y,cooldown:9999});
    s.o.fac='wudu';s.o.sk[69]=1;
    Object.assign(s,{Yn:{69:{el:'poison',every:10/18,rad:180}},y4:{},zi:()=>1,i6:()=>90,F0:()=>1,
      q0:(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*2)/s.QA});
    loadDeclaration(s,'src/client/core/state-and-save-02.js','_1');
    loadDeclaration(s,'src/client/gameplay/shop-and-books-01.js','b7');
    const allyHP=ally.hp,bossHP=friendlyBoss.hp,enemyHP=enemy.hp;
    for(let pulse=0;pulse<3;pulse++) {
      s.b7(69,.6);
      assert.ok(!(ally.poison>0),`${side}: allied SIM must never receive poison`);
      assert.ok(!(friendlyBoss.poison>0),`${side}: allied boss must never receive poison`);
      assert.ok(enemy.poison>0);assert.ok(hostileBoss.poison>0);assert.ok(monster.poison>0);
      s.arenaSimulator.tick(.1);
    }
    assert.equal(ally.hp,allyHP);assert.equal(friendlyBoss.hp,bossHP);assert.ok(enemy.hp<enemyHP);
    // A finished match must not admit any new aura poison, either.
    match.tick(1200);
    enemy.poison=monster.poison=0;s.b7(69,.6);
    assert.equal(enemy.poison,0);assert.equal(monster.poison,0);
  }
});

test('Tống Kim soldiers have curated team skins, reject allied hits, and hostile SIMs switch to the player first',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const soldiers=s.l.enemies.filter(actor=>actor.battlefieldMonster),song=soldiers.filter(actor=>actor.battlefieldTeam==='song'),jin=soldiers.filter(actor=>actor.battlefieldTeam==='jin');
 assert.equal(song.length,35);assert.equal(jin.length,35);
 for(const units of [song,jin])assert.ok(units.every(actor=>[599,588,597,600,598,595,589].includes(actor.tid)));
 const health=s.l.life;s.U9(song[0]);assert.equal(s.l.life,health);
 Object.assign(song[0],{res:{...s.l.P.res},def:0,series:0});const hp=song[0].hp;s.hs({parts:{phys:100},crit:0,series:0,series5:0},song[0]);assert.equal(song[0].hp,hp);
 const [ally]=match.add({team:'song',faction:'wudang',level:150,strength:'normal',count:1}),[opponent]=match.add({team:'jin',faction:'gaibang',level:150,strength:'normal',count:1});
 opponent.x=s.v.x+200;opponent.y=s.v.y;ally.x=opponent.x+1;ally.y=opponent.y;
 opponent.target=ally;s.arenaSimulator.tick(.1);assert.equal(opponent.target,s.v,'player wins over a closer SIM target');
 s.l.life=0;match.playerDied();s.arenaSimulator.tick(.1);assert.notEqual(opponent.target,s.v,'dead player is not pursued');
});

test('Tống Kim player soldier kills grant merit and collectible pills; allied poison never grants credit',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;s.INV_MAX=60;match.start('song');s.arenaSimulator.tick(5);s.Math.random=()=>.01;
 const enemy=s.l.enemies.find(actor=>actor.battlefieldMonster&&actor.battlefieldTeam==='jin');Object.assign(enemy,{x:s.v.x+20,y:s.v.y,res:{...s.l.P.res},def:0,series:0,hp:50});
 s.hs({parts:{phys:100},crit:0,series:0,series5:0},enemy);s.arenaSimulator.tick(.1);
 assert.equal(s.arenaSimulator.warRewards.state.points,50);assert.equal(s.arenaSimulator.warRewards.drops.length,1);
 s.arenaSimulator.tick(.1);assert.equal(s.arenaSimulator.warRewards.state.inventory.resistance,1);
 s.arenaSimulator.warRewards.use('resistance');const p={res:{phys:0,cold:0,fire:0,poison:0,light:0}};s.arenaSimulator.applyBattlefieldBonuses(p);assert.equal(p.res.phys,20);
 match.reset();assert.equal(s.arenaSimulator.warRewards.state.points,0);assert.equal(s.arenaSimulator.warRewards.state.inventory.resistance,0);
});

test('native soldier contacts damage only opposing soldiers through the shared contact engine',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const soldiers=s.l.enemies.filter(actor=>actor.battlefieldMonster),attacker=soldiers.find(actor=>actor.battlefieldTeam==='song'),target=soldiers.find(actor=>actor.battlefieldTeam==='jin'),friendly=soldiers.filter(actor=>actor.battlefieldTeam==='song')[1];
 for(const actor of [attacker,target,friendly])Object.assign(actor,{x:1200,y:1792,res:{...s.l.P.res},def:0,series:0,stun:0,slowT:0,poison:0,poisonDmg:0,r:17,atkCd:0,cd:1,ar:99999,dmg:100});
 for(const name of ['b5','lw'])loadDeclaration(s,'src/client/core/helpers-and-config-01.js',name);attacker.battlefieldHome={x:1200,y:1792};friendly.x=1190;s.q0=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*2)/s.QA;
 loadDeclaration(s,'src/client/core/state-and-save-01.js','$d');
 const before=target.hp,allyHP=friendly.hp;s.$d(attacker,.1);advanceSimulator(s,1.1);
 assert.ok(target.hp<before);assert.equal(friendly.hp,allyHP);
 s.arenaSimulator.receiveSoldierHit(friendly,attacker);assert.equal(friendly.hp,allyHP);
});

test('Tống Kim soldiers use rank-specific HP and respect each configured home leash',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const soldier=s.l.enemies.find(actor=>actor.battlefieldMonster&&actor.battlefieldTeam==='jin');
 for(const actor of s.l.enemies.filter(actor=>actor.battlefieldMonster)) { const expected={'Binh sĩ':50000,'Hiệu úy':60000,'Thống lĩnh':80000,'Phó tướng':100000,'Đại tướng':120000}[actor.battlefieldRank]; assert.equal(actor.hp,expected);assert.equal(actor.max,expected); }
 for(const other of s.l.enemies.filter(actor=>actor.battlefieldMonster&&actor!==soldier)) other.dead=true;
 const [enemy]=match.add({team:'song',faction:'wudang',level:150,strength:'normal',count:1});
 soldier.x-=100;enemy.x=soldier.x-200;enemy.y=soldier.y;
 assert.equal(s.combatSandbox.nearestTarget(soldier),enemy,'soldier acquires enemies within its home leash');
 enemy.x=soldier.x-1201;assert.equal(s.combatSandbox.nearestTarget(soldier),null,'detection range remains bounded');
 soldier.x=soldier.battlefieldHome.x-soldier.battlefieldLeashRadius-1;enemy.x=soldier.x;
 assert.equal(s.combatSandbox.nearestTarget(soldier),null,'stop attacking beyond new leash');
 s.arenaSimulator.tick(.01);assert.equal(soldier.x,soldier.battlefieldHome.x,'out-of-range soldier returns home');
});

test('soldier hits use the SIM recipient team rather than the real player team',()=>{
 for(const playerTeam of ['song','jin']) {
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start(playerTeam);s.arenaSimulator.tick(5);
  const enemyTeam=playerTeam==='song'?'jin':'song';
  const [enemy]=match.add({team:enemyTeam,faction:'wudang',level:150,strength:'normal',count:1});
  const soldier=s.l.enemies.find(actor=>actor.battlefieldMonster&&actor.battlefieldTeam===playerTeam);
  const hp=enemy.hp,playerHP=s.l.life;s.nativeIncoming=attacker=>{s.l.life=Math.max(0,s.l.life-attacker.dmg);};s.arenaSimulator.receiveMonsterHit(enemy,soldier);
  assert.equal(enemy.hp,Math.max(0,hp-soldier.nativeDamage),'allied soldier forwards native damage to hostile SIM');assert.equal(s.l.life,playerHP);
  const [ally]=match.add({team:playerTeam,faction:'wudang',level:150,strength:'normal',count:1});
  const allyHP=ally.hp;s.arenaSimulator.receiveMonsterHit(ally,soldier);assert.equal(ally.hp,allyHP);
 }
});

test('Tống Kim skill defense refunds MP before mana shield, for both SIM and player recipients',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const [defender]=match.add({team:'jin',faction:'wudang',level:150,strength:'normal',count:1});
 Object.assign(defender.stats,{mana:5491,manaShield:84,dmg2mana:22});
 defender.hp=defender.max=3227;defender.mana=200;
 // 5800 × 20% = 1160 damage before MP conversion and mana shield.
 s.hs({...s.l.P.main,parts:{phys:5800},series:0,series5:0},defender);
 assert.ok(Math.abs(defender.hp-2522.2)<1e-8);assert.equal(defender.mana,0);
 // Deliver the same resolved damage via the actor-to-player contact path.
 Object.assign(s.l.P,{mana:5491,manaShield:84,dmg2mana:22});s.l.life=3227;s.l.mana=200;
 defender.x=s.v.x;defender.y=s.v.y;defender.cooldown=0;defender.hurtT=0;
 Object.assign(defender.stats.main,{parts:{phys:5800},series:0,series5:0});
 s.arenaSimulator.tick(.001);advanceSimulator(s,.6);
 assert.ok(Math.abs(s.l.life-2522.2)<1e-8);assert.equal(s.l.mana,0);
});

test('Tống Kim finite MP pays each cast once and passively recovers without refilling on context swaps',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const [actor]=match.add({team:'jin',faction:'wudang',level:150,strength:'normal',count:1});
 actor.x=s.v.x;actor.y=s.v.y;actor.mana=25;actor.hp=500;
 Object.assign(actor.stats,{regen:19,manaRegen:10});actor.stats.main.cost=40;
 s.arenaSimulator.tick(1);assert.equal(actor.casts,1);assert.equal(actor.mana,35);assert.equal(actor.hp,519);
 advanceSimulator(s,.5);
 s.arenaSimulator.tick(.5);assert.equal(actor.casts,2);assert.equal(actor.mana,0);
 advanceSimulator(s,.5);assert.equal(actor.mana,0,'visual and delayed hit context cannot replenish mana');
 s.arenaSimulator.tick(1);assert.equal(actor.casts,3);assert.equal(actor.mana,10);
});

test('Tống Kim poison/cold/stun reductions preserve older effects; poison, regen and break timers continue while stunned',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const [actor]=match.add({team:'jin',faction:'wudang',level:150,strength:'normal',count:1});
 Object.assign(actor.stats,{poisonRed:80,freezeRed:80,stunRed:80,regen:19});
 actor.hp=500;actor.stun=0;actor.poison=0;actor.slowT=0;
 s.hs({...s.l.P.main,parts:{poison:500,cold:500},poisonT:10,coldT:10,stun:100,series:0,series5:0},actor);
 assert.ok(Math.abs(actor.poison-2)<1e-8);assert.ok(Math.abs(actor.poison*actor.poisonDmg-20)<1e-8);
 assert.ok(actor.slowT<=2.01);assert.ok(actor.stun<=.161);
 actor.stun=5;actor.resBrkT=3;actor.hp=500;
 s.arenaSimulator.tick(1);
 assert.equal(actor.stun,4);assert.equal(actor.resBrkT,2);assert.ok(Math.abs(actor.hp-509)<1e-8);assert.ok(Math.abs(actor.poison-1)<1e-8);
 // A shorter reduced application must not shorten an existing long effect.
 actor.resBrkT=0;actor.poison=4;actor.poisonDmg=10;actor.slowT=4;actor.stun=4;
 s.hs({...s.l.P.main,parts:{poison:500,cold:500},poisonT:10,coldT:10,stun:100,series:0,series5:0},actor);
 assert.equal(actor.poison,4);assert.ok(Math.abs(actor.poison*actor.poisonDmg-60)<1e-8);
 assert.equal(actor.slowT,4);assert.equal(actor.stun,4);
});

test('battlefield suggestion values a usable mana shield without crediting an unshielded MP pool',()=>{
 const s=simulatorGame();loadDeclaration(s,'src/client/core/attributes-02.js','G0');
 Object.assign(s,{Pe:()=>50,Q0:['phys','cold','fire','poison','light'],V5:.7,Sw:()=>0});
 s.o.mainLock=true;s.o.battlefieldBuild={equipped:true};
 const base={...s.l.P,life:3000,mana:5000,manaShield:0,main:{dps:1000},res:{phys:50,cold:50,fire:50,poison:50,light:50}};
 const unshielded=s.G0(base);assert.equal(s.G0({...base,mana:20000}),unshielded);
 const shielded=s.G0({...base,manaShield:84});assert.ok(shielded>unshielded);
 assert.ok(s.G0({...base,mana:100,manaShield:84})<shielded);
 delete s.o.battlefieldBuild;assert.equal(s.G0({...base,manaShield:84}),s.G0(base));
});

test('Tống Kim PvP scales direct and poison damage once, preserving soldier and golden boss PvE damage',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);match.tick(600);
 const [enemy]=match.add({team:'jin',faction:'wudang',level:150,strength:'normal',count:1});
 const ratio=s.arenaSimulator.pvpDamageScale(s.v,enemy);assert.equal(ratio,.2);
 const before=enemy.hp;s.hs({...s.l.P.main,parts:{phys:200,poison:200},poisonT:4,series:0,series5:0},enemy);
 assert.ok(Math.abs(before-enemy.hp-40)<1e-8);assert.ok(Math.abs(enemy.poison*enemy.poisonDmg-40)<1e-8);
 const boss=s.arenaSimulator.actors.find(x=>x.battlefieldBoss);
 assert.equal(s.arenaSimulator.pvpDamageScale(s.v,boss),1);assert.equal(s.arenaSimulator.pvpDamageScale(boss,enemy),1);
 assert.equal(s.arenaSimulator.pvpDamageScale(s.v,{battlefieldMonster:true}),1);
 match.reset();assert.equal(s.arenaSimulator.pvpDamageScale(s.v,enemy),1);
});

test('Vô Hình Độc uses the PvP coefficient and poison duration reduction without changing soldier poison',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const [enemy]=match.add({team:'jin',faction:'wudu',level:150,strength:'normal',count:1});
 const soldier=s.l.enemies.find(actor=>actor.battlefieldMonster&&actor.battlefieldTeam==='jin');
 Object.assign(enemy.stats,{poisonRed:80});enemy.poison=0;
 Object.assign(soldier,{res:{...s.l.P.res},series:0,poison:0});
 for(const actor of [enemy,soldier])Object.assign(actor,{x:s.v.x+40,y:s.v.y});
 s.o.fac='wudu';s.o.sk[69]=1;
 Object.assign(s,{Yn:{69:{el:'poison',every:.5,rad:180}},y4:{},zi:()=>1,i6:()=>100,F0:()=>0,q0:(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*2)/s.QA});
 loadDeclaration(s,'src/client/core/state-and-save-02.js','_1');
 loadDeclaration(s,'src/client/gameplay/shop-and-books-01.js','b7');
 s.b7(69,.6);
 assert.ok(Math.abs(enemy.poison-.6)<1e-8);assert.ok(Math.abs(enemy.poison*enemy.poisonDmg-4)<1e-8);
 assert.equal(soldier.poison,3);assert.equal(soldier.poison*soldier.poisonDmg,100);
 // Existing poison is not reduced again when the aura pulses.
 s.b7(69,.6);assert.ok(Math.abs(enemy.poison*enemy.poisonDmg-8)<1e-8);
});

test('Tống Kim SIMs drink their own potions, respect cooldown and never consume player bottles',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const [actor]=match.add({team:'song',faction:'wudang',level:150,strength:'normal',count:1});
  s.S.potions=[{kind:'life',tier:1,total:200},{kind:'mana',tier:1,total:60}];s.be={1:1};s.ao=.3;
  actor.hp=100;actor.mana=0;actor.stats.main.cost=20;actor.cooldown=9999;
  const playerHP=s.l.life,playerMP=s.l.mana;
  s.arenaSimulator.tick(.01);
  assert.equal(actor.hp,300);assert.equal(actor.potionBag.life,29);assert.equal(actor.potionBag.mana,29);
  const mana=actor.mana;
  s.arenaSimulator.tick(.1);assert.equal(actor.hp,300);assert.equal(actor.potionBag.life,29);assert.ok(actor.mana>=mana);
  s.arenaSimulator.tick(.21);assert.equal(actor.hp,500);assert.equal(actor.potionBag.life,28);
  assert.equal(s.l.life,playerHP);assert.equal(s.l.mana,playerMP);
  actor.potionBag.life=0;actor.hp=10;s.arenaSimulator.tick(.5);assert.equal(actor.hp,10);
});

test('Tống Kim direct hits trigger SIM reflection once after defenses and never recurse',()=>{
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
  const [defender]=match.add({team:'jin',faction:'shaolin',level:150,strength:'normal',count:1});
  Object.assign(defender.stats,{sorb:20,retMelee:10,retMeleeP:50,retRangeP:25});
  const before=s.l.life,base={...s.l.P.main,parts:{phys:100},useAR:false,crit:0,series5:0,series:0};
  const hp=defender.hp;s.hs({...base,melee:true},defender);
  const damage=hp-defender.hp;
  assert.ok(damage>0);assert.ok(Math.abs(s.l.life-(before-10-damage*.5))<1e-6);
  const next=s.l.life,nextHP=defender.hp;s.hs({...base,melee:false},defender);
  assert.ok(Math.abs(s.l.life-(next-(nextHP-defender.hp)*.25))<1e-6);
  const ally=match.add({team:'song',faction:'shaolin',level:150,strength:'normal',count:1})[0];
  ally.stats.retMeleeP=100;
  const protectedHP=s.l.life;s.hs({...base,melee:true},ally);assert.equal(s.l.life,protectedHP);
});

test('Tống Kim disables formula capture by default, permits debugging and restores training logging on exit', () => {
  const s = battlefieldGame(), provider = s.combatLog.simulatorLog, match = s.arenaSimulator.battlefield;
  assert.equal(provider.enabled, true);
  match.start('song'); assert.equal(provider.enabled, false);
  let damage = 0;
  s.arenaSimulator.capture('test', { n: 'target' }, { n: 'skill', bad: 1n }, () => { damage++; });
  assert.equal(damage, 1, 'disabled logs still execute gameplay without JSON cloning');
  assert.equal(s.arenaSimulator.events.length, 0);
  provider.enabled = true;
  s.arenaSimulator.capture('test', { n: 'target' }, { n: 'skill' }, () => { damage++; });
  assert.equal(damage, 2); assert.equal(s.arenaSimulator.events.length, 1);
  match.reset(); assert.equal(provider.enabled, true);
  provider.enabled = false; match.start('jin'); match.reset(); assert.equal(provider.enabled, false);
});

test('hidden SIM animations advance and temporary visual effects expire without sprite rendering', () => {
  const s = simulatorGame(), actor = s.arenaSimulator.create('wudang'); let advances = 0;
  s.H8 = (_actor, dt) => { advances += dt; }; s.ps = () => {};
  actor.stFx = 'temporary'; actor.stT = .02;
  s.arenaSimulator.advanceAnimation(actor, .03, true);
  assert.equal(advances, .03); assert.equal(actor.stFx, null); assert.equal(actor.stT, 0);
});


test('production battlefield owns its map across field ticks, empty waves and town return',()=>{
  for (const mapId of [9003]) {
    const s=battlefieldGame(false),match=s.arenaSimulator.battlefield;
    assert.ok(!s.window.NO_FIELD,'production keeps the training field enabled');
    const hidden=new Set(),returnButton={id:'bBack',classList:{add:k=>hidden.add(k),toggle:(k,on)=>on?hidden.add(k):hidden.delete(k)}};
    s.simNodes.push(returnButton);
    s.Z0.key=37;Object.assign(s.l,{town:true,zoneShown:37,bgImg:{path:'bien-kinh'}});
    const origin={x:s.v.x,y:s.v.y,bgImg:s.l.bgImg,life:s.l.life,mana:s.l.mana};
    match.start('song',undefined,mapId);
    let fieldTicks=0,waves=0;
    Object.assign(s,{$w(){},Sb(){},advanceSkillContacts(){},X9(){},nP(){},Ab(){},cb(){},Oy(){},fy(){},hp:()=>false,
      $1:()=>false,Qd(){},GD(){fieldTicks++;s.ma(2);},Lm(){},sD:()=>true,_1:()=>[],
      o8(){waves++;s.ma(2);},mh:()=>false,lD(){waves++;},cD(){},W3(){}});
    Object.assign(s.l,{sweepT:0,dirty:false,deadT:0,hpDotT:0,slowT:0,stunT:0,spawnT:0,enemies:[],corpses:[]});
    for(const name of ['Ga','Td','Cd','rD'])loadDeclaration(s,'src/client/core/state-and-save-02.js',name);
    // Keep the real battlefield tick and player loop; omit only expensive combat rendering.
    s.Td(.01);
    assert.equal(s.Z0.key,mapId,'field tick must not reload the selected training map');
    assert.equal(s.l.zoneShown,mapId);assert.equal(s.l.bgImg.path,'battle-ground');
    assert.equal(fieldTicks,0);assert.equal(waves,0);
    assert.equal(hidden.has('hidden'),true,'return-to-training icon is hidden inside the battlefield');
    loadDeclaration(s,'src/client/ui/legacy-panels-and-audio-03.js','nc');
    const battleActors=match.state.soldiers;
    const battlePosition={x:s.v.x,y:s.v.y};
    for(const force of [false,true]){
      s.nc(force);
      assert.equal(s.l.town,false,'Thổ Địa Phù cannot move an active battlefield to town');
      assert.equal(s.Z0.key,mapId);assert.equal(match.active,true);
      assert.equal(match.state.soldiers,battleActors);
      assert.deepEqual({x:s.v.x,y:s.v.y},battlePosition);
    }

    s.l.enemies=[{dead:true}];s.Cd();s.rD();
    assert.equal(waves,0,'battlefield deaths and stall detection must not advance training waves');
    match.reset();
    assert.equal(s.Z0.key,37);assert.equal(s.l.town,true);assert.equal(s.l.zoneShown,37);
    assert.equal(s.l.bgImg,origin.bgImg);assert.equal(s.v.x,origin.x);assert.equal(s.v.y,origin.y);
    assert.equal(s.l.life,origin.life);assert.equal(s.l.mana,origin.mana);
    assert.equal(hidden.has('hidden'),false,'returning to town restores its toolbar');
    // The production training field still runs normally after leaving town.
    s.l.town=false;s.Td(.01);assert.equal(fieldTicks,1);
  }
});

test('battlefield labels use the active map instead of the saved training zone',()=>{
  const nodes=new Map(),texts=[];
  const m=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',style:{setProperty(){}}});return nodes.get(id);};
  const s=vm.createContext({l:{battlefield:true,P:{life:100,mana:100,main:{n:'skill'}},life:100,mana:100,enemies:[],ground:[]},
    o:{fac:'wudang',lvl:1,gold:0,xp:0},Z0:{key:9003},MapsEngine:{getMap:id=>({name:`Tống Kim ${id}`})},
    AA(){throw Error('must not read training map');},m,Jt:()=>null,I:{},q:String,F:String,S:{exp:[100]},
    dA:{s:100,m:5,top:4},M0:{w:1000,h:600},O0:{w:3500},B0:{x:0,y:0},v:{x:50,y:50}});
  for(const [file,name] of [['ui/world-panels-01.js','bm'],['ui/legacy-panels-and-audio-02.js','Mv'],['render/arena-01.js','SP']])
    loadDeclaration(s,`src/client/${file}`,name);
  const canvas=new Proxy({fillText:text=>texts.push(text)},{get:(target,key)=>target[key]||(()=>{})});
  for(const id of [9003]) {
    s.Z0.key=id;s.bm();s.Mv();s.SP(canvas);
    assert.equal(m('#u20zn').textContent,`Tống Kim ${id}`);
    assert.equal(m('#stageLbl').textContent,`Tống Kim ${id}`);
    assert.equal(texts.at(-1),`Tống Kim ${id}`);
  }
});


test('native soldier AI uses battlefield enemies in both production and arena, including contact-time team checks',()=>{
  for(const arena of [false,true]) for(const side of ['song','jin']) {
    const s=battlefieldGame(arena,true),match=s.arenaSimulator.battlefield;match.start(side);s.arenaSimulator.tick(5);
    const friend=s.arenaSimulator.roadMonsters.actors.find(actor=>actor.battlefieldTeam===side);
    const [ally]=match.add({team:side,faction:'shaolin',level:90,strength:'normal',count:1});
    const [enemy]=match.add({team:side==='song'?'jin':'song',faction:'wudang',level:90,strength:'normal',count:1});
    const origin={x:friend.x,y:friend.y};
    for(const unit of s.l.enemies) {unit.dead=true;unit.hp=0;}
    for(const unit of [friend,ally,enemy]){unit.dead=false;unit.hp=unit.max;Object.assign(unit,origin);}
    Object.assign(s.v,origin);s.l.life=1000;
    Object.assign(friend,{ar:99999,r:12,ranged:false,reach:100,atkCd:0,stun:0,poison:0,spd:0});
    s.q0=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*2)/s.QA;s.coldSpeedFactor=()=>1;s.actorActionLocked=()=>false;s.queueSkillContact=(actor,target,ability,hit,options)=>{s.lastContact={actor,target,hit,options};return {};};
    // Isolate the basic soldier tick; SIM skill casting must not replace this contact.
    ally.cooldown=enemy.cooldown=999;
    s.arenaSimulator.tick(.01);
    assert.ok(s.lastContact,`soldier acquired an enemy in arena=${arena}`);
    assert.equal(s.lastContact.actor,friend);
    assert.equal(s.lastContact.target,enemy,'nearby player and SIM on the same team are ignored');
    enemy.battlefieldTeam=side;
    assert.equal(s.lastContact.options.targets().length,0,'a launched contact cannot hit an actor that became friendly');
    s.lastContact=null;friend.atkCd=0;s.arenaSimulator.tick(.01);
    assert.equal(s.lastContact,null,'no basic attack when only friendly bodies remain');
    // An opposing soldier must still acquire the player, and recheck friendship at impact.
    ally.dead=enemy.dead=true;ally.hp=enemy.hp=0;
    friend.battlefieldTeam=side==='song'?'jin':'song';friend.atkCd=0;friend.battlefieldReturning=false;Object.assign(friend,origin);Object.assign(s.v,origin);
    s.arenaSimulator.tick(.01);assert.ok(s.lastContact);assert.equal(s.lastContact.target,s.v);
    assert.ok(s.lastContact.options.targets().includes(s.v));
    friend.battlefieldTeam=side;
    assert.equal(s.lastContact.options.targets().length,0,'player contacts also recheck the source team');
  }
});

test('weapon and skill HP/MP steal work for direct and secondary battlefield hits',()=>{
  for(const arena of [false,true]) for(const secondary of [false,true]) for(const source of ['weapon','skill','both']) {
    const s=battlefieldGame(arena),match=s.arenaSimulator.battlefield;match.start('song');
    loadDeclaration(s,'src/client/core/state-and-save-01.js','za');
    s.o.eq.weapon={d:0,k:0};
    Object.assign(s.l.P,{leech:source==='skill'?0:10,manaLeech:source==='skill'?0:20,life:1000,mana:100,antiBlock:100,series5:0});
    s.l.life=500;s.l.mana=20;
    const [enemy]=match.add({team:'jin',faction:'wudang',level:90,strength:'normal',count:1});
    Object.assign(enemy,{hp:10000,max:10000,series:0,res:{phys:0,cold:0,fire:0,poison:0,light:0}});
    Object.assign(enemy.stats,{sorb:0,dmgShield:0,manaShield:0,from:{},retMelee:0,retMeleeP:0});
    const skill={parts:{fire:100},rad:100,series:0,crit:0,wpn:true,ev2:secondary,skLeech:source==='weapon'?0:5,skMLeech:source==='weapon'?0:10};
    const before=enemy.hp;s.hs(skill,enemy);const damage=before-enemy.hp;
    assert.ok(damage>0);
    assert.equal(s.l.life,500+damage*(source==='weapon'?10:source==='skill'?5:15)/100,source);
    assert.equal(s.l.mana,20+damage*(source==='weapon'?20:source==='skill'?10:30)/100,source);
    const hp=s.l.life,mp=s.l.mana;enemy.battlefieldTeam='song';s.hs(skill,enemy);
    assert.equal(s.l.life,hp);assert.equal(s.l.mana,mp,'friendly contacts cannot grant steal');
    enemy.battlefieldTeam='jin';s.l.life=999.9;s.l.mana=99.9;s.hs(skill,enemy);
    assert.equal(s.l.life,1000);assert.equal(s.l.mana,100,'steal respects the current resource maxima');
  }
});

test('Thiên Nhẫn kích and Côn Lôn đao retain weapon steal on their 90/150 skills',()=>{
  for(const id of [361,1075,372,1080]) {
    const s=battlefieldGame(false);s.arenaSimulator.battlefield.start('song');
    loadDeclaration(s,'src/client/core/state-and-save-01.js','za');
    loadDeclaration(s,'src/client/core/helpers-and-config-01.js','j1');
    const native=s.T[id],level=Math.min(20,native.max||20);
    const percent=key=>{const value=native.attr[key]?.[level-1];return Array.isArray(value)?value[0]:value||0;};
    Object.assign(s.l.P,{life:1000,mana:100,leech:10,manaLeech:20,antiBlock:100});
    const target={x:0,y:0,hp:10000,max:10000,cls:'normal',tid:0,series:0,res:{phys:0,cold:0,fire:0,poison:0,light:0},battlefieldTeam:'jin'};
    const skill={id,parts:{phys:100},series:0,crit:0,wpn:s.j1(native)!==null,skLeech:percent('steallife_p'),skMLeech:percent('stealmana_p')};
    assert.equal(skill.wpn,true,native.n);
    for(const secondary of [false,true]) {
      s.l.life=500;s.l.mana=20;const before=target.hp;
      s.hs({...skill,ev2:secondary},target);const damage=before-target.hp;
      assert.ok(damage>0,native.n);
      assert.equal(s.l.life,500+damage*(10+skill.skLeech)/100,native.n);
      assert.equal(s.l.mana,20+damage*(20+skill.skMLeech)/100,native.n);
    }
  }
});

test('a SIM keeps stolen HP and MP in its own state after a delayed battlefield contact',()=>{
  for(const arena of [false,true]) {
    const s=battlefieldGame(arena),match=s.arenaSimulator.battlefield;match.start('song');
    loadDeclaration(s,'src/client/core/state-and-save-01.js','za');
    const [attacker]=match.add({team:'song',faction:'shaolin',level:90,strength:'normal',count:1});
    const [enemy]=match.add({team:'jin',faction:'wudang',level:90,strength:'normal',count:1});
    for(const unit of [attacker,enemy]){delete unit.profile.eq.horse;unit.mounted=false;Object.assign(unit,{x:1700,y:1700});}
    const skill={id:0,n:'Steal test',basic:true,wpn:true,ev2:true,parts:{phys:100},series:0,crit:0,rate:1,rad:100,skLeech:5,skMLeech:10};
    attacker.profile.main='basic';Object.assign(attacker.stats,{main:skill,basic:skill,life:1000,mana:100,regen:0,manaRegen:0,leech:10,manaLeech:20});
    attacker.hp=500;attacker.mana=20;attacker.potionBag={life:0,mana:0,potCd:{}};enemy.cooldown=999;
    Object.assign(enemy.stats,{sorb:0,dmgShield:0,manaShield:0,from:{},retMelee:0,retMeleeP:0});
    let contact;s.queueSkillContact=(actor,target,ability,hit,options)=>{if(actor===attacker)contact={target,hit,options};return {};};
    s.arenaSimulator.tick(.01);assert.ok(contact);assert.equal(contact.target,enemy);
    const heroHP=s.l.life,heroMP=s.l.mana,before=enemy.hp;
    contact.hit(enemy);const damage=before-enemy.hp;
    assert.ok(damage>0);assert.equal(attacker.hp,500+damage*.15);assert.equal(attacker.mana,20+damage*.30);
    assert.equal(s.l.life,heroHP);assert.equal(s.l.mana,heroMP);
  }
});

test('respawn countdown updates through the real player loop in production and arena',()=>{
 for(const arena of [false,true]) {
  const s=battlefieldGame(arena),match=s.arenaSimulator.battlefield;match.start('song');
  const notice=s.simNodes.find(node=>node.id==='battlefield-respawn-countdown');
  Object.assign(s,{$w(){},Sb(){},advanceSkillContacts(){}});s.l.sweepT=0;s.l.dirty=false;
  loadDeclaration(s,'src/client/core/state-and-save-02.js','Td');
  s.l.life=0;match.playerDied();assert.equal(notice.textContent,'Rời doanh trại sau 30 giây');
  s.Td(1);assert.equal(notice.textContent,'Rời doanh trại sau 29 giây');assert.equal(s.l.life,0);
  match.reset();assert.equal(notice.hidden,true);
 }
});

test('Tống Kim fills an existing stack in a full bag, keeps overflow on the ground and preserves unused stock on exit',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;s.INV_MAX=60;match.start('song');
 const rewards=s.arenaSimulator.warRewards;s.o.mats.misc.tk_resistance=49;s.o.inv=Array.from({length:59},()=>({}));s.Math.random=()=>0;
 function drop(){const victim={x:s.v.x,y:s.v.y,hp:0,battlefieldMonster:true,battlefieldTeam:'jin'};rewards.record(s.v,victim);rewards.killed(victim);rewards.tick(.01);}
 drop();assert.equal(rewards.state.inventory.resistance,50);assert.equal(rewards.drops.length,0);
 drop();assert.equal(rewards.state.inventory.resistance,50);assert.equal(rewards.drops.length,1);
 s.o.inv.pop();rewards.tick(.01);assert.equal(rewards.state.inventory.resistance,51);assert.equal(rewards.drops.length,0);
 match.reset();assert.equal(rewards.state.inventory.resistance,51);assert.equal(s.o.mats.misc.tk_resistance,51);
 assert.throws(()=>rewards.use('resistance'),/trong trận/);
});

test('Tống Kim team items refresh real SIM stats and remove buffs at expiry',()=>{
 const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);
 const rewards=s.arenaSimulator.warRewards;
 const compute=s.j0;s.j0=()=>{const stats={...compute(),speed:1,speedFoot:1,aspdP:1,aspdC:1};s.arenaSimulator.applyBattlefieldBonuses(stats);return stats;};
 const [ally]=match.add({team:'song',faction:'wudang',level:90,strength:'normal',count:1});
 Object.assign(ally,{x:s.v.x,y:s.v.y});const life=ally.stats.life,speed=ally.stats.speed;
 s.o.mats.misc.tk_drum=1;s.o.mats.misc.tk_command=1;
 rewards.use('drum');rewards.use('command');assert.equal(ally.stats.life,life*1.3);assert.equal(ally.max,ally.stats.life);assert.equal(ally.stats.speed,speed*1.3);
 rewards.tick(180);assert.equal(ally.stats.life,life);assert.equal(ally.max,life);assert.equal(ally.stats.speed,speed);
});

test('battlefield item traps use native Đường Môn ground and burst FX without adding skill damage',()=>{
 const fx={window:{}};for(const name of ['projectile-effects-01.js','projectile-effects-02.js','status-effects-01.js'])vm.runInNewContext(fs.readFileSync(path.join(ROOT,'src/client/data',name),'utf8'),fx);
 for(const [kind,ground,burst,status]of [['freezeTrap','fx/m155_fly.webp','fx/m156_hit.webp','stun'],['stunTrap','fx/m159_fly.webp','fx/m160_hit.webp','stun'],['slowTrap','fx/m153_fly.webp','fx/m154_hit.webp','slowT']]){
  const s=battlefieldGame(),match=s.arenaSimulator.battlefield;match.start('song');s.arenaSimulator.tick(5);s.A0=fx.window.JFX;s.l.fx=[];s.l.quiet=false;s.yn=sprite=>Math.min(1.2,sprite.n*sprite.ms/1000);loadDeclaration(s,'src/client/core/game-loop-01.js','d_');
  const drawn=[];s.Fa=(sprite,...args)=>{drawn.push({sprite,args});return true;};s.o.mats.misc['tk_'+kind]=1;
  const enemy=s.l.enemies.find(actor=>actor.battlefieldMonster&&actor.battlefieldTeam==='jin');Object.assign(enemy,{x:s.v.x,y:s.v.y,hp:100,stun:0,slowT:0});
  s.arenaSimulator.warRewards.use(kind);const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},stroke(){},fillText(){},arc(){}};s.arenaSimulator.drawBattlefieldLoot(ctx);assert.equal(drawn[0].sprite.f,ground);
  s.arenaSimulator.warRewards.tick(.01);assert.equal(s.l.fx.at(-1).s.f,burst);assert.equal(enemy.hp,100);assert.equal(enemy[status],kind==='slowTrap'?5:3);if(kind==='slowTrap')assert.equal(enemy.slowPower,.5);
 }
});

function deferredAllocator() {
  const jobs=[];
  return {jobs,optimize(profile,autoSkills,autoPotential){return new Promise((resolve,reject)=>jobs.push({profile,resolve:()=>resolve({attr:{...profile.attr,str:profile.attr.str+(autoPotential?profile.attrPts:0)},attrPts:autoPotential?0:profile.attrPts,sk:profile.sk,skL:profile.skL,skPts:autoSkills?0:profile.skPts}),reject}));}};
}
const settlePreparation=()=>new Promise(resolve=>setImmediate(resolve));
test('marshal profiles prepare before halftime; appearing never runs the heavy optimizer again',async()=>{
  const allocator=deferredAllocator(),s=battlefieldGame(true,false,allocator),match=s.arenaSimulator.battlefield;
  s.yt=()=>assert.fail('main-thread potential optimizer');s.Pt=()=>assert.fail('main-thread skill optimizer');
  const player=s.o,world=s.l,hero=s.v;
  match.start('song');assert.equal(match.state.marshalPreparing,true);assert.equal(s.arenaSimulator.actors.length,0);
  assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(s.v,hero);
  match.tick(600);assert.equal(s.arenaSimulator.actors.length,0,'unfinished configurations cannot enter combat');
  let completed=0;
  while(match.state.marshalPreparing){
    assert.ok(completed<100,'preparation terminates');
    for(const job of allocator.jobs.splice(0)){job.resolve();completed++;}
    await settlePreparation();
  }
  await match.prepared;assert.ok(completed>2);
  match.tick(.016);const bosses=s.arenaSimulator.actors.filter(actor=>actor.battlefieldBoss);
  assert.equal(bosses.length,2);assert.equal(allocator.jobs.length,0);assert.ok(bosses.every(boss=>boss.profile.attrPts===0));
  assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(s.v,hero);match.reset();
});

test('leaving discards pending marshal and reinforcement results without spawning late actors',async()=>{
  const allocator=deferredAllocator(),s=battlefieldGame(true,false,allocator),match=s.arenaSimulator.battlefield;
  match.start('song');const prepared=match.prepared;match.reset();
  for(const job of allocator.jobs.splice(0))job.resolve();await prepared;
  assert.equal(match.active,false);assert.equal(s.arenaSimulator.actors.length,0);
  match.start('song');
  const pending=match.addAsync({team:'song',faction:'wudang',level:90,strength:'normal',count:1},()=>{},()=>Promise.resolve());
  const rejected=assert.rejects(pending,/hủy/);await settlePreparation();match.reset();
  for(const job of allocator.jobs.splice(0))job.resolve();await rejected;
  assert.equal(s.arenaSimulator.actors.length,0);
});

test('SIM creation waits off-thread, restores live globals immediately and rejects stale results',async()=>{
  const allocator=deferredAllocator(),s=battlefieldGame(true,false,allocator),player=s.o,world=s.l,hero=s.v;
  s.yt=()=>assert.fail('main-thread potential optimizer');s.Pt=()=>assert.fail('main-thread skill optimizer');
  const skill=s.I.wudang.skills.find(id=>s.UA(s.T[id]));
  const pending=s.arenaSimulator.create('wudang',skill,true,true);
  assert.equal(s.arenaSimulator.actors.length,0);assert.equal(s.o,player);assert.equal(s.l,world);assert.equal(s.v,hero);
  allocator.jobs.shift().resolve();const actor=await pending;
  assert.equal(actor.profile.attrPts,0);assert.equal(actor.profile.skPts,0);assert.equal(actor.autoSkills,true);assert.equal(actor.autoPotential,true);
  const stale=s.arenaSimulator.create('wudang',skill,false,true),rejected=assert.rejects(stale,/hủy/);
  s.arenaSimulator.battlefield.start('song');allocator.jobs.shift().resolve();await rejected;
  assert.equal(s.arenaSimulator.actors.length,0);s.arenaSimulator.battlefield.reset();
  for(const job of allocator.jobs.splice(0))job.resolve();await settlePreparation();
});

test('failed marshal preparation reports a recoverable error without synchronous fallback',async()=>{
  const s=battlefieldGame(true,false,{optimize:()=>Promise.reject(Error('Worker unavailable'))}),match=s.arenaSimulator.battlefield;
  s.yt=()=>assert.fail('no synchronous fallback');match.start('song');await match.prepared;
  assert.match(match.state.preparationError,/Worker unavailable/);match.tick(600);
  assert.equal(match.running,true);assert.equal(s.arenaSimulator.actors.length,0);match.reset();
});

test('arena restores the equipped Thien Tu weapon across profile switches and reloads', () => {
  const s = game();
  s.combatSandbox.switchFaction('tangmen');
  const skill = s.I.tangmen.skills.find(id => s.o.sk[id] && s.UA(s.T[id]));
  s.j1 = () => 101;
  s._A = (d, k) => ({ n: 'Training weapon', d, k });
  s.combatSandbox.selectSkill(skill);
  const weapon = { uid: 12345, n: '[Thiên Tứ] Băng Hàn Đơn Chỉ Phi Đao', d: 1, k: 1,
    set: { kind: 'platina' }, lock: true, enh: 8, mag: [{ a: 85, p: [200, -1, 0] }] };
  s.o.eq.weapon = JSON.parse(JSON.stringify(weapon));
  s.$();
  s.combatSandbox.switchFaction('shaolin');
  s.combatSandbox.switchFaction('tangmen');
  assert.deepEqual(JSON.parse(JSON.stringify(s.o.eq.weapon)), weapon);
  const reloaded = game(true, s.entries);
  // Re-run the startup restore with real weapon provisioning enabled in this fixture.
  reloaded.j1 = () => 101;
  reloaded._A = s._A;
  reloaded.combatSandbox.switchFaction('tangmen');
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.o.eq.weapon)), weapon);
  const saved = reloaded.t1(JSON.parse(reloaded.entries.get('jxidle_arena_profiles')).tangmen);
  assert.equal(saved.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.state.eq.weapon)), weapon);
  reloaded.combatSandbox.selectSkill(skill);
  assert.equal(reloaded.o.eq.weapon.n, 'Training weapon', 'explicit skill selection still provisions its training weapon');
});
