import type { SimulatorActor, SimulatorProfile, SimulatorStats } from '../../src/client/simulator/types.ts';

/** The original game is a shared JS scope. Dynamic values are confined to this
 * VM boundary; simulation inputs and exported reports use explicit types below.
 */
export type LegacyScope = Record<string, any>;
export type Team = 'song' | 'jin';
export interface FactionBuild {
  faction: string;
  name: string;
  profile: SimulatorProfile;
  stats: SimulatorStats;
}
export interface ProfileDataset {
  builds: FactionBuild[];
  // Native catalog names must stay intact when restoring the shared game scope.
  T: LegacyScope;
  S: LegacyScope;
  JFX: LegacyScope;
}
export interface DuelResult {
  a: string;
  b: string;
  repetition: number;
  reverse: number;
  winner: string;
  seconds: number;
  states: { faction: string; hp: number; max: number; mana: number; casts: number; skill: string }[];
}
export interface DuelDataset {
  config: { distance: number; [setting: string]: unknown };
  builds: FactionBuild[];
  results: DuelResult[];
}
export type BattleActor = SimulatorActor;
