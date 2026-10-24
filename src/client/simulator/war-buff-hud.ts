import { WAR_ITEMS } from './war-rewards';
import type { WarItem } from './war-rewards';

/** Render only active effects. Reusing an item resets its existing countdown. */
export function warBuffHud(buffs: Partial<Record<WarItem, number>>) {
  return (Object.keys(WAR_ITEMS) as WarItem[]).filter(kind => (buffs[kind] || 0) > 0).map(kind => {
    const item = WAR_ITEMS[kind], seconds = Math.ceil(buffs[kind]!);
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    return `<div class="sti war-effect" data-war-buff="${kind}" title="${item.name}: ${item.description} · Còn ${time}" aria-label="${item.name}, còn ${time}"><img src="${item.icon}" alt="${item.name}" width="24" height="24"><b>${time}</b></div>`;
  }).join('');
}
