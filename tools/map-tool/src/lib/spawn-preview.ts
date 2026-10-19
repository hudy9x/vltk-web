import { generateFieldPoints } from "@game/spawn/generation";
import { createNavigationRuntime } from "@game/runtime";
import type { MapDefinition, Point } from "@game/types";
import type { EditorDocument } from "./types";
export interface SpawnPreview extends Point {
  id: string;
  monsterId: number;
  rank: "normal" | "elite" | "boss";
  delay: number;
  fixed: boolean;
}
/** A deterministic sample; only explicit editing materializes it into map.spawns. */
export function spawnPreview(
  document: EditorDocument,
  map: MapDefinition,
  seed = 0,
  isVoid: (x: number, y: number) => boolean = () => false,
): SpawnPreview[] {
  let value = (map.id + seed * 2654435761) >>> 0;
  const random = () =>
    (value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296;
  if (map.spawnMode === "fixed" || map.spawns.length)
    return map.spawns.flatMap((spawn) => {
      const profile = document.encounters.find(
        (profile) => profile.id === spawn.encounterId,
      );
      if (!profile) return [];
      return [
        {
          ...spawn.position,
          id: spawn.id,
          rank: spawn.rank,
          delay: spawn.initialDelaySeconds,
          fixed: true,
          monsterId:
            spawn.rank === "boss"
              ? profile.bossId
              : profile.monsterIds[
                  Math.floor(random() * profile.monsterIds.length)
                ],
        },
      ];
    });
  const profile = document.encounters.find(
    (profile) => profile.mapId === map.id,
  );
  if (!profile) return [];
  const navigation = createNavigationRuntime(),
    nav = map.navigation;
  navigation.load(
    map.id,
    nav.kind === "grid"
      ? {
          w: map.size.width,
          h: map.size.height,
          gw: nav.columns,
          gh: nav.rows,
          cw: nav.cellSize.width,
          ch: nav.cellSize.height,
          obs: nav.blockedBase64,
        }
      : null,
    map.size,
  );
  const [x, y] = navigation.resolvePosition(map.entry.x, map.entry.y);
  return generateFieldPoints(
    navigation,
    {
      id: map.id,
      n: map.name,
      lo: profile.levelRange[0],
      hi: profile.levelRange[1],
      m: profile.monsterIds,
      boss: profile.bossId,
      sw: profile.equipmentElementWeights,
      bg: "",
    },
    { x, y },
    [6, 8],
    isVoid,
    random,
  ).map((point, index) => ({
    x: point.x,
    y: point.y,
    id: `preview-${index + 1}`,
    monsterId: point.tid,
    rank: point.cls,
    delay: point.t,
    fixed: false,
  }));
}
