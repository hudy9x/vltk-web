import type { NavigationRuntime } from '../runtime';
import type { LegacyZone, MapDefinition, Point } from '../types';
import { getEncounter } from '../catalog';
import { generateFieldPoints as generatePoints } from './generation';
export { FIELD_POLICY, randomBetween, randomInteger, generateCampCenters } from './generation';

/** Runtime adapter: resolve fixed spawn encounters from the live catalog. */
export function generateFieldPoints(navigation: NavigationRuntime, zone: LegacyZone, player: Point,
  normalRange: readonly [number, number], isVoid: (x: number, y: number) => boolean, random: () => number,
  map?: MapDefinition) {
  return generatePoints(navigation, zone, player, normalRange, isVoid, random, map, getEncounter);
}
