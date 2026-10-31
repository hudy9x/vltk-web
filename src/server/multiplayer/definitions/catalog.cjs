const native = require('./runtime.cjs'),
  fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const elements = ['phys', 'poison', 'cold', 'fire', 'light'];
const rules = require('../../../shared/multiplayer/rules.json');
const { goldDropRange } = require('../../../client/gameplay/gold-loot.ts');
const { linearProjectile } = require('./projectiles.cjs');
const characterCache=new Map();
exports.character = function (profile, activeBuffs = [], includeSupport = true, activeAuras = null, allies = []) {
  let cacheKey;
  if(includeSupport){
    const {xp,gold,warSupplies,potStock,potUsed,onlinePotionSpent,attrPts,skPts,...combatProfile}=profile;
    cacheKey=JSON.stringify([combatProfile,allies]);
    if(characterCache.has(cacheKey)){
      const result=structuredClone(characterCache.get(cacheKey));
      const potions=require('./consumables.cjs').potions(profile,native.potions());
      result.potions=potions;if(profile.warSupplies)result.warSupplies=structuredClone(profile.warSupplies);else delete result.warSupplies;
      for(const variant of result.support.variants){variant.profile.potions=structuredClone(potions);if(profile.warSupplies)variant.profile.warSupplies=structuredClone(profile.warSupplies);else delete variant.profile.warSupplies;}
      return result;
    }
  }
  const { stats, skills, moveSpeed, supports, attackTimings, timing, allyScaling, followups } = native.buildCharacter(profile,activeBuffs,activeAuras,allies);
  const result = {
    ...(profile.warSupplies?{warSupplies:structuredClone(profile.warSupplies)}:{}),
    allyScaling,
    level: profile.lvl,
    alignment:native.alignment(profile.fac),
    series:stats.series,
    protection:{rangedReflect:stats.retRangeP||0,from:elements.map((_,i)=>stats.from?.[i]||0),coldReduction:stats.freezeRed||0,stunReduction:stats.stunRed||0,poisonReduction:stats.poisonRed||0,manaShield:stats.manaShield||0,reflect:stats.retMelee||0,reflectPercent:stats.retMeleeP||0,
      absorption:stats.sorb||0,damageShield:stats.dmgShield||0,damageToMana:stats.dmg2mana||0},
    potions: require('./consumables.cjs').potions(profile,native.potions()),
    hp: stats.life,
    mp: stats.mana,
    regen: stats.regen,
    manaRegen: stats.manaRegen,
    speed: moveSpeed,
    timing,
    defense: stats.def,
    res: elements.map((k) => stats.res[k] || 0),
    skills: skills.map((s,index) => {
      const contact = native.contactGeometry(s), geo = contact.geometry;
      return ({
      id: s.id,...(followups?.[s.id]?.length?{followups:followups[s.id].map(event=>({...event,parts:elements.map(k=>event.parts[k]||0)}))}:{}),...(s.useAR?{accuracy:{rating:s.ar||stats.ar||0,ignore:s.ignore||0}}:{}),...(s.curse?{curse:s.curse}:{}),
      level:s.L||1,missiles:Math.max(1,Math.min(16,s.nMis||1)),melee:s.melee!==false,phys:s.phys!==false,
      pve: {
        ...native.damageRules(),series:s.series??stats.series,
        seriesResistance:s.series5||0,anti:elements.map(k=>stats.anti?.[k]||0),
        resistanceCap:Math.max(0,75-(stats.antiMax||0)/4),
        flatSeries:stats.series5||0,heavyChance:Math.max(0,Math.min(100,(stats.heavy||0)+(s.fatal||0))),
        versus:elements.map((_,i)=>stats.me2?.[i]||0),spread:.15,
      },
      leech: ((s.basic||s.wpn)?stats.leech||0:0)+(s.skLeech||0),
      manaLeech: ((s.basic||s.wpn)?stats.manaLeech||0:0)+(s.skMLeech||0),
      cost: s.cost || 0,
      cooldown: Math.max(s.cd || 0, attackTimings[index].cycleSeconds),
      castCooldown: s.cd || 0,
      attackPercent: 100 * (s.rawRate ?? s.rate ?? 1),
      geometry: {scale:contact.scale,castYRatio:contact.castYRatio,impactYScale:contact.impactYScale,...(contact.impactOffsetY?{impactOffsetY:contact.impactOffsetY}:{}),ignoreTerrain:contact.ignoreTerrain},
      range: s.geo?.k === 'self' ? s.geo.r || s.rad || 75 : s.rad || 75,
      radius: (geo?.r || 0) * contact.scale,
      shape: geo?.k || 'single',
      targets: Math.max(1, Math.min(32, s.targets || 1)),
      projectile: s.curse?null:linearProjectile(s,contact),
      parts: elements.map((k) => s.parts[k] || 0),
      crit: Math.max(0, Math.min(100, s.crit || 0)),
      stun: Math.max(0, Math.min(100, (s.stun || 0) + (stats.stunAdd || 0))),
      cold: s.parts.cold > 0 ? (s.coldT || 1.5) + (stats.coldEnh || 0) / 18 : 0,
      stunSeconds: .8 * (1 + (stats.stunLong || 0) / 100),
      poison: s.parts.poison > 0 ? s.poisonT || 3 : 0,
      travel: s.melee ? 0 : Math.min(1.5, (s.rad || 300) / 500),
    }); }),
  };
  if(includeSupport){
    const persistent=supports.filter(s=>!s.curse&&(s.aura||s.duration>=5));
    if(persistent.length>8)throw new Error('Too many simultaneous self buffs');
    result.support={skills:supports,variants:Array.from({length:1<<persistent.length},(_,mask)=>{
      const active=persistent.filter((_,i)=>mask&(1<<i)).map(s=>s.id);
      return {active:active.slice().sort((a,b)=>a-b),profile:exports.character(profile,active.filter(id=>!supports.find(s=>s.id===id).aura),false,active.filter(id=>supports.find(s=>s.id===id).aura),allies)};
    })};
  }
  if(includeSupport){if(characterCache.size>=32)characterCache.delete(characterCache.keys().next().value);characterCache.set(cacheKey,structuredClone(result));}
  return result;
};
let cachedWorld;
exports.world = function () {
  if (cachedWorld) return cachedWorld;
  const source = native.catalog(),
    progression = JSON.parse(fs.readFileSync(path.join(root, 'src/client/maps/progression.json')));
  const states = JSON.parse(
    fs.readFileSync(path.join(root, 'src/client/maps/availability.json')),
  ).maps;
  const maps = [];
  const add = (id, zone) => {
    if (states[id] !== 'available') return;
    const file = path.join(root, `src/client/maps/content/${id}/map.json`);
    if (!fs.existsSync(file)) return;
    const map = JSON.parse(fs.readFileSync(file));
    const level = Math.max(1, zone?.lo || 1),
      stats = native.monsterStats(level);
    maps.push({
      id,
      level,
      town: id === source.town,
      width: map.size.width,
      height: map.size.height,
      entry: map.entry,
      grid: map.navigation,
      monsters: (zone?.m || [])
        .filter((id) => source.monsters[id])
        .map((id) => ({
          id,
          name: source.monsters[id].n,
          series: native.monsterSeries(id),
          level,
          hp: stats.hp,
          damage: stats.dmg * 0.75,
          defense: stats.def,
          speed: 30 + (source.monsters[id].run || 6) * 4,
          res: elements.map(() => Math.min(75, level * 0.35)),
          xp: Math.max(1, level * rules.rewards.xpPerMonsterLevel),
          gold: goldDropRange(level).max,
          goldMin: goldDropRange(level).min,
        })),
    });
  };
  for (const entry of progression) {
    const zone = source.zones.find((z) => z.id === entry.mapId);
    add(entry.mapId, zone);
    for (const id of entry.alternateMapIds) add(id, zone);
  }
  if (!maps.some((m) => m.id === source.town)) add(source.town, null);
  add(9003,null);
  add(9004,null);
  return (cachedWorld = { version: 1, town: source.town, maps, battlefield: require("./battlefield.cjs").definition() });
};
