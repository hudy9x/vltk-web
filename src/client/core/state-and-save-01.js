// core/state-and-save — shared IIFE scope; order is defined in modules.json.
var kd = (s) =>
  s && s.set && s.set.kind === "platina"
    ? S.sets.platina.find((A) => A.vng === 2 && A.n === s.n)
    : null;

var X_ = (s) =>
  o.inv.some((A) => A !== s && A.n === s.n && A.set && A.set.kind === "gold" && A.lock);

var H3 = 120;

var B1 = 1e3 * yd;

var fs = 10;

var pe = 8;

var qa = 2;

var K9 = [2, 3, 4, 5, 6, 8, 15, 25, 40, 60];

var i8 = (s) => {
  const A = K9[Math.min(ds - 1, s.plv || 0)];
  return $a(s) >= 0 ? A : Math.max(1, Math.round((A * 2) / 3));
};

var xd = (s, A) => Math.min(1, (A | 0) / i8(s));

var J_ = (s) => id(s);

var R9 = (s) => [d9(s), u9(s), P9(s)].filter(Boolean);

var De = function (A) {
  if (A > d0) return Q2;
  const n = AA(A),
    t = Math.round(n.lo + ((hD(A) - 1) * (n.hi - n.lo)) / (Kn - 1));
  return n.lo >= 160 ? Math.min(G2(), t) : t;
};

var Y9 = function (A) {
  return A > 100 ? 26240 + (A - 100) * 340 : Bd(A, Sd, 0) * E(1 + (3 * (A - 40)) / 30, 1, 4);
};

var Bd = function (A, n, t) {
  if (A > 100) {
    const [e, a, i, r] = n[n.length - 1];
    return Math.floor(a + i * (e - r)) + t * (A - 100);
  }
  for (const [e, a, i, r] of n) if (A <= e) return Math.floor(a + i * (Math.max(1, A) - r));
  return 0;
};

var F9 = function (A, n) {
  const t = us[n];
  return {
    hp: Y9(A) * DD * g8(A) * t.hp,
    dmg: (2 + 1 * A + 0.006 * A * A) * t.dmg * u8(pD, A),
    ar: 30 + A * 9,
    def: 8 + A * 3.2,
  };
};

var _d = function (A) {
  return v6(A);
};

var W_ = function (A) {
  return (
    (A > 100 ? 26240 + (A - 100) * 340 : Bd(A, Sd, 0) * E(1 + (3 * (A - 40)) / 30, 1, 4)) * g8(A)
  );
};

var V9 = function () {
  const [A, n] = kD;
  return 1 + (yD - 1) * E((o.lvl - A) / (n - A), 0, 1);
};

var Md = function (A) {
  const n = (r0[A] && r0[A].sk) || [],
    t = n.find((e) => e !== 53 && e !== 101 && m8[e]) || n.find((e) => m8[e]) || 53;
  return Math.min(BD, m8[t] || 75);
};

var n1 = function (A, n, t, e, a) {
  const i = r0[A],
    r = AA(o.stage),
    c = F9(n, t),
    d = h8(),
    f = lc();
  ((c.hp *= d.hp * f.hp), (c.dmg *= d.dmg * f.dmg));
  const h = t !== "boss" && n >= MD && HD(r) < 5 ? N0(0, 4) : j2(A),
    g =
      Array.isArray(i.rmax) && i.rmax.length === 5
        ? i.rmax
        : Q0.map((w, x) => (x === vw[h] ? 90 : x === _D[h] ? 60 : 75)),
    u = {};
  return (
    Q0.forEach((w, x) => {
      const p = g[x] || 75,
        P = p > 75 ? 10 : p < 75 ? -10 : 0;
      u[w] = E(n * 0.35 + (t === "boss" ? 10 : 0) + P, -20, p);
    }),
    {
      id: Math.random(),
      tid: A,
      n: i.n,
      img: i.img ? bA(i.img) : null,
      sz: i.sz,
      L: n,
      cls: t,
      series: h,
      res: u,
      hp: c.hp,
      max: c.hp,
      dmg: c.dmg,
      ar: c.ar,
      def: c.def,
      x: e,
      y: a,
      r: us[t].r,
      spd: (30 + (i.run || 6) * 4) * (t === "boss" ? 0.7 : 1),
      atkCd: Z(0.5, 1.5),
      cd: 1.2 + (18 / Math.max(8, i.spd || 18)) * 0.5,
      reach: Md(A),
      ranged: Md(A) > 120,
      born: l.clock || 0,
      tr: i.tr,
      hr: i.hr || 0,
      vis: i.vis || 0,
      lr: i.lr || null,
      stun: 0,
      slowT: 0,
      poison: 0,
      poisonDmg: 0,
      hitT: 0,
      face: 1,
    }
  );
};

var o8 = function () {
  ((l.enemies = []), (l.stall = 0));
  const A = AA(o.stage),
    n = De(o.stage),
    t = (r, c) => {
      const d = Z(0, Math.PI * 2),
        f = Z(r, c);
      return X0(v.x + Math.cos(d) * f, v.y + Math.sin(d) * f);
    },
    e = () => (l.sp = t(140, 300))[0],
    a = () => l.sp[1],
    i = (r) => {
      const c = n1(C0(A.m), n, r, e(), a());
      (r === "normal" && ((c.dens = !0), (c.dmg *= Ld)), l.enemies.push(c));
    };
  if (o.wave === Oi && bk()) {
    const r = t(220, 260),
      c = n1(A.boss, n + 1, "boss", r[0], r[1]);
    ((c.n = ga(A.boss, A.n)), l.enemies.push(c), i("elite"));
    for (let d = 0; d < p8()[3]; d++) i("normal");
    C(`<b class="boss">${D(ga(A.boss, A.n))}</b> xuất hiện!`);
  } else {
    const r = p8(),
      c = N0(r[1], r[2]),
      d = o.wave === Oi ? 1 + (Math.random() < 0.4 ? 1 : 0) : 0;
    for (let f = 0; f < c; f++) i(f < d ? "elite" : "normal");
  }
  A.id !== l.zoneShown &&
    ((l.zoneShown = A.id),
    (l.banner = { t: 2.4, text: A.n, sub: `Cấp ${A.lo}–${A.hi}` }),
    typeof Gn == "function" && Gn(A));
};

var Pe = function (A, n, t = 0) {
  const e = (n * (100 - Math.min(t, 100))) / 100;
  let a = A + e === 0 ? 50 : (A * 100) / (A + e);
  return (a > b5 + 4 && (a = b5), Math.max(lw, a));
};

var ja = function (A, n, t, e, a, i, r) {
  let c = a[n];
  return (
    y1(t, e) ? (c -= r) : y1(e, t) && (c += r),
    (c = E(c, -i, Math.min(i, cw))),
    (A * (100 - c)) / 100
  );
};

var hs = function (A, n) {
  const trace = typeof arenaSimulator !== "undefined" && arenaSimulator ? arenaSimulator.step : null;
  ((n.aggro = !0),
    A && A.id && T[A.id] && [90, 150].includes(T[A.id].tier) && ((n.hitSk || (n.hitSk = {}))[A.id] = 1));
  const t = typeof Rn == "function" ? Rn(n) : null;
  if (
    A.useAR &&
    Math.random() * 100 >= Pe(A.ar || l.P.ar, Math.max(0, n.def + (t ? t.def : 0)), A.ignore)
  )
  {
    trace && trace("Trượt: lần tung ngẫu nhiên ≥ tỉ lệ trúng", { attack: A.ar || l.P.ar, defense: Math.max(0, n.def + (t ? t.def : 0)), ignore: A.ignore || 0 });
    if (typeof combatLog !== "undefined" && combatLog) combatLog.miss("out", n);
    return (showDamageNumber(n, "Trượt"), 0);
  }
  A.ev2 || E8(A, n);
  const e = Math.random() * 100 < A.crit,
    a =
      (l.P.heavy > 0 || A.fatal > 0) &&
      Math.random() * 100 < (l.P.heavy || 0) + (A.ev2 ? 0 : A.fatal || 0);
  let i = 0,
    r = "phys",
    c = 0,
    coldDamage = 0,
    d = 0;
  const f = n.cls === "boss" || n.cls === "elite";
  if (f && Math.random() * 100 < (n.cls === "boss" ? 6 : 3) - (l.P.antiBlock || 0))
    return (trace && trace("Boss/elite hóa giải", { chance: (n.cls === "boss" ? 6 : 3) - (l.P.antiBlock || 0) }), showDamageNumber(n, "Hóa giải"), 0);
  trace && trace("Bạo kích / chí mạng", { critical: e, physicalMultiplier: y5, fatal: a, fatalMultiplier: 1.5 });
  const h = n.resBrkT > 0 ? 10 : 0,
    g = l.P.anti,
    u =
      (g && Q0.some((j) => g[j])) || h
        ? Object.fromEntries(Q0.map((j) => [j, n.res[j] - ((g && g[j]) || 0) - h]))
        : n.res,
    w = t ? Object.fromEntries(Q0.map((j) => [j, u[j] + (t.res[j] || 0)])) : u,
    x = l.P.antiMax ? Math.max(0, 75 - l.P.antiMax / 4) : 75;
  for (const j in A.parts) {
    let X = A.parts[j] * Z(0.85, 1.15);
    if (j === "poison") {
      const $0 = n.poison > 0 ? n.poisonDmg * n.poison : 0;
      n.poison > 0 || Tt(n, "Độc", "#8fe34a");
      const I0 = A.poisonT || ve;
      ((d =
        ja(
          X * (t && t.poison ? 1 + t.poison / 100 : 1),
          "poison",
          A.series,
          n.series,
          w,
          x,
          A.series5,
        ) * ea()),
        (n.poisonDmg = ($0 + d) / Math.max(I0, n.poison > 0 ? n.poison : 0)),
        (n.poison = Math.max(I0, n.poison > 0 ? n.poison : 0)));
      continue;
    }
    ((X = ja(X, j, A.series, n.series, w, x, A.series5)),
      j === "cold" && (coldDamage = X),
      e && j === "phys" && (X *= y5),
      (i += X),
      X > c && ((c = X), (r = j)));
  }
  trace && trace("Tổng trực tiếp sau kháng", { damage: i, poisonTotal: d });
  (y1(A.series, n.series) && (i += l.P.series5),
    a && (i *= 1.5),
    f && l.P.antiSorb && (i *= 1 + l.P.antiSorb / 100));
  trace && trace("Cộng khắc hệ → chí mạng → xuyên hấp thụ boss", { seriesFlat: y1(A.series, n.series) ? l.P.series5 : 0, fatal: a, antiSorb: f ? l.P.antiSorb || 0 : 0, damage: i });
  const p = y1(A.series, n.series),
    P = y1(n.series, A.series);
  (p ? (i *= 1 + Ct) : P && (i *= 1 - Ct),
    l.P.me2 && l.P.me2[n.series] && (i *= 1 + l.P.me2[n.series] / 100),
    coldDamage > 0 && !(n.slowT > 0) && Tt(n, "Băng", "#8fd8ff"),
    coldDamage > 0 && applyColdSlow(n, coldDamage, (A.coldT || f8) + (l.P.coldEnh || 0) / 18));
  trace && trace("Nhân khắc hệ → tăng sát thương theo hệ", { seriesFactor: p ? 1 + Ct : P ? 1 - Ct : 1, versusFactor: 1 + ((l.P.me2 && l.P.me2[n.series]) || 0) / 100, damage: i });
  const _ = 1 + (l.P.stunLong || 0) / 100;
  A.parts.light && Math.random() < Od && (n.stun = Math.max(n.stun, Ed * _));
  const y = !(i > 0) && d > 0;
  if (
    ((i = y ? 0 : Math.max(1, i * ea())),
    (trace && trace("Sát thương trực tiếp = chỉ độc ? 0 : max(1, tổng × ea)", { poisonOnly: y, accountMultiplier: ea(), damage: i, hpBefore: n.hp, hpAfter: n.hp - i })),
    (n.hp -= i),
    (n.hitT = 0.12),
    // Cold hits slow locomotion without entering the movement-blocking hurt pose.
    coldDamage <= 0 && applyActorHurt(n, i, n.max) && W3(n.animKey || r0[n.tid].anim, "hurt", 0.3),
    (A.stun || l.P.stunAdd) &&
      Math.random() * 100 < (A.stun || 0) + (l.P.stunAdd || 0) &&
      (n.stun > 0 || Tt(n, "Choáng", "#ffd24a"), (n.stun = Math.max(n.stun, 0.8 * _))),
    l.P.knock && n.cls !== "boss" && Math.random() * 100 < l.P.knock)
  ) {
    const j = n.x - v.x,
      X = n.y - v.y,
      $0 = Math.hypot(j, X) || 1;
    ((n.x += (j / $0) * 40),
      (n.y += (X / $0) * 40),
      (n.stun = Math.max(n.stun, 0.25)),
      (n.atkCd = Math.max(n.atkCd || 0, 0.3)));
  }
  (l.P.breakRes && Math.random() * 100 < l.P.breakRes && (n.resBrkT = 3),
    l.P.hurtP &&
      Math.random() * 100 < l.P.hurtP &&
      (n.atkCd = Math.max(n.atkCd || 0, 0.25 + (l.P.hurtT || 0) / 18)));
  // Battlefield secondary hits inherit steal percentages, each applied to that hit's own damage.
  const M = A.basic || A.wpn,
    B = ((M && l.P.leech) || 0) + (A.ev2 && !l.battlefield ? 0 : A.skLeech || 0),
    O = ((M && l.P.manaLeech) || 0) + (A.ev2 && !l.battlefield ? 0 : A.skMLeech || 0);
  (B && za((i * B) / 100, !0), O && (l.mana = Math.min(l.P.mana, l.mana + (i * O) / 100)));
  const G = p ? " ⚡" : P ? " 🛡" : "";
  // Poison is deferred: display only actual HP loss from its later ticks.
  return y
    ? d
    : (showDamageNumber(n, i, r, e || a, G),
      i);
};

var Tt = function () {};

var U9 = function (A) {
  const attackerHP = A.hp;
  const trace = typeof arenaSimulator !== "undefined" && arenaSimulator ? arenaSimulator.step : null;
  const n = typeof Rn == "function" ? Rn(A) : null;
  if (Math.random() * 100 >= Pe(A.ar * (n ? Math.max(0.1, 1 + n.ar / 100) : 1), l.P.def)) {
    trace && trace("Né: lần tung ngẫu nhiên ≥ tỉ lệ trúng", { attack: A.ar, defense: l.P.def });
    if (typeof combatLog !== "undefined" && combatLog) combatLog.miss("in", A);
    showDamageNumber(v, "Né");
    return;
  }
  if (l.P.block && Math.random() * 100 < l.P.block) {
    trace && trace("Người chơi hóa giải", { chance: l.P.block });
    showDamageNumber(v, "Hóa giải");
    return;
  }
  const t = Dw[A.series] || "phys";
  let e = A.dmg * Z(0.8, 1.2) * (n ? Math.max(0.1, 1 + n.dmg / 100) : 1);
  let coldDamage = 0;
  trace && trace("Sát thương gốc × ngẫu nhiên × lời nguyền", { base: A.dmg, curseFactor: n ? Math.max(0.1, 1 + n.dmg / 100) : 1, damage: e });
  if (
    ((e = ja(
      e,
      t,
      A.series,
      l.P.series,
      l.P.res,
      (l.P.resMaxE && l.P.resMaxE[t]) || l.P.resMax || Yr,
      10,
    )),
    t === "cold" && (coldDamage = e),
    y1(A.series, l.P.series)
      ? ((e *= 1 + Ct), l.P.res5 && (e = Math.max(1, e - l.P.res5)))
      : y1(l.P.series, A.series) && (e *= 1 - Ct),
    l.P.dmgShield && (e -= Math.min(l.P.dmgShield, e * Jr)),
    coldDamage > 0 && !(l.slowT > 0) && (l.P.freezeRed || 0) < 100 && Tt(null, "Băng", "#8fd8ff"),
    coldDamage > 0 && applyColdSlow(l, coldDamage, f8 * (1 - (l.P.freezeRed || 0) / 100)),
    t === "light" &&
      Math.random() < (uD[A.cls] || 0) &&
      !(Math.random() * 100 < (l.P.antiStun || 0)))
  ) {
    const a = gD * (1 - (l.P.stunRed || 0) / 100);
    a > 0.05 && ((l.stunT = Math.max(l.stunT || 0, a)), Tt(null, "Choáng", "#ffd24a"));
  }
  trace && trace("Sau kháng → khắc hệ → trừ res5 → khiên sát thương", { seriesFactor: y1(A.series, l.P.series) ? 1 + Ct : y1(l.P.series, A.series) ? 1 - Ct : 1, res5: l.P.res5 || 0, shield: l.P.dmgShield || 0, shieldCap: Jr, damage: e });
  if ((t === "poison" && !(l.hpDotT > 0) && Tt(null, "Độc", "#8fe34a"), t === "poison")) {
    const a = ve * (1 - (l.P.poisonRed || 0) / 100),
      i = e * 0.4;
    ((e -= i),
      a > 0.05 &&
        ((l.hpDot = (l.hpDot || 0) + (i * a) / ve), (l.hpDotT = Math.max(l.hpDotT || 0, a))));
  }
  if (
    (l.P.sorb && (e *= 1 - l.P.sorb / 100),
    l.P.from && l.P.from[A.series] && (e *= 1 - l.P.from[A.series] / 100),
    l.P.dmg2mana && (l.mana = Math.min(l.P.mana, l.mana + (e * l.P.dmg2mana) / 100)),
    n && n.ret && !A.ranged && (A.hp -= ((e * n.ret) / 100) * ea()),
    l.P.manaShield > 0 && l.mana > 0)
  ) {
    trace && trace("Sau tách độc 40% → hấp thụ → giảm theo hệ", { poison: t === "poison", dot: l.hpDot || 0, dotSeconds: l.hpDotT || 0, sorb: l.P.sorb || 0, from: (l.P.from && l.P.from[A.series]) || 0, damage: e });
    const a = Math.min(l.mana, (e * l.P.manaShield) / 100);
    trace && trace("Khiên mana: trừ min(mana, damage × manaShield / 100)", { mana: l.mana, manaShield: l.P.manaShield, absorbed: a, damage: e - a });
    ((l.mana -= a), (e -= a));
  }
  if (
    ((trace && trace("Trừ HP", { damage: e, hpBefore: l.life, hpAfter: l.life - e, dot: l.hpDot || 0, dotSeconds: l.hpDotT || 0, sorb: l.P.sorb || 0, from: (l.P.from && l.P.from[A.series]) || 0 })),
    (l.life -= e),
    coldDamage <= 0 && applyActorHurt(v, e, l.P.life),
    l.P.retMelee || l.P.retMeleeP || l.P.retRangeP)
  ) {
    const a = A.ranged
      ? (e * (l.P.retRangeP || 0)) / 100
      : l.P.retMelee + (e * l.P.retMeleeP) / 100;
    a > 0 && (A.hp -= a * ea());
  }
  applyActorHurt(A, attackerHP - A.hp, A.max);
  showDamageNumber(v, e, t);
};

var za = function (A, n) {
  const t = l.life;
  ((l.life = Math.min(l.P.life, l.life + A)),
    !n && l.life - t > 1 && $A(v.x, v.y - 44, "+" + F(l.life - t), "#7f7", 11));
};

var r8 = function (A) {
  let n = null;
  for (const t of S.potions)
    t.kind === A &&
      o.lvl >= (be[t.tier] || 999) &&
      Ot(t) <= o.gold &&
      (!n || t.tier > n.tier) &&
      (n = t);
  return n;
};

var X9 = function (A) {
  delete l.hot;
  const t = l.P;
  if (((l.potCd = l.potCd || { life: 0, mana: 0 }), o.potBuy !== !1)) for (const r of [0, 1]) J9(r);
  if (o.potOff) return;
  const e = (r, c) => E((o[r] ?? c) / 100, 0.05, 0.95);
  for (const r of ["life", "mana"]) {
    const needed = r === "life" ? l.life < t.life * e("potHp", 50) :
      l.mana < t.mana * e("potMp", 50) || (t.main.cost > 0 && !t.main.costLife && l.mana < t.main.cost * 2);
    if (!needed || l.potCd[r] > 0) continue;
    const f = typeof ic == "function" ? ic(r === "life" ? 0 : 1) : null,
      h = f ? null : ch(r),
      g = f ? f.p : h || r8(r);
    g && (Hd(r, g, f ? f.free : !!h), (l.potCd[r] = ao));
  }
};

var J9 = function (A) {
  const n = A ? "mana" : "life",
    t = typeof co == "function" ? co(A) : null;
  if (t ? (C1(t.kind)[t.tier] || 0) > 0 : rh(n) > 0) return;
  let e = t && ro(t) ? t : null;
  if (!e)
    for (const r of S.potions)
      r.kind === n &&
        o.lvl >= (be[r.tier] || 999) &&
        Ot(r) * At <= o.gold * 0.2 &&
        (!e || r.tier > e.tier) &&
        (e = r);
  if (!e) return;
  const a = Ot(e) * At;
  if (a > o.gold * 0.2) return;
  o.gold -= a;
  const i = C1(e.kind);
  ((i[e.tier] = (i[e.tier] || 0) + At), C(`Tự mua ${At} ${e.n} (-${q(a)} lượng)`));
};

var Hd = function (A, n, t) {
  (t || (o.gold -= Ot(n)), (o.potUsed = (o.potUsed || 0) + 1), _n("pots"));
  applyPotionRecovery(l, A, n);
  if (n.kind === "both") {
    l.potCd = l.potCd || { life: 0, mana: 0 };
    l.potCd.life = l.potCd.mana = ao;
  }
};

var c8 = function (A) {
  const n = l.P ? l.P.series : -1;
  let t = null,
    e = 1e9;
  for (const a of A) {
    let i = q0(v, a) * (typeof Qs == "function" && Qs(a) ? 0.85 : 1);
    (Z0.g && !mt(v.x, v.y, a.x, a.y) && (i = i * 2.5 + 200), i < e && ((e = i), (t = a)));
  }
  return t;
};

var W9 = function (A) {
  if (o.rot === !1 || window.NO_ROT || (o.mainLock && o.main === "basic")) return [];
  const n = (o.slots || []).filter((e) => e > 0),
    t = A.actives.filter((e) => n.includes(e.id));
  return t.length < 2 ? [] : n.map((e) => t.find((a) => a.id === e)).filter(Boolean);
};

var Z9 = function (A, n) {
  if (typeof manaNotice === "function") manaNotice(A.main);
  const t = S3() && !E3(T[A.main.id], !!l.mounted) ? !l.mounted : !!l.mounted;
  l.rotNext = null;
  const manualWarTarget = l.battlefield && typeof hA === "function" && hA() && l.manTgt;
  const e = n || manualWarTarget ? [] : W9(A).filter((r) => E3(T[r.id], t)),
    a = (r) => !r.cd || ((l.skCd || {})[r.id] || 0) <= (l.clock || 0);
  if (e.length < 2) {
    // Learned skills outside the configured slots must never be a fallback.
    // War uses only a free basic attack while the primary waits for MP.
    if (a(A.main) && ji(A.main)) return A.main;
    return l.battlefield && a(A.main) && !ji(A.main) && ji(A.basic) ? A.basic : null;
  }
  const i = e.length;
  l.rotI = (l.rotI ?? Math.max(0, e.findIndex(skill => skill.id === A.main.id))) % i;
  for (let r = 0; r < i; r++) {
    const c = e[(l.rotI + r) % i];
    if (a(c) && ji(c)) return ((l.rotNext = (l.rotI + r + 1) % i), c);
  }
  return l.battlefield && e.some(a) && ji(A.basic) ? A.basic : null;
};

var AD = function (A, n, t) {
  const e = A && A.geo,
    a = A && T[A.id];
  if (!e || e.k !== "wall" || e.pierce || A.many || !(e.n > 1) || !n || !a) return 0;
  const i = a.p1 || 32,
    r = U2(a),
    c = (r && r[3] > 0 ? r[3] : 1) * 32 + (n.r || 12) / QA;
  let d = 0;
  for (let f = 0; f < e.n; f++) Math.abs((f - (e.n - 1) / 2) * i) <= c && d++;
  return Math.max(0, Math.min(d - 1, e.n - t));
};

var l8 = function (A, n, t, e) {
  if (A && A.geo && A.geo.k === "wall") return AD(A, n, e);
  const a = A && A.geo;
  if (!a || !ID.has(+A.id) || a.k !== "fan" || !(a.n > 1) || !n) return 0;
  const i = (n.r || 12) / QA,
    r = Math.max(1, t + i);
  let c = 0;
  const d = a.offs || Array.from({ length: a.n }, (h, g) => -a.half + (g * 2 * a.half) / (a.n - 1));
  for (const h of d) Math.cos(h) > 0 && Math.abs(Math.sin(h)) * r <= i && c++;
  const f = a.pierce ? a.n - 1 : a.n - e;
  return Math.max(0, Math.min(Math.min(ND, c) - 1, f));
};

var nD = function (A, n, t) {
  const verticalRatio = A.geo.k === "self" ? SKILL_RANGE_Y_RATIO : 0.5;
  const e = (O) => ({ x: O.x / QA, y: O.y / verticalRatio / QA }),
    a = (O) => (O.r || 12) / QA,
    i = e(v),
    r = e(n),
    c = A.geo,
    d = r.x - i.x,
    f = r.y - i.y,
    h = Math.hypot(d, f) || 1,
    g = d / h,
    u = f / h,
    w = t.filter((O) => O !== n && !O.dead).map((O) => ({ e: O, p: e(O), r: a(O) })),
    x = (O, G, j) => skillIgnoresTerrain(A) || mt(O * QA, G * QA * verticalRatio, j.e.x, j.e.y),
    p = (O, G, j) => w.filter((X) => Math.hypot(X.p.x - O, X.p.y - G) <= j + X.r && x(O, G, X)),
    P = (O, G, j) =>
      O.sort((X, $0) => Math.hypot(X.p.x - G, X.p.y - j) - Math.hypot($0.p.x - G, $0.p.y - j)),
    _ = (O) => (O.p.x - i.x) * g + (O.p.y - i.y) * u,
    y = (O) => Math.abs((O.p.x - i.x) * u - (O.p.y - i.y) * g);
  let M = [];
  const B = Math.min(A.rad || 400, h + SD) + 40;
  switch (c.k) {
    case "line":
    case "wall": {
      const O = Math.min(Math.max(c.len, h), B),
        G = (c.k === "wall" ? c.w : 26) + c.area,
        j = w.filter((X) => {
          const $0 = _(X);
          return $0 >= 0 && $0 <= O && y(X) <= G + X.r && x(i.x, i.y, X);
        });
      ((M = c.pierce ? j : c.k === "wall" ? P(j, i.x, i.y).slice(0, c.n - 1) : []),
        !c.pierce && c.area && (M = M.concat(p(r.x, r.y, c.area))));
      break;
    }
    case "fan":
    case "ring": {
      const O = Math.min(Math.max(c.len, c.k === "ring" ? 0 : h), B),
        G = w.filter((j) => {
          const X = Math.hypot(j.p.x - i.x, j.p.y - i.y);
          if (X > O + j.r) return !1;
          if (c.k === "fan") {
            const $0 = _(j) / (X || 1);
            if (Math.acos(E($0, -1, 1)) > c.half) return !1;
          }
          return x(i.x, i.y, j);
        });
      ((M = c.pierce ? G : P(G, i.x, i.y).slice(0, c.n - 1)),
        !c.pierce && c.area && (M = M.concat(p(r.x, r.y, c.area))));
      break;
    }
    case "self":
      M = p(i.x, i.y, c.r);
      break;
    case "spot": {
      c.r
        ? (M = p(r.x, r.y, c.r + c.scat))
        : c.n > 1 && (M = P(p(r.x, r.y, c.scat), r.x, r.y).slice(0, c.n - 1));
      break;
    }
    default:
      M = [];
  }
  return [...new Set(M.map((O) => O.e))];
};

var tD = function (A, n, t, e) {
  for (const a of F5(A)) eD(A, n, t, e, a);
};

var eD = function (A, n, t, e, a, context) {
  // Optional actor context lets SIM reuse the same events without retaining
  // the temporary player globals in delayed contact callbacks.
  const caster = context ? context.actor : v;
  const draw = action => context ? context.visual(action) : action();
  // Both secondaries keep delayed, independent damage for paired recipients.
  // Kunlun draws one storm at its chosen target; Emei draws ice at each recipient.
  const thunder = +A.id === 1081 && +a.sid === 1109;
  if (thunder || (+A.id === 1061 && +a.sid === 1091)) {
    const castAnchor = A.visualAnchor || { x: n.x, y: n.y - 14 };
    const recipients = [...new Set(e || [n])].filter(target => target && !target.dead && target.hp > 0 &&
      (!thunder || contactFraction(castAnchor.x, castAnchor.y, castAnchor.x, castAnchor.y, target, 150 * QA) != null)
    ).slice(0, Qi(A, a));
    const missile = A0.m[A0.f[a.sid] && A0.f[a.sid].c], sprite = missile && missile.fly;
    const delay = a.delay, life = missile && missile.life || 1.67;
    let visualShown = false;
    const ability = Object.assign({}, A, {
      id: a.sid, n: a.n, parts: S5(A, a), ev: false, ev2: true,
      stun: a.stun || 0, crit: 0, useAR: false,
      geo: { k: "spot", r: 12, pierce: true },
    });
    for (const recipient of recipients) {
      const visualAnchor = thunder ? castAnchor : { x: recipient.x, y: recipient.y - 14 };
      const field = { k: "boom", s: sprite, x: recipient.x, y: recipient.y - 14,
        t: 0, life, sp: sprite ? yn(sprite) / life : 1, dir: 0, visualAnchor };
      const hidden = (thunder && visualShown) || l.quiet || !sprite || l.fx.length > 160;
      if (!hidden) visualShown = true;
      queueSkillContact(caster, recipient, ability, target => {
        const damage = context ? context.hit(ability, target) : hs(ability, target);
        if (!context) Ls(damage, ability);
        if (!hidden && missile.hit) draw(() => {
          (l.fxQ || (l.fxQ = [])).push({ k: "boom", s: missile.hit,
            x: visualAnchor.x, y: visualAnchor.y, t: 0, life: yn(missile.hit), dir: 0, cosmetic: true });
        });
      }, {
        windup: delay, maxTargets: 1,
        targets: () => (context ? context.targets() : _1()).includes(recipient) ? [recipient] : [],
        // Register the physical field even when its image/FX budget is unavailable.
        visual: () => draw(() => l.fx.push(field)),
      });
      if (hidden) l.fx = l.fx.filter(effect => effect !== field);
    }
    return;
  }
  // Băng Tâm Tuyết Liên đã được tạo theo từng va chạm, không tạo lại ở hit đầu.
  if (+A.id === 336 && +a.sid === 382 && A.impactLotusHandled) return;
  if (+A.id === 337 && +a.sid === 338 && A.snowTrailHandled) return;
  if (+A.id === 339 && !A.impactVisualTargets) A = Object.assign({}, A, { impactVisualTargets: new Set() });
  if (+A.id === 319 && !a.self) a = Object.assign({}, a, { self: true, col: false });
  // Beggar skills only damage at projectile impact; lightning uses one timed field.
  if (([357, 359].includes(+A.id) && a.self) || +A.id === 375) return;
  const i = !a.noVis && typeof Be == "function",
    r = a.rays || a.self ? caster : n,
    c = a.rays ? Math.max(280, (A.rad || 0) + 40) : a.self ? 170 : [302, 339, 342, 357, 318, 321].includes(+A.id) ? 50 : [353, 355].includes(+A.id) ? 100 : 150,
    d =
      a.col && e
        ? e.filter((h) => !h.dead && h.hp > 0).slice(0, Qi(A, a))
        : t
            .filter((h) => !h.dead && q0(r, h) < c && (skillIgnoresTerrain(A) || mt(r.x, r.y, h.x, h.y)))
            .sort((h, g) => q0(r, h) - q0(r, g))
            .slice(0, Qi(A, a));
  if (a.castFx && i) draw(() => Be(caster, A, null, null, { self: !0, fx: a.castFx }));
  if (a.fxOnly) {
    if (i) draw(() => Be(a.self ? caster : n, A, a.n, a.rays ? caster : null, a));
    return;
  }
  const eligible = d;
  const u = Object.assign({}, A, {
    parts: S5(A, a), stun: a.stun || 0, useAR: !1, ev2: !0,
    crit: a.el === "phys" ? A.crit : 0,
    geo: a.self ? { k: "self", r: c, pierce: true } : a.rays ? { k: "fan", n: Qi(A, a) } : { k: "spot", r: c, pierce: true },
  });
  queueSkillContact(caster, a.self ? caster : n, u, target => {
    if (!a.chance || Math.random() < a.chance) {
      const damage = context ? context.hit(u, target) : hs(u, target);
      if (!context) Ls(damage, u);
      if (+A.id === 339 && damage > 0 && !a.noFx) draw(() => showNhiepHonImpact(target, A));
    }
  }, {
    hideFallbackVisual: +A.id === 339,
    maxTargets: Qi(A, a),
    maxHits: () => a.rays ? Qi(A, a) : 1,
    targets: context ? context.targets : () => _1(),
    visual: () => draw(() => {
      if (+A.id === 339 || !i || a.noFx) return;
      l.ev2Tg = eligible;
      try {
        const visualStart = l.fx.length, contactStart = (l.combatProjectiles || []).length;
        Be(a.self ? caster : n, A, a.n, a.rays ? caster : null, a);
        if (+A.id === 368 && +a.sid === 162) {
          // Keep the secondary's collision/damage, but let primary sword contacts
          // display its ring. A stationary damage hit must not gate the animation.
          const emitted = new Set(l.fx.slice(visualStart).concat((l.combatProjectiles || []).slice(contactStart)));
          for (const effect of emitted) if (effect.k === "jm")
            effect.m = Object.assign({}, effect.m, { fly: null, hit: null });
        }
      }
      finally { l.ev2Tg = null; }
    }),
  });
};

var aD = function (A, n, t) {
  if (actorActionLocked(v)) return 0;
  if (hA() && l.clickHold) return 0;
  if (!o.sk[gs] || l.dash || l.town) return 0;
  if (l.battlefield && +A.main.id !== gs &&
    (o.rot === false || (hA() && l.manTgt) || !(o.slots || []).includes(gs))) return 0;
  const e = A.actives.find((d) => d.id === gs);
  if (
    !e ||
    ((l.skCd || {})[gs] || 0) > (l.clock || 0) ||
    !ji(e) ||
    t < 40 ||
    t > LD ||
    !mt(v.x, v.y, n.x, n.y)
  )
    return 0;
  // Dash attacks also spend resources only after their mount condition passes.
  const riding = tP(e);
  if (riding === true || riding === null) return 0.25;
  (o4(e), typeof Y !== "undefined" && Y.stopAfterCast(), ((l.skCd = l.skCd || {})[gs] = (l.clock || 0) + (e.cd || 2)));
  const a = n.x - v.x,
    i = n.y - v.y,
    r = Math.hypot(a, i) || 1,
    c = (n.r || 12) + 14;
  return (
    (l.dash = {
      x0: v.x,
      y0: v.y,
      x1: n.x - (a / r) * c,
      y1: n.y - (i / r) * c,
      t: 0,
      tg: n,
      a: e,
    }),
    (v.face = a >= 0 ? 1 : -1),
    (v.dir = kn(a, i)),
    (v.act = "run"),
    (v.actT = 0),
    (l.moveTo = null),
    qd + 0.12
  );
};

var sD = function (A) {
  const n = l.dash;
  if (!n) return !1;
  if (v.hurtT > 0) { l.dash = null; return false; }
  n.t += A;
  const t = Math.min(1, n.t / qd);
  if (
    ((l.dashTrail = l.dashTrail || []).push({ x: v.x, y: v.y, dir: v.dir, t: 0 }),
    (v.x = n.x0 + (n.x1 - n.x0) * t),
    (v.y = n.y0 + (n.y1 - n.y0) * t),
    t >= 1)
  ) {
    l.dash = null;
    const e = n.tg;
    (beginActorCast(v, actorAttackTiming(v, n.a).cycleSeconds, () => {
      if (e && !e.dead && e.hp > 0 && q0(v, e) <= ((e.r || 12) + 24) / QA && mt(v.x, v.y, e.x, e.y)) Ls(hs(n.a, e), n.a);
      if (n.a.id) G8(n.a.id);
    }),
      (v.act = "at"),
      (v.actT = 0));
  }
  return !0;
};

var iD = function (A) {
  const n = !$1(),
    t = l.clock || 0,
    e = l.tgtBan || (l.tgtBan = new Map());
  let a = A,
    i = !1;
  if (n && o.mode === "quest" && typeof Qs == "function") {
    const u = A.filter((w) => Qs(w) && !(e.get(w) > t));
    if (u.length) {
      const w = A.filter((x) => !u.includes(x) && q0(v, x) < 140);
      ((a = w.length ? u.concat(w) : u), (i = !0));
    }
  }
  if (l.battlefield && o.preferPKSim) {
    const sims = a.filter(target => target.arenaSim && !target.battlefieldBoss);
    if (sims.length) a = sims;
  }
  const r = jd();
  if (n && r !== "near")
    if (r === "lowhp") {
      const u = a.filter((w) => q0(v, w) < 520);
      if (u.length) {
        const w = Math.min(...u.map((x) => x.hp / (x.max || x.hp || 1)));
        a = u.filter((x) => x.hp / (x.max || x.hp || 1) <= w + 0.08);
      }
    } else {
      const u = jD[r],
        w = Math.max(...a.map(u));
      w > 0 && (a = a.filter((x) => u(x) === w));
    }
  const c = a.filter((u) => !(e.get(u) > t)),
    d = c.length ? c : a,
    f = l.tgt,
    h = c8(d);
  if (f && !f.dead && f.hp > 0 && d.includes(f)) {
    const u = q0(v, f);
    if (
      (u < (l.tgtD ?? 1e9) - 25 && ((l.tgtD = u), (l.tgtHitT = t)),
      t - (l.tgtHitT ?? t) > 5 && (d.length > 1 || i))
    )
      e.set(f, t + 8);
    else if (!h || h === f || q0(v, h) > q0(v, f) * 0.5 - 40) return f;
  }
  const g = (f && d.includes(f) && e.get(f) > t && c8(d.filter((u) => u !== f))) || h;
  if (g !== l.tgt && ((l.tgt = g), (l.tgtHitT = t), (l.tgtD = g ? q0(v, g) : 1e9), e.size > 50))
    for (const [u, w] of e) (w <= t || u.dead) && e.delete(u);
  return g;
};

var oD = function () {
  if (typeof Y !== "undefined" && (Y.pendingSupport ||
    (typeof Y.hasMovementInput === "function" && Y.hasMovementInput()) || (Y.tmp && Y.target && !hA()))) return 0.05;
  if (actorActionLocked(v)) return 0.05;
  const A = l.P,
    n = _1();
  if (!n.length) return 0.3;
  const t = hA() && l.manTgt && n.includes(l.manTgt) ? l.manTgt : iD(n);
  let e = Z9(A, !l.tower && (t.cls === "boss" || t.cls === "elite" || !!t.goldBoss));
  if (!e) return 0.25;
  e.id === gs && (e = A.basic);
  {
    const h = typeof jm == "function" && jm(e, t);
    if (h) return h;
  }
  const a = skillCastDistance(v, t) - t.r / QA;
  {
    const h = aD(A, t, q0(v, t) - t.r / QA);
    if (h) return h;
  }
  if (a > e.rad + 300 && S3()) Ka(!0, !0);
  else if (a <= e.rad + 60) {
    const h = tP(e);
    if (h === !0) return 0.25;
    h === null && (e = A.basic);
  }
  const reach = e.geo && e.geo.k === "self" ? e.geo.r || e.rad : e.rad;
  const i = o.closeAtk && !$1() ? Math.min(reach, 70) : reach;
  if (a > i || (!skillIgnoresTerrain(e) && !mt(v.x, v.y, t.x, t.y)))
    return ((l.moveTo = (hA() && l.clickHold) || ($1() && !(hA() && l.manTgt === t)) ? null : t), 0.05);
  ((l.moveTo = null),
    (l.tgtHitT = l.clock || 0),
    (l.tgtD = 0),
    o4(e),
    typeof Y !== "undefined" && Y.stopAfterCast(),
    e.cd && ((l.skCd = l.skCd || {})[e.id] = (l.clock || 0) + e.cd),
    l.rotNext != null && ((l.rotI = l.rotNext), (l.rotNext = null)));
  const r = e.around ? v : t,
    c = e.around ? e.rad + 40 : 110,
    d = e.geo
      ? nD(e, t, n)
      : n
          .filter((h) => h !== t && q0(r, h) < (e.targets > 1 ? c : 0) && (skillIgnoresTerrain(e) || mt(r.x, r.y, h.x, h.y)))
          .slice(0, e.targets - 1);
  d.unshift(t);
  const extraHits = l8(e, t, a, d.length);
  let triggered = false;
  const lotusEvent = +e.id === 336 && e.ev && typeof F5 === "function"
    ? F5(e).find(event => +event.sid === 382) : null;
  const snowEvent = +e.id === 337 && e.ev && typeof F5 === "function"
    ? F5(e).find(event => +event.sid === 338) : null;
  if (snowEvent) e = Object.assign({}, e, { snowTrailHandled: true });
  if (lotusEvent) e = Object.assign({}, e, { impactLotusHandled: true });
  if (+e.id === 339) e = Object.assign({}, e, { impactVisualTargets: new Set() });
  if (+e.id === 1081) e = Object.assign({}, e, { visualAnchor: { x: t.x, y: t.y - 14 } });
  queueSkillContact(v, t, e, (target) => {
    const damage = hs(e, target);
    Ls(damage, e);
    if (+e.id === 339 && damage > 0) showNhiepHonImpact(target, e);
    if (e.ev && !triggered) {
      triggered = true;
      const live = _1();
      tD(e, target, live, [target].concat(e.geo ? nD(e, target, live) : []));
    }
  }, {
    maxTargets: e.geo && (e.geo.pierce || e.geo.k === "self" || e.geo.k === "spot") ? Infinity : Math.max(1, (e.geo && e.geo.n) || e.targets || d.length),
    maxHits: target => +e.id === 368 ? 3 : target === t ? 1 + extraHits : 1,
    onImpact: lotusEvent ? (_target, position) => {
      const lotusSkill = Object.assign({}, e, {
        parts: S5(e, lotusEvent), stun: lotusEvent.stun || 0, useAR: false, ev2: true, crit: 0,
      });
      spawnLotusImpact(v, position, lotusSkill, target => {
        if (!lotusEvent.chance || Math.random() < lotusEvent.chance) Ls(hs(lotusSkill, target), lotusSkill);
      });
    } : undefined,
    afterRelease: snowEvent ? () => {
    const snowSkill = Object.assign({}, e, {
      parts: S5(e, snowEvent), stun: snowEvent.stun || 0, useAR: false, ev2: true, crit: 0,
    });
    spawnSnowTrail(v, t, snowSkill, target => {
      if (!snowEvent.chance || Math.random() < snowEvent.chance) Ls(hs(snowSkill, target), snowSkill);
    }, undefined, ((b0(T[e.id], "missle_speed_v", e.L) || [30])[0] || 30) * K3);
    } : undefined,
  });
  return (
    (v.face = t.x >= v.x ? 1 : -1),
    (v.dir = kn(t.x - v.x, t.y - v.y)),
    (v.act = "at"),
    (v.actT = 0),
    e.id ? G8(e.id) : W3(Jt() && Jt().anim, "at", 0.4),
    Math.max(actorAttackTiming(v, e).cycleSeconds, e.cd || 0)
  );
};

var $d = function (A, n) {
  if ((A.resBrkT > 0 && (A.resBrkT -= n), A.curse)) {
    const r = Rn(A);
    r && r.regen < 0 && (A.hp += r.regen * 2 * n);
  }
  {
    const r = l.clock || 0;
    if (A._lh != null && A.hp < A._lh)
      ((A._lt = r),
        A.hr &&
          Math.random() < 0.3 &&
          (A.atkCd = Math.max(A.atkCd, Math.min(0.6, (A.hr / 100) * 0.4))));
    else if (A.lr && A.hp < A.max && r - (A._lt || 0) > 5) {
      const c = E((A.lr[0] + A.lr[1] * A.L) / (100 * A.L + 100), 0, 0.03);
      c > 0 && (A.hp = Math.min(A.max, A.hp + A.max * c * n));
    }
    A._lh = A.hp;
  }
  if (A.stun > 0) {
    A.stun -= n;
    return;
  }
  A.slowT = Math.max(0, (A.slowT || 0) - n);
  if (A.poison > 0) {
    const before = A.hp;
    A.poison -= n; A.hp -= A.poisonDmg * n;
    showDamageNumber(A, Math.max(0, Math.min(before, before - A.hp)), "poison");
  }
  if (actorActionLocked(A)) { A.moving = false; A.atkCd = Math.max(0, (A.atkCd || 0) - n); return; }
  if (A.home && KD(A, n)) return;
  const e = A.battlefieldMonster && typeof arenaSimulator !== "undefined" && arenaSimulator
    ? arenaSimulator.nearestMonsterTarget(A)
    : A.arenaMonster && typeof combatSandbox !== "undefined" && combatSandbox
    ? combatSandbox.nearestTarget(A) : (typeof om == "function" && om(A)) || v;
  if (!e) { A.moving = false; return; }
  const a = q0(A, e),
    i = A.ranged ? A.reach || 200 : Math.max((A.r + 24) / QA, Math.min(A.reach || 0, 90));
  ((A.face = e.x >= A.x ? 1 : -1),
    (A.dir = kn(e.x - A.x, e.y - A.y)),
    (A.seeT = (A.seeT || 0) - n) <= 0 &&
      ((A.seeT = 0.25), (A.see = a > i + 4 || mt(A.x, A.y, e.x, e.y))),
    (A.moving = a > i || !A.see),
    A.moving && Mw(A, e.x, e.y, A.spd * actorMovementSpeed(A) * n),
    A.home && RD(A),
    (A.atkCd -= n),
    a <= i + 4 &&
      A.see &&
      A.atkCd <= 0 &&
      ((A.atkCd = actorAttackTiming(A, { rate: 1 / Math.max(.01, A.cd || 1), phys: true }).cycleSeconds),
      queueSkillContact(A, e, { rate: 1 / Math.max(.01, A.cd || 1), phys: true, melee: !A.ranged, rad: A.reach || 90, parts: { phys: 1 } },
        target => target === v ? U9(A) : target.battlefieldMonster && typeof arenaSimulator !== "undefined" && arenaSimulator
          ? arenaSimulator.receiveSoldierHit(target,A) : target.arenaSim && typeof arenaSimulator !== "undefined" && arenaSimulator
          ? arenaSimulator.receiveMonsterHit(target, A) : hB(target, A),
        { maxTargets: 1, targets: () => [e].filter(target =>
          (!A.battlefieldMonster || arenaSimulator.battlefield.canHit(A,target)) &&
          (target === v ? l.life > 0 : (target.arenaSim || target.battlefieldMonster)
            ? l.enemies.includes(target) && !target.dead && target.hp > 0 : (l.allies || []).includes(target))), visual: () => {} }),
      (A.act = "at"),
      (A.actT = 0),
      W3(A.animKey || r0[A.tid].anim, "at", 0.35)));
};
