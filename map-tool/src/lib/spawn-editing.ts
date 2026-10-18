import type { EditorDocument } from "./types";
import type { SpawnPreview } from "./spawn-preview";

/** Mutates the editor's cloned document, preserving the exact displayed sample. */
export function retainSpawnPoints(document: EditorDocument, points: SpawnPreview[]) {
  const map = document.map;
  if (map.spawnMode === "fixed" || map.spawns.length) {
    map.spawnMode = "fixed";
    return;
  }
  const base = document.encounters.find((profile) => profile.mapId === map.id);
  if (!base) throw new Error("Tạo encounter trong tab Gameplay trước.");
  const profiles = new Map<string, string>();
  map.spawns = points.map((point) => {
    const key = `${point.rank === "boss" ? "boss" : "monster"}-${point.monsterId}`;
    let encounterId = profiles.get(key);
    if (!encounterId) {
      encounterId = availableId(document, `map-${map.id}-sample-${key}`);
      const profile = structuredClone(base);
      profile.id = encounterId;
      profile.name = `${map.name} · ${key}`;
      if (point.rank === "boss") profile.bossId = point.monsterId;
      else profile.monsterIds = [point.monsterId];
      document.encounters.push(profile);
      profiles.set(key, encounterId);
    }
    return {
      id: point.id,
      position: { x: point.x, y: point.y },
      encounterId,
      rank: point.rank,
      initialDelaySeconds: point.delay,
    };
  });
  map.spawnMode = "fixed";
}

/** Isolate the selected point so changing its monster never changes its neighbors. */
export function setSpawnMonster(document: EditorDocument, id: string, monsterId: number) {
  const spawn = document.map.spawns.find((point) => point.id === id);
  const source = document.encounters.find((profile) => profile.id === spawn?.encounterId);
  if (!spawn || !source) throw new Error("Không tìm thấy encounter của điểm spawn.");
  const privateId = `map-${document.map.id}-spawn-${id}`;
  const owned = source.id === privateId && document.map.spawns.filter((point) => point.encounterId === source.id).length === 1;
  const profile = owned ? source : structuredClone(source);
  if (!owned) {
    profile.id = availableId(document, privateId);
    profile.name = `${document.map.name} · ${id}`;
    profile.mapId = document.map.id;
    document.encounters.push(profile);
    spawn.encounterId = profile.id;
  }
  if (spawn.rank === "boss") profile.bossId = monsterId;
  else profile.monsterIds = [monsterId];
}

function availableId(document: EditorDocument, prefix: string): string {
  let id = prefix, suffix = 1;
  while (document.encounters.some((profile) => profile.id === id)) id = `${prefix}-${suffix++}`;
  return id;
}
