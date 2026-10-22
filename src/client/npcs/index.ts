import catalog from './catalog.json';
import diagonalLayout from '../maps/content/9002/layout.json';
import type { MapDefinition, MapNpc, Point } from '../maps/types';
export type { MapNpc } from '../maps/types';
export const npcCatalog = catalog;
export type NpcDefinition = typeof catalog[number];
export const getNpc = (id: string): NpcDefinition | undefined => npcCatalog.find(npc => npc.id === id);

/** Undefined keeps the legacy layout. An explicit empty list removes every NPC. */
export function mapNpcs(map: MapDefinition): MapNpc[] {
  if (map.npcs !== undefined) return map.npcs;
  if (map.id === 37) return [
    { id: 'town-equipment', npcId: 'equipment', position: { x: 1240, y: 2139 } },
    { id: 'town-horse', npcId: 'horse', position: { x: 1380, y: 2139 } },
    { id: 'town-pharmacy', npcId: 'pharmacy', position: { x: 1520, y: 2139 } },
    { id: 'town-tongkim', npcId: 'tongkim', position: { x: 1660, y: 2139 } },
  ];
  if (map.id !== 9001 && map.id !== 9002) return [];
  const camps = map.id === 9002 ? diagonalLayout.camps : { song: { x: 450, y: 1792 }, jin: { x: 3134, y: 1792 } };
  return (['song', 'jin'] as const).flatMap(team => [
    { id: `${team}-tongkim`, npcId: 'tongkim', team, position: { x: camps[team].x + 105, y: camps[team].y + 50 } },
    { id: `${team}-pharmacy`, npcId: 'pharmacy', team, position: { x: camps[team].x + 145, y: camps[team].y - 45 } },
    { id: `${team}-horse`, npcId: 'horse', team, position: { x: camps[team].x - 120, y: camps[team].y - 65 } },
  ]);
}
/** Materialize inherited placements only when editing, so history and old files stay intact. */
export function editableNpcs(map: MapDefinition): MapNpc[] {
  return map.npcs ??= structuredClone(mapNpcs(map));
}
/** Keep an explicit list so removing inherited NPCs survives save/reload. */
export function removeNpc(map: MapDefinition, id: string): boolean {
  if (!mapNpcs(map).some(npc => npc.id === id)) return false;
  map.npcs = editableNpcs(map).filter(npc => npc.id !== id);
  return true;
}
export function npcBounds(npc: MapNpc) {
  const definition = getNpc(npc.npcId)!;
  const scale = npc.scale ?? definition.scale;
  return { x: npc.position.x - definition.anchor.x * scale,
    y: npc.position.y - definition.anchor.y * scale,
    width: definition.width * scale, height: definition.height * scale };
}
export function hitNpc(npcs: MapNpc[], point: Point, padding = 0): MapNpc | undefined {
  return [...npcs].sort((a, b) => b.position.y - a.position.y).find(npc => {
    const box = npcBounds(npc);
    return point.x >= box.x - padding && point.x <= box.x + box.width + padding &&
      point.y >= box.y - padding && point.y <= box.y + box.height + padding;
  });
}
/** One lightweight idle sheet (or its first frame) shared by the editor and game. */
export function drawNpc(context: CanvasRenderingContext2D, image: HTMLImageElement | null, npc: MapNpc, time = 0): boolean {
  if (!image?.complete || !image.naturalWidth) return false;
  const definition = getNpc(npc.npcId)!;
  const frame = npc.animated ? Math.floor(time / definition.frameMs) % definition.frames : 0;
  const box = npcBounds(npc);
  context.drawImage(image, frame * definition.width, (npc.direction ?? 0) * definition.height,
    definition.width, definition.height, box.x, box.y, box.width, box.height);
  return true;
}
