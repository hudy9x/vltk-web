import type { LegacyRecord } from './types';
import type { Team } from './battlefield';
/** Sprite IDs inspected against the shipped monster images; no animals or civilian robes. */
export const SOLDIER_SKINS = { song: [595,596,597,598,599], jin: [141,152,153,158,159,160,163,167] } as const;
export function soldierSkin(catalog: Record<string, LegacyRecord>, team: Team, index: number): number {
  const available = SOLDIER_SKINS[team].filter(id => !!catalog[id]);
  if (!available.length) throw new Error(`Thiếu sprite binh sĩ phe ${team === 'song' ? 'Tống' : 'Kim'}.`);
  return available[index % available.length];
}
