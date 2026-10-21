import { WAR_ITEMS } from './war-rewards';
import type { WarItem, WarRewards } from './war-rewards';
interface InventoryHost {
  active(): boolean;
  rewards: WarRewards;
  details(title: string, description: string, use: () => void): void;
  refresh(): void;
}
/** War consumables are a match-only compartment of the actual inventory grid.
 * Selecting an item opens details; only the explicit Use action grants its buff.
 */
export function createWarInventory(host: InventoryHost) {
  function html() {
    if (!host.active()) return '';
    return (Object.keys(WAR_ITEMS) as WarItem[]).filter(kind => host.rewards.state.inventory[kind] > 0).map(kind =>
      `<button class="it r1 mi" data-war-item="${kind}" title="${WAR_ITEMS[kind].name}"><img src="img/i/g44.png" alt="${WAR_ITEMS[kind].name}"><i>${host.rewards.state.inventory[kind]}</i></button>`).join('');
  }
  document.addEventListener('click', event => {
    const itemButton = (event.target as Element | null)?.closest?.<HTMLElement>('[data-war-item]');
    if (!itemButton || !host.active()) return;
    const kind = itemButton.dataset.warItem as WarItem;
    if (!(kind in WAR_ITEMS)) return;
    event.stopPropagation();
    host.details(WAR_ITEMS[kind].name, `${WAR_ITEMS[kind].description} trong 180 giây. Đang có ${host.rewards.state.inventory[kind]}.`, () => {
      host.rewards.use(kind); host.refresh();
    });
  }, true);
  return { html };
}
