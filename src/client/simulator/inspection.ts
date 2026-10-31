import { describePoisonDamage } from '../combat/poison-summary';
import { POTENTIALS } from './build';
import type { Faction, LegacyRecord, SimulatorActor } from './types';

export const INSPECTION_TABS = { overview:'Tổng quan', equipment:'Trang bị', potential:'Tiềm năng', skills:'Kỹ năng' } as const;
export type InspectionTab = keyof typeof INSPECTION_TABS;
const slots: Record<string,string> = {weapon:'Vũ khí',helm:'Mũ',armor:'Áo',belt:'Đai',boot:'Giày',cuff:'Hộ uyển',pendant:'Ngọc bội',amulet:'Dây chuyền',ring1:'Nhẫn trái',ring2:'Nhẫn phải',bracelet1:'Bao tay trái',bracelet2:'Bao tay phải',horse:'Ngựa'};

/** Presentation cache only. Read the existing loadout; never invoke a stats/optimization engine. */
export function createSimInspectionCache(catalog: {factions:Record<string,Faction>;skills:Record<string,LegacyRecord>}, escape:(value:string)=>string,
  itemHTML?: (actor:SimulatorActor,item:LegacyRecord)=>string) {
  const cache = new WeakMap<SimulatorActor,{profile:SimulatorActor['profile'];stats:SimulatorActor['stats'];name:string;tabs:Partial<Record<InspectionTab,string>>}>();
  const number = (value:number) => Number.isFinite(value) ? Math.round(value).toLocaleString('vi-VN') : '—';
  const range = (skill:LegacyRecord|undefined) => skill && Number.isFinite(skill.tot) ? `${number(skill.tot*.85)} – ${number(skill.tot*1.15)}` : '—';
  const table = (headers:string[],rows:string[][]) => `<table><thead><tr>${headers.map(name=>`<th>${escape(name)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(value=>`<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  function html(actor:SimulatorActor,tab:InspectionTab = 'overview'):string {
    const profile=actor.profile,stats=actor.stats;
    let entry=cache.get(actor);
    if(!entry || entry.profile!==profile || entry.stats!==stats || entry.name!==actor.n) {
      entry={profile,stats,name:actor.n,tabs:{}};cache.set(actor,entry);
    }
    if(entry.tabs[tab]!==undefined)return entry.tabs[tab]!;
    let content:string;
    if(tab==='overview') {
      content=`<p><strong>${escape(actor.n)}</strong> · ${escape(catalog.factions[profile.fac]?.n || profile.fac)} · Cấp ${number(profile.lvl)} · Phe ${actor.battlefieldTeam==='song'?'Tống':'Kim'}</p>`+
        table(['Chỉ số','Giá trị'],[
          ['Lực tay trái',range(stats.basic)],['Lực tay phải',range(stats.main)],['Chiêu chính',escape(stats.main?.n || 'Đánh thường')],
          ['Sinh lực tối đa',number(stats.life)],['Nội lực tối đa',number(stats.mana)],['Chính xác',number(stats.ar)],['Né tránh',number(stats.def)],
        ])+'<p>Chỉ số của cấu hình hiện tại khi mở tab, bao gồm thưởng đang được áp dụng. Không phải sát thương thực nhận sau kháng.</p>'+ (describePoisonDamage(stats.main)?`<p>${escape(describePoisonDamage(stats.main))}</p>`:'');
    } else if(tab==='potential') {
      content=`<p>Điểm tiềm năng chưa cộng: ${number(profile.attrPts)}</p>`+table(['Thuộc tính','Đã cộng','Tổng hiện tại'],
        Object.entries(POTENTIALS).map(([key,name])=>[name,number(profile.attr[key]||0),number(stats[key]) ]));
    } else if(tab==='skills') {
      content=`<p>Điểm kỹ năng chưa cộng: ${number(profile.skPts)}</p>`+table(['Kỹ năng','Điểm đã cộng','Chiêu đang dùng'],
        Object.entries(profile.sk).filter(([,level])=>level>0).map(([id,level])=>[escape(catalog.skills[id]?.n || id),number(level),String(profile.main)===id?'✓':'']))+
        '<p>Điểm đã cộng lấy từ cấu hình SIM; không bao gồm cấp kỹ năng cộng thêm từ trang bị.</p>';
    } else {
      const items=Object.entries(profile.eq).filter(([,item])=>item);
      content=items.length ? items.map(([slot,item])=>`<details class="war-card"><summary>${escape(slots[slot]||slot)} · ${escape(item.n || 'Trang bị')}${item.enh?` +${number(item.enh)}`:''}</summary>${itemHTML ? itemHTML(actor,item) : `<p>${escape(item.n||'Trang bị')} · Cấp ${number(item.lvl)}</p>`}</details>`).join('') : '<p>SIM chưa mặc trang bị.</p>';
    }
    entry.tabs[tab]=content;return content;
  }
  return {html};
}
