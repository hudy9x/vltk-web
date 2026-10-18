import type { EditorDocument } from "./types";

/** Ground is required. Removing a world layer must also remove its colliders. */
export function deleteMapLayer(document: EditorDocument, id: string): boolean {
  const layer = document.map.layers.find(layer => layer.id === id);
  if (!layer || layer.type === "ground") return false;
  document.map.layers = document.map.layers.filter(layer => layer.id !== id);
  for (const key of Object.keys(document.project.colliders))
    if (key.startsWith(`${id}/`)) delete document.project.colliders[key];
  return true;
}
