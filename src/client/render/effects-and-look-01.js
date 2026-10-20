// render/effects-and-look — shared IIFE scope; order is defined in modules.json.
var JP = function () {
  if (!o || !o.sk || o.lookFx === !1) return [];
  const A = (r) => typeof Vi != "function" || (wn(T[r]) !== "curse" && Vi(T[r]) && !l.buffAssume),
    n = Object.keys(o.sk)
      .map(Number)
      .filter((r) => o.sk[r] > 0 && U1[r] && T[r] && !UA(T[r]) && A(r)),
    t = n.join(",");
  if (l.stKey === t) return l.stList;
  const e = n.sort((r, c) => T[c].req - T[r].req),
    a = {},
    i = [];
  for (const r of e) {
    const c = U1[r],
      d = a[c.pos] || [];
    d.length >= 3 || d.includes(c.f) || (d.push(c.f), (a[c.pos] = d), i.push(c));
  }
  return ((l.stKey = t), (l.stList = i), i);
};

// Composite standing head coordinates include the rider's lift and stay stable during attacks.
var heroNameplateOffset = function (scale = Jn) {
  const fallback = nameplateOffset(v.animKey, scale, 0.9, 6, 58);
  if (typeof J3 !== "function" || !J3() || !l.jx || !P0) return fallback;
  const look = l.jx, pose = look.asc && look.asc.st, tabs = P0.tabs[look.sx];
  if (!pose || !tabs) return fallback;
  let height = 0;
  for (const part of ["头部", "发型"]) {
    const row = look.rows.helm, id = tabs[part] && tabs[part][row] && tabs[part][row][pose];
    const sheet = id && P0.sheets[L8(look.sx, id)];
    if (sheet) height = Math.max(height, (P0.foot[1] - sheet[3]) * scale);
  }
  return height > 0 ? height + 8 : fallback;
};

var F3 = function (A, n, t, e, a, i, r, c = 1, actor = null) {
  const d = bA(n.f);
  if (!d.complete || !d.naturalWidth) return;
  const hero = actor === v,
    guildLine = hero && typeof bo === "function" && bo(),
    clearance = hero
      ? heroNameplateOffset(r) + (guildLine ? 40 : 26)
      : actor ? nameplateOffset(actor.animKey, r, 0.85, 8, (actor.r || 17) * 2 + 8) + 28
        : Math.max(0, a) + 28;
  const f = Math.floor((i * 1e3) / n.ms) % n.n,
    // Anchor visible artwork above the name/HP block rather than empty sheet padding.
    h = n.pos === "head" ? e - clearance - ((n.headBottom || n.h) - n.ay) * r * nv : e;
  ((r *= nv),
    (A.globalAlpha = c),
    A.drawImage(d, f * n.w, 0, n.w, n.h, t - n.ax * r, h - n.ay * r, n.w * r, n.h * r),
    (A.globalAlpha = 1));
};

var Pf = function (A, n, t) {
  const e = l.clock || 0;
  if (n === "under" && o.lookFx !== !1 && typeof v0 == "function") {
    const a = Math.min(5, v0());
    a > 0 && vf[a] && F3(A, vf[a], v.x, v.y, t, e, Jn, 0.95);
  }
  for (const a of JP())
    (a.pos === "foot") == (n === "under") &&
      F3(A, a, v.x, v.y, t, e, Jn, a.pos === "foot" ? 0.85 : 0.9, v);
};

var E8 = function (A, n) {
  if (!A || !A.id || o.lowFx) return;
  const t = U1[A.id];
  t && UA(T[A.id]) && ((n.stFx = t), (n.stT = Av));
};

var WP = function (A, n, t) {
  if (!n.curse || o.lookFx === !1) return;
  const e = l.clock || 0,
    a = {};
  for (const i in n.curse) {
    if (n.curse[i] <= e) continue;
    const r = U1[i];
    !r ||
      a[r.pos] ||
      ((a[r.pos] = 1), F3(A, r, n.x, n.y, 0, e, t, Math.min(0.9, (n.curse[i] - e) / 1.5), n));
  }
};

var ZP = function (A, n, t, e, a) {
  if (n.stFx) {
    if (((n.stT -= a), n.stT <= 0)) {
      n.stFx = null;
      return;
    }
    F3(A, n.stFx, n.x, n.y, t, l.clock || 0, e, E(n.stT, 0, 1), n);
  }
};

var U1 = window.JXST || {};

var Av = 2.5;

var nv = 0.6;

U1[390] && !U1[76] && (U1[76] = U1[390]);

for (const s in U1) {
  const A = U1[s];
  A &&
    (A.ax < 0 || A.ay < 0) &&
    (U1[s] = Object.assign({}, A, {
      ax: Math.round(A.w / 2),
      ay:
        A.pos === "head"
          ? A.h + 62
          : A.pos === "body"
            ? Math.round(A.h / 2) + 40
            : Math.round(A.h / 2),
    }));
}

typeof A0 < "u" &&
  A0.f &&
  ((!A0.f[272] || !A0.f[272].c) && (A0.f[272] = { form: 8, num: 1, c: (A0.f[10] || {}).c }),
  (!A0.f[325] || !A0.f[325].c) && (A0.f[325] = { form: 12, num: 1, c: (A0.f[324] || {}).c }));

var vf = {
  1: { f: "fx/cs_1.webp", n: 15, w: 122, h: 109, ax: 61, ay: 68, ms: 70, pos: "foot" },
  2: { f: "fx/cs_2.webp", n: 15, w: 121, h: 111, ax: 60, ay: 69, ms: 70, pos: "foot" },
  3: { f: "fx/cs_3.webp", n: 15, w: 125, h: 128, ax: 63, ay: 90, ms: 80, pos: "foot" },
  4: { f: "fx/cs_4.webp", n: 14, w: 113, h: 61, ax: 57, ay: 31, ms: 100, pos: "foot" },
  5: { f: "fx/cs_5.webp", n: 10, w: 262, h: 153, ax: 131, ay: 94, ms: 150, pos: "foot" },
};

var tv = function (A) {
  if (!A) return null;
  const n = (A.n || "").replace(/\s+\d+$/, ""),
    t = rv[n];
  return t || (A.thanma ? [ov[A.thanma] || "#ffd24a", 3] : null);
};

var bf = function (A) {
  if (!A || !p0(A)) return null;
  if (A.set)
    return A.set.kind === "platina" ? { c: "#e6f4ff", a: 0.48 } : { c: "#ffc93c", a: 0.44 };
  const n = iv[A.r || 0];
  return n ? { c: A.s >= 0 && A.s < 5 ? w0[A.s] : _0[A.r], a: n } : null;
};

var yf = function () {
  const A = o.eq,
    n = Object.values(A).filter((u) => u && u.d !== 10),
    t = bf(A.armor),
    e = bf(A.helm);
  let a = null;
  if (typeof x1 == "function" && x1(A)) {
    const u = n.filter((x) => x.set && x.set.kind === "platina").length,
      w = n.filter((x) => x.set && x.set.kind === "gold").length;
    a = u >= w ? { c: "#bfe6ff", c2: "#ffffff", k: 1 } : { c: "#ffb52e", c2: "#fff1a8", k: 1 };
  } else if (n.length >= 5) {
    const u = n.reduce((w, x) => w + (x.enh || 0), 0) / n.length;
    u >= 7 && (a = { c: w0[F0()], c2: "#ffffff", k: u >= 9 ? 0.9 : 0.6 });
  }
  const i = A.weapon,
    r = (i && p0(i) && i.enh) || 0,
    c =
      r >= 5
        ? { c: i.s >= 0 && i.s < 5 ? w0[i.s] : "#ffe9a8", n: r >= 10 ? 3 : r >= 8 ? 2 : 1 }
        : null,
    d = A.horse,
    f = tv(d),
    h = f ? f[0] : null,
    g = f ? f[1] : 0;
  return {
    body: t,
    head: e,
    aura: a,
    glow: c,
    dust: h,
    hlv: g,
    key: JSON.stringify([t, e, a, c, h, g]),
  };
};

var ev = function (A, n, t, e, a) {
  const i = `${n.f}|${t}|${e}|${a.key}`;
  let r = U3.get(i);
  if (r) return r;
  ((r = document.createElement("canvas")), (r.width = n.w), (r.height = n.h));
  const c = r.getContext("2d");
  (c.drawImage(A, t * n.w, e * n.h, n.w, n.h, 0, 0, n.w, n.h),
    (c.globalCompositeOperation = "source-atop"));
  const d = Math.max(0, n.ay - n.h * 0.8),
    f = d + (n.ay - d) * 0.28;
  if (a.body) {
    const h = c.createLinearGradient(0, f - 4, 0, f + 6);
    (h.addColorStop(0, "rgba(0,0,0,0)"),
      h.addColorStop(1, a.body.c),
      (c.globalAlpha = a.body.a),
      (c.fillStyle = h),
      c.fillRect(0, f - 4, n.w, n.h));
  }
  return (
    a.head && ((c.globalAlpha = a.head.a), (c.fillStyle = a.head.c), c.fillRect(0, 0, n.w, f)),
    U3.size > 600 && U3.clear(),
    U3.set(i, r),
    r
  );
};

var kf = function (A, n, t, e, a, i, r, c = 1) {
  if (typeof J3 == "function" && J3() && l.jx) {
    const x = It(n, t, e, a, i, r, c, A);
    if (x) return x;
  }
  const d = l.look;
  if (!V3() || !d || (!d.body && !d.head)) return Va(A, n, t, e, a, i, r, c);
  const f = E0.anim && E0.anim[A];
  if (!f) return !1;
  const h = f[n] || f.st;
  if (!h) return !1;
  const g = bA("img/a/" + h.f);
  if (!g.complete || !g.naturalWidth) return !1;
  let u = Math.floor((e * 1e3) / h.ms);
  u = ff[n] ? Math.min(u, h.n - 1) : u % h.n;
  const w = h.d >= 8 ? t : Math.floor((t * h.d) / 8);
  return (
    (W.globalAlpha = c),
    W.drawImage(ev(g, h, u, w, d), a - h.ax * r, i - h.ay * r, h.w * r, h.h * r),
    (W.globalAlpha = 1),
    h.h * r
  );
};

var av = function (A) {
  const n = l.look;
  if (!V3() || !n || !n.aura) return;
  const t = l.clock || 0,
    e = 0.5 + 0.5 * Math.sin(t * 3),
    a = n.aura;
  if (
    (A.save(),
    (A.globalAlpha = (0.35 + 0.25 * e) * a.k),
    (A.strokeStyle = a.c),
    (A.lineWidth = 2),
    A.beginPath(),
    A.ellipse(v.x, v.y, 24 + e * 4, 9 + e * 1.5, 0, 0, 7),
    A.stroke(),
    (A.globalAlpha = 0.18 * a.k),
    (A.fillStyle = a.c),
    A.beginPath(),
    A.ellipse(v.x, v.y, 22, 8, 0, 0, 7),
    A.fill(),
    A.restore(),
    o.lowFx)
  )
    return;
  const i = l.lookP || (l.lookP = []);
  Math.random() < 0.25 * a.k &&
    i.push({
      x: v.x + Z(-18, 18),
      y: v.y + Z(-3, 3),
      vy: -Z(18, 34),
      life: 1.1,
      c: Math.random() < 0.5 ? a.c : a.c2,
    });
};

var sv = function (A, n) {
  const t = l.look;
  if (!V3() || !t || o.lowFx) {
    l.lookP = null;
    return;
  }
  const e = l.lookP || (l.lookP = []);
  if (t.glow && Math.random() < 0.12 * t.glow.n) {
    const a = Z(0, 7);
    e.push({
      x: v.x + Math.cos(a) * Z(8, 20),
      y: v.y - 26 + Math.sin(a) * Z(6, 16),
      vy: -Z(6, 16),
      life: 0.7,
      c: t.glow.c,
      s: 1 + t.glow.n * 0.5,
    });
  }
  A.save();
  for (const a of e)
    ((a.life -= n),
      (a.y += a.vy * n),
      (A.globalAlpha = E(a.life, 0, 1) * 0.85),
      (A.fillStyle = a.c),
      A.beginPath(),
      A.arc(a.x, a.y, a.s || 1.4, 0, 7),
      A.fill());
  (A.restore(), (l.lookP = e.filter((a) => a.life > 0).slice(-80)));
};

var iv = [0, 0.24, 0.32, 0.4, 0.42, 0.42];

var ov = { ovan: "#5fb8ff", xtho: "#ff6a3a", tanh: "#f3d35b", dlo: "#6fd46a", cdsu: "#c8965a" };

var rv = {
  "Ô Vân Đạp Tuyết": ["#5fb8ff", 3],
  "Xích Thố": ["#ff6a3a", 3],
  "Tuyệt Ảnh": ["#f3d35b", 3],
  "Tuyệt ảnh": ["#f3d35b", 3],
  "Đích Lô": ["#6fd46a", 3],
  "Chiếu Dạ Ngọc Sư Tử": ["#fff1a8", 3],
  "Phi Vân": ["#d8e6ff", 2],
  "Bôn Tiêu": ["#ff9ad0", 2],
  "Xích Long Câu": ["#ff5a3a", 2],
  "Du Huy": ["#c8f0ff", 2],
  "Tuyệt Địa": ["#b48cff", 2],
  "Đằng Vụ": ["#9fd8d0", 2],
  "Siêu Quang": ["#ffe36a", 2],
  "Phiên Vũ": ["#ffb8e8", 3],
  "Hãn Huyết Long Câu": ["#ff3048", 3],
  "Kim Tinh Bạch Hổ Vương": ["#f0f8ff", 3],
  "Phong Vân Thần Mã": ["#ffd24a", 3],
  "Kim Tinh Hổ Vương": ["#ffc84a", 2],
  "Hỏa Tinh Kim Hổ Vương": ["#ff7a2a", 2],
  "Long Tinh Hắc Hổ Vương": ["#9a7aff", 2],
  "Phong Vân Bạch Mã": ["#e8f2ff", 2],
  "Phong Vân Chiến Mã": ["#ffb04a", 2],
  "Sư tử": ["#f3c96a", 1],
  "Lạc đà": ["#d8b47a", 1],
  "Dương Đà": ["#c8a070", 1],
  "Hươu đốm": ["#c89a5a", 1],
  "Dương Sa": ["#e0c090", 1],
  "Ngự Phong": ["#a8e8ff", 1],
  "Truy điện": ["#e8f06a", 1],
  "Lưu Tinh": ["#bfe0ff", 1],
};

var V3 = () => o && o.lookFx !== !1;

var U3 = new Map();

var S8 = function (A) {
  if (!A) return -1;
  if (Number.isInteger(A.p)) return A.p;
  const n = typeof as == "function" ? as(A.d, A.k, A.lvl || 1) : null;
  return n && Number.isInteger(n.p) ? n.p : -1;
};

var cv = function (A) {
  if (!A) return -1;
  const n = (P0.tabs[o && o.sex ? "f" : "m"] || {}).马中 || {},
    t = (A.n || "").replace(/\s+\d+$/, ""),
    e = A.k === 5 ? uv[t] : hv[A.k];
  return e != null && n[e] ? e : -1;
};

var I8 = function (A) {
  const n = cv(A);
  if (n >= 0) return n;
  if (A && A.thanma && Mf[A.thanma] != null && P0.tabs[l.jx ? l.jx.sx : "m"]) return Mf[A.thanma];
  const t = A && A.n ? A.n.replace(/\s+\d+$/, "") : "";
  if (Hf[t] != null && ys("horse", A) < 0) return Hf[t];
  const e = ys("horse", A);
  if (e >= 0) return e;
  const a = P0.res.horse || {};
  for (const i in a) if (a[i] >= 2) return a[i] - 2;
  return -1;
};

var lv = function (A) {
  const n = A.n;
  if (q8.has(n)) return q8.get(n);
  const t = A.n.replace(/^(\[[^\]]*\]\s*)+/, "").toLowerCase(),
    e = (S.sets.gold || []).find((a) => a.n.toLowerCase() === t && a.d === A.d) || null;
  return (q8.set(n, e), e);
};

var dv = function (A, n) {
  let t = n && n.set,
    e = n && n.d,
    a = n && n.k;
  if (t && t.kind === "platina" && (A === "melee" || A === "range")) {
    const f = lv(n);
    f && ((t = { kind: "gold", grp: f.grp, sid: f.sid }), (e = f.d), (a = f.k));
  }
  const i = t && P0.set && P0.set[t.kind];
  if (!i) return -1;
  const r = i[t.grp + "." + t.sid + "." + e + "." + a];
  if (r == null) return -1;
  const c = o && o.sex ? "f" : "m",
    d = ((P0.tabs[c] || {})[$f[A]] || {})[r];
  return d && Object.keys(d).length ? r : -1;
};

var ys = function (A, n) {
  const t = P0.res[A];
  if (!t) return -1;
  if (n && n.set && A !== "horse" && p0(n)) {
    const i = dv(A, n);
    if (i >= 0) return i;
  }
  const e = n && (p0(n) || A === "horse") && S8(n) >= 0 ? S8(n) + 2 : 1,
    a = t[e] ?? t[1];
  return a == null ? -1 : a - 2;
};

var N8 = function () {
  if (!P0 || !o || !o.fac) return null;
  const A = o.sex ? "f" : "m",
    n = o.eq,
    t = n.weapon,
    e = {
      helm: ys("helm", n.helm),
      armor: ys("armor", n.armor),
      weapon: ys(t && t.d === 1 ? "range" : "melee", t),
      horse: n.horse && l.mounted ? I8(n.horse) : -1,
    };
  e.weapon < 0 && (e.weapon = 0);
  const a = (P0.wnames[A] || [])[e.weapon] || "空手",
    i = P0.assoc[A][a] || P0.assoc[A].空手,
    r = e.horse >= 0 && i && i[1] ? 1 : 0;
  return { sx: A, rows: e, asc: i ? i[r] || i[0] : {}, ride: r, key: JSON.stringify([A, e, r]) };
};

var xf = function (A, n, t, e) {
  const a = P0.sort[A],
    i = a[n] || {},
    r = a.DEFAULT;
  for (const d in i) if (d[0] === "L" && i[d][0] === e) return i[d].slice(1);
  return (i["Dir" + (t + 1)] || r["Dir" + (t + 1)] || r.Dir1).slice(1);
};

var It = function (A, n, t, e, a, i, r, c, d) {
  const f = d || l.jx;
  if (!f) return !1;
  const h = A === "at" && f.asc.mg && (d ? !!d.mg : !!(l.P && l.P.main && !l.P.main.phys)),
    g = f.asc[h ? "mg" : A] || f.asc.st;
  if (!g) return !1;
  const u = P0.tabs[f.sx],
    w = [];
  let x = null;
  for (const O of xf(f.sx, g, (n % 8) * 2, 0)) {
    const G = fv[O];
    if (!G) continue;
    const j = f.rows[_f[G]];
    if (j < 0) continue;
    const X = ((u[G] || {})[j] || {})[g];
    if (!X) continue;
    const $0 = L8(f.sx, X),
      I0 = P0.sheets[$0];
    if (!I0) continue;
    const T0 = bA("img/jx/" + $0 + ".webp");
    if (!T0.complete || !T0.naturalWidth) {
      if (G === "躯体") return !1;
      continue;
    }
    (w.push([T0, I0, G]), (G === "躯体" || !x) && (x = I0));
  }
  if (!x) return !1;
  const p = x[4];
  let P;
  if (A === "st" || A === "run") P = Math.floor((t * 1e3) / (gv[A] || 110)) % p;
  else {
    const O = (typeof ws == "function" && ws(c, A)) || p * 0.09;
    P = Math.min(p - 1, Math.floor(E(t / Math.max(0.1, O), 0, 0.999) * p));
  }
  const _ = xf(f.sx, g, (n % 8) * 2, P * (x[6] || 1));
  w.sort((O, G) => _.indexOf(X3[O[2]]) - _.indexOf(X3[G[2]]));
  const y = P0.foot[0],
    M = P0.foot[1];
  let B = 0;
  W.globalAlpha = r;
  for (const [O, G] of w) {
    const [j, X, $0, I0, T0, aA] = G,
      Xt = Math.min(T0 - 1, Math.floor((P * T0) / p)),
      ki = aA >= 8 ? n % 8 : Math.floor(((n % 8) * aA) / 8);
    (W.drawImage(O, Xt * j, ki * X, j, X, e + ($0 - y) * i, a + (I0 - M) * i, j * i, X * i),
      (B = Math.max(B, (M - I0) * i)));
  }
  return ((W.globalAlpha = 1), B);
};

var Bf = function () {
  const A = l.jx;
  if (A)
    for (const n of Object.values(A.asc))
      for (const t in X3) {
        const e = A.rows[_f[t]];
        if (e < 0) continue;
        const a = (((P0.tabs[A.sx] || {})[t] || {})[e] || {})[n];
        a && P0.sheets[L8(A.sx, a)] && bA("img/jx/" + L8(A.sx, a) + ".webp");
      }
};

var P0 = window.JXLOOK || null;

if (!P0 && typeof document < "u") {
  const s = document.createElement("script");
  ((s.src =
    "jxlook.js?v=" +
    ((
      (
        document.querySelector('script[src*="app/game.js"]') ||
        document.querySelector('script[src*="js/core.js"]') ||
        {}
      ).src || ""
    ).split("v=")[1] || "")),
    (s.onload = () => {
      ((P0 = window.JXLOOK || null),
        P0 && typeof l < "u" && o && o.fac && ((l.jx = J3() ? N8() : null), l.jx && Bf()));
    }),
    document.head.appendChild(s));
}
