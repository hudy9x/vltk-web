// render/arena — shared IIFE scope; order is defined in modules.json.
var xP = (s) => {
  try {
    return (
      typeof s == "function" &&
      /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(s))
    );
  } catch {
    return !0;
  }
};

var BP = [
  "Điều chỉnh Võ Lâm",
  "Bật hệ số",
  "Tiền rơi (luôn rơi)",
  "Đồ hiếm / set ẩn",
  "Bộ mạnh nhất (phái",
  "HK môn phái mỗi quái",
  "Lọc đồ rơi",
];

var _P = (s) =>
  /^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(s.tagName) ||
  /^(u20|u2|chat|pt|m[A-Z]|modal|toast|fclose|maint|log|app|panel|top|battle)/.test(s.id || "");

var bA = function (A) {
  if (!A) return null;
  let n = of[A];
  return (n || ((n = new Image()), (n.src = A), (of[A] = n)), n);
};

var $A = function (A, n, t, e, a = 12) {
  const limit = o.lowFx ? 20 : 60;
  if (l.quiet) return;
  // Conservative glyph bounds include the shield/lightning/poison icons.
  const width = Array.from(String(t)).reduce((sum, char) => sum + a * (char.codePointAt(0) > 255 ? 1.1 : 0.7), 0) + 8;
  const height = a + 8;
  let x = A, y = n, placed = false;
  // All labels rise at the same speed, so free slots remain separated as they animate.
  for (let column = 0; column < 11 && !placed; column++) {
    const side = column === 0 ? 0 : Math.ceil(column / 2) * (column % 2 ? -1 : 1);
    for (let row = 0; row < 6 && !placed; row++) {
      const candidateX = A + side * (width + 16), candidateY = n - row * height;
      const overlaps = l.txt.some(label => label.life > 0 &&
        Math.abs(candidateX - label.x) < (width + (label.width || String(label.t).length * label.size + 8)) / 2 &&
        candidateY > label.y - (label.height || label.size + 8) && candidateY - height < label.y);
      if (!overlaps) { x = candidateX; y = candidateY; placed = true; }
    }
  }
  if (!placed) {
    // A dense cluster can fill every nearby slot; place above it rather than overlap.
    x = A;
    y = l.txt.reduce((top, label) => label.life > 0 &&
      Math.abs(x - label.x) < (width + (label.width || String(label.t).length * label.size + 8)) / 2
      ? Math.min(top, label.y - (label.height || label.size + 8) - 2) : top, n);
  }
  if (l.txt.length >= limit) l.txt.shift();
  l.txt.push({ x, y, t, color: e, size: a, width, height, life: o.lowFx ? 0.6 : 1.1 });
};

var MP = function (A, n, t) {
  l.quiet || l.fx.push({ k: "ring", x: A, y: n, color: t, life: 0.45, max: 0.45 });
};

var x8 = function (A, n, t) {
  if (l.quiet || l.fx.length > 80) return;
  let e = "phys",
    a = 0;
  for (const i in t.parts) t.parts[i] > a && ((a = t.parts[i]), (e = i));
  l.fx.push({
    k: "line",
    x1: A.x,
    y1: A.y - 20,
    x2: n.x,
    y2: n.y - 14,
    color: Hi[e],
    life: 0.18,
    max: 0.18,
  });
};

var Ya = function (A) {
  const n = A && A.id && A0.f && A0.f[A.id],
    t = n && n.pre && A0.c && A0.c[n.pre];
  !t ||
    l.quiet ||
    l.fx.length > j3 ||
    l.fx.push({
      k: "boom",
      s: t,
      x: A.ox != null ? A.ox : v.x,
      y: (A.oy != null ? A.oy : v.y) - 6,
      t: 0,
      life: yn(t),
      dir: 0,
      cosmetic: true,
    });
};

var G3 = function (A, n, t) {
  const e = (t.id && A0.f && A0.f[t.id]) || {},
    a = t.id && A0.m[e.c || A0.s[t.id]];
  if (
    (Ya(t),
    e.sub &&
      !l.quiet &&
      !(typeof C8 < "u" && C8.has(+t.id)) &&
      String(e.sub.c) !== String(e.c) &&
      HP(A, n, e.sub),
    !a || l.quiet)
  ) {
    x8(A, n, t);
    return;
  }
  if (l.fx.length > j3) return;
  const i = A.x,
    r = A.y - 20,
    c = n.x,
    d = n.y - 14,
    f = c - i,
    h = d - r,
    g = Math.hypot(f, h) || 1,
    u = e.form === void 0 ? 1 : e.form,
    w = E(t.nMis > 1 ? Math.max(e.num || 1, Math.min(t.nMis, 8)) : e.num || 1, 1, 8),
    x = Math.atan2(h, f),
    p = (B, O, G, j = 0) =>
      l.fx.push({ k: "boom", s: B, x: O, y: G, t: -j, life: yn(B), dir: Ds(f, h) }),
    P = (B, O, G = 0) =>
      l.fx.push({
        k: "mis",
        s: a.fly,
        hit: a.hit,
        x1: i,
        y1: r,
        x2: B,
        y2: O,
        t: -G,
        life: Math.min(0.6, Math.hypot(B - i, O - r) / a.spd),
        dir: Ds(B - i, O - r),
      }),
    _ = a.hit || a.fly,
    y = a.fly && a.fly.d === 1 && a.fly.ay > 150,
    M = (B, O, G = 0) => {
      const j = (a.fly.n * a.fly.ms) / 1e3,
        X = Math.min(0.8, j);
      (l.fx.push({ k: "boom", s: a.fly, x: B, y: O + 14, t: -G, life: X, sp: j / X, dir: 0 }),
        a.hit && p(a.hit, B, O, G + X * 0.8));
    };
  if (y && (u === 6 || u >= 8)) {
    for (let B = 0; B < w; B++)
      M(c + (w > 1 ? Z(-40, 40) : 0), d + (w > 1 ? Z(-26, 26) : 0), B * 0.12);
    return;
  }
  if ((t.melee && !e.meleeFly) || u >= 8) {
    p(_, c, d);
    return;
  }
  if (u === 7) {
    a.fly && a.fly.d === 1 && a.hit ? (p(a.fly, i, r + 8), p(a.hit, c, d, 0.12)) : p(_, i, r + 8);
    return;
  }
  if (u === 6) {
    for (let B = 0; B < w; B++)
      p(_, c + (w > 1 ? Z(-36, 36) : 0), d + (w > 1 ? Z(-24, 24) : 0), B * 0.07);
    return;
  }
  if (!a.fly) {
    p(_, c, d);
    return;
  }
  if (u === 3) {
    for (let B = 0; B < w; B++) {
      const O = x + (B / w) * Math.PI * 2;
      P(i + Math.cos(O) * 130, r + Math.sin(O) * 130);
    }
    return;
  }
  if (u === 2) {
    for (let B = 0; B < w; B++) {
      const O = x + (B - (w - 1) / 2) * 0.26;
      P(i + Math.cos(O) * g, r + Math.sin(O) * g);
    }
    return;
  }
  if (u === 1) {
    for (let B = 0; B < w; B++) P(c, d, B * 0.09);
    return;
  }
  if (u === 0) {
    const B = -h / g,
      O = f / g;
    for (let G = 0; G < w; G++) {
      const j = (G - (w - 1) / 2) * 34;
      P(c + B * j, d + O * j);
    }
    return;
  }
  for (let B = 0; B < w; B++) P(c + Z(-60, 60), d + Z(-40, 40), B * 0.05);
};

var HP = function (A, n, t) {
  const e = A0.m[t.c];
  if (!e || l.fx.length > j3) return;
  const a = E(t.n || 1, 1, 8),
    i = n.x,
    r = n.y - 14,
    c = e.hit || e.fly,
    d = 0.18,
    f = (h, g, u, w, x) =>
      e.fly
        ? l.fx.push({
            k: "mis",
            s: e.fly,
            hit: e.hit,
            x1: h,
            y1: g,
            x2: u,
            y2: w,
            t: -x,
            life: Math.min(0.55, Math.hypot(u - h, w - g) / (e.spd || 360)),
            dir: Ds(u - h, w - g),
          })
        : l.fx.push({ k: "boom", s: c, x: u, y: w, t: -x, life: yn(c), dir: 0 });
  if (t.form === 3) {
    const h = Math.random() * Math.PI;
    for (let g = 0; g < a; g++) {
      const u = h + (g / a) * Math.PI * 2;
      f(i, r, i + Math.cos(u) * 110, r + Math.sin(u) * 70, d);
    }
    return;
  }
  if (t.form === 1) {
    for (let h = 0; h < a; h++) f(A.x, A.y - 20, i + Z(-20, 20), r + Z(-14, 14), d + h * 0.06);
    return;
  }
  for (let h = 0; h < a; h++)
    l.fx.push({
      k: "boom",
      s: c,
      x: i + Z(-40, 40),
      y: r + Z(-26, 26),
      t: -(d + h * 0.08),
      life: yn(c),
      dir: 0,
    });
};

// Cosmetic impact only: every struck body gets its own Ngân Đao Xạ Nguyệt sprite.
var showNhiepHonImpact = function (target, skill) {
  if (l.quiet || !target || skill.impactVisualTargets && skill.impactVisualTargets.has(target)) return;
  const sprite = A0.m[150] && (A0.m[150].fly || A0.m[150].hit);
  if (!sprite) return;
  if (skill.impactVisualTargets) skill.impactVisualTargets.add(target);
  (l.fxQ || (l.fxQ = [])).push({ k: "boom", s: sprite, x: target.x, y: target.y - 14,
    t: 0, life: yn(sprite), dir: 0, cosmetic: true });
};

var $P = function (A, n) {
  const t = (A.id && A0.f && A0.f[A.id]) || {},
    e = t.c || A0.s[A.id],
    a = typeof R3 == "function" && R3(e),
    i = a && a[0] ? a[2] : 0;
  return i > 0 ? E((Math.hypot(n.x - v.x, (n.y - v.y) * 2) / i / 18) * 1e3, 0, 1500) : 120;
};

var B8 = function (A, n, t) {
  const e = t.sid || (t.fx === "176" ? 371 : qP[n.id]);
  if (e === 301) return !0;
  const a = LP[e];
  if (!a || !A0.m[a[0]] || typeof bs != "function") return !1;
  const i = t.self || t.rays || a[1] === 3;
  if (i) {
    const u = performance.now();
    if (!activeCombatCast && l.ev2Last === n && u - (l.ev2LastT || 0) < 60) return !0;
    ((l.ev2Last = n), (l.ev2LastT = u));
  }
  const r = t.rays ? t.rays(n.L || 1) : a[2],
    c = [a[1], 0, 0, a[3], a[4], 0, r, 0],
    d = i ? { x: v.x, y: v.y + 20 } : { x: A.x, y: A.y + 6 },
    f = (i && A === v && (l.enemies || []).find((u) => !u.dead)) || A,
    h = t.rays ? (l.ev2Tg || []).filter((u) => u && !u.dead).slice(0, r) : null,
    g = () => {
      if (!l.quiet || activeCombatCast) {
        if (h) {
          const u = o.lowFx && !activeCombatCast ? Math.min(r, 3) : r,
            w = h[0] ? Y3(h[0].x - d.x, h[0].y - d.y) : 0;
          for (let x = 0; x < u; x++) {
            const p = w + (x * Math.PI * 2) / u,
              P = Wn(
                a[0],
                d.x + Math.cos(p) * 20,
                d.y - 20 + Math.sin(p) * 10,
                p,
                h.length ? h[x % h.length] : null,
                uf(c, x, u),
              );
            P &&
              ((P.kind = 1),
              (P.hm = 5),
              (P.lf = Math.max(P.lf, 36)),
              (P.cv = !0),
              (P.ae = !1),
              (P.spd = Math.max(P.spd, 14)));
          }
          return;
        }
        bs(a[0], a[1], o.lowFx && !activeCombatCast ? Math.min(r, 3) : r, c, d, f, f);
      }
    };
  return (i || activeCombatCast ? g() : setTimeout(g, $P(n, A)), !0);
};

var Be = function (A, n, t, e, a) {
  if ((l.quiet && !activeCombatCast) || (a && !a.evm && B8(A, n, a))) return;
  const i = (n.id && A0.f && A0.f[n.id]) || {},
    r = n.id && (((!a || !a.evm) && A0.m[(a && a.fx) || i.ev2c]) || A0.m[i.c || A0.s[n.id]]),
    c =
      r && (r.fly && r.fly.d === 1 && !e ? r.fly : r.hit && r.hit.ax >= 0 ? r.hit : r.fly || r.hit);
  if (!(!c || (!activeCombatCast && l.fx.length > j3))) {
    if (e && r.fly) {
      l.fx.push({
        k: "mis",
        s: r.fly,
        hit: r.hit,
        x1: e.x,
        y1: e.y - 20,
        x2: A.x,
        y2: A.y - 14,
        t: -0.15,
        life: 0.35,
        dir: Ds(A.x - e.x, A.y - e.y),
      });
      return;
    }
    if (a && a.self) {
      l.fx.push({ k: "boom", s: c, x: A.x, y: A.y, t: -0.1, life: yn(c), dir: 0 });
      return;
    }
    for (let d = 0; d < 2; d++)
      l.fx.push({
        k: "boom",
        s: c,
        x: A.x + Z(-18, 18),
        y: A.y - 14 + Z(-12, 12),
        t: -(0.18 + d * 0.12),
        life: yn(c),
        dir: 0,
      });
  }
};

var af = function () {
  l.quiet ||
    !l.fx ||
    ((l.fx = l.fx.filter((A) => A.s !== z3)),
    l.fx.push({ k: "boom", s: z3, x: v.x, y: v.y, t: 0, life: yn(z3), dir: 0, follow: 1, add: 1 }));
};

var Fa = function (A, n, t, e, a, i) {
  const r = bA(A.f);
  if (!r || !r.complete || !r.naturalWidth) return !1;
  const c = i
      ? Math.floor((t * 1e3) / A.ms) % A.n
      : Math.min(A.n - 1, Math.floor((t * 1e3) / A.ms)),
    d = A.d > 1 ? Math.round((n * A.d) / 16) % A.d : 0;
  return (
    W.drawImage(r, c * A.w, d * A.h, A.w, A.h, e - A.ax * q3, a - A.ay * q3, A.w * q3, A.h * q3),
    !0
  );
};

var TP = function (A, n) {
  return (
    (A.t += n),
    A.t < 0
      ? !0
      : (A.follow && ((A.x = v.x), (A.y = v.y)),
        A.k === "mis" && A.t >= A.life
          ? A.hit
            ? (Object.assign(A, { k: "boom", s: A.hit, x: A.x2, y: A.y2, t: 0, life: yn(A.hit) }),
              !0)
            : !1
          : A.t < A.life)
  );
};

var CP = function (A) {
  if (A.t < 0) return !1;
  if (A.k === "mis") {
    const n = E(A.t / A.life, 0, 1);
    return Fa(A.s, A.dir, A.t, A.x1 + (A.x2 - A.x1) * n, A.y1 + (A.y2 - A.y1) * n, !0);
  }
  if (A.add) {
    const n = W.globalCompositeOperation;
    W.globalCompositeOperation = "lighter";
    try {
      return Fa(A.s, A.dir, A.t * (A.sp || 1), A.x, A.y, !1);
    } finally {
      W.globalCompositeOperation = n;
    }
  }
  const anchor = A.visualAnchor || A;
  return Fa(A.s, A.dir, A.t * (A.sp || 1), anchor.x, anchor.y, !1);
};

var St = function () {
  const A = m("#battle"),
    n = { width: A.offsetWidth, height: A.offsetHeight };
  ((H1 = Math.min(2, window.devicePixelRatio || 1) * $8()),
    (lA.width = Math.round(n.width * H1)),
    (lA.height = Math.round(n.height * H1)),
    (M0.w = n.width),
    (M0.h = n.height),
    (M0.top = 58),
    (M0.bot = n.height - 12),
    M1());
};

var M1 = function () {
  [B0.x, B0.y] = rf();
};

var OP = function (A) {
  const [n, t] = rf(),
    e = Math.min(1, A * 6);
  ((B0.x += (n - B0.x) * e), (B0.y += (t - B0.y) * e));
};

var EP = function (A, n) {
  if (mapScene.drawGround(A, n)) return;
  if (!(n && n.complete && n.naturalWidth)) {
    ((A.fillStyle = "#26301f"), A.fillRect(B0.x - 2, B0.y - 2, M0.w + 4, M0.h + 4));
    return;
  }
  if (Z0.g) {
    A.drawImage(n, 0, 0, O0.w, O0.h);
    return;
  }
  const t = cf,
    e = Math.floor(B0.x / t),
    a = Math.floor((B0.x + M0.w) / t),
    i = Math.floor(B0.y / t),
    r = Math.floor((B0.y + M0.h) / t);
  for (let c = e; c <= a; c++)
    for (let d = i; d <= r; d++) {
      const f = c & 1,
        h = d & 1;
      if (!f && !h) {
        A.drawImage(n, c * t, d * t, t, t);
        continue;
      }
      (A.save(),
        A.translate(c * t + (f ? t : 0), d * t + (h ? t : 0)),
        A.scale(f ? -1 : 1, h ? -1 : 1),
        A.drawImage(n, 0, 0, t, t),
        A.restore());
    }
};

var SP = function (A) {
  if (l.town || o.miniMap === !1) return;
  const n = dA.s,
    t = M0.w - n - dA.m,
    e = dA.top,
    a = n / O0.w;
  (A.save(),
    (A.globalAlpha = 0.9),
    (A.fillStyle = "#000c"),
    A.fillRect(t - 2, e - 2, n + 4, n + 4));
  const i = l.bgImg;
  if (i && i.complete && i.naturalWidth)
    if (Z0.g || mapScene.hasMap()) A.drawImage(i, t, e, n, n);
    else {
      const f = Math.round(O0.w / cf),
        h = n / f;
      for (let g = 0; g < f; g++)
        for (let u = 0; u < f; u++)
          (A.save(),
            A.translate(t + g * h + (g & 1 ? h : 0), e + u * h + (u & 1 ? h : 0)),
            A.scale(g & 1 ? -1 : 1, u & 1 ? -1 : 1),
            A.drawImage(i, 0, 0, h, h),
            A.restore());
    }
  else ((A.fillStyle = "#26301f"), A.fillRect(t, e, n, n));
  ((A.globalAlpha = 1),
    (A.strokeStyle = "#fff6"),
    (A.lineWidth = 1),
    A.strokeRect(t + B0.x * a, e + B0.y * a, Math.min(n, M0.w * a), Math.min(n, M0.h * a)));
  for (const f of l.ground)
    mA(f.it) && ((A.fillStyle = _0[f.it.r]), A.fillRect(t + f.x * a - 1, e + f.y * a - 1, 2, 2));
  for (const f of l.enemies) {
    if (f.dead) continue;
    const h = f.cls === "boss" ? 3.2 : f.cls === "elite" ? 2.4 : 1.8;
    ((A.fillStyle = f.goldBoss ? "#ffd24a" : f.cls === "boss" ? "#ff4a3a" : w0[f.series]),
      A.beginPath(),
      A.arc(t + f.x * a, e + f.y * a, h, 0, 7),
      A.fill());
  }
  l.petPos &&
    ((A.fillStyle = "#9fe36a"),
    A.fillRect(t + l.petPos.x * a - 1.5, e + l.petPos.y * a - 1.5, 3, 3));
  const r = t + v.x * a,
    c = e + v.y * a,
    d = Math.PI / 2 + ((v.dir || 0) * Math.PI) / 4;
  ((A.fillStyle = "#fff"),
    (A.strokeStyle = "#000"),
    A.beginPath(),
    A.moveTo(r + Math.cos(d) * 5, c + Math.sin(d) * 5),
    A.lineTo(r + Math.cos(d + 2.5) * 4, c + Math.sin(d + 2.5) * 4),
    A.lineTo(r + Math.cos(d - 2.5) * 4, c + Math.sin(d - 2.5) * 4),
    A.closePath(),
    A.fill(),
    A.stroke(),
    (A.strokeStyle = "#c8a45a"),
    A.strokeRect(t - 2, e - 2, n + 4, n + 4),
    (A.font = '9px "IBM Plex Mono", monospace'),
    (A.textAlign = "center"),
    (A.fillStyle = "#f3d88a"),
    A.fillText(
      l.dg
        ? l.dg.kind === "wb"
          ? "Boss tuần"
          : l.dg.d.n
        : l.tower
          ? `Tháp · tầng ${l.tower.floor}`
          : l.battlefield
            ? MapsEngine.getMap(Z0.key)?.name || "Tống Kim"
            : AA(Math.min(o.stage, d0)).n,
      t + n / 2,
      e + n + 11,
    ),
    A.restore());
};

var _8 = function (A, n, t, e, a, i) {
  if (!A || o.lowFx) return i();
  const r = H1 || 1,
    c = Math.ceil(e * r),
    d = Math.ceil(a * r);
  Xa || ((Xa = document.createElement("canvas")), (Q3 = document.createElement("canvas")));
  for (const w of [Xa, Q3])
    (w.width < c || w.height < d) &&
      ((w.width = Math.max(w.width, c)), (w.height = Math.max(w.height, d)));
  const f = Xa.getContext("2d");
  (f.setTransform(1, 0, 0, 1, 0, 0),
    (f.globalCompositeOperation = "source-over"),
    f.clearRect(0, 0, c, d),
    f.setTransform(r, 0, 0, r, -n * r, -t * r));
  const h = W;
  W = f;
  let g;
  try {
    g = i();
  } finally {
    W = h;
  }
  if (!g) return g;
  f.setTransform(1, 0, 0, 1, 0, 0);
  const u = Q3.getContext("2d");
  return (
    (u.globalCompositeOperation = "copy"),
    u.drawImage(Xa, 0, 0),
    (f.globalCompositeOperation = "multiply"),
    (f.fillStyle = A),
    f.fillRect(0, 0, c, d),
    (f.globalCompositeOperation = "destination-in"),
    f.drawImage(Q3, 0, 0),
    (f.globalCompositeOperation = "source-over"),
    h.drawImage(Xa, 0, 0, c, d, n, t, e, a),
    g
  );
};

var sf = function (A, n, t) {
  const e = QP,
    a = bA(e.f);
  if (!a.complete || !a.naturalWidth) return;
  const i = Math.floor(((l.clock || 0) * 1e3) / e.ms) % e.n,
    r = t;
  W.drawImage(a, i * e.w, 0, e.w, e.h, A - e.ax * r, n - e.h * r * 0.55, e.w * r, e.h * r);
};

var M8 = function (A, n, t, e, a, i, r = 1) {
  if (!A || !A.complete || !A.naturalWidth) return !1;
  const c = A.naturalWidth * a,
    d = A.naturalHeight * a,
    f =
      n &&
      n[2] >= 0 &&
      n[2] <= A.naturalWidth &&
      n[3] >= A.naturalHeight * 0.5 &&
      n[3] <= A.naturalHeight * 1.2,
    h = f ? n[2] * a : c / 2,
    g = f ? n[3] * a : d * 0.95;
  return (
    W.save(),
    (W.globalAlpha = r),
    W.translate(t, e),
    i && W.scale(-1, 1),
    W.drawImage(A, -h, -g, c, d),
    W.restore(),
    !0
  );
};

var ws = function (A, n) {
  const t = E0.anim && E0.anim[A] && E0.anim[A][n];
  return t ? (t.n * t.ms) / 1e3 : 0;
};

var Va = function (A, n, t, e, a, i, r, c = 1) {
  const d = E0.anim && E0.anim[A];
  if (!d) return !1;
  const f = d[n] || d.st;
  if (!f) return !1;
  const h = bA("img/a/" + f.f);
  if (!h.complete || !h.naturalWidth) return !1;
  let g = Math.floor((e * 1e3) / f.ms);
  g = ff[n] ? Math.min(g, f.n - 1) : g % f.n;
  const u = f.d >= 8 ? t : Math.floor((t * f.d) / 8);
  return (
    (W.globalAlpha = c),
    W.drawImage(h, g * f.w, u * f.h, f.w, f.h, a - f.ax * r, i - f.ay * r, f.w * r, f.h * r),
    (W.globalAlpha = 1),
    f.h * r
  );
};

var ps = function (A, n) {
  A.act !== n && ((A.act = n), (A.actT = 0));
};

var H8 = function (A, n, t) {
  if (A.hurtT > 0) { A.act = "hurt"; A.actT = Math.max(0, 0.5 - A.hurtT); return; }
  ((A.actT = (A.actT || 0) + n),
    (A.act === "at" || A.act === "hurt") &&
      A.actT >= Math.max(0.25, ws(A.animKey, A.act)) &&
      ps(A, t));
};

var L3 = function (A, n, t, e, a, i, r, c, d, f) {
  vs.push({ x: A, y: n, text: t, col: e, size: a, hp: i, barCol: r, sub: c, subCol: d, dot: f });
};

var IP = function () {
  if (!vs.length) return;
  ((W.textAlign = "center"), (W.lineJoin = "round"));
  for (const n of vs) {
    W.font = `${n.size}px "IBM Plex Mono", monospace`;
    n.tw = W.measureText(n.text).width;
    n.w = Math.max(n.tw + (n.dot ? 12 : 0), n.sub ? W.measureText(n.sub).width : 0, 44);
    const t = n.y,
      e = Math.min(n.w, 56);
    (n.hp >= 0 &&
      ((W.fillStyle = "#000c"),
      W.fillRect(n.x - e / 2 - 1, t - 6, e + 2, 6),
      (W.fillStyle = n.barCol),
      W.fillRect(n.x - e / 2, t - 5, e * E(n.hp, 0, 1), 4)),
      (W.font = `${n.size}px "IBM Plex Mono", monospace`),
      (W.lineWidth = 3),
      (W.strokeStyle = "#000c"));
    const a = t - (n.hp >= 0 ? 8 : 1),
      i = n.x + (n.dot ? 6 : 0);
    if ((W.strokeText(n.text, i, a), (W.fillStyle = n.col), W.fillText(n.text, i, a), n.dot)) {
      const r = i - n.tw / 2 - 7,
        c = a - n.size * 0.36;
      (W.beginPath(),
        W.arc(r, c, 4, 0, Math.PI * 2),
        (W.fillStyle = n.dot),
        W.fill(),
        (W.lineWidth = 1.5),
        (W.strokeStyle = "#000d"),
        W.stroke(),
        (W.lineWidth = 3),
        (W.strokeStyle = "#000c"));
    }
    if (n.sub) {
      const r = a - n.size - 2;
      ((W.font = `${n.size - 1}px "IBM Plex Mono", monospace`),
        W.strokeText(n.sub, n.x, r),
        (W.fillStyle = n.subCol || n.col),
        W.fillText(n.sub, n.x, r));
    }
  }
  vs.length = 0;
};

var rM = function (A, n, t, e, a, i) {
  ((W.fillStyle = "#000a"),
    W.fillRect(A, n, t, e),
    (W.fillStyle = i),
    W.fillRect(A, n, t * E(a, 0, 1), e));
};
