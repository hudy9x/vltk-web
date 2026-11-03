import type { EditorDocument } from './types';
import { monsterChoices } from './monster-catalog';
import type { MonsterMapGroup } from './monster-catalog';
import { defaultMonsterBalance } from './monster-default';
import { validateMonsterBalance, resolveMonsterBalance } from '@game/monster-balance';
export type MonsterBulkScope = 'range' | 'map' | 'all';
export interface BasicMonsterValues { hp:number; damage:number; xp:number }
export function bulkMonsterTargets(groups:MonsterMapGroup[], selectedMap:number, range:readonly[number,number], scope:MonsterBulkScope) {
  const targets=new Map<string,{profileId:string;monsterId:number;boss:boolean}>();
  for(const group of groups){
    if(scope!=='all'&&group.map.id!==selectedMap)continue;
    for(const band of group.ranges){
      if(scope==='range'&&(band[0]!==range[0]||band[1]!==range[1]))continue;
      for(const choice of monsterChoices(group,band))
        targets.set(`${choice.profileId}:${choice.monsterId}`,{profileId:choice.profileId,monsterId:choice.monsterId,boss:choice.boss});
    }
  }
  return [...targets.values()];
}
/** Validate the whole operation before mutating the cloned draft; keep advanced values intact. */
export function applyMonsterBulk(document:EditorDocument, targets:ReturnType<typeof bulkMonsterTargets>, values:BasicMonsterValues):void {
  if(!Number.isSafeInteger(values.hp)||values.hp<1||values.hp>1e12||!Number.isSafeInteger(values.damage)||values.damage<0||values.damage>1e9||!Number.isSafeInteger(values.xp)||values.xp<0||values.xp>1e8)throw new Error('Máu, sát thương và EXP phải là số nguyên hợp lệ.');
  const changes=targets.map(target=>{
    const profile=document.encounters.find(p=>p.id===target.profileId);
    if(!profile)throw new Error('Cấu hình quái đã thay đổi. Hãy chọn lại phạm vi.');
    const balance={...structuredClone(profile.monsterProfiles?.[target.monsterId]||defaultMonsterBalance(profile,target.monsterId,target.boss)),...values};
    validateMonsterBalance(balance);resolveMonsterBalance(balance,profile.levelRange[0],profile.levelRange[1]);
    return {profile,monsterId:target.monsterId,balance};
  });
  for(const {profile,monsterId,balance}of changes){profile.monsterProfiles||={};profile.monsterProfiles[monsterId]=balance;}
}
