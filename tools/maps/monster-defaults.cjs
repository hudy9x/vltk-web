// Regenerate editor suggestions when the legacy monster formula/catalog changes.
const fs=require('node:fs');
const native=require('../../src/server/multiplayer/definitions/runtime.cjs');
const catalog=native.catalog(),levels={};
for(let level=1;level<=200;level++){
  levels[level]={};
  for(const rank of ['normal','elite','boss']){
    const stats=native.monsterStats(level,rank);
    levels[level][rank]={hp:stats.hp,damage:stats.dmg*(rank==='normal'?.75:1),defense:stats.def};
  }
}
const speeds=Object.fromEntries(Object.entries(catalog.monsters).map(([id,m])=>[id,30+(m.run||6)*4]));
fs.writeFileSync('tools/map-tool/src/lib/monster-defaults.json',JSON.stringify({levels,speeds})+'\n');
