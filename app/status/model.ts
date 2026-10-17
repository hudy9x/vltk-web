import { coldSlowPower, coldSpeedFactor } from '../combat/cold-status';

/** Values at the existing, untyped game's boundary. No combat state is owned here. */
export type Legacy = Record<string, any>;
export interface Source { kind: string; id?: string | number; name: string; level?: number; values: Record<string, number> }
export interface Metric { name: string; value: string; formula: string; sources: string[] }
export interface StatusModel {
  owner: string; skill: string; target: string; metrics: Metric[]; defense: Metric[];
  coldSteps: Metric[]; sources: Source[]; notes: string[]; potentials: string; consumables: string[];
  events: { name: string; chance: string; duration: string; cold: string }[]; actual: Metric[];
}
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });
export const fmt = (n: number): string => number.format(Number.isFinite(n) ? n : 0);
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const value = (n: unknown): number => typeof n === 'number' && Number.isFinite(n) ? n : 0;
export const ATTR_NAMES: Record<string, string> = {
  do_stun_p: 'Gây choáng bổ sung (%)', stun_p: 'Choáng trong thuộc tính chung (không cộng vào đòn chính)',
  anti_stuntimereduce_p: 'Kéo dài choáng (%)', stunenhance_p: 'Tăng choáng (thuộc tính tham khảo)',
  coldenhance_p: 'Tăng thời gian băng (đơn vị /18 giây)', addcolddamage_v: 'Băng sát ngoại công cộng thêm',
  addcoldmagic_v: 'Băng sát nội công cộng thêm', colddamage_v: 'Băng sát trong thuộc tính chung (không cộng vào chiêu chính)',
  strength_v: 'Sức mạnh cộng thêm', dexterity_v: 'Thân pháp cộng thêm', vitality_v: 'Sinh khí cộng thêm', energy_v: 'Nội công cộng thêm',
  allskill_v: 'Cấp tất cả kỹ năng', skill_enhance: 'Tăng sát thương kỹ năng (%)',
  anti_do_stun_p: 'Chống xác suất choáng (%)', stuntimereduce_p: 'Giảm thời gian choáng (%)',
  freezetimereduce_p: 'Giảm thời gian băng (%)', coldres_p: 'Kháng băng (%)', allres_p: 'Kháng tất cả (%)',
  anti_coldres_p: 'Xuyên kháng băng (%)', anti_allres_p: 'Xuyên tất cả kháng (%)',
  anti_maxres_p: 'Giảm trần kháng của đối phương', coldresmax_p: 'Trần kháng băng (%)', allresmax_p: 'Trần tất cả kháng (%)',
  knockback_p: 'Đẩy lùi kèm choáng (%)',
};

/** Differences are captured during the REAL j0 accumulation, after activation/enhancement/sets. */
export function createSourceCollector() {
  let previous: Record<string, number> = {};
  const sources: Source[] = [];
  function capture(source: Omit<Source, 'values'>, raw: Record<string, number[]>, skillAdds: Record<string, number> = {}) {
    const current = Object.fromEntries(Object.entries(raw).map(([key, parts]) => [key, value(parts[0])]));
    for (const [id, amount] of Object.entries(skillAdds)) current['skillLevel:' + id] = amount;
    const values: Record<string, number> = {};
    for (const key of Object.keys(current)) {
      const delta = current[key] - (previous[key] || 0);
      if (delta && (key in ATTR_NAMES || key.startsWith('skillLevel:'))) values[key] = delta;
    }
    sources.push({ ...source, values });
    previous = current;
  }
  return { capture, sources };
}
export interface StatusInput {
  owner: string; profile: Legacy; stats: Legacy; skill: Legacy; sources: Source[];
  skillCold?: number[] | null; physical: boolean; energyScaling: boolean;
  target: string; resistanceFactor: number; resistanceSources: string[];
  defaultCold: number; naturalStunChance: number; naturalStunSeconds: number;
  incomingStunSeconds: number; incomingStunChances: Record<string, number>;
  skillBonusSources: string[]; events: { name: string; skill: Legacy; chance?: number }[];
  consumables: string[];
  targetBoss?: boolean;
  actualTarget?: Legacy | null;
}
export function explainStatus(input: StatusInput): StatusModel {
  const { stats: p, skill, profile, sources } = input;
  const from = (...keys: string[]) => sources.flatMap(source => {
    const entries = keys.filter(key => source.values[key]).map(key => `${ATTR_NAMES[key] || key}: ${source.values[key] > 0 ? '+' : ''}${fmt(source.values[key])}`);
    return entries.length ? [`${source.name}${source.level ? ` · cấp ${source.level}` : ''}: ${entries.join(', ')}`] : [];
  });
  const metric = (name: string, amount: number, unit: string, formula: string, provenance: string[] = []): Metric =>
    ({ name, value: `${fmt(amount)}${unit}`, formula, sources: provenance });
  const chance = clamp(value(skill.stun) + value(p.stunAdd), 0, 100);
  const stunSeconds = .8 * (1 + value(p.stunLong) / 100);
  const coldSeconds = value(skill.coldT) || input.defaultCold;
  const duration = coldSeconds + value(p.coldEnh) / 18;
  const cold = value(skill.parts?.cold), low = cold * .85 * input.resistanceFactor, high = cold * 1.15 * input.resistanceFactor;
  const slowLow = coldSlowPower(low), slowHigh = coldSlowPower(high);
  const learned = value(profile.sk?.[skill.id]) || (skill.basic ? 1 : 0);
  const skillSources = [`Chiêu ${skill.n || 'Đánh thường'}: cấp học ${fmt(learned)} + tất cả kỹ năng ${fmt(value(p.plusSkill))} + riêng chiêu ${fmt(value(p.skAdd?.[skill.id]))} = cấp hiệu lực ${fmt(value(skill.L) || 1)}`,
    ...from('allskill_v', 'skillLevel:' + skill.id)];
  const metrics: Metric[] = [
    metric('Tỉ lệ choáng của đòn chính khi trúng', chance, '%', `giới hạn 0–100% (${fmt(value(skill.stun))}% của chiêu + ${fmt(value(p.stunAdd))}% gây choáng bổ sung)`,
      [...skillSources, ...from('do_stun_p')]),
    metric('Thời gian choáng mỗi lần áp dụng', stunSeconds, ' giây', `0,8 × (1 + ${fmt(value(p.stunLong))}/100); kéo dài choáng bị giới hạn 0–200%`, from('anti_stuntimereduce_p')),
    metric('Thời gian băng lên quái / SIM', cold ? duration : 0, ' giây', cold ? `${fmt(coldSeconds)} giây của chiêu (mặc định ${fmt(input.defaultCold)}) + ${fmt(value(p.coldEnh))}/18` : 'Chiêu không có băng sát: không áp băng.',
      [...skillSources, ...from('coldenhance_p')]),
    { name: 'Mức làm chậm sau kháng mục tiêu', value: cold ? `${fmt(slowLow * 100)}–${fmt(slowHigh * 100)}%` : '0%',
      formula: `75% × D/(D + 200); D = ${fmt(low)}–${fmt(high)} băng sát sau kháng, gồm ngẫu nhiên 85–115%`, sources: input.resistanceSources },
    { name: 'Tốc độ di chuyển / nhịp đánh còn lại', value: `${fmt((1 - slowHigh) * 100)}–${fmt((1 - slowLow) * 100)}%`,
      formula: '100% − mức làm chậm. Cùng số hành động sẽ mất lâu hơn theo 1 / hệ số tốc độ.', sources: [] },
    metric('Choáng tự nhiên từ lôi sát', skill.parts?.light ? input.naturalStunChance * 100 : 0, '%',
      `${fmt(input.naturalStunChance * 100)}% cấu hình × có lôi sát; thời gian ${fmt(input.naturalStunSeconds)} × (1 + ${fmt(value(p.stunLong))}/100) giây`, []),
    metric('Choáng kèm đẩy lùi', input.targetBoss ? 0 : value(p.knock), '%', 'Đẩy lùi bị giới hạn 0–40%, không áp lên trùm; gây 0,25 giây choáng, không nhân chỉ số kéo dài choáng.', from('knockback_p')),
  ];
  const defense = [
    metric('Chống xác suất choáng của người chơi', value(p.antiStun), '%', 'Giới hạn 0–80%; áp dụng ở nhánh lôi sát quái → người chơi.', from('anti_do_stun_p')),
    metric('Giảm thời gian choáng của người chơi', value(p.stunRed), '%', `Quái: ${fmt(input.incomingStunSeconds)} × (1 − ${fmt(value(p.stunRed))}/100) = ${fmt(input.incomingStunSeconds * (1 - value(p.stunRed) / 100))} giây. SIM PK: thời gian gốc × cùng hệ số.`, from('stuntimereduce_p')),
    metric('Giảm thời gian băng của người chơi', value(p.freezeRed), '%', `Quái: ${fmt(input.defaultCold)} × (1 − ${fmt(value(p.freezeRed))}/100) = ${fmt(input.defaultCold * (1 - value(p.freezeRed) / 100))} giây. SIM PK: thời gian kỹ năng × cùng hệ số.`, from('freezetimereduce_p')),
    metric('Kháng băng của người chơi', value(p.res?.cold), '%', `Kháng băng sau tổng hợp và giới hạn; trần hiện tại ${fmt(value(p.resMaxE?.cold) || value(p.resMax))}%.`, from('coldres_p', 'allres_p', 'coldresmax_p', 'allresmax_p')),
    ...Object.entries(input.incomingStunChances).map(([name, c]) => metric(`Lôi sát ${name} → người chơi: xác suất choáng`, c * (1 - value(p.antiStun) / 100) * 100, '%', `${fmt(c * 100)}% × (1 − ${fmt(value(p.antiStun))}/100), khi đòn lôi sát trúng.`, from('anti_do_stun_p'))),
  ];
  const intrinsic = input.skillCold;
  const intrinsicCold = intrinsic ? (intrinsic[2] ? (intrinsic[0] + intrinsic[2]) / 2 : intrinsic[0]) : 0;
  const equipmentCold = skill.basic || input.physical ? value(p.add?.cold) : value(p.magAdd?.cold);
  const enhancement = skill.basic || input.physical ? 1 : 1 + value(p.enh?.cold) / 100;
  const energy = !skill.basic && !input.physical && input.energyScaling ? 1 + value(p.eng) / 500 : 1;
  const damageMultiplier = (skill.basic ? 1 : 1 + (value(p.skillBonus?.[skill.id]) + value(p.seriesSkill) + value(p.skillEnh)) / 100) * (value(p.dmgMul) || 1);
  const reconstructed = (equipmentCold * enhancement + intrinsicCold * (1 + value(p.enh?.cold) / 100)) * energy * damageMultiplier;
  const coldSteps: Metric[] = [
    metric('Cấp hiệu lực của chiêu', value(skill.L) || 1, '', skillSources[0], skillSources.slice(1)),
    metric('Băng sát gốc trong bảng kỹ năng', intrinsicCold, '', intrinsic ? `(${fmt(intrinsic[0])} + ${fmt(intrinsic[2] || intrinsic[0])})/2 tại cấp hiệu lực` : 'Đánh thường / chiêu không có băng sát gốc.', skillSources),
    metric(input.physical || skill.basic ? 'Băng sát ngoại công cộng thêm' : 'Băng sát nội công cộng thêm', equipmentCold, '', 'Giá trị từ bộ tổng hợp chỉ số hiện tại.', from(input.physical || skill.basic ? 'addcolddamage_v' : 'addcoldmagic_v')),
    metric('Hệ số từ tiềm năng Nội công', energy, '×', input.energyScaling && !input.physical && !skill.basic ? `1 + Nội công tổng ${fmt(value(p.eng))}/500` : 'Chiêu / cấu hình này không dùng Nội công để nhân băng sát.', from('energy_v')),
    metric('Hệ số tăng sát thương của chiêu', damageMultiplier, '×', `(1 + (hỗ trợ riêng ${fmt(value(p.skillBonus?.[skill.id]))} + tăng kỹ năng ${fmt(value(p.skillEnh))} + tăng theo hệ ${fmt(value(p.seriesSkill))})/100) × chuyển sinh ${fmt(value(p.rebDmg) || 1)} × hệ số nền ${fmt((value(p.dmgMul) || 1) / (value(p.rebDmg) || 1))}`,
      [...from('skill_enhance'), ...input.skillBonusSources]),
    metric('Băng sát cuối trước ngẫu nhiên / kháng', cold, '', `(${fmt(equipmentCold)} × ${fmt(enhancement)} + ${fmt(intrinsicCold)} × ${fmt(1 + value(p.enh?.cold) / 100)}) × ${fmt(energy)} × ${fmt(damageMultiplier)} = ${fmt(reconstructed)}`, []),
  ];
  const notes = [
    'Độ chậm giảm tốc độ di chuyển, nhịp đánh và animation; không đổi FPS vẽ game. Ví dụ tốc độ còn 50% nghĩa là mỗi hành động mất gấp đôi thời gian.',
    'Các xác suất trên tính khi đòn đã trúng và không bị hóa giải; trượt / hóa giải không áp hiệu ứng. Tỉ lệ từng nhánh phụ được liệt kê riêng, không cộng thẳng vào đòn chính.',
    'Choáng lấy thời gian lớn hơn giữa phần còn lại và lần mới, không cộng dồn. Băng mạnh hơn hoặc bằng làm mới thời gian; băng yếu hơn không ghi đè hay kéo dài băng mạnh.',
    'Thời gian băng là thời lượng của bộ đếm hiệu ứng. Hiện quái / SIM đang choáng sẽ tạm dừng đếm băng, nên thời gian theo đồng hồ có thể dài hơn.',
    'Hiện nhánh kỹ năng đánh quái / SIM không trừ chống xác suất choáng hoặc giảm thời gian hiệu ứng của mục tiêu. Các chỉ số phòng thủ bên dưới áp theo đúng nhánh đang được game sử dụng.',
    'Chí mạng vật lý, HP mục tiêu, hấp thụ / khiên mana và hệ số tài khoản không nằm trong D tính cường độ băng; D lấy phần băng ngay sau kháng.',
  ];
  if (Math.abs(cold - reconstructed) > 1e-6) notes.push(`Băng sát của chiêu có phần điều chỉnh khác ${fmt(cold - reconstructed)}; giá trị cuối ${fmt(cold)} lấy trực tiếp từ kỹ năng đang tính.`);
  return { owner: input.owner, skill: skill.n || 'Đánh thường', target: input.target, metrics, defense, coldSteps, sources, notes,
    actual: input.actualTarget ? [
      metric('Độ chậm đang áp trên mục tiêu', (1 - coldSpeedFactor(input.actualTarget)) * 100, '%', 'Đọc hiệu ứng hiện tại trên quái / SIM; đây là giá trị đã áp dụng sau lần trúng thực tế.', []),
      metric('Thời gian băng còn lại', Math.max(0, value(input.actualTarget.slowT)), ' giây', 'Bộ đếm hiện tại của mục tiêu; băng mạnh đang có có thể khác chiêu bạn đang xem.', []),
      metric('Thời gian choáng còn lại', Math.max(0, value(input.actualTarget.stun)), ' giây', 'Bộ đếm choáng hiện tại của mục tiêu.', []),
    ] : [],
    potentials: `Điểm đã cộng: Sức mạnh ${fmt(value(profile.attr?.str))} · Thân pháp ${fmt(value(profile.attr?.dex))} · Sinh khí ${fmt(value(profile.attr?.vit))} · Nội công ${fmt(value(profile.attr?.eng))}. Nội công tổng ${fmt(value(p.eng))} = gốc ${fmt(value(p.eng) - value(profile.attr?.eng) - sources.reduce((sum, source) => sum + value(source.values.energy_v), 0))} + đã cộng ${fmt(value(profile.attr?.eng))} + trang bị / buff ${fmt(sources.reduce((sum, source) => sum + value(source.values.energy_v), 0))}. Tiềm năng không trực tiếp tăng % choáng hay thời gian hiệu ứng.`,
    consumables: input.consumables,
    events: input.events.map(event => ({ name: event.name,
      chance: `${fmt(clamp(value(event.skill.stun) + value(p.stunAdd), 0, 100))}% khi nhánh trúng${event.chance ? `; xác suất kích hoạt nhánh ${fmt(event.chance * 100)}%` : ''}`,
      duration: `${fmt(stunSeconds)} giây`,
      cold: event.skill.parts?.cold ? `${fmt((event.skill.coldT || input.defaultCold) + value(p.coldEnh) / 18)} giây; băng gốc ${fmt(event.skill.parts.cold)}` : 'Không có băng sát' })),
  };
}
