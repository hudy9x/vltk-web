import { applyWarOffense } from './war-offense';
import type { LegacyRecord } from './types';
/** Present authoritative active items on freshly calculated native stats. */
export function applyOnlineWarStats(stats:LegacyRecord,buffs:Partial<Record<string,number>> = {}) {
  const active=(kind:string)=>(buffs[kind]||0)>0;
  stats.warOffenseAfterSkill=true;
  applyWarOffense(stats,active);
  if(active('drum')) { stats.life*=1.3; for(const key of ['phys','poison','cold','fire','light'])stats.res[key]=(stats.res[key]||0)+30; }
  if(active('resistance'))for(const key of ['phys','poison','cold','fire','light'])stats.res[key]=(stats.res[key]||0)+20;
  for(const [kind,key] of [['physicalRes','phys'],['poisonRes','poison'],['coldRes','cold'],['fireRes','fire'],['lightRes','light']])if(active(kind))stats.res[key]=(stats.res[key]||0)+50;
  const attack=active('haste')||active('command')?1.5:active('attack')?1.25:1;
  stats.aspdP*=attack;stats.aspdC*=attack;stats.aspd=stats.aspdP;
  const movement=active('command')?1.3:active('movement')?1.25:active('sprint')?1.2:1;
  const foot=stats.speedFoot??stats.speed;
  stats.speed*=movement;stats.speedFoot=foot*movement;
  if(active('life'))stats.life+=500;
  if(active('evasion'))stats.def=(stats.def||0)+500;
  stats.warAccuracyAdd=active('accuracy')?500:0;
  stats.ar=(stats.ar||0)+stats.warAccuracyAdd;
  if(active('horn'))for(const key of ['retMelee','retMeleeP','retRangeP'])stats[key]=(stats[key]||0)*.8;
}
