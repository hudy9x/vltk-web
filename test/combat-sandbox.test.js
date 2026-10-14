const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { createServer } = require('../server/index.ts');
const { openDatabase } = require('../server/database.ts');
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
