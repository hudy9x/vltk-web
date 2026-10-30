// Regenerate when native support formulas change; Rust consumes the same golden catalog.
const fs=require('node:fs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const cases=[
  ['cuiyan-blade','cuiyan',[269,100,109,114,95,99,105,108,336],1],
  ['cuiyan-dual','cuiyan',[269,100,109,114,97,102,113,111,337],0],
  ['wudang','wudang',[159,160,157,166,152,153,164,165,365],0],
  ['kunlun','kunlun',[171,173,275,630,167,169,178,176,372],1],
  ['gaibang','gaibang',[129,277,130,360,115,119,124,125,359],2],
  ['wudu','wudu',[67,70,64,73,356,72,390,63],0],
  ['shaolin','shaolin',[10,15,16,20,21,273,4,11,319],2],
  ['emei','emei',[252,93,89,86,92,282,332],0],
  ['tianwang','tianwang',[33,40,42,36],0],
  ['tianren','tianren',[150],0],
];
const rows=cases.map(([name,fac,ids,weapon])=>{
  const profile={fac,lvl:150,sk:Object.fromEntries(ids.map(id=>[id,20])),slots:[ids.at(-1)],
    eq:{weapon:{d:0,k:weapon,lvl:1,nat:0,g:0,base:[],mag:[]}}};
  return {name,profile,resolved:catalog.character(profile)};
});
fs.writeFileSync('test/fixtures/multiplayer-support.json',JSON.stringify(rows,null,2)+'\n');
console.log('Generated native support fixtures:',rows.length);
// Independent native oracle for receiving the six shareable skills together.
const allyIds=[16,86,89,92,282,332];
const emei=rows.find(r=>r.name==='emei'),shaolin=rows.find(r=>r.name==='shaolin');
const allies=[...emei.resolved.support.skills,...shaolin.resolved.support.skills].filter(s=>allyIds.includes(s.id)).map(s=>[s.id,s.level]);
const receiving=rows.map(row=>{
  const active=row.resolved.support.skills.filter(s=>s.aura||!s.curse&&s.duration>=5).map(s=>s.id);
  const foreign=allies.filter(([id])=>!active.includes(id));
  const expected=catalog.character(row.profile,active.filter(id=>!row.resolved.support.skills.find(s=>s.id===id).aura),false,active.filter(id=>row.resolved.support.skills.find(s=>s.id===id).aura),foreign);
  return {name:row.name,allies:foreign,expected};
});
fs.writeFileSync('test/fixtures/multiplayer-allied-support.json',JSON.stringify(receiving,null,2)+'\n');
