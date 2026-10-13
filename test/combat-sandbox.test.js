const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { createServer } = require('../server');
const { openDatabase } = require('../server/database');
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
  function field(id){if(!fields.has(id))fields.set(id,{value:'0',checked:false,options:[],classList:{toggle(){}}});return fields.get(id);}
  const panel={querySelector:field,querySelectorAll:()=>[],id:'',innerHTML:''};
  const s={window:{localGameConfig:{development:enabled,combatSandbox:enabled}},
    document:{createElement:tag=>tag==='details'?panel:{},head:{appendChild(){}},body:{appendChild(){}}},
    localStorage:{getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)},
    Math,JSON,Date,b8:1,mP:'test-save-salt', z2:5, Zt:{emei:1,cuiyan:1},
    I:Object.fromEntries(factions.map(f=>[f.key,f])),T:catalog.JX.skills,
    o:{fac:null},l:{P:{life:100,mana:100}},v:{x:500,y:500},Y:{},HA:false,m0:0,
    r0:{0:{n:'Hổ'},1:{n:'Sói'}},O0:{w:1000,h:1000},
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
  s.entries=entries;return s;
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
    const db=openDatabase(':memory:');const {server}=createServer({db,development,combatSandbox:true,downloadAssets:false});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{const config=await(await fetch(`http://127.0.0.1:${server.address().port}/api/config`)).json();assert.equal(config.development,development);assert.equal(config.combatSandbox,development?true:undefined);}
    finally{await new Promise(resolve=>server.close(resolve));db.close();}
  }
});
