import { useEffect, useRef, useState } from 'react';
import { npcCatalog, mapNpcs, getNpc, type NpcDefinition } from '../../../../src/client/npcs';
import type { AssetStore } from '@/lib/native';
import type { MapDefinition, Selection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';

function NpcThumbnail({ npc, assets }: { npc: NpcDefinition; assets: AssetStore }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const context = canvas.current?.getContext('2d'), image = assets.imageFor(npc.image);
      if (!context) return;
      context.clearRect(0, 0, 72, 80);
      if (image.complete && image.naturalWidth) {
        const scale = Math.min(1.1, 68 / npc.width, 74 / npc.height);
        context.drawImage(image, 0, 0, npc.width, npc.height, (72 - npc.width * scale) / 2,
          78 - npc.height * scale, npc.width * scale, npc.height * scale);
      }
    };
    const unsubscribe = assets.subscribe(draw);
    draw();
    return unsubscribe;
  }, [npc, assets]);
  return <canvas ref={canvas} width={72} height={80} aria-label={npc.name} />;
}
export function NpcPanel({ map, assets, activeNpcId, selection, onChoose, onSelect, onRemove }: {
  map: MapDefinition; assets: AssetStore; activeNpcId: string; selection: Selection;
  onChoose(id: string): void; onSelect(selection: Selection): void;
  onRemove(id: string): void;
}) {
  const [search, setSearch] = useState('');
  const placements = mapNpcs(map);
  return <div className="npc-panel">
    <Input aria-label="Tìm NPC" placeholder="Tìm tên hoặc loại NPC…" value={search} onChange={event => setSearch(event.target.value)} />
    <p className="help-text">Chọn mẫu bên dưới, rồi bấm lên map để đặt. Dùng Chọn (V) để kéo NPC sang vị trí khác.</p>
    <div className="npc-library" role="group" aria-label="Thư viện NPC">
      {npcCatalog.filter(npc => `${npc.name} ${npc.category}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map(npc =>
        <Button key={npc.id} variant="outline" className="npc-card" aria-pressed={activeNpcId === npc.id} onClick={() => onChoose(npc.id)}>
          <NpcThumbnail npc={npc} assets={assets} />
          <strong>{npc.name}</strong><small>{npc.category}</small>
        </Button>)}
    </div>
    <div className="section-heading">NPC trên map · {placements.length}</div>
    {!placements.length && <p className="help-text">Chưa có NPC. Chọn một mẫu để bắt đầu.</p>}
    {placements.map(npc => <div key={npc.id} className="npc-placement-row"><Button variant={selection?.kind === 'npc' && selection.id === npc.id ? 'secondary' : 'ghost'}
      className="npc-placement" onClick={() => onSelect({ kind: 'npc', id: npc.id })}>
      <span>{getNpc(npc.npcId)?.name}<small>{npc.team === 'song' ? 'Phe Tống · ' : npc.team === 'jin' ? 'Phe Kim · ' : ''}{npc.id}</small></span>
      <small>{npc.position.x}, {npc.position.y}</small>
    </Button><Button variant="ghost" size="icon" className="npc-remove" aria-label={`Xóa ${getNpc(npc.npcId)?.name}${npc.team === 'song' ? ' · Tống' : npc.team === 'jin' ? ' · Kim' : ''}`}
      title="Xóa NPC khỏi map" onClick={() => onRemove(npc.id)}><Trash2 size={14} /></Button></div>)}
    <p className="help-text">Bấm thùng rác để xóa NPC khỏi map. ⌘/Ctrl+Z để hoàn tác; Lưu map để giữ thay đổi.</p>
  </div>;
}
