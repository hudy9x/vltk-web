import { CAMPS } from "./battlefield";
import type { Team } from "./battlefield";
export type PotionResource = "life" | "mana";
export const WAR_POTION_LIMIT = 80;
export const WAR_POTION_CAPACITY = { life: 40, mana: 40 };
export const SUPPLY_RADIUS = 180;
export interface WarPotion {
  key: string;
  kind: "life" | "mana" | "both";
  tier: number;
  n: string;
  ic?: string;
  total: number;
  mtotal?: number;
  price: number;
}
interface SupplyHost {
  running(): boolean;
  alive(): boolean;
  team(): Team;
  position(): { x: number; y: number };
  /** Authored pharmacy locations, used only for proximity information. */
  pharmacyPositions?(): { x: number; y: number }[] | undefined;
  recover(resource: PotionResource, potion?: WarPotion): boolean;
  catalog?(): WarPotion[];
  pay?(amount: number): boolean;
  changed(): void;
}
/** Quantities count physical bottles, including combined HP/MP potions once.
 * Purchases validate capacity/payment before changing stock.
 */
export function createWarSupplies(host: SupplyHost) {
  const stock = new Map<string, number>();
  const selected: Record<PotionResource, string> = {
    life: "auto",
    mana: "auto",
  };
  const catalog = (): WarPotion[] =>
    host.catalog?.() ||
    (["life", "mana"] as const).map((kind) => ({
      key: kind,
      kind,
      tier: 0,
      n: kind,
      total: 0,
      price: 0,
    }));
  const total = () =>
    [...stock.values()].reduce((sum, quantity) => sum + quantity, 0);
  const eligible = (resource: PotionResource) =>
    catalog().filter(
      (potion) => potion.kind === resource || potion.kind === "both",
    );
  function selectedPotion(resource: PotionResource, requireStock = true) {
    const candidates = eligible(resource).filter(
      (potion) =>
        (!requireStock || (stock.get(potion.key) || 0) > 0) &&
        (selected[resource] === "auto" || potion.key === selected[resource]),
    );
    return candidates.sort(
      (first, second) =>
        second.tier - first.tier ||
        second.total +
          (second.mtotal || 0) -
          (first.total + (first.mtotal || 0)),
    )[0];
  }
  function nearCamp() {
    const position = host.position();
    const locations = host.pharmacyPositions?.() ?? [CAMPS[host.team()]];
    return locations.some(camp => Math.hypot(position.x - camp.x, (position.y - camp.y) * 2) <= SUPPLY_RADIUS);
  }
  function reset(initialStock = false) {
    stock.clear();
    selected.life = selected.mana = "auto";
    if (initialStock)
      for (const resource of ["life", "mana"] as const) {
        const potion = eligible(resource)
          .filter((potion) => potion.kind === resource)
          .sort((first, second) => second.tier - first.tier)[0];
        if (potion) stock.set(potion.key, WAR_POTION_CAPACITY[resource]);
      }
    host.changed();
  }
  function buy(key: string, quantity: number) {
    const potion = catalog().find((entry) => entry.key === key);
    if (
      !potion ||
      !Number.isFinite(potion.price) ||
      potion.price < 0 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    )
      throw new Error("Chọn loại thuốc và số lượng hợp lệ.");
    quantity = Math.min(quantity, WAR_POTION_LIMIT - total(),
      potion.kind !== "mana" ? WAR_POTION_CAPACITY.life - count("life") : Infinity,
      potion.kind !== "life" ? WAR_POTION_CAPACITY.mana - count("mana") : Infinity);
    if (quantity <= 0)
      throw new Error("Mỗi ô tối đa 40 bình, tổng túi tối đa 80 bình.");
    if (host.pay && !host.pay(potion.price * quantity))
      throw new Error("Không đủ ngân lượng.");
    stock.set(key, (stock.get(key) || 0) + quantity);
    if(potion.kind!=="mana")selected.life=key;if(potion.kind!=="life")selected.mana=key;
    host.changed();
    return quantity;
  }
  function refill() {
    const orders = (["life", "mana"] as const).map((resource) => ({
      potion: eligible(resource)
        .filter((potion) => potion.kind === resource)
        .sort((a, b) => b.tier - a.tier)[0],
      quantity: Math.max(0, 40 - count(resource)),
    }));
    if (orders.some((order) => !order.potion))
      throw new Error("Chưa có thuốc phù hợp cấp nhân vật.");
    if (
      total() + orders.reduce((sum, order) => sum + order.quantity, 0) >
      WAR_POTION_LIMIT
    )
      throw new Error("Túi thuốc đã đầy; hãy chọn số lượng mua phù hợp.");
    const price = orders.reduce(
      (sum, order) => sum + order.potion.price * order.quantity,
      0,
    );
    if (host.pay && !host.pay(price)) throw new Error("Không đủ ngân lượng.");
    for (const order of orders)
      stock.set(
        order.potion.key,
        (stock.get(order.potion.key) || 0) + order.quantity,
      );
    host.changed();
  }
  function count(resource: PotionResource) {
    return eligible(resource).reduce(
      (sum, potion) => sum + (stock.get(potion.key) || 0),
      0,
    );
  }
  function select(resource: PotionResource, key: string) {
    if (
      key !== "auto" &&
      !eligible(resource).some((potion) => potion.key === key)
    )
      throw new Error("Thuốc không phù hợp ô này.");
    selected[resource] = key;
    host.changed();
  }
  function use(resource: PotionResource) {
    const potion = selectedPotion(resource);
    if (
      !host.running() ||
      !host.alive() ||
      !potion ||
      !host.recover(resource, potion)
    )
      return false;
    stock.set(potion.key, (stock.get(potion.key) || 0) - 1);
    host.changed();
    return true;
  }
  function slot(resource: PotionResource) {
    const potion = selectedPotion(resource) || selectedPotion(resource, false);
    return {
      ic: potion?.ic || "",
      n:
        selected[resource] === "auto"
          ? count(resource)
          : stock.get(selected[resource]) || 0,
      name:
        (selected[resource] === "auto" ? "Tự động: " : "") +
        (potion?.n || "Hết thuốc"),
    };
  }
  return {
    reset,
    refill,
    buy,
    use,
    select,
    slot,
    catalog,
    get state() {
      return {
        life: count("life"),
        mana: count("mana"),
        total: total(),
        capacity: WAR_POTION_LIMIT,
        nearCamp: nearCamp(),
        selected: { ...selected },
        inventory: Object.fromEntries(stock),
      };
    },
  };
}
export type WarSupplies = ReturnType<typeof createWarSupplies>;
