import type { MonsterChoice } from '@/lib/monster-catalog';
import { MonsterImage } from './MonsterPicker';
import type { AssetStore } from '@/lib/native';
import type { Monster } from '@/lib/types';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { NumberField, Choice } from './Fields';
import type { EncounterDefinition, EditorDocument } from '@/lib/types';
import { MONSTER_ELEMENTS, resolveMonsterBalance } from '@game/monster-balance';
import type { MonsterBalance } from '@game/monster-balance';
import { defaultMonsterBalance } from '@/lib/monster-default';

export function MonsterBalanceEditor({ profile, monsters, assets, onEdit, children, choices, selectedMonsterId, onChoose }: {
  children?: ReactNode;
  choices?: MonsterChoice[];
  selectedMonsterId?: number;
  onChoose?(profileId:string,monsterId:number):void;
  profile: EncounterDefinition; monsters: Monster[]; assets: AssetStore;
  onEdit(edit: (document: EditorDocument) => void): void;
}) {
  const [selected, setSelected] = useState(0), [sampleLevel, setSampleLevel] = useState(profile.levelRange[0]);
  const ids=[...new Set([...profile.monsterIds,profile.bossId])];
  const available=choices?.filter(choice=>choice.profileId===profile.id).map(choice=>choice.monsterId)||ids;
  const requested=selectedMonsterId??selected;
  const id=available.includes(requested)?requested:(available[0]??ids[0]), first=Math.max(1,profile.levelRange[0]);
  const picked=choices?.find(c=>c.profileId===profile.id&&c.monsterId===id);
  const rank=(picked?.boss??(id===profile.bossId))?'boss':'normal';
  const fallback:MonsterBalance=defaultMonsterBalance(profile,id,rank==='boss');
  const configured=profile.monsterProfiles?.[id], balance=configured||fallback;
  const edit=(mutate:(value:MonsterBalance)=>void)=>onEdit(next=>{
    const target=next.encounters.find(p=>p.id===profile.id)!;
    target.monsterProfiles||={};const value=target.monsterProfiles[id]||structuredClone(fallback);
    mutate(value);
    for (const key of ['hp','damage','xp'] as const) value[key]=Math.round(value[key]);
    target.monsterProfiles[id]=value;
  });
  const previewLevel=Math.max(first,Math.min(profile.levelRange[1],sampleLevel));
  let preview:MonsterBalance|undefined, error='';
  try{preview=resolveMonsterBalance(balance,first,previewLevel);}catch(e){error=String(e);}
  return <section className="space-y-4">
    <div className="section-heading">Chỉ số và phần thưởng từng quái</div>
    <div className="monster-choice-grid" role="group" aria-label="Danh sách quái">
      {(choices??ids.map(monsterId=>({key:String(monsterId),profileId:profile.id,monsterId,boss:monsterId===profile.bossId,label:undefined}))).map(choice=>{
        const monsterId=choice.monsterId;
        const monster=monsters.find(m=>m.id===monsterId),name=monster?.name||`Quái #${monsterId}`;
        return <button type="button" key={choice.key} className="monster-choice-card" aria-label={`Chọn quái ${name}`} aria-pressed={id===monsterId&&choice.profileId===profile.id} onClick={()=>{setSelected(monsterId);onChoose?.(choice.profileId,monsterId);}}>
          <MonsterImage monster={monster} assets={assets}/>
          <span className="monster-choice-name">{name}</span>
          {choice.boss&&<span className="monster-choice-badge">Boss</span>}
          {choice.label&&<small className="help-text">{choice.label}</small>}
        </button>;
      })}
    </div>
    <p className="help-text">{configured?'Đang dùng cấu hình riêng.':'Đang kế thừa công thức cũ. Chỉnh một trường để tạo cấu hình riêng.'} Các giá trị dưới đây ứng với cấp {first}.</p>
    <div className="two-fields">
      {(['hp','damage','xp'] as const).map((key,i)=><NumberField key={key} label={['Máu','Sát thương','EXP'][i]} value={Math.round(balance[key])} integer min={key==='hp'?1:0} max={key==='xp'?1e8:undefined} step={1} onChange={v=>edit(p=>{p[key]=v;})}/>)}
    </div>
    {error&&<p role="alert">{error}</p>}
    <details className="rounded-lg border border-border p-4">
      <summary className="cursor-pointer select-none font-medium">Advanced</summary>
      <div className="space-y-4 pt-4">
        <div className="two-fields">
          <NumberField label="Phòng thủ" min={0} value={balance.defense} onChange={v=>edit(p=>{p.defense=v;})}/>
          <NumberField label="Tốc độ di chuyển" min={0} max={1000} value={balance.speed} onChange={v=>edit(p=>{p.speed=v;})}/>
        </div>
    <div className="section-heading">Kháng (%)</div>
    <div className="two-fields">{['Vật lý','Độc','Băng','Hỏa','Lôi'].map((label,i)=><NumberField key={label} label={label} value={balance.res[i]} min={-50} max={90} onChange={v=>edit(p=>{p.res[i]=v;})}/>)}</div>
    <Choice label="Đòn đánh" value={balance.attack.element} options={MONSTER_ELEMENTS.map((value,i)=>({value,label:['Đánh thường · vật lý','Độc kích','Băng kích','Hỏa kích','Lôi kích'][i]}))} onChange={v=>edit(p=>{p.attack.element=v as MonsterBalance['attack']['element'];})}/>
    <p className="help-text">Các đòn kích gây một hit trực tiếp theo hệ đã chọn; không tự tạo hiệu ứng độc duy trì, đóng băng hoặc kỹ năng nhiều tầng.</p>
    <div className="two-fields"><NumberField label="Tầm đánh (px)" min={1} max={1500} value={balance.attack.range} onChange={v=>edit(p=>{p.attack.range=v;})}/><NumberField label="Chu kỳ đánh (giây)" min={.1} max={120} step={.1} value={balance.attack.cooldown} onChange={v=>edit(p=>{p.attack.cooldown=v;})}/></div>
    <div className="section-heading">Cộng thêm mỗi cấp</div>
    <div className="two-fields">{(['hp','damage','defense','xp'] as const).map((key,i)=><NumberField key={key} label={['HP/cấp','Sát thương/cấp','Phòng thủ/cấp','EXP/cấp'][i]} min={0} value={balance.growth[key]} onChange={v=>edit(p=>{p.growth[key]=v;})}/>)}</div>
    <NumberField label="Xem trước ở cấp" min={first} max={profile.levelRange[1]} value={previewLevel} onChange={setSampleLevel}/>
    {preview&&<p className="help-text">Cấp {previewLevel}: HP {preview.hp.toLocaleString('vi-VN')} · Sát thương {preview.damage.toLocaleString('vi-VN')} · EXP {preview.xp.toLocaleString('vi-VN')}/quái.</p>}
    {configured&&<Button variant="outline" onClick={()=>onEdit(next=>{delete next.encounters.find(p=>p.id===profile.id)!.monsterProfiles![id];})}>Khôi phục công thức cũ</Button>}
    {children}
      </div>
    </details>
  </section>;
}
