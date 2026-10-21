import type { LegacyRecord } from './types';
export type ArmyEquipmentKind = 'blue' | 'gold' | 'thientu';
interface SetGearSource {
  goldCatalog(faction: string): { key: string; items: LegacyRecord[] }[];
  canUpgrade(template: LegacyRecord): boolean;
  make(template: LegacyRecord, kind: 'gold' | 'thientu'): LegacyRecord | null;
}
const SET_SLOTS: Record<number, string> = { 2: 'armor', 7: 'helm', 4: 'amulet', 8: 'cuff', 9: 'pendant', 6: 'belt', 5: 'boot' };
/** Native sets may have fewer than ten slots. Keep the compatible blue set in
 * uncovered slots; never replace a weapon with one that disables the chosen skill.
 */
export function applyArmySetEquipment(source: SetGearSource, fallback: LegacyRecord, options: { faction: string; sex: number; level: number; weapon: [number, number]; kind: 'gold' | 'thientu' }, random = Math.random) {
  const factionSets = source.goldCatalog(options.faction);
  const weaponMatches = (item: LegacyRecord) => item.d === options.weapon[0] && item.k === options.weapon[1];
  let compatibleSets = factionSets.filter(set => set.items.some(item => weaponMatches(item) && (options.kind !== 'thientu' || source.canUpgrade(item))));
  // Palm/unarmed branches may have no native set weapon. Keep their compatible
  // blue weapon and use faction armor/accessories instead of disabling the skill.
  if (!compatibleSets.length) compatibleSets = factionSets.filter(set => options.kind === 'gold' || set.items.some(item => (item.d > 1 || weaponMatches(item)) && source.canUpgrade(item)));
  if (!compatibleSets.length) throw new Error('Không có bộ môn phái phù hợp với chiêu đã chọn.');
  const selectedSet = compatibleSets[Math.floor(random() * compatibleSets.length)];
  const equipment = { ...fallback };
  let convertedItems = 0;
  for (const template of selectedSet.items) {
    const slot = template.d <= 1 ? 'weapon' : template.d === 3 ? (equipment.ring1?.set ? 'ring2' : 'ring1') : SET_SLOTS[template.d];
    if (!slot || (slot === 'weapon' && (template.d !== options.weapon[0] || template.k !== options.weapon[1]))) continue;
    const item = source.make(template, options.kind) || source.make(template, 'gold');
    if (!item) throw new Error(`Thiếu dữ liệu trang bị ${template.n}.`);
    for (const [requirement, value] of item.req || []) {
      if (value < 0) continue;
      if (requirement === 36 && options.level < value) throw new Error(`${item.n} cần cấp ${value}.`);
      if (requirement === 38 && options.sex !== value) throw new Error(`${item.n} không phù hợp giới tính SIM.`);
    }
    equipment[slot] = item; convertedItems++;
  }
  if (!convertedItems) throw new Error('Bộ đã chọn thiếu vũ khí môn phái phù hợp.');
  return equipment;
}
