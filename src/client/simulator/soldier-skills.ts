import type { Faction, LegacyRecord } from "./types";
export interface SoldierSkillOption {
  id: number;
  name: string;
  level: number;
  faction: string;
}
/** Use native required levels (some catalogs label these attacks at level 60).
 * Buffs, curses and passive skills cannot be selected as monster attacks.
 */
export function soldierSkillOptions(
  catalog: Record<string, LegacyRecord>,
  factions: Faction[],
  canAttack: (skill: LegacyRecord) => boolean,
): SoldierSkillOption[] {
  return factions.flatMap((faction) =>
    faction.skills
      .filter((id) => {
        const skill = catalog[id];
        return skill && skill.req >= 50 && skill.req <= 70 && canAttack(skill);
      })
      .map((id) => ({
        id,
        name: `${faction.n} · ${catalog[id].n}`,
        level: catalog[id].req,
        faction: faction.key,
      })),
  );
}
