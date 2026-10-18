/** Resolve map-local images without importing the catalog or live game state. */
export function resolveMapAsset(mapId: number, asset: string): string {
  if (!/^\.\/[a-zA-Z0-9_/-][a-zA-Z0-9_./-]*\.(?:png|jpe?g|webp)$/i.test(asset) || asset.slice(2).split('/').some(part => part.startsWith('.'))) throw new Error(`Map ${mapId}: ảnh phải nằm trong thư mục map: ${asset}`);
  return `app/maps/content/${mapId}/${asset.slice(2)}`;
}
