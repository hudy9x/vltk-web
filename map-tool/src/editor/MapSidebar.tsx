import { mapListForDraft } from "@/lib/presentation";
import type React from "react";
import {
  Map as MapIcon,
  Layers,
  Search,
  Plus,
  Copy,
  RefreshCw,
  FolderOpen,
  Sun,
  TreePine,
  EyeOff,
  Eye,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Choice } from "./Fields";
import { IconButton } from "./IconButton";
import type {
  Workspace,
  EditorDocument,
  Selection,
  MapDefinition,
} from "@/lib/types";
interface Props {
  workspace: Workspace | null;
  document: EditorDocument | null;
  busy: string;
  leftTab: "maps" | "layers";
  setLeftTab(value: "maps" | "layers"): void;
  search: string;
  setSearch(value: string): void;
  selection: Selection;
  setSelection(value: Selection): void;
  hidden: Set<string>;
  setHidden: React.Dispatch<React.SetStateAction<Set<string>>>;
  startNew(kind: "new" | "clone"): void;
  selectMap(map: MapDefinition): void;
  addLayer(type: string): void;
  onReload(): void;
  onImportObject(): void;
}
export function MapSidebar({
  workspace,
  document,
  busy,
  leftTab,
  setLeftTab,
  search,
  setSearch,
  selection,
  setSelection,
  hidden,
  setHidden,
  startNew,
  selectMap,
  addLayer,
  onReload,
  onImportObject,
}: Props) {
  return (
    <aside className="map-sidebar">
      <div className="sidebar-tabs">
        <Button
          variant={leftTab === "maps" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setLeftTab("maps")}
        >
          <MapIcon />
          Bản đồ{" "}
          <span className="tab-count">{workspace?.maps.length || 0}</span>
        </Button>
        <Button
          variant={leftTab === "layers" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setLeftTab("layers")}
        >
          <Layers />
          Layers
        </Button>
      </div>
      {leftTab === "maps" ? (
        <>
          <div className="sidebar-search">
            <Search size={14} />
            <Input
              placeholder="Tìm tên hoặc ID…"
              aria-label="Tìm bản đồ"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="sidebar-command">
            <Button
              variant="outline"
              size="sm"
              disabled={!workspace || !!busy}
              onClick={() => startNew("new")}
            >
              <Plus />
              Tạo map
            </Button>
            <IconButton
              label="Nhân bản map"
              disabled={!document || !!busy}
              onClick={() => startNew("clone")}
            >
              <Copy />
            </IconButton>
            <IconButton
              label="Tải lại workspace"
              disabled={!workspace || !!busy}
              onClick={() => onReload()}
            >
              <RefreshCw />
            </IconButton>
          </div>
          <ScrollArea className="map-list">
            <nav aria-label="Danh sách bản đồ">
              {mapListForDraft(
                workspace?.maps ?? [],
                document,
                workspace?.encounters ?? [],
                workspace?.progression ?? [],
              )
                .filter(({ map }) =>
                  `${map.id} ${map.name}`
                    .toLocaleLowerCase("vi")
                    .includes(search.toLocaleLowerCase("vi")),
                )
                .map(({ map, kind, levelRange }) => (
                  <Button
                    key={map.id}
                    variant="ghost"
                    className={`map-row ${kind} ${document?.map.id === map.id ? "selected" : ""}`}
                    disabled={!!busy}
                    onClick={() => selectMap(map)}
                  >
                    <div className="map-row-icon">
                      <MapIcon size={17} />
                    </div>
                    <div>
                      <span>{map.name}</span>
                      <small>
                        #{map.id} <span>·</span>{" "}
                        {levelRange
                          ? `Cấp ${levelRange[0]}–${levelRange[1]}`
                          : "Chưa gán cấp"}
                        {kind === "alternate"
                          ? " · Map phụ"
                          : kind === "standalone"
                            ? " · Ngoài tiến trình"
                            : ""}
                      </small>
                    </div>
                    {document?.map.id === map.id && (
                      <span className="active-line" />
                    )}
                  </Button>
                ))}
            </nav>
          </ScrollArea>
          <div className="sidebar-footer">
            <FolderOpen size={13} />
            <span title={workspace?.root}>
              {workspace?.root.split("/").pop() || "Chưa kết nối workspace"}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="sidebar-command">
            <Choice
              value=""
              label="Thêm layer"
              options={[
                { value: "world", label: "World · object theo độ sâu" },
                { value: "shadow", label: "Shadow · bóng mặt đất" },
                {
                  value: "foreground",
                  label: "Foreground · luôn che trước",
                },
                { value: "atmosphere", label: "Atmosphere · lớp màu" },
              ]}
              onChange={addLayer}
            />
          </div>
          <ScrollArea className="map-list">
            {document?.map.layers.map((layer) => (
              <div className="layer-row" key={layer.id}>
                <Button
                  variant="ghost"
                  className={`layer-label ${selection?.kind === "layer" && selection.id === layer.id ? "selected" : ""}`}
                  onClick={() => setSelection({ kind: "layer", id: layer.id })}
                >
                  {layer.type === "atmosphere" ? (
                    <Sun />
                  ) : layer.type === "world" ? (
                    <TreePine />
                  ) : (
                    <Layers />
                  )}
                  <div>
                    {layer.type}
                    <small>{layer.id}</small>
                  </div>
                </Button>
                <IconButton
                  label={hidden.has(layer.id) ? "Hiện layer" : "Ẩn layer"}
                  onClick={() =>
                    setHidden((previous) => {
                      const next = new Set(previous);
                      if (next.has(layer.id)) next.delete(layer.id);
                      else next.add(layer.id);
                      return next;
                    })
                  }
                >
                  {hidden.has(layer.id) ? <EyeOff /> : <Eye />}
                </IconButton>
                {layer.type === "world" &&
                  layer.objects.map((object) => (
                    <Button
                      key={object.id}
                      variant="ghost"
                      className="object-row"
                      onClick={() =>
                        setSelection({
                          kind: "object",
                          layerId: layer.id,
                          id: object.id,
                        })
                      }
                    >
                      <TreePine size={13} />
                      <span>{object.id}</span>
                    </Button>
                  ))}
              </div>
            ))}
          </ScrollArea>
          <div className="sidebar-command">
            <Button
              variant="outline"
              className="w-full"
              disabled={!document}
              onClick={() => {
                onImportObject();
              }}
            >
              <ImagePlus />
              Thêm object
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
