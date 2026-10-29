// core/attributes — shared IIFE scope; order is defined in modules.json.
var F2 = function (A, n, t) {
  const a = b0(n, "physicsenhance_p", t),
    i =
      (1 + ((A.skillBonus[n.id] || 0) + A.seriesSkill + (A.skillEnh || 0)) / 100) * (A.dmgMul || 1),
    r = {};
  if (a) {
    r.phys = ((A.wmin + A.wmax) / 2) * (1 + (a[0] + A.physPct) / 100);
    for (const T0 in A.add) A.add[T0] && (r[T0] = (r[T0] || 0) + A.add[T0]);
  }
  for (const T0 of Q0) {
    const aA = b0(n, Rr[T0], t);
    if (!aA) continue;
    const Xt =
      T0 === "poison"
        ? (aA[0] * (aA[1] || 1)) / Math.max(1, aA[2] || 1)
        : aA[2]
          ? (aA[0] + aA[2]) / 2
          : aA[0];
    r[T0] = (r[T0] || 0) + Xt * (1 + (A.enh[T0] || 0) / 100);
  }
  if (!a && A.magAdd)
    for (const T0 of Q0)
      A.magAdd[T0] && (r[T0] = (r[T0] || 0) + A.magAdd[T0] * (1 + (A.enh[T0] || 0) / 100));
  if (!a && s7) {
    const T0 = 1 + (A.eng || 0) / 500;
    for (const aA in r) r[aA] *= T0;
  }
  if (r.phys) r.phys *= Math.min(1.2, Math.max(1, A.warPhysicalMultiplier || 1));
  if (a) {
    if (r.phys) r.phys *= A.warExternalMultiplier || 1;
    if (A.warExternalCold) r.cold = (r.cold || 0) + A.warExternalCold;
  } else if (A.warInternalAdd) {
    for (const key in A.warInternalAdd) r[key] = (r[key] || 0) + A.warInternalAdd[key];
  }
  let c = 0;
  for (const T0 in r) ((r[T0] *= i), (c += r[T0]));
  const d = (b0(n, "skill_attackradius", t) || [n.radius || 60])[0] || 60,
    f = d * (1 + (A.vision || 0) / 100),
    h = h4[n.id],
    g = h ? i7(h) : null,
    u = h ? (g ? L5(g) : 1) : Cw(n, t, f),
    w = r4(n, t),
    x = n7(n, t),
    p = (b0(n, "skill_cost_v", t) || [0])[0],
    P = A.crit + (b0(n, "deadlystrike_p", t) || [0])[0],
    _ = (b0(n, "attackrating_p", t) || [0])[0] || 0,
    y = (b0(n, "fatallystrike_p", t) || [0])[0] || 0,
    M = (b0(n, "seriesdamage_p", t) || [0])[0],
    B = A.ignoreDef + (b0(n, "ignoredefense_p", t) || [0])[0],
    O = (b0(n, "stun_p", t) || [0])[0],
    G = b0(
      n,
      typeof l < "u" && l.mounted && n.attr.skill_mintimepercastonhorse_v
        ? "skill_mintimepercastonhorse_v"
        : "skill_mintimepercast_v",
      t,
    ),
    j = Math.max(Fw[n.id] || 0, G ? G[0] : 0) / 18,
    rawRate = h ? o7(h) : (n.phys ? A.aspdP ?? A.aspd : A.aspdC ?? A.aspd * 0.9),
    X = Math.min(rawRate, j ? 1 / j : Infinity),
    $0 = (T0) => {
      const aA = b0(n, Rr[T0], t);
      return aA && aA[1] > 0 ? aA[1] / 18 : 0;
    },
    I0 = {
      skLeech: (b0(n, "steallife_p", t) || [0])[0] || 0,
      skMLeech: (b0(n, "stealmana_p", t) || [0])[0] || 0,
      geo: n.tier === 150 && n.form === 7
        ? { k: "self", r: f, pierce: true }
        : n.tier === 150 && n.form === 6
          ? { k: "spot", r: +n.id === 1066 ? 100 : f, pierce: true }
          : h ? g : U2(n) && n.form < 8 ? N5(n, t, f) : null,
      many: h || null,
      id: n.id,
      n: n.n,
      L: t,
      ext: !!a,
      wpn: j1(n) !== null,
      parts: r,
      tot: c,
      rad: f,
      melee: d <= 120,
      targets: u,
      nMis: w,
      ev: x,
      around: n.form === 7,
      cost: h ? p / h[0] : p,
      costLife: i4(n),
      crit: P,
      series5: M,
      ignore: B,
      stun: O,
      fatal: y,
      ar: _ ? Math.max(10, (A.arBase || 0) * (1 + ((A.arPct || 0) + _) / 100)) : 0,
      skAr: _,
      series: n.series >= 0 ? n.series : A.series,
      rate: X,
      rawRate,
      cd: j,
      coldT: $0("cold"),
      poisonT: $0("poison"),
      dps: 0,
      useAR: r7.has(+n.id),
      phys: !!n.phys,
    };
  if (
    ((I0.dps =
      (c - (r.poison || 0) * (1 - J5) + (((r.phys || 0) * P) / 100) * (y5 - 1)) *
      Li(I0) *
      X *
      (I0.melee ? w4 : 1) *
      q5(A)),
    (I0.dps *= 1 + Zw(I0)),
    I0.geo && (I0.geo.k === "fan" || I0.geo.k === "wall") && typeof l8 == "function")
  ) {
    const T0 = typeof o < "u" && o.closeAtk ? 60 : Math.min(f, 300) * 0.8,
      aA = Li(I0),
      Xt = l8(
        I0,
        { r: 21 * (typeof QA < "u" ? QA : 1) },
        T0,
        Math.max(1, Math.round(1 + (Math.min(4, I0.targets) - 1) * 0.55)),
      );
    Xt > 0 && (I0.dps *= (aA + Xt) / aA);
  }
  return I0;
};

var Ow = function (A) {
  const t = { phys: ((A.wmin + A.wmax) / 2) * (1 + A.physPct / 100) * A.physStat };
  for (const a in A.add) A.add[a] && (t[a] = A.add[a]);
  t.phys *= Math.min(1.2, Math.max(1, A.warPhysicalMultiplier || 1));
  t.phys *= A.warExternalMultiplier || 1;
  if (A.warExternalCold) t.cold = (t.cold || 0) + A.warExternalCold;
  let e = 0;
  for (const a in t) ((t[a] *= A.dmgMul || 1), (e += t[a]));
  return {
    id: 0,
    n: "Đánh thường",
    basic: !0,
    ext: !0,
    L: 1,
    parts: t,
    tot: e,
    rad: A.ranged ? 320 : [2, 3].includes(t4(o.eq)) ? 100 : 75,
    melee: !A.ranged,
    targets: 1,
    cost: 0,
    crit: A.crit,
    series5: 0,
    ignore: A.ignoreDef,
    stun: 0,
    series: A.series,
    rate: A.aspd,
    dps: e * A.aspd * (A.ranged ? 1 : w4) * q5(A),
    useAR: 1,
    phys: !0,
  };
};

var q5 = function (A) {
  if (!A || !A.anti) return 1;
  const n = Q0.reduce((t, e) => t + (A.anti[e] || 0), 0) / Q0.length;
  return (1 + ((A.heavy || 0) / 100) * 0.5) * (1 + (Math.min(n, 35) / 100) * 0.6);
};

var Ew = function (A) {
  let n = 0;
  for (const t of S.potions)
    t.kind === "mana" &&
      A >= (be[t.tier] || 999) &&
      (n = Math.max(n, t.total / Math.max(1, t.dur)));
  return n;
};

var E_ = function (A) {
  if (!A || A.d > 1) return 1;
  const n = A.d + ":" + A.k;
  if (!(n in Gi)) {
    const t = as(A.d, A.k, 1);
    Gi[n] = t ? Math.max(1, Da(t)) : 0;
  }
  return Gi[n] ? E(Da(A) / Gi[n], 1, 20) : 1;
};

var p0 = function (A) {
  if (!mn(A)) return !1;
  for (const [n, t] of A.req || [])
    if (
      (n === 36 && GA() < t) ||
      (n === 32 && c1("str") < t) ||
      (n === 33 && c1("dex") < t) ||
      (n === 34 && c1("vit") < t) ||
      (n === 35 && c1("eng") < t) ||
      (n === 37 && t >= 0 && I[o.fac] && F0() !== t) ||
      (n === 39 && t >= 0 && I[o.fac] && I[o.fac].id !== t)
    )
      return !1;
  return !0;
};

var c1 = function (A) {
  return O5()[A] + o.attr[A];
};

var G0 = function (A) {
  const n = o.lvl,
    t = 8 + 3.2 * n,
    e = 30 + 9 * n,
    a = o.mainLock ? A.main : A.bestAuto || A.main,
    i = a.useAR ? Pe(a.ar || A.ar, t, a.ignore) / 100 : 1,
    r = 1 - Pe(e, A.def) / 100,
    c = Q0.reduce((g, u) => g + A.res[u], 0) / Q0.length,
    d = (g) => (g ? g.reduce((u, w) => u + (w || 0), 0) / 5 : 0),
    f = a.dps * i * (1 + d(A.me2) / 100) * (1 + ((A.hurtP || 0) / 100) * 0.15),
    h =
      // Battlefield builds have finite mana. Count only the MP the shield can
      // spend before HP runs out; a large MP pool without a shield adds no HP.
      (A.life + (o.battlefieldBuild ? Math.min(A.mana || 0,
        A.life * Math.min(0.9, (A.manaShield || 0) / 100) /
        Math.max(0.1, 1 - Math.min(0.9, (A.manaShield || 0) / 100))) : 0)) /
      Math.max(0.2, 1 - c / 100) /
      Math.max(0.2, 1 - d(A.from) / 100) /
      Math.max(0.3, 1 - r) /
      (1 - (A.block || 0) / 100) /
      (1 - (A.sorb || 0) / 100) /
      (1 - Math.min(Jr, (A.dmgShield || 0) / (o.lvl * 3 + 30)));
  return Math.pow(Math.max(1, f), V5) * Math.pow(Math.max(1, h), 1 - V5) * (1 + Sw(A));
};

var Sw = function (A) {
  const n =
    (A.stunRed || 0) * 0.0012 +
    (A.freezeRed || 0) * 0.0012 +
    (A.poisonRed || 0) * 0.001 +
    (A.antiStun || 0) * 0.0012 +
    (A.leech || 0) * 0.008 +
    (A.manaLeech || 0) * 0.003 +
    (A.dmg2mana || 0) * 0.002 +
    Math.min(0.06, (((A.regen || 0) * 2) / Math.max(1, A.life)) * 3) +
    Math.min(0.03, ((A.manaRegen || 0) * 2) / Math.max(1, A.mana || 1)) +
    (A.lucky || 0) * 0.0015 +
    Math.max(0, (A.speedFoot || 1) - 1) * 0.08 +
    (A.hitRec || 0) * 8e-4;
  return Math.min(0.25, Math.max(0, n));
};

var Iw = function (A) {
  const n = I[o.fac] && l7[o.fac];
  if (!n) return A;
  const t = Math.max(xt[0], Math.min(xt[xt.length - 1], o.lvl | 0));
  let e = 0;
  for (; e < xt.length - 2 && t > xt[e + 1];) e++;
  const a = (t - xt[e]) / (xt[e + 1] - xt[e]),
    i = (r, c) => Math.log(r[c]) * (1 - a) + Math.log(r[c + 1]) * a;
  return A * Math.exp(i(c7, e) - i(n, e));
};

var Pt = function () {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'autoSkill'})){return 0;}

  const A = I[o.fac];
  if (!A) return 0;
  if (!l.sim) return applySkillRoute(o.skillRoute);
  const n = l.buffAssume;
  ((l.buffAssume = !0), (l.ignoreEqt = null));
  try {
    return Nw(A);
  } finally {
    ((l.buffAssume = n), (l.ignoreEqt = null), (l.dirty = !0));
  }
};

var Nw = function (A) {
  let n = 0;
  for (; o.skPts > 0;) {
    const t = G0(j0());
    let e = null,
      a = 0,
      i = -1 / 0;
    for (const r of A.skills) {
      const c = T[r];
      if (!Q1(c) || te(c)) continue;
      const d = o.sk[r] || 0,
        f =
          UA(c) && ![90, 150].includes(c.tier) ? Math.max(Ni(c), Math.min(c.max, GA() + d7 - c.req + 1)) : Ni(c),
        h = Math.max(1, Math.min(20, f - d));
      for (const g of [...new Set([1, Math.min(5, h), h])]) {
        o.sk[r] = d + g;
        const u = (G0(j0()) - t) / g + (UA(c) ? 0 : 1e-6) + c.req * 1e-9;
        (d ? (o.sk[r] = d) : delete o.sk[r], u > i && ((i = u), (e = r), (a = g)));
      }
    }
    if (e == null) break;
    a = Math.min(a, o.skPts);
    if (!l.sim && !unlockSkillBook(e)) break;
    a = Math.min(a, Ni(T[e]) - (o.sk[e] || 0));
    if ([90, 150].includes(T[e].tier)) {
      (Yi(e), m4(T[e]) || n++);
      continue;
    }
    ((o.sk[e] = (o.sk[e] || 0) + a), (o.skPts -= a), (n += a));
  }
  return (n && (l.dirty = !0), n);
};

var Lw = function () {
  return (
    (I[o.fac] &&
      o.inv
        .concat(o.eq.weapon ? [o.eq.weapon] : [])
        .filter(
          (t) =>
            t.d <= 1 &&
            o1(t) &&
            (t.req || []).every(([e, a]) => e !== 36 || GA() >= a) &&
            !(t.req || []).some(([e, a]) => (e === 37 || e === 39) && a >= 0 && !p0(t)),
        )
        .sort((t, e) => Da(e) - Da(t))[0]) ||
    null
  );
};

var vt = function (A) {
  const n = [];
  for (const [t, e] of A.req || [])
    if (t === 36 && GA() < e) n.push(`Cấp ${e} (hiện ${GA()}, thiếu ${e - GA()})`);
    else if (X5[t] && c1(X2[t]) < e) {
      const a = c1(X2[t]);
      n.push(`${X5[t]} ${e} (hiện ${a}, thiếu ${e - a})`);
    } else
      t === 38 && e >= 0 && (o.sex || 0) !== e
        ? n.push(`Chỉ dành cho ${e ? "nữ" : "nam"} (nhân vật của bạn là ${o.sex ? "nữ" : "nam"})`)
        : t === 37 && e >= 0 && I[o.fac] && F0() !== e
          ? n.push(`Chỉ hệ ${g0[e]} (bạn hệ ${g0[F0()]})`)
          : t === 39 &&
            e >= 0 &&
            I[o.fac] &&
            I[o.fac].id !== e &&
            n.push(`Chỉ môn phái ${(S.factions[e] || {}).n || e}`);
  return n;
};

var qw = function (A, n) {
  const t = Object.assign({}, o.eq);
  t[JA(A)] = A;
  const e = j0(o.eq),
    a = ne;
  ne = n ? A : null;
  let i;
  try {
    i = j0(t);
  } finally {
    ne = a;
  }
  const r = G0(e),
    c = G0(i),
    d = (h) => Q0.reduce((g, u) => g + h.res[u], 0) / Q0.length;
  return {
    why: jw(A, t, e, i),
    gain: c / Math.max(1, r) - 1,
    dps: (i.bestAuto || i.main).dps / Math.max(1, (e.bestAuto || e.main).dps) - 1,
    life: i.life - e.life,
    def: i.def - e.def,
    res: d(i) - d(e),
    ar: i.ar - e.ar,
  };
};

var jw = function (A, n, t, e) {
  const a = o.eq,
    i = JA(A),
    r = [],
    c = a[i];
  for (const d in a) {
    const f = a[d];
    if (!f || d === i || (f.mag || []).length < 2) continue;
    const h = Dt(f, a),
      g = Dt(f, n),
      u = Math.floor(f.mag.length / 2);
    g !== h &&
      r.push(
        `${Wr[d]} ${g > h ? "mở thêm" : "đóng bớt"} ${Math.abs(g - h)} dòng ẩn (${g}/${u}) do tương sinh hệ ${g0[A.s] || "—"}`,
      );
  }
  if ((A.mag || []).length > 1 && A.d !== 10) {
    const d = Dt(A, n),
      f = Math.floor(A.mag.length / 2),
      h = c && (c.mag || []).length > 1 ? Dt(c, a) : null;
    r.push(
      `Món này mở ${d}/${f} dòng ẩn${h !== null ? `, món đang mặc mở ${h}/${Math.floor(c.mag.length / 2)}` : ""}`,
    );
  }
  return (
    x1(n) !== x1(a) &&
      r.push(
        x1(n) ? "Đủ bộ: mở hết dòng ẩn của mọi trang bị" : "Mất đủ bộ: các dòng ẩn bị đóng lại",
      ),
    t.main.id !== e.main.id && r.push(`Chiêu chính đổi: ${t.main.n} → ${e.main.n}`),
    i === "weapon" &&
      r.push(
        `Sát thương vũ khí ${Math.round(t.wmin)}–${Math.round(t.wmax)} → ${Math.round(e.wmin)}–${Math.round(e.wmax)}`,
      ),
    r.length ||
      r.push(
        "Chỉ thay đổi chỉ số thường (phòng thủ, sinh lực, kháng), không đụng tới dòng ẩn hay bộ.",
      ),
    r
  );
};

var bt = function (A) {
  const n = {};
  for (const [t, e] of A.req || []) {
    const a = X2[t];
    a && c1(a) < e && (n[a] = e - c1(a));
  }
  return n;
};

var e4 = function (A = o.attrPts) {
  const n = (i) => ((i.req || []).find((r) => r[0] === 36) || [0, 0])[1],
    t = Object.values(o.eq)
      .filter((i) => i && (i.req || []).some(([r]) => X2[r]))
      .sort((i, r) => n(i) - n(r)),
    e = { str: 0, dex: 0, vit: 0, eng: 0 },
    a = [];
  for (const i of t) {
    const r = {};
    let c = 0;
    for (const [d, f] of i.req) {
      const h = X2[d];
      if (!h) continue;
      const g = f - (c1(h) + e[h]);
      g > 0 && (r[h] = Math.max(r[h] || 0, g));
    }
    for (const d in r) ((e[d] += r[d]), (c += r[d]));
    c && a.push({ it: i, d: r, n: c, lv: n(i) });
  }
  return { list: a, total: Object.values(e).reduce((i, r) => i + r, 0), add: e };
};

var j5 = function () {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'equipmentPotential'}))return 0;

  let A = 0;
  for (const { d: n } of e4().list)
    for (const t in n) {
      const e = Math.min(n[t], o.attrPts);
      e > 0 && ((o.attr[t] += e), (o.attrPts -= e), (A += e));
    }
  return (A && (l.dirty = !0), A);
};

var yt = function () {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'autoPotential'})){return 0;}

  if (!l.sim && selectSkillRoute()) return applyPotentialRoute(o.skillRoute);
  let A = j5();
  const n = Lw();
  if (n) {
    const t = bt(n),
      e = Object.values(t).reduce((a, i) => a + i, 0);
    if (e > 0 && e <= o.attrPts + z2 * U5)
      for (const a in t) {
        const i = Math.min(t[a], o.attrPts);
        ((o.attr[a] += i), (o.attrPts -= i), (A += i));
      }
    n !== o.eq.weapon && p0(n) && typeof J1 == "function" && Z3(n) > 0 && J1(n, !0);
  }
  for (; o.attrPts > 0;) {
    const t = G0(j0());
    let e = "vit",
      a = -1 / 0;
    for (const i of ["str", "dex", "vit", "eng"]) {
      o.attr[i]++;
      const r = G0(j0()) - t;
      (o.attr[i]--, r > a && ((a = r), (e = i)));
    }
    (o.attr[e]++, o.attrPts--, A++);
  }
  return (A && (l.dirty = !0), A);
};

var Q1 = function (A) {
  return (
    (o.skPts > 0 || (m4(A) && !o.sk[A.id])) &&
    W2(A) &&
    (o.sk[A.id] || 0) < Ni(A) &&
    (typeof P4 != "function" || P4(A))
  );
};

var Ni = function (A) {
  return typeof SA == "function" && SA(A.id)
    ? D4(A.id)
    : [90, 150].includes(A.tier)
      ? 1
      : Math.max(0, Math.min(A.max, GA() - A.req + 1));
};

var Li = function (A) {
  const n = Math.min(4, A.targets);
  return A.around ? 1 + (n - 1) * 0.12 : 1 + (n - 1) * 0.55;
};

var zw = function (A) {
  let n = 0;
  for (const t of A.skills) {
    const e = T[t],
      a = e && !e.enemy && e.attr.addphysicsdamage_p;
    if (!a) continue;
    const i = a[19] || a[a.length - 1];
    Array.isArray(i) && i[2] === A.wcode && (n = Math.max(n, i[0]));
  }
  return n;
};

var Qw = function (A, n, t) {
  const e = 10 + A * 0.8,
    a = 60 + A;
  return {
    wmin: e,
    wmax: e * 1.3,
    physPct: zw(n),
    physStat: 1 + (a * t * (n.wcode === 7 ? hw : 1)) / fw / 100,
    add: {},
    enh: {},
    eng: a * (1 - t),
    seriesSkill: 0,
    skillBonus: {},
    crit: 0,
    aspd: 1,
    ignoreDef: 0,
    series: 0,
    spellW: 1,
  };
};

var Gw = function (A) {
  let n = 0;
  for (const t of [0, 1]) {
    const e = F2(Qw(Math.max(10, A.req), A.fac, t), A, 20),
      a = e.tot - (e.parts.poison || 0) * (1 - J5),
      i = e.useAR ? (A.fac.wcode === 7 ? u7 : h7) : 1;
    n = Math.max(n, a * Li(e) * e.rate * (e.melee ? w4 : 1) * i);
  }
  return n;
};

var Kw = function () {
  const A = [];
  for (const n of vA)
    for (const t of n.skills) {
      const e = T[t];
      UA(e) && ((e.fac = n), A.push(e));
    }
  for (const [n, t] of f7) {
    const a = A.filter((c) => c.req >= n && c.req <= t).map((c) => ((c.norm = 1), [c, Gw(c)])),
      i = a.map((c) => c[1]).sort((c, d) => c - d),
      r = i[Math.floor(i.length / 2)] || 1;
    for (const [c, d] of a) c.norm = E(r / Math.max(1, d), 0.35, 3);
  }
};

var S_ = function (A, n) {
  const t = m7[A];
  if (!t || window.NO_FAC_NORM) return 1;
  if (n <= Pa[0]) return t[0];
  for (let e = 1; e < Pa.length; e++)
    if (n <= Pa[e]) {
      const a = (n - Pa[e - 1]) / (Pa[e] - Pa[e - 1]);
      return t[e - 1] + (t[e] - t[e - 1]) * a;
    }
  return t[t.length - 1];
};

var Rw = {
  lifemax_yan_v: "lifemax_v",
  lifemax_yan_p: "lifemax_p",
  manamax_yan_v: "manamax_v",
  allres_yan_p: "allres_p",
  physicsres_yan_p: "physicsres_p",
  poisonres_yan_p: "poisonres_p",
  coldres_yan_p: "coldres_p",
  fireres_yan_p: "fireres_p",
  lightingres_yan_p: "lightingres_p",
  attackspeed_yan_v: "attackspeed_v",
  castspeed_yan_v: "castspeed_v",
  sorbdamage_yan_p: "sorbdamage_p",
  fasthitrecover_yan_v: "fasthitrecover_v",
  anti_allres_yan_p: "anti_allres_p",
  anti_coldres_yan_p: "anti_coldres_p",
  anti_lightingres_yan_p: "anti_lightingres_p",
  manamax_yan_p: "manamax_p",
  anti_poisonres_yan_p: "anti_poisonres_p",
  anti_fireres_yan_p: "anti_fireres_p",
  anti_physicsres_yan_p: "anti_physicsres_p",
  anti_block_rate_buff: "anti_block_rate",
};

var pa = 30;

var kt = { life: 0.03, mana: 0.05 };

var qi = 2;

var z5 = () => (a4() ? 1 + qi : 1);

var a4 = () => typeof o < "u" && o && o.fac && o.lvl < pa && !v0();

var Q5 = 6;

var gn = new Set([
  "indestructible_b",
  "staminareplenish_v",
  "staminamax_v",
  "pk_punish_weaken",
  "durability_v",
  "item_purple",
]);

gn.add("anti_enhancehit_rate");

gn.add("fatallystrikeres_p");

gn.add("returnres_p");

gn.add("melee_returnres_p");
