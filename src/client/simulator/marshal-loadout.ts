import type { LegacyRecord } from './types';
/** Catalog tier 90 attacks have native required level 80. Keep one weapon route. */
export function marshalLoadout(catalog:Record<string,LegacyRecord>,factions:LegacyRecord[],element:number,canAttack:(skill:LegacyRecord)=>boolean,kind:(skill:LegacyRecord)=>string,weapon:(skill:LegacyRecord)=>number|null){
  for(const faction of factions.filter(f=>!f.novice&&f.series===element)){
    const rows=faction.skills.map((id:number)=>catalog[id]).filter(Boolean);
    const early=rows.filter((s:LegacyRecord)=>s.req===80&&canAttack(s));
    const late=rows.filter((s:LegacyRecord)=>s.req===150&&canAttack(s));
    const support=rows.filter((s:LegacyRecord)=>['buff','aura'].includes(kind(s))).sort((a:LegacyRecord,b:LegacyRecord)=>b.req-a.req)[0];
    if(!support)continue;
    for(const attack of early){
      const advanced=late.find((s:LegacyRecord)=>weapon(s)===weapon(attack));
      if(advanced)return {faction:faction.key as string,attacks:[attack.id,advanced.id] as number[],support:support.id as number};
    }
  }
  throw new Error('Không có bộ chiêu 80, 150 và phụ trợ cho hệ Nguyên soái.');
}
