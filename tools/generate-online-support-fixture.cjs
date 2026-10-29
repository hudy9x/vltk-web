// Regenerate when native support formulas change; Rust consumes the same golden catalog.
const fs=require('node:fs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const cases=[
  ['cuiyan-blade','cuiyan',[269,100,109,114,95,99,105,108,336],1],
  ['cuiyan-dual','cuiyan',[269,100,109,114,97,102,113,111,337],0],
  ['wudang','wudang',[159,160,157,166,152,153,164,165,365],0],
  ['kunlun','kunlun',[171,173,275,630,167,169,178,176,372],1],
  ['gaibang','gaibang',[129,277,130,360,115,119,124,125,359],2],
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
