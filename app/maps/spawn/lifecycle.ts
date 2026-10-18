import { getMap, isMapAvailable } from '../catalog';
import type { NavigationRuntime } from '../runtime';
import { FIELD_POLICY as policy, generateFieldPoints, randomBetween } from './generate';
import type { FieldEnemy, FieldHost, FieldPoint } from './types';

/** Owns map population rules; actors and combat stats are supplied by the game. */
export function createFieldRuntime(navigation: NavigationRuntime, host: FieldHost, random: () => number = Math.random) {
  function spawn(point: FieldPoint): void {
    if (!isMapAvailable(host.zone().id)) return;
    const enemy = host.createEnemy(point);
    if (point.cls === 'normal') { enemy.dens = true; enemy.dmg *= policy.normalDamageScale; }
    enemy.home = point; enemy.aggro = false; enemy.wT = randomBetween(random, 0, 3);
    point.e = enemy; point.t = 0; host.enemies().push(enemy);
    if (point.cls === 'boss') host.announceBoss(enemy, point);
  }
  function initialize(): void {
    const zone = host.zone();
    if (!isMapAvailable(zone.id)) return;
    // Navigation, player and image must be switched before any spawn sampling.
    host.ensureMap(zone);
    const points = generateFieldPoints(navigation, zone, host.player(), host.normalCountRange(), host.isVoid, random, getMap(zone.id));
    host.setField({ key: host.key(), pts: points, kills: 0 });
    host.setEnemies(host.enemies().filter(enemy => (enemy.goldBoss || enemy.sat || enemy.satG) && !enemy.dead));
    for (const point of points) if (point.t <= 0) spawn(point);
  }
  function tick(dt: number): void {
    if (!isMapAvailable(host.zone().id)) return;
    const field = host.field();
    if (!field || field.key !== host.key() || (!host.enemies().length && field.pts.some(point => point.e && !point.e.dead))) {
      initialize(); return;
    }
    for (const point of field.pts) {
      if (point.e?.dead) { point.e = null; point.t = point.cls === 'boss' ? policy.bossRespawn : host.normalRespawnSeconds(); }
      if (!point.e && point.cls === 'boss' && point.t > 20 && host.questNeedsBoss(point.tid)) point.t = 20;
      if (!point.e && (point.t -= dt) <= 0) {
        const player = host.player();
        if (Math.hypot(player.x - point.x, player.y - point.y) < 90) { point.t = 1; continue; }
        spawn(point);
      }
    }
    if (host.enemies().length > 80 || host.enemies().some(enemy => enemy.dead)) host.setEnemies(host.enemies().filter(enemy => !enemy.dead));
    host.afterTick();
  }
  function wander(enemy: FieldEnemy, dt: number): boolean {
    const home = enemy.home;
    if (!home) return false;
    const player = host.player(), distance = host.distance(player, enemy);
    enemy.agT = (enemy.agT || 0) - dt;
    if (enemy.agT <= 0) {
      enemy.agT = 0.4;
      if (distance < (enemy.vis || policy.vision) && host.playerAlive() && navigation.sight(enemy.x, enemy.y, player.x, player.y)) enemy.aggro = true;
    }
    if (enemy.aggro) return false;
    if ((enemy.backT || 0) > 0) {
      enemy.backT = (enemy.backT || 0) - dt; enemy.moving = true;
      navigation.moveAlongPath(enemy, home.x, home.y, enemy.spd * 1.6 * dt);
      if (Math.hypot(home.x - enemy.x, home.y - enemy.y) < 12) enemy.backT = 0;
      return true;
    }
    enemy.wT = (enemy.wT || 0) - dt;
    if (enemy.wT <= 0) {
      enemy.wT = randomBetween(random, 2, 5);
      enemy.wx = home.x + randomBetween(random, -policy.wanderRadius, policy.wanderRadius);
      enemy.wy = home.y + randomBetween(random, -policy.wanderRadius, policy.wanderRadius) * 0.6;
    }
    const length = enemy.wx != null && enemy.wy != null ? Math.hypot(enemy.wx - enemy.x, enemy.wy - enemy.y) : 0;
    enemy.moving = length > 4;
    if (enemy.moving && enemy.wx != null && enemy.wy != null) {
      navigation.tryMove(enemy, enemy.x + (enemy.wx - enemy.x) / length * Math.min(length, enemy.spd * 0.4 * dt),
        enemy.y + (enemy.wy - enemy.y) / length * Math.min(length, enemy.spd * 0.4 * dt));
      enemy.face = enemy.wx >= enemy.x ? 1 : -1;
      enemy.dir = host.direction(enemy.wx - enemy.x, enemy.wy - enemy.y);
    }
    return true;
  }
  function releaseAggro(enemy: FieldEnemy): void {
    if (!enemy.home || !enemy.aggro || enemy.cls === 'boss') return;
    if (host.distance(enemy.home, enemy) > policy.leashDistance && host.distance(host.player(), enemy) > 200) {
      enemy.aggro = false; enemy.backT = 6; enemy.hp = enemy.max; enemy.poison = 0; enemy.slowT = 0;
    }
  }
  return { initialize, spawn, tick, wander, releaseAggro };
}
