import type { MapDefinition, MapObject } from './types';
import { resolveMapAsset } from './assets';

export interface Viewport { x: number; y: number; width: number; height: number }
export interface WorldObjectItem { mapObject: MapObject; y: number }

/** Adds map visuals to the existing actor renderer without owning actor state. */
export function createMapScene(imageFor: (path: string) => HTMLImageElement | null) {
  let active: MapDefinition | undefined;
  function setMap(map: MapDefinition | undefined): void { active = map; }
  function drawGround(context: CanvasRenderingContext2D, image: HTMLImageElement | null): boolean {
    if (!active || !image?.complete || !image.naturalWidth) return false;
    const layer = active.layers.find(layer => layer.type === 'ground');
    context.save();
    context.globalAlpha *= layer && 'opacity' in layer ? layer.opacity ?? 1 : 1;
    context.drawImage(image, 0, 0, active.size.width, active.size.height);
    context.restore();
    return true;
  }
  function worldObjects(view: Viewport): WorldObjectItem[] {
    if (!active) return [];
    const result: WorldObjectItem[] = [];
    for (const layer of active.layers) if (layer.type === 'world') for (const object of layer.objects) {
      const image = imageFor(resolveMapAsset(active.id, object.image));
      if (!image?.complete || !image.naturalWidth) continue;
      const left = object.position.x - object.anchor.x * object.scale;
      const top = object.position.y - object.anchor.y * object.scale;
      if (left + image.naturalWidth * object.scale < view.x || top + image.naturalHeight * object.scale < view.y ||
          left > view.x + view.width || top > view.y + view.height) continue;
      result.push({ mapObject: object, y: object.position.y + object.depthOffsetY });
    }
    return result;
  }
  function drawObject(context: CanvasRenderingContext2D, object: MapObject): void {
    if (!active) return;
    const image = imageFor(resolveMapAsset(active.id, object.image));
    if (!image?.complete || !image.naturalWidth) return;
    context.drawImage(image, object.position.x - object.anchor.x * object.scale,
      object.position.y - object.anchor.y * object.scale, image.naturalWidth * object.scale, image.naturalHeight * object.scale);
  }
  function drawImageLayers(context: CanvasRenderingContext2D, type: 'shadow' | 'foreground'): void {
    if (!active) return;
    for (const layer of active.layers) {
      if (layer.type !== type || !('image' in layer)) continue;
      const image = imageFor(resolveMapAsset(active.id, layer.image));
      if (!image?.complete || !image.naturalWidth) continue;
      context.save();
      context.globalAlpha *= layer.opacity ?? 1;
      context.drawImage(image, 0, 0, active.size.width, active.size.height);
      context.restore();
    }
  }
  function drawAtmosphere(context: CanvasRenderingContext2D): void {
    if (!active) return;
    for (const layer of active.layers) if (layer.type === 'atmosphere') {
      context.save(); context.globalAlpha *= layer.opacity; context.fillStyle = layer.color;
      context.fillRect(0, 0, active.size.width, active.size.height); context.restore();
    }
  }
  return { setMap, drawGround, hasMap: () => active !== undefined, worldObjects, drawObject, drawShadows: (context: CanvasRenderingContext2D) => drawImageLayers(context, 'shadow'),
    drawForeground: (context: CanvasRenderingContext2D) => drawImageLayers(context, 'foreground'), drawAtmosphere };
}
