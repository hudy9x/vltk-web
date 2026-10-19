// combat/skills — shared IIFE scope; order is defined in modules.json.
var z = (s, A, n = 0) => (s[A] ? s[A][n] : 0);

var V2 = { 0: 2, 2: 1, 1: 3, 3: 4, 4: 0 };

var s4 = (s, A) => s >= 0 && A >= 0 && V2[s] === A;

var G5 = {
  helm: ["armor", "amulet"],
  armor: ["ring2", "belt"],
  belt: ["pendant", "cuff"],
  weapon: ["amulet", "armor"],
  boot: ["weapon", "helm"],
  cuff: ["boot", "ring1"],
  amulet: ["belt", "ring2"],
  ring1: ["weapon", "helm"],
  ring2: ["cuff", "pendant"],
  pendant: ["boot", "ring1"],
};

var i4 = (s) => !!s && s.cost === 2;

var ji = (s) => (s.costLife ? l.life - s.cost >= l.P.life * 0.25 : l.mana >= s.cost);

var o4 = (s) => {
  s.costLife ? (l.life = Math.max(1, l.life - s.cost)) : (l.mana -= s.cost);
};

var zi = (s) => {
  const A = (o.sk && o.sk[s]) || 0;
  return A ? A + z1(+s) : 0;
};

var K5 = /^(skill_|missle_|addskilldamage)/;

var ne = null;

var R5 = (s) => s === ne || p0(s);

var Yw = 1.8;

var Fw = { 20: 54, 40: 27, 138: 40, 181: 54, 392: 27 };

var r4 = (s, A) => {
  const n = A ? b0(s, "skill_misslenum_v", A) : null;
  return Math.max(1, n ? n[0] : s.childN || 1);
};

var Y5 = (s, A) => {
  const n = A && s.attr && s.attr.skill_misslesform_v ? b0(s, "skill_misslesform_v", A) : null;
  return n ? n[0] : s.form;
};

var l1 = {
  302: { n: "Truy Tinh Trục Điện", k: 0.15, el: "poison", max: 8 },
  339: { n: "Ngân Đao Xạ Nguyệt", col: 1, sid: 340, k: 0.8, el: "phys", max: 3 },
  336: { n: "Băng Tâm Tuyết Liên", col: 1, sid: 382, k: 0.25, el: "cold", max: 3 },
  353: { n: "Thiên Canh Độc Thủ", sid: 354, k: 0.3, el: "phys", poison: 0.1, max: 3 },
  362: { n: "Nghiệp Hỏa Phần Thành", sid: 363, k: 1, el: "fire", max: 5 },
  357: { n: "Long Chiến Vu Dã", col: 1, k: 1, el: "fire", max: 2 },
  328: { n: "Ngọc Tuyền Tẩy Trần", sid: 329, self: !0, k: 0.35, el: "phys", max: 3 },
  380: {
    n: "Kim Đỉnh Phật Quang",
    sid: 331,
    k: 0.35,
    el: "cold",
    max: 4,
    rays: (s) => E(1 + Math.floor((s - 11) / 3), 1, 4),
  },
  337: { n: "Phong Tuyết Băng Thiên", sid: 338, k: 0.35, el: "cold", max: 3 },
  355: { n: "Tinh Không Phá", col: 1, sid: 383, k: 0.35, el: "poison", max: 3 },
  375: { n: "Bình Địa Hám Lôi", col: 1, k: 0.35, el: "light", max: 3 },
  372: { n: "Khiếu Phong Tam Liên Kích", col: 1, sid: 373, k: 0.35, el: "light", max: 3 },
};

var Vw = Array.from({ length: 20 }, (s, A) => [4 + 7 * (A + 1), 0, 296 + 59 * (A + 1)]);

for (const s of [163, 215, 368])
  l1[s] = {
    n: "Thái Cực Kiếm Ý",
    k: 0,
    stun: 30,
    max: 3,
    self: !0,
    fx: "176",
    at16: {
      n: "Huyền Nhất Vô Tượng",
      el: "light",
      max: 3,
      col: 1,
      sid: 162,
      fx: "27",
      self: !1,
      castFx: "176",
      tab: { lightingdamage_v: Vw },
    },
  };

var c4 = {
  302: 301,
  339: 340,
  336: 382,
  353: 354,
  362: 363,
  357: 389,
  328: 329,
  380: 331,
  337: 338,
  355: 383,
  375: 387,
  372: 373,
};

if (typeof window < "u" && window.SK_EV) {
  for (const A in c4) {
    const n = l1[A],
      t = window.SK_EV[c4[A]];
    n && t && t.a && ((n.sid = c4[A]), (n.tab = t.a), (n.std = 1));
  }
  const s = window.SK_EV[162];
  if (s && s.a) for (const A of [163, 215, 368]) l1[A] && l1[A].at16 && (l1[A].at16.tab = s.a);
}

l1[357] && (l1[357].fxOnly = 1);

var l4 = {
  skill_startevent: "s",
  skill_collideevent: "c",
  skill_flyevent: "f",
  skill_vanishedevent: "v",
};

var Uw = (s, A, n) => {
  for (const t in l4) {
    const e = s && s.attr && s.attr[t] && b0(s, t, n);
    if (e && +e[2] == +A) return e[0] === 1;
  }
  return null;
};

var d4 = {};

var Xw = (s, A) =>
  A._sk ||
  (A._sk = Object.assign({}, T[s], {
    id: A.sid || s,
    phys: 0,
    aura: 0,
    _ev2: 1,
    attr: Object.assign({}, A.tab),
  }));

var Jw = (s) => {
  const A = s && s.ev && l1[s.id];
  return !A || (A.sid && !A.at16 && Uw(T[s.id], A.sid, s.L) === !1)
    ? null
    : A.at16 && s.L >= 16
      ? A._16 || (A._16 = Object.assign({}, A, A.at16, { stun: A.stun }))
      : A;
};

var F5 = (s) => {
  if (!s || !s.ev) return [];
  const A = Jw(s),
    n = Tw(T[s.id], s.L);
  return A ? [A].concat(n) : n;
};

var Ww = (s, A) =>
  ((A.tab
    ? Object.values(S5(s, A)).reduce((t, e) => t + e, 0) / Math.max(1, s.tot)
    : (A.k + (A.poison || 0)) * (A.sid ? I5(s.id, A.sid) : 1)) *
    (A.chance || 1) *
    Math.min(Qi(s, A), 2.2)) /
  Li(s);

var Zw = (s) => F5(s).reduce((A, n) => A + (n.fxOnly ? 0 : Ww(s, n)), 0);

var Qi = (s, A) => (A.rays ? A.rays(s.L) : A.max);

var A7 = ["skill_startevent", "skill_collideevent", "skill_flyevent", "skill_vanishedevent"];

var f4 = (s) => {
  let A = 0;
  for (const n of A7) {
    const t = (s.attr || {})[n];
    if (!t) continue;
    const e = t.findIndex((a) => a && a[0] === 1);
    e >= 0 && (A = A ? Math.min(A, e + 1) : e + 1);
  }
  return A;
};

var n7 = (s, A) => {
  const n = f4(s);
  return !!n && A >= n;
};

var t7 = {
  216: [1, 360, 0, 4],
  66: [0, 300, 0, 4],
  77: [0, 0, 0, 6],
  86: [0, 0, 1, 4],
  61: [1, 496, 0, 1],
  272: [1, 480, 1, 1],
  317: [4, 3e4, 0, 3],
  135: [0, 0, 0, 6],
  136: [1, 640, 0, 1],
  405: [0, 0, 1, 3],
  219: [1, 0, 0, 4],
  404: [0, 0, 0, 0],
  406: [0, 0, 0, 3],
  221: [1, 180, 1, 1],
  222: [1, 280, 0, 1],
  224: [5, 300, 0, 2],
  220: [0, 240, 1, 1],
  225: [0, 0, 0, 1],
  407: [0, 0, 0, 3],
  326: [1, 768, 1, 1],
  327: [1, 576, 0, 1],
  408: [0, 0, 1, 5],
  35: [7, 960, 1, 3],
  116: [1, 450, 1, 1],
  37: [1, 480, 1, 1],
  38: [0, 0, 0, 3],
  67: [5, 576, 1, 1],
  106: [0, 0, 1, 2],
  151: [100, 960, 0, 1],
  96: [0, 0, 0, 1],
  149: [1, 512, 0, 1],
  152: [100, 1024, 1, 1],
  30: [1, 240, 1, 1],
  31: [1, 496, 1, 1],
  32: [1, 496, 1, 1],
  190: [3, 480, 0, 3],
  33: [0, 0, 0, 3],
  34: [1, 496, 1, 2],
  163: [0, 0, 0, 3],
  165: [1, 640, 0, 1],
  68: [1, 384, 1, 1],
  2: [1, 640, 1, 1],
  101: [0, 0, 0, 2],
  191: [1, 512, 1, 1],
  3: [1, 320, 1, 1],
  4: [0, 0, 0, 5],
  142: [1, 512, 0, 1],
  186: [0, 0, 0, 3],
  6: [1, 360, 1, 1],
  7: [1, 416, 0, 2],
  8: [1, 0, 1, 2],
  12: [0, 0, 0, 3],
  9: [0, 0, 1, 2],
  10: [0, 0, 0, 8],
  146: [1, 768, 1, 1],
  147: [1, 480, 0, 1],
  45: [1, 496, 1, 1],
  46: [1, 496, 1, 1],
  47: [1, 496, 1, 1],
  48: [1, 160, 1, 1],
  166: [5, 1600, 1, 1],
  168: [5, 1280, 1, 1],
  54: [1, 240, 1, 1],
  57: [1, 400, 1, 3],
  55: [0, 0, 0, 2],
  56: [1, 288, 1, 1],
  69: [1, 72, 1, 1],
  58: [0, 0, 0, 4],
  169: [1, 192, 0, 1],
  171: [0, 0, 1, 1],
  24: [1, 320, 1, 1],
  25: [1, 320, 0, 1],
  26: [0, 0, 0, 3],
  28: [0, 0, 0, 4],
  29: [1, 320, 1, 1],
  110: [1, 128, 0, 1],
  173: [0, 0, 0, 4],
  175: [1, 192, 0, 1],
  14: [1, 300, 1, 1],
  17: [0, 0, 0, 2],
  15: [1, 480, 1, 1],
  16: [1, 1085, 0, 2],
  18: [0, 4, 1, 2],
  178: [1, 1085, 0, 4],
  181: [0, 12, 1, 2],
};

var U2 = (s) => (s && t7[s.child]) || null;

var I_ = (s) => (s && s.form === 1 ? U2(s) : null);

var e7 = {
  128: 3,
  165: 1,
  327: 7,
  336: 2,
  341: 1,
  342: 1,
  408: 7,
  556: 21,
  575: 3,
  581: 2,
  970: 2,
  1031: 2,
  1046: 3,
  1057: 8,
  1064: 4,
  1071: 1,
  1085: 8,
  1086: 6,
  1087: 7,
  1088: 7,
  1099: 4,
  1100: 4,
  1148: 8,
  1160: 1,
};

var a7 = (s, A) =>
  Array.from(
    { length: Math.max(1, s) },
    (n, t) => ((Math.floor(s / 2) - t) * A * Math.PI * 2) / 64,
  );

var s7 = 0;

setTimeout(function s() {
  if (typeof o > "u" || !o || !o.fac) {
    setTimeout(s, 5e3);
    return;
  }
  o.engV572 ||
    !o.attr ||
    (o.attr.eng | 0) < 50 ||
    ((o.engV572 = 1),
    typeof C == "function" &&
      C(
        `<b class="up">⚖ Cập nhật cân bằng:</b> Nội công nay <b>chỉ tăng nội lực</b> (như VNG gốc), không còn nhân sát thương chiêu. Bạn đang có ${o.attr.eng} điểm Nội công — bấm <b>Tẩy Tủy</b> (thẻ Võ công, miễn phí) để chia lại vào Sinh khí / Thân pháp / Sức mạnh.`,
      ),
    typeof $ == "function" && $());
}, 6e3);

var N_ = {
  10: 2,
  20: 2,
  11: 1.1,
  19: 0.9,
  271: 0.6,
  318: 1.95,
  319: 2,
  321: 2,
  29: 1.8,
  30: 1.7,
  34: 1.75,
  31: 2,
  35: 2,
  37: 2,
  40: 1.6,
  32: 2,
  41: 2,
  324: 1.9,
  322: 2,
  323: 2,
  325: 2,
  45: 0.6,
  347: 1.6,
  303: 2,
  47: 0.85,
  50: 0.75,
  54: 0.6,
  343: 2,
  345: 2,
  349: 2,
  58: 0.75,
  249: 0.5,
  341: 0.5,
  339: 0.7,
  63: 2,
  65: 1.15,
  68: 2,
  384: 1.9,
  71: 1.2,
  74: 1.05,
  353: 1.75,
  355: 2,
  80: 0.5,
  85: 0.55,
  82: 0.5,
  385: 0.7,
  88: 0.55,
  91: 0.55,
  328: 0.75,
  380: 0.5,
  99: 1.05,
  102: 0.6,
  113: 0.55,
  108: 1.1,
  336: 1.5,
  337: 0.7,
  119: 0.55,
  122: 0.5,
  125: 0.5,
  128: 0.5,
  357: 0.5,
  135: 1.35,
  145: 2,
  138: 2,
  141: 1.45,
  142: 1.45,
  148: 1.8,
  361: 1.85,
  362: 2,
  153: 0.5,
  155: 0.65,
  158: 0.65,
  164: 0.5,
  165: 0.5,
  267: 0.95,
  365: 0.5,
  368: 0.5,
  162: 0.5,
  169: 0.5,
  179: 0.5,
  172: 0.7,
  176: 0.5,
  182: 0.5,
  372: 0.7,
  375: 0.8,
};

var h4 = {
  29: [1, 10, "s"],
  30: [2, 10, "s"],
  31: [1, 8, "s"],
  32: [1, 5, "s"],
  34: [1, 10, "s"],
  35: [3, 8, "s"],
  37: [1, 8, "s"],
  41: [4, 4, "s"],
  271: [2, 5, "s"],
  318: [2, 5, "p"],
  322: [1, 5, "w3"],
  323: [5, 3, "p"],
  324: [1, 5, "s"],
  325: [1, 4, "f3"],
};

var i7 = (s) =>
  s[2] === "p"
    ? { k: "line", n: 1, len: 96, pierce: !0, area: 0 }
    : s[2] === "w3"
      ? { k: "wall", n: 3, len: 72, pierce: !1, area: 0, w: 54 }
      : s[2] === "f3"
        ? { k: "fan", n: 3, len: 72, pierce: !1, area: 0, half: 0.36 }
        : null;

var o7 = (s) => (s[0] * 18) / (s[0] * s[1] + 1);

var r7 = new Set([
  2, 11, 17, 29, 30, 31, 32, 34, 35, 37, 38, 41, 139, 142, 147, 216, 218, 219, 220, 221, 222, 223,
  224, 225, 267, 271, 272, 323, 324, 325, 327, 368, 404, 405, 406, 407, 408,
]);

var Gi = {};

var Da = (s) =>
  (s.base || []).reduce((A, [n, t, e]) => A + (n === 28 || n === 29 ? t : 0), 0) * ua(s);

var u4 = (s, A) => {
  const n = (s.req || []).find((t) => t[0] === 38);
  return !n || n[1] < 0 || n[1] === (A || 0);
};

var k1 = (s) => u4({ req: s }, o.sex);

var mn = (s) => k1(s.req);

var V5 = 0.7;

var Ki = (s) => (s ? `${F(Math.round(s.tot * 0.85))} – ${F(Math.round(s.tot * 1.15))}` : "—");

var xt = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190];

var c7 = [
  130, 376, 626, 871, 1195, 1711, 3433, 5432, 7235, 8289, 9807, 11292, 12029, 13018, 14077, 14729,
  15396, 16159, 16944,
];

var l7 = {
  shaolin: [
    26, 121, 225, 372, 942, 1741, 2340, 2621, 2908, 3586, 4307, 5272, 6572, 7796, 8338, 8800, 9261,
    9722, 10182,
  ],
  tianwang: [
    16, 121, 136, 158, 195, 264, 400, 562, 739, 781, 860, 902, 943, 985, 1597, 2172, 2257, 2341,
    10362,
  ],
  tangmen: [
    42, 177, 318, 469, 662, 1415, 2042, 2829, 3999, 4420, 5786, 5786, 7479, 9367, 9825, 10283,
    10741, 11199, 11658,
  ],
  wudu: [
    22, 201, 336, 445, 549, 2233, 4807, 8077, 11681, 12733, 13559, 14535, 15269, 16006, 16743,
    17482, 18222, 18963, 19704,
  ],
  emei: [
    41, 340, 844, 1153, 1595, 2177, 2995, 4212, 5045, 5937, 6736, 7621, 8400, 9332, 9973, 10383,
    11037, 11452, 11890,
  ],
  cuiyan: [
    12, 409, 678, 1056, 1480, 1646, 2134, 2917, 3794, 4237, 4422, 4666, 4927, 5163, 5407, 5699,
    5935, 6128, 6557,
  ],
  gaibang: [
    15, 220, 406, 589, 1132, 1995, 2784, 2911, 3098, 3821, 4448, 5189, 5963, 6649, 7390, 8147, 8704,
    9289, 9642,
  ],
  tianren: [
    15, 312, 531, 794, 1010, 1058, 1590, 2031, 2126, 2489, 2568, 2725, 2881, 3038, 3195, 3352, 3510,
    3667, 3824,
  ],
  wudang: [
    14, 179, 685, 1692, 1945, 2637, 3837, 4962, 6225, 7277, 8294, 9247, 9753, 10166, 10547, 10922,
    11300, 11679, 12059,
  ],
  kunlun: [
    7, 285, 531, 719, 891, 1597, 6847, 12929, 17293, 18850, 20108, 20820, 21524, 22220, 22909,
    23590, 24264, 24931, 25592,
  ],
};

var d7 = 10;

var te = (s) => !!s && /bẫy/i.test(s.d || "");

var X2 = { 32: "str", 33: "dex", 34: "vit", 35: "eng" };

var U5 = 10;

var X5 = { 32: "Sức mạnh", 33: "Thân pháp", 34: "Sinh khí", 35: "Nội công" };

var J2 = (s) => (s >= 0 ? "+" : "") + (s * 100).toFixed(1) + "%";

var g4 = (s) => (s >= 0 ? "+" : "") + Math.round(s);

var m4 = (s) => !!s && [90, 150].includes(s.tier) && !(typeof SA == "function" && SA(s.id));

var W2 = (s) => !!s && (o.lvl >= s.req || (s.tier === 90 && v0() > 0));

var f7 = [
  [1, 19],
  [20, 39],
  [40, 59],
  [60, 79],
  [80, 999],
];

var w4 = 0.82;

var h7 = 0.75;

var u7 = 0.9;

var J5 = 0.75;

Kw();

var Pa = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 135, 150, 175, 200];

var g7 = 1;

var m7 = {
  shaolin: [
    0.99, 1.3, 1.23, 0.89, 1.5, 0.79, 1.1, 1.98, 1.34, 1.15, 1.17, 0.82, 0.66, 0.48, 0.37, 0.31,
  ],
  tianwang: [
    1.06, 1.32, 1.82, 1.8, 1.47, 2.15, 2.27, 5.73, 5.09, 5.05, 6.63, 2.85, 2.65, 2.01, 1.6, 0.62,
  ],
  tangmen: [
    0.66, 1.39, 1.91, 1.71, 2.15, 3.39, 1.79, 1.44, 1.59, 1.12, 2.21, 0.74, 0.53, 0.41, 0.76, 1.43,
  ],
  wudu: [
    1.5, 1.19, 1.99, 1.47, 1.65, 1.77, 1.7, 1.47, 1.96, 1.82, 1.93, 0.99, 0.31, 0.18, 0.17, 0.72,
  ],
  emei: [
    0.54, 0.36, 0.31, 0.38, 0.2, 0.27, 0.27, 0.26, 0.33, 0.25, 0.21, 0.5, 0.54, 0.84, 0.69, 1.2,
  ],
  cuiyan: [
    1.25, 1.49, 1.38, 2.02, 0.97, 1.09, 1.41, 1.45, 2.04, 1.53, 1.35, 2.82, 3.46, 7.14, 6.41, 8,
  ],
  gaibang: [
    1.48, 1.36, 1.81, 1.94, 0.5, 0.72, 1.04, 1.62, 3.54, 3.34, 3.42, 2.69, 2.52, 2.02, 2.35, 5.63,
  ],
  tianren: [
    0.74, 1.57, 2.02, 1.66, 1.37, 1.3, 1.23, 1.45, 1.34, 1.57, 1.59, 1.16, 1.29, 1.22, 1.12, 0.59,
  ],
  wudang: [
    0.63, 0.47, 0.17, 0.23, 0.18, 0.21, 0.33, 0.32, 0.27, 0.15, 0.15, 0.25, 0.25, 0.25, 0.25, 0.12,
  ],
  kunlun: [
    1.69, 1.29, 0.94, 1.09, 1.68, 1.45, 2.53, 1.58, 1.73, 1.59, 1.69, 3.06, 3.27, 2.99, 2.83, 1.17,
  ],
};

var Z2 = function (A) {
  const n = T[A];
  !n ||
    !n.book ||
    (o.sk[A] || 0) > 0 ||
    (o.bkOk && o.bkOk[A]) ||
    (U("misc", n.book, -1),
    ((o.bkOk || (o.bkOk = {}))[A] = 1),
    C(`📖 Lĩnh ngộ <b style="color:#ffd24a">${D(n.n)}</b> (dùng 1 ${Fi[n.book]})`));
};

var Ri = function () {
  const A = Object.values(o.attr).reduce((t, e) => t + e, 0),
    n = Object.keys(o.sk).reduce(
      (t, e) => t + (m4(T[e]) ? 0 : o.sk[e]),
      0,
    );
  J(
    `<h3>Tẩy Tủy</h3><p class="desc">Trả lại điểm đã cộng để phân phối lại. Miễn phí, dùng bao nhiêu lần cũng được. Võ công 90 và 150 đã rèn luyện được giữ nguyên cấp; mọi võ công cộng điểm, gồm cấp 120, hoàn lại toàn bộ điểm.</p>
    <div class="card stats"><span>Tiềm năng đã cộng</span><span>${A}</span><span>Điểm kỹ năng đã cộng</span><span>${Math.max(0, n)}</span></div>
    <div class="btnrow"><button class="btn" id="ttA" ${A ? "" : "disabled"}>Tẩy tiềm năng</button><button class="btn" id="ttS" ${n > 0 ? "" : "disabled"}>Tẩy kỹ năng</button><button class="btn" id="ttAll" ${A || n > 0 ? "" : "disabled"}>Tẩy cả hai</button></div>`,
    () => {
      ((m("#ttA").onclick = () => p4(!0, !1)),
        (m("#ttS").onclick = () => p4(!1, !0)),
        (m("#ttAll").onclick = () => p4(!0, !0)));
    },
  );
};

var p4 = function (A, n) {
  if (A) for (const t in o.attr) ((o.attrPts += o.attr[t]), (o.attr[t] = 0));
  if (n) {
    const t = I[o.fac].starter,
      e = o.bkOk || (o.bkOk = {}),
      a = {};
    for (const i in o.sk)
      (T[i] && T[i].book && (e[i] = 1),
        m4(T[i]) ? (a[i] = o.sk[i]) : (o.skPts += o.sk[i]));
    ((o.sk = a), (o.main = 0), (o.mainLock = !1), (o.slots = [0, 0, 0, 0]));
  }
  ((l.dirty = !0),
    D0(),
    (l.life = Math.min(l.life, l.P.life)),
    (l.mana = Math.min(l.mana, l.P.mana)),
    tn(),
    qA(),
    n0(!0),
    V(),
    $(),
    o0("learn"),
    C(
      `🌊 Tẩy Tủy: ${[A && "tiềm năng", n && "kỹ năng"].filter(Boolean).join(" + ")} đã hoàn lại (${o.attrPts} tiềm năng, ${o.skPts} điểm kỹ năng).`,
    ));
};

var Yi = function (A) {
  const n = T[A];
  if (!n || !Q1(n)) return !1;
  if (!l.sim && !unlockSkillBook(A)) return !1;
  if ((m4(n) || o.skPts--, m4(n))) {
    const t = va();
    ((o.sk[A] = Math.max(1, t[A] ? t[A].lv : 1)), t[A] || (t[A] = { lv: 1, xp: 0 }));
    n.tier === 150 && (o.sk150Training = 1);
  } else o.sk[A] = (o.sk[A] || 0) + 1;
  return !0;
};

var D4 = function (A) {
  const n = ee[A],
    t = T[A];
  if (!n || !t) return 0;
  const e = Math.min(...n.map((a) => o.sk[a] || 0));
  return e < 5 ? 0 : Math.min(t.max, 1 + Math.round(((e - 5) * 19) / 15));
};

var W5 = function () {
  if (o.sk && !o.br90) {
    o.br90 = 1;
    for (const A in ee) o.sk[A] > 1 && (o.sk[A] = 1);
  }
  for (const A in ee) {
    const n = (o.sk && o.sk[A]) || 0;
    if (!n) continue;
    const t = D4(+A);
    n > t && ((o.skPts += n - t), t > 0 ? (o.sk[A] = t) : delete o.sk[A]);
  }
};

var w7 = function (A, n) {
  const t = T[A];
  return !UA(t) || !!(n && n[A]);
};

var Z5 = function (A, n, t) {
  if (!o.fac || !I[o.fac] || !(A > 0)) return;
  const e = va();
  for (const a in o.sk) {
    const i = T[a];
    if (!m4(i) || !o.sk[a] || ee[a] || !w7(a, t)) continue;
    const r = e[a] || (e[a] = { lv: o.sk[a], xp: 0 });
    if (!(r.lv >= i.max)) {
      for (r.xp += A; r.lv < i.max && r.xp >= v4(r.lv);)
        ((r.xp -= v4(r.lv)),
          r.lv++,
          (o.sk[a] = r.lv),
          (l.dirty = !0),
          n ||
            (C(`🔥 Luyện thành <b style="color:#ffd24a">${D(i.n)}</b> cấp ${r.lv}/${i.max}`),
            k(`${i.n} lên cấp ${r.lv}`)));
      r.lv >= i.max && (r.xp = 0);
    }
  }
};

var p7 = function (A) {
  !A || !(A.L >= o.lvl - 10) || Z5(A.cls === "boss" ? 20 : A.cls === "elite" ? 3 : 1, !1, A.hitSk);
};

var D7 = function (A) {
  const n = T[A],
    t = va()[A];
  if (!n || ![90, 150].includes(n.tier)) return "";
  if (ee[A]) {
    const e = ee[A].filter((a) => T[a]);
    return `Không luyện: cộng điểm kỹ năng, tối đa cấp ${D4(A)} (tất cả chiêu hỗ trợ đạt 5 → 1, mỗi lần tất cả +1 → +1, tất cả 20 → 20) · ${e.map((a) => `${T[a].n} ${o.sk[a] || 0}`).join(", ")}`;
  }
  return !t || t.lv >= n.max
    ? t
      ? "Đã luyện tối đa"
      : "Học xong rồi luyện bằng cách đánh quái"
    : `Luyện ${t.xp}/${v4(t.lv)}`;
};

var Fi = { bk90: "Bí Kíp 90", bk120: "Bí Kíp 120", bk150: "Bí Kíp 150" };

(function () {
  for (const A of Object.values(T))
    A && A.learn === "90" && ((A.req = 80), (A.book = "bk90"), (A.tier = 90));
})();
