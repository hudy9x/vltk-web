/** Retain decoded pixels instead of asking the browser to decode WebP sheets on every draw. */
type Surface = HTMLCanvasElement | OffscreenCanvas;
interface Bitmap { width: number; height: number; close(): void }
interface Environment {
  bitmap?: (image: HTMLImageElement, options?: ImageBitmapOptions) => Promise<ImageBitmap>;
  canvas(width: number, height: number): Surface;
}
interface Options { maxBytes?: number; maxEntries?: number; concurrency?: number; environment?: Environment }
interface Entry { image: HTMLImageElement; bitmap?: ImageBitmap; bytes: number; used: number; live: boolean; signature: string }
interface Mini { image: HTMLImageElement; key: string; surface?: Surface; live: boolean }
export interface MinimapOptions { size: number; worldWidth: number; tileSize: number; tiled: boolean; resolution: number }
export function visibleRect(x: number, y: number, width: number, height: number, view: {x:number;y:number;width:number;height:number}, margin = 2): boolean {
  return x + width >= view.x - margin && y + height >= view.y - margin &&
    x <= view.x + view.width + margin && y <= view.y + view.height + margin;
}
/** Keep giant Retina back buffers near 4K pixel count, without changing CSS/world coordinates. */
export function backingScale(width: number, height: number, requested: number, maxPixels = 8 * 1024 * 1024): number {
  if (!(width > 0) || !(height > 0)) return requested;
  return Math.min(requested,Math.sqrt(maxPixels / (width * height)));
}
function browserEnvironment(): Environment {
  return {
    bitmap: typeof createImageBitmap === 'function' ? (image, options) => createImageBitmap(image, options) : undefined,
    canvas(width, height) {
      if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width,height);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
    },
  };
}
export function createRasterCache(options: Options = {}) {
  const environment = options.environment || browserEnvironment();
  // Full-sheet copies are opt-in: this budget cannot account for the browser's
  // original decoded images, temporary decode buffers or GPU texture copies.
  // Keep only the small minimap surface by default to avoid increasing peak memory.
  const maxBytes = options.maxBytes ?? 0, maxEntries = options.maxEntries ?? 256;
  const concurrency = options.concurrency ?? 1;
  const rows = new WeakMap<HTMLImageElement,Entry>(), entries = new Set<Entry>();
  const retryAfter = new WeakMap<HTMLImageElement,{frame:number;signature:string}>();
  const jobs: (() => Promise<void>)[] = [], minis: Mini[] = [];
  let bytes = 0, frame = 0, running = 0, epoch = 0;
  function pump() {
    while (running < concurrency && jobs.length) {
      const job = jobs.shift()!; running++;
      void job().catch(() => {}).finally(() => { running--; pump(); });
    }
  }
  function remove(entry: Entry) {
    if (!entry.live) return;
    entry.live = false; entries.delete(entry); rows.delete(entry.image); bytes -= entry.bytes;
    entry.bitmap?.close();
  }
  function room(size: number) {
    if (size > maxBytes) return false;
    for (const entry of entries) {
      if (bytes + size <= maxBytes && entries.size < maxEntries) break;
      // A working set larger than the budget falls back to Image; do not churn live sheets.
      if (entry.used < frame - 1) remove(entry);
    }
    return bytes + size <= maxBytes && entries.size < maxEntries;
  }
  function source(image: HTMLImageElement): CanvasImageSource {
    if (!environment.bitmap || !image.complete || !image.naturalWidth || !image.naturalHeight) return image;
    const signature = `${image.currentSrc || image.src}|${image.naturalWidth}|${image.naturalHeight}`;
    let entry = rows.get(image);
    if (entry && entry.signature !== signature) { remove(entry); entry = undefined; }
    if (entry) {
      entry.used = frame; entries.delete(entry); entries.add(entry);
      return entry.bitmap || image;
    }
    const retry = retryAfter.get(image);
    if (retry && retry.signature === signature && retry.frame > frame) return image;
    const size = image.naturalWidth * image.naturalHeight * 4;
    if (!room(size)) { retryAfter.set(image,{frame:frame + 60,signature}); return image; }
    const row: Entry = {image,bytes:size,used:frame,live:true,signature};
    entries.add(row); rows.set(image,row); bytes += size;
    jobs.push(async () => {
      if (!row.live) return;
      try {
        const bitmap = await environment.bitmap!(image);
        if (!row.live || `${image.currentSrc || image.src}|${image.naturalWidth}|${image.naturalHeight}` !== signature) {
          bitmap.close(); if (row.live) remove(row); return;
        }
        row.bitmap = bitmap;
      } catch { remove(row); retryAfter.set(image,{frame:frame + 300,signature}); }
    });
    pump(); return image;
  }
  function minimap(image: HTMLImageElement, settings: MinimapOptions): Surface | null {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) return null;
    const {size,worldWidth,tileSize,tiled} = settings;
    const resolution = Math.min(2,Math.max(1,settings.resolution || 1));
    const pixels = Math.min(512,Math.max(1,Math.ceil(size * resolution)));
    const key = `${image.currentSrc || image.src}|${image.naturalWidth}|${image.naturalHeight}|${pixels}|${worldWidth}|${tileSize}|${tiled}`;
    const cached = minis.find(row => row.image === image && row.key === key);
    if (cached) return cached.surface || null;
    const row: Mini = {image,key,live:true}, token = epoch;
    minis.push(row);
    // At most two small surfaces, including those still being prepared.
    while (minis.length > 2) { const old = minis.shift()!; old.live = false; if (old.surface) old.surface.width = old.surface.height = 0; }
    jobs.unshift(async () => {
      if (!row.live || token !== epoch) return;
      let bitmap: Bitmap | undefined;
      try {
        const count = tiled ? Math.max(1,Math.round(worldWidth / tileSize)) : 1;
        const tilePixels = Math.max(1,Math.ceil(pixels / count));
        if (environment.bitmap) {
          try { bitmap = await environment.bitmap(image,{resizeWidth:tilePixels,resizeHeight:tilePixels,resizeQuality:'medium'}); }
          catch { if (typeof image.decode === 'function') await image.decode(); }
        } else if (typeof image.decode === 'function') await image.decode();
        if (!row.live || token !== epoch) return;
        const canvas = environment.canvas(pixels,pixels);
        const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!context) throw new Error('No minimap context');
        const tile = pixels / count, drawable = (bitmap || image) as CanvasImageSource;
        for (let x = 0; x < count; x++) for (let y = 0; y < count; y++) {
          context.save(); context.translate(x*tile + (x&1 ? tile : 0),y*tile + (y&1 ? tile : 0));
          context.scale(x&1 ? -1 : 1,y&1 ? -1 : 1); context.drawImage(drawable,0,0,tile,tile); context.restore();
        }
        row.surface = canvas;
      } catch {
        // Failed surfaces stay as placeholders until the image/map/size changes.
        // Re-attempting a huge decode every frame would recreate the original stall.
      } finally { bitmap?.close(); }
    });
    pump(); return null;
  }
  return {
    source, minimap,
    beginFrame() { frame++; for (const entry of entries) if (entry.used < frame - 300) remove(entry); },
    clear() {
      epoch++; for (const entry of entries) remove(entry); jobs.length = 0;
      for (const row of minis) { row.live = false; if (row.surface) row.surface.width = row.surface.height = 0; }
      minis.length = 0;
    },
    get stats() { return {bytes,entries:entries.size,queued:jobs.length,running}; },
  };
}
