import type { DatabaseSync } from 'node:sqlite';
import type { AssetCache } from './assets.ts';

export type GameMasterMode = 'development' | 'all';

export interface ServerOptions {
  db?: DatabaseSync;
  downloadAssets?: boolean;
  development?: boolean;
  combatSandbox?: boolean;
  gameMasterMode?: GameMasterMode;
}
export interface ServerServices {
  db: DatabaseSync;
  assets: AssetCache;
  development: boolean;
  combatSandbox: boolean;
  gameMasterMode: GameMasterMode;
  downloadAssets: boolean;
  moduleFiles: Set<string>;
}
export interface StorageOperation { key: string; value: string | null }
export interface StorageSnapshot {
  generation: string;
  initialized: boolean;
  entries: Record<string, string>;
}

/** Payload vào là unknown; database.ts xác thực trước khi bind vào SQLite. */
export interface StorageBatch {
  id: string;
  generation: string;
  operations: StorageOperation[];
}
