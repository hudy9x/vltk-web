import installedSheets from './clothes-assets.json';
import type { LegacyRecord } from './types';

/** Cosmetic rows come from the native sprite catalog. Keep gear stats and the
 * selected weapon intact, and retain the chosen clothes between draw frames. */
const installed = { m: new Set(installedSheets.m), f: new Set(installedSheets.f) };
export function randomSimulatorClothes(tables: LegacyRecord, poses: LegacyRecord, sex: 'm' | 'f', random = Math.random) {
  const result: Record<string, number> = {};
  for (const [slot, part] of [['armor', '躯体'], ['helm', '头部']]) {
    const rows = Object.entries(tables[part] || {}).filter(([, row]) =>
      Object.values(poses).filter(value => typeof value === 'string').every(pose => installed[sex].has((row as LegacyRecord)[pose as string])));
    if (rows.length) result[slot] = Number(rows[Math.floor(random() * rows.length)][0]);
  }
  return result;
}
