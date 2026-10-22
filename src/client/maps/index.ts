/** Map runtime entry. Only this boundary is exported into the legacy bundle. */
export { getMap, getEncounter, listMaps, encounters, progression, createLegacyCatalog, resolveMapAsset, getMapBackground, isMapAvailable, updateMapAvailability } from './catalog';
export { createMapAvailability, createMapAvailabilityGuard, showMapUnavailableNotice, MISSING_MAP_MESSAGE } from './availability';
export { parseMapDefinition } from './validate';
export { npcCatalog, getNpc, mapNpcs, hitNpc, drawNpc } from '../npcs';
export { decodeGrid, isWalkable, canStandAt, nearestWalkable, clearSegment } from './navigation/grid';
export { findPath } from './navigation/pathfinding';
export { createFlowField } from './navigation/flow-field';
export { createNavigationRuntime } from './runtime';
export { FIELD_POLICY, generateCampCenters, generateFieldPoints } from './spawn/generate';
export { createFieldRuntime } from './spawn/lifecycle';
export { createGroundProbe, findVisibleGround } from './ground';
export { createMapScene } from './rendering';
export { createLegacyMapAdapter } from './legacy-adapter';
export type { MapDefinition, MapObject, MapLayer, EncounterDefinition, Point, NavigationGrid } from './types';
