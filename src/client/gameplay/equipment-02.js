// gameplay/equipment — shared IIFE scope; order is defined in modules.json.
var hp = function (A) {
  for (const a of l.ground) a.age += A;
  let n = l.pickTarget && l.ground.includes(l.pickTarget) ? l.pickTarget : null;
  const t = l.enemies.some((a) => !a.dead && (!a.home || a.aggro));
  if (!n && WA().auto && !(typeof $1 == "function" && $1())) {
    let a = null,
      i = 1e9;
    const r = WA(),
      c = r.pickAll,
      d = o.inv.length >= INV_MAX && !(c && G6().length),
      f = d ? Math.min(...o.inv.filter((h) => !h.set && !h.lock).map(K0), 1 / 0) : -1 / 0;
    for (const h of l.ground) {
      if (
        h.age < 0.4 ||
        (t && Math.hypot(h.x - v.x, h.y - v.y) > qp) ||
        !(c || mA(h.it) || n3(h.it)) ||
        (d && K0(h.it) <= f && !tA(h.it))
      )
        continue;
      const g = Math.hypot(h.x - v.x, h.y - v.y);
      g < i && ((i = g), (a = h));
    }
    n = a;
  }
  if (!n) return !1;
  const e = Math.hypot(n.x - v.x, n.y - v.y);
  if (e <= xp)
    return H6(n, !0)
      ? !0
      : ((n.age = -120),
        l.pickTarget === n && (l.pickTarget = null),
        (!l.fullNote || Date.now() - l.fullNote > 6e4) &&
          ((l.fullNote = Date.now()),
          C(
            '<span class="dim">Hành trang đầy: bỏ qua đồ dưới đất (bán / cất bớt để nhặt tiếp).</span>',
          )),
        !1);
  if (n !== l.pkStuck) ((l.pkStuck = n), (l.pkBest = e), (l.pkT = 0));
  else if (e < l.pkBest - 10) ((l.pkBest = e), (l.pkT = 0));
  else if ((l.pkT += A) > 3)
    return ((n.age = -60), l.pickTarget === n && (l.pickTarget = null), (l.pkStuck = null), !1);
  return (wa(v, n.x, n.y, 170 * Ra() * A), (v.face = n.x >= v.x ? 1 : -1), !0);
};

var $6 = function (A, n) {
  let t = null,
    e = 30;
  for (const a of l.ground) {
    const i = Math.hypot(a.x - A, a.y - (n + 6));
    i < e && ((e = i), (t = a));
  }
  return t;
};

var T6 = function () {
  o.ground = l.ground.map((A) => ({ it: A.it, wx: A.x, wy: A.y }));
};

var up = function () {
  l.ground = (o.ground || [])
    .filter((A) => A && A.it)
    .map((A) => {
      const [n, t] = X0(A.wx ?? O0.w / 2, A.wy ?? O0.h / 2);
      return { it: A.it, x: n, y: t, age: 1 };
    });
};

var gp = 0;

var mp = { 10: 1, 20: 2, 30: 3, 40: 4, 50: 5, 60: 6, 70: 7, 80: 7, 90: 7, 110: 8, 119: 10 };

var wp = 1;

var pp = (s, A) => Array.from({ length: s }, () => E(A, 1, 10));

var Dp = () => N0(0, 4);

var Pp = 0.08;

var ss = () =>
  (1 + (typeof Lt == "function" ? Lt("drop") : 0)) *
  (1 + 0.1 * v0()) *
  (1 + Math.min(100, Math.max(0, l.P ? l.P.lucky : 0)) * 0.005);

var C6 = { normal: 0.04, elite: 0.35, boss: 1 };

var O6 = 0.1;

var vp = { normal: 1, elite: 2, boss: 5 };

var E6 = (s) => GoldLoot.meanGoldDrop(s.L) * (us[s.cls] || us.normal).xp;

var bp = 1540;

var yp = 2.4;

var e3 = (() => {
  const s = {},
    A = (n, t) => {
      const e = Math.max(Math.abs(t[0] || 0), Math.abs(t[1] || 0));
      e > 0 && e !== 1 && !(t[0] === -1 && t[1] === -1) && (s[n] = Math.max(s[n] || 0, e));
    };
  for (const n of S.affixLevel) A(n.a, n.p[0]);
  for (const n in S.ge) A(S.ge[n].a, S.ge[n].p[0]);
  return s;
})();

var j4 = {};

var S6 = {
  32: "requirestr",
  33: "requiredex",
  34: "requirevit",
  35: "requireeng",
  36: "requirelevel",
  37: "requireseries",
  38: "requiresex",
  39: "requiremenpai",
  46: "require_translife",
};

var I6 = (s, A) => {
  if (!s) return "";
  let [n, t] = s;
  return n === t
    ? ""
    : (A !== 1 && ((n = Math.round(n * A)), (t = Math.round(t * A))),
      ` [${Math.min(n, t)} ~ ${Math.max(n, t)}]`);
};

var kp = 40;

var xp = 26;

var Ha = [
  ["Sinh lực", ["lifemax_v", "lifemax_p", "lifereplenish_v"]],
  ["Nội lực", ["manamax_v", "manamax_p", "manareplenish_v"]],
  [
    "Sát thương",
    [
      "addphysicsdamage_v",
      "addphysicsdamage_p",
      "addfiredamage_v",
      "addcolddamage_v",
      "addlightingdamage_v",
      "addpoisondamage_v",
    ],
  ],
  ["Kháng", ["physicsres_p", "poisonres_p", "coldres_p", "fireres_p", "lightingres_p", "allres_p"]],
  ["Chỉ số", ["strength_v", "dexterity_v", "vitality_v", "energy_v"]],
  ["Kỹ năng", ["allskill_v"]],
  ["Tốc độ", ["attackspeed_v", "castspeed_v", "fastwalkrun_p"]],
  ["Hút máu / nội", ["steallifeenhance_p", "stealmanaenhance_p"]],
  ["Chính xác / né", ["attackratingenhance_v", "adddefense_v"]],
  [
    "Sát thương nội công",
    ["metalskill_v", "earthskill_v", "woodskill_v", "waterskill_v", "fireskill_v"],
  ],
];

var Bp = [
  ["weapon", "Vũ khí"],
  ["armor", "Áo"],
  ["helm", "Mũ"],
  ["belt", "Đai"],
  ["boot", "Giày"],
  ["cuff", "Hộ uyển"],
  ["amulet", "Dây chuyền"],
  ["ring", "Nhẫn"],
  ["pendant", "Ngọc bội"],
  ["horse", "Ngựa"],
];

var _p = [
  ["earthskill_v", 40],
  ["woodskill_v", 120],
  ["waterskill_v", 120],
  ["fireskill_v", 120],
  ["metalskill_v", 150],
  ["addpoisondamage_v", 35],
  ["addcolddamage_v", 50],
  ["addfiredamage_v", 90],
  ["addlightingdamage_v", 50],
  ["addphysicsdamage_v", 35],
  ["addphysicsdamage_p", 35],
  ["life_v", 150],
  ["mana_v", 150],
  ["staminamax_v", 180],
  ["lifereplenish_v", 4],
  ["staminareplenish_v", 9],
  ["manareplenish_v", 2],
  ["steallifeenhance_p", 0],
  ["stealmanaenhance_p", 0],
  ["dexterity_v", 18],
  ["strength_v", 18],
  ["vitality_v", 18],
  ["physicsres_p", 19],
  ["poisonres_p", 19],
  ["coldres_p", 19],
  ["fireres_p", 19],
  ["lightingres_p", 19],
  ["allres_p", 0],
  ["fastwalkrun_p", 35],
  ["lucky_v", 5],
  ["stuntimereduce_p", 19],
  ["poisontimereduce_p", 19],
  ["fasthitrecover_v", 12],
  ["freezetimereduce_p", 19],
  ["anti_stuntimereduce_p", 9],
  ["water2medamage_p", 9],
  ["anti_do_stun_p", 9],
  ["coldenhance_p", 9],
  ["allskill_v", 0],
  ["attackspeed_v", 19],
  ["castspeed_v", 0],
  ["meleedamagereturn_v", 9],
  ["rangedamagereturn_v", 0],
  ["damage2addmana_p", 9],
  ["expenhance_p", 14],
];

var is = () => ({
  thrN: 2,
  keepSpecial: !0,
  keepVal: 0,
  mode: "smart",
  smartUp: !0,
  custom: !1,
  minRar: 1,
  minLvl: 1,
  groups: [],
  series: [],
  auto: !0,
  minMag: 0,
  slots: [],
  wear: !1,
  accrue: !1,
  facW: !1,
  keepRare: !0,
  setOnly: !1,
  setKeep: [],
  setMine: !1,
  pickAll: !0,
  ep: { white: !0, jew: !0, blue: !0, blueLv: 5, dest: "box" },
});

var Mp = [
  ["Thanh Câu", 50],
  ["Vân Lộc", 80],
  ["Môn phái", 99],
  ["Thương Lang", 100],
  ["Tống Kim", 120],
  ["Tử Mãng", 120],
  ["Kim Ô", 120],
  ["Bạch Hổ", 120],
  ["Xích Lân", 120],
  ["Minh Phượng", 120],
  ["Huyền Viên", 120],
  ["Tinh Sương", 120],
  ["Đằng Long", 180],
  ["Bộ chung", 0],
];

var Hp = Mp.filter(([s]) => !["Môn phái", "Tống Kim", "Bộ chung"].includes(s));

var $a = (s) => ((s.req || []).find((A) => A[0] === 39) || [0, -1])[1];

var $p = {
  29: "Vô Danh",
  41: "Tuệ Thanh",
  42: "Vinh Diệu",
  44: "Càn Khôn",
  45: "Chấp Tử",
  46: "Minh Nguyệt",
  52: "Như Ý",
};

var z4 = null;

var N6 = null;

var z_ = (s) => {
  const A = N4().find((n) => n.k === s);
  return A ? A.n : s;
};

var a3 = null;

var L6 = null;

var Tp = (s) => !!((s.set && Ma(s)) || s.vio || s.plv || (s.d === 10 && (s.r >= 3 || s.rareH)));

var Q4 = "";

var s3 = {};

var i3 = 1;

var Fn = (s) => B6(s) > 0.005;

var G4 = {};

var K4 = (s) => !Fn(s) && !!t3(s);

var Cp = 2;

var o3 = null;

var q6 = "";

var Op = new Set(
  [
    "steallifeenhance_p",
    "stealmanaenhance_p",
    "steallife_p",
    "stealmana_p",
    "allskill_v",
    "indestructible_b",
    "ignoredefense_p",
  ]
    .map((s) => ha[s])
    .filter((s) => s !== void 0),
);

var Ep =
  /^(addphysicsdamage_[vp]|addpoisondamage_v|addcolddamage_v|addfiredamage_v|addlightingdamage_v|attackspeed_v)$/;

var Sp = /^(castspeed_v|metalskill_v|woodskill_v|waterskill_v|fireskill_v|earthskill_v)$/;

var j6 = ["metalskill_v", "woodskill_v", "waterskill_v", "fireskill_v", "earthskill_v"];

var z6 = null;

var R4 = null;

var Ip = (s) => E(0.4 + 0.06 * (s.lvl || 1), 0.46, 1);

var Q_ = (s) => (s.mag || []).some((A) => Op.has(A.a));

var G_ = (s) =>
  String(S.attrDesc[s] || s)
    .replace(/#d\d[+~-]?/g, "")
    .replace(/#l\d/g, "")
    .replace(/:\s*(điểm|cấp|%)?.*$/, "")
    .replace(/\s+/g, " ")
    .trim() + (/_p$/.test(s) && !/%/.test(s) ? " (%)" : "");

var Np = [
  ["smart", "Thông minh", "Giữ đồ nâng cấp (2 món tốt nhất mỗi ô) và đồ quý"],
  ["all", "Nhặt hết", "Giữ mọi món, chỉ bán khi túi đầy"],
];

var Lp = (s) => (s.custom && (s.minRar || 0) === 0 ? "all" : s.custom ? "" : "smart");

var Q6 = [
  ["Mặc định", { smartUp: !0, custom: !1 }],
  ["Tím / Hoàng Kim", { smartUp: !0, custom: !0, minRar: 3 }],
  ["Hợp phái", { smartUp: !0, custom: !0, wear: !0, facW: !0, accrue: !0 }],
  ["Nhặt hết", { smartUp: !0, custom: !0, minRar: 0, minLvl: 1 }],
];

var Dn = null;

var G6 = () => o.inv.filter((s) => !mA(s) && !Ja(s) && !Object.values(o.eq).includes(s));

var qp = 220;
