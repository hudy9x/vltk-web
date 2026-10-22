import type { LegacyRecord, SimulatorProfile } from "./types";
/** Reserve ordinary skill points for implemented level-60 support before the
 * damage-oriented suggestion engine spends the remaining budget. No free points.
 */
export function prioritizeLevel60Support(
  profile: SimulatorProfile,
  skills: LegacyRecord[],
  kind: (skill: LegacyRecord) => string,
) {
  const selected = skills.filter(
    (skill) =>
      (skill.req === 60 || ["buff", "aura"].includes(kind(skill))) &&
      profile.lvl >= skill.req &&
      ["passive", "buff", "aura"].includes(kind(skill)),
  ).sort((a, b) => Number(b.req === 60) - Number(a.req === 60) || a.req - b.req);
  for (const skill of selected) {
    const learned = profile.sk[skill.id] || 0;
    const spent = Math.min(
      Math.max(0, (skill.max || 20) - learned),
      profile.skPts,
    );
    profile.sk[skill.id] = learned + spent;
    profile.skPts -= spent;
  }
  return selected.map((skill) => ({
    id: Number(skill.id),
    name: String(skill.n),
    level: profile.sk[skill.id] || 0,
    kind: kind(skill),
  }));
}
