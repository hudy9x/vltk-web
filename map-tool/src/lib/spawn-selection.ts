import type { Point } from "@game/types";
import type { EditorDocument } from "./types";

/** Inclusive world-space bounds, independent of drag direction and camera zoom. */
export function spawnIdsInRegion(points: (Point & { id: string })[], start: Point, end: Point): string[] {
  const left = Math.min(start.x, end.x), right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y), bottom = Math.max(start.y, end.y);
  return points.filter((point) => point.x >= left && point.x <= right && point.y >= top && point.y <= bottom).map((point) => point.id);
}

export function deleteSpawnPoints(document: EditorDocument, ids: readonly string[]): void {
  const selected = new Set(ids);
  if (!document.map.spawns.some((point) => selected.has(point.id))) return;
  document.map.spawnMode = "fixed";
  document.map.spawns = document.map.spawns.filter((point) => !selected.has(point.id));
}
