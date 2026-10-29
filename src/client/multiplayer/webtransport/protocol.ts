import { decodeWorld } from '../state/protocol';
import type { WorldState } from '../state/protocol';
/** Protocol v7: little endian, pixel coordinates float32. No JSON in QUIC packets. */
export const VERSION = 7;
export const MAX_PLAYERS = 32;
export interface Appearance {
  name: string; faction: number; sex: number; bodySex: number; ride: number;
  helm: number; armor: number; weapon: number; horse: number;
  effects?: number[]; rebirth?: number;
}
export interface Position { seq: number; map: number; timestamp: number; effectTime: number; x: number; y: number; dir: number; moving: boolean }
export interface RemotePosition extends Omit<Position, 'map'> { id: number }
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
export function newer(a: number, b: number): boolean { return (a - b | 0) > 0; }

export function encodePosition(value: Position): Uint8Array {
  if (![value.x, value.y, value.effectTime].every(Number.isFinite) || value.effectTime < 0) throw new Error('Invalid position');
  const bytes = new Uint8Array(28), view = new DataView(bytes.buffer);
  bytes.set([VERSION, 2]);
  view.setUint32(2, value.seq, true); view.setUint32(6, value.map, true);
  view.setUint32(10, value.timestamp, true); view.setFloat32(14, value.effectTime, true);
  view.setFloat32(18, value.x, true); view.setFloat32(22, value.y, true);
  bytes[26] = value.dir & 7; bytes[27] = +value.moving;
  return bytes;
}
export function encodeAppearance(value: Appearance, ticket?: Uint8Array): Uint8Array {
  const name = encoder.encode(value.name.trim());
  const effects = value.effects || [], rebirth = value.rebirth || 0;
  if (name.length < 1 || name.length > 96 || (ticket && ticket.length !== 69)) throw new Error('Invalid identity');
  if (effects.length > 12 || new Set(effects).size !== effects.length || effects.some(id => !Number.isInteger(id) || id < 1 || id > 65535) || !Number.isInteger(rebirth) || rebirth < 0 || rebirth > 5) throw new Error('Invalid effects');
  const offset = 18 + effects.length * 2;
  const bytes = new Uint8Array(offset + name.length + (ticket?.length || 0));
  const view = new DataView(bytes.buffer);
  bytes.set([VERSION, ticket ? 1 : 3, value.faction, value.sex, value.bodySex, value.ride]);
  [value.helm, value.armor, value.weapon, value.horse].forEach((part, i) => view.setInt16(6 + i * 2, part, true));
  view.setUint16(14, name.length, true); bytes[16] = rebirth; bytes[17] = effects.length;
  effects.forEach((id, i) => view.setUint16(18 + i * 2, id, true)); bytes.set(name, offset);
  if (ticket) bytes.set(ticket, offset + name.length);
  return bytes;
}
export function decodePacket(bytes: Uint8Array): WorldState |
  { type: 'snapshot'; tick: number; self: number; map: number; players: RemotePosition[] } |
  { type: 'roster'; revision: number; map: number; players: Map<number, Appearance> } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 12 || bytes[0] !== VERSION) throw new Error('Unsupported multiplayer packet');
  if (bytes[1] === 17) return decodeWorld(bytes);
  if (bytes[1] === 4) {
    if (bytes.length < 16) throw new Error('Truncated snapshot');
    const count = view.getUint16(14, true);
    if (count > MAX_PLAYERS || bytes.length !== 16 + count * 26) throw new Error('Invalid snapshot size');
    const players: RemotePosition[] = [];
    for (let i = 0, offset = 16; i < count; i++, offset += 26) {
      const x = view.getFloat32(offset + 16, true), y = view.getFloat32(offset + 20, true), effectTime = view.getFloat32(offset + 12, true);
      if (![x, y, effectTime].every(Number.isFinite) || effectTime < 0 || bytes[offset + 24] > 7 || bytes[offset + 25] > 1) throw new Error('Invalid snapshot position');
      players.push({ id: view.getUint32(offset, true), seq: view.getUint32(offset + 4, true), x, y,
        timestamp: view.getUint32(offset + 8, true), effectTime, dir: bytes[offset + 24], moving: !!bytes[offset + 25] });
    }
    return { type: 'snapshot', tick: view.getUint32(2, true), self: view.getUint32(6, true),
      map: view.getUint32(10, true), players };
  }
  if (bytes[1] !== 5) throw new Error('Unknown multiplayer opcode');
  const count = view.getUint16(10, true), players = new Map<number, Appearance>();
  if (count > MAX_PLAYERS) throw new Error('Invalid roster size');
  let offset = 12;
  for (let i = 0; i < count; i++) {
    if (offset + 20 > bytes.length) throw new Error('Truncated roster');
    const id = view.getUint32(offset, true), length = view.getUint16(offset + 16, true);
    const rebirth = bytes[offset + 18], count = bytes[offset + 19], start = offset + 20 + count * 2;
    if (rebirth > 5 || count > 12 || length < 1 || length > 96 || start + length > bytes.length) throw new Error('Invalid roster name/effects');
    const effects = Array.from({ length: count }, (_, i) => view.getUint16(offset + 20 + i * 2, true));
    if (effects.includes(0) || new Set(effects).size !== effects.length) throw new Error('Invalid roster effects');
    const name = decoder.decode(bytes.subarray(start, start + length));
    const faction = bytes[offset + 4], sex = bytes[offset + 5], bodySex = bytes[offset + 6], ride = bytes[offset + 7];
    if (faction > 31 || sex > 1 || bodySex > 1 || ride > 1 || players.has(id)) throw new Error('Invalid roster identity');
    players.set(id, { name, faction, sex, bodySex, ride, rebirth, effects,
      helm: view.getInt16(offset + 8, true), armor: view.getInt16(offset + 10, true),
      weapon: view.getInt16(offset + 12, true), horse: view.getInt16(offset + 14, true) });
    offset = start + length;
  }
  if (offset !== bytes.length) throw new Error('Trailing roster bytes');
  return { type: 'roster', revision: view.getUint32(2, true), map: view.getUint32(6, true), players };
}
