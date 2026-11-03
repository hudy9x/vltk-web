const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {monsterMapGroups,monsterChoices}=require('../tools/map-tool/src/lib/monster-catalog.ts');
const profiles=JSON.parse(fs.readFileSync('src/client/gameplay/encounters/catalog.json'));
const maps=fs.readdirSync('src/client/maps/content').filter(id=>/^\d+$/.test(id)).map(id=>JSON.parse(fs.readFileSync(`src/client/maps/content/${id}/map.json`)));
test('sidebar uses each physical map exactly once, retaining its independent level bands',()=>{
 const groups=monsterMapGroups(maps,profiles);assert.equal(groups.length,new Set(maps.map(m=>m.id)).size);assert.equal(new Set(groups.map(g=>g.map.id)).size,groups.length);
 const khl=groups.find(g=>g.map.id===9005),tty=groups.find(g=>g.map.id===9006);
 assert.deepEqual(khl.ranges,[[1,10],[150,170]]);assert.equal(khl.defaultProfileId,'map-9005');assert.equal(tty.profiles.length,1);
 assert.equal(khl.map.spawns.length,62);assert.equal(tty.map.spawns.length,0);
});
test('range cards preserve the exact profile owning each monster and do not expose inherited unused bosses',()=>{
 const group=monsterMapGroups(maps,profiles).find(g=>g.map.id===9005);
 const low=monsterChoices(group,[1,10]),high=monsterChoices(group,[150,170]);
 assert.deepEqual(low.map(c=>c.monsterId).sort((a,b)=>a-b),[34,38,42]);assert.equal(low.filter(c=>c.boss).length,0);
 assert.equal(high.length,5);assert.equal(high.filter(c=>c.boss).length,1);
 for(const choice of [...low,...high]){const profile=profiles.find(p=>p.id===choice.profileId);assert.ok(profile);assert.ok(choice.boss?profile.bossId===choice.monsterId:profile.monsterIds.includes(choice.monsterId));}
});
test('unused samples are gone while all live spawn references and their levels remain intact',()=>{
 for(const map of maps)for(const spawn of map.spawns)assert.ok(profiles.some(p=>p.id===spawn.encounterId),`${map.id}:${spawn.id}`);
 assert.equal(profiles.filter(p=>p.mapId===9006&&p.id.includes('-sample-')).length,0);
 assert.equal(profiles.some(p=>p.id==='map-9005-sample-boss-31'),false);
 const khl=maps.find(m=>m.id===9005),counts={};for(const spawn of khl.spawns){const p=profiles.find(p=>p.id===spawn.encounterId),level=spawn.level??p.levelRange[0];counts[level]=(counts[level]||0)+1;}
 assert.deepEqual(counts,{1:50,150:12});
});
test('maps sharing a profile stay separate; conflicting monster settings remain distinct selectable cards',()=>{
 const p={id:'shared',mapId:1,levelRange:[10,20],monsterIds:[34],bossId:31};
 const map=id=>({id,name:'map'+id,encounterId:'shared',spawns:[]});
 const groups=monsterMapGroups([map(1),map(2)],[p]);assert.equal(groups.length,2);assert.equal(groups[1].profiles[0].id,'shared');
 const duplicate={...p,id:'private',name:'Private',monsterProfiles:{34:{xp:200}}};
 const choices=monsterChoices({...groups[0],profiles:[p,duplicate]},[10,20]);
 assert.equal(choices.filter(c=>c.monsterId===34).length,2);assert.equal(new Set(choices.map(c=>c.key)).size,choices.length);
});
