import type { MonsterMapGroup } from '@/lib/monster-catalog';
import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AssetStore } from '@/lib/native';
import type { MapDefinition } from '@/lib/types';
import { resolveMapAsset } from '@game/assets';

function MapPreview({ map, assets }: {map?: MapDefinition; assets: AssetStore}) {
  const container=useRef<HTMLSpanElement>(null);
  const [visible,setVisible]=useState(false),[,refresh]=useState(0);
  useEffect(()=>assets.subscribe(()=>refresh(n=>n+1)),[assets]);
  useEffect(()=>{
    if(!container.current)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
    },{rootMargin:'120px'});
    observer.observe(container.current);return()=>observer.disconnect();
  },[]);
  const ground=map?.layers.find(layer=>layer.type==='ground');
  const path=map&&ground&&'image' in ground?resolveMapAsset(map.id,ground.image):null;
  const image=visible&&path?assets.imageFor(path):null;
  return <span ref={container} className="monster-map-preview">
    {image?.src&&!assets.errors.has(path!)?<img src={image.src} alt="" loading="lazy"/>:<MapIcon size={22}/>}
  </span>;
}

export function MonsterMapList({ groups, selected, assets, onSelect }: {
  groups: MonsterMapGroup[]; selected?: number; assets: AssetStore;
  onSelect(id:number):void;
}) {
  const [search,setSearch]=useState('');
  const rows=groups.filter(group=>`${group.map.name} ${group.map.id} ${group.ranges.map(range=>range.join(' ')).join(' ')}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  return <aside className="monster-map-sidebar" aria-label="Map và dải level">
    <div className="monster-map-heading"><strong>Map · Dải level</strong><span>{groups.length}</span></div>
    <div className="monster-map-search"><Search size={15}/><Input aria-label="Tìm map hoặc dải level" placeholder="Tìm map, level…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="monster-map-list">
      {rows.map(group=>{
        const map=group.map,levels=group.ranges.map(range=>range.join('–')).join(' · ');
        return <button type="button" className="monster-map-card" key={map.id} aria-pressed={selected===map.id} aria-label={`${map.name} · ${levels?`Level ${levels}`:'Chưa có quái'}`} onClick={()=>onSelect(map.id)}>
          <MapPreview map={map} assets={assets}/>
          <span className="monster-map-caption"><strong>{map.name}</strong><span>{levels?`Level ${levels}`:'Chưa có quái'}</span></span>
        </button>;
      })}
      {!rows.length&&<p className="help-text p-4">Không tìm thấy map hoặc dải level.</p>}
    </div>
  </aside>;
}
