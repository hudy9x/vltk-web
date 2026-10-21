import { BATTLEFIELD_ROUTES } from './routes';
import type { LegacyEntity } from './types';
export const ROAD_MONSTER_RESPAWN = 20;
export const ROAD_MONSTER_SPAWNS = BATTLEFIELD_ROUTES.flatMap(center => [1280,2304].flatMap(x => [-64,64].map(offset => ({ x, y: center+offset }))));
interface Host {
  create(index: number, x: number, y: number): LegacyEntity;
  remove(actor: LegacyEntity): void;
  cancel(actor: LegacyEntity): void;
  tick(actor: LegacyEntity, dt: number): void;
  defeated?(actor: LegacyEntity): void;
}
/** Team soldiers have their own lifecycle, separate from army counts. */
export function createRoadMonsters(host: Host) {
  let elapsed = 0, paused = false;
  const slots: { actor: LegacyEntity; due: number | null }[] = [];
  function clear() { slots.forEach(slot => host.remove(slot.actor)); slots.length = 0; elapsed = 0; paused = false; }
  function start() { clear(); ROAD_MONSTER_SPAWNS.forEach((point,index) => slots.push({ actor: host.create(index,point.x,point.y), due: null })); }
  function tick(dt: number, running: boolean) {
    if (!running) { if (!paused) slots.forEach(slot => host.cancel(slot.actor)); paused = true; return; }
    paused = false; elapsed += dt;
    for (let index=0; index<slots.length; index++) {
      const slot = slots[index];
      if (slot.actor.dead || slot.actor.hp <= 0) {
        if (slot.due === null) { host.defeated?.(slot.actor); slot.actor.dead = true; host.cancel(slot.actor); slot.due = elapsed + ROAD_MONSTER_RESPAWN; }
        if (elapsed + 1e-9 >= slot.due) {
          host.remove(slot.actor); const point = ROAD_MONSTER_SPAWNS[index];
          slot.actor = host.create(index,point.x,point.y); slot.due = null;
        }
      } else host.tick(slot.actor,dt);
    }
  }
  return { start, clear, tick, get actors() { return slots.map(slot => slot.actor); } };
}
