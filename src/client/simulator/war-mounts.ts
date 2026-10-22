import type { LegacyRecord } from './types';

/** Keep the strongest template of each ordinary war-horse name. Rank-gated
 * mounts need a real rank and are not granted to generated SIM profiles. */
export function warMountOptions(catalog: LegacyRecord[]): LegacyRecord[] {
  const names = new Map<string, LegacyRecord>();
  for (const item of catalog) {
    const level = item.req?.find(([kind]: number[]) => kind === 36)?.[1] || 0;
    if (level < 80 || level > 150 || item.k > 18 || item.req.some(([kind]: number[]) => kind !== 36)) continue;
    if (!names.has(item.n) || names.get(item.n)!.lvl < item.lvl) names.set(item.n, item);
  }
  return [...names.values()].map(item => ({ ...item, key: `${item.k}:${item.lvl}` }));
}

export function chooseWarMount(catalog: LegacyRecord[], level: number, choice = 'random', random = Math.random) {
  if (choice === 'none') return null;
  const eligible = warMountOptions(catalog).filter(item => item.req.every(([kind, value]: number[]) => kind !== 36 || value <= level));
  if (choice !== 'random') {
    const selected = eligible.find(item => item.key === choice);
    if (!selected) throw new Error('Ngựa đã chọn không phù hợp cấp SIM.');
    return selected;
  }
  return eligible[Math.floor(random() * eligible.length)] || null;
}
