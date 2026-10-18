import type {
  EditorDocument,
  EncounterDefinition,
  MapDefinition,
  Monster,
  ProgressionEntry,
} from "./types";
export interface MapListItem {
  map: MapDefinition;
  levelRange?: [number, number];
  kind: "primary" | "alternate" | "standalone";
}
export function mapList(
  maps: MapDefinition[],
  encounters: EncounterDefinition[],
  progression: ProgressionEntry[],
): MapListItem[] {
  const byId = new Map(maps.map((map) => [map.id, map]));
  const profile = (id: number) =>
    encounters.find((profile) => profile.mapId === id);
  const seen = new Set<number>(),
    result: MapListItem[] = [];
  const add = (id: number, kind: MapListItem["kind"]) => {
    const map = byId.get(id);
    if (!map || seen.has(id)) return;
    seen.add(id);
    result.push({ map, kind, levelRange: profile(id)?.levelRange });
  };
  const groups = progression.map((entry, index) => ({
    entry,
    index,
    level: profile(entry.mapId)?.levelRange[0] ?? Infinity,
  }));
  groups.sort((a, b) => a.level - b.level || a.index - b.index);
  for (const { entry } of groups) {
    add(entry.mapId, "primary");
    entry.alternateMapIds.forEach((id) => add(id, "alternate"));
  }
  [...maps]
    .sort(
      (a, b) =>
        (profile(a.id)?.levelRange[0] ?? Infinity) -
          (profile(b.id)?.levelRange[0] ?? Infinity) || a.id - b.id,
    )
    .forEach((map) => add(map.id, "standalone"));
  return result;
}
export function monsterRanges(
  id: number,
  encounters: EncounterDefinition[],
): [number, number][] {
  const ranges = new Map<string, [number, number]>();
  for (const profile of encounters)
    if (profile.monsterIds.includes(id) || profile.bossId === id)
      ranges.set(profile.levelRange.join("-"), profile.levelRange);
  return [...ranges.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
export function levelOptions(
  encounters: EncounterDefinition[],
): { value: string; label: string }[] {
  const ranges = new Map(
    encounters.map((profile) => [
      profile.levelRange.join("-"),
      profile.levelRange,
    ]),
  );
  return [
    { value: "all", label: "Tất cả cấp" },
    ...[...ranges]
      .sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1])
      .map(([value, range]) => ({
        value,
        label: `Cấp ${range[0]}–${range[1]}`,
      })),
    { value: "unassigned", label: "Chưa gán bãi" },
  ];
}
export function filterMonsters(
  monsters: Monster[],
  encounters: EncounterDefinition[],
  query: string,
  level: string,
  exclude: readonly number[] = [],
): Monster[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  const needle = normalize(query.trim());
  return monsters
    .filter((monster) => {
      if (
        exclude.includes(monster.id) ||
        !normalize(`${monster.name} ${monster.id}`).includes(needle)
      )
        return false;
      const ranges = monsterRanges(monster.id, encounters);
      return (
        level === "all" ||
        (level === "unassigned"
          ? !ranges.length
          : ranges.some((range) => range.join("-") === level))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, "vi") || a.id - b.id);
}
export function mapListForDraft(
  maps: MapDefinition[],
  document: EditorDocument | null,
  encounters: EncounterDefinition[],
  progression: ProgressionEntry[],
) {
  const current = document
    ? [...maps.filter((map) => map.id !== document.map.id), document.map]
    : maps;
  return mapList(
    current,
    document?.encounters ?? encounters,
    document?.progression ?? progression,
  );
}
