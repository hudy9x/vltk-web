export const ARMY_FACTIONS = ['shaolin', 'tianwang', 'tangmen', 'wudu', 'emei', 'cuiyan', 'gaibang', 'tianren', 'wudang', 'kunlun'] as const;
/** Largest remainders keep the requested total exact, including small armies. */
export function distributeArmy(count: number, ratios: Record<string, number>): Record<string, number> {
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error('Số lượng SIM phải từ 1 đến 100.');
  if (Object.keys(ratios).some(key => !ARMY_FACTIONS.includes(key as typeof ARMY_FACTIONS[number]))) throw new Error('Môn phái không hợp lệ.');
  const weights = ARMY_FACTIONS.map(key => ratios[key] ?? 0);
  if (weights.some(value => !Number.isFinite(value) || value < 0 || value > 100) || Math.abs(weights.reduce((sum, value) => sum + value, 0) - 100) > 1e-6) throw new Error('Tổng tỉ lệ 10 môn phái phải bằng 100%.');
  const counts = weights.map(value => Math.floor(count * value / 100));
  const order = weights.map((value, index) => ({ index, remainder: count * value / 100 - counts[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0, remaining = count - counts.reduce((sum, value) => sum + value, 0); i < remaining; i++) counts[order[i].index]++;
  return Object.fromEntries(ARMY_FACTIONS.map((key, index) => [key, counts[index]]));
}
