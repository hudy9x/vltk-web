import type { NavigationRuntime } from '../runtime';
import type { EncounterDefinition, LegacyZone, MapDefinition, Point } from '../types';
import type { FieldPoint } from './types';

export const FIELD_POLICY = {
  camps: 15, campSpacing: 300, scatter: 60, wanderRadius: 50, vision: 400,
  leashDistance: 700, initialBossDelay: 60, bossRespawn: 180, normalRespawn: 20,
  normalDamageScale: 0.75, highLevelThreshold: 60, killsPerRound: 24,
} as const;
export const randomBetween = (random: () => number, low: number, high: number): number => low + random() * (high - low);
export const randomInteger = (random: () => number, low: number, high: number): number => Math.floor(low + random() * (high - low + 1));

export function generateCampCenters(navigation: NavigationRuntime, count: number, spacing: number,
  avoid: Point | undefined, isVoid: (x: number, y: number) => boolean, random: () => number): [number, number][] {
  const points: [number, number][] = [], grid = navigation.state.g;
  for (let attempt = 0; attempt < count * 60 && points.length < count; attempt++) {
    let x: number, y: number;
    if (grid) {
      const cell = randomInteger(random, 0, grid.gw * grid.gh - 1);
      if (!grid.ok[cell]) continue;
      x = (cell % grid.gw + 0.5) * grid.cw; y = (Math.floor(cell / grid.gw) + 0.5) * grid.ch;
      if (!navigation.canStand(x, y)) continue;
    } else {
      x = randomBetween(random, 150, navigation.bounds.w - 150);
      y = randomBetween(random, 150, navigation.bounds.h - 150);
    }
    if (points.some(point => Math.hypot(point[0] - x, point[1] - y) < spacing) || isVoid(x, y) ||
        (avoid && Math.hypot(avoid.x - x, avoid.y - y) < 220)) continue;
    points.push([x, y]);
  }
  return points;
}

export function generateFieldPoints(navigation: NavigationRuntime, zone: LegacyZone, player: Point,
  normalRange: readonly [number, number], isVoid: (x: number, y: number) => boolean, random: () => number,
  map?: MapDefinition, encounterFor: (id: string) => EncounterDefinition | undefined = () => undefined): FieldPoint[] {
  if (map && (map.spawnMode === 'fixed' || map.spawns.length)) return map.spawns.map(spawn => {
    const profile = encounterFor(spawn.encounterId);
    if (!profile) throw new Error(`Unknown encounter ${spawn.encounterId}`);
    const { x, y } = spawn.position;
    if (x < 0 || y < 0 || x >= map.size.width || y >= map.size.height || !navigation.canStand(x, y)) throw new Error(`Map ${map.id}: blocked spawn ${spawn.id}`);
    return { x, y, cls: spawn.rank, tid: spawn.rank === 'boss' ? profile.bossId :
      profile.monsterIds[randomInteger(random, 0, profile.monsterIds.length - 1)], t: spawn.initialDelaySeconds };
  });
  const centers = generateCampCenters(navigation, FIELD_POLICY.camps, FIELD_POLICY.campSpacing, player, isVoid, random);
  const points: FieldPoint[] = [], elites = new Set<number>();
  // Preserve the game's existing seeded selection and density distribution.
  while (elites.size < Math.min(4, centers.length - 1)) elites.add(randomInteger(random, 1, centers.length - 1));
  const monsters = zone.m.slice().sort(() => random() - 0.5);
  if (!monsters.length) throw new Error(`Map ${zone.id}: empty monster pool`);
  centers.forEach(([x, y], index) => {
    if (index === 0) { points.push({ x, y, cls: 'boss', tid: zone.boss, t: FIELD_POLICY.initialBossDelay }); return; }
    const count = zone.lo >= FIELD_POLICY.highLevelThreshold ? randomInteger(random, 5, 7) :
      Math.max(2, Math.round(randomInteger(random, normalRange[0], normalRange[1]) / 2));
    const start = randomInteger(random, 0, monsters.length - 1);
    for (let offset = 0; offset < count; offset++) {
      const [px, py] = navigation.resolvePosition(x + randomBetween(random, -60, 60), y + randomBetween(random, -60, 60) * 0.6);
      points.push({ x: px, y: py, cls: offset === 0 && (elites.has(index) || random() < 0.25) ? 'elite' : 'normal',
        tid: monsters[(start + offset) % monsters.length], t: 0 });
    }
  });
  return points;
}
