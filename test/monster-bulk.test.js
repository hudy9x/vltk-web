const {test}=require('node:test');const assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const {buildSync}=require('esbuild');
const moduleScope={exports:{}};vm.runInNewContext(buildSync({entryPoints:['tools/map-tool/src/lib/monster-bulk.ts'],bundle:true,platform:'node',format:'cjs',write:false,alias:{'@game':path.resolve('src/client/maps')}}).outputFiles[0].text,{module:moduleScope,exports:moduleScope.exports,structuredClone,Map,Set});
const {bulkMonsterTargets,applyMonsterBulk}=moduleScope.exports;
const {monsterMapGroups}=require('../tools/map-tool/src/lib/monster-catalog.ts');
function fixture(){
 const profiles=[{id:'map-1',mapId:1,levelRange:[10,20],monsterIds:[34,38],bossId:31},{id:'private',mapId:1,levelRange:[150,159],monsterIds:[42],bossId:31},{id:'map-2',mapId:2,levelRange:[10,20],monsterIds:[34],bossId:31}];
 return {encounters:profiles,groups:monsterMapGroups([{id:1,spawns:[]},{id:2,spawns:[]}],profiles)};
}
test('bulk settings support current range, whole map and all visible maps, including bosses',()=>{
 const f=fixture();assert.equal(bulkMonsterTargets(f.groups,1,[10,20],'range').length,3);assert.equal(bulkMonsterTargets(f.groups,1,[10,20],'map').length,5);assert.equal(bulkMonsterTargets(f.groups,1,[10,20],'all').length,7);
 const selected=bulkMonsterTargets(f.groups,1,[10,20],'range');applyMonsterBulk(f,selected,{hp:10000,damage:200,xp:0});
 for(const id of [34,38,31]){const p=f.encounters[0].monsterProfiles[id];assert.equal(p.hp,10000);assert.equal(p.damage,200);assert.equal(p.xp,0);}
 assert.equal(f.encounters[1].monsterProfiles,undefined);assert.equal(f.encounters[2].monsterProfiles,undefined);
 f.encounters[0].monsterProfiles[34].hp=999;assert.equal(f.encounters[0].monsterProfiles[38].hp,10000);
});
test('bulk changes preserve advanced settings and reject invalid values without partial changes',()=>{
 const f=fixture(),targets=bulkMonsterTargets(f.groups,1,[10,20],'map');applyMonsterBulk(f,targets,{hp:100,damage:10,xp:50});
 f.encounters[0].monsterProfiles[34].attack.cooldown=2.5;f.encounters[0].monsterProfiles[34].res[0]=60;
 applyMonsterBulk(f,targets,{hp:200,damage:20,xp:100});assert.equal(f.encounters[0].monsterProfiles[34].attack.cooldown,2.5);assert.equal(f.encounters[0].monsterProfiles[34].res[0],60);
 const before=JSON.stringify(f.encounters);assert.throws(()=>applyMonsterBulk(f,targets,{hp:1.5,damage:1,xp:1}));assert.equal(JSON.stringify(f.encounters),before);
 f.encounters[1].monsterProfiles[42].growth.xp=1e8;const invalid=JSON.stringify(f.encounters);assert.throws(()=>applyMonsterBulk(f,targets,{hp:200,damage:20,xp:1e8}));assert.equal(JSON.stringify(f.encounters),invalid);
});
test('all-map scope deduplicates shared profiles and only uses provided visible groups',()=>{
 const f=fixture();f.groups[1].profiles.push(f.groups[0].profiles[0]);assert.equal(bulkMonsterTargets(f.groups,1,[10,20],'all').length,7);
 const targets=bulkMonsterTargets(f.groups.filter(g=>g.map.id===1),1,[10,20],'all');assert.equal(targets.length,5);
});
