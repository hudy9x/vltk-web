// render/projectiles — shared IIFE scope; order is defined in modules.json.
var jP = 0.8;

var zP = () =>
  !(typeof so == "function" && so()) &&
  !!(
    window.matchMedia &&
    (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700)
  );

var $8 = () => (document.body.classList.contains("mob") ? jP : 1);

var B0 = { x: 0, y: 0 };

var rf = () => [
  E(v.x - M0.w / 2, 0, Math.max(0, O0.w - M0.w)),
  E(v.y - M0.h * 0.55, 0, Math.max(0, O0.h - M0.h)),
];

var cf = 1536;

var dA = { s: 92, m: 8, top: 62 };

var cM = (s, A, n = 120) =>
  s > B0.x - n && s < B0.x + M0.w + n && A > B0.y - n && A < B0.y + M0.h + n;

var lf = { cold: "rgb(250,255,0)", stun: "rgb(50,30,40)", poison: "rgb(50,128,200)" };

var QP = { f: "fx/st_stun.webp", n: 10, w: 54, h: 47, ax: 25, ay: 72, ms: 110 };

var Xa = null;

var Q3 = null;

var df = (s, A) => (A ? lf.poison : s ? lf.cold : null);

var kn = (s, A) => ((Math.round(Math.atan2(-s, A) / (Math.PI / 4)) % 8) + 8) % 8;

var ff = { at: 1, hurt: 1, die: 1 };

var Ps = {
  boss: "#ffb070",
  elite: "#8fc6ff",
  normal: "#e8dcc8",
  hero: "#fff3c0",
  pet: "#9fe36a",
  gold: "#ffd24a",
};

var vs = [];

var hf = (s) => {
  const A = [];
  return (
    s.slowT > 0 && A.push("Băng"),
    s.poison > 0 && A.push("Độc"),
    s.stun > 0 && A.push("Choáng"),
    A.length ? `(${A.join(" ")})` : ""
  );
};

var GP = (s) => `${s.curse && typeof r6 == "function" && r6(s) ? "☠ " : ""}${s.n}${hf(s)}`;

var uf = function (A, n, t) {
  const e = A ? A[5] : 0,
    a = A ? A[3] : 0,
    i = A ? A[4] : 0;
  switch (a) {
    case 1:
      return e + i;
    case 2:
      return e + n * i;
    case 3:
      return Math.max(
        0,
        e + n * i + (Math.random() < 0.5 ? Math.random() * i : (-Math.random() * i) / 2),
      );
    case 4:
      return e + Math.random() * i;
    case 5:
      return t <= 1 ? e : e + Math.abs(n - Math.floor(t / 2)) * i;
  }
  return e;
};

var Wn = function (A, n, t, e, a, i, r) {
  const c = A0.m[A];
  if (!c || (!activeCombatCast && (l.quiet || l.fx.length > mf))) return null;
  const movement = activeCombatCast && typeof t7 !== "undefined" && t7[A];
  const d = R3(A) || [
    movement ? movement[0] : c.fly ? 1 : 0,
    movement && movement[0] === 0 && c.fly ? Math.ceil(c.fly.n * c.fly.ms * K3 / 1000) : 16,
    Math.round((c.spd || 360) / K3),
    10,
    0,
    0,
    1,
    movement ? !!movement[2] : 1,
    0,
    1,
    0,
    0,
  ];
  let [f, h, g, u, w, x, p, P, _, y] = d;
  (c.fly || ((f = 0), (h = 1)), u1 && (u1.life && (h = u1.life), u1.spd && (g = u1.spd)));
  const travelLimit = movement && movement[0] && movement[0] !== 3 && movement[0] !== 4
    ? Math.max(movement[1] || 0, activeCombatCast.skill.rad || 0) * QA : 0;
  if (travelLimit && g > 0 && !(u1 && u1.life) && !R3(A)) h = Math.ceil(travelLimit / g);
  const fixedField = activeCombatCast && [362, 375].includes(+activeCombatCast.skill.id);
  if (fixedField) { f = 0; g = 0; }
  const M = !!(u1 && u1.still);
  (M && ((g = 0), (h = Math.min(h || 12, 14)), (t += 14)), (h = E(h || 12, 1, 72)));
  const B = {
    k: "jm",
    life: 1,
    m: c,
    mid: A,
    kind: f,
    lf: h,
    spd: g || 0,
    x: n,
    y: t,
    z: u * (x ? 1 : 0),
    vz: w / 1024,
    za: x / 1024,
    hz: x ? 0 : u,
    loop: !!p,
    cv: !!P,
    ae: !!_,
    cr: 10 + (y || 1) * 14,
    age: i ? -i : 0,
    ang: e,
    tgt: a || null,
    hit: !1,
    still: M,
    cx: r && r.cx,
    cy: r && r.cy,
    rad: (r && r.rad) || 0,
    spin: (r && r.spin) || 1,
    sh: (u1 && u1.sh) || 0,
    tr: [],
    travelLimit,
    traveled: 0,
  };
  return (
    (f === 3 || f === 4) &&
      ((B.cx = B.cx != null ? B.cx : v.x),
      (B.cy = B.cy != null ? B.cy : v.y),
      (B.rad = B.rad || Math.max(30, Math.hypot(n - B.cx, (t - B.cy) * 2)))),
    registerCombatMissile(B),
    !l.quiet && l.fx.length <= mf && l.fx.push(B),
    B
  );
};

var gf = function (A, n, t) {
  if (l.quiet) return;
  // Lôi Động's explosion follows the visual bolt landing, not each damage pulse.
  if (A.combat && +A.combat.skill.id === 375) return;
  const e = A.m.hit;
  !e ||
    l.fx.length > mf ||
    (l.fxQ || (l.fxQ = [])).push({ k: "boom", s: e, x: n, y: t, t: 0, life: yn(e), dir: 0 });
};

var KP = function (A) {
  if (A.hm && A.age >= A.hm) {
    if (!A.tgt || A.tgt.dead || A.tgt.hp <= 0) {
      let t = null,
        e = 700;
      for (const a of l.enemies || [])
        if (!a.dead && a.hp > 0) {
          const i = Math.hypot(a.x - A.x, a.y - A.y);
          i < e && ((e = i), (t = a));
        }
      A.tgt = t;
    }
    if (A.tgt) {
      const e =
        ((Y3(A.tgt.x - A.x, A.tgt.y - 14 - A.y) - A.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      A.ang += E(e, -0.45, 0.45);
    }
  }
  (!A.combat && A.kind === 0 && UP.has(A.mid) && A.tgt && !A.tgt.dead && ((A.x = A.tgt.x), (A.y = A.tgt.y - 14)),
    !A.combat && A.still && A.tgt && !A.tgt.dead && ((A.x = A.tgt.x), (A.y = A.tgt.y)),
    A.sh && (A.tr.push([A.x, A.y]), A.tr.length > A.sh && A.tr.shift()));
  const n = (t, e) => {
    ((A.x += Math.cos(t) * e), (A.y += (Math.sin(t) * e) / 2));
  };
  switch (A.kind) {
    case 1:
    case 7:
    case 8:
    case 100:
      n(A.ang, A.spd);
      break;
    case 5:
      if (A.tgt && !A.tgt.dead) {
        const direction = Y3(A.tgt.x - A.x, A.tgt.y - 14 - A.y);
        if (A.combat) {
          const turn = ((direction - A.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          A.ang += E(turn, -0.35, 0.35);
        } else if (Math.floor(A.age) % 8 === 0) A.ang = direction;
      }
      n(A.ang, A.spd);
      break;
    case 2:
      ((A.ang += (Math.random() - 0.5) * 0.9), n(A.ang, A.spd));
      break;
    case 3:
    case 4: {
      ((A.ang += T8 * A.spin), A.kind === 4 && (A.rad += (A.spd + 50) * T8));
      const t = A.kind === 3 && !A.combat ? v.x : A.cx,
        e = A.kind === 3 && !A.combat ? v.y : A.cy;
      ((A.x = t + Math.cos(A.ang) * A.rad), (A.y = e - 14 + (Math.sin(A.ang) * A.rad) / 2));
      break;
    }
  }
  A.za && ((A.z = Math.max(0, A.z + A.vz)), (A.vz -= A.za));
};

var RP = function (A, n) {
  const t = A.age;
  if (((A.age += n * K3), A.age < 0)) return !0;
  if (Z0.g && A.kind && A.kind !== 3 && A.kind !== 4 && !R2(A.x, A.y + 14)) return !1;
  for (let a = Math.max(0, Math.floor(t)) + 1; a <= Math.floor(A.age) && a <= A.lf; a++) KP(A);
  A.tgt && A.tgt.dead && (A.tgt.actT || 0) > 0.35 && !A.hm && ((A.tgt = null), (A.lost = !0));
  const e = A.tgt;
  return e &&
    !A.hit &&
    A.kind &&
    !A.still &&
    !(A.za && A.z > 20) &&
    Math.hypot(A.x - e.x, (A.y - (e.y - 14)) * 2) < A.cr &&
    ((A.hit = !0), gf(A, e.x, e.y - 14), A.cv)
    ? !1
    : A.age >= A.lf
      ? (!A.hit &&
          !A.hm &&
          !A.lost &&
          (!A.kind ||
            A.still ||
            A.za ||
            (A.ae &&
              (A.kind === 3 ||
                A.kind === 4 ||
                (A.tgt && Math.hypot(A.x - A.tgt.x, (A.y - A.tgt.y + 14) * 2) < 90)))) &&
          gf(A, A.x, A.y),
        !1)
      : !0;
};

var YP = function (A) {
  if (A.age < 0) return;
  const n = A.m.fly;
  if (!n) return;
  if (A.combat && +A.combat.skill.id === 375) {
    // Physical fields last 3s. Each visual bolt is a one-shot: six frames of
    // descent at 18fps (twice the old 111ms/frame), then its ground explosion.
    const elapsed = A.age / K3 - (A.lightningDelay || 0);
    if (elapsed < 0) return;
    const fall = n.n / K3, y = A.y - (A.z + A.hz) * wf;
    if (elapsed < fall) {
      Fa(n, 0, elapsed / fall * n.n * n.ms / 1e3, A.x, y, !1);
    } else {
      const hit = A.m.hit, time = elapsed - fall;
      if (hit && time < hit.n * hit.ms / 1e3) Fa(hit, 0, time, A.x, y, !1);
    }
    return;
  }
  const t = n.n,
    e = Math.max(1, Math.round(n.ms / (1e3 / K3))),
    speed = A.combat && +A.combat.skill.id === 365 ? 2 : 1,
    frame = A.loop ? Math.floor(A.age * speed / e) : Math.floor(t * A.age * speed / (A.visualLifetime || A.lf));
  // The accelerated one-shot ends visually when its frames finish. The
  // contact lifetime remains independent; never pin its last frame until expiry.
  if ((speed === 2 || A.visualLifetime) && !A.loop && frame >= t) return;
  const a = A.loop ? frame % t : Math.min(t - 1, frame),
    i = n.d > 1 ? Ds(Math.cos(A.ang), Math.sin(A.ang) / 2) : 0;
  if (A.sh && A.tr.length) {
    const r = W,
      c = r.globalAlpha;
    (A.tr.forEach((d, f) => {
      ((r.globalAlpha = (c * 0.55 * (f + 1)) / (A.tr.length + 1)),
        Fa(n, i, ((a + 0.5) * n.ms) / 1e3, d[0], d[1] - (A.z + A.hz) * wf, !1));
    }),
      (r.globalAlpha = c));
  }
  Fa(n, i, ((a + 0.5) * n.ms) / 1e3, A.x, A.y - (A.z + A.hz) * wf, !1);
};

var bs = function (A, n, t, e, a, i, r) {
  const c = a.x,
    d = a.y - 20,
    f = i.x,
    h = i.y - 14,
    g = Y3(f - c, h - d),
    u = e ? e[1] : 0,
    w = e ? e[2] : 0,
    x = R3(A),
    p = x ? x[0] !== 0 : activeCombatCast && typeof t7 !== "undefined" && t7[A] ? t7[A][0] !== 0 : !!(A0.m[A] || {}).fly,
    P = (y) => uf(e, y, t),
    _ = (y, M, B, O) => [y + Math.cos(B) * O, M + (Math.sin(B) * O) / 2];
  if (n === 8 && p) {
    for (let y = 0; y < t; y++) Wn(A, c, d, g, r, y * Math.max(3, u || 4), null);
    return;
  }
  if (n >= 8) {
    for (let y = 0; y < t; y++)
      Wn(
        A,
        f + (t > 1 ? Z(-14, 14) : 0),
        h + (t > 1 ? Z(-8, 8) : 0),
        g,
        r,
        y * Math.max(3, u || 4),
        null,
      );
    return;
  }
  switch (n) {
    case 0: {
      const y = u || 32,
        M = g + Math.PI / 2,
        [B, O] = p ? [c, d] : [f, h];
      for (let G = 0; G < t; G++) {
        const j = (G - (t - 1) / 2) * y,
          [X, $0] = _(B, O, M, j);
        Wn(A, X, $0, activeCombatCast ? g : w ? g : M, r, P(G));
      }
      return;
    }
    case 1: {
      const y = u || 24;
      for (let M = 0; M < t; M++) {
        let B, O;
        if (w) {
          const G = M % 2 ? 1 : -1,
            j = Math.ceil(M / 2);
          [B, O] = _(c, d, g + Math.PI / 2, G * j * y);
        } else [B, O] = _(c, d, g, y * M);
        Wn(A, B, O, g, r, P(M));
      }
      return;
    }
    case 2: {
      const y = (u || 2) * T8,
        [M, B] = _(c, d, g, w || 0);
      for (let O = 0; O < t; O++) Wn(A, M, B, g + (O - Math.floor(t / 2)) * y, r, P(O));
      return;
    }
    case 3: {
      for (let y = 0; y < t; y++) {
        const M = g + (y * Math.PI * 2) / t,
          [B, O] = _(c, d, M, w || 20);
        Wn(A, B, O, M, null, P(y), { cx: c, cy: d + 14 });
      }
      return;
    }
    case 4:
      for (let y = 0; y < t; y++)
        Wn(
          A,
          f + (t > 1 ? Z(-50, 50) : 0),
          h + (t > 1 ? Z(-26, 26) : 0),
          g,
          r,
          P(y) + (e ? 0 : y * 2),
        );
      return;
    default: {
      const [y, M] = n === 7 ? [c, d + 20] : [f, h],
        B = Math.min(t, 6),
        O = [];
      for (let j = 0; j < B; j++)
        for (let X = 0; X < B; X++)
          (u === 1 && B > 2 && (j - (B - 1) / 2) ** 2 + (X - (B - 1) / 2) ** 2 > (B * B) / 4) ||
            O.push([j * B + X, y + (X - (B - 1) / 2) * 32, M + (j - (B - 1) / 2) * 16]);
      const G = O.length > 20 ? O.sort(() => Math.random() - 0.5).slice(0, 20) : O;
      for (const [j, X, $0] of G)
        Wn(A, X + (B > 1 ? Z(-6, 6) : 0), $0 + (B > 1 ? Z(-4, 4) : 0), g, r, P(j));
    }
  }
};

var G3 = function (A, n, t) {
  let e = (t.id && A0.f && A0.f[t.id]) || {},
    a = A0.g && A0.g[t.id];
  const i = T[t.id],
    r = i && i.child,
    c = r && A0.g && A0.g[r];
  let d = !1;
  a &&
    a[0] === 12 &&
    c &&
    A0.f[r] &&
    A0.f[r].c &&
    ((e = Object.assign({}, A0.f[r], { pre: e.pre })), (a = c), (d = !0));
  // These parent missiles have their own fly sprites; their children only
  // describe impact FX, which must not turn a traveling attack into a static one.
  const parentMissileId = ({ 322: 326, 323: 327, 326: 326, 327: 327 })[+t.id];
  const parentMissile = parentMissileId && A0.m[parentMissileId] && A0.m[parentMissileId].fly;
  const f = parentMissile ? parentMissileId : e.c || A0.s[t.id],
    h = t.id && A0.m[f];
  // Kiếm Hoa owns its p6 charge below, including the physical area.
  // Avoid drawing the same pre-cast sheet twice.
  if (+t.id !== 1061 || !activeCombatCast) Ya(t);
  if (!h || (l.quiet && !activeCombatCast)) {
    x8(A, n, t);
    return;
  }
  if (+t.id === 368 && !t.ev2 && t.ev && t.L >= 16 && activeCombatCast) {
    const cast = activeCombatCast, onImpact = cast.onImpact;
    // Each physical sword/body pair owns a ring, independently of damage quotas.
    cast.onImpact = (target, position) => {
      if (onImpact) onImpact(target, position);
      const sprite = A0.m[27] && A0.m[27].hit;
      if (!l.quiet && sprite) (l.fxQ || (l.fxQ = [])).push({
        k: "boom", s: sprite, x: position.x, y: position.y - 14,
        t: 0, life: yn(sprite), dir: 0, cosmetic: true,
      });
    };
  }
  const g = a ? a[0] : e.form === void 0 ? 1 : e.form,
    u = E(
      !d && (t.nMis > 1 || (t.nMis === 1 && !(typeof h4 < "u" && h4[t.id])))
        ? Math.max(t.nMis, 1)
        : (a && a[6]) || e.num || 1,
      1,
      16,
    ),
    w = T[t.id],
    x = t.L || 1,
    p = (y) => (w && w.attr && w.attr[y] ? (b0(w, y, x) || [0])[0] : 0);
  ((u1 = window.NO_JMOV
    ? null
    : {
        life: p("missle_lifetime_v"),
        spd: p("missle_speed_v"),
        sh: FP[t.id] || 0,
        still: XP.has(+t.id),
      }),
    O8[t.id] && a && a[0] === 2 && (a[1] || 2) < O8[t.id] && ((a = a.slice()), (a[1] = O8[t.id])));
  const P = VP[t.id],
    _ = u1 && u1.life;
  try {
    const visualStart = l.fx.length, contactStart = (l.combatProjectiles || []).length;
    if (l.fx.length <= mf) CombatEngine.spawnAdvancedCastVisual(+t.id, A, A0.m);
    const layout = CombatEngine.advancedSkillLayout(+t.id, A, n);
    const separateImpact = CombatEngine.configureAdvancedSkillImpact(+t.id, activeCombatCast, h.hit);
    if (layout) {
      for (const placement of layout) {
        const missile = Wn(f, placement.x, placement.y, placement.angle, n);
        if (!missile) continue;
        missile.kind = placement.kind;
        if (!placement.kind) {
          missile.spd = 0;
          missile.travelLimit = 0;
        }
        if (separateImpact) missile.m = Object.assign({}, missile.m, { hit: null });
      }
    } else bs(f, g, o.lowFx && !activeCombatCast ? Math.min(u, 3) : u, a, A, n, n);
    if (+t.id === 375 && activeCombatCast) {
      let index = 0;
      for (const missile of (l.combatProjectiles || []).slice(contactStart)) {
        if (missile.combat === activeCombatCast && missile.k === "jm")
          missile.lightningDelay = (2 + index++ * 2) / K3;
      }
    }
    if (+t.id === 1069) {
      // Twice the speed must not double the old lifetime-based flight range.
      for (const missile of (l.combatProjectiles || []).slice(contactStart)) {
        if (missile.k === "jm" && missile.mid === f && !missile.travelLimit)
          missile.travelLimit = missile.spd * missile.lf / 2;
      }
    }
    if (+t.id === 1061) CombatEngine.spawnSwordFlowerCharge(activeCombatCast, A0.c && A0.c[e.pre]);
    const legacyId = ({ 322: 138, 326: 138, 323: 139, 327: 139 })[+t.id];
    const legacySprite = legacyId && A0.m[legacyId] && A0.m[legacyId].hit;
    if (legacySprite) {
      // These hit sheets are one stationary animation, not traveling sprites.
      // The hidden missiles keep their existing contact timing and damage rules.
      const emitted = new Set(l.fx.slice(visualStart).concat((l.combatProjectiles || []).slice(contactStart)));
      for (const missile of emitted) if (missile.k === "jm" && missile.mid === f)
        missile.m = Object.assign({}, missile.m, { fly: null, hit: null });
      const cast = activeCombatCast;
      if (cast) {
        const onHit = cast.onHit;
        let shown = false;
        cast.onHit = target => {
          const x = target.x, y = target.y - 14;
          const result = onHit(target);
          if (!shown) {
            shown = true;
            if (!l.quiet) (l.fxQ || (l.fxQ = [])).push({
              k: "boom", s: legacySprite, x, y, t: 0, life: yn(legacySprite), dir: 0, cosmetic: true,
            });
          }
          return result;
        };
      }
    }
  } finally {
    u1 = null;
  }
  if (P && _ && p("skill_flyevent")) {
    const y = { x: n.x, y: n.y + 6 };
    for (let M = 0; M < _; M += P.t)
      setTimeout(
        () => {
          l.quiet || bs(P.mid, P.form, P.n, null, y, n, null);
        },
        (M / K3) * 1e3,
      );
  }
  (Df[t.id] && !activeCombatCast && typeof B8 == "function" && n && n.x != null && B8(n, t, { sid: Df[t.id] }),
    e.sub &&
      !C8.has(+t.id) &&
      String(e.sub.c) !== String(f) &&
      setTimeout(() => {
        l.quiet ||
          bs(
            e.sub.c,
            e.sub.form === 3 ? 3 : 4,
            E(e.sub.n || 1, 1, 8),
            null,
            { x: n.x, y: n.y + 6 },
            n,
            null,
          );
      }, 250));
};

var K3 = 18;

var mf = 160;

var T8 = (Math.PI * 2) / 64;

var wf = 0.5;

var R3 = (s) => (A0.k && A0.k[s]) || (typeof pf < "u" && pf[s]) || null;

var FP = {
  10: 5,
  11: 5,
  32: 5,
  37: 5,
  40: 5,
  41: 5,
  267: 5,
  271: 2,
  318: 5,
  320: 5,
  322: 5,
  323: 5,
  324: 5,
  325: 5,
  368: 5,
  395: 5,
};

A0.f && A0.f[10] && (A0.f[10].c = 140);

A0.s && (A0.s[10] = 140);

var VP = { 302: { t: 30, mid: 126, n: 8, form: 3 } };

var pf = {
  179: [0, 15, 0, 15, 0, 0, 0, 0, 1, 2, 0, 0],
  188: [0, 22, 0, 10, 0, 0, 0, 0, 1, 3, 0, 0],
  195: [0, 15, 0, 10, 0, 0, 1, 1, 0, 3, 0, 0],
};

var UP = new Set([150, 179, 188, 195]);

var Df = { 351: 352 };

var u1 = null;

var Y3 = (s, A) => Math.atan2(A * 2, s);

var C8 = new Set([148]);

var XP = new Set([148]);

var O8 = { 325: 4 };
