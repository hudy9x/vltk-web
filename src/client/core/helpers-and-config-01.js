// core/helpers-and-config — shared IIFE scope; order is defined in modules.json.
var fa = function (A, n) {
  let t = 0;
  for (const a of A) t += n(a);
  let e = Math.random() * t;
  for (const a of A) if (((e -= n(a)), e <= 0)) return a;
  return A[A.length - 1];
};

var iw = function (A) {
  const n = Math.round(A[0] || 0),
    t = A[2] || 0;
  if (!(t > 0)) return `Tất cả kỹ năng: +${n} cấp`;
  const e = (typeof T < "u" && T[t]) || S.skills[t];
  return `Kỹ năng ${e ? e.n : "#" + t}: +${n} cấp`;
};

var i1 = function (A, n) {
  if (((A = Ti(A)), A === "allskill_v")) return iw(n);
  const t = S.attrDesc[A];
  return t
    ? t
        .replace(/#([a-zA-Z])([123A])([-+~%]?)/g, (e, a, i, r) => {
          const c = i === "A" ? Math.floor((n[0] || 0) / 256) : n[+i - 1] || 0;
          return a === "l"
            ? S.skills[c]
              ? S.skills[c].n
              : "#" + c
            : (r === "+" && c > 0 ? "+" : r === "~" && c > 0 ? "-" : "") + c;
        })
        .replace(/#[a-zA-Z][123A][-+~]?/g, "")
        .replace(/Kỹ năng (\d+)/, (e, a) => (S.skills[a] ? "Kỹ năng " + S.skills[a].n : e))
    : A + ": " + n.filter((e) => e).join(" / ");
};

var Jt = function (A = o && o.fac, n = o && o.sex) {
  if (E0.hero[A]) return E0.hero[A];
  const t = I[A];
  if (!t) return null;
  const e = vA.filter((i) => i.series === t.series),
    a = e.find((i) => hn(i, n) && i.key in Zt) || e.find((i) => hn(i, n)) || e[0];
  return n && !e.some((i) => Zt[i.key] === 1) ? E0.hero.emei : E0.hero[a.key];
};

var m5 = function () {
  const A =
    o.mainLock && o.main && o.main !== "basic" ? o.main : typeof l < "u" && l.P && l.P.wantId;
  return j1(T[A]);
};

var o1 = function (A) {
  const n = m5();
  if (n !== null) return Ur(A) === n;
  const t = I[o.fac];
  return !t || t.wcode < 0 || t4({ weapon: A }) === t.wcode;
};

var Kr = function (A) {
  const n = j1(T[A.starter]);
  if (n !== null) return n === -1 ? [0, 6] : n >= 100 ? [1, n - 100] : [0, n];
  const t = A.wcode >= 0 ? A.wcode : 0;
  return t === 7 ? [1, 0] : [0, t === 9 ? 6 : t];
};

var w5 = function () {
  const A = m5();
  if (A !== null) return A === -1 ? [0, 6] : A >= 100 ? [1, A - 100] : [0, A];
  const n = I[o.fac],
    t = n && n.wcode >= 0 ? n.wcode : 0;
  return t === 7 ? [1, N0(0, 2)] : [0, t === 9 ? 6 : t];
};

var j2 = function (A) {
  const n = r0[A];
  if (!n) return 0;
  if (n.s !== void 0) return n.s;
  if (n._s !== void 0) return n._s;
  const t = n.rmax || [],
    e = Math.max(...t),
    a = t.map((i, r) => (i === e ? r : -1)).filter((i) => i >= 0);
  return (n._s = a.length === 1 ? Pw[a[0]] : Math.abs(+A || 0) % 5);
};

var p5 = function (A) {
  const n = [0, 0, 0, 0, 0];
  for (const t of A.m) n[j2(t)]++;
  return n;
};

var S = window.JX;

var E0 = window.JW;

var m = (s) => document.querySelector(s);

var Z = (s, A) => s + Math.random() * (A - s);

var N0 = (s, A) => Math.floor(s + Math.random() * (A - s + 1));

var C0 = (s) => s[Math.floor(Math.random() * s.length)];

var E = (s, A, n) => Math.max(A, Math.min(n, s));

var QA = 0.81;

var ow = (s, A, n, t) => Math.hypot(n - s, (t - A) * 2) / QA;

var q0 = (s, A) => ow(s.x, s.y, A.x, A.y);

var q = (s) => {
  if (((s = Math.round(+s || 0)), Math.abs(s) < 1e4)) return s.toLocaleString("vi-VN");
  const n = s / 1e4;
  return (
    (Math.abs(n) < 100
      ? (Math.round(n * 10) / 10).toLocaleString("vi-VN")
      : Math.round(n).toLocaleString("vi-VN")) + " vạn"
  );
};

var F = (s) => {
  s = Math.round(s);
  const A = Math.abs(s);
  return A < 1e4
    ? "" + s
    : A < 1e6
      ? (s / 1e3).toFixed(A < 1e5 ? 1 : 0) + "k"
      : A < 1e9
        ? (s / 1e6).toFixed(2) + "M"
        : (s / 1e9).toFixed(2) + "B";
};

var D = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (A) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[A],
  );

var g0 = S.series;

var w0 = ["#f3d35b", "#6fd46a", "#5fb8ff", "#ff6a3a", "#c8965a"];

var Wt = { 0: 1, 1: 4, 4: 2, 2: 3, 3: 0 };

var y1 = (s, A) => s >= 0 && A >= 0 && Wt[s] === A;

var Q0 = ["phys", "poison", "cold", "fire", "light"];

var D5 = { phys: "Vật lý", poison: "Độc", cold: "Băng", fire: "Hỏa", light: "Lôi" };

var Hi = { phys: "#f0e6d0", poison: "#8fe34a", cold: "#7fd0ff", fire: "#ff7a2a", light: "#d9b6ff" };

var Rr = {
  phys: "physicsdamage_v",
  poison: "poisondamage_v",
  cold: "colddamage_v",
  fire: "firedamage_v",
  light: "lightingdamage_v",
};

var rw = {
  phys: "addphysicsdamage_v",
  poison: "addpoisondamage_v",
  cold: "addcolddamage_v",
  fire: "addfiredamage_v",
  light: "addlightingdamage_v",
};

var P5 = {
  phys: "physicsres_p",
  poison: "poisonres_p",
  cold: "coldres_p",
  fire: "fireres_p",
  light: "lightingres_p",
};

var v5 = {
  poison: "poisonenhance_p",
  cold: "coldenhance_p",
  fire: "fireenhance_p",
  light: "lightingenhance_p",
};

var cw = 95;

var Yr = 75;

var Fr = 2;

var Vr = 2;

var b5 = 95;

var lw = 40;

var y5 = 2;

var k5 = 5;

var dw = 5;

var T_ = 4;

var C_ = 1;

var fw = 1;

var hw = 1;

var uw = 0;

var z2 = 5;

var x5 = 1;

var Q2 = Math.min(200, S.exp.length);

var O_ = 200;

var G2 = () => Q2;

var v0 = () => (typeof o < "u" && o && o.rw && o.rw.stat ? Math.min(10, o.rw.stat.reborn || 0) : 0);

var $i = 200;

var GA = () => o.lvl + $i * v0();

var ha = Object.fromEntries(S.attr.map((s, A) => [s, A]));

var gw = {
  metalskill_v: "addphysicsmagic_v",
  earthskill_v: "addpoisonmagic_v",
  woodskill_v: "addcoldmagic_v",
  waterskill_v: "addfiremagic_v",
  fireskill_v: "addlightingmagic_v",
};

var Ti = (s) => gw[s] || s;

var vA = S.factions.filter((s) => s.skills && s.skills.length);

var I = Object.fromEntries(vA.map((s) => [s.key, s]));

var KA = 10;

for (let s = 0; s < 5; s++)
  I["vo" + s] = {
    key: "vo" + s,
    n: "Vô Môn Phái",
    series: s,
    skills: [],
    wcode: -1,
    id: -1,
    novice: !0,
  };

var ht = () => !!(o && I[o.fac] && I[o.fac].novice);

var Zt = { shaolin: 0, emei: 1, cuiyan: 1 };

var hn = (s, A) => !(s.key in Zt) || Zt[s.key] === (A || 0);

var T = S.skills;

if (window.SK_STD)
  for (const s in window.SK_STD) {
    const A = T[s],
      n = window.SK_STD[s];
    if (!A || !n) continue;
    const t = n.m || {};
    ((A.attr = n.a || {}),
      t.req > 0 && (A.req = t.req),
      t.max > 0 && (A.max = t.max),
      t.radius > 0 && (A.radius = t.radius),
      t.form != null && (A.form = t.form),
      t.childN > 0 && (A.childN = t.childN),
      t.eqt != null && (A.eqt = t.eqt),
      (A.p1 = t.p1 || 0));
  }

if (
  (T[275] && T[275].attr && delete T[275].attr.lifemax_yan_v,
  T[357] &&
    T[357].attr &&
    (T[357].attr.skill_misslenum_v = [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    ].map((s) => [s, 0, 0])),
  typeof window < "u" && window.SK_RAD_VNG)
)
  for (const s in window.SK_RAD_VNG) {
    const A = T[s],
      n = window.SK_RAD_VNG[s];
    !A ||
      !A.attr ||
      (n
        ? (A.attr.skill_attackradius = n.map((t) => [t, 0, 0]))
        : delete A.attr.skill_attackradius);
  }

S.attrDesc && !S.attrDesc.add_damage_p && (S.attrDesc.add_damage_p = "Lực công kích: #d1+%");

for (const [s, A] of [
  [45, "Tích Lịch Đơn"],
  [77, "Nga My Kiếm Pháp"],
  [79, "Nga My Chưởng Pháp"],
  [124, "Đả Cẩu Bổng"],
])
  T[s] && (T[s].n = A);

{
  const s = (t, e) => {
      let a = 1;
      for (; a < t.length - 1 && e > t[a][0];) a++;
      const [i, r] = t[a - 1],
        [c, d] = t[a];
      return Math.floor(c === i ? d : ((d - r) * (e - i)) / (c - i) + r);
    },
    A = T[150],
    n = [
      [1, 26],
      [30, 102],
      [33, 109],
      [35, 134],
      [38, 138],
      [41, 145],
      [42, 163],
      [43, 165],
    ];
  A &&
    A.attr &&
    !A.attr.attackspeed_v &&
    (A.attr.attackspeed_v = Array.from(
      { length: Math.max(30, (A.attr.adddefense_v || []).length) },
      (t, e) => [s(n, e + 1), 0, 0],
    ));
}

for (const s of vA) {
  const A = s.skills
    .map((e) => T[e])
    .filter(
      (e) =>
        e &&
        e.enemy &&
        [
          "physicsenhance_p",
          "physicsdamage_v",
          "poisondamage_v",
          "colddamage_v",
          "firedamage_v",
          "lightingdamage_v",
        ].some((a) => e.attr[a]),
    )
    .sort((e, a) => e.req - a.req || e.id - a.id);
  A.length && (s.starter = A[0].id);
  const n = s.skills
      .map((e) => T[e])
      .filter((e) => e && !e.enemy && e.attr.addphysicsdamage_p)
      .sort((e, a) => e.req - a.req || e.id - a.id)[0],
    t = n && n.attr.addphysicsdamage_p[0];
  s.wcode = Array.isArray(t) && [0, 1, 2, 3, 4, 5, 7, 9].includes(t[2]) ? t[2] : -1;
}

var B5 = {
  "-1": "Tay không",
  0: "Kiếm",
  1: "Đao",
  2: "Côn",
  3: "Thương",
  4: "Song Chùy",
  5: "Song Đao",
  100: "Phi Tiêu",
  101: "Phi Đao",
  102: "Tụ Tiễn",
};

var Ur = (s) => (s ? (s.d === 1 ? 100 + s.k : s.k === 6 ? -1 : s.k) : -1);

var Xr = () => Ur(o.eq && o.eq.weapon);

var j1 = (s) =>
  s && s.eqt != null && s.eqt !== -2 && s.attr && s.attr.physicsenhance_p ? s.eqt : null;

var Ci = (s, A = Xr()) => j1(s) === null || j1(s) === A;

var mw = /^(skill_|missle_)/;

var ww = 10;

var b0 = (s, A, n) => {
  const t = s.attr[A];
  if (!t) return null;
  const e = t.length,
    a = t[e - 1],
    i = (f) => (Array.isArray(f) ? f : [f, 0, 0]);
  if (n <= e || e < 2 || mw.test(A)) return i(t[E(n, 1, e) - 1]);
  const r = Math.min(ww, n - e),
    c = i(t[e - 2]);
  return i(a).map((f, h) => (h === 1 && A.startsWith("poison") ? f : f + (f - c[h]) * r));
};

var pw = [
  "physicsenhance_p",
  "physicsdamage_v",
  "poisondamage_v",
  "colddamage_v",
  "firedamage_v",
  "lightingdamage_v",
];

var UA = (s) => !!(s && s.enemy && !s.aura && pw.some((A) => s.attr[A]));

var k0 = E0.zones;

var r0 = E0.mon;

for (const s in E0.anim || {})
  for (const A in E0.anim[s]) {
    const n = E0.anim[s][A];
    n &&
      (n.ax < 0 || n.ay < 0 || n.ax > n.w || n.ay > n.h * 1.2) &&
      ((n.ax = n.w / 2), (n.ay = n.h - 2));
  }

var Kn = 10;

var Oi = 4;

var Dw = ["phys", "poison", "cold", "fire", "light"];

var Pw = [3, 0, 4, 2, 1];

var vw = [1, 4, 3, 0, 2];

var d0 = k0.length * Kn;

var Jr = 0.35;

var un = [
  ["weapon", "Vũ khí"],
  ["armor", "Áo"],
  ["helm", "Mũ"],
  ["belt", "Đai lưng"],
  ["boot", "Giày"],
  ["cuff", "Hộ uyển"],
  ["amulet", "Dây chuyền"],
  ["ring1", "Nhẫn 1"],
  ["ring2", "Nhẫn 2"],
  ["pendant", "Ngọc bội"],
  ["horse", "Ngựa"],
];

var Wr = Object.fromEntries(un);

var rA = [
  "weapon",
  "weapon",
  "armor",
  "ring",
  "amulet",
  "boot",
  "belt",
  "helm",
  "cuff",
  "pendant",
  "horse",
];

var bw = ["sword", "blade", "wand", "spear", "hammer", "dualblades"];

var yw = ["darts", "knife", "crossbow"];

var kw = {
  armor: "armor",
  ring: "ring",
  amulet: "necklace",
  boot: "boot",
  belt: "belt",
  helm: "helm",
  cuff: "cuff",
  pendant: "pendant",
};

var Zr = ["Thường", "Xanh", "Hiếm", "Tím", "Hoàng Kim", "Bạch Kim"];

var _0 = ["#e8e0d0", "#6aa8ff", "#ff9a3c", "#c77bff", "#ffcc00", "#9fe8ff"];

var K2 = 60;

var Ae = 60;

var r1 = [100, 200, 500];

var _5 = (s) => K2 + Ae * Math.min(r1.length, (s && s.invX) | 0);

Object.defineProperty(globalThis, "INV_MAX", {
  configurable: !0,
  get: () => {
    try {
      return _5(o);
    } catch {
      return K2;
    }
  },
});
