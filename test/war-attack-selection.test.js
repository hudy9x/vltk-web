const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');

function selector() {
  const main = { id: 1066, cd: 2, cost: 30, dps: 200 },
    disabled = { id: 355, cd: 0, cost: 0, dps: 999 }, basic = { id: 0, cost: 0, dps: 10 };
  const state = { Math, Map, window: {}, T: { 1066: {}, 355: {} },
    o: { main: main.id, mainLock: true, slots: [main.id, -1, -1, -1], rot: true },
    l: { battlefield: true, mana: 100, clock: 0, skCd: {} }, S3: () => false,
    E3: () => true, ji: skill => state.l.mana >= skill.cost,
    $1: () => false, jd: () => 'near', q0: (a,b) => Math.abs(a.x - b.x), v: {x:0},
    c8: targets => [...targets].sort((a,b) => a.x - b.x)[0],
  };
  vm.createContext(state);
  const source = fs.readFileSync('src/client/core/state-and-save-01.js','utf8');
  const declarations = acorn.parse(source,{ecmaVersion:'latest'}).body;
  for (const name of ['W9','Z9','iD']) {
    const node = declarations.find(node => node.type === 'VariableDeclaration' && node.declarations.some(d => d.id.name === name));
    vm.runInContext(source.slice(node.start,node.end),state);
  }
  return {state,stats:{main,basic,actives:[main,disabled]},main,disabled};
}

test('manual and auto keep the only configured primary through cooldown and mana exhaustion',()=>{
  for (const battlefield of [false,true]) for (const rot of [false,true]) {
    const {state:s,stats,main} = selector();s.l.battlefield=battlefield;s.o.rot=rot;
    assert.equal(s.Z9(stats,false),main);
    s.l.skCd[main.id]=2;
    assert.equal(s.Z9(stats,false),null,'never fall through to disabled learned skills');
    s.l.clock=2;s.l.mana=0;
    assert.equal(s.Z9(stats,false),battlefield ? stats.basic : null);
    s.l.mana=100;
    assert.equal(s.Z9(stats,false),main,'primary resumes when affordable');
  }
});

test('rotation starts with primary and only uses enabled slots',()=>{
  const {state:s,stats,main,disabled}=selector();
  const secondary={id:20,cost:0,dps:50};s.T[20]={};stats.actives.push(secondary);
  s.o.slots=[secondary.id,main.id,-1,-1];
  assert.equal(s.Z9(stats,false),main);
  s.l.rotI=s.l.rotNext;
  assert.equal(s.Z9(stats,false),secondary);
  s.l.skCd[main.id]=10;secondary.cd=1;s.l.skCd[20]=10;
  assert.equal(s.Z9(stats,false),null);
  assert.notEqual(s.Z9(stats,true),disabled,'boss suppression still respects primary');
});

test('PK preference displaces an existing monster target and falls back after the last SIM dies',()=>{
  const {state:s}=selector();s.o.preferPKSim=true;
  const monster={x:1,hp:100,max:100},sim={x:40,hp:100,max:100,arenaSim:true},boss={x:2,hp:100,max:100,arenaSim:true,battlefieldBoss:true};
  s.l.tgt=monster;
  assert.equal(s.iD([monster,sim,boss]),sim);
  s.l.tgt=sim;s.l.clock=1;
  assert.equal(s.iD([monster,boss]),monster);
  s.l.battlefield=false;s.l.tgt=null;
  assert.equal(s.iD([monster,sim]),monster);
});

test('manual battlefield targeting always casts primary even with rotation enabled',()=>{
  const {state:s,stats,main,disabled}=selector();
  s.hA=()=>true;s.l.manTgt={hp:100};s.o.slots=[disabled.id,main.id];s.l.rotI=0;
  assert.equal(s.Z9(stats,false),main);
});

test('battlefield auto dash cannot cast an unassigned learned skill or override a manual primary',()=>{
  const {state:s,stats,main}=selector();
  const source=fs.readFileSync('src/client/core/state-and-save-01.js','utf8');
  const node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(node=>node.type==='VariableDeclaration'&&node.declarations.some(d=>d.id.name==='aD'));
  vm.runInContext(source.slice(node.start,node.end),s);
  const dash={id:40,cost:0,cd:2};stats.actives.push(dash);s.T[40]={};
  Object.assign(s,{gs:40,LD:400,actorActionLocked:()=>false,hA:()=>false,mt:()=>true,tP:()=>false,o4(){},kn:()=>0,qd:.2});
  s.o.sk={40:1};s.o.rot=true;s.v.y=0;
  const target={x:100,y:0,r:12};
  assert.equal(s.aD(stats,target,100),0);assert.equal(s.l.dash,undefined);
  s.o.slots=[main.id,dash.id];s.o.rot=false;
  assert.equal(s.aD(stats,target,100),0);
  s.o.rot=true;s.hA=()=>true;s.l.manTgt=target;
  assert.equal(s.aD(stats,target,100),0);
  s.hA=()=>false;s.l.manTgt=null;
  assert.ok(s.aD(stats,target,100)>0);assert.equal(s.l.dash.a,dash);
});
