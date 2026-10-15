const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { createServer } = require('../server/index.ts');
const { openDatabase } = require('../server/database.ts');
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
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'data.js'),'utf8'),catalog);
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
  for(const name of ['I3','Yd','bn','t1'])loadDeclaration(s,'app/core/state-and-save-03.js',name);
  for(const name of ['ee','SA'])loadDeclaration(s,'app/gameplay/shop-and-books-01.js',name);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'app/dev/combat-sandbox-01.js'),'utf8'),s);
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
  s.combatSandbox.spawnMonsters(1,500,false);assert.equal(s.l.enemies.length,20);assert.equal(s.l.enemies[0].spd,40);
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
  for(const name of ['Pe','ja','hs'])loadDeclaration(s,'app/core/state-and-save-01.js',name);
  s.l.P=s.j0();for(const enemy of s.l.enemies)Object.assign(enemy,{n:"Quái",res:s.l.P.res,def:0,series:0,act:"at"});s.l.life=1000;s.l.mana=100;s.l.zoneShown=1;s.l.quiet=false;
  vm.runInContext(fs.readFileSync(path.join(ROOT,'app/ui/combat-log-01.js'),'utf8'),s);
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
test('removing or clearing SIM invalidates in-flight damage and never enables ordinary monster AI',()=>{
  const s=simulatorGame(),sim=s.arenaSimulator.create('wudang');
  s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);
  const pending=s.l.combatProjectiles[0];s.arenaSimulator.remove();
  pending.combat.onHit(s.v);assert.equal(s.l.life,1000);
  s.arenaSimulator.create('wudang');s.combatSandbox.clearCombat();s.combatSandbox.tick(.1);
  assert.equal(s.arenaSimulator.actor,null);
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
  const {initialize,snapshot}=require('../server/database.ts');
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

test('real skill damage applies hurt only above five percent max HP and interrupts a monster attack',()=>{
 const s=simulatorGame(),monster=s.l.enemies[0];Object.assign(monster,{hp:1000,max:1000,act:'at'});
 const skill={parts:{phys:50},crit:0,series:0,series5:0};
 s.hs(skill,monster);assert.equal(monster.hp,950);assert.ok(!(monster.hurtT>0));assert.equal(monster.act,'at');
 s.hs({...skill,parts:{phys:51}},monster);assert.equal(monster.hp,899);assert.equal(monster.act,'hurt');assert.ok(monster.hurtT>0);
});

test('SIM PK applies hurt after player absorption, and player casting recovers on the shared clock',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');actor.x=s.v.x;actor.y=s.v.y;
 s.l.P.sorb=80;s.arenaSimulator.setPK(true);s.arenaSimulator.tick(.1);advanceSimulator(s,.2);
 assert.equal(s.l.life,980);assert.ok(!(s.v.hurtT>0),'100 raw but 20 actual damage is below 5%');
 advanceSimulator(s,.4);s.l.P.sorb=0;actor.cooldown=0;s.arenaSimulator.tick(.6);advanceSimulator(s,.2);
 assert.equal(s.l.life,880);assert.equal(s.v.act,'hurt');assert.ok(s.v.hurtT>0);
 loadDeclaration(s,'app/core/state-and-save-01.js','oD');assert.equal(s.oD(),.05,'hurt blocks every player cast entry');
 advanceSimulator(s,.3);assert.equal(s.v.hurtT,0);assert.equal(s.v.act,'st');
});

test('hurt blocks SIM casting and movement, and toggling modes cannot bypass recovery',()=>{
 const s=simulatorGame(),actor=s.arenaSimulator.create('wudang');s.arenaSimulator.setFarm(true);
 s.applyActorHurt(actor,51,1000);const x=actor.x,y=actor.y;
 s.arenaSimulator.setFarm(false);s.arenaSimulator.setFarm(true);s.arenaSimulator.tick(.1);
 assert.equal(actor.casts,0);assert.equal(actor.x,x);assert.equal(actor.y,y);assert.equal(actor.act,'hurt');
 advanceSimulator(s,.3);s.arenaSimulator.tick(.1);assert.equal(actor.casts,1);
});

test('native monster damage triggers player hurt only after mitigation exceeds five percent',()=>{
 const s=simulatorGame();loadDeclaration(s,'app/core/state-and-save-01.js','U9');
 Object.assign(s,{Dw:['phys'],Yr:75,Pe:()=>100});s.l.life=1000;s.v.act='at';
 const attacker={...s.l.enemies[0],dmg:50,ar:100,series:0};
 s.U9(attacker);assert.equal(s.l.life,950);assert.ok(!(s.v.hurtT>0));assert.equal(s.v.act,'at');
 attacker.dmg=51;s.U9(attacker);assert.equal(s.l.life,899);assert.equal(s.v.act,'hurt');assert.ok(s.v.hurtT>0);
 advanceSimulator(s,.3);s.l.P.manaShield=100;s.l.mana=1000;attacker.dmg=100;
 s.U9(attacker);assert.equal(s.l.life,899);assert.ok(!(s.v.hurtT>0),'mana absorption leaves no HP damage to trigger hurt');
});
