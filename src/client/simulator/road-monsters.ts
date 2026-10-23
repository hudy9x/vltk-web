import {
  DEFAULT_SOLDIERS,
  soldierSpawnPlan,
  validateSoldierConfiguration,
} from "./soldier-config";
import type { SoldierConfiguration, SoldierSpawn } from "./soldier-config";
import type { LegacyEntity } from "./types";
export const ROAD_MONSTER_RESPAWN = 20;
export const ROAD_MONSTER_SPAWNS = soldierSpawnPlan(DEFAULT_SOLDIERS);
interface Host {
  mapId?(): number;
  appearanceDelay?(): number;
  create(
    index: number,
    x: number,
    y: number,
    spawn?: SoldierSpawn,
  ): LegacyEntity;
  remove(actor: LegacyEntity): void;
  cancel(actor: LegacyEntity): void;
  tick(actor: LegacyEntity, dt: number): void;
  defeated?(actor: LegacyEntity): void;
}
/** Respawns retain the original rank/HP/point, even if the next-match form changes. */
export function createRoadMonsters(host: Host) {
  let elapsed = 0,
    paused = false,
    started = false,
    configuration = validateSoldierConfiguration(DEFAULT_SOLDIERS);
  const slots: {
    actor: LegacyEntity | null;
    due: number | null;
    spawn: SoldierSpawn;
  }[] = [];
  function configure(next: SoldierConfiguration) {
    configuration = validateSoldierConfiguration(next);
  }
  function clear() {
    slots.forEach((slot) => { if (slot.actor) host.remove(slot.actor); });
    slots.length = 0;
    started = false;
    elapsed = 0;
    paused = false;
  }
  function start() {
    if (started) return;
    const delay = host.appearanceDelay?.() ?? 0;
    if (!Number.isFinite(delay) || delay < 0 || delay > 1200) throw new Error("Thời gian xuất hiện binh sĩ: 0–1.200 giây.");
    started = true;
    soldierSpawnPlan(configuration, host.mapId?.() || 9003).forEach((spawn, index) =>
      slots.push({
        actor: delay === 0 ? host.create(index, spawn.x, spawn.y, spawn) : null,
        due: delay === 0 ? null : delay,
        spawn,
      }),
    );
  }
  function tick(dt: number, running: boolean) {
    if (!Number.isFinite(dt) || dt < 0) return;
    if (!running) {
      if (!paused) slots.forEach((slot) => { if (slot.actor) host.cancel(slot.actor); });
      paused = true;
      return;
    }
    paused = false;
    elapsed += dt;
    for (let index = 0; index < slots.length; index++) {
      const slot = slots[index];
      if (!slot.actor) {
        if (slot.due !== null && elapsed + 1e-9 >= slot.due) {
          slot.actor = host.create(index, slot.spawn.x, slot.spawn.y, slot.spawn);
          slot.due = null;
        }
        continue;
      }
      if (slot.actor.dead || slot.actor.hp <= 0) {
        if (slot.due === null) {
          host.defeated?.(slot.actor);
          slot.actor.dead = true;
          host.cancel(slot.actor);
          slot.due = elapsed + slot.spawn.respawnSeconds;
        }
        if (elapsed + 1e-9 >= slot.due) {
          host.remove(slot.actor);
          slot.actor = host.create(
            index,
            slot.spawn.x,
            slot.spawn.y,
            slot.spawn,
          );
          slot.due = null;
        }
      } else host.tick(slot.actor, dt);
    }
  }
  return {
    configure,
    start,
    restart() { clear(); start(); },
    clear,
    tick,
    get configuration() {
      return validateSoldierConfiguration(configuration);
    },
    get totalCount() { return slots.length; },
    get actors() {
      return slots.map((slot) => slot.actor).filter((actor): actor is LegacyEntity => actor !== null);
    },
  };
}
