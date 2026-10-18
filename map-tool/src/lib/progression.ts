import type { EditorDocument } from "./types";

/** Append only: existing stage indices are part of persisted character saves. */
export function ensureMapListed(document: EditorDocument): void {
  const id = document.map.id;
  if (document.progression.some((entry) => entry.mapId === id || entry.alternateMapIds.includes(id))) return;
  if (!document.encounters.some((profile) => profile.mapId === id)) throw new Error("Map cần encounter trước khi xuất hiện trong danh sách luyện công.");
  document.progression.push({ mapId: id, alternateMapIds: [] });
  for (const profile of document.encounters) if (profile.mapId === id) delete profile.alternate;
}
