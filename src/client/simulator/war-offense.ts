import type { LegacyRecord } from './types';
export type WarOffenseKind = 'external'|'externalCold'|'internal'|'internalPoison'|'internalCold'|'internalFire'|'internalLight';
/** Shared input to the native skill/hand-damage calculation. Never alters server damage. */
export function applyWarOffense(stats:LegacyRecord,active:(kind:WarOffenseKind)=>boolean) {
  stats.warExternalMultiplier=active('external')?1.5:1;
  stats.warExternalCold=active('externalCold')?100:0;
  stats.warInternalAdd={phys:active('internal')?100:0,poison:active('internalPoison')?50:0,cold:active('internalCold')?100:0,fire:active('internalFire')?100:0,light:active('internalLight')?100:0};
}
