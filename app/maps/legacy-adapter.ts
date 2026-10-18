import { getMap } from './catalog';
import { createMapScene } from './rendering';
import { createNavigationRuntime } from './runtime';
import type { LegacyNavigation, MapDefinition, MapKey, MovingActor, Point } from './types';

export interface LegacyMapHost {
  actionLocked(actor: MovingActor): boolean;
  imageFor(path: string): HTMLImageElement | null;
  townId(): number;
  obstaclesDisabled(): boolean;
  navigationFor(id: string): LegacyNavigation | undefined;
  groundItems(): Point[];
}

/** The compatibility boundary knows legacy keys, but never reads ambient globals. */
export function createLegacyMapAdapter(host: LegacyMapHost) {
  const navigation = createNavigationRuntime(host.actionLocked);
  const scene = createMapScene(host.imageFor);
  let activeMap: MapDefinition | undefined;
  function load(key: MapKey): boolean {
    const id = key === 'town' ? host.townId() : key;
    const map = getMap(Number(id)), disabled = host.obstaclesDisabled();
    const definition = disabled ? undefined : host.navigationFor(String(id));
    const loaded = navigation.load(key, definition, !disabled && map?.navigation.kind === 'open' ? map.size : undefined);
    activeMap = map;
    scene.setMap(map);
    for (const item of host.groundItems()) [item.x, item.y] = navigation.resolvePosition(item.x, item.y);
    return loaded;
  }
  /** Resolve the authored entry against the navigation that was successfully loaded. */
  function entryPosition(): [number, number] {
    const entry = activeMap?.entry ?? { x: navigation.bounds.w / 2, y: navigation.bounds.h / 2 };
    return navigation.resolvePosition(entry.x, entry.y);
  }
  return { navigation, scene, load, entryPosition };
}
