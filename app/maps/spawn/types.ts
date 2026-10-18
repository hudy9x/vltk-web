import type { LegacyZone, MonsterRank, MovingActor, Point } from '../types';

export interface FieldEnemy extends MovingActor {
  dead?: boolean; goldBoss?: boolean; sat?: boolean; satG?: boolean;
  cls: MonsterRank; hp: number; max: number; dmg: number; spd: number;
  home?: FieldPoint; dens?: boolean; aggro?: boolean; wT?: number;
  agT?: number; vis?: number; backT?: number; moving?: boolean;
  wx?: number; wy?: number; face?: number; dir?: number;
  poison?: number; slowT?: number;
}
/** Runtime compatibility record; never serialized into map.json. */
export interface FieldPoint extends Point {
  cls: MonsterRank; tid: number; t: number; e?: FieldEnemy | null;
}
export interface FieldState { key: string; pts: FieldPoint[]; kills: number }
export interface FieldHost {
  zone(): LegacyZone;
  key(): string;
  player(): Point;
  playerAlive(): boolean;
  normalCountRange(): readonly [number, number];
  ensureMap(zone: LegacyZone): void;
  field(): FieldState | null | undefined;
  setField(field: FieldState): void;
  enemies(): FieldEnemy[];
  setEnemies(enemies: FieldEnemy[]): void;
  createEnemy(point: FieldPoint): FieldEnemy;
  announceBoss(enemy: FieldEnemy, point: FieldPoint): void;
  normalRespawnSeconds(): number;
  questNeedsBoss(monsterId: number): boolean;
  afterTick(): void;
  isVoid(x: number, y: number): boolean;
  distance(a: Point, b: Point): number;
  direction(x: number, y: number): number;
}
