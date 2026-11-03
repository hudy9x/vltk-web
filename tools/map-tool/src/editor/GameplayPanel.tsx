import { MonsterBulkEditor } from './MonsterBulkEditor';
import { monsterMapGroups, monsterChoices } from '@/lib/monster-catalog';
import { MonsterMapList } from './MonsterMapList';
import { MonsterBalanceEditor } from './MonsterBalanceEditor';
import { MonsterPicker, MonsterImage } from "./MonsterPicker";
import type { AssetStore } from "@/lib/native";
import { useEffect, useState } from "react";
import { Copy, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { Choice, NumberField } from "./Fields";
import type {
  EditorDocument,
  Workspace,
  EncounterDefinition,
} from "@/lib/types";
interface Props {
  mode?: "map" | "monsters";
  document: EditorDocument;
  workspace: Workspace;
  assets: AssetStore;
  onEdit(edit: (document: EditorDocument) => void): void;
}
export function GameplayPanel({ document, workspace, assets, onEdit, mode = "map" }: Props) {
  const map = document.map;
  const [profileId, setProfileId] = useState('');
  const [selectedMapId,setSelectedMapId]=useState(map.id);
  const [monsterId,setMonsterId]=useState<number>();
  useEffect(() => {setProfileId('');setSelectedMapId(map.id);setMonsterId(undefined);}, [map.id]);
  const groups=monsterMapGroups(workspace.maps.map(candidate=>candidate.id===map.id?map:candidate),document.encounters);
  const visibleGroups=groups.filter(g=>{
    const ground=g.map.layers.find(layer=>layer.type==='ground');
    if(!ground||!('image' in ground))return false;
    return workspace.mapsWithArtwork?.includes(g.map.id) ?? true;
  });
  const group=visibleGroups.find(g=>g.map.id===selectedMapId)||visibleGroups.find(g=>g.map.id===map.id)||visibleGroups[0];
  const profile = mode==='monsters'
    ? group?.profiles.find(p=>p.id===profileId)||group?.profiles.find(p=>p.id===group.defaultProfileId)||group?.profiles[0]
    : document.encounters.find(p=>map.encounterId?p.id===map.encounterId:p.mapId===map.id);
  const choices=group&&profile?monsterChoices(group,profile.levelRange):[];
  const profileOptions = document.encounters.map((profile) => ({
    value: profile.id,
    label: `${profile.name} · cấp ${profile.levelRange.join("–")} · ${profile.id}`,
  }));
  const editProfile = (edit: (profile: EncounterDefinition) => void) => {
    if (profile)
      onEdit((next) => {
        const target = next.encounters.find((value) => value.id === profile.id);
        if (target) edit(target);
      });
  };
  const affectedMaps = profile
    ? workspace.maps
        .filter(
          (candidate) =>
            ((candidate.id === map.id ? map : candidate).encounterId || document.encounters.find(p=>p.mapId===candidate.id)?.id) === profile.id ||
            (candidate.id === map.id ? map : candidate).spawns.some((spawn) => spawn.encounterId === profile.id),
        )
        .map((candidate) => `#${candidate.id} ${candidate.name}`)
    : [];
  if (mode === 'map') return <TabsContent value="gameplay" className="space-y-4 mt-0">
    <div className="section-heading">Cấu hình quái của map</div>
    <Choice label="Dải cấp / nhóm quái" value={profile?.id || ''} options={profileOptions} onChange={id=>onEdit(next=>{next.map.encounterId=id;})}/>
    {profile&&<p className="help-text">Cấp {profile.levelRange.join('–')} · {profile.monsterIds.length} loại quái. Chỉnh HP, kháng, đòn đánh và EXP tại mục Monsters.</p>}
    <p className="help-text">Áp dụng cho quái sinh tự động. Điểm spawn đặt sẵn chọn cấu hình và cấp riêng trong phần thuộc tính điểm spawn.</p>
  </TabsContent>;
  const selectedMap=group?.map;
  return (
    <TabsContent value="gameplay" className="monster-catalog-layout">
      <MonsterMapList groups={visibleGroups} selected={selectedMap?.id} assets={assets} onSelect={id=>{setSelectedMapId(id);setProfileId('');setMonsterId(undefined);}}/>
      <div className="monster-settings-panel">
      <header className="monster-settings-heading"><h2>{selectedMap?.name||profile?.name||'Cấu hình quái'}</h2>{profile&&<p>Level {profile.levelRange.join('–')}</p>}</header>
      {group&&group.ranges.length>1&&<div className="monster-range-list" role="group" aria-label="Dải level của map">{group.ranges.map(range=><Button key={range.join(':')} variant={profile?.levelRange.join(':')===range.join(':')?'secondary':'outline'} aria-pressed={profile?.levelRange.join(':')===range.join(':')} onClick={()=>{setProfileId(group.profiles.find(p=>p.levelRange.join(':')===range.join(':'))!.id);setMonsterId(undefined);}}>Level {range.join('–')}</Button>)}</div>}
      {profile&&group&&<MonsterBulkEditor key={`${group.map.id}:${profile.levelRange.join(':')}`} document={document} groups={visibleGroups} mapId={group.map.id} range={profile.levelRange} onEdit={onEdit}/>}
      {profile ? (
        <MonsterBalanceEditor key={profile.id} profile={profile} monsters={workspace.monsters} assets={assets} onEdit={onEdit} choices={choices} selectedMonsterId={monsterId} onChoose={(profileId,id)=>{setProfileId(profileId);setMonsterId(id);}}>
          <p className="help-text">
            Map chịu ảnh hưởng: {affectedMaps.join(", ") || `#${profile.mapId}`}
            . Sửa chung sẽ cập nhật các map và spawn dùng chung cấu hình này.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const id = `map-${profile.mapId}-${crypto.randomUUID().slice(0, 6)}`;
              onEdit((next) => {
                next.encounters.push({...structuredClone(profile),id,mapId:selectedMap?.id??profile.mapId,name:`${profile.name} · bản sao`});
              });
              setProfileId(id);
            }}
          >
            <Copy />
            Nhân bản dải cấp
          </Button>
          <Label className="field">
            <span>Tên dải cấp</span>
            <Input
              value={profile.name}
              onChange={(event) =>
                editProfile((profile) => {
                  profile.name = event.target.value;
                })
              }
            />
          </Label>
          <div className="two-fields">
            <NumberField
              label="Level từ"
              min={1}
              max={200}
              value={profile.levelRange[0]}
              onChange={(value) =>
                editProfile((profile) => {
                  profile.levelRange[0] = value;
                })
              }
            />
            <NumberField
              label="Level đến"
              min={1}
              max={200}
              value={profile.levelRange[1]}
              onChange={(value) =>
                editProfile((profile) => {
                  profile.levelRange[1] = value;
                })
              }
            />
          </div>
          <MonsterPicker
            label="Boss"
            value={profile.bossId}
            monsters={workspace.monsters}
            encounters={document.encounters}
            assets={assets}
            onChange={(value) =>
              editProfile((profile) => {
                profile.bossId = value;
              })
            }
          />
          <Label>Quái thường</Label>
          <div className="monster-pool">
            {profile.monsterIds.map((id) => (
              <Badge key={id} variant="secondary">
                <MonsterImage
                  monster={workspace.monsters.find(
                    (monster) => monster.id === id,
                  )}
                  assets={assets}
                />
                {workspace.monsters.find((monster) => monster.id === id)
                  ?.name || `#${id}`}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5"
                  aria-label={`Bỏ quái ${id}`}
                  onClick={() =>
                    editProfile((profile) => {
                      profile.monsterIds = profile.monsterIds.filter(
                        (value) => value !== id,
                      );
                    })
                  }
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            ))}
          </div>
          <MonsterPicker
            label="Thêm loại quái"
            monsters={workspace.monsters}
            encounters={document.encounters}
            assets={assets}
            exclude={profile.monsterIds}
            onChange={(value) =>
              editProfile((profile) => {
                profile.monsterIds.push(value);
              })
            }
          />
          <Separator />
          <div className="section-heading">Trọng số trang bị ngũ hành</div>
          <div className="weight-fields">
            {["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"].map((label, index) => (
              <NumberField
                key={label}
                label={label}
                min={0}
                value={profile.equipmentElementWeights[index]}
                onChange={(value) =>
                  editProfile((profile) => {
                    profile.equipmentElementWeights[index] = value;
                  })
                }
              />
            ))}
          </div>
          <p className="help-text">
            Đây là tỉ lệ rơi trang bị, không phải phân bố ngũ hành quái. Chỉ số chiến đấu được cài riêng cho từng quái ở phía trên.
          </p>
        </MonsterBalanceEditor>
      ) : (
        <>
          <p className="help-text">Map này chưa có encounter.</p>
          <Button
            variant="outline"
            onClick={() =>
              onEdit((next) => {
                const source = workspace.encounters[0];
                next.encounters.push({
                  ...structuredClone(source),
                  id: `map-${selectedMap?.id??map.id}`,
                  mapId: selectedMap?.id??map.id,
                  name: selectedMap?.name??map.name,
                });
              })
            }
          >
            <Plus />
            Tạo encounter
          </Button>
        </>
      )}
      </div>
    </TabsContent>
  );
}
