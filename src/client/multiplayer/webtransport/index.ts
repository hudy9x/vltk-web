import { encodeCommand } from '../state/protocol';
import type { Command, WorldState } from '../state/protocol';
import { VERSION } from './protocol';
import { encodePosition, encodeAppearance, newer } from './protocol';
import type { Appearance, Position, RemotePosition } from './protocol';
import { connect } from './transport';
import type { ConnectionConfig } from './transport';
import { RemoteTimeline } from './interpolation';
export interface RenderPlayer extends RemotePosition {
  appearance: Appearance;
  animationTime: number;
}
interface Hooks {
  position?:()=>{map:number;x:number;y:number;life:number}|undefined;
  status: (text: string, online: boolean) => void;
  slot?: () => number;
  prepare?: () => Promise<void>;
  profile?: (value: any) => void;
  world?: (state: WorldState) => void;
  reset?: () => void;
}

/** Presentation only: remote players never enter enemy/ally/combat collections. */
export function createClient(hooks: Hooks) {
  let connection: Awaited<ReturnType<typeof connect>> | undefined;
  let suspended = false;
  let sessionSlot = -1,
    profileRevision = -1;
  let authoritative = false,
    commandSequence = 0,
    worldTick: number | undefined,
    profileAt = 0,
    profileBusy = false;
  let connecting = false,
    generation = 0,
    retryAt = 0,
    failures = 0,
    disabled = false;
  let checked = false,
    online = false,
    sequence = 0,
    lastSend = 0,
    lastLook = '',
    lookAt = 0;
  let tick: number | undefined,
    map = 0,
    self = 0,
    receivedAt = 0,
    waitingAt = 0,
    rosterRevision: number | undefined;
  let latestPosition: Position | undefined, latestLook: Appearance | undefined;
  let initialWorld=true,returningTown=false;
  let roster = new Map<number, Appearance>();
  const history = new Map<number, RemoteTimeline>();
  const lives=new Map<number,number>();
  const enabled = new URLSearchParams(location.search).get('multiplayer') !== 'off';
  const clear = () => {
    hooks.reset?.();
    worldTick = undefined;
    online = false;
    tick = undefined;
    rosterRevision = undefined;
    roster.clear();
    history.clear();lives.clear();
  };
  const disconnected = (error: Error) => {
    generation++;
    connecting = false;
    connection?.close();
    connection = undefined;
    clear();
    retryAt = performance.now() + Math.min(30000, 1000 * 2 ** Math.min(5, failures++));
    hooks.status(`Online: ${error.message} · bấm để thử lại`, false);
  };
  async function start() {
    initialWorld=true;returningTown=false;
    const attempt = ++generation;
    sessionSlot = hooks.slot?.() ?? 0;
    connecting = true;
    hooks.status('Online: đang kết nối…', false);
    try {
      await hooks.prepare?.();
      const response = await fetch('/api/multiplayer/webtransport/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot: hooks.slot?.() ?? 0, position:hooks.position?.() }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Không cấp được vé kết nối.');
      const config = (await response.json()) as ConnectionConfig & { enabled: boolean };
      if (attempt !== generation) return;
      checked = true;
      if (!config.enabled) {
        disabled = true;
        hooks.status('', false);
        return;
      }
      if(config && (globalThis as any).onlineDebug?.enabled)(globalThis as any).onlineDebug.log('connect-config',{
        protocol:config.protocol,playUrl:config.playUrl,serverDiagnostics:(config as any).diagnostics||null,
      });
      authoritative = true;
      const ticket = Uint8Array.from(atob(config.ticket), (c) => c.charCodeAt(0));
      const result = await connect(
        config,
        encodeAppearance(latestLook!, ticket),
        (packet) => {
          if (attempt !== generation) return;
          if(packet.type==='roster'&&(initialWorld||returningTown)){
            rosterRevision=packet.revision;roster=packet.players;return;
          }
          if(packet.type==='world'&&(initialWorld||returningTown&&packet.map!==map)){
            if(packet.map!==map){map=packet.map;history.clear();lives.clear();tick=undefined;worldTick=undefined;}
            initialWorld=false;returningTown=false;
          }
          if(packet.map!==map)return;
          if (packet.type === 'world') {
            if (worldTick !== undefined && !newer(packet.tick, worldTick)) return;
            worldTick = packet.tick;
            self = packet.self;
            for(const actor of packet.actors){if(actor.life!==undefined){if(lives.has(actor.id)&&lives.get(actor.id)!==actor.life)history.delete(actor.id);lives.set(actor.id,actor.life);}}
            hooks.world?.(packet);
            return;
          }
          if (packet.type === 'roster') {
            if (rosterRevision !== undefined && !newer(packet.revision, rosterRevision)) return;
            rosterRevision = packet.revision;
            roster = packet.players;
            return;
          }
          if (tick !== undefined && !newer(packet.tick, tick)) return;
          tick = packet.tick;
          self = packet.self;
          receivedAt = performance.now();
          const ids = new Set(packet.players.map((player) => player.id));
          for (const id of history.keys()) if (!ids.has(id)) history.delete(id);
          for (const player of packet.players) {
            if (player.id === self) continue;
            const timeline = history.get(player.id) || new RemoteTimeline();
            timeline.push(player, receivedAt);
            history.set(player.id, timeline);
          }
          online = true;
          failures = 0;
          hooks.status('Online', true);
        },
        (error) => {
          if (attempt === generation) disconnected(error);
        },
      );
      if (attempt !== generation) {
        result.close();
        return;
      }
      connection = result;
      waitingAt = performance.now();
      lastLook = JSON.stringify(latestLook);
      lookAt = performance.now();
    } catch (error) {
      if (attempt === generation)
        disconnected(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (attempt === generation) connecting = false;
    }
  }
  return {
    get active() {
      return enabled && !disabled && !suspended && (online || connecting || !!connection);
    },
    get online() {
      return online;
    },
    suspend() {
      if (suspended) return;
      suspended = true;
      generation++;
      connection?.close();
      connection = undefined;
      connecting = false;
      clear();
      hooks.status('', false);
    },
    get authoritative() {
      return enabled && !disabled && !suspended && (authoritative || connecting);
    },
    command(c: Command) {
      if (!connection || !online) return 0;
      if(c.kind===17)returningTown=true;
      const seq = ++commandSequence;
      const attempt = generation;
      void connection.reliable(encodeCommand(VERSION, seq, c)).catch((e) => {
        if (attempt === generation) disconnected(e);
      });
      return seq;
    },
    /** Called after simulation, before render interpolation mutates local coordinates. */
    update(position: Omit<Position, 'seq'>, appearance: Appearance) {
      if (!enabled || disabled) return;
      if (suspended) {
        suspended = false;
        checked = false;
        failures = 0;
        retryAt = 0;
      }
      if (sessionSlot >= 0 && sessionSlot !== (hooks.slot?.() ?? 0)) {
        profileRevision = -1;
        generation++;
        connection?.close();
        connection = undefined;
        connecting = false;
        clear();
        checked = false;
        failures = 0;
        retryAt = 0;
      }
      const now = performance.now();
      latestLook = appearance;
      if (position.map !== map && !initialWorld && !returningTown) {
        map = position.map;
        clear();
        waitingAt = now;
        if (connection) hooks.status('Online: đang chuyển bản đồ…', false);
        const attempt = generation;
        if (connection)
          void connection
            .reliable(encodeCommand(VERSION, ++commandSequence, { kind: 1, map }))
            .catch(error => { if (attempt === generation) disconnected(error); });
      }
      latestPosition = { ...position, seq: sequence };
      if (!connection && !connecting && now >= retryAt && (!checked || failures < 8)) void start();
      if (connection && now - lastSend >= 50) {
        lastSend = now;
        sequence = (sequence + 1) >>> 0;
        void connection.send(encodePosition({ ...latestPosition, seq: sequence }));
      }
      const look = JSON.stringify(appearance);
      if (connection && look !== lastLook && now - lookAt >= 250) {
        lastLook = look;
        lookAt = now;
        const pendingGeneration = generation;
        void connection.reliable(encodeAppearance(appearance)).catch((error) => {
          if (pendingGeneration === generation) disconnected(error);
        });
      }
      if (online && hooks.profile && !profileBusy && now >= profileAt) {
        profileAt = now + 1500;
        profileBusy = true;
        const attempt = generation;
        void fetch(
          '/api/multiplayer/character?slot=' +
            (hooks.slot?.() ?? 0) +
            '&revision=' +
            profileRevision,
          {
            signal: AbortSignal.timeout(5000),
          },
        )
          .then(async (response) => {
            if (response.status === 204) return;
            if (!response.ok) throw new Error('Character sync failed');
            const p = await response.json();
            if (attempt === generation) {
              profileRevision = p.revision;
              hooks.profile?.(p);
            }
          })
          .catch(() => {})
          .finally(() => {
            profileBusy = false;
          });
      }
      if (online && now - receivedAt > 3000) disconnected(new Error('Mất snapshot từ máy chủ.'));
      else if (connection && !online && now - waitingAt > 5000)
        disconnected(new Error('Máy chủ chưa chấp nhận bản đồ này. Hãy chọn lại bản đồ hoặc bấm thử lại.'));
    },
    players(): RenderPlayer[] {
      const now = performance.now();
      if (!online || now - receivedAt > 1500) return [];
      const result: RenderPlayer[] = [];
      for (const [id, timeline] of history) {
        const appearance = roster.get(id),
          position = timeline.sample(now);
        if (!appearance || !position) continue;
        result.push({ ...position, appearance, animationTime: now / 1000 });
      }
      return result;
    },
    retry() {
      generation++;
      connection?.close();
      connection = undefined;
      connecting = false;
      clear();
      disabled = false;
      checked = false;
      failures = 0;
      retryAt = 0;
    },
    close() {
      generation++;
      disabled = true;
      connection?.close();
      connection = undefined;
      clear();
    },
  };
}

export { newer } from './protocol';

export { LocalMotion } from "../state/local-motion";

// Share the native actor-cast/secondary-FX resolver; this does not create simulator actors or AI.
export { castSimulatorSkill as castSkillVisual } from "../../simulator/skill-cast";
