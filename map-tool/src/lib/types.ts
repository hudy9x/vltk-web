import type {
  EncounterDefinition,
  MapDefinition,
  NavigationDefinition,
  ProgressionEntry,
} from "@game/types";
export type {
  EncounterDefinition,
  MapDefinition,
  MapLayer,
  MapObject,
  MapSpawn,
  Point,
  ProgressionEntry,
} from "@game/types";
export interface Collider {
  radiusX: number;
  radiusY: number;
  offsetX: number;
  offsetY: number;
}
export interface EditorProject {
  schemaVersion: 1;
  mapId: number;
  paintedNavigation: NavigationDefinition;
  colliders: Record<string, Collider>;
}
export interface PendingAsset {
  readonly path: string;
  readonly data: string;
}
export interface Monster {
  id: number;
  name: string;
  image?: string;
}
export interface Workspace {
  root: string;
  maps: MapDefinition[];
  projects: Record<string, EditorProject>;
  encounters: EncounterDefinition[];
  progression: ProgressionEntry[];
  monsters: Monster[];
  revision: string;
}
export interface EditorDocument {
  map: MapDefinition;
  project: EditorProject;
  encounters: EncounterDefinition[];
  progression: ProgressionEntry[];
  assets: PendingAsset[];
}
export type Tool =
  | "select"
  | "pan"
  | "block"
  | "erase"
  | "rectangle"
  | "entry"
  | "spawn"
  | "path"
  | "preview";
export type Selection =
  | { kind: "object"; layerId: string; id: string }
  | { kind: "spawn"; id: string }
  | { kind: "layer"; id: string }
  | null;
