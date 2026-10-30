// core/attributes — shared IIFE scope; order is defined in modules.json.
var ut = 10;

var Ei = 0.08;

var A4 = 0.05;

var Si = 0.04;

var M5 = (s) => 1 + Si * ((s && s.enh) || 0);

var ua = (s) => 1 + Ei * ((s && s.enh) || 0) + A4 * ((s && !s.pv3 && s.plv) || 0);

var mapAccess = MapsEngine.createMapAvailabilityGuard({
  currentMapId: () => {
    if (typeof l === "undefined" || !l || l.town || !o || !o.fac) return null;
    const key = typeof Z0 !== "undefined" && Z0.key;
    return typeof key === "number" ? key : AA(Math.min(o.stage, d0)).id;
  },
  isAvailable: (id) => MapsEngine.isMapAvailable(id),
  fetchManifest: async () => {
    const response = await fetch("app/maps/availability.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Map manifest unavailable");
    return response.json();
  },
  applyManifest: (value) => MapsEngine.updateMapAvailability(value),
  showNotice: (message, acknowledge) => MapsEngine.showMapUnavailableNotice(message, acknowledge),
  returnToTown: () => { o.autoMap = false; nc(true); },
  now: () => Date.now(),
});

var mapAdapter = MapsEngine.createLegacyMapAdapter({
  actionLocked: (actor) => actorActionLocked(actor),
  imageFor: (path) => bA(path),
  townId: () => E0.town.id,
  obstaclesDisabled: () => !!window.NO_OBS,
  navigationFor: (id) => window.JMO && window.JMO[id],
  groundItems: () => typeof l !== "undefined" && l.ground ? l.ground : [],
  unavailable: (id) => mapAccess.require(id),
});
var mapNavigation = mapAdapter.navigation;
var mapScene = mapAdapter.scene;
var O0 = mapNavigation.bounds;

var H5 = mapNavigation.clampPosition;

var X0 = mapNavigation.resolvePosition;

var sA = (s) => S.attr[s] || "#" + s;

var ga = (s, A) =>
  r0[s] && /^Tiểu Boss/i.test(r0[s].n) ? `Bá Chủ ${A || ""}`.trim() : r0[s] ? r0[s].n : "";

// Compatibility boundary: all navigation algorithms live in maps/*.ts.
var ma = mapAdapter.load;

var xw = mapNavigation.selectIsland;

var R2 = mapNavigation.walkable;

var Ii = mapNavigation.nearest;

var gt = mapNavigation.tryMove;

var $5 = mapNavigation.clear;

var mt = mapNavigation.sight;

var Bw = mapNavigation.path;

var _w = mapNavigation.distances;

var Mw = mapNavigation.moveWithFlow;

var wa = mapNavigation.moveAlongPath;

var Z0 = mapNavigation.state;

var T5 = mapNavigation.cell;

var wt = mapNavigation.canStand;

var EA = mapNavigation.flowCache;

var $w = mapNavigation.beginTick;

var pt = function (A, n, t, e = 1) {
  n = Rw[n] || n;
  const a = A[n] || (A[n] = [0, 0, 0]);
  for (let i = 0; i < 3; i++) a[i] += (t[i] || 0) * e;
};

var Y2 = function (A, n) {
  for (const t in n) if (n[t] === A) return t;
  return null;
};

var Dt = function (A, n = o.eq) {
  if (A.leg || (A.set && A.d === 10) || x1(n)) return 3;
  const t = Y2(A, n);
  if (!t) return 0;
  if (t === "horse") return 3;
  let e = s4(F0(), A.s) ? 1 : 0;
  for (const a of G5[t] || []) n[a] && s4(n[a].s, A.s) && e++;
  return e;
};

var O5 = function () {
  const A = I[o.fac];
  return S.start[A.series * 2 + (o.sex || 0)] || S.start[0];
};

var F0 = function () {
  return I[o.fac] ? I[o.fac].series : 0;
};

var t4 = function (A) {
  const n = A.weapon;
  return n ? (n.d === 1 ? 7 : n.k === 6 ? 9 : n.k) : 9;
};

var z1 = function (A) {
  const n = l.P;
  return n ? (n.plusSkill || 0) + ((n.skAdd || {})[A] || 0) : 0;
};

var E5 = function (A, n, t, e) {
  if (
    n === "addphysicsdamage_p" ||
    n === "attackratingenhance_p" ||
    n === "deadlystrikeenhance_p"
  ) {
    const a = A.attr.addphysicsdamage_p ? b0(A, "addphysicsdamage_p", 1)[2] : -1;
    if ([0, 1, 2, 3, 4, 5, 7, 9].includes(a)) return e === a;
  }
  return !0;
};

var j0 = function (A, trace) {
  A = A || o.eq;
  const n = {},
    t = o.lvl,
    e = F0(),
    a = S.levelAdd[e],
    i = O5(),
    r = {},
    c = (K, f0 = 1) => {
      const gA = Ti(sA(K.a)),
        oA = K.p.map((zA, ca) => (zA === -1 ? 0 : ca < 2 && f0 !== 1 ? zA * f0 : zA));
      if (gA === "allskill_v") {
        const zA = Math.round(Math.max(0, K.p[0] || 0)),
          ca = K.p[2] > 0 ? K.p[2] : 0;
        ca ? (r[ca] = (r[ca] || 0) + zA) : pt(n, gA, [zA, 0, 0]);
        return;
      }
      pt(n, gA, oA);
    };
  let d = 0,
    f = null;
  for (const K in A) {
    const f0 = A[K];
    if (!f0) continue;
    if (!R5(f0)) {
      if (trace) trace({ kind: "inactive", id: K, name: f0.n }, n, r);
      continue;
    }
    const gA = K === "horse" ? z(n, "fastwalkrun_p") : 0,
      oA =
        K === "weapon"
          ? [z(n, "weapondamagemin_v"), z(n, "weapondamagemax_v"), z(n, "weapondamageenhance_p")]
          : null,
      zA = ua(f0);
    for (const [la, da, $_] of f0.base)
      pt(n, sA(la), [ko(f0, (la === 28 || la === 29 ? da : (da + $_) / 2) * zA), 0, 0]);
    const ca = Dt(f0, A),
      Zm = K === "horse" ? 1 : M5(f0),
      H_ = (f0.vio ? Yw : 1) * Zm;
    if (
      ((f0.mag || []).forEach((la, da) => {
        (da % 2 === 0 || Math.floor(da / 2) < ca) && c(la, H_);
      }),
      f0.set)
    ) {
      const la = Y4(f0, A);
      (f0.ext || []).slice(0, la).forEach((da) => c(da, Zm));
    }
    (K === "horse" && (d = z(n, "fastwalkrun_p") - gA),
      oA &&
        (f = [
          z(n, "weapondamagemin_v") - oA[0],
          z(n, "weapondamagemax_v") - oA[1],
          z(n, "weapondamageenhance_p") - oA[2],
        ]));
    if (trace) trace({ kind: "equipment", id: K, name: f0.n }, n, r);
  }
  const h = t4(A),
    g = Math.round(z(n, "allskill_v")),
    u = { A: n, plusSkill: g, skAdd: r },
    w = (K) => o.sk[K] + g + (r[K] || 0);
  for (const K in o.sk) {
    const f0 = T[K];
    if (!f0 || !o.sk[K] || UA(f0) || (typeof Vi == "function" && !Vi(f0))) continue;
    const gA = w(K);
    for (const oA in f0.attr) {
      if (K5.test(oA)) continue;
      const zA = b0(f0, oA, gA);
      zA && E5(f0, oA, zA, h) && pt(n, oA, zA);
    }
    if (trace) trace({ kind: "skill", id: K, name: f0.n, level: gA }, n, r);
  }
  if (typeof nm == "function")
    for (const [K, f0] of nm()) {
      const gA = T[K];
      if (gA)
        for (const oA in gA.attr) {
          if (K5.test(oA)) continue;
          const zA = b0(gA, oA, f0);
          zA && E5(gA, oA, zA, h) && pt(n, oA, zA);
        }
      if (trace) trace({ kind: "ally", id: K, name: gA && gA.n, level: f0 }, n, r);
    }
  (Hb(n),
    trace && trace({ kind: "title", name: "Danh hiệu đang đeo" }, n, r),
    Qb(n),
    trace && trace({ kind: "collection", name: "Bộ sưu tập" }, n, r),
    (u.rebDmg = 1 + mo().dmg),
    (u.dmgMul = u.rebDmg * g7),
    (u.str = i.str + o.attr.str + z(n, "strength_v")),
    (u.dex = i.dex + o.attr.dex + z(n, "dexterity_v")),
    (u.vit = i.vit + o.attr.vit + z(n, "vitality_v")),
    (u.eng = i.eng + o.attr.eng + z(n, "energy_v")),
    (u.series = e),
    (u.life =
      (i.life +
        (t - 1) * (a.LifePerLevel + uw) +
        (u.vit - i.vit) * a.LifePerVitality +
        z(n, "lifemax_v")) *
      (1 + z(n, "lifemax_p") / 100)),
    (u.mana =
      (i.mana + (t - 1) * a.ManaPerLevel + (u.eng - i.eng) * a.ManaPerEnergy + z(n, "manamax_v")) *
      (1 + z(n, "manamax_p") / 100)),
    (u.life = Math.max(50, u.life)),
    (u.mana = Math.max(20, u.mana)),
    (u.regen = 1 + t * 0.08 + z(n, "lifereplenish_v") + (u.life * z(n, "lifereplenish_p")) / 1e4),
    (u.manaRegen = 1 + t * 0.05 + z(n, "manareplenish_v") + u.eng * 0.02),
    (u.arBase = u.dex * 4 - 28 + z(n, "attackrating_v") + z(n, "attackratingenhance_v")),
    (u.arPct = z(n, "attackratingenhance_p") + z(n, "attackrating_p")),
    (u.ar = Math.max(10, u.arBase * (1 + u.arPct / 100))),
    (u.newbie = a4()),
    u.newbie && ((u.regen += u.life * kt.life), (u.manaRegen += u.mana * kt.mana)),
    (u.def =
      Math.max(0, u.dex / 4 + z(n, "adddefense_v") + z(n, "armordefense_v")) *
      (1 + z(n, "armordefenseenhance_p") / 100)));
  const x = {
    phys: a.physicres,
    poison: a.poisonres,
    cold: a.coldres,
    fire: a.fireres,
    light: a.lightingres,
  };
  ((u.res = {}), (u.resMax = Yr + z(n, "allresmax_p") + Fr * (typeof v0 == "function" ? v0() : 0)));
  const p = Vr * (typeof v0 == "function" ? v0() : 0);
  u.resMaxE = {};
  for (const K of Q0) u.resMaxE[K] = u.resMax + z(n, P5[K].replace("res_p", "resmax_p"));
  for (const K of Q0) u.res[K] = E(x[K] + z(n, P5[K]) + z(n, "allres_p") + p, -100, u.resMaxE[K]);
  const P = A.weapon && R5(A.weapon) ? A.weapon : null,
    _ = !!(P && P.d === 1),
    y = P && f ? f : null,
    M = y ? y[2] : 0,
    B = P ? Math.floor(_ ? u.dex / dw : u.str / k5) : 1,
    O = y ? Math.floor((Math.max(1, y[0]) * (100 + M)) / 100) : 0,
    G = y ? Math.floor((Math.max(1, y[1]) * (100 + M)) / 100) : 0,
    j = P ? 0 : Math.floor(u.str / k5);
  ((u.wmin = O + B + j + z(n, "addphysicsdamage_v")),
    (u.wmax = Math.max(u.wmin, G + B + j + z(n, "addphysicsdamage_v"))),
    (u.physPct = z(n, "addphysicsdamage_p") + z(n, "weapondamageenhance_p") - M),
    (u.spellW = 1),
    (u.physStat = 1),
    (u.add = {}));
  for (const K of Q0) K !== "phys" && (u.add[K] = z(n, rw[K]));
  ((u.add.poison *= Q5), (u.enh = {}));
  for (const K in v5) u.enh[K] = z(n, v5[K]);
  ((u.coldEnh = u.enh.cold || 0), (u.enh.cold = 0));
  {
    const K = E(u.enh.poison || 0, 0, 90);
    u.enh.poison = K ? 1e4 / (100 - K) - 100 : 0;
  }
  ((u.crit = E(z(n, "deadlystrikeenhance_p") + z(n, "deadlystrike_p"), 0, 75)),
    (u.aspdP = Math.max(0, 1 + z(n, "attackspeed_v") / 100)),
    (u.aspdC = Math.max(0, 0.9 * (1 + z(n, "castspeed_v") / 100))),
    (u.aspd = u.aspdP),
    (u.leech = z(n, "steallife_p") + z(n, "steallifeenhance_p")),
    (u.manaLeech = z(n, "stealmana_p") + z(n, "stealmanaenhance_p")),
    (u.ignoreDef = z(n, "ignoredefense_p")),
    (u.retMelee = z(n, "meleedamagereturn_v")),
    (u.retMeleeP = z(n, "meleedamagereturn_p")),
    (u.series5 = z(n, "five_elements_enhance_v")),
    (u.res5 = z(n, "five_elements_resist_v")),
    (u.seriesSkill = 0),
    (u.lucky = z(n, "lucky_v") + (typeof Lt == "function" ? Lt("luck") + Lt("luck2") : 0)),
    (u.speed = 1 + z(n, "fastwalkrun_p") / 100),
    (u.speedFoot = 1 + (z(n, "fastwalkrun_p") - d) / 100),
    (u.manaShield = E(z(n, "manashield_p"), 0, 90)),
    (u.skillEnh = z(n, "skill_enhance")),
    (u.heavy = E(z(n, "enhancehit_rate"), 0, 50)),
    (u.block = E(z(n, "block_rate"), 0, 50)),
    (u.dmgShield = z(n, "dynamicmagicshield_v")),
    (u.sorb = E(z(n, "sorbdamage_p"), 0, 60)),
    (u.anti = {}));
  for (const K of Q0)
    u.anti[K] =
      z(n, "anti_allres_p") +
      z(n, "anti_" + (K === "phys" ? "physics" : K === "light" ? "lighting" : K) + "res_p");
  ((u.dmg2mana = z(n, "damage2addmana_p")),
    (u.retRangeP = z(n, "rangedamagereturn_p")),
    (u.stunAdd = z(n, "do_stun_p")),
    (u.expPct = z(n, "expenhance_p")),
    (u.stunRed = E(z(n, "stuntimereduce_p"), 0, 80)),
    (u.freezeRed = E(z(n, "freezetimereduce_p"), 0, 80)),
    (u.poisonRed = E(z(n, "poisontimereduce_p"), 0, 80)),
    (u.hitRec = E(z(n, "fasthitrecover_v"), 0, 90)),
    (u.vision = E(z(n, "visionradius_p"), 0, 30)),
    (u.knock = E(z(n, "knockback_p"), 0, 40)),
    (u.antiMax = E(z(n, "anti_maxres_p"), 0, 240)),
    (u.antiStun = E(z(n, "anti_do_stun_p"), 0, 80)),
    (u.stunLong = E(z(n, "anti_stuntimereduce_p"), 0, 200)),
    (u.breakRes = E(z(n, "anti_do_hurt_p"), 0, 60)),
    (u.antiBlock = z(n, "anti_block_rate")),
    (u.antiSorb = E(z(n, "anti_sorbdamage_yan_p"), 0, 60)));
  const X = ["metal", "wood", "water", "fire", "earth"];
  ((u.me2 = X.map((K) => z(n, "me2" + K + "damage_p") + z(n, "add_damage_p"))),
    (u.from = X.map((K) => E(z(n, K + "2medamage_p"), 0, 80))),
    (u.hurtP = E(z(n, "do_hurt_p"), 0, 80)),
    (u.hurtT = z(n, "anti_hitrecover")),
    (u.magAdd = {
      phys: z(n, "addphysicsmagic_v"),
      poison: z(n, "addpoisonmagic_v") * Q5,
      cold: z(n, "addcoldmagic_v"),
      fire: z(n, "addfiremagic_v"),
      light: z(n, "addlightingmagic_v"),
    }),
    (u.ranged = _),
    (u.skillBonus = {}));
  for (const K in o.sk) {
    const f0 = T[K];
    if (!(!f0 || !o.sk[K])) {
      for (const gA in f0.attr)
        if (gA.startsWith("addskilldamage")) {
          const oA = b0(f0, gA, w(K));
          oA && oA[0] && (u.skillBonus[oA[0]] = (u.skillBonus[oA[0]] || 0) + oA[2]);
        }
    }
  }
  if (typeof arenaSimulator !== "undefined" && arenaSimulator && typeof arenaSimulator.applyBattlefieldBonuses === "function")
    arenaSimulator.applyBattlefieldBonuses(u);
  u.actives = [];
  const $0 = [],
    I0 = Xr();
  for (const K in o.sk) {
    const f0 = T[K];
    if (
      o.sk[K] &&
      UA(f0) &&
      (!te(f0) || (o.mainLock && +o.main == +K) || +o.secondarySkill == +K || (o.slots || []).some((gA) => +gA == +K))
    ) {
      const gA = F2(u, f0, w(K));
      ($0.push(gA), (Ci(f0, I0) || (l.ignoreEqt && l.ignoreEqt.has(j1(f0)))) && u.actives.push(gA));
    }
  }
  u.basic = Ow(u);
  const T0 = u.manaRegen + Ew(t);
  for (const K of u.actives) {
    const f0 = K.costLife ? 0 : K.cost * K.rate;
    ((K.sustain = f0 > 0 ? Math.min(1, T0 / f0) : 1), (K.dps = K.dps * K.sustain));
  }
  const aA = u.actives
      .filter((K) => !te(T[K.id]))
      .concat([u.basic])
      .sort((K, f0) => f0.dps - K.dps),
    Xt = new Set(
      o.inv
        .concat(o.eq.weapon ? [o.eq.weapon] : [])
        .filter((K) => K.d <= 1 && p0(K))
        .map(Ur),
    ),
    ki = $0
      .filter((K) => !te(T[K.id]))
      .filter((K) => {
        const f0 = j1(T[K.id]);
        return f0 === null || Xt.has(f0);
      })
      .sort((K, f0) => f0.dps - K.dps)[0];
  return (
    (u.wantId = ki && ki.dps > u.basic.dps ? ki.id : 0),
    (u.main =
      (o.mainLock && (o.main === "basic" ? u.basic : u.actives.find((K) => K.id === o.main))) ||
      aA[0]),
    (u.bestAuto = aA[0]),
    u
  );
};

var Tw = function (A, n) {
  if (!A || A._ev2 || !A.attr || typeof window > "u") return [];
  const t = A.id + ":" + n;
  if (d4[t]) return d4[t];
  const e = l1[A.id],
    a = new Set();
  e && (e.sid && a.add(+e.sid), e.at16 && (a.add(162), a.add(371)));
  const i = window.SK_EV || {},
    r = window.SK_STD || {},
    c = [];
  for (const d in l4) {
    const f = A.attr[d] && b0(A, d, n);
    if (!f || f[0] !== 1) continue;
    const h = +f[2];
    if (a.has(h)) continue;
    const g = i[h] || r[h];
    if (!g || !g.a) continue;
    const u = g.m || {},
      w = l4[d],
      x = g.a,
      p = x.physicsenhance_p ? "phys" : Q0.find((P) => x[Rr[P]]) || "phys";
    c.push({
      n: g.n || (T[h] && T[h].n) || "Tầng nổ",
      sid: h,
      tab: x,
      std: 1,
      evm: 1,
      noVis: 1,
      el: p,
      col: w === "c" ? 1 : 0,
      self: w === "s" && (u.form === 3 || u.form === 7),
      max: u.form === 1 ? 2 : 3,
    });
  }
  return (d4[t] = c);
};

var S5 = function (A, n) {
  if (n.tab && typeof l < "u" && l.P) {
    const a = F2(l.P, Xw(A.id, n), n.std ? A.L : Math.min(A.L, 20)).parts || {};
    return n.std ? Object.assign({}, a) : { [n.el]: a[n.el] || 0 };
  }
  const t = n.sid ? I5(A.id, n.sid) : 1,
    e = {};
  return (
    n.k > 0 && (e[n.el] = A.tot * n.k * t),
    n.poison && (e.poison = (e.poison || 0) + A.tot * n.poison * t),
    e
  );
};

var I5 = function (A, n) {
  const t = typeof l < "u" && l.P;
  if (!t || !t.skillBonus) return 1;
  const e = (t.seriesSkill || 0) + (t.skillEnh || 0);
  return (
    (1 + ((t.skillBonus[n] || 0) + e) / 100) /
    Math.max(0.01, 1 + ((t.skillBonus[A] || 0) + e) / 100)
  );
};

var N5 = function (A, n, t) {
  const e = U2(A),
    a = r4(A, n),
    i = e && e[3] > 1 ? e[3] * 24 : 0,
    r = e ? Math.max(e[1], t) : t,
    c = !!e && !e[2],
    d = Y5(A, n);
  if (d === 1) return { k: "line", n: a, len: r, pierce: c, area: i };
  if (d === 2) {
    const f = b0(A, "skill_param1_v", n),
      h = f && f[0] > 0 ? f[0] : A.p1 || e7[A.id];
    if (h) {
      const g = a7(a, h);
      return {
        k: "fan",
        n: a,
        len: r,
        pierce: c,
        area: i,
        offs: g,
        half: Math.max(0.05, ...g.map(Math.abs)),
      };
    }
    return {
      k: "fan",
      n: a,
      len: r,
      pierce: c,
      area: i,
      half: Math.max(0.18, (a - 1) * 0.13 + 0.1),
    };
  }
  return d === 0
    ? { k: "wall", n: a, len: r, pierce: c, area: i, w: Math.max(30, a * 18) }
    : d === 3
      ? { k: "ring", n: a, len: (e && e[1]) || t, pierce: c, area: i }
      : d === 7
        ? { k: "self", n: a, r: i || t + 40 }
        : d >= 4 && d <= 6
          ? { k: "spot", n: a, r: i || 0, scat: a > 1 ? 70 : 0 }
          : { k: "single", n: a };
};

var L5 = function (A) {
  const n = (t) => (t >= 70 ? 3 : t >= 45 ? 2 : 1);
  switch (A.k) {
    case "line":
      return A.pierce ? 3 : A.area ? n(A.area) : 1;
    case "fan":
    case "wall":
    case "ring":
      return A.pierce ? 3 : Math.max(A.area ? n(A.area) : 1, Math.min(3, A.n));
    case "self":
      return 3;
    case "spot":
      return Math.max(n(A.r), Math.min(3, A.n > 1 ? A.n : 1));
    default:
      return 1;
  }
};

var Cw = function (A, n, t) {
  if (U2(A) && A.form < 8)
    return L5(N5(A, n, t || (b0(A, "skill_attackradius", n) || [A.radius || 60])[0] || 60));
  const e = r4(A, n);
  let a;
  switch (Y5(A, n)) {
    case 0:
      a = e > 1 ? 3 : 2;
      break;
    case 1:
      a = 2;
      break;
    case 2:
      a = Math.min(3, 1 + Math.ceil(e / 3));
      break;
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
      a = 3;
      break;
    default:
      a = 1;
  }
  return a;
};
