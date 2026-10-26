// core/item-sets — shared IIFE scope; order is defined in modules.json.
"use strict";

var f5 = document.currentScript;

var A3 = function (A) {
  const n = JX.sets[A.set.kind] || [],
    t = String(A.n).replace(/^\[(Bạch Kim)\]\s*/, "");
  return (
    n.find((e) => e.n === t || e.n === A.n) ||
    n.find((e) => e.grp === A.set.grp && e.d === A.d) ||
    null
  );
};

var xi = function (A) {
  if (!A || !A.set) return !1;
  const n = A3(A);
  return !!n && (!!n.fixed || n.d > 10);
};

var jr = function (A) {
  if (A.fac < 0) {
    const e = (r) => (r.req.find((c) => c[0] === 36) || [0, 0])[1],
      a = A.lv || 0,
      i = (JX.sets.gold || []).filter(
        (r) => fn(r) < 0 && !Mi.has(r.grp) && (typeof cA != "function" || cA(r)),
      );
    for (const r of [i.filter((c) => c.d === A.d && c.k === A.k), i.filter((c) => c.d === A.d)])
      if (r.length) return r.sort((c, d) => Math.abs(e(c) - a) - Math.abs(e(d) - a))[0];
    return null;
  }
  const n = (JX.sets.gold || []).filter((e) => fn(e) === A.fac && q2.has(e.grp));
  if (!n.length) return null;
  const t = n.filter((e) => g5(e.n) === g5(A.n));
  for (const e of [t, n]) {
    const a = e.filter((r) => r.d === A.d && r.k === A.k);
    if (a.length) return a[0];
    const i = e.filter((r) => r.d === A.d);
    if (i.length) return i[0];
  }
  return null;
};

var Aw = function (A) {
  if (!A || !A.set || A.set.kind !== "gold") return !1;
  const n = (A.req || []).find((i) => i[0] === 39),
    t = n ? n[1] : -1;
  if (!Mi.has(A.set.grp)) {
    if (t < 0 || q2.has(A.set.grp)) return !1;
  }
  const e = jr({
    n: A.n,
    d: A.d,
    k: A.k,
    fac: t,
    lv: ((A.req || []).find((i) => i[0] === 36) || [0, 0])[1],
  });
  if (!e) return !1;
  const a = typeof Pn == "function" ? Pn : null;
  return a
    ? ((A.n = e.n),
      (A.s = e.s),
      (A.base = e.base.map((i) => i.slice())),
      (A.req = e.req.map((i) => i.slice())),
      (A.lvl = e.lvl),
      (A.d = e.d),
      (A.k = e.k),
      e.ic ? (A.ic = e.ic) : delete A.ic,
      (A.mag = e.mag.map(a).filter(Boolean)),
      (A.ext = (e.ext || []).map(a).filter(Boolean)),
      (A.set.grp = e.grp),
      (A.set.sid = e.sid),
      (A.set.n1 = e.n1),
      (A.set.n2 = e.n2),
      (window.HKMP_CONV = window.HKMP_CONV || []).push(e.n),
      !0)
    : !1;
};

var nw = function (A) {
  if (!A || !A.set || typeof ZA != "function" || !ZA(A)) return !1;
  const n = (g) => ((g.req || []).find((u) => u[0] === 39) || [0, -1])[1],
    t = (g) => ((g.req || []).find((u) => u[0] === 36) || [0, g.lvl || 0])[1],
    e = n(A),
    a = t(A),
    i = A.set.kind === "platina" || A.r === 5 || A.plv != null,
    r = i
      ? (JX.sets.platina || []).filter((g) => g.vng === 2)
      : (JX.sets.gold || []).filter(
          (g) => typeof cA == "function" && cA(g) && !/Hạn Thời|kỳ hạn/i.test(g.n),
        );
  let c = e;
  if (i && c < 0)
    try {
      c =
        typeof window.GONE_FAC == "number"
          ? window.GONE_FAC
          : typeof o < "u" && o && typeof I < "u" && I[o.fac]
            ? I[o.fac].id
            : -1;
    } catch {
      c = -1;
    }
  const d = r.filter((g) => n(g) === c);
  let f = null;
  for (const g of i
    ? [
        d.filter((u) => u.d === A.d && u.k === A.k),
        d.filter((u) => u.d === A.d),
        r.filter((u) => n(u) < 0 && u.d === A.d),
        r.filter((u) => u.d === A.d),
      ]
    : [
        d.filter((u) => u.d === A.d && u.k === A.k),
        d.filter((u) => u.d === A.d),
        r.filter((u) => n(u) < 0 && u.d === A.d && u.k === A.k),
        r.filter((u) => n(u) < 0 && u.d === A.d),
      ])
    if (g.length) {
      f = g.slice().sort((u, w) => Math.abs(t(u) - a) - Math.abs(t(w) - a))[0];
      break;
    }
  if (!f) return !1;
  const h = JSON.stringify(A);
  if (
    ((A.n = f.n),
    (A.s = f.s),
    (A.base = f.base.map((g) => g.slice())),
    (A.req = f.req.map((g) => g.slice())),
    (A.lvl = f.lvl),
    (A.d = f.d),
    (A.k = f.k),
    (A.price = f.price),
    f.ic ? (A.ic = f.ic) : delete A.ic,
    (A.set.grp = f.grp),
    (A.set.sid = f.sid),
    (A.set.n1 = f.n1),
    (A.set.n2 = f.n2),
    i)
  ) {
    if (
      ((A.set.kind = "platina"),
      (A.r = 5),
      (A.plv = A.plv || 0),
      (A.mf = null),
      (A.ps = null),
      (A.ext = []),
      A.plv >= 5 && typeof m3 == "function")
    ) {
      const g = A.plv;
      ((A.plv = Math.min(9, g)), m3(A), (A.plv = g));
    }
    ((A.pv3 = 1), typeof os == "function" && os(A));
  } else {
    const g = typeof Pn == "function" ? Pn : null;
    if (!g) return (Object.assign(A, JSON.parse(h)), !1);
    ((A.mag = f.mag.map(g).filter(Boolean)), (A.ext = (f.ext || []).map(g).filter(Boolean)));
  }
  if (ZA(A)) {
    for (const g of Object.keys(A)) delete A[g];
    return (Object.assign(A, JSON.parse(h)), !1);
  }
  return ((window.GONE_CONV = window.GONE_CONV || []).push(f.n), !0);
};

var ft = function (A) {
  if (!A || !A.set) return !1;
  let n = Aw(A);
  if (A.vga !== 1) {
    for (const e of (A.mag || []).concat(A.ext || []))
      e && (e.a === 65 || e.a === 70) && (e.a = e.a === 65 ? 66 : 71);
    ((A.vga = 1), (n = !0));
  }
  if (
    (A.set.kind === "platina" && !A.pv3 && typeof rs == "function" && (rs(A), A.pv3 && (n = !0)),
    A.set.kind === "gold")
  ) {
    const e = _i.get(A.n);
    e &&
      e.grp !== A.set.grp &&
      ((A.set.grp = e.grp), (A.set.sid = e.sid), (A.set.n1 = e.n1), (A.set.n2 = e.n2), (n = !0));
  }
  if (A.set.kind === "gold" && u5.has(A.n)) {
    const e = _i.get(A.n),
      a = JX.ge,
      i = (c, d) => {
        const f = a[d];
        if (!f || !c || c.a !== f.a) return !1;
        const [h, g] = f.p[0];
        return h === -1 || (c.p[0] >= Math.min(h, g) && c.p[0] <= Math.max(h, g));
      };
    !(
      (A.mag || []).length === e.mag.length &&
      e.mag.every((c, d) => i(A.mag[d], c)) &&
      JSON.stringify(A.base) === JSON.stringify(e.base)
    ) &&
      typeof Pn == "function" &&
      ((A.base = e.base.map((c) => c.slice())),
      (A.req = e.req.map((c) => c.slice())),
      (A.lvl = e.lvl),
      (A.d = e.d),
      (A.k = e.k),
      e.ic && (A.ic = e.ic),
      (A.mag = e.mag.map(Pn).filter(Boolean)),
      (A.ext = (e.ext || []).map(Pn).filter(Boolean)),
      (A.set.grp = e.grp),
      (A.set.sid = e.sid),
      (A.set.n1 = e.n1),
      (A.set.n2 = e.n2),
      (n = !0));
  }
  nw(A) && (n = !0);
  const t = A3(A);
  if (!t) return n;
  if (A.set.kind === "gold" && typeof Pn == "function") {
    const e = JX.ge,
      a = (i, r) => {
        const c = e[r];
        if (!c || !i || i.a !== c.a) return !1;
        const [d, f] = c.p[0];
        return d === -1 || (i.p[0] >= Math.min(d, f) && i.p[0] <= Math.max(d, f));
      };
    t.mag.every((i) => e[i]) &&
      !((A.mag || []).length === t.mag.length && t.mag.every((i, r) => a(A.mag[r], i))) &&
      ((A.mag = t.mag.map(Pn).filter(Boolean)), (n = !0));
  }
  if (
    (t.s != null &&
      A.s !== t.s &&
      A.n.replace(/^\[[^\]]*\]\s*/, "") === t.n.replace(/^\[[^\]]*\]\s*/, "") &&
      ((A.s = t.s), (n = !0)),
    (A.set.n2 > 0 && A.set.n2 < 99) ||
      ((A.set.n1 = t.n1), (A.set.n2 = t.n2), (A.set.sid = A.set.sid || t.sid), (n = !0)),
    (A.mag || []).length < t.mag.length)
  ) {
    const e = () => 5 + Math.floor(Math.random() * 6);
    ((A.mag = t.mag.map((a) => r3(a, e())).filter(Boolean)),
      (A.ext = (t.ext || []).map((a) => r3(a, e())).filter(Boolean)),
      (n = !0));
  }
  return n;
};

var h5 =
  /^(Hắc thần|Thương Khung Thiên Khởi|Long Tương Chi Lân|Độc Cô Cầu Bại|Thuần Tịnh Chi Giới|Thế Túc Toàn Giới|Thiên Hà Giới|Thiên tử chi giới|Đế hoàng chi giới|Hưng Bang Giới|Trấn Nhạc Giới|Thương Phương Giới|Lãnh Bá Nguyên Mộng|Vũ Liệt Chi)/i;

var tw =
  /^\s*\[|\((\s*mới\s*|kỳ hạn)\)|[ÄĐẫãệđ´óằð]{4}|^Dương Thần|^(Định Quốc Thanh sa Trường sam|An Bang Cúc hoa Thạch chỉ hoàn|An Bang Điền Hoàng thạch ngọc bội)$/;

var Bi = (s) => (
  (s = String(s || "")),
  h5.test(s.replace(/^\[[^\]]*\]\s*/, "")) || tw.test(s.replace(/^\[Bạch Kim\]\s*/, ""))
);

var zr = (s) =>
  !!s &&
  typeof s == "object" &&
  !s.set &&
  (s.d === 3 || s.d === 4 || s.d === 9) &&
  (!!s.vio || s.r === 3);

var Qr = (s) => !!s && typeof s == "object" && s.d === 10 && !!s.vio;

var ew = (s) => !!s && typeof s == "object" && s.vio === !0;

var aw = 5e3;

var sw = (s) =>
  !!s &&
  typeof s == "object" &&
  ["mag", "ext"].some(
    (A) =>
      Array.isArray(s[A]) &&
      s[A].some(
        (n) => n && typeof n == "object" && Array.isArray(n.p) && Math.abs(+n.p[0] || 0) > aw,
      ),
  );

var VA = (s) =>
  zr(s) ||
  Qr(s) ||
  ew(s) ||
  sw(s) ||
  (!!s && typeof s == "object" && !!s.set && s.set.kind !== "platina" && Bi(s.n));

JX.sets.gold && (JX.sets.gold = JX.sets.gold.filter((s) => !Bi(s.n)));

var _i = new Map();

var u5 = new Set();

if (
  (JX.sets.gold &&
    (JX.sets.gold = JX.sets.gold.filter((s) =>
      _i.has(s.n) ? (u5.add(s.n), !1) : (_i.set(s.n, s), !0),
    )),
  JX.sets.platina &&
    (JX.sets.platina = JX.sets.platina.filter(
      (s) => !h5.test(String(s.n || "").replace(/^\[[^\]]*\]\s*/, "")),
    )),
  window.RCP && RCP.shards)
)
  for (const s of Object.keys(RCP.shards)) Bi(s) && delete RCP.shards[s];

(function () {
  const s = JX.sets.gold,
    A = JX.sets.platina,
    n = JX.ge,
    t = (g, u) => (g.req.find((w) => w[0] === u) || [0, -1])[1],
    e = (g) => String(g).replace(/^\[[^\]]*\]\s*/, "");
  let a = 1e5;
  const i = (g, u) => {
      const w = n[g];
      if (!w) return null;
      if (Math.abs(u - 1) < 0.01) return g;
      const x = w.p.map(([p, P]) =>
        p === -1 && P === -1 ? [p, P] : [Math.round(p * u), Math.round(P * u)],
      );
      return ((n[++a] = { a: w.a, p: x }), a);
    },
    r = (g) => g.mag.length && g.mag.every((u) => n[u]),
    c = s.filter(r);
  for (const g of s) {
    if (r(g)) continue;
    const u = t(g, 36),
      w = t(g, 39),
      p =
        c
          .filter((y) => y.d === g.d && t(y, 39) === w && t(y, 36) <= u)
          .sort((y, M) => t(M, 36) - t(y, 36))[0] ||
        c.filter((y) => y.d === g.d).sort((y, M) => t(M, 36) - t(y, 36))[0];
    if (!p) continue;
    const P = 1 + Math.max(0, u - t(p, 36)) / 400,
      _ = g.mag.length ? g.mag : p.mag.map(() => -1);
    ((g.mag = _.map((y, M) => (n[y] ? y : i(p.mag[M % p.mag.length], P))).filter((y) => y != null)),
      (!g.ext || !g.ext.length) && (g.ext = (p.ext || []).map(() => -1)),
      (g.ext = (g.ext || [])
        .map((y, M) => (n[y] ? y : p.ext && p.ext.length ? i(p.ext[M % p.ext.length], P) : null))
        .filter((y) => y != null)),
      (g.fixed = 1));
  }
  const d = new Set(s.filter((g) => g.fixed).map((g) => g.grp));
  for (const g of s) d.has(g.grp) && (g.fixed = 1);
  for (const g of A) d.has(g.grp) && (g.fixed = 1);
  const f = {};
  for (const g of s) (f[g.grp] = f[g.grp] || []).push(g);
  for (const g in f) {
    const u = f[g],
      w = u.find((x) => x.n2 > 0 && x.n2 < 99);
    for (const x of u)
      (x.n2 > 0 && x.n2 < 99) ||
        ((x.n1 = w ? w.n1 : Math.max(2, Math.round(u.length * 0.4))),
        (x.n2 = w ? w.n2 : Math.max(2, Math.round(u.length * 0.7))),
        (x.sid = x.sid || (w && w.sid) || 1));
  }
  const h = {};
  for (const g of s) h[e(g.n)] = g;
  for (const g of A) {
    const u = h[e(g.n)] || (f[g.grp] || []).find((w) => w.d === g.d);
    if (
      (u &&
        (!g.mag.length || !g.mag.every((w) => n[w])) &&
        ((g.mag = u.mag.map((w) => i(w, 1.15)).filter((w) => w != null)),
        (!g.ext || !g.ext.length || !g.ext.every((w) => n[w])) &&
          (g.ext = (u.ext || []).map((w) => i(w, 1.15)).filter((w) => w != null)),
        (g.fixed = 1)),
      !(g.n2 > 0 && g.n2 < 99))
    ) {
      const w = (f[g.grp] || [])[0];
      ((g.n1 = w ? w.n1 : 3), (g.n2 = w ? w.n2 : 5), (g.sid = g.sid || (w && w.sid) || 1));
    }
  }
})();

var q2 = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28,
]);

var fn = (s) => (s.req.find((A) => A[0] === 39) || [0, -1])[1];

var Mi = new Set([39, 41, 42, 45, 46, 52]);

var Gr = (s) => !Mi.has(s.grp) && (fn(s) < 0 || q2.has(s.grp));

var g5 = (s) =>
  String(s || "")
    .replace(/^\[[^\]]*\]\s*/, "")
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
