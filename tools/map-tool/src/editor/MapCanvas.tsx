import { stepZoom, type ZoomAction } from "@/lib/zoom";
import { drawPreviewActor } from "@/lib/preview-actor";
import actorSheetUrl from "../../../../public/img/a/pl_shaolin_st.webp";
import { spawnIdsInRegion } from "@/lib/spawn-selection";
import { retainSpawnPoints } from "@/lib/spawn-editing";
import { spawnPreview, type SpawnPreview } from "@/lib/spawn-preview";
import { createGroundProbe } from "@game/ground";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createMapScene } from "@game/rendering";
import { resolveMapAsset } from "@game/assets";
import { createNavigationRuntime } from "@game/runtime";
import { decodeGrid } from "@game/navigation/grid";
import type { NavigationGrid, Point } from "@game/types";
import type { AssetStore } from "@/lib/native";
import {
  cloneDocument,
  documentKey,
  compileMap,
  objects,
  paint,
  beginPaintStroke,
} from "@/lib/model";
import type { EditorDocument, Monster, Selection, Tool } from "@/lib/types";

interface Props {
  document: EditorDocument;
  assets: AssetStore;
  monsters: Monster[];
  tool: Tool;
  brush: number;
  selection: Selection;
  hidden: Set<string>;
  showGrid: boolean;
  showActor: boolean;
  showCollision: boolean;
  collisionOpacity: number;
  showRegions: boolean;
  zoomCommand: { action: ZoomAction; serial: number };
  onChange(document: EditorDocument): void;
  onSelect(selection: Selection): void;
  onStatus(status: {
    x: number;
    y: number;
    zoom: number;
    message?: string;
  }): void;
  onError(message: string): void;
}
export function MapCanvas(props: Props) {
  const [showSpawns, setShowSpawns] = useState(true),
    [spawnSeed, setSpawnSeed] = useState(0);
  const [spawnCounts, setSpawnCounts] = useState({
    normal: 0,
    elite: 0,
    boss: 0,
    total: 0,
  });
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  const latest = useRef({ ...props, showSpawns, spawnSeed });
  latest.current = { ...props, showSpawns, spawnSeed };
  const controls = useRef<{ zoom(action: ZoomAction): void } | null>(
    null,
  );
  useEffect(() => {
    const element = canvas.current!,
      parent = container.current!,
      context = element.getContext("2d")!;
    const camera = { zoom: 1, x: 0, y: 0 };
    let width = 0,
      height = 0,
      frame = 0,
      lastTime = 0,
      drag: {
        start: Point;
        last: Point;
        screen: Point;
        document: EditorDocument;
        pan: boolean;
        selection: Selection;
        regionPoints?: SpawnPreview[];
        stroke?: ReturnType<typeof beginPaintStroke>;
      } | null = null;
    let currentId = -1,
      hover: Point = { x: 0, y: 0 },
      actor: Point = { ...props.document.map.entry },
      pathStart: Point | null = null,
      route: Point[] = [],
      target: Point | null = null;
    let displayGrid: NavigationGrid | null = null;
    let navigation = createNavigationRuntime(),
      prepared: EditorDocument | null = null;
    let preparedOptions = "";
    const scene = createMapScene(props.assets.imageFor),
      groundProbe = createGroundProbe();
    let spawnPoints: SpawnPreview[] = [];
    const actorImage = new Image();
    actorImage.onload = () => invalidate();
    actorImage.src = actorSheetUrl;
    const groundCache = window.document.createElement("canvas");
    let groundCacheKey = "", assetRevision = 0;

    const world = (event: { clientX: number; clientY: number }): Point => {
      const rect = element.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left - camera.x) / camera.zoom,
        y: (event.clientY - rect.top - camera.y) / camera.zoom,
      };
    };
    const bounded = (point: Point, document = latest.current.document) => ({
      x: Math.round(
        Math.max(0, Math.min(document.map.size.width - 1, point.x)),
      ),
      y: Math.round(
        Math.max(0, Math.min(document.map.size.height - 1, point.y)),
      ),
    });
    const invalidate = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    function zoom(action: ZoomAction) {
      const map = latest.current.document.map;
      if (action === "fit") {
        camera.zoom = Math.max(
          0.04,
          Math.min(
            (width - 72) / map.size.width,
            (height - 72) / map.size.height,
          ),
        );
        camera.x = (width - map.size.width * camera.zoom) / 2;
        camera.y = (height - map.size.height * camera.zoom) / 2;
      } else {
        const before = camera.zoom;
        camera.zoom = (typeof action === "number" ? action : stepZoom(before * 100, action)) / 100;
        camera.x = width / 2 - ((width / 2 - camera.x) * camera.zoom) / before;
        camera.y =
          height / 2 - ((height / 2 - camera.y) * camera.zoom) / before;
      }
      invalidate();
    }
    controls.current = { zoom };
    function prepare(document: EditorDocument) {
      const options = JSON.stringify([[...latest.current.hidden], latest.current.spawnSeed, assetRevision]);
      if (prepared === document && preparedOptions === options) return;
      preparedOptions = options;
      const map = compileMap(document);
      prepared = document;
      displayGrid =
        map.navigation.kind === "grid"
          ? decodeGrid(map.navigation, map.size)
          : null;
      scene.setMap({
        ...map,
        layers: map.layers.filter(
          (layer) => !latest.current.hidden.has(layer.id),
        ),
      });
      try {
        const nav = map.navigation;
        navigation = createNavigationRuntime();
        navigation.load(
          map.id,
          nav.kind === "grid"
            ? {
                w: map.size.width,
                h: map.size.height,
                gw: nav.columns,
                gh: nav.rows,
                cw: nav.cellSize.width,
                ch: nav.cellSize.height,
                obs: nav.blockedBase64,
              }
            : null,
          map.size,
        );
      } catch {
        navigation = createNavigationRuntime();
      }
      try {
        const ground = map.layers.find((layer) => layer.type === "ground");
        const image =
          ground && "image" in ground
            ? props.assets.imageFor(resolveMapAsset(map.id, ground.image))
            : null;
        spawnPoints = spawnPreview(
          document,
          map,
          latest.current.spawnSeed,
          (x, y) =>
            groundProbe.isVoid(image, map.size.width, map.size.height, x, y),
        );
      } catch {
        spawnPoints = [];
      }
      const counts = {
        normal: 0,
        elite: 0,
        boss: 0,
        total: spawnPoints.length,
      };
      for (const point of spawnPoints) counts[point.rank]++;
      setSpawnCounts((previous) =>
        JSON.stringify(previous) === JSON.stringify(counts) ? previous : counts,
      );
    }
    function marker(point: Point, color: string, label: string) {
      context.save();
      context.lineWidth = 2 / camera.zoom;
      context.strokeStyle = "#071018";
      context.fillStyle = color;
      context.beginPath();
      context.ellipse(point.x, point.y, 7 / camera.zoom, 5 / camera.zoom, 0, 0, Math.PI * 2);
      context.fill(); context.stroke();
      if (label) {
        context.font = `600 ${12 / camera.zoom}px -apple-system,sans-serif`;
        context.textAlign = "center";
        const w = context.measureText(label).width + 12 / camera.zoom;
        const top = point.y - 29 / camera.zoom;
        context.fillStyle = "#071018";
        context.fillRect(point.x - w / 2, top, w, 19 / camera.zoom);
        context.strokeStyle = color;
        context.strokeRect(point.x - w / 2, top, w, 19 / camera.zoom);
        context.fillStyle = "#ffffff";
        context.fillText(label, point.x, top + 14 / camera.zoom);
      }
      context.restore();
    }
    function drawActor() {
      const { x, y } = actor;
      context.fillStyle = "#0007";
      context.beginPath();
      context.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2);
      context.fill();
      // Same standing frame, foot anchor and Jn scale as the game (kf/Va).
      drawPreviewActor(context, actorImage, actor);
    }
    function draw(time: number) {
      frame = 0;
      const p = latest.current,
        document = drag?.document || p.document;
      try {
        prepare(drag?.stroke ? p.document : document);
      } catch (error) {
        p.onError(String(error));
        return;
      }
      const map = document.map,
        dpr = window.devicePixelRatio || 1;
      if (currentId !== map.id) {
        currentId = map.id;
        actor = { ...map.entry };
        target = null;
        route = [];
        pathStart = null;
        zoom("fit");
      }
      if (p.tool === "preview" && target) {
        try {
          navigation.beginTick();
          navigation.moveAlongPath(
            actor,
            target.x,
            target.y,
            Math.min(0.05, (time - lastTime) / 1000) * 180,
          );
          if (Math.hypot(target.x - actor.x, target.y - actor.y) < 5)
            target = null;
        } catch {
          target = null;
        }
      }
      lastTime = time;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.setTransform(
        dpr * camera.zoom,
        0,
        0,
        dpr * camera.zoom,
        camera.x * dpr,
        camera.y * dpr,
      );
      context.fillStyle = "#212525";
      context.fillRect(0, 0, map.size.width, map.size.height);
      const ground = map.layers.find(
        (layer) => layer.type === "ground" && !p.hidden.has(layer.id),
      );
      const cacheKey = JSON.stringify([map.id, map.size, ground, width, height, dpr,
        camera.x, camera.y, camera.zoom, assetRevision]);
      if (groundCacheKey !== cacheKey) {
        groundCacheKey = cacheKey;
        groundCache.width = element.width; groundCache.height = element.height;
        const cached = groundCache.getContext("2d")!;
        cached.setTransform(dpr * camera.zoom, 0, 0, dpr * camera.zoom, camera.x * dpr, camera.y * dpr);
        scene.drawGround(cached, ground && "image" in ground
          ? p.assets.imageFor(resolveMapAsset(map.id, ground.image)) : null);
      }
      context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(groundCache, 0, 0); context.restore();
      if (
        ground &&
        "image" in ground &&
        p.assets.errors.has(resolveMapAsset(map.id, ground.image))
      ) {
        context.fillStyle = "#c8b28c";
        context.textAlign = "center";
        context.font = `${13 / camera.zoom}px -apple-system,sans-serif`;
        context.fillText(
          `Thiếu ảnh nền: ${ground.image}`,
          map.size.width / 2,
          map.size.height / 2,
        );
      }
      scene.drawShadows(context);
      const view = {
        x: -camera.x / camera.zoom,
        y: -camera.y / camera.zoom,
        width: width / camera.zoom,
        height: height / camera.zoom,
      };
      const queue: Array<{
        y: number;
        object?: ReturnType<typeof objects>[number]["object"];
        actor?: boolean;
      }> = scene
        .worldObjects(view)
        .map((item) => ({ y: item.y, object: item.mapObject }));
      if (p.showActor) queue.push({ y: actor.y, actor: true });
      queue.sort((a, b) => a.y - b.y);
      for (const item of queue) {
        if (item.object) scene.drawObject(context, item.object);
        else drawActor();
      }
      scene.drawForeground(context);
      scene.drawAtmosphere(context);
      const stroke = drag?.stroke;
      const grid = stroke ? { gw: stroke.grid.columns, gh: stroke.grid.rows,
        cw: stroke.grid.cellSize.width, ch: stroke.grid.cellSize.height } : displayGrid;
      if (grid && (p.showCollision || p.showRegions)) {
        for (
          let row = Math.max(0, Math.floor(view.y / grid.ch));
          row < Math.min(grid.gh, Math.ceil((view.y + view.height) / grid.ch));
          row++
        )
          for (
            let col = Math.max(0, Math.floor(view.x / grid.cw));
            col < Math.min(grid.gw, Math.ceil((view.x + view.width) / grid.cw));
            col++
          ) {
            const cell = row * grid.gw + col;
            if (p.showCollision && (stroke ? stroke.blocked(cell) : !displayGrid!.ok[cell]))
              context.fillStyle = `rgba(255,45,75,${p.collisionOpacity / 100})`;
            else if (!stroke && p.showRegions && displayGrid!.comp[cell] >= 0)
              context.fillStyle = `hsla(${(displayGrid!.comp[cell] * 67) % 360},70%,55%,.22)`;
            else continue;
            context.fillRect(col * grid.cw, row * grid.ch, grid.cw, grid.ch);
          }
      }
      if (p.showGrid && camera.zoom > 0.14) {
        const cw = grid?.cw || 32,
          ch = grid?.ch || 16;
        context.strokeStyle = "#ffffff18";
        context.lineWidth = 0.5 / camera.zoom;
        context.beginPath();
        for (let x = 0; x <= map.size.width; x += cw) {
          context.moveTo(x, 0);
          context.lineTo(x, map.size.height);
        }
        for (let y = 0; y <= map.size.height; y += ch) {
          context.moveTo(0, y);
          context.lineTo(map.size.width, y);
        }
        context.stroke();
      }
      marker(map.entry, "#00e5ff", "Điểm vào");
      if (p.showSpawns || p.tool === "spawn" || p.tool === "spawn-select")
        for (const spawn of spawnPoints) {
          const color =
            spawn.rank === "boss"
              ? "#ff49c5"
              : spawn.rank === "elite"
                ? "#ffe000"
                : "#2dff79";
          const near =
            Math.hypot(spawn.x - hover.x, spawn.y - hover.y) < 14 / camera.zoom;
          const name =
            p.monsters.find((monster) => monster.id === spawn.monsterId)
              ?.name || `#${spawn.monsterId}`;
          const label =
            near || camera.zoom > 0.65 || spawn.rank === "boss"
              ? `${spawn.rank === "boss" ? "Boss · " : spawn.rank === "elite" ? "Tinh anh · " : ""}${name}${near && spawn.delay ? ` · ${spawn.delay}s` : ""}`
              : "";
          marker(spawn, color, spawn.fixed ? label || spawn.id : label);
          const selected = p.selection?.kind === "spawn" ? p.selection.id === spawn.id :
            p.selection?.kind === "spawns" && p.selection.ids.includes(spawn.id);
          const inRegion = drag?.regionPoints && spawnIdsInRegion([spawn], drag.start, hover).length > 0;
          if (selected || inRegion) marker(spawn, "#ffffff", selected ? "Đang chọn" : "");
        }
      for (const { layerId, object } of objects(map)) {
        const collider = document.project.colliders[`${layerId}/${object.id}`];
        if (collider && p.showCollision) {
          context.strokeStyle = "#ef8d80";
          context.lineWidth = 1.5 / camera.zoom;
          context.beginPath();
          context.ellipse(
            object.position.x + collider.offsetX * object.scale,
            object.position.y + collider.offsetY * object.scale,
            collider.radiusX * object.scale,
            collider.radiusY * object.scale,
            0,
            0,
            Math.PI * 2,
          );
          context.stroke();
        }
        if (
          p.selection?.kind === "object" &&
          p.selection.id === object.id &&
          p.selection.layerId === layerId
        ) {
          const image = p.assets.imageFor(
            resolveMapAsset(map.id, object.image),
          );
          context.strokeStyle = "#e9c98a";
          context.lineWidth = 1.5 / camera.zoom;
          context.strokeRect(
            object.position.x - object.anchor.x * object.scale,
            object.position.y - object.anchor.y * object.scale,
            (image.naturalWidth || 64) * object.scale,
            (image.naturalHeight || 64) * object.scale,
          );
          marker(object.position, "#e9c98a", object.id);
        }
      }
      if (route.length) {
        context.strokeStyle = "#071018";
        context.lineWidth = 6 / camera.zoom;
        context.beginPath();
        route.forEach((point, index) =>
          index
            ? context.lineTo(point.x, point.y)
            : context.moveTo(point.x, point.y),
        );
        context.stroke();
      }
      if (route.length) {
        context.strokeStyle = "#00e5ff"; context.lineWidth = 3 / camera.zoom; context.stroke();
        marker(route[0], "#2dff79", "Bắt đầu");
        marker(route[route.length - 1], "#ff49c5", "Đích đến");
      }
      if (target) marker(target, "#ff49c5", "Đích đến");
      if (pathStart) marker(pathStart, "#2dff79", "Bắt đầu");
      if (drag?.regionPoints) {
        context.fillStyle = "#8ad2e426";
        context.strokeStyle = "#8ad2e4";
        context.lineWidth = 1.5 / camera.zoom;
        context.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
        context.fillRect(drag.start.x, drag.start.y, hover.x - drag.start.x, hover.y - drag.start.y);
        context.strokeRect(drag.start.x, drag.start.y, hover.x - drag.start.x, hover.y - drag.start.y);
        context.setLineDash([]);
      }
      if (drag && p.tool === "rectangle") {
        context.fillStyle = "#ef666640";
        context.strokeStyle = "#ed8888";
        context.lineWidth = 1 / camera.zoom;
        context.fillRect(
          drag.start.x,
          drag.start.y,
          hover.x - drag.start.x,
          hover.y - drag.start.y,
        );
        context.strokeRect(
          drag.start.x,
          drag.start.y,
          hover.x - drag.start.x,
          hover.y - drag.start.y,
        );
      }
      if (p.tool === "block" || p.tool === "erase") {
        const cw = grid?.cw || 32,
          ch = grid?.ch || 16,
          radius = Math.floor((p.brush - 1) / 2);
        context.strokeStyle = p.tool === "block" ? "#ed8888" : "#88d7b0";
        context.lineWidth = 1 / camera.zoom;
        context.strokeRect(
          (Math.floor(hover.x / cw) - radius) * cw,
          (Math.floor(hover.y / ch) - radius) * ch,
          p.brush * cw,
          p.brush * ch,
        );
      }
      p.onStatus({
        x: Math.round(hover.x),
        y: Math.round(hover.y),
        zoom: Math.round(camera.zoom * 100),
      });
      if (p.tool === "preview" && target) invalidate();
    }
    function down(event: PointerEvent) {
      if (event.button !== 0 && event.button !== 1) return;
      const p = latest.current,
        position = bounded(world(event)),
        pan = event.button === 1 || p.tool === "pan" || event.altKey;
      element.setPointerCapture(event.pointerId);
      if (pan) {
        drag = {
          start: position,
          last: position,
          screen: { x: event.clientX, y: event.clientY },
          document: p.document,
          pan: true,
          selection: null,
        };
        return;
      }
      if (p.tool === "path" && displayGrid && !displayGrid.free) {
        p.onError("Map không có vùng đi được.");
        return;
      }
      if (p.tool === "preview" && displayGrid && !displayGrid.free) {
        p.onError("Map không có vùng đi được.");
        return;
      }
      if (p.tool === "path") {
        if (!pathStart) {
          pathStart = position;
          route = [];
        } else {
          route =
            navigation.path(pathStart.x, pathStart.y, position.x, position.y) ||
            (navigation.state.g ? [] : [pathStart, position]);
          p.onStatus({
            x: position.x,
            y: position.y,
            zoom: Math.round(camera.zoom * 100),
            message: route.length
              ? `Đường đi: ${route.length} điểm`
              : "Không tìm được đường đi",
          });
          pathStart = null;
        }
        invalidate();
        return;
      }
      if (p.tool === "preview") {
        try {
          [actor.x, actor.y] = navigation.nearest(actor.x, actor.y);
          const [x, y] = navigation.nearest(position.x, position.y);
          target = { x, y };
        } catch {
          p.onError("Không có vùng đi được cho nhân vật thử.");
        }
        invalidate();
        return;
      }
      const next = cloneDocument(p.document);
      if (p.tool === "spawn-select") {
        prepare(p.document);
        hover = position;
        drag = { start: position, last: position, screen: { x: event.clientX, y: event.clientY },
          document: next, pan: false, selection: null, regionPoints: [...spawnPoints] };
        p.onSelect(null);
        invalidate();
        return;
      }
      if (p.tool === "entry") {
        next.map.entry = position;
        p.onChange(next);
        return;
      }
      if (p.tool === "spawn") {
        const profile =
          next.encounters.find((profile) => profile.mapId === next.map.id) ||
          next.encounters[0];
        if (!profile) {
          p.onError("Tạo encounter trong tab Gameplay trước.");
          return;
        }
        const id = `spawn-${crypto.randomUUID().slice(0, 8)}`;
        retainSpawnPoints(next, spawnPoints);
        next.map.spawns.push({
          id,
          position,
          encounterId: profile.id,
          rank: "normal",
          initialDelaySeconds: 0,
        });
        p.onChange(next);
        p.onSelect({ kind: "spawn", id });
        return;
      }
      let selection: Selection = null;
      if (p.tool === "select") {
        const spawn = (p.showSpawns ? [...spawnPoints] : [])
          .reverse()
          .find((point) => Math.hypot(point.x - position.x, point.y - position.y) < 14 / camera.zoom);
        if (spawn) {
          retainSpawnPoints(next, spawnPoints);
          selection = { kind: "spawn", id: spawn.id };
        }
        else
          for (const item of objects(next.map).reverse()) {
            const object = item.object,
              image = p.assets.imageFor(
                resolveMapAsset(next.map.id, object.image),
              );
            const x = object.position.x - object.anchor.x * object.scale,
              y = object.position.y - object.anchor.y * object.scale;
            if (
              position.x >= x &&
              position.y >= y &&
              position.x <= x + image.naturalWidth * object.scale &&
              position.y <= y + image.naturalHeight * object.scale
            ) {
              selection = {
                kind: "object",
                layerId: item.layerId,
                id: object.id,
              };
              break;
            }
          }
        p.onSelect(selection);
      }
      drag = {
        start: position,
        last: position,
        screen: { x: event.clientX, y: event.clientY },
        document: next,
        pan: false,
        selection,
      };
      if (p.tool === "block" || p.tool === "erase") {
        drag.stroke = beginPaintStroke(next);
        drag.stroke.paint(position, position, p.tool === "block", p.brush);
      } else prepared = null;
      invalidate();
    }
    function move(event: PointerEvent) {
      hover = bounded(world(event));
      if (drag) {
        if (drag.pan) {
          camera.x += event.clientX - drag.screen.x;
          camera.y += event.clientY - drag.screen.y;
          drag.screen = { x: event.clientX, y: event.clientY };
        } else {
          const p = latest.current;
          if (p.tool === "block" || p.tool === "erase")
            drag.stroke?.paint(drag.last, hover, p.tool === "block", p.brush);
          if (drag.selection?.kind === "object") {
            const object = objects(drag.document.map).find(
              (item) =>
                item.layerId ===
                  (drag!.selection as { layerId: string }).layerId &&
                item.object.id === (drag!.selection as { id: string }).id,
            )?.object;
            if (object) {
              object.position.x += hover.x - drag.last.x;
              object.position.y += hover.y - drag.last.y;
            }
          }
          if (drag.selection?.kind === "spawn") {
            const spawn = drag.document.map.spawns.find(
              (spawn) => spawn.id === (drag!.selection as { id: string }).id,
            );
            if (spawn) spawn.position = hover;
          }
          drag.last = hover;
          if (!drag.stroke) prepared = null;
        }
      }
      invalidate();
    }
    function up(event: PointerEvent) {
      if (!drag) return;
      const current = drag;
      drag = null;
      if (current.regionPoints) {
        const ids = event.type === "pointercancel" ? [] : spawnIdsInRegion(current.regionPoints, current.start, bounded(world(event)));
        if (ids.length) {
          retainSpawnPoints(current.document, current.regionPoints);
          if (documentKey(current.document) !== documentKey(latest.current.document)) latest.current.onChange(current.document);
          latest.current.onSelect({ kind: "spawns", ids });
        } else latest.current.onSelect(null);
      } else if (!current.pan && event.type !== "pointercancel") {
        current.stroke?.paint(current.last, bounded(world(event)), latest.current.tool === "block", latest.current.brush);
        current.stroke?.commit();
        if (latest.current.tool === "rectangle")
          paint(
            current.document,
            current.start,
            bounded(world(event)),
            true,
            1,
            true,
          );
        if (
          documentKey(current.document) !== documentKey(latest.current.document)
        )
          latest.current.onChange(current.document);
      }
      prepared = null;
      invalidate();
    }
    let wheelZoomDelta = 0;
    function wheel(event: WheelEvent) {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        wheelZoomDelta += event.deltaY;
        if (Math.abs(wheelZoomDelta) < 30) return;
        const anchor = world(event);
        camera.zoom = stepZoom(camera.zoom * 100, wheelZoomDelta < 0 ? "in" : "out") / 100;
        wheelZoomDelta = 0;
        camera.x = event.clientX - rect.left - anchor.x * camera.zoom;
        camera.y = event.clientY - rect.top - anchor.y * camera.zoom;
      } else {
        wheelZoomDelta = 0;
        camera.x -= event.deltaX;
        camera.y -= event.deltaY;
      }
      invalidate();
    }
    const resize = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      const firstSize = width === 0 || height === 0;
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      if (currentId < 0 || firstSize) zoom("fit");
      invalidate();
    });
    resize.observe(parent);
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("wheel", wheel, { passive: false });
    const unsubscribe = props.assets.subscribe(() => {
      assetRevision++;
      prepared = null;
      invalidate();
    });
    const redraw = () => invalidate();
    element.addEventListener("editor-redraw", redraw);
    invalidate();
    return () => {
      resize.disconnect();
      unsubscribe();
      cancelAnimationFrame(frame);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("editor-redraw", redraw);
      actorImage.onload = null;
      controls.current = null;
    };
  }, [props.assets]);
  useEffect(() => {
    canvas.current?.dispatchEvent(new Event("editor-redraw"));
  }, [
    props.document,
    props.selection,
    props.hidden,
    props.showGrid,
    props.showCollision,
    props.collisionOpacity,
    props.showActor,
    props.showRegions,
    props.tool,
    showSpawns,
    spawnSeed,
    props.monsters,
  ]);
  useEffect(() => {
    controls.current?.zoom(props.zoomCommand.action);
  }, [props.zoomCommand]);
  return (
    <div className="map-editor-viewport">
      {props.tool === "spawn" && (
      <div className="spawn-preview-toolbar" role="toolbar" aria-label="Tùy chọn spawn">
        <Label className="check-row" title="Chọn (V) để sửa từng điểm · Chọn vùng (Q), kéo khung rồi Delete để xóa nhiều điểm">
          <Checkbox
            checked={showSpawns}
            onCheckedChange={(value) => setShowSpawns(!!value)}
          />
          Hiện điểm spawn
        </Label>
        {showSpawns && (
          <>
            <div className="spawn-legend">
              <span className="spawn-normal">
                ● {spawnCounts.normal} thường
              </span>
              <span className="spawn-elite">
                ● {spawnCounts.elite} tinh anh
              </span>
              <span className="spawn-boss">● {spawnCounts.boss} boss</span>
            </div>
            <small>
              {(props.document.map.spawnMode === "fixed" || props.document.map.spawns.length)
                ? `${spawnCounts.total} điểm cố định`
                : `${spawnCounts.total} điểm ngẫu nhiên`}
            </small>
            {props.document.map.spawnMode !== "fixed" && !props.document.map.spawns.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpawnSeed((value) => value + 1)}
              >
                <RefreshCw size={12} />
                Tạo mẫu khác
              </Button>
            )}
          </>
        )}
      </div>
      )}
      <div ref={container} className={`map-canvas tool-${props.tool}`}>
        <canvas ref={canvas} aria-label="Canvas chỉnh sửa bản đồ" />
      </div>
      <div className="canvas-hint">
        {props.tool === "preview"
          ? "Bấm để nhân vật thử di chuyển"
          : props.tool === "path"
            ? "Chọn điểm đầu và điểm cuối"
            : "Cuộn để di chuyển · ⌘/Ctrl + cuộn để zoom · Chuột giữa để kéo"}
      </div>
    </div>
  );
}
