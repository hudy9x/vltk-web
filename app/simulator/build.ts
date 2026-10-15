import type { LegacyRecord, SimulatorProfile } from './types';

export const POTENTIALS = { str: 'Sức mạnh', dex: 'Thân pháp', vit: 'Sinh khí', eng: 'Nội công' } as const;
export type Potential = keyof typeof POTENTIALS;

export function setPotential(profile: SimulatorProfile, key: Potential, value: number): void {
  if (!(key in POTENTIALS) || !Number.isSafeInteger(value) || value < 0) throw new Error('Điểm tiềm năng không hợp lệ.');
  const before = profile.attr[key] || 0, delta = value - before;
  if (delta > profile.attrPts) throw new Error('Không đủ điểm tiềm năng.');
  profile.attr[key] = value; profile.attrPts -= delta;
}
export function skillLimit(profile: SimulatorProfile, skill: LegacyRecord): number {
  return profile.lvl < (skill.req || 0) ? 0 : Math.max(0, Math.floor(skill.max || 0));
}
export function setSkillLevel(profile: SimulatorProfile, id: number, value: number, skill: LegacyRecord): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > skillLimit(profile, skill)) throw new Error('Cấp kỹ năng không hợp lệ.');
  if (+profile.main === id && value === 0) throw new Error('Hãy đổi chiêu chính trước khi bỏ chiêu này.');
  const before = profile.sk[id] || 0, delta = value - before;
  if (delta > profile.skPts) throw new Error('Không đủ điểm kỹ năng.');
  if (value) profile.sk[id] = value; else delete profile.sk[id];
  profile.skPts -= delta;
  if (skill.tier === 90) {
    profile.skL ||= {}; profile.bkOk ||= {};
    profile.skL[id] = { lv: value, xp: 0 };
    if (value) profile.bkOk[id] = 1; else delete profile.bkOk[id];
  }
}
