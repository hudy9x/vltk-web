import type { EditorDocument } from './types';
import { monsterChoices } from './monster-catalog';
import type { MonsterMapGroup } from './monster-catalog';
import { defaultMonsterBalance } from './monster-default';
import { validateMonsterBalance, resolveMonsterBalance } from '@game/monster-balance';
export type MonsterBulkScope = 'range' | 'map' | 'all';
export interface BasicMonsterValues { hp:number; damage:number; xp:number }
export function bulkMonsterTargets(groups:MonsterMapGroup[], selectedMap:number, range:readonly[number,number], scope:MonsterBulkScope) {
  const targets=new Map<string,{profileId:string;monsterId:number;boss:boolean}>();
  for(const group of groups){
    if(scope!=='all'&&group.map.id!==selectedMap)continue;
    for(const band of group.ranges){
      if(scope==='range'&&(band[0]!==range[0]||band[1]!==range[1]))continue;
      for(const choice of monsterChoices(group,band))
        targets.set(`${choice.profileId}:${choice.monsterId}`,{profileId:choice.profileId,monsterId:choice.monsterId,boss:choice.boss});
    }
  }
  return [...targets.values()];
}
/** Validate the whole operation before mutating the cloned draft; keep advanced values intact. */
export function applyMonsterBulk(document:EditorDocument, targets:ReturnType<typeof bulkMonsterTargets>, values:BasicMonsterValues):void {
  if(!Number.isSafeInteger(values.hp)||values.hp<1||values.hp>1e12||!Number.isSafeInteger(values.damage)||values.damage<0||values.damage>1e9||!Number.isSafeInteger(values.xp)||values.xp<0||values.xp>1e8)throw new Error('Máu, sát thương và EXP phải là số nguyên hợp lệ.');
  const changes=targets.map(target=>{
    const profile=document.encounters.find(p=>p.id===target.profileId);
    if(!profile)throw new Error('Cấu hình quái đã thay đổi. Hãy chọn lại phạm vi.');
    const balance={...structuredClone(profile.monsterProfiles?.[target.monsterId]||defaultMonsterBalance(profile,target.monsterId,target.boss)),...values};
    validateMonsterBalance(balance);resolveMonsterBalance(balance,profile.levelRange[0],profile.levelRange[1]);
    return {profile,monsterId:target.monsterId,balance};
  });
  for(const {profile,monsterId,balance}of changes){profile.monsterProfiles||={};profile.monsterProfiles[monsterId]=balance;}
}

export const MONSTER_BULK_STATS = ['hp', 'damage', 'defense', 'xp'] as const;
export type MonsterBulkStat = typeof MONSTER_BULK_STATS[number];
export interface MonsterProgressionSettings {
  scope: 'all' | 'levels';
  from: number;
  to: number;
  mode: 'base' | 'multiply';
  levelStep: number;
  bossFactor: number;
  stats: Record<MonsterBulkStat, { enabled: boolean; base: number; factor: number }>;
}
export interface MonsterProgressionChange {
  profileId: string;
  monsterId: number;
  boss: boolean;
  levelRange: [number, number];
  mapNames: string[];
  before: ReturnType<typeof defaultMonsterBalance>;
  after: ReturnType<typeof defaultMonsterBalance>;
}
/** Pure, shared calculation for the preview and the atomic draft edit. */
export function previewMonsterProgression(document: EditorDocument, groups: MonsterMapGroup[], settings: MonsterProgressionSettings): MonsterProgressionChange[] {
  if (!['all', 'levels'].includes(settings.scope) || !['base', 'multiply'].includes(settings.mode)) throw new Error('Phạm vi hoặc cách tính không hợp lệ.');
  if (!Number.isInteger(settings.levelStep) || settings.levelStep < 1 || settings.levelStep > 200) throw new Error('Bước level phải là số nguyên từ 1 đến 200.');
  if (settings.scope === 'levels' && (!Number.isInteger(settings.from) || !Number.isInteger(settings.to) || settings.from < 1 || settings.to > 200 || settings.from > settings.to)) throw new Error('Dải level phải nằm trong 1–200, level bắt đầu không lớn hơn level kết thúc.');
  if (!Number.isFinite(settings.bossFactor) || settings.bossFactor < 1) throw new Error('Hệ số Boss phải từ 1 trở lên.');
  const selected = MONSTER_BULK_STATS.filter(key => settings.stats[key].enabled);
  if (!selected.length) throw new Error('Chọn ít nhất một chỉ số để áp dụng.');
  for (const key of selected) {
    const stat = settings.stats[key];
    if (!Number.isFinite(stat.base) || stat.base < (key === 'hp' && settings.mode === 'base' ? 1 : 0) || settings.mode === 'base' && !Number.isSafeInteger(stat.base)) throw new Error('Giá trị gốc phải là số nguyên hợp lệ; hệ số ban đầu phải không âm.');
    if (!Number.isFinite(stat.factor) || stat.factor < 1) throw new Error('Hệ số mỗi bước phải từ 1 trở lên.');
  }
  const profiles = new Map(document.encounters.map(profile => [profile.id, profile]));
  // Include only used ranks and deduplicate shared encounter settings across maps.
  const targets = bulkMonsterTargets(groups, 0, [1, 200], 'all').filter(target => {
    const profile = profiles.get(target.profileId);
    if (!profile) throw new Error('Cấu hình quái đã thay đổi. Hãy mở lại cài đặt.');
    return settings.scope === 'all' || profile.levelRange[0] >= settings.from && profile.levelRange[0] <= settings.to;
  });
  if (!targets.length) return [];
  const first = Math.min(...targets.map(target => profiles.get(target.profileId)!.levelRange[0]));
  return targets.map(target => {
    const profile = profiles.get(target.profileId)!;
    const before = structuredClone(profile.monsterProfiles?.[target.monsterId] || defaultMonsterBalance(profile, target.monsterId, target.boss));
    const after = structuredClone(before);
    // A boss derives its selected base stats from the first normal monster in its own profile.
    const normalId = profile.monsterIds.find(id => id !== profile.bossId);
    const normal = target.boss
      ? (normalId !== undefined && profile.monsterProfiles?.[normalId]) || defaultMonsterBalance(profile, normalId ?? target.monsterId, false)
      : before;
    const exponent = Math.floor(profile.levelRange[0] / settings.levelStep) - Math.floor(first / settings.levelStep);
    for (const key of selected) {
      const stat = settings.stats[key];
      const value = (settings.mode === 'multiply' ? normal[key] : 1) * stat.base * stat.factor ** exponent * (target.boss ? settings.bossFactor : 1);
      if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value))) throw new Error(`Cấp ${profile.levelRange.join('–')}: chỉ số tăng quá lớn. Hãy giảm hệ số.`);
      after[key] = Math.round(value);
    }
    try {
      validateMonsterBalance(after);
      resolveMonsterBalance(after, profile.levelRange[0], profile.levelRange[1]);
    } catch (error) {
      throw new Error(`Cấp ${profile.levelRange.join('–')} · ${target.boss ? 'Boss' : 'Quái'} #${target.monsterId}: ${String(error)}`);
    }
    return {...target, levelRange: profile.levelRange, mapNames: [...new Set(groups.filter(group => group.profiles.some(p => p.id === profile.id)).map(group => group.map.name))], before, after};
  }).sort((a, b) => a.levelRange[0] - b.levelRange[0] || a.levelRange[1] - b.levelRange[1] || a.profileId.localeCompare(b.profileId) || Number(a.boss) - Number(b.boss) || a.monsterId - b.monsterId);
}

/** Calculate and validate the whole batch before writing a single setting. */
export function applyMonsterProgression(document: EditorDocument, groups: MonsterMapGroup[], settings: MonsterProgressionSettings): number {
  const changes = previewMonsterProgression(document, groups, settings);
  const profiles = new Map(document.encounters.map(profile => [profile.id, profile]));
  for (const change of changes) {
    const profile = profiles.get(change.profileId)!;
    profile.monsterProfiles ||= {};
    profile.monsterProfiles[change.monsterId] = change.after;
  }
  return changes.length;
}

/** Seed range bases from the first affected normal monster, using the current draft. */
export function seedMonsterProgressionBases(document: EditorDocument, groups: MonsterMapGroup[], settings: MonsterProgressionSettings): MonsterProgressionSettings {
  if (settings.scope !== 'levels' || settings.mode !== 'base' || !Number.isInteger(settings.from) || settings.from < 1 || settings.from > 200) return settings;
  const profiles = new Map(document.encounters.map(profile => [profile.id, profile]));
  const candidates = bulkMonsterTargets(groups, 0, [1, 200], 'all').map(target => ({target, profile: profiles.get(target.profileId)}))
    .filter(candidate => candidate.profile && candidate.profile.levelRange[0] >= settings.from)
    .sort((a, b) => a.profile!.levelRange[0] - b.profile!.levelRange[0] || a.profile!.mapId - b.profile!.mapId || a.profile!.id.localeCompare(b.profile!.id) || Number(a.target.boss) - Number(b.target.boss));
  const candidate = candidates[0];
  if (!candidate?.profile) return settings;
  const {profile, target} = candidate;
  const normalId = target.boss ? profile.monsterIds.find(id => id !== profile.bossId) : target.monsterId;
  const normal = normalId !== undefined && profile.monsterProfiles?.[normalId] || defaultMonsterBalance(profile, normalId ?? target.monsterId, false);
  return {...settings, stats: Object.fromEntries(MONSTER_BULK_STATS.map(key => [key, {...settings.stats[key], base: Math.round(normal[key])}])) as MonsterProgressionSettings['stats']};
}
