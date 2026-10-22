import { createHorseShop } from "./model";
import { mountHorseShop } from "./view";
import { CAMPS } from "../../simulator/battlefield";
import type { HorseTemplate } from "./model";
import type { LegacyRecord } from "../../simulator/types";
import type { Team } from "../../simulator/battlefield";
declare const module: { exports: unknown };
declare var S: LegacyRecord,
  o: LegacyRecord,
  l: LegacyRecord,
  v: LegacyRecord,
  R: boolean;
declare var INV_MAX: number,
  Ho: [string, string, number][],
  Mc: Record<number, number>,
  combatSandbox: unknown;
declare var arenaSimulator: {
  battlefield: { active: boolean; state: { team: Team; camps?:Record<Team,{x:number;y:number}> } };
} | null;
declare var equipmentTrader: { place(options: LegacyRecord): LegacyRecord };
declare function st(item: LegacyRecord): number;
declare function Bo(item: LegacyRecord): string;
declare function D(text: string): string;
declare function _A(
  kind: number,
  type: number,
  level: number,
  rarity: number,
): LegacyRecord | null;
declare function $(): void;
declare function V(): void;

const shop = createHorseShop({
  catalog: () => S.items[10]?.list || [],
  quality: (template) => st({ ...template, d: 10 }),
  obsolete: (kind) => Mc[kind] != null,
  describe: (template) => Bo({ ...template, d: 10, hlv: 0, hxp: 0 }),
  player: () => o as { fac?: string; knb: number; inv: LegacyRecord[] },
  inventoryLimit: () => INV_MAX,
  alive: () => !!o?.fac && l.life > 0 && !(l.deadT > 0),
  make: (template: HorseTemplate) => _A(10, template.k, template.lvl, 0),
  changed: () => {
    R = true;
    l.dirty = true;
    $();
    V();
  },
});
const view = mountHorseShop(shop, Ho, D);
const idlePosition = { x: v.x + 250, y: v.y };
const npcOptions = {
  name: "Mã Phu",
  subtitle: "Ngựa · 10 KNB/con",
  animation: "enemy051",
  onInteract: view.open,
};
const placements = [
  equipmentTrader.place({
    ...npcOptions,
    x: 1380,
    y: 2139,
    visible: () => !!l.town && !l.dg && !l.tower,
  }),
  equipmentTrader.place({
    ...npcOptions,
    ...idlePosition,
    visible: () =>
      typeof combatSandbox !== "undefined" &&
      !!combatSandbox &&
      !l.town &&
      !l.battlefield,
  }),
];
// Getter coordinates follow the player's current camp without a second RAF loop.
const warNpc = equipmentTrader.place({
  ...npcOptions,
  x: 0,
  y: 0,
  visible: () => !!arenaSimulator?.battlefield.active,
});
Object.defineProperties(warNpc, {
  x: {
    get: () => (arenaSimulator?.battlefield.state.camps || CAMPS)[arenaSimulator?.battlefield.state.team || "song"].x - 120,
  },
  y: {
    get: () => (arenaSimulator?.battlefield.state.camps || CAMPS)[arenaSimulator?.battlefield.state.team || "song"].y - 65,
  },
});
placements.push(warNpc);
// Preserve live getters: spreading a view would freeze isOpen at its initial false.
module.exports = {
  ...shop, ...view, placements,
  get isOpen() { return view.isOpen; },
  get state() { return shop.state; },
};
