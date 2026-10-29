// gameplay/equipment — shared IIFE scope; order is defined in modules.json.
var Wi = 999;

var Y7 = (s) => o.inv.length < INV_MAX || o.inv.some((A) => A.ktc && A.ktc.k === s && A.ktc.c < Wi);

var G1 = ["vlmt", "ttk", "rngua"];

var F7 = (s) => o.inv.reduce((A, n) => A + (n.ktc && n.ktc.k === s ? n.ktc.c : 0), 0);

var ts = { ldp: "ldp", dgt: "dgt", dtbk: "dtbk", mt90: "bk90", mt120: "bk120", mt150: "bk150", ldt: "ldt", rngua: "rngua" };

var E4 = (s) => F7(s) + (ts[s] ? N("misc", ts[s]) : s === "vlmt" || s === "ttk" ? N("misc", s) : 0);

var Ba = (s, A) => {
  const n = J0.find((t) => t.k === s);
  return n && n.knb ? _2(n.knb * A, () => u6(s, A), "KTC " + s) : u6(s, A);
};

var g6 = (s, A) => {
  if (!G1.includes(s.k) && !ts[s.k]) return "";
  const n = E4(s.k);
  return `<button class="${A}" data-ktcuse="${s.k}" ${es(s) && n > 0 ? "" : "disabled"} title="${n > 0 ? `Dùng 1 (đang có ${n})` : "Chưa có, bấm Mua trước"}">Dùng</button>`;
};

var m6 = () => "";

var V7 = (s) => _2(Math.min(Math.floor(+s || 0), o.knb | 0), () => E7(s), "doi KNB ra luong");

var S4 = () => _2(r1[o.invX | 0] || 0, S7, "mo rong hanh trang");

var es = (s) => !s.vio || y0();

var w6 = (s) => (s.knb ? `${s.knb} KNB` : q(s.gold));

var ie = (s, A = 1) =>
  (s.knb ? (o.knb || 0) >= s.knb * A : o.gold >= s.gold * A) &&
  (s.k !== "knb" || Ji().n + A <= q7) &&
  (s.k !== "ldt" || C4().n + A <= T4) &&
  (!s.can || s.can());

var oe = { busy: !1, off: !1, t: 0 };

var _t = () => !oe.off && typeof b < "u" && !!b.user;

var U7 = function (A) {
  const n = A < 110 ? E(Math.floor(A / 10) * 10, 10, 90) : A < 119 ? 110 : 119,
    t = S.drop["npcdroprate" + n + ".ini"] || S.drop["npcdroprate.ini"];
  return (t && t.key == null && (t.key = S.drop["npcdroprate" + n + ".ini"] ? n : 0), t);
};

var I4 = function (A, n) {
  const t = n.main,
    e = t.MinItemLevelScale || 20,
    a = t.MaxItemLevelScale || 10,
    i = mp[n.key];
  let r = Math.min(Math.floor(A / a), t.MaxItemLevel || 10),
    c = Math.max(Math.floor(A / e), i || t.MinItemLevel || 1);
  return (
    r < c && ([c, r] = [r, c]),
    E(c + (r > c ? Math.floor(Math.random() * (r - c)) : 0), 1, 10)
  );
};

var as = function (A, n, t) {
  const e = S.items[A];
  if (!e) return null;
  let a = e.list.filter((r) => r.k === n);
  if (!a.length) return null;
  const i = a.filter((r) => k1(r.req));
  return (
    i.length && (a = i),
    a.reduce((r, c) => (Math.abs(c.lvl - t) < Math.abs(r.lvl - t) ? c : r))
  );
};

var X7 = function (A, n, t) {
  const e = Math.abs(A) <= Math.abs(n) ? A : n;
  return Math.round(e + ((e === A ? n : A) - e) * Math.pow(Math.random(), t));
};

var p6 = function (A, n, t, e, a = 0, i = 1) {
  const r = n % 2 === 0 ? 1 : 0,
    c = Math.floor(Math.random() * 100) / (1 + (a * 20) / 100),
    d = S.affix.filter(
      (g) =>
        g.pre === r && (g.s < 0 || g.s === A.s) && g.lvl <= t && (g.w[A.d] || 0) > c && !e.has(g.a),
    );
  if (!d.length) return null;
  const f = C0(d);
  e.add(f.a);
  const h = f.p.map(([g, u]) =>
    g === -1 && u === -1 ? -1 : i > 1 ? X7(g, u, i) : N0(Math.min(g, u), Math.max(g, u)),
  );
  return { a: f.a, p: h, n: f.n, pre: r };
};

var J7 = function (A, n, t = 0, e = 1) {
  const a = [],
    i = new Set();
  for (let r = 0; r < n.length; r++) {
    const c = p6(A, r, n[r], i, t, e);
    if (!c) break;
    a.push(c);
  }
  return a;
};

var D6 = function (A, n = 1) {
  const t =
    Math.random() * 100 -
    (A === "boss" ? 35 : A === "elite" ? 12 : 0) -
    (l.P ? l.P.lucky : 0) * 0.5 -
    Math.min(n, 200) * 0.05;
  return t < 3 ? N0(5, 6) : t < 15 ? N0(3, 4) : t < 50 ? N0(1, 2) : 0;
};

var W7 = function (A) {
  return A >= 1 ? 1 : 0;
};

var _a = function (A, n) {
  const t = S.items[A];
  if (!t) return n;
  const e = t.list.filter((i) => i.k === n);
  if (!e.length || e.some((i) => k1(i.req))) return n;
  const a = [...new Set(t.list.filter((i) => k1(i.req)).map((i) => i.k))];
  return a.length ? C0(a) : n;
};

var _A = function (A, n, t, e, a) {
  const i = as(A, n, t);
  if (!i) return null;
  const r = {
    uid: o.uid++,
    d: A,
    k: n,
    p: i.p,
    n: i.n,
    ic: i.ic || "",
    lvl: i.lvl,
    s: i.s >= 0 ? i.s : a >= 0 && a <= 4 ? a : Dp(),
    base: i.base.map((c) => c.slice()),
    req: i.req.map((c) => c.slice()),
    price: i.price,
  };
  return ((r.mag = J7(r, pp(e, i.lvl), l.P ? l.P.lucky : 0, wp)), (r.r = W7(r.mag.length)), r);
};

var P6 = function (A) {
  const n = U7(A.L),
    t = n.items.filter((c) => c[0] === 0 && c[1] <= 9),
    e = A.tr ? E(A.tr / 2, 0.5, 2) : 1,
    a = ss(),
    i =
      A.cls === "boss"
        ? 3 + (Math.random() < a - 1 ? 1 : 0) + (A.tr > 8 ? Math.floor((A.tr - 8) / 8) : 0)
        : A.cls === "elite"
          ? Math.random() < 0.5 * a * e
            ? 1
            : 0
          : Math.random() < Pp * a * $3(A) * e
            ? 1
            : 0,
    r = [];
  for (let c = 0; c < i * (A.bonusDrop || 1); c++) {
    const d = fa(t, (w) => w[3]);
    if (!d) continue;
    let [f, h] = [d[1], d[2]];
    const g = I[o.fac];
    (f <= 1 && g && !g.novice && Math.random() < gp && ([f, h] = w5()), (h = _a(f, h)));
    let u = _A(f, h, I4(A.L, n), D6(A.cls, A.L), A.series);
    for (let w = 0; u && !mn(u) && w < 6; w++) u = _A(f, h, I4(A.L, n), D6(A.cls, A.L), A.series);
    u && mn(u) && r.push(u);
  }
  if (
    typeof y0 == "function" &&
    y0() &&
    Math.random() < (C6[A.cls] ?? C6.normal) * a * $3(A) * (A.bonusDrop || 1)
  ) {
    const c = t.filter((h) => vn.includes(h[1])),
      d = c.length ? fa(c, (h) => h[3]) : null,
      f = d && _A(d[1], d[2], I4(A.L, n), N0(0, 2), A.series);
    f && r.push(f);
  }
  return r;
};

var v6 = function (A) {
  A = Math.max(1, A | 0);
  const t = [
      [10, 40, 0],
      [20, 120, 10],
      [30, 240, 20],
      [40, 360, 30],
      [50, 480, 40],
      [60, 600, 50],
      [70, 720, 60],
      [80, 800, 70],
      [90, 900, 80],
      [100, 1e3, 90],
    ].find((a) => A <= a[0]),
    e = t ? t[1] + 5 * (A - t[2]) : 1e3 + 5 * (A - 90);
  return Math.floor(A < 50 ? e : e * 1.5);
};

var Z7 = function (A) {
  let n = 0;
  for (let e = 0; e < (vp[A.cls] || 1); e++) Math.random() < O6 && (n += E6(A));
  return Math.round(n);
};

var b6 = function (A) {
  let n = 0;
  for (const [t, e, a] of A.base || []) (t === 28 || t === 29 || t === 30) && (n += (e + a) / 2);
  return n;
};

var Ap = function (A) {
  const n = A.d + ":" + A.k;
  if (j4[n] !== void 0) return j4[n];
  const t = S.items[A.d];
  let e = 0;
  if (t) for (const a of t.list) a.k === A.k && (e = Math.max(e, b6(a)));
  return (j4[n] = e);
};

var np = function (A) {
  let n = 0;
  for (const e of (A.mag || []).concat(A.ext || [])) {
    const a = sA(e.a);
    if (typeof gn < "u" && gn.has(a)) continue;
    const i = e3[e.a],
      r = Math.abs((e.p || [])[0] || 0);
    n += i ? Math.min(1.5, r / i) : 0.3;
  }
  const t = Ap(A);
  return (t > 0 && (n += (b6(A) / t) * ua(A)), n);
};

var x0 = function (A) {
  if (A.pack || A.ktc) return 1;
  if (A.d === 10) return Math.round(((A.price || 100) / 10) * (1 + (A.mag || []).length * 0.8));
  const n = A.set ? (A.set.kind === "platina" ? 2 * (1 + 0.3 * (A.plv || 0)) : 1) : A.vio ? 1.5 : 1;
  return Math.max(1, Math.round(bp * Math.pow(np(A) + 0.05, yp) * n * (1 + 0.15 * (A.enh || 0))));
};

var K0 = function (A) {
  let n = A.lvl * 10;
  for (const [t, e, a] of A.base) (t === 28 || t === 29 || t === 30) && (n += (e + a) / 2);
  for (const t of A.mag.concat(A.ext || [])) {
    const e = sA(t.a);
    (typeof gn < "u" && gn.has(e)) || (n += 15 + Math.min(200, Math.abs(t.p[0])) * 0.6);
  }
  return n * ua(A);
};

var JA = function (A) {
  const n = rA[A.d];
  return n === "ring"
    ? o.eq.ring1
      ? o.eq.ring2 && K0(o.eq.ring1) <= K0(o.eq.ring2)
        ? "ring1"
        : "ring2"
      : "ring1"
    : n;
};

var Zi = function (A) {
  const n = sA(A.a),
    t = A.p.map((a) => (a === -1 ? 0 : a));
  let e;
  return (
    (e = i1(n, t).split("<enter>")[0]),
    typeof gn < "u" && gn.has(n) && (e += " · không tác dụng trong game"),
    e
  );
};

var tp = function (A, n) {
  return A === 36
    ? GA() >= n
    : A === 32
      ? c1("str") >= n
      : A === 33
        ? c1("dex") >= n
        : A === 34
          ? c1("vit") >= n
          : A === 35
            ? c1("eng") >= n
            : A === 37
              ? n < 0 || !I[o.fac] || F0() === n
              : A === 38
                ? n < 0 || (o.sex || 0) === n
                : A === 39
                  ? n < 0 || !I[o.fac] || I[o.fac].id === n
                  : A === 46
                    ? v0() >= n
                    : !0;
};

var ep = function (A, n) {
  return A === 37
    ? "Thuộc tính ngũ hành: " + (g0[n] || n)
    : A === 38
      ? "Giới tính: " + (n ? "Nữ" : "Nam")
      : A === 39
        ? "Môn phái: " + ((S.factions.find((t) => t.id === n) || S.factions[n] || {}).n || n)
        : i1(S6[A], [n, 0, 0]);
};

var A3 = function (A) {
  const n = A.set && S.sets[A.set.kind];
  if (n && A.set.kind === "platina") {
    const t = n.find((e) => e.vng === 2 && e.n === A.n);
    if (t) return t;
  }
  return n
    ? n.find((t) => t.grp === A.set.grp && t.d === A.d && t.k === A.k && K1(t.n) === K1(A.n)) ||
        n.find((t) => K1(t.n) === K1(A.n))
    : null;
};

var y6 = function (A, n, t, e) {
  const a = n.p[0];
  if (a == null || a === -1 || sA(n.a) === "allskill_v") return null;
  if (n.ml && typeof V0 < "u" && V0[n.ml]) return V0[n.ml].p[0];
  if (A.set) {
    const r = A3(A);
    if (r && r.vng === 2) return e ? null : typeof sd == "function" ? sd(r, t, A.plv) : null;
    const c = r && (e ? r.ext : r.mag)[t],
      d = c != null && S.ge[c];
    return d && d.a === n.a ? d.p[0] : null;
  }
  if (A.d === 10 || A.thanma) return null;
  let i = null;
  for (const r of S.affix)
    if (r.a === n.a && r.pre === n.pre && (r.s < 0 || r.s === A.s) && r.lvl <= (A.lvl || 10)) {
      const [c, d] = r.p[0],
        f = Math.min(c, d),
        h = Math.max(c, d);
      a >= f && a <= h && (!i || r.lvl > i.lvl) && (i = { lvl: r.lvl, r: [f, h] });
    }
  return i && i.r;
};

var ap = function (A) {
  const n = [],
    t = ua(A),
    e = S.items[A.d] && S.items[A.d].list.find((h) => h.k === A.k && h.lvl === A.lvl),
    a = A.d === 10 ? 1 : M5(A),
    i = (h) =>
      a === 1 || sA(h.a) === "allskill_v"
        ? Zi(h)
        : Zi(
            Object.assign({}, h, {
              p: h.p.map((g, u) => (g === -1 || u > 1 ? g : Math.round(g * a))),
            }),
          );
  (A.s >= 0 && A.s < 5 && n.push(["b", "Ngũ hành thuộc tính: " + g0[A.s], w0[A.s]]),
    e && e.d && n.push(["b in", e.d]));
  const r = (h) => (A.d === 10 && typeof ko == "function" ? ko(A, h) : h);
  for (const [h, g, u] of A.base) {
    const w = sA(h);
    if (w === "item_purple" || h === 167 || w === "staminamax_v") continue;
    if (w === "durability_v") {
      n.push(["b", `Độ bền ${u} / ${u}`]);
      continue;
    }
    const x = Math.round(h === 28 || h === 29 ? g * t : r(((g + u) / 2) * t));
    n.push(["b", i1(w, [x, 0, x])]);
  }
  for (const [h, g] of A.req)
    !S6[h] ||
      ((h === 37 || h === 38 || h === 39) && g < 0) ||
      (h !== 37 && h !== 38 && h !== 39 && !(g > 0)) ||
      n.push([tp(h, g) ? "b" : "rq", ep(h, g)]);
  const c = A.d === 10 ? 3 : typeof Dt == "function" ? Dt(A, Dn || o.eq) : 0;
  A.mag.forEach((h, g) => {
    const u = g % 2 === 0 || g >> 1 < c;
    n.push([u ? "m" : "h", i(h) + I6(y6(A, h, g), a)]);
  });
  const d = [];
  if (
    (A.plv != null && A.pv3
      ? d.push([
          "h on",
          `Bạch Kim +${A.plv}/10: dòng thuộc tính tăng theo cấp${(A.plv || 0) < 5 ? " · từ +5 mở 2 dòng Bạch Kim" : ""}`,
        ])
      : A.plv &&
        d.push(["h on", `Bạch Kim +${A.plv}: thuộc tính gốc +${Math.round(A.plv * A4 * 100)}%`]),
    A.enh &&
      d.push([
        "h on",
        `Cường hóa +${A.enh}: thuộc tính gốc +${Math.round((t - 1) * 100)}%, các dòng thuộc tính +${Math.round((a - 1) * 100)}%`,
      ]),
    A.thanma && d.push(["r", "Thần mã: không phạt né tránh, thần lực luôn hiệu lực"]),
    A.d === 10 &&
      typeof W0 == "function" &&
      d.push([
        "h on",
        `Thuần dưỡng cấp ${W0(A)}/${S1}: chỉ số ngựa +${Math.round(W0(A) * _o * 100)}%, phạt né −${Math.min(100, Math.round(W0(A) * Mo * 100))}%`,
      ]),
    Math.floor((A.mag || []).length / 2) && !A.leg && A.d !== 10 && A.s >= 0 && typeof V2 < "u")
  ) {
    const h = +Object.keys(V2).find((w) => V2[w] === A.s),
      g = Y2(A, Dn || o.eq) || JA(A),
      u = typeof x1 == "function" && x1(Dn || o.eq);
    (d.push(["r", `Kích hoạt thuộc tính ẩn:${A.set ? " (đủ bộ tự kích hết)" : ""}`]),
      d.push([u || F0() === h ? "h on" : "h", `  Nhân vật: hệ ${g0[h]}`]));
    for (const w of G5[g] || [])
      d.push([
        u || ((Dn || o.eq)[w] && (Dn || o.eq)[w].s === h) ? "h on" : "h",
        `  ${Wr[w]}: hệ ${g0[h]}`,
      ]);
  }
  if (A.set) {
    const h = typeof Y4 == "function" ? Y4(A, Dn || o.eq) : 0,
      g = (typeof l3 == "function" && l3(Dn || o.eq)[A.set.grp]) || 0;
    ((A.ext || []).forEach((u, w) =>
      d.push([
        w < h ? "m" : "h",
        i(u) +
          I6(y6(A, u, w, !0), a) +
          (w < h
            ? ""
            : A.set.kind === "platina"
              ? " (khi mặc)"
              : ` (mặc ${A.set.n1 * (w + 1)} món cùng bộ)`),
      ]),
    ),
      d.push([
        "r",
        `Bộ ${A.set.kind === "gold" ? "Hoàng Kim" : "Bạch Kim"}: đang mặc ${g} món · đủ ${A.set.n2} món mở hết dòng ẩn mọi trang bị`,
      ]));
    for (const u of zp(A))
      d.push([
        "r",
        `  ${Object.entries(Dn || o.eq).some(([w, x]) => w !== "horse" && x && x.set && ((x.set.grp === A.set.grp && x.set.sid === u.sid) || K1(x.n).toLowerCase() === K1(u.n).toLowerCase())) ? "✔" : "·"} ${u.n}`,
      ]);
  }
  return (d.length && (n.push(["sep", ""]), n.push(...d)), n);
};

var k6 = function (A) {
  if (!A || !A.set) return null;
  const n = K1(A.n),
    t = Hp.find(([e]) => n.startsWith(e));
  return t ? t[0] : A.n.includes("Tống Kim") ? "Tống Kim" : $a(A) >= 0 ? "Môn phái" : "Bộ chung";
};

var N4 = function () {
  if (z4) return z4;
  const A = new Map(),
    n = {};
  for (const e of S.sets.gold) {
    if (typeof cA == "function" && !cA(e)) continue;
    const a = (e.req.find((c) => c[0] === 36) || [0, 0])[1];
    if ((e.req.find((c) => c[0] === 39) || [0, -1])[1] >= 0) {
      n[e.grp] = a >= 120 ? "MP120" : "MP80";
      continue;
    }
    const r = A.get(e.grp) || { names: [], lv: 999 };
    (r.names.push(K1(e.n)), (r.lv = Math.min(r.lv, a)), A.set(e.grp, r));
  }
  const t = [];
  for (const [e, a] of A) {
    const i = a.names.map((h) => h.split(" "));
    let r = 0;
    for (; i.every((h) => h[r] && h[r] === i[0][r]);) r++;
    const c = $p[e] || i[0].slice(0, Math.max(r, 2)).join(" "),
      d = "G:" + c;
    n[e] = d;
    const f = t.find((h) => h.k === d);
    f ? (f.lv = Math.min(f.lv, a.lv)) : t.push({ k: d, n: c, lv: a.lv });
  }
  return (
    t.sort((e, a) => e.lv - a.lv || e.n.localeCompare(a.n)),
    t.push({ k: "MP80", n: "Môn phái", lv: 80 }, { k: "MP120", n: "Môn phái", lv: 120 }),
    (N6 = n),
    (z4 = t),
    t
  );
};

var q_ = function (A) {
  return !A || !A.set
    ? null
    : (N4(),
      N6[A.set.grp] ||
        ($a(A) >= 0
          ? ((A.req || []).find((n) => n[0] === 36) || [0, 0])[1] >= 120
            ? "MP120"
            : "MP80"
          : null));
};

var Ma = function (A) {
  if (!A || !A.set) return !1;
  if (A.lock) return !0;
  const n = o.lootF;
  if (!n || !A.set || A.set.kind !== "gold") return !0;
  const t = ((A.req || []).find((e) => e[0] === 39) || [0, -1])[1];
  return t < 0 ? n.hkBc !== !1 : !Array.isArray(n.hkMp) || n.hkMp.includes(t);
};

var WA = function () {
  const A = o.lootF || (o.lootF = is());
  if (A.v434 !== 1) {
    const n = is();
    for (const t of [
      "thrN",
      "keepSpecial",
      "keepVal",
      "mode",
      "smartUp",
      "custom",
      "minRar",
      "minLvl",
      "groups",
      "series",
      "minMag",
      "slots",
      "wear",
      "accrue",
      "facW",
      "keepRare",
      "setOnly",
      "setMine",
      "pickAll",
    ])
      A[t] = n[t];
    for (const t of ["lm", "sellNow", "v427", "v428", "v430"]) delete A[t];
    A.v434 = 1;
  }
  if (
    (A.v427 !== 1 &&
      ((A.thrN = 2),
      (A.keepSpecial = !0),
      (A.keepVal = 0),
      (A.hkBc = !0),
      (A.hkMp = null),
      (A.v427 = 1)),
    A.setV !== 2)
  ) {
    const n = A.setKeep || [],
      t = N4(),
      e = [];
    (n.includes("Bộ chung") && t.filter((a) => a.k.startsWith("G:")).forEach((a) => e.push(a.k)),
      n.includes("Môn phái") && e.push("MP80", "MP120"),
      (A.setKeep = e),
      (A.setV = 2));
  }
  if (
    (A.mode === void 0 && (A.mode = "smart"),
    A.smartUp === void 0 &&
      ((A.smartUp = A.mode !== "custom"),
      (A.custom = A.mode === "custom"),
      A.mode !== "custom" && (A.keepRare = !0)),
    A.pickAll === void 0 || A.setKeep === void 0 || A.keepRare === void 0 || A.ep === void 0)
  ) {
    const n = is();
    for (const t in n) A[t] === void 0 && (A[t] = n[t]);
    (o.epAuto === !1 && (A.ep.white = !1),
      o.epAutoJ === !1 && (A.ep.jew = !1),
      delete o.epAuto,
      delete o.epAutoJ);
  }
  return A;
};

var sp = function (A) {
  const n = A.groups.join(",");
  return (
    n !== a3 &&
      ((a3 = n),
      (L6 = A.groups.length
        ? new Set(
            A.groups
              .flatMap((t) => (Ha[t] || [0, []])[1])
              .map((t) => ha[t])
              .filter((t) => t !== void 0),
          )
        : null)),
    L6
  );
};

var n3 = function (A) {
  const n = WA().ep;
  return !n ||
    typeof y0 != "function" ||
    !y0() ||
    !A ||
    A.set ||
    A.vio ||
    A.thanma ||
    !(A.d >= 0 && A.d <= 9)
    ? ""
    : n.jew && vn.includes(A.d) && (A.r || 0) <= 2 && !(typeof FA == "function" && FA(A))
      ? "jew"
      : n.white && (A.r || 0) === 0 && !(A.mag || []).length
        ? "white"
        : n.blue &&
            (A.r === 1 || A.r === 2) &&
            (A.mag || []).some((t) => ge(t.a).length && B3(t) >= (n.blueLv || 1))
          ? "blue"
          : "";
};

var x6 = function (A) {
  if (!mn(A)) return !1;
  for (const [t, e] of A.req || [])
    if (
      (t === 36 && e > GA() + 10) ||
      ((t === 37 || t === 39) && e >= 0 && I[o.fac] && (t === 37 ? F0() !== e : I[o.fac].id !== e))
    )
      return !1;
  const n = I[o.fac];
  return !(rA[A.d] === "weapon" && n && !o1(A));
};

var B6 = function (A) {
  if (!A || !o.fac || !(A.d >= 0 && A.d <= 10)) return -1;
  const n =
    Object.values(o.eq)
      .map((e) => (e ? e.uid + "." + (e.enh || 0) + "." + (e.mag || []).length : 0))
      .join(",") +
    "|" +
    o.lvl +
    "|" +
    o.fac;
  if (n !== Q4) {
    ((Q4 = n), (s3 = {}));
    try {
      i3 = Math.max(1, G0(j0(o.eq)));
    } catch {
      i3 = 1;
    }
  }
  if (A.uid in s3) return s3[A.uid];
  let t = -1;
  if (x6(A))
    try {
      const e = Object.assign({}, o.eq);
      ((e[JA(A)] = A), (t = G0(j0(e)) / i3 - 1));
    } catch {
      t = -1;
    }
  return (s3[A.uid] = t);
};

var t3 = function (A) {
  if (!A || !o.fac || !(A.d >= 0 && A.d <= 9)) return null;
  const n = o.eq[JA(A)],
    t = (n && n.enh) || 0;
  if (t <= (A.enh || 0)) return null;
  B6(A);
  const e = Q4 + "#" + A.uid;
  if (e in G4) return G4[e];
  let a = null;
  if (x6(A))
    try {
      const i = Object.assign({}, A, { enh: t }),
        r = Object.assign({}, o.eq);
      r[JA(A)] = i;
      const c = G0(j0(r)) / i3 - 1;
      c > 0.005 && (a = { enh: t, gain: c });
    } catch {
      a = null;
    }
  return (G4[e] = a);
};

var ip = function (A) {
  if (A.lock || A.set) return !0;
  const n =
    o.inv.length +
    ":" +
    o.uid +
    ":" +
    o.lvl +
    ":" +
    Object.values(o.eq)
      .map((e) => e && e.uid + "." + (e.enh || 0))
      .join(",");
  if (n !== q6) {
    ((q6 = n), (o3 = {}));
    for (const e of o.inv)
      if (!e.lock && !e.set && (Fn(e) || K4(e))) {
        const a = JA(e);
        (o3[a] || (o3[a] = [])).push(K0(e));
      }
  }
  const t = K0(A);
  return (o3[JA(A)] || []).filter((e) => e > t).length < Cp;
};

var op = function () {
  const A = l.P && l.P.main,
    n = A && A.id && T[A.id];
  return n ? !!n.phys : null;
};

var rp = function () {
  const A = op(),
    n = I[o.fac] ? F0() : -1,
    t = A + ":" + n;
  if (t !== z6) {
    ((z6 = t), (R4 = new Map()));
    for (const [e, a] of _p)
      (A === !0 && Sp.test(e)) ||
        (A === !1 && Ep.test(e)) ||
        (A === !1 && j6.includes(e) && n >= 0 && e !== j6[n]) ||
        (ha[e] !== void 0 && R4.set(ha[e], +a || 0));
  }
  return R4;
};

var j_ = function (A) {
  const n = rp(),
    t = Ip(A);
  let e = 0;
  for (const a of A.mag || []) {
    const i = n.get(a.a);
    i !== void 0 && ((a.p && a.p[0]) | 0) >= Math.floor(i * t) && e++;
  }
  return e;
};

var mA = function (A) {
  if (typeof tA == "function" && tA(A)) return !0;
  const n = WA();
  if (A.set && !Ma(A)) return !1;
  if ((n.keepRare && Tp(A)) || (n.smartUp && (Fn(A) || K4(A)) && ip(A))) return !0;
  if (
    !n.custom ||
    A.r < n.minRar ||
    A.lvl < n.minLvl ||
    (A.mag || []).length < (n.minMag || 0) ||
    (n.series.length && !n.series.includes(A.s)) ||
    (n.slots.length && !n.slots.includes(rA[A.d]))
  )
    return !1;
  if (n.wear) {
    if (!mn(A)) return !1;
    for (const [e, a] of A.req || [])
      if (
        (e === 36 && a > GA() + 5) ||
        ((e === 37 || e === 39) &&
          a >= 0 &&
          I[o.fac] &&
          (e === 37 ? F0() !== a : I[o.fac].id !== a))
      )
        return !1;
  }
  if (
    (n.accrue && A.s >= 0 && A.d !== 10 && I[o.fac] && !s4(F0(), A.s)) ||
    (n.facW && rA[A.d] === "weapon" && I[o.fac] && !o1(A))
  )
    return !1;
  const t = sp(n);
  return !(t && !A.mag.some((e) => t.has(e.a)));
};

var cp = function (A, n) {
  Object.assign(A, {
    smartUp: !0,
    keepRare: !0,
    pickAll: !0,
    keepSpecial: !0,
    custom: n === "all",
    minRar: n === "all" ? 0 : 1,
    minLvl: 1,
    minMag: 0,
    groups: [],
    series: [],
    slots: [],
    wear: !1,
    facW: !1,
    accrue: !1,
  });
};

var L4 = function () {
  const A = o.lootP || (o.lootP = [null, null, null]);
  for (; A.length < 3;) A.push(null);
  return A;
};

var lp = function (A) {
  const n = WA();
  L4()[A] = JSON.parse(JSON.stringify(n));
};

var _6 = function (A) {
  const { auto: n, pickAll: t } = WA();
  ((o.lootF = Object.assign(is(), JSON.parse(JSON.stringify(A)), { auto: n, pickAll: t })),
    (a3 = null));
};

var q4 = function (A, n) {
  if (l.battlefield || n.battlefieldMonster) return;
  const t = Z(0, Math.PI * 2),
    e = Z(10, 26),
    [a, i] = X0(n.x + Math.cos(t) * e, n.y + Math.sin(t) * e);
  if ((l.ground.push({ it: A, x: a, y: i, age: 0 }), l.ground.length > kp)) {
    let r = l.ground.findIndex((d) => !d.it.set && !d.it.vio && !d.it.plv);
    r < 0 && (r = 0);
    const c = l.ground.splice(r, 1)[0];
    o.gold += x0(c.it);
  }
  (l.quiet || o0(A.d <= 1 ? "dropWeapon" : A.d === 2 || A.d === 7 ? "dropCloth" : "dropOther"),
    A.r >= 2 && !l.quiet && C(`Rơi xuống đất: <span style="color:${_0[A.r]}">${D(A.n)}</span>`));
};

var M6 = function (A, n) {
  let t = null;
  for (const e of o.inv)
    !(e.set && Ma(e)) &&
      !e.vio &&
      !e.plv &&
      !e.lock &&
      !e.thanma &&
      !e.pack &&
      !e.ktc &&
      !tA(e) &&
      (!t || K0(e) < K0(t)) &&
      (t = e);
  return !t || (!n && K0(t) >= K0(A))
    ? !1
    : ((o.gold += x0(t)), o.inv.splice(o.inv.indexOf(t), 1), (R = !0), !0);
};

var dp = function (A) {
  const n = G6();
  if (!n.length) return 0;
  let t = 0;
  for (const e of n) t += x0(e);
  return (
    (o.gold += t),
    (o.inv = o.inv.filter((e) => !n.includes(e))),
    (R = !0),
    !A &&
      !l.quiet &&
      C(
        `<span class="dim">Hành trang đầy: bán ${n.length} món không khớp bộ lọc (+${q(t)} lượng)</span>`,
      ),
    n.length
  );
};

var fp = function () {
  let A = null,
    n = 600;
  for (const t of l.ground) {
    const e = Math.hypot(t.x - v.x, t.y - v.y);
    e < n && ((n = e), (A = t));
  }
  if (!A) {
    k("Không có đồ gần để nhặt");
    return;
  }
  ((l.pickTarget = A), (l.moveTo = null));
};

var H6 = function (A, n) {
  const t = l.ground.indexOf(A);
  return t < 0
    ? !1
    : ((o.inv.length >= INV_MAX || a0().length >= w1) && typeof Xs == "function" && Xs(5),
      o.inv.length >= INV_MAX && WA().pickAll && dp(),
      !(n3(A.it) && WA().ep.dest !== "inv" && !mA(A.it)) &&
      o.inv.length >= INV_MAX &&
      !M6(A.it, typeof tA == "function" && tA(A.it))
        ? (n || k("Hành trang đầy"), !1)
        : (l.ground.splice(t, 1),
          xn(A.it, n, !0, l.pickTarget === A),
          _n("picked"),
          l.pickTarget === A && (l.pickTarget = null),
          !0));
};
