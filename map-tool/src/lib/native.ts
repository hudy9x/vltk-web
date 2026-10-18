import { invoke } from "@tauri-apps/api/core";
import { resolveMapAsset } from "@game/assets";
import type { EditorDocument, PendingAsset, Workspace } from "./types";
export const openWorkspace = (root?: string) =>
  invoke<Workspace>("open_workspace", { root: root || null });
export const saveDocument = (
  document: EditorDocument,
  expectedRevision: string,
  isNew: boolean,
) =>
  invoke<Workspace>("save_map", {
    request: { document, expectedRevision, isNew },
  });
export const readAsset = (path: string) =>
  invoke<ArrayBuffer>("read_asset", { path });
export function base64(bytes: ArrayBuffer): string {
  let data = "";
  for (const byte of new Uint8Array(bytes)) data += String.fromCharCode(byte);
  return btoa(data);
}
export class AssetStore {
  private images = new Map<string, HTMLImageElement>();
  private urls: string[] = [];
  private pending = new Map<string, string>();
  private listeners = new Set<() => void>();
  errors = new Set<string>();
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private notify() {
    this.listeners.forEach((listener) => listener());
  }
  addPending(mapId: number, path: string, data: string) {
    this.pending.set(resolveMapAsset(mapId, path), data);
  }
  /** Restore the image version belonging to the current Undo/Redo snapshot. */
  syncPending(mapId: number, assets: PendingAsset[]) {
    const next = new Map(assets.map(asset => [resolveMapAsset(mapId, asset.path), asset.data]));
    let changed = false;
    for (const path of new Set([...this.pending.keys(), ...next.keys()])) {
      if (this.pending.get(path) === next.get(path)) continue;
      this.images.delete(path);
      this.errors.delete(path);
      changed = true;
    }
    this.pending = next;
    if (changed) this.notify();
  }
  imageFor = (path: string): HTMLImageElement => {
    const cached = this.images.get(path);
    if (cached) return cached;
    const image = new Image();
    this.images.set(path, image);
    image.onload = () => {
      this.errors.delete(path);
      this.notify();
    };
    image.onerror = () => {
      this.errors.add(path);
      this.notify();
    };
    const pending = this.pending.get(path);
    if (pending)
      image.src = `data:image/${path.toLowerCase().endsWith(".png") ? "png" : path.toLowerCase().endsWith(".webp") ? "webp" : "jpeg"};base64,${pending}`;
    else
      readAsset(path)
        .then((bytes) => {
          const url = URL.createObjectURL(new Blob([bytes]));
          this.urls.push(url);
          image.src = url;
        })
        .catch(() => {
          this.errors.add(path);
          this.notify();
        });
    return image;
  };
  dispose() {
    this.urls.forEach(URL.revokeObjectURL);
    this.urls = [];
    this.images.clear();
    this.pending.clear();
    this.errors.clear();
  }
}
