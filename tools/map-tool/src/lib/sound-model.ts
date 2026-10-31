import paths from '../../paths.json';
import { FEMALE_SOUND_FACTIONS, skillSoundGender } from '../../../../src/client/combat/audio/rules';
export { paths };
export type StageName = 'cast' | 'release' | 'hit';
export type StageField = 'male' | 'female' | 'effect' | 'maleEffect' | 'femaleEffect';
export type Stage = Partial<Record<StageField, string>>;
export interface Sound { src: string; name: string; category: 'voice' | 'effect'; gender?: 'male' | 'female'; sourceType?: string }
export interface Skill { name: string; level: number; faction: string; icon: string; inherit?: number; route?: string; disabled?: boolean; cast?: Stage; release?: Stage; hit?: Stage; review?: { sound: string; reason: string }[] }
export interface SoundConfig { version: number; defaults: { male: string; female: string }; sounds: Record<string, Sound>; skills: Record<string, Skill> }
export interface SoundSnapshot { config: SoundConfig; revision: string }
export interface SoundAsset { readonly file: string; readonly data: string }
export function resolveSkill(config: SoundConfig, id: string, seen = new Set<string>()): Skill | undefined {
  const own = config.skills[id];
  if (!own) return;
  if (seen.has(id)) throw new Error('Kế thừa skill tạo vòng lặp');
  seen.add(id);
  const parent = own.inherit == null ? undefined : resolveSkill(config, String(own.inherit), seen);
  return { ...parent, ...own, cast: { ...parent?.cast, ...own.cast }, release: { ...parent?.release, ...own.release }, hit: { ...parent?.hit, ...own.hit }, review: own.review ?? parent?.review ?? [] };
}
export function slug(value: string): string {
  return value.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sound';
}
export function importIdentity(config: SoundConfig, name: string, extension: string, category: Sound['category'], gender?: Sound['gender']) {
  const stem = slug(name), prefix = category === 'voice' ? `voice_${gender || 'male'}_` : 'fx_';
  const idStem = prefix + stem.replace(/-/g, '_');
  let number = 1, id = idStem, file = `${stem}.${extension}`;
  const used = new Set(Object.values(config.sounds).map(sound => sound.src.toLowerCase()));
  const relative = paths.soundDirectory.slice(paths.publicRoot.length + 1);
  if (!paths.soundDirectory.startsWith(paths.publicRoot + '/')) throw new Error('soundDirectory phải nằm trong publicRoot');
  while (config.sounds[id] || used.has(`${relative}/${file}`.toLowerCase())) { number++; id = `${idStem}_${number}`; file = `${stem}-${number}.${extension}`; }
  return { id, file, src: `${relative}/${file}` };
}
export function usedBy(config: SoundConfig, soundId: string): string[] {
  return Object.keys(config.skills).filter(id => {
    const skill = resolveSkill(config, id);
    return ['cast', 'release', 'hit'].some(stage => Object.values(skill?.[stage as StageName] || {}).includes(soundId));
  });
}

/** Imports are immutable and always use new filenames; omit large Base64 payloads from dirty checks. */
export function soundDraftKey(draft: { config: SoundConfig; assets: SoundAsset[] }): string {
  return JSON.stringify({ config: draft.config, assets: draft.assets.map(asset => asset.file) });
}

export type PreviewGender = 'male' | 'female' | 'both';
export const ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'] as const;
export const ELEMENT_ICONS: Record<string, string> = { Kim: 'kim', Mộc: 'moc', Thủy: 'thuy', Hỏa: 'hoa', Thổ: 'tho' };
/** Faction keys and series follow the game's JX.factions catalog. */
export const SOUND_FACTIONS: Record<string, { name: string; element: string }> = {
  shaolin: { name: 'Thiếu Lâm', element: 'Kim' }, tianwang: { name: 'Thiên Vương', element: 'Kim' },
  tangmen: { name: 'Đường Môn', element: 'Mộc' }, wudu: { name: 'Ngũ Độc', element: 'Mộc' },
  emei: { name: 'Nga My', element: 'Thủy' }, cuiyan: { name: 'Thúy Yên', element: 'Thủy' },
  gaibang: { name: 'Cái Bang', element: 'Hỏa' }, tianren: { name: 'Thiên Nhẫn', element: 'Hỏa' },
  wudang: { name: 'Võ Đang', element: 'Thổ' }, kunlun: { name: 'Côn Lôn', element: 'Thổ' },
  huashan: { name: 'Hoa Sơn', element: 'Thủy' },
};
export function searchText(value: string): string {
  return value.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
export function filterSoundSkills(config: SoundConfig, filter: { faction: string; element: string; query: string; levels?: number[] }): [string, Skill][] {
  const query = searchText(filter.query);
  return Object.entries(config.skills).filter(([id, skill]) =>
    (filter.faction === 'all' || skill.faction === filter.faction) &&
    (filter.element === 'all' || SOUND_FACTIONS[skill.faction]?.element === filter.element) &&
    (!filter.levels?.length || filter.levels.includes(skill.level)) &&
    searchText(`${id} ${skill.name} ${skill.level} ${SOUND_FACTIONS[skill.faction]?.name || skill.faction}`).includes(query)
  ).sort(([a, x], [b, y]) => x.faction.localeCompare(y.faction) || x.level - y.level || +a - +b);
}
export interface PreviewClip { id: string; label: string; skillId?: string; stage?: StageName; gender?: 'male' | 'female' }
export function soundPreviewGender(faction: string, gender: PreviewGender): PreviewGender {
  return FEMALE_SOUND_FACTIONS.includes(faction) ? 'female' : gender;
}
export function skillPreviewQueue(config: SoundConfig, skillId: string, gender: PreviewGender): PreviewClip[] {
  const skill = resolveSkill(config, skillId); if (!skill || skill.disabled) return [];
  gender = soundPreviewGender(skill.faction, gender);
  const queue: PreviewClip[] = [];
  for (const requested of gender === 'both' ? ['male', 'female'] as const : [gender]) {
    const sex = skillSoundGender(skill.faction, requested);
    const cast = skill.cast || {}, castEffect = cast[sex === 'male' ? 'maleEffect' : 'femaleEffect'] || cast.effect;
    const voice = cast[sex] || (!castEffect ? config.defaults[sex] : undefined);
    const stages: [StageName, string, (string | undefined)[]][] = [
      ['cast', 'Xuất chiêu', [voice, castEffect]],
      ['release', 'Phóng đạn', [skill.release?.[sex === 'male' ? 'maleEffect' : 'femaleEffect'] || skill.release?.effect]],
      ['hit', 'Va chạm', [skill.hit?.[sex === 'male' ? 'maleEffect' : 'femaleEffect'] || skill.hit?.effect]],
    ];
    for (const [stage, label, ids] of stages) for (const id of ids) if (id && config.sounds[id]) {
      queue.push({ id, label: `${skill.name} · ${sex === 'male' ? 'Nam' : 'Nữ'} · ${label}`, skillId, stage, gender: sex });
    }
  }
  return queue;
}
