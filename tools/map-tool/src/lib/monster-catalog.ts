import type { EncounterDefinition, MapDefinition } from './types';

export interface MonsterMapGroup {
  map: MapDefinition;
  profiles: EncounterDefinition[];
  defaultProfileId?: string;
  ranges: [number, number][];
}
export interface MonsterChoice {
  key: string;
  profileId: string;
  monsterId: number;
  boss: boolean;
  label?: string;
}
/** Map identity comes from map.json, never from a private spawn profile. */
export function monsterMapGroups(maps: MapDefinition[], profiles: EncounterDefinition[]): MonsterMapGroup[] {
  const unique = new Map(maps.map(map=>[map.id,map]));
  return [...unique.values()].map(map=>{
    const used = new Set(map.spawns.map(spawn=>spawn.encounterId));
    if(map.encounterId)used.add(map.encounterId);
    const members=profiles.filter(profile=>profile.mapId===map.id||used.has(profile.id));
    const primary=members.find(profile=>profile.id===map.encounterId)||members.find(profile=>profile.id===`map-${map.id}`)||members[0];
    const ranges=[...new Map(members.map(profile=>[profile.levelRange.join(':'),profile.levelRange])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    return {map,profiles:members,defaultProfileId:primary?.id,ranges};
  }).sort((a,b)=>(a.profiles.find(p=>p.id===a.defaultProfileId)?.levelRange[0]??Infinity)-(b.profiles.find(p=>p.id===b.defaultProfileId)?.levelRange[0]??Infinity)||a.map.id-b.map.id);
}

/** Include the monsters actually used by each fixed spawn, not unused inherited pools. */
export function monsterChoices(group: MonsterMapGroup, range: readonly [number,number]): MonsterChoice[] {
  const choices:MonsterChoice[]=[];
  for(const profile of group.profiles.filter(p=>p.levelRange[0]===range[0]&&p.levelRange[1]===range[1])){
    const spawns=group.map.spawns.filter(spawn=>spawn.encounterId===profile.id);
    const fixed=group.map.spawnMode==='fixed'||group.map.spawns.length>0;
    const ranks=fixed&&group.map.spawns.length?new Set(spawns.map(s=>s.rank)):new Set(['normal','boss']);
    const add=(monsterId:number,boss:boolean)=>choices.push({key:`${profile.id}:${boss?'boss':'monster'}:${monsterId}`,profileId:profile.id,monsterId,boss});
    if(ranks.has('normal')||ranks.has('elite'))for(const id of new Set(profile.monsterIds))add(id,false);
    if(ranks.has('boss'))add(profile.bossId,true);
  }
  // Distinct settings for the same monster remain explicitly selectable; never silently overwrite them.
  for(const choice of choices)if(choices.filter(c=>c.monsterId===choice.monsterId&&c.boss===choice.boss).length>1)
    choice.label=group.profiles.find(p=>p.id===choice.profileId)?.name;
  return choices;
}
