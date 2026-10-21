import type { LegacyRecord } from './types';
interface GearSource {
  blueCatalog(sex: number): LegacyRecord[];
  affixes(item: LegacyRecord, series: number, index: number): LegacyRecord[];
}
const SLOTS = { weapon: -1, armor: 2, helm: 7, amulet: 4, belt: 6, cuff: 8, boot: 5, pendant: 9, ring1: 3, ring2: 3 };
/** Uses the live trader's tier-10 templates and blue affix rules, without touching inventory. */
export function createArmyEquipment(source: GearSource, options: { sex: number; level: number; factionId: number; series: number; weapon: [number, number]; points: number; enh: number; strength: string }, links: Record<string, string[]>, generates: Record<number, number>, random = Math.random) {
  const series: Record<string, number> = { weapon: options.series };
  for (let pass = 0; pass < 10; pass++) for (const [target, supporters] of Object.entries(links)) for (const support of supporters) {
    if (series[support] !== undefined) series[target] = generates[series[support]];
    else if (series[target] !== undefined) series[support] = +Object.keys(generates).find(key => generates[+key] === series[target])!;
  }
  for (const [target, supporters] of Object.entries(links)) if (supporters.some(support => generates[series[support]] !== series[target])) throw new Error('Không phối được bộ tương sinh.');
  const catalog = source.blueCatalog(options.sex), equipment: LegacyRecord = {};
  const required: Record<number, number> = {};
  const shuffled = <T>(values: T[]) => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  };
  for (const [slot, kind] of Object.entries(SLOTS)) {
    const candidates = catalog.filter(item => (slot === 'weapon' ? item.d === options.weapon[0] && item.k === options.weapon[1] : item.d === kind) &&
      item.req.every(([type, value]: number[]) => value < 0 || (type === 36 ? options.level >= value : type === 39 ? options.factionId === value : type === 37 ? series[slot] === options.series : true)));
    // Keep equipment requirements attainable by the character's available potential pool.
    const fits = (item: LegacyRecord) => {
      const next = { ...required };
      for (const [type, value] of item.req) if (type >= 32 && type <= 35) next[type] = Math.max(next[type] || 0, value);
      return Object.values(next).reduce((sum, value) => sum + value, 0) <= options.points;
    };
    const template = shuffled(candidates).find(fits);
    if (!template) throw new Error(`Cấp hoặc tiềm năng chưa đủ để mặc trọn bộ cấp 10 (${slot}). Tăng level hoặc bỏ chọn Mặc đồ.`);
    for (const [type, value] of template.req) if (type >= 32 && type <= 35) required[type] = Math.max(required[type] || 0, value);
    const item = JSON.parse(JSON.stringify(template)); delete item.key;
    Object.assign(item, { s: series[slot], r: 1, enh: options.enh, lock: true, mag: [] });
    for (const row of item.req) if (row[0] === 37 && row[1] >= 0) row[1] = item.s;
    function select(index: number, used: Set<number>): LegacyRecord[] | null {
      if (index === 5) return [];
      for (const entry of shuffled(source.affixes(item, item.s, index)).filter(entry => !used.has(entry.a))) {
        const rest = select(index + 1, new Set([...used, entry.a]));
        if (rest) return [entry, ...rest];
      }
      return null;
    }
    const entries = select(0, new Set());
    if (!entries) throw new Error('Catalog thiếu 5 dòng thuộc tính hợp lệ.');
    const roll = ([a, b]: number[]) => {
      if (a === b) return a;
      const low = Math.min(a, b), high = Math.max(a, b);
      const fraction = options.strength === 'strong' ? .8 + random() * .2 : options.strength === 'weak' ? random() * .3 : .3 + random() * .5;
      return Math.min(high, low + Math.floor(fraction * (high - low + 1)));
    };
    item.mag = entries.map(entry => ({ a: entry.a, pre: entry.pre, n: entry.n, p: entry.p.map(roll) }));
    equipment[slot] = item;
  }
  return equipment;
}
