const {test}:typeof import('node:test')=require('node:test');
const assert:typeof import('node:assert/strict')=require('node:assert/strict');
const vm:typeof import('node:vm')=require('node:vm');
const {compileTypeScriptEntry}:typeof import('../tools/build-app.js')=require('../tools/build-app.js');
const scope: {Recovery?:typeof import('../src/client/simulator/recovery.ts')}={};
vm.runInNewContext(compileTypeScriptEntry('simulator/recovery.ts','Recovery').code,scope);
const {recoverSimulator}=scope.Recovery!;
import type { SimulatorActor } from '../src/client/simulator/types.ts';
const defaults:typeof import('../src/shared/sim-recovery.json')=require('../src/shared/sim-recovery.json');
const potions=[{kind:'life',tier:5,total:9999},{kind:'mana',tier:5,total:9999},{kind:'both',tier:4,total:9999,mtotal:9999},{kind:'both',tier:5,total:200,mtotal:150}];
function actor(){return {hp:100,mana:100,max:1000,stats:{mana:1000,main:{cost:0}},profile:{lvl:200}} as SimulatorActor;}
test('SIM uses one Ngũ Hoa bottle for both resources, obeys urgent and ordinary intervals and stops at configured targets',()=>{
 const sim=actor(),settings=structuredClone(defaults),step=(dt:number)=>recoverSimulator(sim,dt,potions,{},.3,settings);
 step(0);assert.equal(sim.hp,300);assert.equal(sim.mana,250);assert.equal(sim.potionBag.life,29);assert.equal(sim.potionBag.mana,30);
 step(.299);assert.equal(sim.hp,300);step(.001);assert.equal(sim.hp,500);assert.equal(sim.mana,400);
 step(.3);assert.equal(sim.hp,500);step(.7);assert.equal(sim.hp,700);assert.equal(sim.mana,550);
 step(1);step(1);assert.equal(sim.hp,1000);assert.equal(sim.mana,850);
 const stock=sim.potionBag.life;step(1);assert.equal(sim.potionBag.life,stock);
 for(let n=0;n<60;n++){sim.hp=sim.mana=100;step(1);}
 assert.equal(sim.potionBag.life+sim.potionBag.mana,0);assert.equal(sim.hp,100);
});
test('disabled thresholds, missing fixed potion, death and resource caps do not cause extra consumption',()=>{
 const sim=actor(),settings=structuredClone(defaults);settings.life.enabled=settings.mana.enabled=false;
 recoverSimulator(sim,1,potions,{},.3,settings);assert.equal(sim.hp,100);assert.equal(sim.potionBag.life,30);
 recoverSimulator(sim,1,potions.slice(0,3),{},.3);assert.equal(sim.hp,100);
 sim.hp=0;recoverSimulator(sim,1,potions,{},.3);assert.equal(sim.hp,0);assert.equal(sim.potionBag.life,30);
 sim.hp=999;sim.mana=100;recoverSimulator(sim,1,potions,{},.3);assert.equal(sim.hp,1000);assert.equal(sim.mana,250);assert.equal(sim.potionBag.life,29);
});
test('private army creates the shared selected routes on each side and fills only remaining slots randomly',async()=>{
 const scope:any={};vm.runInNewContext(compileTypeScriptEntry('simulator/battlefield.ts','War').code,scope);
 const actors:any[]=[],created:any[]=[],hero={x:0,y:0};
 const war=scope.War.createBattlefield({actors:()=>actors,player:()=>hero,playerAlive:()=>true,playerDPS:()=>1,create(build:any,boss:any){const a={profile:{lvl:200},stats:{life:1000},max:1000,hp:1000};actors.push(a);if(boss===undefined)created.push(build);return a;},remove(){},position(){},enter(){},leave(){}});
 war.start('song');
 await war.addBothAsync({faction:'shaolin',level:200,strength:'normal',count:8,simRoster:['emei-healer','tianwang-spear','tianwang-spear']},()=>{},async()=>{});
 for(const team of ['song','jin']){const units=created.filter(build=>build.team===team);assert.equal(units.length,4);assert.deepEqual(units.slice(0,3).map(build=>build.simRoute),['emei-healer','tianwang-spear','tianwang-spear']);assert.equal(units[3].count,1);assert.ok(units[3].simRoute);}
});
test('healing aura benefits living same-side targets in range without stacking or duplicating their own native aura',()=>{
 const scope:any={};vm.runInNewContext(compileTypeScriptEntry('simulator/healing-aura.ts','Healing').code,scope);
 const target={x:0,y:0,hp:100,battlefieldTeam:'song'},source={x:100,y:0,hp:100,battlefieldTeam:'song',healingAura:500};
 const rate=(sources:any[])=>scope.Healing.simulatorHealingAura(target,sources);
 assert.equal(rate([source,{...source,healingAura:800}]),800);
 assert.equal(rate([{...source,battlefieldTeam:'jin'},{...source,dead:true},{...source,y:300}]),0);
 assert.equal(scope.Healing.simulatorHealingAura({...target,profile:{sk:{332:20}}},[source]),0);
 assert.equal(scope.Healing.simulatorHealingAura({...target,hp:0},[source]),0);
});
