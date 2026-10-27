import { encodePosition, encodeAppearance, newer } from './protocol';
import type { Appearance, Position, RemotePosition } from './protocol';
import { connect } from './transport';
import type { ConnectionConfig } from './transport';
export interface RenderPlayer extends RemotePosition { appearance: Appearance; animationTime: number }
interface Hooks { status: (text: string, online: boolean) => void }
type Sample = RemotePosition & { time: number };

/** Presentation only: remote players never enter enemy/ally/combat collections. */
export function createClient(hooks: Hooks) {
  let connection: Awaited<ReturnType<typeof connect>> | undefined;
  let connecting = false, generation = 0, retryAt = 0, failures = 0, disabled = false;
  let checked = false, online = false, sequence = 0, lastSend = 0, lastLook = '', lookAt = 0;
  let tick: number | undefined, map = 0, self = 0, receivedAt = 0, rosterRevision: number | undefined;
  let latestPosition: Position | undefined, latestLook: Appearance | undefined;
  let roster = new Map<number, Appearance>();
  const history = new Map<number, Sample[]>();
  const enabled = new URLSearchParams(location.search).get('multiplayer') !== 'off';
  const clear = () => { online = false; tick = undefined; rosterRevision = undefined; roster.clear(); history.clear(); };
  const disconnected = (error: Error) => {
    generation++; connecting = false;
    connection?.close(); connection = undefined; clear();
    retryAt = performance.now() + Math.min(30000, 1000 * 2 ** Math.min(5, failures++));
    hooks.status(`Online: ${error.message} · bấm để thử lại`, false);
  };
  async function start() {
    const attempt = ++generation;
    connecting = true; hooks.status('Online: đang kết nối…', false);
    try {
      const response = await fetch('/api/multiplayer/webtransport/session', { method: 'POST', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Không cấp được vé kết nối.');
      const config = await response.json() as ConnectionConfig & { enabled: boolean };
      if (attempt !== generation) return;
      checked = true;
      if (!config.enabled) { disabled = true; hooks.status('', false); return; }
      const ticket = Uint8Array.from(atob(config.ticket), c => c.charCodeAt(0));
      const result = await connect(config, encodeAppearance(latestLook!, ticket), packet => {
        if (attempt !== generation || packet.map !== map) return;
        if (packet.type === 'roster') {
          if (rosterRevision !== undefined && !newer(packet.revision, rosterRevision)) return;
          rosterRevision = packet.revision; roster = packet.players; return;
        }
        if (tick !== undefined && !newer(packet.tick, tick)) return;
        tick = packet.tick; self = packet.self; receivedAt = performance.now();
        const ids = new Set(packet.players.map(player => player.id));
        for (const id of history.keys()) if (!ids.has(id)) history.delete(id);
        for (const player of packet.players) {
          if (player.id === self) continue;
          const samples = history.get(player.id) || [];
          samples.push({ ...player, time: receivedAt });
          while (samples.length > 6) samples.shift();
          history.set(player.id, samples);
        }
        online = true; failures = 0;
        hooks.status(`Online · ${packet.players.length} người · WebTransport`, true);
      }, error => { if (attempt === generation) disconnected(error); });
      if (attempt !== generation) { result.close(); return; }
      connection = result; lastLook = JSON.stringify(latestLook); lookAt = performance.now();
    } catch (error) { if (attempt === generation) disconnected(error instanceof Error ? error : new Error(String(error))); }
    finally { if (attempt === generation) connecting = false; }
  }
  return {
    get active() { return enabled && !disabled && (online || connecting || !!connection); },
    get online() { return online; },
    /** Called after simulation, before render interpolation mutates local coordinates. */
    update(position: Omit<Position, 'seq'>, appearance: Appearance) {
      if (!enabled || disabled) return;
      const now = performance.now(); latestLook = appearance;
      if (position.map !== map) { map = position.map; clear(); }
      latestPosition = { ...position, seq: sequence };
      if (!connection && !connecting && now >= retryAt && (!checked || failures < 8)) void start();
      if (connection && now - lastSend >= 100) {
        lastSend = now; sequence = (sequence + 1) >>> 0;
        void connection.send(encodePosition({ ...latestPosition, seq: sequence }));
      }
      const look = JSON.stringify(appearance);
      if (connection && look !== lastLook && now - lookAt >= 1000) {
        lastLook = look; lookAt = now;
        const pendingGeneration = generation;
        void connection.reliable(encodeAppearance(appearance)).catch(error => {
          if (pendingGeneration === generation) disconnected(error);
        });
      }
      if (online && now - receivedAt > 3000) disconnected(new Error('Mất snapshot từ máy chủ.'));
    },
    players(): RenderPlayer[] {
      const now = performance.now();
      if (!online || now - receivedAt > 1500) return [];
      const time = now - 100, result: RenderPlayer[] = [];
      for (const [id, samples] of history) {
        const appearance = roster.get(id); if (!appearance || !samples.length) continue;
        let a = samples[0], b = samples[samples.length - 1];
        for (let i = 1; i < samples.length; i++) if (samples[i].time >= time) { a = samples[i-1]; b = samples[i]; break; }
        const ratio = b.time > a.time ? Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time))) : 1;
        const teleport = Math.hypot(b.x - a.x, b.y - a.y) > 250;
        result.push({ ...b, x: teleport ? b.x : a.x + (b.x-a.x)*ratio,
          y: teleport ? b.y : a.y + (b.y-a.y)*ratio, appearance, animationTime: now / 1000 });
      }
      return result;
    },
    retry() {
      generation++; connection?.close(); connection = undefined; connecting = false;
      clear(); disabled = false; checked = false; failures = 0; retryAt = 0;
    },
    close() { generation++; disabled = true; connection?.close(); connection = undefined; clear(); },
  };
}
