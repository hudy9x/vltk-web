import type { EncounterDefinition, MapDefinition } from './types';

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected object`);
  return value as Record<string, unknown>;
}
function positive(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error(`${path}: expected positive number`);
}
function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !value.length) throw new Error(`${path}: expected non-empty string`);
}
function point(value: unknown, path: string): void {
  const p = record(value, path);
  for (const axis of ['x', 'y']) if (typeof p[axis] !== 'number' || !Number.isFinite(p[axis])) throw new Error(`${path}.${axis}: expected finite number`);
}

/** Validate imported JSON before it can replace the current world. */
export function parseMapDefinition(value: unknown): MapDefinition {
  const map = record(value, 'map');
  const path = `map ${String(map.id)}`;
  if (map.schemaVersion !== 1) throw new Error(`${path}: unsupported schemaVersion`);
  if (map.status !== undefined && !['available', 'test'].includes(String(map.status))) throw new Error(`${path}: invalid status`);
  if (map.id === 37 && map.status === 'test') throw new Error('Biện Kinh phải Available để sử dụng Thổ địa phù.');
  positive(map.id, `${path}.id`);
  if (!Number.isInteger(map.id)) throw new Error(`${path}.id: expected integer`);
  text(map.name, `${path}.name`);
  const size = record(map.size, `${path}.size`);
  positive(size.width, `${path}.size.width`); positive(size.height, `${path}.size.height`);
  point(map.entry, `${path}.entry`);
  const entry = record(map.entry, `${path}.entry`);
  if (Number(entry.x) < 0 || Number(entry.y) < 0 || Number(entry.x) >= size.width || Number(entry.y) >= size.height) throw new Error(`${path}.entry: outside map`);
  const nav = record(map.navigation, `${path}.navigation`);
  if (nav.kind === 'grid') {
    const cell = record(nav.cellSize, `${path}.navigation.cellSize`);
    positive(cell.width, `${path}.cellSize.width`); positive(cell.height, `${path}.cellSize.height`);
    positive(nav.columns, `${path}.columns`); positive(nav.rows, `${path}.rows`);
    if (!Number.isInteger(nav.columns) || !Number.isInteger(nav.rows) || nav.columns * cell.width !== size.width || nav.rows * cell.height !== size.height) throw new Error(`${path}: grid dimensions do not match world size`);
    text(nav.blockedBase64, `${path}.blockedBase64`);
    let bytes: string;
    try { bytes = atob(nav.blockedBase64); } catch { throw new Error(`${path}: invalid navigation Base64`); }
    if (bytes.length !== Math.ceil(nav.columns * nav.rows / 8)) throw new Error(`${path}: invalid navigation byte length`);
  } else if (nav.kind !== 'open') throw new Error(`${path}: unknown navigation kind`);
  if (!Array.isArray(map.layers)) throw new Error(`${path}.layers: expected array`);
  const ids = new Set<string>();
  let grounds = 0;
  for (const value of map.layers) {
    const layer = record(value, `${path}.layer`);
    text(layer.id, `${path}.layer.id`);
    if (ids.has(layer.id)) throw new Error(`${path}: duplicate layer ${layer.id}`);
    ids.add(layer.id);
    if (layer.type === 'world') {
      if (!Array.isArray(layer.objects)) throw new Error(`${path}: expected objects array`);
      const objectIds = new Set<string>();
      for (const value of layer.objects) {
        const object = record(value, `${path}.object`);
        text(object.id, `${path}.object.id`); text(object.image, `${path}.object.image`);
        if (objectIds.has(object.id)) throw new Error(`${path}: duplicate object ${object.id}`);
        objectIds.add(object.id);
        point(object.position, `${path}.${object.id}.position`); point(object.anchor, `${path}.${object.id}.anchor`);
        positive(object.scale, `${path}.${object.id}.scale`);
        if (typeof object.depthOffsetY !== 'number' || !Number.isFinite(object.depthOffsetY)) throw new Error(`${path}: invalid depth offset`);
      }
    } else if (layer.type === 'atmosphere') {
      text(layer.color, `${path}.atmosphere.color`);
    } else if (['ground', 'shadow', 'foreground'].includes(String(layer.type))) {
      text(layer.image, `${path}.layer.image`);
      if (layer.type === 'ground') grounds++;
    } else throw new Error(`${path}: unknown layer type ${String(layer.type)}`);
    if (layer.opacity !== undefined && (typeof layer.opacity !== 'number' || !Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)) throw new Error(`${path}: opacity must be between 0 and 1`);
    if (layer.type === 'atmosphere' && layer.opacity === undefined) throw new Error(`${path}: atmosphere requires opacity`);
  }
  if (grounds !== 1) throw new Error(`${path}: expected exactly one ground layer`);
  if (!Array.isArray(map.spawns)) throw new Error(`${path}.spawns: expected array`);
  if (map.spawnMode !== undefined && !['procedural', 'fixed'].includes(String(map.spawnMode))) throw new Error(`${path}: invalid spawnMode`);
  if (map.spawnMode === 'procedural' && map.spawns.length) throw new Error(`${path}: procedural mode cannot contain fixed spawns`);
  const spawnIds = new Set<string>();
  for (const value of map.spawns) {
    const spawn = record(value, `${path}.spawn`);
    text(spawn.id, `${path}.spawn.id`); text(spawn.encounterId, `${path}.spawn.encounterId`);
    if (spawnIds.has(spawn.id)) throw new Error(`${path}: duplicate spawn ${spawn.id}`);
    spawnIds.add(spawn.id); point(spawn.position, `${path}.spawn.position`);
    const position = record(spawn.position, `${path}.spawn.position`);
    if (Number(position.x) < 0 || Number(position.y) < 0 || Number(position.x) >= size.width || Number(position.y) >= size.height) throw new Error(`${path}: spawn outside map`);
    if (!['normal', 'elite', 'boss'].includes(String(spawn.rank))) throw new Error(`${path}: invalid spawn rank`);
    if (typeof spawn.initialDelaySeconds !== 'number' || !Number.isFinite(spawn.initialDelaySeconds) || spawn.initialDelaySeconds < 0) throw new Error(`${path}: invalid spawn delay`);
  }
  return value as MapDefinition;
}

export function parseEncounterDefinition(value: unknown): EncounterDefinition {
  const profile = record(value, 'encounter');
  text(profile.id, 'encounter.id'); text(profile.name, 'encounter.name');
  positive(profile.mapId, `${profile.id}.mapId`); positive(profile.bossId, `${profile.id}.bossId`);
  if (!Number.isInteger(profile.mapId) || !Number.isInteger(profile.bossId)) throw new Error(`${profile.id}: expected integer IDs`);
  if (!Array.isArray(profile.monsterIds) || !profile.monsterIds.length || profile.monsterIds.some(id => !Number.isInteger(id) || id <= 0)) throw new Error(`${profile.id}: invalid monster pool`);
  if (!Array.isArray(profile.levelRange) || profile.levelRange.length !== 2 ||
      profile.levelRange.some(level => typeof level !== 'number' || !Number.isFinite(level) || level < 0) ||
      profile.levelRange[0] > profile.levelRange[1]) throw new Error(`${profile.id}: invalid level range`);
  if (!Array.isArray(profile.equipmentElementWeights) || profile.equipmentElementWeights.length !== 5 ||
      profile.equipmentElementWeights.some(weight => typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) ||
      !profile.equipmentElementWeights.some(weight => weight > 0)) throw new Error(`${profile.id}: invalid equipment element weights`);
  return value as EncounterDefinition;
}
