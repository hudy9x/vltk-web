/** Pixel coordinates in the existing world projection; Y increases downwards. */
export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface GridDefinition {
  kind: 'grid';
  cellSize: Size;
  columns: number;
  rows: number;
  blockedBase64: string;
}
export type NavigationDefinition = GridDefinition | { kind: 'open' };
export interface MapObject {
  id: string;
  image: string;
  position: Point;
  anchor: Point;
  scale: number;
  depthOffsetY: number;
}
export type MapLayer =
  | { id: string; type: 'ground' | 'shadow' | 'foreground'; image: string; opacity?: number }
  | { id: string; type: 'world'; objects: MapObject[] }
  | { id: string; type: 'atmosphere'; color: string; opacity: number };
export type MonsterRank = 'normal' | 'elite' | 'boss';
export interface MapSpawn {
  id: string;
  position: Point;
  encounterId: string;
  rank: MonsterRank;
  initialDelaySeconds: number;
}
export interface MapDefinition {
  schemaVersion: 1;
  id: number;
  name: string;
  size: Size;
  entry: Point;
  layers: MapLayer[];
  navigation: NavigationDefinition;
  spawns: MapSpawn[];
}
/** Combat balance lives outside map documents. Equipment weights are NOT monster elements. */
export interface EncounterDefinition {
  id: string;
  mapId: number;
  name: string;
  levelRange: [number, number];
  monsterIds: number[];
  bossId: number;
  equipmentElementWeights: [number, number, number, number, number];
  alternate?: boolean;
}
export interface ProgressionEntry { mapId: number; alternateMapIds: number[] }
/** Compatibility shape used by existing progression, rewards and UI. */
export interface LegacyZone {
  id: number; n: string; lo: number; hi: number; bg: string;
  sw: number[]; m: number[]; boss: number; alt?: boolean;
}
export interface LegacyNavigation {
  w: number; h: number; gw: number; gh: number; cw: number; ch: number; obs: string;
}
/** Existing consumers inspect these fields; the grid remains the single live instance. */
export interface NavigationGrid {
  w: number; h: number; gw: number; gh: number; cw: number; ch: number;
  ok: Uint8Array; free: number; comp: Int32Array; isl: number[];
}
export interface MovingActor extends Point {
  _pp?: Point[] | null; _pk?: string; _pr?: number; _pi?: number; _stuck?: number;
}
export type MapKey = number | string;
