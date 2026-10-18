import type { NavigationRuntime } from './runtime';
import type { Point } from './types';

/** Image sampling is isolated from navigation and injectable for headless tests. */
export function createGroundProbe(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {
  let source: HTMLImageElement | null = null, sourceUrl = '', worldWidth = 0, worldHeight = 0;
  let pixels: ImageData | null = null, scaleX = 1, scaleY = 1;
  function isVoid(image: HTMLImageElement | null, width: number, height: number, x: number, y: number): boolean {
    if (!image?.complete || !image.naturalWidth) return false;
    if (source !== image || sourceUrl !== image.src || worldWidth !== width || worldHeight !== height) {
      source = image; sourceUrl = image.src; worldWidth = width; worldHeight = height; pixels = null;
      try {
        const canvas = createCanvas();
        canvas.width = Math.ceil(image.naturalWidth / 16); canvas.height = Math.ceil(image.naturalHeight / 16);
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          scaleX = canvas.width / width; scaleY = canvas.height / height;
        }
      } catch { pixels = null; }
    }
    if (!pixels) return false;
    const col = Math.floor(x * scaleX), row = Math.floor(y * scaleY);
    if (col < 0 || row < 0 || col >= pixels.width || row >= pixels.height) return true;
    const offset = (row * pixels.width + col) * 4;
    return pixels.data[offset] + pixels.data[offset + 1] + pixels.data[offset + 2] < 75;
  }
  return { isVoid };
}

export function findVisibleGround(navigation: NavigationRuntime, player: Point,
  isVoid: (x: number, y: number) => boolean): [number, number] | null {
  const grid = navigation.state.g;
  if (!grid) return null;
  let best: [number, number] | null = null, distance = Infinity;
  for (let cell = 0; cell < grid.ok.length; cell++) {
    if (!grid.ok[cell]) continue;
    const x = (cell % grid.gw + 0.5) * grid.cw, y = (Math.floor(cell / grid.gw) + 0.5) * grid.ch;
    const next = (x - player.x) ** 2 + (y - player.y) ** 2;
    if (next < distance && navigation.canStand(x, y) && !isVoid(x, y) && !isVoid(x + 48, y) &&
        !isVoid(x - 48, y) && !isVoid(x, y + 32) && !isVoid(x, y - 32)) {
      best = [x, y]; distance = next;
    }
  }
  return best;
}
