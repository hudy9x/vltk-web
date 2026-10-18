import { mapDocuments } from './catalog-data';
import encountersJson from '../gameplay/encounters/catalog.json';
import progressionJson from './progression.json';
import { parseEncounterDefinition, parseMapDefinition } from './validate';
import { canStandAt, decodeGrid } from './navigation/grid';
import type { EncounterDefinition, LegacyNavigation, LegacyZone, MapDefinition, ProgressionEntry } from './types';

const maps = new Map<number, MapDefinition>();
for (const document of mapDocuments) {
  const map = parseMapDefinition(document);
  if (maps.has(map.id)) throw new Error(`Duplicate map ${map.id}`);
  maps.set(map.id, map);
}
export const encounters: readonly EncounterDefinition[] = encountersJson.map(parseEncounterDefinition);
export const progression: readonly ProgressionEntry[] = progressionJson;
const encounterIndex = new Map(encounters.map(profile => [profile.id, profile]));
export const getMap = (id: number): MapDefinition | undefined => maps.get(id);
export const getEncounter = (id: string): EncounterDefinition | undefined => encounterIndex.get(id);
export const listMaps = (): readonly MapDefinition[] => [...maps.values()];

export function resolveMapAsset(mapId: number, asset: string): string {
  return asset.startsWith('./') ? `app/maps/content/${mapId}/${asset.slice(2)}` : asset;
}

export function createLegacyZone(mapId: number): LegacyZone {
  const map = maps.get(mapId);
  const profile = encounters.find(value => value.mapId === mapId);
  if (!map || !profile) throw new Error(`Map ${mapId}: missing encounter or map`);
  const ground = map.layers.find(layer => layer.type === 'ground');
  if (!ground || !('image' in ground)) throw new Error(`Map ${mapId}: missing ground`);
  return { id: mapId, n: map.name, lo: profile.levelRange[0], hi: profile.levelRange[1],
    bg: resolveMapAsset(mapId, ground.image), sw: [...profile.equipmentElementWeights],
    m: [...profile.monsterIds], boss: profile.bossId, ...(profile.alternate ? { alt: true } : {}) };
}
export function createLegacyCatalog() {
  if (encounterIndex.size !== encounters.length) throw new Error('Duplicate encounter ID');
  for (const profile of encounters) if (!maps.has(profile.mapId)) throw new Error(`Encounter ${profile.id}: unknown map ${profile.mapId}`);
  const primaryIds = new Set<number>();
  for (const entry of progression) {
    if (primaryIds.has(entry.mapId)) throw new Error(`Duplicate progression map ${entry.mapId}`);
    primaryIds.add(entry.mapId);
    if (!Array.isArray(entry.alternateMapIds) || new Set(entry.alternateMapIds).size !== entry.alternateMapIds.length) throw new Error(`Map ${entry.mapId}: invalid alternates`);
  }
  const zones = progression.map(entry => createLegacyZone(entry.mapId));
  const alternates: Record<string, LegacyZone[]> = {};
  progression.forEach((entry, index) => {
    if (entry.alternateMapIds.length) alternates[index] = entry.alternateMapIds.map(createLegacyZone);
  });
  const navigation: Record<string, LegacyNavigation> = {};
  for (const map of maps.values()) {
    const nav = map.navigation;
    if (nav.kind === 'grid') navigation[map.id] = { w: map.size.width, h: map.size.height,
      gw: nav.columns, gh: nav.rows, cw: nav.cellSize.width, ch: nav.cellSize.height, obs: nav.blockedBase64 };
    if (map.spawns.length) {
      const grid = nav.kind === 'grid' ? decodeGrid(nav, map.size) : null;
      for (const spawn of map.spawns) {
        if (!encounterIndex.has(spawn.encounterId)) throw new Error(`Map ${map.id}: unknown encounter ${spawn.encounterId}`);
        if (!canStandAt(grid, spawn.position.x, spawn.position.y)) throw new Error(`Map ${map.id}: blocked spawn ${spawn.id}`);
      }
    }
  }
  return { zones, alternates, navigation };
}
