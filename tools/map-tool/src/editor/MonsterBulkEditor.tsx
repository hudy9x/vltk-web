import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Choice } from './Fields';
import { applyMonsterProgression, MONSTER_BULK_STATS, previewMonsterProgression, seedMonsterProgressionBases } from '@/lib/monster-bulk';
import type { MonsterProgressionSettings } from '@/lib/monster-bulk';
import type { MonsterMapGroup } from '@/lib/monster-catalog';
import type { EditorDocument } from '@/lib/types';

const labels = {hp:'Máu', damage:'Sát thương', defense:'Phòng thủ', xp:'EXP'};
const limits = {hp:1e12, damage:1e9, defense:1e9, xp:1e8};
const format = (value:number) => value.toLocaleString('vi-VN');
function initialSettings(groups:MonsterMapGroup[]):MonsterProgressionSettings {
  const ranges=groups.flatMap(group=>group.ranges);
  return {scope:'all',from:Math.min(200,...ranges.map(range=>range[0])),to:Math.max(1,...ranges.map(range=>range[1])),mode:'base',levelStep:10,bossFactor:10,
    stats:{hp:{enabled:true,base:1000,factor:1.5},damage:{enabled:true,base:100,factor:1.3},defense:{enabled:false,base:50,factor:1.2},xp:{enabled:false,base:100,factor:1.2}}};
}

export function MonsterBulkEditor({groups,onEdit,document}:{document:EditorDocument;groups:MonsterMapGroup[];onEdit(edit:(document:EditorDocument)=>void):void}) {
  const [open,setOpen]=useState(false);
  const [settings,setSettings]=useState(()=>initialSettings(groups));
  const [message,setMessage]=useState(''),[applyError,setApplyError]=useState('');
  const [expanded,setExpanded]=useState(false);
  const preview=useMemo(()=>{
    if(!open)return {changes:[],error:''};
    try{return {changes:previewMonsterProgression(document,groups,settings),error:''};}
    catch(error){return {changes:[],error:String(error)};}
  },[document,groups,settings,open]);
  const update=(edit:Partial<MonsterProgressionSettings>)=>{
    setSettings(previous=>{
      const next={...previous,...edit};
      return edit.from!==undefined||edit.scope!==undefined||edit.mode!==undefined
        ? seedMonsterProgressionBases(document,groups,next) : next;
    });
    setMessage('');setApplyError('');setExpanded(false);
  };
  const selected=MONSTER_BULK_STATS.filter(key=>settings.stats[key].enabled);
  const rows=expanded||preview.changes.length<=10?preview.changes:[...preview.changes.slice(0,6),...preview.changes.slice(-4)];
  const affectedMaps=new Set(preview.changes.flatMap(change=>groups.filter(group=>group.profiles.some(profile=>profile.id===change.profileId)).map(group=>group.map.id))).size;
  return <Dialog open={open} onOpenChange={value=>{setOpen(value);setMessage('');setApplyError('');}}>
    <DialogTrigger asChild><Button variant="outline" size="icon" aria-label="Cài đặt hàng loạt" title="Cài đặt hàng loạt" disabled={!groups.length}><SlidersHorizontal/></Button></DialogTrigger>
    <DialogContent className="monster-bulk-dialog">
      <DialogHeader><DialogTitle>Cài đặt quái hàng loạt</DialogTitle><DialogDescription>Tăng chỉ số theo level cho quái thường và Boss trong các map có ảnh.</DialogDescription></DialogHeader>
      <section className="space-y-3" aria-label="Phạm vi map">
        <div className="section-heading">Phạm vi map</div>
        <div className="monster-bulk-scope" role="group" aria-label="Chọn phạm vi">
          {([['all','Toàn bộ map'],['levels','Theo dải level']] as const).map(([scope,label])=><Button key={scope} variant={settings.scope===scope?'secondary':'outline'} aria-pressed={settings.scope===scope} onClick={()=>update({scope})}>{label}</Button>)}
        </div>
        {settings.scope==='levels'&&<div className="two-fields">
          <Label className="field"><span>Level bắt đầu</span><Input type="number" min={1} max={200} step={1} value={Number.isNaN(settings.from)?'':settings.from} onChange={event=>update({from:event.target.valueAsNumber})}/></Label>
          <Label className="field"><span>Level kết thúc</span><Input type="number" min={1} max={200} step={1} value={Number.isNaN(settings.to)?'':settings.to} onChange={event=>update({to:event.target.valueAsNumber})}/></Label>
        </div>}
        <p className="help-text">Chọn theo level đầu của từng dải quái. Phạm vi độc lập với ô tìm kiếm map.</p>
        {settings.scope==='levels'&&settings.mode==='base'&&<p className="help-text">Đổi level bắt đầu sẽ tự điền giá trị gốc từ quái thường đầu tiên của map đầu tiên trong dải. Chưa có cấu hình riêng thì dùng chỉ số mặc định. Bạn có thể sửa lại các giá trị bên dưới.</p>}
      </section>
      <section className="space-y-3" aria-label="Quy luật tăng">
        <div className="section-heading">Quy luật tăng</div>
        <div className="two-fields">
          <Choice label="Cách tính" value={settings.mode} options={[{value:'base',label:'Từ giá trị gốc'},{value:'multiply',label:'Nhân cấu hình hiện tại'}]} onChange={mode=>update({mode:mode as MonsterProgressionSettings['mode'],stats:Object.fromEntries(MONSTER_BULK_STATS.map(key=>[key,{...settings.stats[key],base:mode==='multiply'?1:initialSettings(groups).stats[key].base}])) as MonsterProgressionSettings['stats']})}/>
          <Label className="field"><span>Mỗi bước level</span><Input type="number" min={1} max={200} step={1} value={Number.isNaN(settings.levelStep)?'':settings.levelStep} onChange={event=>update({levelStep:event.target.valueAsNumber})}/></Label>
        </div>
        <p className="help-text">Bước đầu dùng giá trị gốc. Mỗi mốc level tiếp theo nhân thêm hệ số; các map cùng level dùng cùng mức tăng.</p>
      </section>
      <section className="space-y-3" aria-label="Chỉ số áp dụng">
        <div className="section-heading">Chỉ số áp dụng</div>
        <div className="monster-bulk-stat-grid">
          <span>Chỉ số</span><span>{settings.mode==='base'?'Giá trị gốc':'Hệ số ban đầu'}</span><span>Hệ số / bước</span>
          {MONSTER_BULK_STATS.map(key=><div className="monster-bulk-stat-row" key={key}>
            <Label><Checkbox checked={settings.stats[key].enabled} onCheckedChange={checked=>update({stats:{...settings.stats,[key]:{...settings.stats[key],enabled:checked===true}}})}/>{labels[key]}</Label>
            {(['base','factor'] as const).map(field=><Input key={field} type="number" aria-label={`${labels[key]} · ${field==='base'?(settings.mode==='base'?'Giá trị gốc':'Hệ số ban đầu'):'Hệ số mỗi bước'}`} disabled={!settings.stats[key].enabled} min={field==='factor'?1:key==='hp'&&settings.mode==='base'?1:0} max={field==='base'&&settings.mode==='base'?limits[key]:undefined} step={field==='base'&&settings.mode==='base'?1:.05} value={Number.isNaN(settings.stats[key][field])?'':settings.stats[key][field]} onChange={event=>update({stats:{...settings.stats,[key]:{...settings.stats[key],[field]:event.target.valueAsNumber}}})}/>)}
          </div>)}
        </div>
        <Label className="field"><span>Hệ số Boss ×</span><Input type="number" min={1} step={.5} value={Number.isNaN(settings.bossFactor)?'':settings.bossFactor} onChange={event=>update({bossFactor:event.target.valueAsNumber})}/></Label>
        <p className="help-text">Boss = chỉ số quái thường cùng dải × hệ số Boss, chỉ với chỉ số đã chọn. Khi nhân cấu hình hiện tại, Boss lấy quái thường đầu tiên trong cấu hình làm mốc. Kháng, đòn đánh và mức cộng mỗi cấp được giữ nguyên.</p>
      </section>
      <section className="monster-bulk-preview space-y-3" aria-label="Xem trước kết quả">
        <div className="monster-bulk-preview-heading"><strong>Xem trước</strong><span className="help-text">{affectedMaps} map · {preview.changes.filter(change=>!change.boss).length} quái · {preview.changes.filter(change=>change.boss).length} Boss</span></div>
        {preview.error?<p role="alert" className="text-destructive">{preview.error}</p>:!rows.length?<p className="help-text">Không có cấu hình quái trong phạm vi này.</p>:<>
          <p className="help-text">Chỉ số cũ → mới tại cấp đầu dải; thứ tự từ thấp đến cao.</p>
          <div className="monster-bulk-table-wrap"><table><thead><tr><th>Map · Level · Quái</th>{selected.map(key=><th key={key}>{labels[key]}</th>)}</tr></thead><tbody>{rows.map((change,index)=><tr key={`${change.profileId}:${change.monsterId}`}>
            <td>{!expanded&&preview.changes.length>10&&index===6&&<div className="help-text">… các cấu hình ở giữa …</div>}<strong>{change.mapNames.join(', ')}</strong><small>Level {change.levelRange.join('–')} · {change.boss?'Boss':'Quái'} #{change.monsterId}</small></td>
            {selected.map(key=><td key={key}><span className="help-text">{format(change.before[key])} →</span><br/>{format(change.after[key])}</td>)}
          </tr>)}</tbody></table></div>
          {preview.changes.length>10&&<Button variant="ghost" onClick={()=>setExpanded(!expanded)}>{expanded?'Thu gọn':`Xem đủ ${preview.changes.length} cấu hình`}</Button>}
        </>}
      </section>
      <div className="monster-bulk-footer"><p className="help-text">Áp dụng vào bản nháp · Có thể Undo<br/>Bấm Lưu cấu hình để ghi vào file.</p><div><Button variant="outline" onClick={()=>{update(initialSettings(groups));}}>Đặt lại</Button><Button disabled={!!preview.error||!preview.changes.length} onClick={()=>{
        try {
          const draft={...document,encounters:structuredClone(document.encounters)};
          const count=applyMonsterProgression(draft,groups,settings);
          let applied=false;
          onEdit(next=>{next.encounters=draft.encounters;applied=true;});
          if(!applied)throw new Error('Đang lưu hoặc thay đổi workspace. Hãy thử lại.');
          setApplyError('');setMessage(`Đã áp dụng ${count} cấu hình vào bản nháp. Có thể Undo hoặc bấm Lưu cấu hình.`);
        } catch(error){setApplyError(String(error));setMessage('');}
      }}>Áp dụng hàng loạt</Button></div></div>
      {message&&<p role="status" className="help-text">{message}</p>}{applyError&&<p role="alert" className="text-destructive">{applyError}</p>}
    </DialogContent>
  </Dialog>;
}
