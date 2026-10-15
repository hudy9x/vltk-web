import type { CombatSkill, CombatTarget, CombatWorld } from '../combat/types';

/** Compatibility boundary for fields owned by the untyped legacy game. */
export type LegacyRecord = Record<string, any>;
export type SkillId = number | string;
export interface Faction {
  key: string;
  n: string;
  novice?: boolean;
  skills: number[];
}
export interface SimulatorProfile extends LegacyRecord {
  name: string;
  fac: string;
  sex: number;
  lvl: number;
  main: SkillId;
  mainLock: boolean;
  rot: boolean;
  slots: number[];
  sk: Record<string, number>;
  attr: Record<string, number>;
  eq: LegacyRecord;
  skPts: number;
  attrPts: number;
}
export interface SimulatorSkill extends CombatSkill {
  id?: SkillId;
  n?: string;
  L?: number;
  parts: Record<string, number>;
  rad: number;
  cost?: number;
  costLife?: boolean;
  rate?: number;
  cd?: number;
  [key: string]: any;
}
export interface SimulatorStats extends LegacyRecord {
  life: number;
  mana: number;
  manaRegen: number;
  series: number;
  res: Record<string, number>;
  def: number;
  ar: number;
  main: SimulatorSkill;
  basic: SimulatorSkill;
  actives?: SimulatorSkill[];
}
export interface LegacyEntity extends CombatTarget, LegacyRecord {
  n: string;
  hp: number;
  max: number;
  tid: number;
  series: number;
  res: Record<string, number>;
  def: number;
}
export interface SimulatorActor extends LegacyEntity {
  arenaSim: true;
  simId: string;
  generation: number;
  pk: boolean;
  farm: boolean;
  target: LegacyEntity | null;
  profile: SimulatorProfile;
  stats: SimulatorStats;
  mana: number;
  cooldown: number;
  casts: number;
  lastCast: { id: SkillId; name: string; level: number } | null;
  waiting: string;
  autoSkills: boolean;
  autoPotential: boolean;
}
export interface SimulatorWorld extends CombatWorld, LegacyRecord {
  P: SimulatorStats;
  mana: number;
  enemies: LegacyEntity[];
}
export interface SandboxAPI {
  createProfile(faction: Faction): SimulatorProfile;
  tick(dt: number): void;
  readonly oneDamage: boolean;
}
export interface DiagnosticStep {
  order: number;
  formula: string;
  values: Record<string, unknown>;
}
export interface DiagnosticEvent {
  simId?: string;
  sequence: number;
  timestamp: string;
  source: string;
  target: string;
  skill: string;
  skillInput: Record<string, unknown>;
  steps: DiagnosticStep[];
}

export interface SimulatorLogProvider {
  readonly revision: number;
  enabled: boolean;
  text(simOnly: boolean): string;
  html(simOnly: boolean): string;
  render(container: HTMLElement, simOnly: boolean): void;
  clear(simOnly: boolean): void;
}

export interface SimulatorTemplate {
  version: 1;
  id: string;
  name: string;
  updatedAt: string;
  profile: SimulatorProfile;
  autoSkills: boolean;
  autoPotential: boolean;
  pk: boolean;
  farm: boolean;
}
