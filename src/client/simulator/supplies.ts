import { CAMPS } from './battlefield';
import type { Team } from './battlefield';
export type PotionResource = 'life' | 'mana';
export const WAR_POTION_CAPACITY = { life: 50, mana: 50 };
export const SUPPLY_RADIUS = 180;
interface SupplyHost {
  running(): boolean;
  alive(): boolean;
  team(): Team;
  position(): { x: number; y: number };
  recover(resource: PotionResource): boolean;
  changed(): void;
}
/** Match-only stock: neither persistent potion reserves nor automatic purchases
 * can bypass this limit. Respawning does not refill; the player requests supplies.
 */
export function createWarSupplies(host: SupplyHost) {
  const stock = { life: 0, mana: 0 };
  function reset(initialStock = false) { stock.life = initialStock ? WAR_POTION_CAPACITY.life : 0; stock.mana = initialStock ? WAR_POTION_CAPACITY.mana : 0; host.changed(); }
  function nearCamp() {
    const position = host.position(), camp = CAMPS[host.team()];
    return Math.hypot(position.x - camp.x, (position.y - camp.y) * 2) <= SUPPLY_RADIUS;
  }
  function refill() {
    if (!host.running() || !host.alive() || !nearCamp()) throw new Error('Về điểm tập trung của phe mình và bấm Nhận tiếp tế.');
    Object.assign(stock, WAR_POTION_CAPACITY); host.changed();
  }
  function use(resource: PotionResource) {
    if (!host.running() || !host.alive() || stock[resource] <= 0) return false;
    if (!host.recover(resource)) return false;
    stock[resource]--; host.changed(); return true;
  }
  return { reset, refill, use, get state() { return { ...stock, nearCamp: nearCamp() }; } };
}
export type WarSupplies = ReturnType<typeof createWarSupplies>;
