/** pl_shaolin.st from monsters-and-zones-04; Jn from arena-02. */
export const previewActor = { width: 64, height: 47, anchorX: 32, anchorY: 45, scale: 1.35 };
/** Keep world units: camera zoom must scale the actor and scenery together. */
export function drawPreviewActor(context: CanvasRenderingContext2D, image: HTMLImageElement,
  position: { x: number; y: number }): void {
  if (!image.complete || !image.naturalWidth) return;
  const { width, height, anchorX, anchorY, scale } = previewActor;
  context.drawImage(image, 0, 0, width, height,
    position.x - anchorX * scale, position.y - anchorY * scale, width * scale, height * scale);
}
