import { Switch } from "@/components/ui/switch";
import { editableNpcs, mapNpcs, getNpc } from '../../../../src/client/npcs';
import { ensureMapListed } from "@/lib/progression";
import { useEffect, useState } from "react";
import { setSpawnMonster } from "@/lib/spawn-editing";
import { MonsterPicker } from "./MonsterPicker";
import type { AssetStore } from "@/lib/native";
import { Choice, NumberField } from "./Fields";
import { GameplayPanel } from "./GameplayPanel";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { objects } from "@/lib/model";
import type { EditorDocument, Selection, Workspace } from "@/lib/types";

interface Props {
  document: EditorDocument;
  selection: Selection;
  workspace: Workspace;
  assets: AssetStore;
  onEdit(edit: (document: EditorDocument) => void): void;
  onImport(target: { kind: "layer"; id: string } | { kind: "object" }): void;
  onDelete(): void;
}
export function Inspector({
  document,
  selection,
  workspace,
  assets,
  onEdit,
  onImport,
  onDelete,
}: Props) {
  const [tab, setTab] = useState("space");
  useEffect(() => { if (selection) setTab("space"); }, [selection]);
  const map = document.map;
  const npc = selection?.kind === 'npc' ? mapNpcs(map).find(npc => npc.id === selection.id) : undefined;
  const npcDefinition = npc && getNpc(npc.npcId);
  const selectedObject =
    selection?.kind === "object"
      ? objects(map).find(
          (item) =>
            item.layerId === selection.layerId &&
            item.object.id === selection.id,
        )
      : undefined;
  const spawn =
    selection?.kind === "spawn"
      ? map.spawns.find((point) => point.id === selection.id)
      : undefined;
  const spawnProfile = document.encounters.find((profile) => profile.id === spawn?.encounterId);
  const layer =
    selection?.kind === "layer"
      ? map.layers.find((layer) => layer.id === selection.id)
      : undefined;
  const profileOptions = document.encounters.map((profile) => ({
    value: profile.id,
    label: `${profile.name} · ${profile.id}`,
  }));
  const primaryIndex = document.progression.findIndex(
    (entry) => entry.mapId === map.id,
  );
  const alternate = document.progression.find((entry) =>
    entry.alternateMapIds.includes(map.id),
  );
  return (
    <aside className="inspector">
      <div className="pane-heading">
        <span>Thuộc tính</span>
        <Badge variant="outline">#{map.id}</Badge>
      </div>
      <div className="px-4 py-3 border-b space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="map-status">{map.status === "test" ? "Test" : "Available"}</Label>
          <Switch id="map-status" checked={map.status !== "test"} disabled={map.id === 37}
            onCheckedChange={(available) => onEdit((next) => { next.map.status = available ? "available" : "test"; })} />
        </div>
        <p className="help-text">{map.id === 37 ? "Biện Kinh luôn Available để nhận nhân vật dùng Thổ địa phù." : map.status === "test" ? "Chỉ chỉnh sửa trong tool. Game không tải map này." : "Sẵn sàng trong game sau khi Save. Game đang mở sẽ kiểm tra trạng thái mỗi 5 giây."}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
        <TabsList className="inspector-tabs">
          <TabsTrigger value="space">Không gian</TabsTrigger>
          <TabsTrigger value="gameplay">Gameplay</TabsTrigger>
          <TabsTrigger value="progression">Tiến trình</TabsTrigger>
        </TabsList>
        <ScrollArea className="min-h-0 flex-1">
          <div className="inspector-body">
            <TabsContent value="space" className="space-y-5 mt-0">
              {npc && npcDefinition ? <>
                <div className="section-heading"><span>{npcDefinition.name}</span><Button variant="ghost" size="icon" aria-label="Xóa NPC" onClick={onDelete}><Trash2 /></Button></div>
                <div className="quiet-code">{npc.id}</div>
                <p className="help-text">{npcDefinition.category} · Kéo trực tiếp trên map bằng công cụ Chọn (V).</p>
                <div className="two-fields">{(['x', 'y'] as const).map(axis => <NumberField key={axis} label={axis.toUpperCase()} value={npc.position[axis]}
                  min={0} max={axis === 'x' ? map.size.width - 1 : map.size.height - 1}
                  onChange={value => onEdit(next => { editableNpcs(next.map).find(item => item.id === npc.id)!.position[axis] = Math.round(value); })} />)}</div>
                <Choice label="Phe hiển thị" value={npc.team ?? 'all'} options={[{ value: 'all', label: 'Cả hai phe' }, { value: 'song', label: 'Tống' }, { value: 'jin', label: 'Kim' }]}
                  onChange={value => onEdit(next => { const item = editableNpcs(next.map).find(item => item.id === npc.id)!; if (value === 'all') delete item.team; else item.team = value as 'song' | 'jin'; })} />
                <Choice label="Hướng đứng" value={String(npc.direction ?? 0)} options={['Đông nam', 'Nam', 'Tây nam', 'Tây', 'Tây bắc', 'Bắc', 'Đông bắc', 'Đông'].slice(0, npcDefinition.directions).map((label, value) => ({ value: String(value), label: `${value} · ${label}` }))}
                  onChange={value => onEdit(next => { editableNpcs(next.map).find(item => item.id === npc.id)!.direction = Number(value); })} />
                <NumberField label="Tỉ lệ ảnh" min={0.1} step={0.1} value={npc.scale ?? npcDefinition.scale}
                  onChange={value => onEdit(next => { editableNpcs(next.map).find(item => item.id === npc.id)!.scale = value; })} />
                <Label className="check-row"><Checkbox checked={npc.animated ?? false}
                  onCheckedChange={value => onEdit(next => { editableNpcs(next.map).find(item => item.id === npc.id)!.animated = !!value; })} />Animation đứng nhẹ</Label>
                <p className="help-text">Ảnh tĩnh dùng khung đầu của sprite. Save lưu vị trí vào map; ⌘/Ctrl+Z để hoàn tác.</p>
              </> : selection?.kind === "spawns" ? (
                <>
                  <div className="section-heading">Chọn vùng spawn</div>
                  <p className="help-text">Đã chọn {selection.ids.length} điểm spawn. Chỉ các điểm trong khung được xóa; các điểm khác được giữ nguyên.</p>
                  <Button variant="destructive" className="w-full" onClick={onDelete}>
                    <Trash2 /> Xóa {selection.ids.length} điểm đã chọn
                  </Button>
                  <p className="help-text">Delete / Backspace để xóa · ⌘/Ctrl+Z để hoàn tác. Kéo khung mới để chọn vùng khác.</p>
                </>
              ) : selectedObject ? (
                <>
                  <div className="section-heading">
                    <span>World object</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDelete}
                      aria-label="Xóa object"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="quiet-code">{selectedObject.object.id}</div>
                  <div className="field">
                    <Label>Ảnh</Label>
                    <Input value={selectedObject.object.image} readOnly />
                  </div>
                  <div className="two-fields">
                    <NumberField
                      label="X"
                      value={selectedObject.object.position.x}
                      onChange={(value) =>
                        onEdit((next) => {
                          objects(next.map).find(
                            (item) =>
                              item.layerId === selectedObject.layerId &&
                              item.object.id === selectedObject.object.id,
                          )!.object.position.x = value;
                        })
                      }
                    />
                    <NumberField
                      label="Y"
                      value={selectedObject.object.position.y}
                      onChange={(value) =>
                        onEdit((next) => {
                          objects(next.map).find(
                            (item) =>
                              item.layerId === selectedObject.layerId &&
                              item.object.id === selectedObject.object.id,
                          )!.object.position.y = value;
                        })
                      }
                    />
                  </div>
                  <div className="two-fields">
                    <NumberField
                      label="Anchor X"
                      value={selectedObject.object.anchor.x}
                      onChange={(value) =>
                        onEdit((next) => {
                          objects(next.map).find(
                            (item) =>
                              item.layerId === selectedObject.layerId &&
                              item.object.id === selectedObject.object.id,
                          )!.object.anchor.x = value;
                        })
                      }
                    />
                    <NumberField
                      label="Anchor Y"
                      value={selectedObject.object.anchor.y}
                      onChange={(value) =>
                        onEdit((next) => {
                          objects(next.map).find(
                            (item) =>
                              item.layerId === selectedObject.layerId &&
                              item.object.id === selectedObject.object.id,
                          )!.object.anchor.y = value;
                        })
                      }
                    />
                  </div>
                  <div className="two-fields">
                    <NumberField
                      label="Scale"
                      value={selectedObject.object.scale}
                      min={0.01}
                      step={0.1}
                      onChange={(value) =>
                        onEdit((next) => {
                          objects(next.map).find(
                            (item) =>
                              item.layerId === selectedObject.layerId &&
                              item.object.id === selectedObject.object.id,
                          )!.object.scale = value;
                        })
                      }
                    />
                    <NumberField
                      label="Depth offset Y"
                      value={selectedObject.object.depthOffsetY}
                      onChange={(value) =>
                        onEdit((next) => {
                          objects(next.map).find(
                            (item) =>
                              item.layerId === selectedObject.layerId &&
                              item.object.id === selectedObject.object.id,
                          )!.object.depthOffsetY = value;
                        })
                      }
                    />
                  </div>
                  <p className="help-text">
                    Điểm gốc quyết định object che trước hay sau nhân vật. Ảnh
                    cần có nền trong suốt.
                  </p>
                  <Separator />
                  <Label className="check-row">
                    <Checkbox
                      checked={
                        !!document.project.colliders[
                          `${selectedObject.layerId}/${selectedObject.object.id}`
                        ]
                      }
                      onCheckedChange={(checked) =>
                        onEdit((next) => {
                          const key = `${selectedObject.layerId}/${selectedObject.object.id}`;
                          if (checked)
                            next.project.colliders[key] = {
                              radiusX: 24,
                              radiusY: 12,
                              offsetX: 0,
                              offsetY: 0,
                            };
                          else delete next.project.colliders[key];
                        })
                      }
                    />
                    Collider quanh gốc
                  </Label>
                  {document.project.colliders[
                    `${selectedObject.layerId}/${selectedObject.object.id}`
                  ] && (
                    <div className="two-fields">
                      {(
                        ["radiusX", "radiusY", "offsetX", "offsetY"] as const
                      ).map((key) => (
                        <NumberField
                          key={key}
                          label={key}
                          value={
                            document.project.colliders[
                              `${selectedObject.layerId}/${selectedObject.object.id}`
                            ][key]
                          }
                          min={key.startsWith("radius") ? 1 : undefined}
                          onChange={(value) =>
                            onEdit((next) => {
                              next.project.colliders[
                                `${selectedObject.layerId}/${selectedObject.object.id}`
                              ][key] = value;
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : spawn ? (
                <>
                  <div className="section-heading">
                    <span>Điểm xuất hiện</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDelete}
                      aria-label="Xóa spawn"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="quiet-code">{spawn.id}</div>
                  <div className="two-fields">
                    <NumberField
                      label="X"
                      value={spawn.position.x}
                      onChange={(value) =>
                        onEdit((next) => {
                          next.map.spawns.find(
                            (point) => point.id === spawn.id,
                          )!.position.x = value;
                        })
                      }
                    />
                    <NumberField
                      label="Y"
                      value={spawn.position.y}
                      onChange={(value) =>
                        onEdit((next) => {
                          next.map.spawns.find(
                            (point) => point.id === spawn.id,
                          )!.position.y = value;
                        })
                      }
                    />
                  </div>
                  <Choice
                    label="Encounter"
                    value={spawn.encounterId}
                    options={profileOptions}
                    onChange={(value) =>
                      onEdit((next) => {
                        next.map.spawns.find(
                          (point) => point.id === spawn.id,
                        )!.encounterId = value;
                      })
                    }
                  />
                  <Choice
                    label="Loại"
                    value={spawn.rank}
                    options={[
                      { value: "normal", label: "Quái thường" },
                      { value: "elite", label: "Tinh anh" },
                      { value: "boss", label: "Boss" },
                    ]}
                    onChange={(value) =>
                      onEdit((next) => {
                        next.map.spawns.find(
                          (point) => point.id === spawn.id,
                        )!.rank = value as typeof spawn.rank;
                      })
                    }
                  />
                  {spawnProfile && (
                    <MonsterPicker
                      label={spawn.rank === "boss" ? "Boss tại điểm này" : "Quái tại điểm này"}
                      value={spawn.rank === "boss" ? spawnProfile.bossId : spawnProfile.monsterIds.length === 1 ? spawnProfile.monsterIds[0] : undefined}
                      monsters={workspace.monsters}
                      encounters={document.encounters}
                      assets={assets}
                      onChange={(id) => onEdit((next) => setSpawnMonster(next, spawn.id, id))}
                    />
                  )}
                  <Button variant="destructive" className="w-full" onClick={onDelete}>
                    <Trash2 /> Xóa điểm spawn
                  </Button>
                  <NumberField
                    label="Xuất hiện sau (giây)"
                    min={0}
                    value={spawn.initialDelaySeconds}
                    onChange={(value) =>
                      onEdit((next) => {
                        next.map.spawns.find(
                          (point) => point.id === spawn.id,
                        )!.initialDelaySeconds = value;
                      })
                    }
                  />
                  <p className="help-text">
                    Đổi quái/boss ở đây chỉ áp dụng cho điểm đang chọn. Dùng nút Xóa hoặc phím Delete để xóa điểm này.
                  </p>
                </>
              ) : layer ? (
                <>
                  <div className="section-heading">
                    <span>Layer · {layer.type}</span>
                    {layer.type !== "ground" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        aria-label="Xóa layer"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  <div className="quiet-code">{layer.id}</div>
                  {"image" in layer && (
                    <>
                      <Input value={layer.image} readOnly />
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() =>
                          onImport({ kind: "layer", id: layer.id })
                        }
                      >
                        <ImagePlus />
                        Chọn ảnh layer
                      </Button>
                    </>
                  )}
                  {"opacity" in layer || layer.type !== "world" ? (
                    <NumberField
                      label="Opacity"
                      value={"opacity" in layer ? (layer.opacity ?? 1) : 1}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(value) =>
                        onEdit((next) => {
                          const target = next.map.layers.find(
                            (item) => item.id === layer.id,
                          );
                          if (target && target.type !== "world")
                            target.opacity = value;
                        })
                      }
                    />
                  ) : null}
                  {layer.type === "atmosphere" && (
                    <Label className="field">
                      <span>Màu phủ</span>
                      <Input
                        value={layer.color}
                        onChange={(event) =>
                          onEdit((next) => {
                            const target = next.map.layers.find(
                              (item) => item.id === layer.id,
                            );
                            if (target?.type === "atmosphere")
                              target.color = event.target.value;
                          })
                        }
                      />
                    </Label>
                  )}
                  {layer.type === "world" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onImport({ kind: "object" })}
                    >
                      <ImagePlus />
                      Thêm object từ ảnh
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="section-heading">Bản đồ</div>
                  <Label className="field">
                    <span>Tên bản đồ</span>
                    <Input
                      value={map.name}
                      onChange={(event) =>
                        onEdit((next) => {
                          next.map.name = event.target.value;
                        })
                      }
                    />
                  </Label>
                  <div className="two-fields">
                    <NumberField
                      label="Chiều rộng"
                      value={map.size.width}
                      min={32}
                      step={32}
                      onChange={(value) =>
                        onEdit((next) => {
                          if (next.project.paintedNavigation.kind !== "open")
                            throw new Error(
                              "Map có collision: cần giữ kích thước lưới hiện tại.",
                            );
                          next.map.size.width = value;
                          next.map.entry.x = Math.min(
                            next.map.entry.x,
                            value - 1,
                          );
                        })
                      }
                    />
                    <NumberField
                      label="Chiều cao"
                      value={map.size.height}
                      min={16}
                      step={16}
                      onChange={(value) =>
                        onEdit((next) => {
                          if (next.project.paintedNavigation.kind !== "open")
                            throw new Error(
                              "Map có collision: cần giữ kích thước lưới hiện tại.",
                            );
                          next.map.size.height = value;
                          next.map.entry.y = Math.min(
                            next.map.entry.y,
                            value - 1,
                          );
                        })
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      onImport({
                        kind: "layer",
                        id: map.layers.find((layer) => layer.type === "ground")!
                          .id,
                      })
                    }
                  >
                    <ImagePlus />
                    Thay ảnh nền
                  </Button>
                  <Separator />
                  <div className="section-heading">Điểm vào</div>
                  <div className="two-fields">
                    <NumberField
                      label="X"
                      value={map.entry.x}
                      onChange={(value) =>
                        onEdit((next) => {
                          next.map.entry.x = value;
                        })
                      }
                    />
                    <NumberField
                      label="Y"
                      value={map.entry.y}
                      onChange={(value) =>
                        onEdit((next) => {
                          next.map.entry.y = value;
                        })
                      }
                    />
                  </div>
                  <p className="help-text">
                    Chọn map luyện công hoặc về thành sẽ sử dụng điểm vào này.
                    Nếu bị chặn, game chọn vị trí đi được gần nhất.
                  </p>
                  <Separator />
                  <div className="section-heading">Spawn</div>
                  <p className="help-text">
                    {(map.spawnMode === "fixed" || map.spawns.length)
                      ? `${map.spawns.length} điểm cố định. Dùng công cụ Spawn để thêm điểm.`
                      : "Đang dùng bãi ngẫu nhiên. Thêm hoặc chọn một điểm sẽ giữ toàn bộ mẫu hiện tại để chỉnh sửa."}
                  </p>
                </>
              )}
            </TabsContent>
            <GameplayPanel
              assets={assets}
              document={document}
              workspace={workspace}
              onEdit={onEdit}
            />
            <TabsContent value="progression" className="space-y-4 mt-0">
              <div className="section-heading">Vị trí trong tiến trình</div>
              {primaryIndex >= 0 && workspace.progression.some((entry) => entry.mapId === map.id) ? (
                <>
                  <Badge variant="secondary">
                    Map chính · vị trí {primaryIndex + 1}
                  </Badge>
                  <p className="help-text">
                    Giữ nguyên thứ tự để tương thích stage trong save. Không xóa
                    hoặc đảo map chính từ editor.
                  </p>
                </>
              ) : (
                <Choice
                  label="Phân loại map"
                  value={primaryIndex >= 0 ? "primary" : alternate ? `alt-${alternate.mapId}` : "standalone"}
                  options={[
                    {
                      value: "standalone",
                      label: "Ẩn khỏi danh sách luyện công",
                    },
                    {
                      value: "primary",
                      label: "Thêm cuối danh sách map chính",
                    },
                    ...document.progression.map((entry) => ({
                      value: `alt-${entry.mapId}`,
                      label: `Map phụ của ${workspace.maps.find((map) => map.id === entry.mapId)?.name || entry.mapId}`,
                    })),
                  ]}
                  onChange={(value) =>
                    onEdit((next) => {
                      // Only unsaved primary registrations are editable here.
                      next.progression = next.progression.filter((entry) => entry.mapId !== map.id);
                      for (const entry of next.progression)
                        entry.alternateMapIds = entry.alternateMapIds.filter(
                          (id) => id !== map.id,
                        );
                      if (value === "primary")
                        ensureMapListed(next);
                      else if (value.startsWith("alt-"))
                        next.progression
                          .find(
                            (entry) => entry.mapId === Number(value.slice(4)),
                          )!
                          .alternateMapIds.push(map.id);
                      const profile = next.encounters.find(
                        (profile) => profile.mapId === map.id,
                      );
                      if (profile) {
                        if (value.startsWith("alt-")) profile.alternate = true;
                        else delete profile.alternate;
                      }
                    })
                  }
                />
              )}
              <Separator />
              <div className="section-heading">Sau khi Save</div>
              <p className="help-text">
                Tool cập nhật JSON, danh sách map và build lại game. Map Available được gán làm map chính hoặc map phụ sẽ xuất hiện trong menu bản đồ luyện công. Reload game local để dùng dữ liệu mới.
              </p>
              <div className="quiet-code">
                src/client/maps/content/{map.id}/map.json
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}
