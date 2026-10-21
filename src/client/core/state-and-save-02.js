// core/state-and-save — shared IIFE scope; order is defined in modules.json.
var Td = function (A) {
  ($w(),
    Sb(A),
    (l.sweepT = (l.sweepT || 0) + A) > 30 &&
      ((l.sweepT = 0),
      Bn(),
      typeof p2 == "function" && p2(),
      typeof Xs == "function" && Xs(),
      Of(),
      hg(),
      dl(),
      mg()),
    l.dirty && D0());
  const n = l.P;
  if (typeof combatSandbox !== "undefined" && combatSandbox) combatSandbox.tick(A);
  advanceSkillContacts(A);
  if (typeof arenaSimulator !== "undefined" && arenaSimulator && arenaSimulator.battlefield.active && !arenaSimulator.battlefield.running) return;
  if (l.deadT > 0) {
    ((l.deadT -= A),
      l.deadT <= 0 && ((l.life = n.life), (l.mana = n.mana), (o.wave = 1), Ga() || o8()));
    return;
  }
  advanceConsumableCooldowns(l, A);
  if (
    ((l.life = Math.min(n.life, l.life + n.regen * A)),
    (l.mana = Math.min(n.mana, l.mana + n.manaRegen * A)),
    X9(A),
    nP(A),
    l.hpDotT > 0)
  ) {
    const e = Math.min(A, l.hpDotT) / l.hpDotT;
    const damage = l.hpDot * e, before = l.life;
    ((l.life -= damage), (l.hpDot -= damage), (l.hpDotT -= A));
    showDamageNumber(v, Math.max(0, Math.min(before, before - l.life)), "poison");
    if (typeof combatLog !== "undefined" && combatLog) combatLog.record("in", "Hiệu ứng độc", Math.min(Math.max(0, before), damage), "Hiệu ứng duy trì");
  }
  if (
    (l.slowT > 0 && (l.slowT -= A),
    l.stunT > 0 && (l.stunT -= A),
    Ab(A),
    cb(A),
    typeof Am == "function" && Am(A),
    Oy(A),
    typeof A6 == "function" && A6(A),
    typeof othTick == "function" && othTick(A),
    l.town)
  ) {
    Gv(A);
    return;
  }
  (fy(A), (l.activeT = (l.activeT || 0) + A));
  const t = hp(A);
  if (
    (l.unvoid && typeof Qd == "function" && Qd(),
    Ga() && GD(A),
    typeof Lm == "function" && Lm(A),
    !l.enemies.length)
  ) {
    if ($1()) Ah(A);
    if (Ga()) return;
    if (t && l.lootWait < 8) {
      l.lootWait += A;
      return;
    }
    if (l.spawnT > 0) {
      l.spawnT -= A;
      return;
    }
    ((l.lootWait = 0), l.dg ? dy() : l.tower ? ab() : (o8(), mh() && wh()));
    return;
  }
  if (l.dashTrail) {
    for (const e of l.dashTrail) e.t += A;
    ((l.dashTrail = l.dashTrail.filter((e) => e.t < 0.3)),
      l.dashTrail.length || (l.dashTrail = null));
  }
  if (sD(A)) {
    for (const e of _1()) $d(e, A);
    Cd();
    return;
  }
  l.atkT = Math.max(0, (l.atkT || 0) - A * coldSpeedFactor(l));
  ($1() && Ah(A),
    (t && l.pickTarget) ||
      (hA() && !(l.manTgt && !l.manTgt.dead && l.manTgt.hp > 0)
        ? (l.manTgt = null)
        : (hA() && l.clickHold) || ($1() && !(hA() && l.manTgt)) ||
          (hA() && l.manTgt && l.moveTo === l.manTgt && !Y.target && !Y.active
            ? l.stunT > 0 || wa(v, l.manTgt.x, l.manTgt.y, 150 * Ra() * coldSpeedFactor(l) * A)
            : l.moveTo &&
              l.moveTo.hp > 0 &&
              !t &&
              (l.stunT > 0 ||
                wa(v, l.moveTo.x, l.moveTo.y, 150 * Ra() * coldSpeedFactor(l) * A))),
      !(l.stunT > 0) && !actorActionLocked(v) &&
        !(hA() && !l.manTgt) &&
        (l.atkT <= 0 && (l.atkT = oD()))));
  for (const e of _1()) $d(e, A);
  (Cd(), (l.stall += A), l.stall > 45 && rD(), l.life <= 0 && dD());
};

var rD = function () {
  if (((l.stall = 0), l.dg)) return;
  if (l.tower) {
    const n = _1().reduce((e, a) => e + Math.max(0, a.hp), 0),
      t = _1().reduce((e, a) => e + (a.max || 0), 0) || 1;
    if (l.stallHp == null || l.stallHp - n > t * 0.01) {
      l.stallHp = n;
      return;
    }
    (C(
      '<span class="bad">🗼 45 giây không gây được sát thương đáng kể (quái hồi máu nhanh hơn) — rời tháp.</span>',
    ),
      (l.stallHp = null),
      Cs(!1));
    return;
  }
  if (Ga()) return;
  (l.enemies.some((n) => !n.dead && n.cls === "boss") || o.wave === Oi
    ? (l.enemies.some((n) => n.goldBoss && !n.dead) && (Q().gbT = Hh),
      C('<span class="dim">Đánh mãi không hạ được, gọi quái mới.</span>'),
      (o.wave = 1),
      (l.round = (l.round || 0) + 1),
      typeof Ut == "function" && Ut())
    : C('<span class="dim">Đợt quái kéo dài quá lâu, gọi đợt mới.</span>'),
    o8());
};

var Cd = function () {
  for (const A of l.enemies)
    A.hp <= 0 &&
      !A.dead &&
      ((A.dead = !0),
      cD(A),
      W3(r0[A.tid].anim, "die", 0.5),
      l.quiet || ((A.act = "die"), (A.actT = 0), l.corpses.push(A)));
  !Ga() && l.enemies.length && l.enemies.every((A) => A.dead) && ((l.enemies = []), lD());
};

var cD = function (A) {
  (l.kills++, (o.totalKills = (o.totalKills || 0) + 1), (l.stall = 0), YD());
  const n = A.L - o.lvl,
    t = n < -10 ? 0.2 : n < -5 ? 0.6 : 1,
    e = d8(
      _d(A.L) *
        Nd(o.lvl, A.L) *
        (typeof Yl == "function" ? Yl() : 1) *
        us[A.cls].xp *
        z5() *
        t *
        h8().rew,
    ),
    a = l.tower ? 0 : Math.round(Z7(A) * h8().rew);
  ((o.gold += a),
    e >= 1 &&
      C(
        `<span class="xpl">Nhận được <b>${Math.round(e).toLocaleString("vi-VN")}</b> điểm kinh nghiệm</span>`,
      ),
    a > 0 && A.cls !== "boss" && o.goldMsg,
    a > 0 &&
      A.cls !== "boss" &&
      o.goldMsg !== !1 &&
      C(`<span class="gdl">Nhặt được <b>${q(a)}</b> lượng</span>`),
    MP(A.x, A.y, w0[A.series]));
  for (const r of P6(A)) q4(r, A);
  for (const r of R9(A)) o.matMsg !== !1 && C(`Nhặt được <b style="color:#7fd0ff">${D(r)}</b>`);
  const i = jp(A);
  (i && (q4(i, A), C(`<b style="color:${_0[i.r]}">${D(i.n)}</b> rơi ra!`)),
    A.cls === "boss" && C(`Hạ <b class="boss">${D(A.n)}</b>${a > 0 ? ` (+${q(a)} lượng)` : ""}`),
    ub(A),
    Ib(A, a),
    Fb(A),
    Cy(A),
    p7(A));
};

var d8 = function (A) {
  const n = G2();
  if (o.lvl >= n) return 0;
  const t =
    A *
    ye *
    (1 + (o.tanthuXp && !(v0() > 0) ? +o.tanthuXp : 0)) *
    (1 + mo().xp + (l.P && l.P.expPct ? l.P.expPct / 100 : 0)) *
    (1 + Lt("xp")) *
    (1 + Lt("tt") + Lt("tt2"));
  for (o.xp += t; o.lvl < n && o.xp >= S.exp[o.lvl - 1];)
    ((o.xp -= S.exp[o.lvl - 1]),
      o.lvl++,
      (o.attrPts += z2),
      (o.skPts += x5),
      (l.dirty = !0),
      o0("levelup"),
      C(`<b class="up">Lên cấp ${o.lvl}!</b> +${z2} tiềm năng, +${x5} kỹ năng`),
      typeof Gm == "function" && Gm(),
      typeof af == "function" && af());
  return t;
};

var lD = function () {
  if (l.dg) {
    hy();
    return;
  }
  if (l.tower) {
    sb();
    return;
  }
  if (
    (za(l.P.life * 0.15, !0), (l.mana = Math.min(l.P.mana, l.mana + l.P.mana * 0.2)), o.wave < Oi)
  ) {
    (o.wave++, (l.spawnT = 1.2 / du()));
    return;
  }
  ((o.wave = 1), (l.round = (l.round || 0) + 1), _n("stages"), typeof Ut == "function" && Ut());
};

var dD = function () {
  if (typeof arenaSimulator !== "undefined" && arenaSimulator && arenaSimulator.battlefield.running) { arenaSimulator.battlefield.playerDied(); return; }
  if (
    (l.enemies.some((A) => A.goldBoss && !A.dead) && (Q().gbT = Hh),
    (l.deadT = 3),
    (l.life = 0),
    (l.enemies = []),
    Nb(),
    (l.slowT = l.stunT = l.hpDotT = l.hpDot = 0),
    C('<span class="bad">Bạn đã trọng thương.</span>'),
    l.dg)
  ) {
    pu("Gục ngã");
    return;
  }
  if (l.tower) {
    Cs(!0);
    return;
  }
  typeof Ut == "function" && Ut();
};

var D0 = function () {
  typeof W5 == "function" && W5();
  const A = l.P ? l.life / l.P.life : 1,
    n = l.P ? l.mana / l.P.mana : 1;
  ((l.P = j0()),
    (l.life = Math.min(l.P.life, l.P.life * A)),
    (l.mana = Math.min(l.P.mana, l.P.mana * n)),
    (l.power = typeof b < "u" && b.ban ? 0 : Iw(G0(l.P))),
    (l.dirty = !1));
  const t = Xr();
  if (
    (l.padEqt !== t &&
      ((l.padEqt = t), typeof qA == "function" && document.querySelector("#pad") && qA()),
    typeof yf == "function" && (l.look = yf()),
    typeof N8 == "function")
  ) {
    const e = l.jx && l.jx.key;
    ((l.jx = J3() ? N8() : null), l.jx && l.jx.key !== e && Bf());
  }
};

var fD = function (A, n = 0.05) {
  const t = l.quiet;
  l.quiet = !0;
  for (let e = 0; e < A; e += n) Td(n);
  l.quiet = t;
};

var l = {
  corpses: [],
  lootWait: 0,
  ground: [],
  pickTarget: null,
  enemies: [],
  P: null,
  life: 1,
  mana: 1,
  atkT: 0,
  deadT: 0,
  spawnT: 0,
  kills: 0,
  t0: Date.now(),
  logs: [],
  fx: [],
  txt: [],
  dirty: !0,
  stall: 0,
  farm: 0,
};

var M0 = { w: 400, h: 520, top: 70, bot: 470 };

var v = { x: 768, y: 768, face: 1 };

var DA = (s) => Math.min(k0.length - 1, Math.floor((s - 1) / Kn));

var Un = E0.zalt || {};

var AA = (s) => {
  const A = DA(s),
    n = o && o.zalt && o.zalt[A];
  return (n && Un[A] && Un[A][n - 1]) || k0[A];
};

var hD = (s) => ((s - 1) % Kn) + 1;

var ve = 3;

var Ct = 0.1;

var f8 = 1.5;

var Qa = 0.5;

var Od = 0;

var Ed = 0.5;

var uD = { boss: 0.1, elite: 0.05 };

var gD = 0.6;

var us = {
  normal: { hp: 1, dmg: 1, xp: 1, r: 17 },
  elite: { hp: 2.5, dmg: 1.3, xp: 3, r: 21 },
  boss: { hp: 14, dmg: 1.7, xp: 20, r: 30 },
};

var mD = [
  {
    n: "Dễ",
    hp: 0.75,
    dmg: 0.7,
    rew: 0.8,
    d: "Quái yếu hơn (máu −25%, sát thương −30%), thưởng −20%",
  },
  { n: "Thường", hp: 1, dmg: 1, rew: 1, d: "Cân bằng chuẩn" },
  {
    n: "Khó",
    hp: 1.4,
    dmg: 1.35,
    rew: 1.25,
    d: "Quái mạnh hơn (máu +40%, sát thương +35%), thưởng +25%",
  },
];

var h8 = () => mD[1];

var wD = [
  [1, 1],
  [10, 1.1],
  [30, 1.8],
  [60, 3.5],
  [90, 12],
  [120, 20],
  [150, 28],
  [200, 40],
];

var pD = [
  [1, 1],
  [30, 1.3],
  [60, 1.45],
  [90, 1.7],
  [120, 2.2],
  [200, 2.8],
];

var Z_ = (s) => Math.pow(u8(wD, s), 0.4);

var u8 = (s, A) => {
  for (let n = 1; n < s.length; n++)
    if (A <= s[n][0]) {
      const [t, e] = s[n - 1],
        [a, i] = s[n];
      return e + ((i - e) * (A - t)) / (a - t);
    }
  return s[s.length - 1][1];
};

var Sd = [
  [10, 50, 3, 0],
  [20, 122, 8, 10],
  [30, 270, 30, 20],
  [40, 900, 35, 30],
  [50, 1450, 60, 40],
  [60, 2100, 48, 50],
  [70, 2950, 54, 60],
  [80, 3500, 58, 70],
  [90, 5050, 11, 80],
  [100, 6450, 11, 90],
];

var AM = [
  [10, 10, 3, 0],
  [20, 50, 4, 10],
  [30, 100, 5, 20],
  [40, 250, 5, 30],
  [50, 400, 5, 40],
  [60, 500, 5, 50],
  [70, 600, 5, 60],
  [80, 700, 5, 70],
  [90, 800, 5, 80],
  [100, 900, 5, 90],
];

var nM = [
  [10, 10, 0, 0],
  [20, 50, 3, 10],
  [30, 100, 5, 20],
  [40, 150, 5, 30],
  [50, 200, 5, 40],
  [60, 300, 5, 50],
  [70, 400, 5, 60],
  [80, 500, 5, 70],
  [90, 600, 5, 80],
  [100, 800, 10, 90],
];

var tM = [
  [10, 3, 0.3, 0],
  [20, 8, 0.3, 10],
  [30, 13, 0.4, 20],
  [40, 20, 0.5, 30],
  [50, 29, 0.5, 40],
  [60, 39, 0.6, 50],
  [70, 50, 0.7, 60],
  [80, 65, 0.8, 70],
  [90, 85, 0.9, 80],
  [100, 112, 1, 90],
];

var DD = 1;

var PD = [
  [1, 0.2],
  [10, 0.2],
  [30, 0.24],
  [60, 0.2],
  [90, 0.19],
  [120, 0.15],
  [150, 0.17],
  [200, 0.17],
];

var g8 = (s) => u8(PD, s);

var eM = 25;

var Id = 30;

var vD = 6;

var bD = 1;

var aM = (s) => (s <= Id ? 1 : 1 + vD * Math.pow((s - Id) / 120, bD));

var Nd = (s, A) => {
  const n = s - A;
  return n <= 5 ? 1 : n <= 15 ? (295 - 19 * n) / 200 : 1 / 20;
};

var yD = 14;

var kD = [40, 70];

var sM = 0.4;

var xD = (s) => 1;

var iM = (s) => xD(s) / V9();

var m8 = {
  1: 100,
  2: 320,
  53: 75,
  102: 360,
  122: 300,
  153: 400,
  164: 470,
  165: 400,
  196: 180,
  197: 180,
  198: 180,
  200: 180,
  201: 180,
  233: 270,
  234: 180,
  235: 450,
  236: 360,
  237: 300,
  238: 72,
  239: 400,
  240: 320,
  241: 180,
  242: 72,
};

var BD = 320;

var _D = [3, 0, 4, 2, 1];

var MD = 70;

var HD = (s) =>
  s
    ? (s._serN == null &&
        (s._serN = new Set((s.m || []).filter((A) => r0[A]).map((A) => j2(A))).size),
      s._serN)
    : 5;

var $D = 6;

var TD = 8;

var CD = 4;

var w8 = 1;

var Ld = 0.75;

var OD = [
  [5, 2, 3, 1],
  [10, 3, 4, 1],
  [20, 4, 5, 2],
  [30, 5, 6, 3],
  [45, 5, 7, 3],
  [999, $D, TD, CD],
];

var p8 = () => OD.find((s) => (o.lvl | 0) <= s[0]);

var $3 = (s) => (s && s.dens ? w8 : 1);

var be = [0, 1, 1, 1, 1, 1];

var ED = {
  life: [0, 50, 100, 500, 1e3, 3e3],
  mana: [0, 50, 100, 500, 1e3, 3e3],
  both: [0, 80, 150, 750, 1500, 4500],
};

var Ot = (s) => (ED[s.kind] || [])[s.tier] || s.price;

var _1 = () => l.enemies.filter((s) => s.hp > 0 && !s.dead &&
  !(typeof arenaSimulator !== "undefined" && arenaSimulator && arenaSimulator.battlefield.active && !arenaSimulator.battlefield.canHit(v, s)));

var SD = 160;

var ID = new Set([336, 341, 342, 128, 165]);

var ND = 99;

var gs = 40;

var LD = 200;

var qd = 0.18;

var qD = [
  ["near", "Gần nhất"],
  ["hk", "Boss Hoàng Kim"],
];

var jd = () => (o.tgtPri === "near" ? "near" : o.tgtPri || o.bossFirst ? "hk" : "near");

var zd = (s) => s.cls === "boss" || !!s.goldBoss;

var jD = {
  hk: (s) => (s.goldBoss ? 2 : s.cls === "boss" ? 1 : 0),
  boss: (s) => (zd(s) ? 2 : s.cls === "elite" ? 1 : 0),
  elite: (s) => (zd(s) || s.cls === "elite" ? 1 : 0),
  series: (s) => (y1(F0(), s.series) ? 1 : 0),
};

var ye = 100;

var groundProbe = MapsEngine.createGroundProbe();
var ke = (x, y) => groundProbe.isVoid(l.bgImg, O0.w, O0.h, x, y);

var Qd = function () {
  const A = l.bgImg,
    n = l.clock || 0;
  if ((l.unvoidT == null && (l.unvoidT = n), n - l.unvoidT > 15)) {
    ((l.unvoid = 0), (l.unvoidT = null));
    return;
  }
  if (!A || !A.complete || !A.naturalWidth) {
    !A && n - l.unvoidT > 2 && ((l.unvoid = 0), (l.unvoidT = null));
    return;
  }
  if (((l.unvoid = 0), (l.unvoidT = null), !ke(v.x, v.y))) return;
  const e = MapsEngine.findVisibleGround(mapNavigation, v, ke);
  e &&
    (([v.x, v.y] = e),
    (v._px = v.x),
    (v._py = v.y),
    (l.moveTo = null),
    (l.pickTarget = null),
    l.petPos &&
      ((l.petPos.x = v.x + 30),
      (l.petPos.y = v.y),
      (l.petPos._px = l.petPos.x),
      (l.petPos._py = l.petPos.y)),
    typeof M1 == "function" && M1());
};

var zD = (count, spacing, avoid) => MapsEngine.generateCampCenters(
  mapNavigation, count, spacing, avoid ? { x: avoid[0], y: avoid[1] } : undefined, ke, Math.random);

var mapField = MapsEngine.createFieldRuntime(mapNavigation, {
  zone: () => AA(Math.min(o.stage, d0)),
  key: () => Rd(),
  player: () => v,
  playerAlive: () => l.life > 0,
  normalCountRange: () => { const range = p8(); return [range[1], range[2]]; },
  ensureMap: (zone) => {
    if (Z0.key !== zone.id || l.zoneShown !== zone.id) {
      Gn(zone);
      l.zoneShown = zone.id;
      l.banner = { t: 2.4, text: zone.n, sub: `Cấp ${zone.lo}–${zone.hi}` };
    }
  },
  field: () => l.field,
  setField: (field) => { l.field = field; },
  enemies: () => l.enemies,
  setEnemies: (enemies) => { l.enemies = enemies; },
  createEnemy: (point) => n1(point.tid, De(o.stage) + (point.cls === "boss" ? 1 : 0), point.cls, point.x, point.y),
  announceBoss: (enemy, point) => {
    enemy.n = ga(point.tid, AA(Math.min(o.stage, d0)).n);
    C(`<b class="boss">${D(enemy.n)}</b> xuất hiện!`);
  },
  normalRespawnSeconds: () => FD / du(),
  questNeedsBoss: (id) => {
    const task = o.dt && o.dt.task;
    return !!task && task.t === "boss" && task.tid === id && task.have < task.need;
  },
  afterTick: () => { if (mh()) wh(); },
  isVoid: (x, y) => ke(x, y),
  distance: (a, b) => q0(a, b),
  direction: (x, y) => kn(x, y),
});
var QD = mapField.initialize;

var Gd = mapField.spawn;

var GD = mapField.tick;

var KD = mapField.wander;

var RD = mapField.releaseAggro;

var YD = function () {
  const A = l.field;
  !A ||
    !Ga() ||
    ++A.kills % ZD ||
    ((l.round = (l.round || 0) + 1), _n("stages"), typeof Ut == "function" && Ut());
};

var FD = MapsEngine.FIELD_POLICY.normalRespawn;

var Kd = MapsEngine.FIELD_POLICY.bossRespawn;

var VD = MapsEngine.FIELD_POLICY.initialBossDelay;

var ZD = MapsEngine.FIELD_POLICY.killsPerRound;

var Ga = () => !l.dg && !l.tower && !l.town && !window.NO_FIELD;

var Rd = () => `${Z0.key}|${AA(Math.min(o.stage, d0)).id}|${o.diff}|${v0()}`;

var Ka = function (A, n) {
  return (
    (A = !!A && xe()),
    !!l.mounted === A || (l.rideCd || 0) > 0
      ? !1
      : ((l.mounted = A),
        (l.rideCd = aP),
        (l.dirty = !0),
        O3(),
        !n && typeof o0 == "function" && o0("use"),
        !0)
  );
};

var D8 = function () {
  if (!xe()) {
    k(
      o.eq.horse
        ? "Chưa đủ điều kiện cưỡi ngựa này"
        : "Chưa có ngựa: mặc ngựa ở ô Ngựa (thẻ Nhân vật)",
    );
    return;
  }
  ((l.rideCd = 0), Ka(!l.mounted));
};

var nP = function (A) {
  if ((l.rideCd > 0 && (l.rideCd -= A), l.rideCan !== xe() && ((l.rideCan = xe()), O3()), !xe())) {
    l.mounted && ((l.mounted = !1), (l.dirty = !0), O3());
    return;
  }
  if (!S3() || l.deadT > 0) return;
  const n = l.enemies.some((t) => !t.dead && (!t.home || t.aggro) && q0(v, t) < 400);
  !l.mounted && !n && (v.moving || l.town) && Ka(!0, !0);
};

var tP = function (A) {
  const n = T[A.id];
  return !n || E3(n) ? !1 : S3() ? (Ka(!l.mounted, !0), !0) : null;
};

var O3 = function () {
  const A = typeof m == "function" && m("#rideBtn");
  A &&
    ((A.style.display = xe() ? "" : "none"),
    (A.innerHTML = (l.mounted ? "Xuống ngựa" : "Lên ngựa") + " <small>(M)</small>"),
    A.classList.toggle("on", !!l.mounted));
};
