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
  document: EditorDocument;
  workspace: Workspace;
  onEdit(edit: (document: EditorDocument) => void): void;
}
export function GameplayPanel({ document, workspace, onEdit }: Props) {
  const map = document.map;
  const [profileId, setProfileId] = useState("");
  useEffect(() => setProfileId(""), [map.id]);
  const profile =
    document.encounters.find((profile) => profile.id === profileId) ||
    document.encounters.find((profile) => profile.mapId === map.id);
  const profileOptions = document.encounters.map((profile) => ({
    value: profile.id,
    label: `${profile.name} · ${profile.id}`,
  }));
  const monsterOptions = workspace.monsters.map((monster) => ({
    value: String(monster.id),
    label: `${monster.name} #${monster.id}`,
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
            candidate.id === profile.mapId ||
            candidate.spawns.some((spawn) => spawn.encounterId === profile.id),
        )
        .map((candidate) => `#${candidate.id} ${candidate.name}`)
    : [];
  return (
    <TabsContent value="gameplay" className="space-y-4 mt-0">
      <div className="section-heading">Encounter</div>
      <Choice
        value={profile?.id || ""}
        options={profileOptions}
        onChange={setProfileId}
      />
      {profile ? (
        <>
          <p className="help-text">
            Map chịu ảnh hưởng: {affectedMaps.join(", ") || `#${profile.mapId}`}
            . Sửa chung sẽ cập nhật các map và spawn tham chiếu profile này.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const id = `map-${map.id}-${crypto.randomUUID().slice(0, 6)}`;
              onEdit((next) => {
                const index = next.encounters.findIndex(
                  (item) => item.mapId === map.id,
                );
                next.encounters.splice(
                  index < 0 ? next.encounters.length : index,
                  0,
                  {
                    ...structuredClone(profile),
                    id,
                    mapId: map.id,
                    name: `${map.name} · riêng`,
                  },
                );
                for (const spawn of next.map.spawns)
                  if (spawn.encounterId === profile.id) spawn.encounterId = id;
              });
              setProfileId(id);
            }}
          >
            <Copy />
            Nhân bản profile riêng
          </Button>
          <Label className="field">
            <span>Tên profile</span>
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
              min={0}
              value={profile.levelRange[0]}
              onChange={(value) =>
                editProfile((profile) => {
                  profile.levelRange[0] = value;
                })
              }
            />
            <NumberField
              label="Level đến"
              min={0}
              value={profile.levelRange[1]}
              onChange={(value) =>
                editProfile((profile) => {
                  profile.levelRange[1] = value;
                })
              }
            />
          </div>
          <Choice
            label="Boss"
            value={String(profile.bossId)}
            options={monsterOptions}
            onChange={(value) =>
              editProfile((profile) => {
                profile.bossId = Number(value);
              })
            }
          />
          <Label>Quái thường</Label>
          <div className="monster-pool">
            {profile.monsterIds.map((id) => (
              <Badge key={id} variant="secondary">
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
          <Choice
            label="Thêm loại quái"
            value=""
            options={monsterOptions.filter(
              (option) => !profile.monsterIds.includes(Number(option.value)),
            )}
            onChange={(value) =>
              editProfile((profile) => {
                profile.monsterIds.push(Number(value));
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
            Đây là tỉ lệ rơi trang bị, không phải phân bố ngũ hành quái. HP,
            damage và scaling vẫn do game tính.
          </p>
        </>
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
                  id: `map-${map.id}`,
                  mapId: map.id,
                  name: map.name,
                });
              })
            }
          >
            <Plus />
            Tạo encounter
          </Button>
        </>
      )}
    </TabsContent>
  );
}
