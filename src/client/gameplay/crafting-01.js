// gameplay/crafting — shared IIFE scope; order is defined in modules.json.
var r3 = function (A, n) {
  const t = S.ge[A];
  return t
    ? {
        a: t.a,
        p: t.p.map(([e, a]) => (e === -1 && a === -1 ? -1 : Math.round(e + ((a - e) * n) / 10))),
        pre: 1,
      }
    : null;
};

var Pn = function (A) {
  const n = S.ge[A];
  return n
    ? {
        a: n.a,
        p: n.p.map(([t, e]) =>
          t === -1 && e === -1
            ? -1
            : Math.min(t, e) + Math.floor(Math.random() * (Math.abs(e - t) + 1)),
        ),
        pre: 1,
      }
    : null;
};

var Ta = function (A, n, t) {
  const e = Math.min(6, t | 0),
    a = () => E(Math.round(e + (10 - e) * Math.pow(Math.random(), Vp)), 0, 10),
    i = {
      uid: o.uid++,
      d: n.d,
      k: n.k,
      n: A === "platina" ? Y6(n.n) : n.n,
      ic: n.ic || "",
      lvl: n.lvl,
      s: n.s,
      price: n.price,
      base: n.base.map((c) => c.slice()),
      req: n.req.map((c) => c.slice()),
      r: A === "gold" ? 4 : 5,
      set: { kind: A, grp: n.grp, n1: n.n1 || 99, n2: n.n2 || 99, sid: n.sid },
    },
    r = A === "gold" ? Pn : (c) => r3(c, a());
  return ((i.mag = n.mag.map(r).filter(Boolean)), (i.ext = n.ext.map(r).filter(Boolean)), i);
};

var c3 = function (A, n) {
  const t = F6(A);
  if (F4() < 3) return t === "Bộ chung" || t === "Môn phái";
  const e = Kp[t];
  return !e || (n >= e[0] && n < e[1]);
};

var jp = function (A) {
  const n =
    (A.cls === "boss"
      ? 0.02 + DA(Math.min(o.stage, d0)) * 0.0015
      : A.cls === "elite"
        ? 0.003
        : 15e-5 * $3(A)) *
    ss() *
    Ca("drop") *
    Up;
  if (Math.random() >= n) return null;
  const t = "gold",
    e = Math.max(o.lvl, A.L) + 10,
    a = I[o.fac] ? I[o.fac].id : -1,
    i = (f, h) => (f.req.find((g) => g[0] === h) || [0, -1])[1],
    r = Math.max(o.lvl, A.L);
  let c = S.sets[t].filter((f) => i(f, 36) <= e && k1(f.req) && cA(f) && c3(f, r));
  if (t === "gold") {
    const f = (w) => i(w, 39) >= 0 || i(w, 36) >= 90,
      h = c.filter(f),
      g = c.filter((w) => !f(w)),
      u = A.cls === "boss" ? V4.boss : A.cls === "elite" ? V4.elite : V4.normal;
    c = h.length && (!g.length || Math.random() < u) ? h : g;
  }
  if (t === "gold") {
    const f = c.filter((g) => i(g, 39) >= 0),
      h = c.filter((g) => i(g, 39) < 0);
    c = f.length && (!h.length || Math.random() < Jp) ? f : h;
  }
  const d = c.filter((f) => i(f, 39) === a);
  return (
    d.length && Math.random() < Xp && (c = d),
    c.length ? Ta(t, C0(c), l.P ? Math.min(10, Math.floor(l.P.lucky / 10)) : 0) : null
  );
};

var l3 = function (A) {
  const n = {};
  for (const t in A) {
    const e = A[t];
    !e ||
      !e.set ||
      t === "horse" ||
      (t === "ring1" &&
        A.ring2 &&
        A.ring2.set &&
        A.ring2.set.grp === e.set.grp &&
        A.ring2.set.sid === e.set.sid) ||
      (n[e.set.grp] = (n[e.set.grp] || 0) + 1);
  }
  return n;
};

var x1 = function (A) {
  const n = l3(A);
  for (const t in A) {
    const e = A[t];
    if (e && e.set && n[e.set.grp] >= e.set.n2) return !0;
  }
  return !1;
};

var Y4 = function (A, n) {
  const t = Y2(A, n);
  return t
    ? A.set.kind === "platina"
      ? (A.ext || []).length
      : t === "horse" || x1(n)
        ? R6
        : Math.min(R6, Math.floor((l3(n)[A.set.grp] || 0) / Math.max(1, A.set.n1)))
    : 0;
};

var zp = function (A) {
  const n = new Set();
  return S.sets[A.set.kind].filter(
    (t) => t.grp === A.set.grp && !/Hạn Thời/i.test(t.n) && !n.has(t.n) && n.add(t.n),
  );
};

var K6 = { 65: 66, 70: 71 };

for (const s in S.ge) {
  const A = S.ge[s];
  if (A && K6[A.a] != null && !A.afx && ((A.a = K6[A.a]), (A.afx = 1), typeof e3 < "u")) {
    const n = Math.max(Math.abs(A.p[0][0] || 0), Math.abs(A.p[0][1] || 0));
    n > 1 && (e3[A.a] = Math.max(e3[A.a] || 0, n));
  }
}

var R6 = 2;

var Qp = "[Bạch Kim] ";

var K1 = (s) => String(s || "").replace(/^\[[^\]]*\]\s*/, "");

var Y6 = (s) => (/^\[/.test(s) ? s : Qp + s);

var K_ = {
  1: {
    n: "Phiên bản 1 · Sơ khai",
    d: "Hoàng Kim chung (An Bang, Định Quốc, Hiệp Cốt, Nhu Tình, Kim Phong, Thiên Hoàng, Động Sát…) và Hoàng Kim môn phái. Không có đồ Tím, không có Bạch Kim.",
  },
  2: {
    n: "Phiên bản 2 · Đồ Tím",
    d: "Như phiên bản 1, thêm hệ thống đồ Tím: Huyền Tinh, khoáng thạch rơi ra; hợp, khảm, tách đồ Tím.",
  },
  3: {
    n: "Phiên bản 3 · Lộ trình Hoàng Kim",
    d: "Như phiên bản 2, đồ Hoàng Kim rơi theo lộ trình cấp của JX1: Thanh Câu (50) → Vân Lộc (80) → Thương Lang (100) → Tử Mãng, Kim Ô, Bạch Hổ, Xích Lân, Minh Phượng, Huyền Viên, Tinh Sương, Tống Kim (120) → Đằng Long (180); thêm Bạch Kim.",
  },
};

var F4 = () => 3;

var y0 = () => F4() >= 2;

var d3 = () => !0;

var Gp = { drop: 0.05, shard: 0.15, grant: 0.1 };

var Ca = (s) => (F4() >= 3 ? Gp[s] : 1);

var Kp = {
  "Thanh Câu": [50, 80],
  "Vân Lộc": [80, 100],
  "Thương Lang": [100, 120],
  "Tử Mãng": [120, 180],
  "Kim Ô": [120, 180],
  "Bạch Hổ": [120, 180],
  "Xích Lân": [120, 180],
  "Minh Phượng": [120, 180],
  "Huyền Viên": [120, 180],
  "Tinh Sương": [120, 180],
  "Tống Kim": [120, 999],
  "Đằng Long": [180, 999],
};

var F6 = (s) => s.fam || (s.fam = k6({ set: 1, n: s.n, req: s.req }));

var V6 = ["Bộ chung", "Môn phái"];

var cA = (s) => {
  const A = (s.req.find((n) => n[0] === 39) || [0, -1])[1];
  return (
    s.d <= 10 &&
    s.mag.length > 0 &&
    !s.fixed &&
    (A < 0 || vA.some((n) => n.id === A)) &&
    V6.includes(F6(s)) &&
    (typeof Gr != "function" || Gr(s))
  );
};

var Rp = (s) => String(s || "").replace(/^(\[[^\]]*\]\s*)+/, "");

var Yp = (s) =>
  !!(
    s.set &&
    s.set.kind === "platina" &&
    typeof F1 < "u" &&
    (F1.has(Rp(s.n)) || S.sets.platina.some((A) => A.n === s.n && A.d === s.d && A.k === s.k && !A.fixed && A.d <= 9))
  );

var U6 = null;

var Fp = (s) => (U6 || (U6 = new Set(S.sets.gold.filter((A) => cA(A)).map((A) => A.n)))).has(s);

var ZA = (s) =>
  !!s &&
  (s.r === 5 || s.plv != null || (s.set && s.set.kind === "platina")
    ? !Yp(s)
    : !!(s.set && (!V6.includes(k6(s)) || !Fp(s.n))));

var f3 = (s) => {
  if (!s || typeof s != "object" || !s.set) return typeof VA == "function" && VA(s);
  let A;
  try {
    ((A = JSON.parse(JSON.stringify(s))), typeof ft == "function" && ft(A));
  } catch {
    A = s;
  }
  return (typeof VA == "function" && VA(A)) || ZA(A);
};

var Vp = 2.5;

var Up = 0.2;

var Xp = 0;

var Jp = 0.05;

var Wp = 0.05;

var Zp = 0.1;

var V4 = { boss: 0.25, elite: 0.12, normal: 0.06 };

var U = function (A, n, t = 1) {
  const e = S0()[A];
  ((e[n] = (e[n] || 0) + t), e[n] <= 0 && delete e[n]);
};

var A9 = function (A, n) {
  let t = n8[A],
    e = n8[n];
  if (t == null || e == null) return 1;
  t > e && ([t, e] = [e, t]);
  const a = x9[t][e - t];
  return (a ?? 100) / 100;
};

var n9 = function (A, n) {
  const t = p3(A);
  if (!t) return 0;
  const e = (a) => (n && Number.isFinite(n[a]) ? n[a] : 0);
  for (let a = t[0]; a <= t[1]; a++)
    if (V0[a].p.every(([i, r], c) => i < 0 || r < 0 || (i <= e(c) && e(c) <= r))) return a;
  return e(0) > V0[t[1]].p[0][1] ? t[1] : t[0];
};

var t9 = function (A, n, t, e) {
  const a = [];
  if (
    (A.forEach((r, c) => {
      r > 0 &&
        V0[r] &&
        a.push({
          v: (fd(r, n, t) * H9(r, e) * (cd[c] != null ? cd[c] : 100)) / 100,
          a: V0[r].id,
          l: V0[r].lvl,
        });
    }),
    a.length <= 1)
  )
    return a.length ? a[0].v : 0;
  let i = 0;
  for (let r = 0; r < a.length - 1; r++)
    for (let c = r + 1; c < a.length; c++)
      i += ((((a[r].v + a[c].v) * (A9(a[r].a, a[c].a) - 1) * a[r].l) / 10) * a[c].l) / 10;
  return a.reduce((r, c) => r + c.v, i);
};

var U4 = function (A, n, t) {
  const e = w3[t] || 0,
    a = v9[(A.lvl | 0) - 1],
    i = a
      ? (n.some((c) => c > 0 && V0[c] && V0[c].id >= 168 && V0[c].id <= 172) ? a[1] : a[0]) / 100
      : 1,
    r = (ld[A.d + ":" + A.k] != null ? ld[A.d + ":" + A.k] : 100) / 100;
  return e + i * r * t9(n, A.d, A.k, A.s);
};

var Vn = function (A, n, t) {
  const e = n.length,
    a = new Array(e).fill(0);
  if (!(A > 0) || !e) return { sel: -1, probs: a, sum: 0 };
  const i = n.map((u, w) => w).sort((u, w) => n[u] - n[w] || u - w),
    r = i.map((u) => n[u]),
    c = new Array(e).fill(0),
    d = r.findIndex((u) => u > A);
  if (d < 0) c[e - 1] = 1;
  else if (d > 0) {
    const u = d > 1 ? r[d - 1] * P3 + r[d - 2] * (1 - P3) : r[0],
      w = d < e - 1 ? r[d] * v3 + r[d + 1] * (1 - v3) : r[e - 1],
      x = (w - A) / (w - u),
      p = 1 - x;
    (d > 1 ? ((c[d - 1] = x * P3), (c[d - 2] = x * (1 - P3))) : (c[0] = x),
      d < e - 1 ? ((c[d] = p * v3), (c[d + 1] = p * (1 - v3))) : (c[e - 1] = p));
  }
  let f = 0,
    h = -1;
  const g = t ?? re();
  for (let u = 0; u < e; u++)
    ((f += c[u]), h < 0 && f > 0 && g <= f && (h = i[u]), (a[i[u]] = c[u]));
  return { sel: h, probs: a, sum: f };
};

var X6 = function (A, n) {
  const t = [
    [0, 1],
    [0.5, 0.9],
    [1, 0.8],
    [1.5, 0.7],
    [2, 0.6],
  ];
  let e = 0;
  for (let a = t.length - 1; a >= 0; a--) {
    const i = n - A * t[a][0];
    i > 0 && ((e += i * t[a][1]), (n -= i));
  }
  return e;
};

var h3 = function () {
  const A = { wc: 0, mys: 0, fd: 0 };
  if (fe.on) for (const n in A) A[n] = E(fe[n] | 0, 0, k3(n));
  return A;
};

var J6 = function (A) {
  A &&
    (A.wc && U("misc", "wc", -A.wc),
    A.mys && U("misc", "mys", -A.mys),
    A.fd && cc("fd", -A.fd * y3));
};

var A1 = function (A) {
  let n = o.inv.indexOf(A);
  return n >= 0
    ? (o.inv.splice(n, 1), !0)
    : ((n = a0().indexOf(A)), n >= 0 ? (a0().splice(n, 1), !0) : !1);
};

var Oa = function (A) {
  const n = [];
  for (const t of vn) {
    const e = A.find((a) => a.d === t && !n.includes(a));
    if (!e) return [];
    n.push(e);
  }
  return n;
};

var W6 = function (A) {
  return !A || A.length !== 3 || new Set(A).size !== 3 || !A.every(e8)
    ? "Cần 1 nhẫn + 1 dây chuyền + 1 ngọc bội thường (chưa mặc, chưa khóa)"
    : A.map((n) => n.d)
          .sort((n, t) => n - t)
          .join() !== "3,4,9"
      ? "Cần đúng 1 nhẫn + 1 dây chuyền + 1 ngọc bội"
      : "";
};

var u3 = function (A) {
  if (!y0()) return { ok: !1, msg: "Chưa mở" };
  const n = W6(A);
  if (n) return { ok: !1, msg: n };
  if (o.gold < d1()) return { ok: !1, msg: "Không đủ ngân lượng" };
  const t = Vn(
    A.reduce((a, i) => a + md(i), 0),
    pA.slice(1),
  );
  o.gold -= d1();
  for (const a of A) A1(a);
  if (t.sel < 0) return { ok: !1, lost: !0, msg: "Luyện Huyền Tinh thất bại, mất nguyên liệu" };
  const e = t.sel + 1;
  return (U("ht", e), { ok: !0, lvl: e, msg: `Hợp thành Huyền Tinh Khoáng Thạch cấp ${e}` });
};

var Z6 = function (A) {
  return A >= MA
    ? { ok: !1, msg: "Đã tối đa" }
    : N("ht", A) < 3
      ? { ok: !1, msg: "Cần 3 viên cùng cấp" }
      : o.gold < wA.up
        ? { ok: !1, msg: "Không đủ ngân lượng" }
        : ((o.gold -= wA.up),
          re() < ue(A)
            ? (U("ht", A, -3),
              U("ht", A + 1),
              { ok: !0, lvl: A + 1, msg: `Thăng cấp thành công: Huyền Tinh cấp ${A + 1}` })
            : (U("ht", A, -1),
              {
                ok: !1,
                lost: !0,
                msg: `Thăng cấp thất bại (${$t(ue(A))} thành công), mất 1 viên Huyền Tinh`,
              }));
};

var e9 = function (A) {
  const n = IA(A);
  return n.lvl >= Sa
    ? { ok: !1, msg: "Đã tối đa" }
    : N("ore", A) < 3
      ? { ok: !1, msg: "Cần 3 viên cùng loại, cùng cấp" }
      : o.gold < wA.up
        ? { ok: !1, msg: "Không đủ ngân lượng" }
        : ((o.gold -= wA.up),
          re() < ue(n.lvl)
            ? (U("ore", A, -3),
              U("ore", Ia(n.place, n.a, n.lvl + 1, n.s)),
              { ok: !0, msg: `${Mt(A)} lên cấp ${n.lvl + 1}` })
            : (U("ore", A, -1),
              {
                ok: !1,
                lost: !0,
                msg: `Thăng cấp ${Mt(A)} thất bại (${$t(ue(n.lvl))}), mất 1 viên`,
              }));
};

var Ad = function (A, n, t, e) {
  const a = (A.mag || [])[n];
  if (!a) return { err: "Dòng không tồn tại" };
  if (!a8(A, n)) return { err: "Dòng này không lấy được thành đá" };
  const i = D3(a),
    r = V0[i].base + (pA[t] || 0),
    c = r + X6(r, ud(e));
  return Object.assign({ j: i, src: c }, Vn(c, pA.slice(1), 2));
};

var nd = function (A, n, t, e, a) {
  if (!wd(A))
    return {
      ok: !1,
      msg: "Chỉ lấy được đồ thường có dòng (chưa khóa, không phải đồ bộ / Tím / đang mặc)",
    };
  if (!pd(A, n).includes(t)) return { ok: !1, msg: "Chỉ lấy được đúng vị trí dòng trên trang bị" };
  const i = A.mag[n];
  if (!i) return { ok: !1, msg: "Dòng không tồn tại" };
  if (
    ((e =
      e ||
      Object.keys(S0().ht)
        .map(Number)
        .filter((h) => N("ht", h) > 0)
        .sort((h, g) => h - g)[0]),
    !e || N("ht", e) < 1)
  )
    return { ok: !1, msg: "Cần 1 Huyền Tinh Khoáng Thạch" };
  if (o.gold < x3(A)) return { ok: !1, msg: "Không đủ ngân lượng" };
  a = a || h3();
  const r = Ad(A, n, e, a);
  if (r.err) return { ok: !1, msg: r.err };
  const c = Vn(r.src, pA.slice(1));
  if (((o.gold -= x3(A)), U("ht", e, -1), J6(a), A1(A), c.sel < 0))
    return { ok: !1, lost: !0, msg: `Lấy thuộc tính thất bại: ${A.n} mất` };
  const d = c.sel + 1,
    f = Ia(t, i.a, d, t % 2 ? A.s : -1);
  return (
    U("ore", f),
    {
      ok: !0,
      lvl: d,
      msg: `Lấy thuộc tính: ${(ge(i.a)[0] || {}).n || sA(i.a)} → ${Mt(f)} cấp ${d}`,
    }
  );
};

var a9 = function (A) {
  const n = Vn(pA[E(A, 1, MA)], w3.slice(1, s8 + 1));
  return n.sel < 0 ? 1 : n.sel + 1;
};

var td = function (A, n) {
  if (!S9(A))
    return {
      ok: !1,
      msg: "Chỉ chế tạo từ trang bị trắng / xanh (không phải trang sức, chưa khóa, không phải đồ bộ / Tím)",
    };
  if (!n || N("ht", n) < 1) return { ok: !1, msg: "Cần 1 Huyền Tinh Khoáng Thạch" };
  if (o.gold < wA.phoi) return { ok: !1, msg: "Không đủ ngân lượng (10.000)" };
  const t = Vn(pA[n], w3.slice(1, s8 + 1));
  if (((o.gold -= wA.phoi), U("ht", n, -1), t.sel < 0))
    return (
      A1(A),
      (l.dirty = !0),
      {
        ok: !1,
        lost: !0,
        msg: `Chế tạo thất bại (Huyền Tinh cấp ${n} không đủ giá trị): mất ${A.n} và Huyền Tinh`,
      }
    );
  const e = t.sel + 1;
  return (
    (A.mag = []),
    (A.vio = 1),
    (A.r = 3),
    (A.vslots = e),
    delete A.leg,
    (l.dirty = !0),
    { ok: !0, n: e, msg: `Chế tạo phôi Huyền Tinh: ${A.n} · ${e} dòng trống` }
  );
};

var X4 = function (A, n, t) {
  if (!he(A)) return "Món không còn trong hành trang";
  if (!A || A.set || !(A.d >= 0 && A.d <= 9)) return "Món này không khảm được";
  if (!A.vio) return "Phải chế tạo phôi Huyền Tinh (trang bị Tím trống) trước";
  const e = IA(t),
    a = (A.mag || []).length;
  return a >= Y1(A)
    ? `Đã đủ ${Y1(A)} dòng`
    : e.place !== a
      ? `Đá này ứng dòng ${e.place + 1}, món đang cần dòng ${a + 1}`
      : N("ht", n) < 1
        ? "Không có Huyền Tinh cấp này"
        : N("ore", t) < 1
          ? "Không có đá này"
          : p3(e.a)
            ? e.place % 2 && e.s >= 0 && e.s !== A.s
              ? `Đá hệ ${g0[e.s]}, món hệ ${g0[A.s]} (dòng ẩn phải đúng hệ)`
              : cs(e.a, A.d, A.k)
                ? de(e.a, A.s)
                  ? (A.mag || []).some((i) => i.a === e.a)
                    ? `Món đã có dòng ${(ge(e.a)[0] || {}).n || sA(e.a)}`
                    : o.gold < wA.kham
                      ? "Không đủ ngân lượng (10.000)"
                      : ""
                  : `Thuộc tính này không hợp hệ ${g0[A.s] || "—"}`
                : "Thuộc tính này không gắn được vào loại trang bị này"
            : "Đá không hợp lệ";
};

var J4 = function (A, n, t, e) {
  const a = IA(t),
    i = p3(a.a),
    r = hd(A),
    c = Math.max(0, Y1(A) - r.length),
    d = U4(A, r, c),
    f = [],
    h = [];
  for (let P = i[0]; P <= i[1]; P++) (f.push(P), h.push(U4(A, r.concat([P]), c - 1)));
  const g = h.some((P) => d < P) ? h.concat([d]) : h.slice(),
    u = pA[n] + pA[E(a.lvl, 1, Sa)],
    w = d + u + X6(u, ud(e)),
    x = Vn(w, g, 2),
    p = x.probs.slice(0, f.length);
  return {
    js: f,
    vals: g,
    probs: p,
    fail: Math.max(0, 1 - p.reduce((P, _) => P + _, 0)),
    src: w,
    eqVal: d,
  };
};

var s9 = function (A, n, t) {
  return X4(A, n, t) || J4(A, n, t, null);
};

var W4 = function (A, n, t, e) {
  const a = X4(A, n, t);
  if (a) return { ok: !1, msg: a };
  e = e || h3();
  const i = J4(A, n, t, e),
    r = Vn(i.src, i.vals),
    c = IA(t);
  if (
    (U("ht", n, -1), U("ore", t, -1), J6(e), (o.gold -= wA.kham), r.sel < 0 || r.sel >= i.js.length)
  )
    return {
      ok: !1,
      lost: !0,
      msg: `Khảm thất bại (${$t(1 - i.fail)} thành công): mất Huyền Tinh và ${Mt(t)}${gd(e) ? ", phụ liệu" : ""}`,
    };
  const d = i.js[r.sel],
    f = A.mag.length,
    h = (ge(c.a)[0] || {}).n || sA(c.a);
  return (
    A.mag.push({ a: c.a, p: I9(d), n: h, pre: f % 2 === 0 ? 1 : 0, vlv: c.lvl, vs: c.s, ml: d }),
    (A.vio = 1),
    (A.r = 3),
    typeof FA == "function" && o.autoEquip && o.inv.includes(A) && FA(A) && J1(A, !0),
    { ok: !0, msg: `Khảm dòng ${f + 1}: ${h} cấp ${V0[d].lvl}` }
  );
};

var i9 = function (A, n, t, e) {
  const a = X4(A, n, t);
  if (a) return { err: a };
  const i = J4(A, n, t, e === void 0 ? h3() : e);
  let r = -1;
  i.probs.forEach((g, u) => {
    (r < 0 || g > i.probs[r]) && (r = u);
  });
  const c = i.js[r],
    d = A.mag.length,
    f = V0[c],
    h = A.mag.concat([
      {
        a: f.id,
        p: f.p.map(([g, u]) => (g === -1 && u === -1 ? -1 : Math.round((g + u) / 2))),
        pre: d % 2 === 0 ? 1 : 0,
      },
    ]);
  return Object.assign(i, {
    ht: n,
    key: t,
    best: r,
    txt: N9(c),
    gain: typeof Gc == "function" ? Gc(A, h) : 0,
  });
};

var Z4 = function (A, n) {
  if (!Pd(A)) return [];
  const t = A.mag.length,
    e = Object.keys(S0().ht)
      .map(Number)
      .filter((r) => N("ht", r) > 0)
      .sort((r, c) => c - r),
    a = [],
    i = n && N("ht", n) > 0 ? n : e[0];
  if (!i) return [];
  for (const r of Object.keys(S0().ore)) {
    if (IA(r).place !== t) continue;
    const c = i9(A, i, r);
    c.err || a.push(c);
  }
  return a.sort((r, c) => c.gain - r.gain || r.fail - c.fail);
};

var o9 = function (A) {
  let n = 0,
    t = 0;
  for (; Pd(A);) {
    const e = Z4(A)[0];
    if (!e) break;
    const a = W4(A, e.ht, e.key, { wc: 0, mys: 0, fd: 0 });
    if (a.ok) n++;
    else if (a.lost) t++;
    else break;
  }
  return {
    ok: n > 0,
    msg:
      n || t
        ? `Khảm ${n} dòng${t ? `, ${t} lần thất bại` : ""} · ${(A.mag || []).length}/${Y1(A)} dòng`
        : "Không đủ Huyền Tinh / đá hợp dòng kế tiếp",
  };
};

var r9 = function () {
  return { ok: !1, msg: "Lò Rèn không còn tách dòng đồ Tím" };
};

var c9 = function (A) {
  if (!vd(A))
    return {
      ok: !1,
      msg:
        A && A.lock
          ? "Món đã khóa: mở khóa trước khi bán"
          : "Chỉ bán được phôi Tím chưa khảm (không đang mặc)",
    };
  const n = x0(A);
  return (
    A1(A),
    (o.gold += n),
    (l.dirty = !0),
    (R = !0),
    { ok: !0, sold: !0, msg: `Bán ${A.n}: +${q(n)} lượng` }
  );
};

var l9 = function (A, n = !0) {
  if (!A || !A.vio || !(A.mag || []).length) return 0;
  const t = new Set();
  let e = -1;
  for (let i = 0; i < A.mag.length; i++) {
    if (t.has(A.mag[i].a)) {
      e = i;
      break;
    }
    t.add(A.mag[i].a);
  }
  if (e < 0) return 0;
  const a = A.mag.splice(e);
  return (
    n &&
      a.forEach((i, r) => {
        const c = e + r;
        U("ore", Ia(c, i.a, i.vlv || 1, i.vs != null ? i.vs : c % 2 ? A.s : -1));
      }),
    A.vslots || (A.vslots = R1),
    a.length
  );
};

var d9 = function (A) {
  const n = [];
  if (!y0()) return null;
  if (Math.random() < M3("ore", A)) {
    const t = typeof w2 == "function" && re() < 0.7 ? w2()[0] : null,
      e = t ? t.mag.length : ce(0, R1 - 1),
      a = Object.values(o.eq).filter((g) => g && g.d <= 9),
      i = t || (a.length ? C0(a) : null),
      r = new Set(t ? t.mag.map((g) => g.a) : []),
      c = i
        ? S.affixLevel
            .filter(
              (g) =>
                g.lvl === 1 &&
                g.pre === (e % 2 === 0 ? 1 : 0) &&
                de(g.a, i.s) &&
                cs(g.a, i.d, i.k) &&
                !r.has(g.a),
            )
            .map((g) => g.a)
        : [],
      d = E(Math.floor(A.L / 12) + ce(0, 1), 1, Sa),
      f = t && c.length ? f9(t, e, [...new Set(c)], d) : c.length ? C0([...new Set(c)]) : C0(bd(e)),
      h = Ia(e, f, d, e % 2 ? (i ? i.s : ce(0, 4)) : -1);
    (U("ore", h), n.push(`${Mt(h)} cấp ${d}`));
  }
  if (Math.random() < M3("ht", A)) {
    const t = E(Math.floor(A.L / 15) + 1, 1, MA);
    (U("ht", t), n.push(`Huyền Tinh Khoáng Thạch cấp ${t}`));
  }
  if (Math.random() < (L9[A.cls] || 0) * ss())
    if (o.inv.concat(a0()).filter((t) => t.vio && !(t.mag || []).length).length >= 4) {
      const t = E(Math.floor(A.L / 15) + 1, 1, MA);
      (U("ht", t), n.push(`Huyền Tinh Khoáng Thạch cấp ${t}`));
    } else {
      const t = h9(A.L);
      t &&
        ((a0().length < (typeof w1 == "number" ? w1 : 120) || o.inv.length >= INV_MAX
          ? a0()
          : o.inv
        ).push(t),
        (R = !0),
        n.push(`Phôi Tím ${t.n} (${t.vslots} dòng)`));
    }
  return n.length ? n.join(", ") : null;
};

var f9 = function (A, n, t, e) {
  const a = Object.keys(S0().ht).map(Number),
    i = a.length ? Math.max(...a) : e,
    r = JA(A),
    c = Object.assign({}, o.eq, { [r]: A });
  let d = C0(t),
    f = -1;
  const h = ne;
  ne = A;
  try {
    for (const g of t.sort(() => re() - 0.5).slice(0, 12)) {
      const u = ge(g);
      if (!u.length) continue;
      const w = u[E(Math.floor((i + e) / 2), 1, u.length) - 1];
      if (!de(w.a, A.s) || !cs(w.a, A.d, A.k)) continue;
      A.mag.push({
        a: w.a,
        p: w.p.map(([p, P]) => (p === -1 && P === -1 ? -1 : (p + P) / 2)),
        pre: n % 2 === 0 ? 1 : 0,
      });
      const x = G0(j0(c));
      (A.mag.pop(), x > f && ((f = x), (d = g)));
    }
  } finally {
    ne = h;
  }
  return d;
};

var h9 = function (A) {
  const n = E(Math.round(A / 12), 1, 10),
    t = I[o.fac];
  let e = null;
  for (let a = 0; a < 6 && (!e || !p0(e)); a++) {
    if (((e = null), t && !t.novice && re() < 0.25)) {
      const i = w5();
      e = _A(i[0], i[1], n, 0);
    }
    if (!e) {
      const i = _3[ce(2, _3.length - 1)];
      e = _A(i, _a(i, 0), n, 0);
    }
  }
  return e
    ? ((e.mag = []),
      (e.vio = 1),
      (e.r = 3),
      (e.vslots = a9(E(Math.floor(A / 25) + 1, 1, 6))),
      delete e.leg,
      (l.dirty = !0),
      e)
    : null;
};

var u9 = function (A, n) {
  const t = typeof l < "u" && l.tower ? Math.min(2, 1 + l.tower.floor / 40) : 1;
  if (!n && Math.random() >= M3("shard", A) * Ca("shard") * t) return null;
  const e = Math.max(o.lvl, A.L) + 10,
    a = I[o.fac] ? I[o.fac].id : -1;
  let i = [...me.values()].filter(
    (f) => YA(f, 36) <= e && k1(f.req) && cA(f) && c3(f, Math.max(o.lvl, A.L)),
  );
  const r = i,
    c = [];
  if (i.some((f) => YA(f, 39) >= 0) && Math.random() >= Zp) {
    const f = r.filter((h) => YA(h, 39) < 0);
    f.length && (i = f);
  }
  if (!i.length) return null;
  const d = C0(
    c.length && i === c ? c.sort((f, h) => N("shard", h.n) - N("shard", f.n)).slice(0, 2) : i,
  );
  return (U("shard", d.n), `Mảnh ${d.n} (${N("shard", d.n)}/${NA[d.n]})`);
};

var g9 = function (A, n) {
  return {
    uid: o.uid++,
    n: `Gói Mảnh ${A} ×${n}`,
    d: 99,
    k: 0,
    lvl: 1,
    s: -1,
    r: 2,
    ic: q9,
    price: 0,
    base: [],
    req: [],
    mag: [],
    ext: [],
    pack: { k: "shard", n: A, c: n },
  };
};

var m9 = function (A, n) {
  const t = N("shard", A);
  return (
    (n = Math.min(t, Math.floor(n || t))),
    n < 1
      ? { ok: !1, msg: "Không có mảnh" }
      : o.inv.length >= INV_MAX
        ? { ok: !1, msg: "Hành trang đầy" }
        : (U("shard", A, -n),
          o.inv.push(g9(A, n)),
          (R = !0),
          $(),
          { ok: !0, msg: `Đóng gói ${n} Mảnh ${A} vào hành trang (gửi thư / bày bán Chợ được)` })
  );
};

var w9 = function (A) {
  if (!A || !A.pack || !o.inv.includes(A)) return { ok: !1, msg: "Không tìm thấy gói" };
  const n = A.pack,
    t = Math.max(0, Math.min(999, n.c | 0));
  return n.k !== "shard" || !NA[n.n] || !t
    ? { ok: !1, msg: "Gói không hợp lệ" }
    : (o.inv.splice(o.inv.indexOf(A), 1),
      U("shard", n.n, t),
      (R = !0),
      $(),
      { ok: !0, msg: `Mở gói: +${t} Mảnh ${n.n} (${N("shard", n.n)}/${NA[n.n]})` });
};
