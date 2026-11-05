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

const {previewMonsterProgression,applyMonsterProgression}=moduleScope.exports;
function progressionFixture(){
 const profiles=[
  {id:'low',mapId:1,levelRange:[1,10],monsterIds:[34,38],bossId:31},
  {id:'mid',mapId:2,levelRange:[10,20],monsterIds:[34],bossId:31},
  {id:'same',mapId:3,levelRange:[10,20],monsterIds:[38],bossId:31},
  {id:'high',mapId:4,levelRange:[20,30],monsterIds:[34],bossId:31},
 ];
 const groups=monsterMapGroups(profiles.map(p=>({id:p.mapId,name:p.id,spawns:[]})),profiles);
 const stats={hp:{enabled:true,base:1000,factor:1.5},damage:{enabled:true,base:100,factor:1.3},defense:{enabled:false,base:50,factor:1.2},xp:{enabled:false,base:100,factor:1.2}};
 return {document:{encounters:profiles},groups,settings:{scope:'all',from:1,to:200,mode:'base',levelStep:10,bossFactor:10,stats}};
}
test('progression follows level milestones 1, 10, 20 and applies the Boss coefficient once',()=>{
 const {document,groups,settings}=progressionFixture(),before=JSON.stringify(document);
 const rows=previewMonsterProgression(document,groups,settings);
 assert.equal(JSON.stringify(document),before,'preview is pure');
 const get=(id,boss=false)=>rows.find(r=>r.profileId===id&&r.boss===boss);
 assert.equal(get('low').after.hp,1000);assert.equal(get('mid').after.hp,1500);assert.equal(get('same').after.hp,1500);assert.equal(get('high').after.hp,2250);
 assert.equal(get('mid',true).after.hp,15000);assert.equal(get('high',true).after.damage,1690);
 assert.equal(applyMonsterProgression(document,groups,settings),9);
 for(const row of rows)assert.deepEqual(document.encounters.find(p=>p.id===row.profileId).monsterProfiles[row.monsterId],row.after);
 const once=JSON.stringify(document);applyMonsterProgression(document,groups,settings);assert.equal(JSON.stringify(document),once,'base mode is repeatable');
});
test('level scope selects by range start and anchors the first included milestone',()=>{
 const {document,groups,settings}=progressionFixture();settings.scope='levels';settings.from=10;settings.to=19;
 const rows=previewMonsterProgression(document,groups,settings);assert.equal(rows.length,4);assert.ok(rows.every(row=>row.levelRange[0]===10&&row.after.hp===(row.boss?10000:1000)));
 applyMonsterProgression(document,groups,settings);assert.equal(document.encounters[0].monsterProfiles,undefined);assert.equal(document.encounters[3].monsterProfiles,undefined);
 settings.from=40;settings.to=50;assert.equal(previewMonsterProgression(document,groups,settings).length,0);
});
test('progression deduplicates shared profiles and respects actual fixed-spawn ranks',()=>{
 const {document,groups,settings}=progressionFixture();groups[1].profiles.push(groups[0].profiles[0]);groups[1].ranges.push([1,10]);
 assert.equal(previewMonsterProgression(document,groups,settings).length,9);
 groups[0].map.spawnMode='fixed';groups[0].map.spawns=[{encounterId:'low',rank:'boss'}];
 const low=previewMonsterProgression(document,[groups[0]],settings);assert.equal(low.length,1);assert.equal(low[0].boss,true);assert.equal(low[0].after.hp,10000);
});
test('multiplying current settings preserves normal variation and derives Boss from first normal',()=>{
 const {document,groups,settings}=progressionFixture();applyMonsterBulk(document,bulkMonsterTargets(groups,1,[1,10],'all'),{hp:100,damage:10,xp:50});
 const profile=document.encounters[0];profile.monsterProfiles[38].hp=200;profile.monsterProfiles[31].hp=9999;
 settings.mode='multiply';settings.stats.hp.base=2;settings.stats.damage.base=1.5;
 const rows=previewMonsterProgression(document,groups,settings).filter(row=>row.profileId==='low');
 assert.equal(rows.find(row=>row.monsterId===34).after.hp,200);assert.equal(rows.find(row=>row.monsterId===38).after.hp,400);assert.equal(rows.find(row=>row.boss).after.hp,2000);
 assert.equal(rows.find(row=>row.boss).after.damage,150);
});
test('selected stats only: keep defense, EXP, attack, resists, speed and per-level growth',()=>{
 const {document,groups,settings}=progressionFixture();applyMonsterBulk(document,bulkMonsterTargets(groups,1,[1,10],'all'),{hp:100,damage:10,xp:50});
 const balance=document.encounters[0].monsterProfiles[31];balance.defense=345;balance.speed=90;balance.res[0]=60;balance.attack.element='cold';balance.attack.cooldown=2.5;balance.growth.hp=12;
 const old=structuredClone(balance);applyMonsterProgression(document,groups,settings);const next=document.encounters[0].monsterProfiles[31];
 for(const key of ['defense','xp','speed','res','attack','growth'])assert.deepEqual(next[key],old[key]);assert.equal(next.hp,10000);
 settings.stats.xp={enabled:true,base:0,factor:2};settings.stats.defense={enabled:true,base:50,factor:2};applyMonsterProgression(document,groups,settings);
 assert.equal(document.encounters[0].monsterProfiles[31].xp,0);assert.equal(document.encounters[3].monsterProfiles[31].defense,2000);
});
test('invalid settings, overflow and resolved end-level limits reject the whole batch atomically',()=>{
 const {document,groups,settings}=progressionFixture();
 for(const mutate of [s=>s.levelStep=0,s=>s.levelStep=1.5,s=>s.bossFactor=NaN,s=>s.bossFactor=.5,s=>{s.scope='levels';s.from=30;s.to=10;},s=>s.stats.hp.base=1.2,s=>s.stats.hp.factor=Infinity,s=>s.stats.hp.factor=.9,s=>s.stats.hp.base=NaN,s=>Object.values(s.stats).forEach(stat=>stat.enabled=false),s=>s.stats.hp.factor=1e10]){
  const invalid=structuredClone(settings);mutate(invalid);const before=JSON.stringify(document);assert.throws(()=>applyMonsterProgression(document,groups,invalid));assert.equal(JSON.stringify(document),before);
 }
 applyMonsterBulk(document,bulkMonsterTargets(groups,1,[1,10],'all'),{hp:100,damage:10,xp:50});document.encounters[3].monsterProfiles[31].growth.hp=1e12;
 const before=JSON.stringify(document);assert.throws(()=>applyMonsterProgression(document,groups,settings));assert.equal(JSON.stringify(document),before);
});
test('progression validates missing profiles and fractional multiply factors without changing source snapshots',()=>{
 const {document,groups,settings}=progressionFixture();settings.mode='multiply';settings.stats.hp.base=.5;settings.stats.damage.base=1;
 assert.ok(previewMonsterProgression(document,groups,settings)[0].after.hp>0);
 const snapshot=structuredClone(document);applyMonsterProgression(document,groups,settings);assert.equal(snapshot.encounters[0].monsterProfiles,undefined);
 document.encounters.pop();assert.throws(()=>applyMonsterProgression(document,groups,settings),/Cấu hình quái đã thay đổi/);
});

const {seedMonsterProgressionBases}=moduleScope.exports;
test('changing the starting level seeds every base from the first normal in the current draft',()=>{
 const {document,groups,settings}=progressionFixture();
 applyMonsterBulk(document,bulkMonsterTargets(groups,1,[1,10],'all'),{hp:500,damage:80,xp:120});
 document.encounters[1].monsterProfiles[34].hp=7500;document.encounters[1].monsterProfiles[34].damage=450;document.encounters[1].monsterProfiles[34].defense=321;document.encounters[1].monsterProfiles[34].xp=0;
 settings.scope='levels';settings.from=10;
 const before=JSON.stringify(document),seeded=seedMonsterProgressionBases(document,groups,settings);
 assert.equal(seeded.stats.hp.base,7500);assert.equal(seeded.stats.damage.base,450);assert.equal(seeded.stats.defense.base,321);assert.equal(seeded.stats.xp.base,0);
 assert.equal(seeded.stats.defense.enabled,false);assert.equal(seeded.stats.hp.factor,1.5);assert.equal(seeded.bossFactor,10);assert.equal(settings.stats.hp.base,1000);assert.equal(JSON.stringify(document),before);
 const next=seedMonsterProgressionBases(document,groups,{...seeded,from:20});assert.equal(next.stats.hp.base,500);assert.equal(next.stats.damage.base,80);
 const backwards=seedMonsterProgressionBases(document,groups,{...next,from:10});assert.equal(backwards.stats.hp.base,7500);
 const rows=previewMonsterProgression(document,groups,seeded);assert.equal(rows.find(r=>r.profileId==='mid'&&!r.boss).after.hp,7500);assert.equal(rows.find(r=>r.profileId==='mid'&&r.boss).after.hp,75000);
});
test('base seeding handles missing exact levels and defaults without using Boss stats or changing multiply factors',()=>{
 const {document,groups,settings}=progressionFixture();settings.scope='levels';settings.from=11;
 const seeded=seedMonsterProgressionBases(document,groups,settings);
 const baseline=previewMonsterProgression(document,groups,{...settings,from:20}).find(r=>!r.boss).before;
 assert.equal(seeded.stats.hp.base,Math.round(baseline.hp));assert.equal(seeded.stats.damage.base,Math.round(baseline.damage));
 for(const patch of [{from:NaN},{from:0},{from:201},{from:1.5},{from:199},{mode:'multiply'},{scope:'all'}]){
  const input={...settings,...patch};assert.equal(seedMonsterProgressionBases(document,groups,input),input);
 }
 groups[3].map.spawnMode='fixed';groups[3].map.spawns=[{encounterId:'high',rank:'boss'}];
 const bossOnly=seedMonsterProgressionBases(document,[groups[3]],{...settings,from:20});assert.equal(bossOnly.stats.hp.base,Math.round(baseline.hp));
});
