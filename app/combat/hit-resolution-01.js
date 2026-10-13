// Combat contacts run in the simulation, independently of rendering and FX limits.
var activeCombatCast = null;

var SKILL_RANGE_Y_RATIO = 0.6;
var skillCastDistance = (actor, target) =>
  Math.hypot(target.x - actor.x, (target.y - actor.y) / SKILL_RANGE_Y_RATIO) / QA;

// These spells create effects through terrain; their range and contact rules still apply.
var skillIgnoresTerrain = (skill) => !!skill &&
  (skill.ignoreTerrain === true || [362, 365, 375, 380].includes(+skill.id));

var queueSkillContact = function (actor, target, skill, onHit, options = {}) {
  const narrow = [361, 368].includes(+skill.id);
  if (narrow) skill = Object.assign({}, skill, { geo: Object.assign({}, skill.geo, {
    k: "line", shape: "rect", width: 24, len: (skill.geo && skill.geo.len) || skill.rad || 100, pierce: true, area: 0,
  }) });
  const previous = activeCombatCast;
  const cast = {
    actor,
    skill,
    ignoreTerrain: skillIgnoresTerrain(skill),
    onHit,
    targets: options.targets || (() => _1()),
    maxTargets: options.maxTargets || (skill.geo && skill.geo.pierce ? Infinity : Math.max(1, skill.targets || (skill.geo && skill.geo.n) || 1)),
    maxHits: options.maxHits || (() => 1),
    hits: new Map(),
    zone: l.zoneShown,
    windup: options.windup == null ? 0.12 : options.windup,
    emitted: 0,
    origin: { x: actor.x, y: actor.y - 14 },
    direction: Math.atan2((target.y - actor.y) * 2, target.x - actor.x),
    elapsed: 0, pulse: -1, nextPulse: 0, pulseFrame: -1, targetPulses: new Map(),
    interval: +skill.id === 362 ? 0.3 : 0,
  };
  if (skill.geo || narrow || cast.interval) cast.maxTargets = Infinity;
  if (cast.interval) {
    const spriteId = A0.f && A0.f[skill.id] && A0.f[skill.id].c || A0.s && A0.s[skill.id];
    const sprite = A0.m[spriteId] && A0.m[spriteId].fly;
    cast.duration = Math.max(cast.interval, sprite && sprite.n * sprite.ms / 1000 || 1);
  }
  const start = l.fx.length;
  activeCombatCast = cast;
  try {
    if (options.visual) options.visual();
    else G3(actor, target, skill);
    // Older secondary effects use interpolated missiles / stationary sprites.
    for (const effect of l.fx.slice(start)) {
      if (!effect.combat && !effect.cosmetic && (effect.k === "mis" || effect.k === "boom") && !effect.follow && !effect.add) {
        effect.combat = cast;
        effect.contactHits = new Set();
        effect.t -= cast.windup;
        if (cast.interval) effect.life = Math.max(effect.life, cast.duration);
        (l.combatProjectiles || (l.combatProjectiles = [])).push(effect);
        cast.emitted++;
      }
    }
    if (!cast.emitted) {
      // Missing sprite metadata and hidden FX still need a physical attack.
      l.fx.splice(start);
      const melee = skill.melee !== false;
      const area = skill.geo && (skill.geo.k === "self" || skill.geo.k === "spot");
      const effect = {
        k: "contact", combat: cast, contactHits: new Set(),
        x: melee || area ? target.x : actor.x,
        y: (melee || area ? target.y : actor.y) - 14,
        x2: target.x, y2: target.y - 14,
        age: area ? 0 : -cast.windup, life: area ? cast.duration || 0.3 : melee ? 0.1 : 2,
        melee, speed: 360, color: Hi[Object.keys(skill.parts || {})[0]] || "#ffd24a",
        ang: Y3(target.x - actor.x, target.y - actor.y),
        staticArea: !!area,
      };
      (l.combatProjectiles || (l.combatProjectiles = [])).push(effect);
      if (!l.quiet) l.fx.push(effect);
    }
  } finally {
    activeCombatCast = previous;
  }
  return cast;
};

var registerCombatMissile = function (missile) {
  if (!activeCombatCast) return;
  missile.combat = activeCombatCast;
  missile.contactHits = new Set();
  if (missile.kind && !missile.still) missile.age -= activeCombatCast.windup * K3;
  missile.lf = Math.max(missile.lf, 2);
  if (activeCombatCast.interval) missile.lf = Math.max(missile.lf, Math.ceil(activeCombatCast.duration * K3));
  (l.combatProjectiles || (l.combatProjectiles = [])).push(missile);
  activeCombatCast.emitted++;
};

// Continuous segment/circle collision in isometric world coordinates. Sweeping
// each movement step also detects fast missiles crossing a body between ticks.
var contactFraction = function (x0, y0, x1, y1, target, radius, yScale = 2) {
  const dx = x1 - x0, dy = (y1 - y0) * yScale;
  const px = x0 - target.x, py = (y0 - (target.y - 14)) * yScale;
  const rr = radius + Math.max(8, target.r || 12);
  const c = px * px + py * py - rr * rr;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return null;
  const b = px * dx + py * dy;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
};

var applyContactHit = function (effect, target) {
  const cast = effect.combat;
  if ((!cast.interval && effect.contactHits.has(target)) || target.dead || (target === v ? l.life <= 0 : target.hp <= 0)) return false;
  if (cast.interval) {
    if (cast.targetPulses.get(target) === cast.pulse) return false;
    cast.targetPulses.set(target, cast.pulse);
    cast.onHit(target);
    return true;
  }
  effect.contactHits.add(target);
  const count = cast.hits.get(target) || 0;
  if ((!count && cast.hits.size >= cast.maxTargets) || count >= cast.maxHits(target)) return false;
  cast.hits.set(target, count + 1);
  cast.onHit(target);
  return true;
};

var rectangleContactFraction = function (x0, y0, x1, y1, target, halfWidth, direction) {
  const dx = x1 - x0, dy = (y1 - y0) * 2;
  const length = Math.hypot(dx, dy);
  const ux = length ? dx / length : Math.cos(direction), uy = length ? dy / length : Math.sin(direction);
  const px = target.x - x0, py = (target.y - 14 - y0) * 2;
  const along = px * ux + py * uy, across = Math.abs(px * uy - py * ux);
  const body = Math.max(8, target.r || 12);
  const endGap = Math.max(0, -along, along - length), sideGap = Math.max(0, across - halfWidth);
  if (Math.hypot(endGap, sideGap) > body) return null;
  return length ? E((along - body) / length, 0, 1) : 0;
};

var collideCombatEffect = function (effect, x0, y0, x1, y1) {
  const cast = effect.combat;
  const staticArea = effect.staticArea || effect.k === "boom" || (effect.k === "jm" && (!effect.kind || effect.still));
  const geo = cast.skill.geo || {};
  if (cast.interval) {
    if (cast.elapsed + 1e-9 >= cast.nextPulse) {
      cast.pulse++;
      cast.nextPulse = cast.pulse === 0 ? cast.elapsed + cast.interval : cast.nextPulse + cast.interval;
      cast.pulseFrame = cast.elapsed;
    } else if (cast.pulseFrame !== cast.elapsed) return false;
  }
  if (staticArea && geo.shape === "rect") {
    x0 = cast.origin.x; y0 = cast.origin.y;
    x1 = x0 + Math.cos(cast.direction) * geo.len * QA;
    y1 = y0 + Math.sin(cast.direction) * geo.len * QA / 2;
  }
  const radius = staticArea
    ? Math.max(8, (geo.r || geo.area || 12) * QA)
    : 8;
  const contacts = cast.targets()
    .filter(target => target && !target.dead && (target === v ? l.life > 0 : target.hp > 0) && (cast.interval || !effect.contactHits.has(target)))
    .map(target => ({ target, fraction: geo.shape === "rect"
      ? rectangleContactFraction(x0, y0, x1, y1, target, geo.width * QA / 2, cast.direction)
      : contactFraction(x0, y0, x1, y1, target, radius, staticArea && geo.k === "self" ? 1 / SKILL_RANGE_Y_RATIO : 2) }))
    .filter(contact => contact.fraction != null)
    .sort((a, b) => a.fraction - b.fraction);
  for (const { target, fraction } of contacts) {
    const x = x0 + (x1 - x0) * fraction, y = y0 + (y1 - y0) * fraction;
    if (!cast.ignoreTerrain && typeof mt === "function" && !mt(x0, y0 + 14, target.x, target.y)) continue;
    if (effect.melee && !staticArea && skillCastDistance(cast.actor, target) > (cast.skill.rad || 75) + (target.r || 12) / QA) continue;
    if (applyContactHit(effect, target)) {
      if (effect.k === "jm") gf(effect, x, y);
      else if (effect.k === "mis" && effect.hit && !l.quiet) {
        (l.fxQ || (l.fxQ = [])).push({ k: "boom", s: effect.hit, x, y, t: 0, life: yn(effect.hit), dir: effect.dir || 0 });
      }
      else if (effect.k === "contact") x8(cast.actor, target, cast.skill);
      // An explosion splashes only after its projectile actually collides.
      if (geo.area) {
        for (const other of cast.targets()) {
          if (other !== target && contactFraction(x, y, x, y, other, geo.area * QA) != null && (cast.ignoreTerrain || mt(x, y + 14, other.x, other.y))) applyContactHit(effect, other);
        }
      }
    }
    const stops = !geo.pierce && ((!staticArea && (effect.k === "contact" || effect.k === "mis")) || (!staticArea && effect.cv));
    if (stops) {
      // A projectile stops at the impact, but every body overlapping that
      // same narrow impact receives the hit, including tightly stacked mobs.
      for (const contact of contacts) {
        const other = contact.target;
        if (other !== target && contactFraction(x, y, x, y, other, radius) != null &&
          (cast.ignoreTerrain || mt(x, y + 14, other.x, other.y))) applyContactHit(effect, other);
      }
      effect.x = x; effect.y = y;
      return true;
    }
  }
  return false;
};

var advanceCombatMissile = function (effect, dt) {
  const before = effect.age;
  effect.age += dt * K3;
  if (effect.age < 0) return true;
  if ((!effect.kind || effect.still) && !(effect.za && effect.z > 20)) {
    if (collideCombatEffect(effect, effect.x, effect.y - (effect.z + effect.hz) * wf, effect.x, effect.y - (effect.z + effect.hz) * wf)) return false;
  }
  for (let step = Math.max(0, Math.floor(before)) + 1; step <= Math.floor(effect.age) && step <= effect.lf; step++) {
    const x = effect.x, y = effect.y - (effect.z + effect.hz) * wf;
    const age = effect.age;
    effect.age = step;
    KP(effect);
    effect.age = age;
    let reachedLimit = false;
    if (effect.travelLimit) {
      const distance = Math.hypot(effect.x - x, (effect.y - (effect.z + effect.hz) * wf - y) / SKILL_RANGE_Y_RATIO);
      const remaining = Math.max(0, effect.travelLimit - effect.traveled);
      if (distance > remaining) {
        const fraction = remaining / distance;
        effect.x = x + (effect.x - x) * fraction;
        effect.y = y + (effect.y - (effect.z + effect.hz) * wf - y) * fraction + (effect.z + effect.hz) * wf;
        reachedLimit = true;
      }
      effect.traveled += Math.min(distance, remaining);
    }
    if (!effect.combat.ignoreTerrain && Z0.g && effect.kind && (!R2(effect.x, effect.y + 14) || !mt(x, y + 14, effect.x, effect.y + 14))) return false;
    if (!(effect.za && effect.z > 20) && collideCombatEffect(effect, x, y, effect.x, effect.y - (effect.z + effect.hz) * wf)) return false;
    if (reachedLimit) return false;
  }
  return effect.age < effect.lf;
};

var advanceContactEffect = function (effect, dt) {
  if (effect.k === "jm") return advanceCombatMissile(effect, dt);
  if (effect.k === "contact") {
    const before = effect.age;
    effect.age += dt;
    if (effect.age < 0) return true;
    const x = effect.x, y = effect.y;
    if (!effect.melee && !effect.staticArea) {
      const angle = effect.ang;
      const distance = effect.speed * (effect.age - Math.max(0, before));
      effect.x += Math.cos(angle) * distance;
      effect.y += Math.sin(angle) * distance / 2;
    }
    if (!effect.combat.ignoreTerrain && Z0.g && (!R2(effect.x, effect.y + 14) || !mt(x, y + 14, effect.x, effect.y + 14))) return false;
    return !collideCombatEffect(effect, x, y, effect.x, effect.y) && effect.age < effect.life;
  }
  const before = effect.t;
  const oldProgress = E(Math.max(0, before) / effect.life, 0, 1);
  effect.t += dt;
  if (effect.t < 0) return true;
  if (effect.k === "mis") {
    const progress = E(effect.t / effect.life, 0, 1);
    const x = effect.x1 + (effect.x2 - effect.x1) * progress;
    const y = effect.y1 + (effect.y2 - effect.y1) * progress;
    const x0 = effect.x1 + (effect.x2 - effect.x1) * oldProgress;
    const y0 = effect.y1 + (effect.y2 - effect.y1) * oldProgress;
    if (!effect.combat.ignoreTerrain && Z0.g && (!R2(x, y + 14) || !mt(x0, y0 + 14, x, y + 14))) return false;
    if (collideCombatEffect(effect, x0, y0, x, y)) return false;
  } else collideCombatEffect(effect, effect.x, effect.y, effect.x, effect.y);
  return effect.t < effect.life;
};

var advanceSkillContacts = function (dt) {
  const pending = l.combatProjectiles || [];
  for (const cast of new Set(pending.map(effect => effect.combat))) cast.elapsed += dt;
  l.combatProjectiles = [];
  for (const effect of pending) {
    effect.contactAlive = !l.town && !(l.deadT > 0) && effect.combat.zone === l.zoneShown && advanceContactEffect(effect, dt);
    if (effect.contactAlive) l.combatProjectiles.push(effect);
  }
  l.fx = l.fx.filter(effect => {
    if (effect.combat) return effect.contactAlive !== false;
    if (effect.k === "jm") return RP(effect, dt);
    if (effect.k === "mis" || effect.k === "boom") return TP(effect, dt);
    return true;
  });
  if (l.fxQ && l.fxQ.length) {
    l.fx.push(...l.fxQ);
    l.fxQ.length = 0;
  }
};

var drawContactProjectile = function (effect) {
  if (effect.age < 0) return;
  if (effect.staticArea) {
    const geo = effect.combat.skill.geo;
    const radius = Math.max(8, (geo.r || geo.area || 12) * QA);
    W.save();
    W.globalAlpha = 0.3;
    W.strokeStyle = effect.color;
    W.beginPath();
    W.ellipse(effect.x, effect.y + 14, radius, radius / 2, 0, 0, Math.PI * 2);
    W.stroke();
    W.restore();
    return;
  }
  if (effect.melee) return;
  W.fillStyle = effect.color;
  W.beginPath();
  W.ellipse(effect.x, effect.y, 5, 3, 0, 0, Math.PI * 2);
  W.fill();
};
