import { WAR_ITEMS, warItemStacks } from './war-rewards';
import type { WarItem, WarRewards } from './war-rewards';
interface InventoryHost {
  active(): boolean;
  rewards: WarRewards;
  refresh(): void;
  error(message: string): void;
}
/** One click consumes one item; each visible stack holds at most 50. */
export function createWarInventory(host: InventoryHost) {
  function html() {
    return warItemStacks(host.rewards.state.inventory).map(({kind,count}) =>
      `<button class="it r1 mi" data-war-item="${kind}" title="${WAR_ITEMS[kind].name}: ${WAR_ITEMS[kind].description}. Bấm để dùng · Chỉ dùng trong Tống Kim"><img src="${WAR_ITEMS[kind].icon}" alt="${WAR_ITEMS[kind].name}" width="24" height="24"><i>${count}</i></button>`).join('');
  }
  document.addEventListener('click', event => {
    const itemButton = (event.target as Element | null)?.closest?.<HTMLElement>('[data-war-item]');
    if (!itemButton) return;
    const kind = itemButton.dataset.warItem as WarItem;
    if (!Object.prototype.hasOwnProperty.call(WAR_ITEMS,kind)) return;
    event.stopPropagation();
    try { host.rewards.use(kind); host.refresh(); }
    catch(error) { host.error(error instanceof Error ? error.message : String(error)); }
  }, true);
  return { html, get slots() { return warItemStacks(host.rewards.state.inventory).length; } };
}
