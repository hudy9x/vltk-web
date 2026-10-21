export const HORSE_PRICE_KNB = 10;
export interface HorseTemplate {
  k: number;
  lvl: number;
  n: string;
  ic?: string;
  d?: unknown;
  base: number[][];
  req: number[][];
  [key: string]: unknown;
}
export interface HorseOffer {
  key: string;
  name: string;
  level: number;
  requiredLevel: number;
  quality: number;
  icon: string;
  description: string;
  summary: string;
  template: HorseTemplate;
}
interface HorsePlayer {
  fac?: string;
  knb: number;
  inv: Record<string, any>[];
  [key: string]: any;
}
export interface HorseShopHost {
  catalog(): HorseTemplate[];
  quality(template: HorseTemplate): number;
  obsolete(kind: number): boolean;
  describe(template: HorseTemplate): string;
  player(): HorsePlayer;
  inventoryLimit(): number;
  alive(): boolean;
  make(template: HorseTemplate): Record<string, any> | null;
  changed(): void;
}
export interface HorseFilter {
  quality: number;
  level: number;
  search: string;
}
/** Preview never calls the item generator: opening/filtering the shop must not
 * consume character UIDs, RNG, KNB, or change horse training/collection state.
 */
export function createHorseShop(host: HorseShopHost) {
  function offers(): HorseOffer[] {
    const entries = new Map<string, HorseOffer>();
    for (const template of host.catalog()) {
      if (host.obsolete(template.k)) continue;
      const quality = host.quality(template);
      if (quality < 0) continue;
      const key = `${template.k}:${template.lvl}`;
      if (entries.has(key)) continue;
      entries.set(key, {
        key,
        name: template.n,
        level: template.lvl,
        requiredLevel: template.req.find((row) => row[0] === 36)?.[1] || 0,
        quality,
        icon: template.ic || "",
        description: typeof template.d === "string" ? template.d : "",
        summary: host.describe(template),
        template,
      });
    }
    return [...entries.values()].sort(
      (first, second) =>
        second.quality - first.quality ||
        second.level - first.level ||
        first.name.localeCompare(second.name, "vi"),
    );
  }
  function filter(options: HorseFilter) {
    const query = options.search
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLocaleLowerCase("vi")
      .trim();
    return offers().filter(
      (offer) =>
        (options.quality < 0 || offer.quality === options.quality) &&
        (!options.level || offer.level === options.level) &&
        (!query ||
          offer.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/gi, "d")
            .toLocaleLowerCase("vi")
            .includes(query)),
    );
  }
  function buy(key: string) {
    const player = host.player(),
      offer = offers().find((entry) => entry.key === key);
    if (!player?.fac || !host.alive())
      throw new Error("Chỉ mua ngựa khi nhân vật đang sống trong game.");
    if (!offer) throw new Error("Ngựa không còn trong danh sách bán.");
    if (player.inv.length >= host.inventoryLimit())
      throw new Error("Hành trang đầy. Cần một ô trống để nhận ngựa.");
    if (!Number.isFinite(player.knb) || player.knb < HORSE_PRICE_KNB)
      throw new Error("Không đủ 10 KNB.");
    const item = host.make(offer.template);
    if (
      !item ||
      item.d !== 10 ||
      item.k !== offer.template.k ||
      item.lvl !== offer.level
    )
      throw new Error("Không tạo được đúng ngựa đã chọn.");
    // Direct delivery avoids native loot auto-sale/auto-stable rules. The player
    // can equip or move the purchased horse to Mã Trường from their inventory.
    item.stOut = 1;
    player.inv.unshift(item);
    player.knb -= HORSE_PRICE_KNB;
    host.changed();
    return item;
  }
  return {
    offers,
    filter,
    buy,
    get state() {
      const player = host.player();
      return {
        knb: player?.knb || 0,
        slots: Math.max(0, host.inventoryLimit() - (player?.inv.length || 0)),
        alive: host.alive(),
      };
    },
  };
}
export type HorseShop = ReturnType<typeof createHorseShop>;
