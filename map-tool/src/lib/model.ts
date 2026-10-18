export { resolveMapAsset } from "@game/assets";
import { parseMapDefinition, parseEncounterDefinition } from "@game/validate";
import { canStandAt, decodeGrid } from "@game/navigation/grid";
import type { GridDefinition, MapObject, Point } from "@game/types";
import type {
  EditorDocument,
  EditorProject,
  MapDefinition,
  Workspace,
} from "./types";

/** Asset payloads are immutable; share their strings across history snapshots. */
export function cloneDocument(document: EditorDocument): EditorDocument {
  return {
    ...structuredClone({ ...document, assets: [] }),
    assets: [...document.assets],
  };
}
/** Imported paths are unique, so history need not serialize large Base64 payloads. */
export function documentKey(document: EditorDocument): string {
  return JSON.stringify({
    ...document,
    assets: document.assets.map((asset) => asset.path),
  });
}
export function createDocument(
  workspace: Workspace,
  map: MapDefinition,
): EditorDocument {
  return structuredClone({
    map,
    project: workspace.projects[map.id] || {
      schemaVersion: 1,
      mapId: map.id,
      paintedNavigation: map.navigation,
      colliders: {},
    },
    encounters: workspace.encounters,
    progression: workspace.progression,
    assets: [],
  });
}
export function bytesFor(grid: GridDefinition): Uint8Array {
  return Uint8Array.from(atob(grid.blockedBase64), (char) =>
    char.charCodeAt(0),
  );
}
export function encodeBytes(bytes: Uint8Array): string {
  let data = "";
  for (const byte of bytes) data += String.fromCharCode(byte);
  return btoa(data);
}
export function ensureGrid(document: EditorDocument): GridDefinition {
  if (document.project.paintedNavigation.kind === "grid")
    return document.project.paintedNavigation;
  const { width, height } = document.map.size;
  const columns = width / 32,
    rows = height / 16;
  if (!Number.isInteger(columns) || !Number.isInteger(rows))
    throw new Error("Kích thước map phải chia hết cho ô 32 × 16.");
  const grid: GridDefinition = {
    kind: "grid",
    cellSize: { width: 32, height: 16 },
    columns,
    rows,
    blockedBase64: encodeBytes(new Uint8Array(Math.ceil((columns * rows) / 8))),
  };
  document.project.paintedNavigation = grid;
  return grid;
}
export function paint(
  document: EditorDocument,
  from: Point,
  to: Point,
  blocked: boolean,
  brush: number,
  rectangle = false,
): void {
  const grid = ensureGrid(document), bytes = bytesFor(grid);
  paintBits(grid, bytes, from, to, blocked, brush, rectangle);
  grid.blockedBase64 = encodeBytes(bytes);
}
/** One decoded mask per gesture; serialize only once when committing history. */
export function beginPaintStroke(document: EditorDocument) {
  const grid = ensureGrid(document), bytes = bytesFor(grid);
  const colliderDocument = { ...document, project: { ...document.project,
    paintedNavigation: { ...grid, blockedBase64: encodeBytes(new Uint8Array(bytes.length)) } } };
  const navigation = compileMap(colliderDocument).navigation;
  const colliderBytes = navigation.kind === "grid" ? bytesFor(navigation) : new Uint8Array(bytes.length);
  return {
    grid,
    blocked(cell: number) { return !!((bytes[cell >> 3] | colliderBytes[cell >> 3]) & (1 << (cell & 7))); },
    paint(from: Point, to: Point, blocked: boolean, brush: number) {
      paintBits(grid, bytes, from, to, blocked, brush, false);
    },
    commit() { grid.blockedBase64 = encodeBytes(bytes); },
  };
}
function paintBits(grid: GridDefinition, bytes: Uint8Array, from: Point, to: Point,
  blocked: boolean, brush: number, rectangle: boolean): void {
  const x0 = Math.floor(from.x / grid.cellSize.width),
    y0 = Math.floor(from.y / grid.cellSize.height);
  const x1 = Math.floor(to.x / grid.cellSize.width),
    y1 = Math.floor(to.y / grid.cellSize.height);
  const set = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) return;
    const cell = y * grid.columns + x;
    if (blocked) bytes[cell >> 3] |= 1 << (cell & 7);
    else bytes[cell >> 3] &= ~(1 << (cell & 7));
  };
  if (rectangle) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(x, y);
  } else {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1),
      radius = Math.floor((brush - 1) / 2);
    for (let step = 0; step <= steps; step++) {
      const x = Math.round(x0 + ((x1 - x0) * step) / steps),
        y = Math.round(y0 + ((y1 - y0) * step) / steps);
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) set(x + dx, y + dy);
    }
  }
}

export function objects(
  map: MapDefinition,
): Array<{ layerId: string; object: MapObject }> {
  return map.layers.flatMap((layer) =>
    layer.type === "world"
      ? layer.objects.map((object) => ({ layerId: layer.id, object }))
      : [],
  );
}
export function compileMap(document: EditorDocument): MapDefinition {
  validateProject(document.project, document.map.id);
  const map = structuredClone(document.map);
  const source = document.project.paintedNavigation;
  parseMapDefinition({ ...map, navigation: source });
  const colliders = objects(map).filter(
    ({ layerId, object }) =>
      document.project.colliders[`${layerId}/${object.id}`],
  );
  if (source.kind === "open" && !colliders.length) {
    map.navigation = { kind: "open" };
    return map;
  }
  const working = {
    ...document,
    project: {
      ...document.project,
      paintedNavigation: structuredClone(source),
    },
  };
  const grid = ensureGrid(working);
  const bytes = bytesFor(grid);
  for (const { layerId, object } of colliders) {
    const collider = document.project.colliders[`${layerId}/${object.id}`];
    if (
      ![
        collider.radiusX,
        collider.radiusY,
        collider.offsetX,
        collider.offsetY,
      ].every(Number.isFinite) ||
      collider.radiusX <= 0 ||
      collider.radiusY <= 0
    )
      throw new Error(`Collider ${object.id} không hợp lệ.`);
    const cx = object.position.x + collider.offsetX * object.scale,
      cy = object.position.y + collider.offsetY * object.scale;
    const rx = collider.radiusX * object.scale,
      ry = collider.radiusY * object.scale;
    for (
      let y = Math.max(0, Math.floor((cy - ry) / grid.cellSize.height));
      y < Math.min(grid.rows, Math.ceil((cy + ry) / grid.cellSize.height));
      y++
    )
      for (
        let x = Math.max(0, Math.floor((cx - rx) / grid.cellSize.width));
        x < Math.min(grid.columns, Math.ceil((cx + rx) / grid.cellSize.width));
        x++
      ) {
        const dx =
          Math.max(
            0,
            Math.abs((x + 0.5) * grid.cellSize.width - cx) -
              grid.cellSize.width / 2,
          ) / rx;
        const dy =
          Math.max(
            0,
            Math.abs((y + 0.5) * grid.cellSize.height - cy) -
              grid.cellSize.height / 2,
          ) / ry;
        if (dx * dx + dy * dy <= 1) {
          const cell = y * grid.columns + x;
          bytes[cell >> 3] |= 1 << (cell & 7);
        }
      }
  }
  map.navigation = { ...grid, blockedBase64: encodeBytes(bytes) };
  return map;
}
export function validateDocument(document: EditorDocument): MapDefinition {
  const map = parseMapDefinition(compileMap(document));
  const grid =
    map.navigation.kind === "grid"
      ? decodeGrid(map.navigation, map.size)
      : null;
  if (grid && !grid.free) throw new Error("Map không có vùng đi được.");
  // Legacy entry is informational; the runtime snaps the actor to a reachable point.
  const profiles = new Map(
    document.encounters.map((profile) => {
      parseEncounterDefinition(profile);
      return [profile.id, profile];
    }),
  );
  for (const spawn of map.spawns) {
    if (!profiles.has(spawn.encounterId))
      throw new Error(`Spawn ${spawn.id}: encounter không tồn tại.`);
    if (!canStandAt(grid, spawn.position.x, spawn.position.y))
      throw new Error(
        `Spawn ${spawn.id} nằm trong vật cản hoặc ngoài vùng liên thông chính.`,
      );
  }
  return map;
}
export function newMap(
  id: number,
  name: string,
  width = 3584,
  height = 3584,
): MapDefinition {
  return {
    schemaVersion: 1,
    id,
    name,
    status: "test",
    size: { width, height },
    entry: { x: width / 2, y: height / 2 },
    layers: [
      { id: "ground", type: "ground", image: "./ground.jpg" },
      { id: "world", type: "world", objects: [] },
    ],
    navigation: { kind: "open" },
    spawns: [],
  };
}
export function validateProject(project: EditorProject, mapId: number): void {
  if (
    !project ||
    project.schemaVersion !== 1 ||
    project.mapId !== mapId ||
    !project.paintedNavigation ||
    !project.colliders ||
    typeof project.colliders !== "object" ||
    Array.isArray(project.colliders)
  )
    throw new Error("Project không khớp map.");
}
