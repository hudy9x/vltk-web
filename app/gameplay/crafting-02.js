// gameplay/crafting — shared IIFE scope; order is defined in modules.json.
var ed = function (A) {
  const n = A.pack || {};
  J(
    `<h3>${D(A.n)}</h3><p class="desc">Gói ${n.c} <b>Mảnh ${D(n.n)}</b> (ghép ${NA[n.n] || "?"} mảnh = 1 món). Gửi thư hoặc bày bán ở Chợ như đồ thường; mở gói để nhận lại mảnh.</p>
    <p class="small">Đang có: ${N("shard", n.n)} mảnh này</p>
    <div class="btnrow"><button class="btn" id="pkOpen">Mở gói</button><button class="btn" id="pkClose">Đóng</button></div>`,
    () => {
      ((m("#pkOpen").onclick = () => {
        const t = w9(A);
        (k(t.msg), t.ok && C("📦 " + D(t.msg)), n0(!0), typeof V == "function" && V());
      }),
        (m("#pkClose").onclick = () => n0(!0)));
    },
  );
};

var ad = function (A) {
  const n = NA[A],
    t = me.get(A);
  if (!n || !t || !cA(t)) return { ok: !1, msg: "Mảnh không hợp lệ" };
  if (N("shard", A) < n) return { ok: !1, msg: `Cần ${n} mảnh` };
  if (o.inv.length >= INV_MAX) return { ok: !1, msg: "Hành trang đầy" };
  U("shard", A, -n);
  const e = Ta("gold", t, 0);
  return (o.inv.push(e), { ok: !0, item: e, msg: `Ghép thành ${e.n}` });
};

var g3 = function (A) {
  const n = F1.get(A) || [],
    t = (a) => (a.n.match(/^\[([^\]]*)\]/) || [])[1] || "",
    e = n.filter(
      (a) =>
        /^[\p{L}\p{N}\s\[\]'·-]+$/u.test(a.n) && !/[一-鿿]/.test(a.n) && !/Hạn Thời/i.test(a.n),
    );
  for (const a of G9) {
    const i = e.find((r) => t(r) === a);
    if (i) return i;
  }
  return e[0] || n[0] || null;
};

var p9 = function (A, n, t, e) {
  const a = S.ge[A];
  if (!a) return null;
  const i = S.ge[n],
    r = i && i.a === a.a ? i : a;
  return {
    a: a.a,
    pre: 1,
    p: a.p.map(([c, d], f) => {
      if (c === -1 && d === -1) return -1;
      const [h, g] = r.p[f],
        u = c + (h - c) * t,
        w = d + (g - d) * t;
      return Math.round(u + (w - u) * e);
    }),
  };
};

var sd = function (A, n, t) {
  const e = S.ge[A.mag[n]],
    a = S.ge[A.mag10[n]];
  if (!e) return null;
  const i = Math.min(1, (t || 0) / ds),
    r = a && a.a === e.a ? a.p[0] : e.p[0];
  return [
    Math.round(e.p[0][0] + (r[0] - e.p[0][0]) * i),
    Math.round(e.p[0][1] + (r[1] - e.p[0][1]) * i),
  ];
};

var os = function (A) {
  const n = kd(A);
  if (!n) return;
  const t = Math.min(1, (A.plv || 0) / ds);
  ((!A.mf || A.mf.length !== n.mag.length) && (A.mf = n.mag.map(() => Math.random())),
    (A.mag = n.mag.map((e, a) => p9(e, n.mag10[a], t, A.mf[a])).filter(Boolean)),
    (A.ext = (A.ps || [])
      .filter((e) => e != null)
      .map((e) => r3(e, 10))
      .filter(Boolean)));
};

var m3 = function (A) {
  const n = kd(A),
    t = A.plv || 0;
  !n ||
    t < 5 ||
    t > 9 ||
    ((A.ps = A.ps || [null, null]),
    n.rate.forEach((e, a) => {
      const i = e && e[t - 5];
      if (!i) return;
      let r = Math.random() * 100;
      A.ps[a] = null;
      for (const [c, d] of i) {
        if (r < c) {
          A.ps[a] = d;
          break;
        }
        r -= c;
      }
    }));
};

var rs = function (A) {
  if (!A || !A.set || A.set.kind !== "platina" || A.pv3) return;
  const n = [...F1.keys()].find(
    (e) => K1(A.n) === e || K1(A.n) === K1(((S.platVng || {})[e] || {}).n || ""),
  );
  if (!n) return;
  const t = F1.get(n)[0];
  if (!(!t || t.vng !== 2)) {
    if (
      ((A.n = t.n),
      (A.base = t.base.map((e) => e.slice())),
      (A.req = t.req.map((e) => e.slice())),
      (A.s = t.s),
      (A.mf = null),
      (A.ps = null),
      (A.plv || 0) >= 5)
    ) {
      const e = A.plv;
      ((A.plv = Math.min(9, e)), m3(A), (A.plv = e));
    }
    ((A.pv3 = 1), os(A));
  }
};

var R_ = function (A) {
  const n = o.inv.filter((t) => t !== A && t.n === A.n && Q9(t));
  return n.length ? n.sort((t, e) => K0(t) - K0(e))[0] : null;
};

var Ea = function (A) {
  return d3()
    ? we(A)
      ? (A.enh || 0) < fs
        ? `Cần cường hóa +${fs} (đang +${A.enh || 0})`
        : N("misc", "mys") < qa
          ? `Thiếu Thần Bí Khoáng Thạch (cần ${qa})`
          : N("ht", pe) < 1
            ? `Thiếu Huyền Tinh cấp ${pe}`
            : o.gold < B1
              ? `Cần ${q(B1)} lượng`
              : ""
      : "Không phải Hoàng Kim chế được Bạch Kim"
    : "Chưa mở";
};

var id = function (A) {
  const n = Ea(A);
  if (n) return { ok: !1, msg: n };
  ((o.gold -= B1), U("misc", "mys", -qa), U("ht", pe, -1));
  const t = Ta("platina", g3(A.n), 10);
  ((t.plv = 0), (t.pv2 = 1), (t.pv3 = 1), (t.enh = 0), A.lock && (t.lock = !0), os(t));
  const e = Y2(A, o.eq);
  return (
    e ? (o.eq[e] = t) : o.inv.splice(o.inv.indexOf(A), 1, t),
    typeof yo == "function" && yo(t),
    {
      ok: !0,
      item: t,
      msg: `Chế thành ${t.n}${e ? " (đã mặc)" : ""}${typeof p0 == "function" && !p0(t) ? ` · cần cấp ${H3} mới có tác dụng` : ""}`,
    }
  );
};

var D9 = function (A, n) {
  if (!he(A) || !A.set || A.set.kind !== "platina")
    return { ok: !1, msg: "Chỉ thăng cấp đồ Bạch Kim đang có" };
  const t = A.plv || 0;
  if (t >= ds) return { ok: !1, msg: "Đã tối đa +10" };
  if (((n = n == null ? Math.min(i8(A), N("misc", "mys")) : n | 0), n <= 0))
    return { ok: !1, msg: "Chưa bỏ Thần Bí Khoáng Thạch" };
  if (n > N("misc", "mys")) return { ok: !1, msg: "Không đủ Thần Bí Khoáng Thạch" };
  if (o.gold < B1) return { ok: !1, msg: `Cần ${q(B1)} lượng` };
  const e = xd(A, n);
  if (((o.gold -= B1), U("misc", "mys", -n), Math.random() >= e))
    return {
      ok: !1,
      lost: !0,
      msg: `Thăng cấp thất bại (tỉ lệ ${Math.round(e * 100)}%): mất ${n} Thần Bí Khoáng Thạch + ${q(B1)} lượng, giữ +${t}`,
    };
  ((A.plv = t + 1), A.pv3 || rs(A));
  const a = (A.ps || []).filter((r) => r != null).length;
  (m3(A), os(A));
  const i = (A.ps || []).filter((r) => r != null).length;
  return {
    ok: !0,
    msg: `Thăng cấp thành công: ${A.n} +${A.plv}${A.plv >= 5 && A.plv <= 9 ? ` · dòng Bạch Kim: ${i ? A.ext.map((r) => (typeof Zi == "function" ? Zi(r).replace(/<[^>]+>/g, "") : "")).join(", ") : "chưa mở"}` : ""}${!a && i ? " (mở dòng mới!)" : ""}`,
  };
};

var od = function () {
  const A = Math.random(),
    n = A < 0.1 ? 5 : A < 0.4 ? 2 : 1;
  return (U("misc", "mys", n), n);
};

var P9 = function (A) {
  if (!d3() || (A.L < 60 && A.cls !== "boss")) return null;
  const n = [];
  if (
    (Math.random() < M3("wc", A) && (U("misc", "wc", 1), n.push("1 Thủy Tinh Trắng")), A.goldBoss)
  ) {
    const t = Math.random(),
      e = t < 0.15 ? 3 : t < 0.5 ? 2 : 1;
    (U("misc", "mys", e), n.push(`${e} Thần Bí Khoáng Thạch`));
  }
  return n.length ? n.join(", ") : null;
};

var rd = window.RCP.recipes;

var R1 = 6;

var MA = 10;

var Sa = 10;

var re = Math.random;

var ce = (s, A) => s + Math.floor(re() * (A - s + 1));

var S0 = () => {
  const s = o.mats || (o.mats = {});
  for (const A of ["ht", "ore", "shard", "misc"]) s[A] = s[A] || {};
  return s;
};

var Ia = (s, A, n, t = -1) => `${s}:${A}:${n}` + (t >= 0 && s % 2 ? `:${t}` : "");

var IA = (s) => {
  const [A, n, t, e] = s.split(":").map(Number);
  return { place: A, a: n, lvl: t, s: Number.isFinite(e) ? e : -1 };
};

var le = [
  "Huyền Thiết Khoáng",
  "Khổng Tước Thạch",
  "Mật Ngân Khoáng",
  "Phù Dung Thạch",
  "Chu Sa Khoáng",
  "Chung Nhũ Thạch",
];

var Mt = (s) => {
  const A = IA(s);
  return le[A.place] + (A.s >= 0 ? ` (${g0[A.s]})` : "");
};

var wA = { fuse: 1e3, up: 5e3, hut: 5e3, phoi: 1e4, kham: 1e4 };

var Y1 = (s) => (s && s.vslots) || R1;

var N = (s, A) => S0()[s][A] || 0;

var pA = [0, 1e4, 5e4, 225e3, 9e5, 33e5, 11314e3, 3677e4, 12607e4, 46225e4, 1849e6];

var A8 = [5e4, 1e5, 12e4, 15e4, 18e4, 24e4, 5e5];

var w3 = [0, 5e4, 2e5, 3e5, 5e5, 1e6, 3e6];

var v9 = [
  [70, 120],
  [71, 120],
  [72, 120],
  [73, 118],
  [74, 115],
  [75, 112],
  [77, 109],
  [80, 106],
  [90, 103],
  [100, 100],
];

var cd = [100, 100, 100, 60, 100, 35];

var ld = (() => {
  const s = {};
  return (
    "5:0:85 5:1:100 5:2:45 5:3:50 6:0:85 6:1:100 7:0:75 7:1:45 7:2:90 7:3:100 7:4:90 7:5:80 7:6:55 7:7:40 7:8:35 7:9:45 7:10:40 7:11:35 7:12:50 7:13:40 8:0:60 8:1:100 2:0:65 2:1:40 2:2:85 2:3:95 2:4:100 2:5:55 2:6:50 2:7:35 2:8:25 2:9:50 2:10:35 2:11:50 2:12:30 2:13:25 2:14:65 2:15:40 2:16:85 2:17:95 2:18:100 2:19:55 2:20:50 2:21:35 2:22:25 2:23:50 2:24:35 2:25:50 2:26:30 2:27:25"
      .split(" ")
      .forEach((A) => {
        const [n, t, e] = A.split(":").map(Number);
        s[n + ":" + t] = e;
      }),
    s
  );
})();

var Na = { wc: 5e7, mys: 1e8, fd: 6e5 };

var dd = [
  126, 166, 115, 58, 43, 150, 111, 117, 113, 112, 139, 114, 136, 137, 85, 89, 93, 88, 92, 96, 97,
  121, 125, 123, 122, 124, 134, 104, 101, 105, 102, 103, 99, 110, 135, 106, 98, 108, 140, 142, 141,
  143, 144, 168, 169, 170, 171, 172, 116,
];
