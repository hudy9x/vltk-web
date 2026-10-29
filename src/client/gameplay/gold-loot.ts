/** Normal-monster ngân lượng. Gold sycee artwork does not award the KNB balance. */
export function goldDropRange(level: number): { min: number; max: number } {
  const normalized = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  // Connect level 1 (5–40) to level 10 (40–50) without decreasing rewards.
  if (normalized < 10) {
    const progress = (normalized - 1) / 9;
    return { min: Math.round(5 + 35 * progress), max: Math.round(40 + 10 * progress) };
  }
  // Grow quadratically to a 20,000 ceiling at level 200.
  const max = Math.round(normalized * normalized / 2);
  return { min: Math.max(1, Math.ceil(max * 0.8)), max };
}

export function rollGoldDrop(level: number, random: () => number = Math.random): number {
  const { min, max } = goldDropRange(level);
  return min + Math.floor(random() * (max - min + 1));
}

export function meanGoldDrop(level: number): number {
  const { min, max } = goldDropRange(level);
  return (min + max) / 2;
}
