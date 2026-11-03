import defaults from './monster-defaults.json';
import type { EncounterDefinition } from './types';
import type { MonsterBalance } from '@game/monster-balance';
export function defaultMonsterBalance(profile: EncounterDefinition, id: number, boss: boolean): MonsterBalance {
  const level=Math.max(1,Math.min(200,profile.levelRange[0]));
  const stats=(defaults.levels as Record<string,Record<string,{hp:number;damage:number;defense:number}>>)[level][boss?'boss':'normal'];
  return {...stats,speed:(defaults.speeds as Record<string,number>)[id]||54,
    res:Array(5).fill(Math.min(75,level*.35)) as MonsterBalance['res'],xp:level*5,
    attack:{element:'phys',range:45,cooldown:1.5},growth:{hp:0,damage:0,defense:0,xp:0}};
}
