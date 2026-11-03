import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NumberField } from './Fields';
import { applyMonsterBulk, bulkMonsterTargets } from '@/lib/monster-bulk';
import type { MonsterBulkScope } from '@/lib/monster-bulk';
import type { MonsterMapGroup } from '@/lib/monster-catalog';
import type { EditorDocument } from '@/lib/types';
export function MonsterBulkEditor({groups,mapId,range,onEdit,document}:{document:EditorDocument;groups:MonsterMapGroup[];mapId:number;range:[number,number];onEdit(edit:(document:EditorDocument)=>void):void}) {
  const [scope,setScope]=useState<MonsterBulkScope>('map');
  const [values,setValues]=useState({hp:100,damage:10,xp:100});
  const [message,setMessage]=useState(''),[error,setError]=useState('');
  const targets=bulkMonsterTargets(groups,mapId,range,scope);
  return <details className="monster-bulk-editor rounded-lg border border-border p-4">
    <summary className="cursor-pointer select-none font-medium">Cài đặt hàng loạt</summary>
    <div className="space-y-4 pt-4">
      <div className="monster-range-list" role="group" aria-label="Phạm vi hàng loạt">
        {([['range','Dải level này'],['map','Map này'],['all','Tất cả map có ảnh']] as const).map(([value,label])=><Button key={value} variant={scope===value?'secondary':'outline'} aria-pressed={scope===value} onClick={()=>{setScope(value);setMessage('');setError('');}}>{label}</Button>)}
      </div>
      <div className="two-fields">{(['hp','damage','xp'] as const).map((key,i)=><NumberField key={key} label={`Hàng loạt · ${['Máu','Sát thương','EXP'][i]}`} integer value={values[key]} min={key==='hp'?1:0} max={key==='hp'?1e12:key==='damage'?1e9:1e8} onChange={value=>setValues(previous=>({...previous,[key]:value}))}/>)}</div>
      <p className="help-text">Áp dụng cùng ba giá trị cho {targets.length} cấu hình quái, gồm cả boss. Các thiết lập Advanced được giữ nguyên. Bạn có thể sửa riêng từng con sau đó.</p>
      <Button disabled={!targets.length} onClick={()=>{
        try{const draft={...document,encounters:structuredClone(document.encounters)};applyMonsterBulk(draft,targets,values);let applied=false;onEdit(next=>{next.encounters=draft.encounters;applied=true;});if(!applied)throw new Error('Đang có thao tác lưu hoặc thay đổi workspace. Hãy thử lại.');setError('');setMessage(`Đã áp dụng cho ${targets.length} cấu hình quái trong bản nháp. Bấm Lưu cấu hình để ghi vào file.`);}
        catch(e){setError(String(e));setMessage('');}
      }}>Áp dụng hàng loạt</Button>
      {message&&<p role="status" className="help-text">{message}</p>}{error&&<p role="alert">{error}</p>}
    </div>
  </details>;
}
