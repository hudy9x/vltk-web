import { stageLayerImage } from "@/lib/image-editing";
import { deleteMapLayer } from "@/lib/layer-editing";
import type { ZoomAction } from "@/lib/zoom";
import { ensureMapListed } from "@/lib/progression";
import { deleteSpawnPoints } from "@/lib/spawn-selection";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Map as MapIcon,
  Save,
  Plus,
  FolderOpen,
  MousePointer2,
  Hand,
  Paintbrush,
  Eraser,
  RectangleHorizontal,
  MapPin,
  Route,
  Play,
  BrickWall,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Loader2,
  ExternalLink,
  AlertCircle,
  Check,
  CircleDot,
  LassoSelect,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { IconButton } from "@/editor/IconButton";
import { MapSidebar } from "@/editor/MapSidebar";
import { MapCanvas } from "@/editor/MapCanvas";
import { Inspector } from "@/editor/Inspector";
import {
  AssetStore,
  base64,
  openWorkspace,
  readAsset,
  saveDocument,
} from "@/lib/native";
import {
  cloneDocument,
  documentKey,
  createDocument,
  newMap,
  objects,
  validateDocument,
} from "@/lib/model";
import { resolveMapAsset } from "@game/assets";
import type {
  EditorDocument,
  MapDefinition,
  Selection,
  Tool,
  Workspace,
} from "@/lib/types";
import "@/styles.css";

const tools: { id: Tool; label: string; key: string; icon: typeof Hand }[] = [
  { id: "select", label: "Chọn / di chuyển", key: "V", icon: MousePointer2 },
  { id: "pan", label: "Kéo canvas", key: "H", icon: Hand },
  { id: "block", label: "Tô vật cản", key: "B", icon: Paintbrush },
  { id: "erase", label: "Xóa vật cản", key: "E", icon: Eraser },
  {
    id: "rectangle",
    label: "Vật cản hình chữ nhật",
    key: "R",
    icon: RectangleHorizontal,
  },
  { id: "entry", label: "Đặt điểm vào", key: "I", icon: MapPin },
  { id: "spawn", label: "Đặt spawn", key: "S", icon: CircleDot },
  { id: "spawn-select", label: "Chọn vùng spawn", key: "Q", icon: LassoSelect },
  { id: "path", label: "Thử đường đi", key: "P", icon: Route },
  { id: "preview", label: "Thử di chuyển", key: "T", icon: Play },
];
export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [document, setDocument] = useState<EditorDocument | null>(null);
  const [baseline, setBaseline] = useState(""),
    [past, setPast] = useState<EditorDocument[]>([]),
    [future, setFuture] = useState<EditorDocument[]>([]);
  const [selection, setSelection] = useState<Selection>(null),
    [tool, setTool] = useState<Tool>("select");
  const [search, setSearch] = useState(""),
    [leftTab, setLeftTab] = useState<"maps" | "layers">("maps");
  const [hidden, setHidden] = useState<Set<string>>(new Set()),
    [showCollision, setShowCollision] = useState(false);
  const [collisionOpacity, setCollisionOpacity] = useState(65);
  const [brush, setBrush] = useState(3),
    [zoomCommand, setZoomCommand] = useState<{
      action: ZoomAction;
      serial: number;
    }>({ action: "fit", serial: 0 });
  const [status, setStatus] = useState({ x: 0, y: 0, zoom: 100 }),
    [message, setMessage] = useState("Sẵn sàng"),
    [error, setError] = useState("");
  const [busy, setBusy] = useState("Đang mở workspace…"),
    [workspaceDialog, setWorkspaceDialog] = useState(false),
    [root, setRoot] = useState("");
  const [newDialog, setNewDialog] = useState<"new" | "clone" | null>(null),
    [newId, setNewId] = useState(""),
    [newName, setNewName] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false),
    transition = useRef<(() => void) | null>(null);
  const assets = useRef(new AssetStore()).current,
    fileInput = useRef<HTMLInputElement>(null),
    importTarget = useRef<
      { kind: "layer"; id: string } | { kind: "object" } | null
    >(null);
  const closeConfirmed = useRef(false);
  const dirty = !!document && documentKey(document) !== baseline;
  const state = useRef({ document, dirty, busy });
  state.current = { document, dirty, busy };
  const accept = useCallback((next: Workspace, mapId?: number) => {
    setWorkspace(next);
    setRoot(next.root);
    const map =
      next.maps.find((map) => map.id === mapId) ||
      next.maps.find((map) => map.id === 2) ||
      next.maps[0];
    if (map) {
      const draft = createDocument(next, map);
      setDocument(draft);
      setBaseline(documentKey(draft));
      localStorage.setItem("map-tool:last-map", String(map.id));
    }
    setPast([]);
    setFuture([]);
    setSelection(null);
    setHidden(new Set());
  }, []);
  const connect = useCallback(
    async (path?: string) => {
      setBusy("Đang đọc map và catalog…");
      setError("");
      try {
        const next = await openWorkspace(path);
        assets.dispose();
        accept(next, Number(localStorage.getItem("map-tool:last-map")));
        localStorage.setItem("map-tool:workspace", next.root);
        setWorkspaceDialog(false);
        setMessage(`Đã mở ${next.maps.length} map`);
      } catch (error) {
        setError(String(error));
        setWorkspaceDialog(true);
      } finally {
        setBusy("");
      }
    },
    [accept, assets],
  );
  useEffect(() => {
    if (isTauri())
      void connect(localStorage.getItem("map-tool:workspace") || undefined);
    else {
      setBusy("");
      setError("Chạy bằng Tauri để mở và lưu workspace: pnpm tauri dev");
    }
    return () => assets.dispose();
  }, [connect, assets]);
  useEffect(() => {
    if (document) assets.syncPending(document.map.id, document.assets);
  }, [document, assets]);
  const change = useCallback((next: EditorDocument) => {
    const previous = state.current.document;
    if (
      state.current.busy ||
      !previous ||
      documentKey(previous) === documentKey(next)
    )
      return;
    setPast((past) => [...past.slice(-59), previous]);
    state.current.document = next;
    setDocument(next);
    setFuture([]);
    setError("");
    setMessage("Chưa lưu");
  }, []);
  const edit = (mutate: (document: EditorDocument) => void) => {
    if (!document || state.current.busy) return;
    try {
      const next = cloneDocument(document);
      mutate(next);
      change(next);
    } catch (error) {
      setError(String(error));
    }
  };
  const undo = () => {
    if (!document || !past.length) return;
    setDocument(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setFuture([document, ...future]);
    setMessage("Đã hoàn tác");
  };
  const redo = () => {
    if (!document || !future.length) return;
    setDocument(future[0]);
    setFuture(future.slice(1));
    setPast([...past, document]);
  };
  const requestTransition = (action: () => void) => {
    if (state.current.busy) return;
    if (state.current.dirty) {
      transition.current = action;
      setDiscardOpen(true);
    } else action();
  };
  const selectMap = (map: MapDefinition) =>
    requestTransition(() => {
      if (!workspace) return;
      const draft = createDocument(workspace, map);
      setDocument(draft);
      setBaseline(documentKey(draft));
      setPast([]);
      setFuture([]);
      setSelection(null);
      setHidden(new Set());
      setError("");
      setMessage("Sẵn sàng");
      localStorage.setItem("map-tool:last-map", String(map.id));
    });
  const save = async () => {
    if (!document || !workspace || busy) return;
    setBusy("Kiểm tra dữ liệu, lưu và build game…");
    setError("");
    try {
      const compiled = validateDocument(document);
      const next = await saveDocument(
        { ...document, map: compiled },
        workspace.revision,
        !workspace.maps.some((map) => map.id === compiled.id),
      );
      accept(next, compiled.id);
      setMessage(compiled.status === "test" ? "Đã lưu Test · map không được tải trong game." : "Đã lưu Available và build game. Reload game để cập nhật nội dung.");
    } catch (error) {
      setError(String(error));
      setMessage("Chưa lưu · bản sửa vẫn được giữ");
    } finally {
      setBusy("");
    }
  };
  const removeSelection = () => {
    if (!selection) return;
    edit((next) => {
      if (selection.kind === "object") {
        const layer = next.map.layers.find(
          (layer) => layer.id === selection.layerId,
        );
        if (layer?.type === "world")
          layer.objects = layer.objects.filter(
            (object) => object.id !== selection.id,
          );
        delete next.project.colliders[`${selection.layerId}/${selection.id}`];
      }
      if (selection.kind === "spawn") {
        deleteSpawnPoints(next, [selection.id]);
      }
      if (selection.kind === "spawns") deleteSpawnPoints(next, selection.ids);
      if (selection.kind === "layer") deleteMapLayer(next, selection.id);
    });
    setSelection(null);
  };
  const handlers = useRef({
    save,
    undo,
    redo,
    removeSelection,
    requestTransition,
  });
  handlers.current = { save, undo, redo, removeSelection, requestTransition };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (state.current.busy) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "s") {
        event.preventDefault();
        void handlers.current.save();
        return;
      }
      if (
        (event.target as HTMLElement).closest(
          'input,textarea,[contenteditable="true"],[role="combobox"]',
        )
      )
        return;
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) handlers.current.redo();
        else handlers.current.undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "y") {
        event.preventDefault();
        handlers.current.redo();
        return;
      }
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        handlers.current.removeSelection();
        return;
      }
      const selected = tools.find((tool) => tool.key.toLowerCase() === key);
      if (selected && !event.metaKey && !event.ctrlKey) {
        setTool(selected.id);
        if (["block", "erase", "rectangle"].includes(selected.id))
          setShowCollision(true);
      }
    };
    window.addEventListener("keydown", keydown);
    const beforeunload = (event: BeforeUnloadEvent) => {
      if (state.current.dirty && !closeConfirmed.current)
        event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeunload);
    let unsubscribe: (() => void) | undefined;
    if (isTauri())
      void getCurrentWindow()
        .onCloseRequested((event) => {
          if (closeConfirmed.current) return;
          if (state.current.busy) {
            event.preventDefault();
            return;
          }
          if (state.current.dirty) {
            event.preventDefault();
            handlers.current.requestTransition(() => {
              closeConfirmed.current = true;
              void getCurrentWindow().close();
            });
          }
        })
        .then((fn) => {
          unsubscribe = fn;
        });
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("beforeunload", beforeunload);
      unsubscribe?.();
    };
  }, []);
  const importImage = async (file: File) => {
    if (!document || !importTarget.current) return;
    try {
      if (
        !/\.(png|jpe?g|webp)$/i.test(file.name) ||
        file.size > 50 * 1024 * 1024
      )
        throw new Error("Chọn ảnh PNG, JPEG hoặc WebP dưới 50 MB.");
      const target = importTarget.current;
      const data = base64(await file.arrayBuffer());
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.src = url;
      await image.decode();
      URL.revokeObjectURL(url);
      const next = cloneDocument(document);
      if (target.kind === "layer") {
        const layer = next.map.layers.find(layer => layer.id === target.id);
        if (!layer || !("image" in layer)) throw new Error("Layer không có ảnh.");
        let originalData: string | undefined;
        if (!next.project.originalImages?.[target.id]) {
          originalData = next.assets.find(asset => asset.path === layer.image)?.data;
          if (!originalData) {
            try { originalData = base64(await readAsset(resolveMapAsset(next.map.id, layer.image))); }
            catch (error) { if (!String(error).includes("Không tìm thấy ảnh")) throw error; }
          }
        }
        stageLayerImage(next, target.id, data, crypto.randomUUID(), originalData);
      } else {
        const path = `./assets/${crypto.randomUUID().slice(0, 8)}-${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/^\.+/, "")}`;
        next.assets.push({ path, data, revision: crypto.randomUUID() });
        let layer = next.map.layers.find((layer) => layer.type === "world");
        if (!layer) {
          layer = {
            id: `world-${crypto.randomUUID().slice(0, 6)}`,
            type: "world",
            objects: [],
          };
          next.map.layers.push(layer);
        }
        if (layer.type === "world") {
          const id = `object-${crypto.randomUUID().slice(0, 6)}`;
          layer.objects.push({
            id,
            image: path,
            position: { ...next.map.entry },
            anchor: { x: image.naturalWidth / 2, y: image.naturalHeight },
            scale: 1,
            depthOffsetY: 0,
          });
          setSelection({ kind: "object", layerId: layer.id, id });
        }
      }
      change(next);
      setLeftTab("layers");
    } catch (error) {
      setError(String(error));
    }
  };
  const startNew = (kind: "new" | "clone") =>
    requestTransition(() => {
      setNewDialog(kind);
      setNewId(
        String(Math.max(0, ...workspace!.maps.map((map) => map.id)) + 1),
      );
      setNewName(
        kind === "clone" ? `${document?.map.name} · bản sao` : "Bản đồ mới",
      );
    });
  const createMap = async () => {
    if (!workspace || !newDialog) return;
    const id = Number(newId);
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      workspace.maps.some((map) => map.id === id) ||
      !newName.trim()
    ) {
      setError(
        "ID phải là số nguyên dương chưa được dùng và tên không được rỗng.",
      );
      return;
    }
    setBusy("Đang chuẩn bị map…");
    try {
      const source = newDialog === "clone" && document ? document : null;
      const next = source
        ? cloneDocument(source)
        : createDocument(workspace, newMap(id, newName.trim()));
      if (source) {
        const pending = new Map(
          source.assets.map((asset) => [asset.path, asset.data]),
        );
        const localImages = new Set(
          source.map.layers
            .flatMap((layer) =>
              "image" in layer
                ? [layer.image]
                : layer.type === "world"
                  ? layer.objects.map((object) => object.image)
                  : [],
            )
            .concat(Object.values(source.project.originalImages ?? {}))
            .filter((image) => image.startsWith("./")),
        );
        next.assets = [];
        for (const image of localImages) {
          const data =
            pending.get(image) ||
            base64(await readAsset(resolveMapAsset(source.map.id, image)));
          next.assets.push({ path: image, data });
          assets.addPending(id, image, data);
        }
      }
      const oldId = next.map.id;
      next.map.id = id;
      next.map.name = newName.trim();
      next.map.status = "test";
      next.project.mapId = id;
      const sourceProfile =
        next.encounters.find((profile) => profile.mapId === oldId) ||
        next.encounters[0];
      if (sourceProfile) {
        const profile = {
          ...structuredClone(sourceProfile),
          id: `map-${id}`,
          mapId: id,
          name: newName.trim(),
          alternate: undefined,
        };
        next.encounters.push(profile);
        for (const spawn of next.map.spawns)
          if (spawn.encounterId === sourceProfile.id)
            spawn.encounterId = profile.id;
      }
      ensureMapListed(next);
      setDocument(next);
      setBaseline("");
      setPast([]);
      setFuture([]);
      setSelection(null);
      setHidden(new Set());
      setNewDialog(null);
      setMessage("Map mới ở trạng thái Test · bật Available rồi Save để đưa vào game");
      setError("");
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy("");
    }
  };
  const addLayer = (type: string) => {
    edit((next) => {
      const id = `${type}-${crypto.randomUUID().slice(0, 6)}`;
      if (type === "world") next.map.layers.push({ id, type, objects: [] });
      else if (type === "atmosphere")
        next.map.layers.push({ id, type, color: "#e99552", opacity: 0.15 });
      else
        next.map.layers.push({
          id,
          type: type as "shadow" | "foreground",
          image: "./missing-layer.png",
          opacity: 1,
        });
      setSelection({ kind: "layer", id });
    });
  };
  const navigation = document?.project.paintedNavigation;
  return (
    <TooltipProvider delayDuration={250}>
      <div className="editor-shell dark">
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark">
              <MapIcon size={19} />
            </div>
            <div>
              <strong>Võ Lâm</strong>
              <span>Map Editor</span>
            </div>
          </div>
          <div className="header-document">
            {document?.map.name || "Workspace"}
            {dirty && <span className="unsaved-dot" title="Chưa lưu" />}
          </div>
          <div className="header-actions">
            <IconButton
              label="Hoàn tác · ⌘Z"
              disabled={!past.length || !!busy}
              onClick={undo}
            >
              <Undo2 />
            </IconButton>
            <IconButton
              label="Làm lại · ⇧⌘Z"
              disabled={!future.length || !!busy}
              onClick={redo}
            >
              <Redo2 />
            </IconButton>
            <span className="toolbar-divider" />
            <Button
              variant="ghost"
              size="sm"
              disabled={!!busy}
              onClick={() => requestTransition(() => setWorkspaceDialog(true))}
            >
              <FolderOpen />
              Workspace
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!workspace || !!busy}
              onClick={() => {
                void openUrl("http://127.0.0.1:3000").catch((error) =>
                  setError(String(error)),
                );
              }}
            >
              <ExternalLink />
              Mở game
            </Button>
            <Button
              size="sm"
              disabled={!document || !dirty || !!busy}
              onClick={() => {
                void save();
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Save />}Lưu map
              <span className="shortcut">⌘S</span>
            </Button>
          </div>
        </header>
        <div className="editor-main">
          <MapSidebar
            workspace={workspace}
            document={document}
            busy={busy}
            leftTab={leftTab}
            setLeftTab={setLeftTab}
            search={search}
            setSearch={setSearch}
            selection={selection}
            setSelection={setSelection}
            hidden={hidden}
            setHidden={setHidden}
            startNew={startNew}
            selectMap={selectMap}
            addLayer={addLayer}
            onDeleteLayer={(id) => {
              edit(next => { deleteMapLayer(next, id); });
              setSelection(null);
              setHidden(previous => { const next = new Set(previous); next.delete(id); return next; });
            }}
            onReload={() =>
              requestTransition(() => {
                void connect(workspace!.root);
              })
            }
            onImportObject={() => {
              importTarget.current = { kind: "object" };
              fileInput.current?.click();
            }}
          />
          <section className="canvas-area">
            <div className="canvas-toolbar" role="toolbar" aria-label="Công cụ bản đồ" aria-orientation="vertical">
              <div className="tools">
                {tools.map((item) => (
                  <IconButton tooltipSide="right"
                    key={item.id}
                    label={`${item.label} · ${item.key}`}
                    active={tool === item.id}
                    disabled={!document}
                    onClick={() => {
                      setTool(item.id);
                      if (["block", "erase", "rectangle"].includes(item.id))
                        setShowCollision(true);
                    }}
                  >
                    <item.icon />
                  </IconButton>
                ))}
              </div>
              <div className="view-tools">
                <IconButton tooltipSide="right"
                  label="Vật cản"
                  active={showCollision}
                  onClick={() => setShowCollision(!showCollision)}
                >
                  <BrickWall />
                </IconButton>
              </div>
              <div className="zoom-tools">
                <IconButton tooltipSide="right"
                  label="Thu nhỏ"
                  onClick={() =>
                    setZoomCommand((previous) => ({
                      action: "out",
                      serial: previous.serial + 1,
                    }))
                  }
                >
                  <ZoomOut />
                </IconButton>

                <span className="zoom-value" aria-label={`Mức zoom ${status.zoom}%`}>{status.zoom}%</span>
                <IconButton tooltipSide="right"
                  label="Phóng to"
                  onClick={() =>
                    setZoomCommand((previous) => ({
                      action: "in",
                      serial: previous.serial + 1,
                    }))
                  }
                >
                  <ZoomIn />
                </IconButton>
                <IconButton tooltipSide="right"
                  label="Vừa khung"
                  onClick={() =>
                    setZoomCommand((previous) => ({
                      action: "fit",
                      serial: previous.serial + 1,
                    }))
                  }
                >
                  <Maximize />
                </IconButton>

              </div>
            </div>
            <div className="canvas-workspace">
            {(["block", "erase", "rectangle"].includes(tool)) && (
              <div className="brush-bar" role="toolbar" aria-label="Tùy chọn vật cản">
                {(tool === "block" || tool === "erase") && (
                  <div className="brush-option">
                    <Label htmlFor="brush-size">Cọ {brush}</Label>
                    <Slider id="brush-size" aria-label="Cỡ cọ" value={[brush]} min={1} max={15} step={2}
                      onValueChange={value => setBrush(value[0])} className="w-28" />
                  </div>
                )}
                <div className="brush-option">
                  <Label htmlFor="collision-opacity">Đậm {collisionOpacity}%</Label>
                  <Slider id="collision-opacity" aria-label="Độ đậm vật cản" value={[collisionOpacity]}
                    min={0} max={100} step={5} className="w-28"
                    onValueChange={value => setCollisionOpacity(value[0])} />
                </div>
              </div>
            )}
            {document ? (
              <MapCanvas
                document={document}
                assets={assets}
                monsters={workspace?.monsters ?? []}
                tool={tool}
                brush={brush}
                selection={selection}
                hidden={hidden}
                showGrid={false}
                showActor={true}
                showCollision={showCollision}
                collisionOpacity={collisionOpacity}
                showRegions={false}
                zoomCommand={zoomCommand}
                onChange={change}
                onSelect={setSelection}
                onStatus={(next) => {
                  setStatus((previous) =>
                    previous.x === next.x &&
                    previous.y === next.y &&
                    previous.zoom === next.zoom
                      ? previous
                      : next,
                  );
                  if (next.message) setMessage(next.message);
                }}
                onError={setError}
              />
            ) : (
              <div className="workspace-empty">
                <MapIcon size={42} />
                <h1>Không gian cho thế giới của bạn</h1>
                <p>
                  Mở repository để xem map, chỉnh collision và tạo bãi quái.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setWorkspaceDialog(true)}
                >
                  <FolderOpen />
                  Mở workspace
                </Button>
              </div>
            )}
            {error && (
              <div className="error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Đóng thông báo"
                  onClick={() => setError("")}
                >
                  <X />
                </Button>
              </div>
            )}
            {busy && (
              <div className="busy-overlay">
                <Loader2 className="animate-spin" />
                <span>{busy}</span>
              </div>
            )}
            </div>
          </section>
          {document && workspace && (
            <Inspector
              assets={assets}
              document={document}
              selection={selection}
              workspace={workspace}
              onEdit={edit}
              onImport={(target) => {
                importTarget.current = target;
                fileInput.current?.click();
              }}
              onDelete={removeSelection}
            />
          )}
        </div>
        <footer className="status-bar">
          <div>
            {dirty ? <span className="unsaved-dot" /> : <Check size={12} />}
            <span>{message}</span>
          </div>
          <div>
            <span>X {status.x}</span>
            <span>Y {status.y}</span>
            <span className="toolbar-divider" />
            <span>
              {navigation?.kind === "grid"
                ? `${navigation.columns} × ${navigation.rows} ô`
                : "Map mở"}
            </span>
            <span>{document?.map.spawns.length || 0} spawn</span>
            <span>{document ? objects(document.map).length : 0} object</span>
          </div>
        </footer>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importImage(file);
            event.target.value = "";
          }}
        />
        <Dialog open={workspaceDialog} onOpenChange={setWorkspaceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mở workspace game</DialogTitle>
              <DialogDescription>
                Chọn repository có src/client/maps/content và tools/build-app.js.
              </DialogDescription>
            </DialogHeader>
            <Label className="field">
              <span>Đường dẫn repository</span>
              <Input
                value={root}
                placeholder="/Users/…/volamidle.pages.dev"
                onChange={(event) => setRoot(event.target.value)}
              />
            </Label>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <DialogFooter>
              <Button
                disabled={!!busy || !root.trim()}
                onClick={() => {
                  void connect(root.trim());
                }}
              >
                <FolderOpen />
                Mở workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={newDialog !== null}
          onOpenChange={(open) => {
            if (!open) setNewDialog(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newDialog === "clone" ? "Nhân bản map" : "Tạo bản đồ mới"}
              </DialogTitle>
              <DialogDescription>
                Map được tạo trong bộ nhớ. Chỉ ghi vào repository khi bạn bấm
                Lưu map.
              </DialogDescription>
            </DialogHeader>
            <Label className="field">
              <span>Map ID</span>
              <Input
                type="number"
                value={newId}
                onChange={(event) => setNewId(event.target.value)}
              />
            </Label>
            <Label className="field">
              <span>Tên bản đồ</span>
              <Input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </Label>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <DialogFooter>
              <Button
                disabled={!!busy}
                onClick={() => {
                  void createMap();
                }}
              >
                <Plus />
                {newDialog === "clone" ? "Nhân bản" : "Tạo map"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Map đang có thay đổi chưa lưu</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có thể quay lại để lưu hoặc bỏ bản sửa hiện tại và tiếp tục.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Quay lại</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setDiscardOpen(false);
                  transition.current?.();
                  transition.current = null;
                }}
              >
                Bỏ thay đổi và tiếp tục
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
