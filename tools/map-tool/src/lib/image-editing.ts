import type { EditorDocument, PendingAsset } from "./types";

export function imageExtension(data: string): "png" | "jpg" | "webp" {
  const header = atob(data.slice(0, 24));
  if (header.startsWith("\x89PNG\r\n\x1a\n")) return "png";
  if (header.startsWith("\xff\xd8")) return "jpg";
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") return "webp";
  throw new Error("Ảnh không phải PNG/JPEG/WebP hợp lệ.");
}
export function layerImageStem(id: string, ground: boolean): string {
  return ground ? "ground" : `layer-${Array.from(new TextEncoder().encode(id), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
/** Original bytes are immutable. Only the current image slot is replaced. */
export function stageLayerImage(document: EditorDocument, id: string, data: string,
  revision: string, previousData?: string): void {
  const layer = document.map.layers.find(layer => layer.id === id);
  if (!layer || !("image" in layer)) throw new Error("Layer không có ảnh.");
  document.project.imageRevision = revision;
  const stem = layerImageStem(id, layer.type === "ground");
  const originals = document.project.originalImages ??= {};
  const pending = (asset: PendingAsset) => {
    document.assets = document.assets.filter(item => item.path !== asset.path);
    document.assets.push(asset);
  };
  if (!originals[id]) {
    const original = previousData ?? data;
    const originalPath = `./assets/${layer.type === "ground" ? "default" : `${stem}-default`}.${imageExtension(original)}`;
    originals[id] = originalPath;
    pending({ path: originalPath, data: original, revision: `${revision}:original` });
    if (previousData === undefined) { layer.image = originalPath; return; }
  }
  // Discard earlier unsaved versions, including a version with another extension.
  document.assets = document.assets.filter(asset => !["png", "jpg", "jpeg", "webp"].some(ext => asset.path === `./assets/${stem}.${ext}`));
  layer.image = `./assets/${stem}.${imageExtension(data)}`;
  pending({ path: layer.image, data, revision });
}
