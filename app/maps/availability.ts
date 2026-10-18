export const MISSING_MAP_MESSAGE = 'Map không tồn tại. sử dụng Thổ địa phù ngay';
export interface AvailabilityManifest { schemaVersion: 1; maps: Record<string, 'available' | 'test'> }

/** Independent of ordinary game modals, so another panel cannot replace the OK action. */
export function showMapUnavailableNotice(message: string, acknowledge: () => void, root: Document = document): void {
  const overlay = root.createElement('div'), panel = root.createElement('div');
  overlay.id = 'mapUnavailableNotice';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'mapUnavailableTitle');
  overlay.setAttribute('aria-describedby', 'mapUnavailableMessage');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;background:#0009;padding:16px';
  panel.style.cssText = 'max-width:420px;width:100%;background:#1b1712;border:1px solid #8a6a2c;border-radius:8px;padding:16px;color:#f0e2c0';
  const title = root.createElement('h3'), text = root.createElement('p'), button = root.createElement('button');
  title.id = 'mapUnavailableTitle'; title.textContent = 'Thông báo';
  text.id = 'mapUnavailableMessage'; text.textContent = message;
  button.className = 'btn red'; button.textContent = 'OK';
  button.addEventListener('click', () => { overlay.remove(); acknowledge(); }, { once: true });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); button.focus(); }
  });
  panel.append(title, text, button); overlay.append(panel); root.body.append(overlay); button.focus();
}

/** The compiled game never loads a Test map; a manifest can revoke live maps. */
export function createMapAvailability(loadedIds: readonly number[]) {
  const loaded = new Set(loadedIds);
  let allowed = new Set(loadedIds);
  return {
    has: (id: number) => loaded.has(id) && allowed.has(id),
    update(value: unknown): boolean {
      if (!value || typeof value !== 'object') return false;
      const manifest = value as AvailabilityManifest;
      if (manifest.schemaVersion !== 1 || !manifest.maps || typeof manifest.maps !== 'object' || Array.isArray(manifest.maps)) return false;
      const entries = Object.entries(manifest.maps);
      if (!entries.length || entries.some(([id, status]) => !/^[1-9]\d*$/.test(id) || !['available', 'test'].includes(status))) return false;
      // Town must remain a valid emergency destination. Reject broken manifests.
      if (manifest.maps['37'] !== 'available') return false;
      allowed = new Set(entries.filter(([, status]) => status === 'available').map(([id]) => Number(id)));
      return true;
    },
  };
}

interface AvailabilityHost {
  currentMapId(): number | null;
  isAvailable(id: number): boolean;
  fetchManifest(): Promise<unknown>;
  applyManifest(value: unknown): void;
  showNotice(message: string, acknowledge: () => void): void;
  returnToTown(): void;
  now(): number;
}

/** Pause simulation until OK, and keep network failures from evicting players. */
export function createMapAvailabilityGuard(host: AvailabilityHost) {
  let pending = false, fetching = false, nextPoll = 0;
  const requireMap = (id: number): boolean => {
    if (pending) return false;
    if (host.isAvailable(id)) return true;
    pending = true;
    host.showNotice(MISSING_MAP_MESSAGE, () => {
      if (!pending) return;
      host.returnToTown();
      pending = false;
    });
    return false;
  };
  return {
    require: requireMap,
    tick(): boolean {
      const now = host.now();
      if (!fetching && now >= nextPoll) {
        fetching = true;
        nextPoll = now + 5000;
        void host.fetchManifest().then(value => host.applyManifest(value)).catch(() => {}).finally(() => { fetching = false; });
      }
      const id = host.currentMapId();
      return !pending && (id === null || requireMap(id));
    },
  };
}
