const { resolveMonsterBalance } = require('../../../client/maps/monster-balance.ts');
/** Build the exact definition consumed by Rust, using legacy formulas only for unconfigured monsters. */
exports.monsterDefinition = function(native, source, encounter, id, rank, level) {
  const monster=source.monsters[id];
  if(!monster)throw new Error(`Unknown monster ${id}`);
  const authored=encounter?.monsterProfiles?.[id];
  const legacy=authored?null:native.monsterStats(level,rank);
  const balance=authored?resolveMonsterBalance(authored,encounter.levelRange[0],level):{
    hp:legacy.hp,damage:legacy.dmg*(rank==='normal'?.75:1),defense:legacy.def,
    speed:30+(monster.run||6)*4,res:Array(5).fill(Math.min(75,level*.35)),
    xp:Math.max(1,level*require('../../../shared/multiplayer/rules.json').rewards.xpPerMonsterLevel),
  };
  return {id,name:monster.n,level,series:native.monsterSeries(id),hp:balance.hp,damage:balance.damage,
    defense:balance.defense,speed:balance.speed,res:balance.res,xp:balance.xp,
    ...(balance.attack?{attack:balance.attack}:{}),respawnSeconds:rank==='boss'?180:undefined};
};
