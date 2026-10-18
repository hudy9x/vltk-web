/** Resolve map-local images without importing the catalog or live game state. */
export function resolveMapAsset(mapId: number, asset: string): string {
  return asset.startsWith('./') ? `app/maps/content/${mapId}/${asset.slice(2)}` : asset;
}
