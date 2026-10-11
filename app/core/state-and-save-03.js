// core/state-and-save — shared IIFE scope; order is defined in modules.json.
var eP = {
  10: 1,
  11: 1,
  271: 1,
  318: 1,
  319: 1,
  29: 1,
  30: 1,
  31: 1,
  35: 1,
  41: 1,
  324: 1,
  323: 1,
  325: 1,
  347: 1,
  303: 1,
  47: 1,
  50: 1,
  54: 1,
  343: 1,
  345: 1,
  349: 1,
  249: 1,
  341: 1,
  339: 1,
  342: 1,
  351: 1,
  68: 1,
  71: 1,
  353: 1,
  85: 1,
  82: 1,
  385: 1,
  88: 1,
  91: 1,
  328: 1,
  380: 1,
  102: 1,
  105: 1,
  113: 1,
  108: 1,
  111: 1,
  336: 1,
  337: 1,
  122: 1,
  125: 1,
  128: 1,
  357: 1,
  359: 1,
  145: 1,
  138: 1,
  148: 1,
  362: 1,
  155: 1,
  158: 1,
  164: 1,
  165: 1,
  267: 1,
  365: 1,
  368: 1,
  179: 1,
  172: 1,
  176: 1,
  182: 1,
  372: 1,
  375: 1,
};

var aP = 0.6;

var sP = (s) => (s && eP[s.id]) || 0;

var E3 = (s, A = !!l.mounted) => {
  const n = sP(s);
  return n === 1 ? !A : n === 2 ? A : !0;
};

var xe = () => !!(o && o.eq && o.eq.horse && p0(o.eq.horse));

var S3 = () => o.autoRide !== !1 && !(typeof $1 == "function" && $1());

var Ra = () => (l.P ? (l.mounted ? l.P.speed : l.P.speedFoot || l.P.speed) : 1);

var I3 = function () {
  return {
    v: b8,
    name: "Tân thủ",
    fac: null,
    sex: 0,
    lvl: 1,
    xp: 0,
    gold: 0,
    attrPts: 0,
    attr: { str: 0, dex: 0, vit: 0, eng: 0 },
    knbV: 2,
    skPts: 1,
    sk: {},
    main: 0,
    eq: {},
    inv: [],
    stage: 1,
    maxStage: 1,
    wave: 1,
    uid: 1,
    autoSell: 0,
    kps: 0.2,
    totalKills: 0,
    autoEquip: !0,
    autoPts: !1,
    diff: 1,
    autoForge: !0,
    autoBuy: !0,
    tut: 0,
    hints: {},
    bakAt: 0,
    potOff: !1,
    potUsed: 0,
    potStock: { life: {}, mana: {} },
    ctrl: "auto",
    joy: "fixed",
    slots: [0, 0, 0, 0],
    snd: { on: !0, vol: 0.7, music: !0, mvol: 0.4 },
    lootF: { minRar: 1, minLvl: 1, groups: [], series: [], auto: !0 },
    ground: [],
    mats: { ht: {}, ore: {}, shard: {}, misc: {} },
    last: Date.now(),
  };
};

var Yd = function (A) {
  let n = 3735928559,
    t = 1103547991;
  const e = mP + A;
  for (let a = 0; a < e.length; a++) {
    const i = e.charCodeAt(a);
    ((n = Math.imul(n ^ i, 2654435761)), (t = Math.imul(t ^ i, 1597334677)));
  }
  return (
    (n = Math.imul(n ^ (n >>> 16), 2246822507) ^ Math.imul(t ^ (t >>> 13), 3266489909)),
    (t = Math.imul(t ^ (t >>> 16), 2246822507) ^ Math.imul(n ^ (n >>> 13), 3266489909)),
    (4294967296 * (2097151 & t) + (n >>> 0)).toString(36)
  );
};

var bn = function (A) {
  const n = JSON.stringify(A);
  return JSON.stringify({ d: n, h: Yd(n) });
};

var t1 = function (A) {
  const n = JSON.parse(A);
  return n && typeof n.d == "string" && typeof n.h == "string"
    ? { state: JSON.parse(n.d), ok: Yd(n.d) === n.h }
    : { state: n, ok: !0, legacy: !0 };
};

var $ = function () {
  if (!(HA || !o || !o.fac)) {
    ((o.last = Date.now()), typeof T6 == "function" && l.ground && T6());
    try {
      const A = y8(),
        n = localStorage.getItem(A);
      if (n)
        try {
          t1(n).ok && localStorage.setItem(A + "_bak", n);
        } catch {}
      (localStorage.setItem(A, bn(o)), localStorage.setItem(f1, String(m0)));
    } catch {}
  }
};

var P8 = function (A) {
  if (!A || !A.vio || !Array.isArray(A.mag)) return !1;
  const n = new Set(),
    t = A.mag.length;
  return (
    (A.mag = A.mag.filter((e) => e && !n.has(e.a) && n.add(e.a))),
    A.mag.forEach((e, a) => {
      e.pre = a % 2 === 0 ? 1 : 0;
    }),
    A.mag.length < t
  );
};

var iP = function (A) {
  const n = (r, c) => (c ? (Jd.alt[r] || [])[c - 1] : Jd.base[r]),
    t = (r) => [k0[r]].concat((typeof Un < "u" && Un[r]) || []),
    e = (r, c) => {
      const d = t(r).findIndex((f) => f && f.id === c);
      return d < 0 ? 0 : d;
    },
    a = A.dt && A.dt.task,
    i = !A.zmap2;
  if (((A.zmap2 = 1), i)) {
    if (A.zalt && typeof A.zalt == "object")
      for (const r in A.zalt) {
        const c = A.zalt[r] | 0;
        A.zalt[r] = c && k0[+r] ? e(+r, n(+r, c)) : 0;
      }
    a && a.zi != null && k0[a.zi] && (a.za = e(a.zi, n(a.zi, a.za | 0)));
  }
  if (a && a.zi != null && k0[a.zi]) {
    const r = t(a.zi)[a.za | 0] || k0[a.zi];
    (t(a.zi)[a.za | 0] || (a.za = 0),
      (a.zn = r.n),
      a.t === "boss" && a.tid !== r.boss
        ? (a.tid = r.boss)
        : a.t === "killm" && !r.m.includes(a.tid) && (a.tid = r.m.find((c) => r0[c]) || a.tid));
  }
};

var v8 = function (A) {
  const n = Object.assign(I3(), A);
  if (
    ((n.attr = Object.assign({ str: 0, dex: 0, vit: 0, eng: 0 }, A.attr || {})),
    A.knbV === 1 && (n.knb = Math.floor((n.knb | 0) / 10)),
    (n.knbV = 2),
    typeof rs == "function")
  ) {
    const a = o;
    o = n;
    try {
      for (const i of [...(n.inv || []), ...Object.values(n.eq || {})]) rs(i);
    } catch {
    } finally {
      o = a;
    }
  }
  (n.mig73 || ((n.mig73 = 1), (n.autoForge = !0)), n.fac && !I[n.fac] && (n.fac = null));
  for (const a in n.sk)
    T[a] ||
      (((a >= 708 && a <= 717) || (a >= 1055 && a <= 1109)) &&
        (n.skPts = (n.skPts || 0) + (n.sk[a] | 0)),
      delete n.sk[a]);
  {
    const a = (A.mats || {}).misc || {},
      i = (a.bk120 | 0) + (a.bk150 | 0);
    i && ((a.bk90 = (a.bk90 | 0) + i), delete a.bk120, delete a.bk150);
  }
  if (!n.sk9Free) {
    n.sk9Free = 1;
    for (const a in n.sk)
      T[a] &&
        T[a].tier === 90 &&
        !(typeof SA == "function" && SA(a)) &&
        n.sk[a] > 0 &&
        (n.skPts = (n.skPts || 0) + 1);
  }
  ((n.stage = E(n.stage | 0 || 1, 1, d0 + 400)),
    delete n.push,
    (n.snd = Object.assign(
      { on: !0, vol: 0.7, music: !0, mvol: 0.4 },
      A.snd && "vol" in A.snd ? A.snd : {},
    )),
    (n.lootF = Object.assign(
      { minRar: 1, minLvl: 1, groups: [], series: [], auto: !0 },
      A.lootF || {},
    )),
    A.autoSell && !A.lootF && (n.lootF.minRar = A.autoSell));
  for (const a of n.inv.concat(
    Object.values(n.eq),
    (n.ground || []).map((i) => i && i.it),
  ))
    a && (a.mag || []).some((i) => i.pre === void 0) && (a.leg = !0);
  for (const a of n.inv.concat(Object.values(n.eq), n.epBox || [])) P8(a);
  (A.autoPtsOff || ((n.autoPts = !1), (n.autoPtsOff = 1)),
    (n.mats = {
      ht: Object.assign({}, (A.mats || {}).ht),
      ore: Object.assign({}, (A.mats || {}).ore),
      shard: Object.assign({}, (A.mats || {}).shard),
      misc: Object.assign({}, (A.mats || {}).misc),
    }),
    (n.rw = A.rw && typeof A.rw == "object" ? A.rw : {}),
    (n.lvl = E(Math.floor(+n.lvl) || 1, 1, Q2)),
    (n.xp = Math.max(0, +n.xp || 0)),
    (n.gold = Number.isFinite(+n.gold) ? Math.max(0, +n.gold) : 0),
    (n.skPts = Math.max(0, Math.floor(+n.skPts) || 0)),
    (n.attrPts = Math.max(0, Math.floor(+n.attrPts) || 0)),
    (n.inv = (Array.isArray(n.inv) ? n.inv : [])
      .filter((a) => a && typeof a == "object" && Array.isArray(a.base) && Array.isArray(a.mag))
      .slice(0, _5(n))));
  let t = 0;
  for (const a of n.inv.concat(Object.values(n.eq || {}), n.stable || []))
    a && a.uid > t && (t = a.uid);
  n.uid = Math.max(+n.uid || 1, t + 1);
  {
    const a = new Set();
    n.inv = n.inv.filter((i) => (a.has(i.uid) && (i.uid = n.uid++), a.add(i.uid), !0));
  }
  ((n.diff = [0, 1, 2].includes(+A.diff) ? +A.diff : 1),
    (n.hints = A.hints && typeof A.hints == "object" ? A.hints : {}),
    n.fac && !A.sexSet && (n.sex = gP.includes(n.fac) ? 1 : 0),
    n.fac && (n.sexSet = 1));
  const e = (a) => n.eq[a] && !u4(n.eq[a], n.sex);
  for (const a of Object.keys(n.eq || {}))
    !n.eq[a] || typeof n.eq[a] != "object"
      ? delete n.eq[a]
      : e(a) && (n.inv.length < INV_MAX && n.inv.push(n.eq[a]), delete n.eq[a]);
  for (const a of n.inv.concat(
    Object.values(n.eq || {}),
    (n.ground || []).map((i) => i && i.it),
  ))
    a && a.set && /[\u3400-\u9fff]/.test(a.n) && (a.n = setNameVi(a.n));
  {
    const a = n.inv.length + Object.keys(n.eq || {}).length + (n.ground || []).length;
    n.inv = n.inv.filter((r) => !xi(r));
    for (const r of Object.keys(n.eq || {})) xi(n.eq[r]) && delete n.eq[r];
    n.ground = (n.ground || []).filter((r) => !(r && xi(r.it)));
    const i = a - (n.inv.length + Object.keys(n.eq || {}).length + n.ground.length);
    i > 0 && (window.SET_PURGED = window.SET_PURGED || []).push(i);
    try {
      window.GONE_FAC = typeof I < "u" && I[n.fac] ? I[n.fac].id : -1;
    } catch {
      window.GONE_FAC = -1;
    }
    for (const r of n.inv.concat(
      Object.values(n.eq || {}),
      n.ground.map((c) => c && c.it),
    ))
      ft(r);
    for (const r of n.epBox || []) ft(r);
    delete window.GONE_FAC;
    {
      const r = n.mats && n.mats.shard;
      if (r && typeof jr == "function")
        for (const c of Object.keys(r)) {
          const d = (JX.sets.gold || []).find((u) => u.n === c);
          if (!d || (!Mi.has(d.grp) && (fn(d) < 0 || q2.has(d.grp)))) continue;
          let f = jr({ n: d.n, d: d.d, k: d.k, fac: fn(d) });
          const h = (window.RCP && RCP.shards) || {},
            g = (u) => Gr(u) && (fn(u) >= 0 ? q2.has(u.grp) : cA(u));
          ((!f || !h[f.n]) &&
            (f =
              (JX.sets.gold || []).find(
                (u) => fn(u) === fn(d) && g(u) && h[u.n] && (!f || u.grp === f.grp),
              ) || (JX.sets.gold || []).find((u) => fn(u) === fn(d) && g(u) && h[u.n])),
            f && (r[f.n] = (r[f.n] || 0) + r[c]),
            delete r[c]);
        }
    }
  }
  for (const a of n.inv.concat(
    Object.values(n.eq || {}),
    (n.ground || []).map((i) => i && i.it),
  ))
    a && a.set && a.set.kind === "platina" && !/^\[/.test(a.n) && (a.n = "[Bạch Kim] " + a.n);
  for (const a in n.sk) T[a] && T[a].book && ((n.bkOk || (n.bkOk = {}))[a] = 1);
  for (const a of n.inv.concat(Object.values(n.eq || {})))
    a && a.d === 10 && a.r === 3 && !a.vio && ((a.r = 2), (a.rareH = 1));
  for (const a of n.inv.concat(Object.values(n.eq || {}), n.epBox || []))
    a && a.r === 2 && !a.rareH && a.d !== 10 && (a.r = (a.mag || []).length ? 1 : 0);
  if (!n.sk9m) {
    n.skL = n.skL || {};
    for (const i in n.sk) {
      const r = T[i];
      r &&
        r.tier === 90 &&
        n.sk[i] > 0 &&
        ((n.skL[i] = { lv: n.sk[i], xp: 0 }), (n.skPts = (n.skPts || 0) + n.sk[i] - 1));
    }
    const a = (n.lvl || 1) + $i * ((n.rw && n.rw.stat && n.rw.stat.reborn) || 0);
    for (const i in n.sk) {
      const r = T[i];
      if (!r || r.tier === 90) continue;
      const c = Math.max(1, Math.min(r.max, a - r.req + 1));
      n.sk[i] > c && ((n.skPts = (n.skPts || 0) + n.sk[i] - c), (n.sk[i] = c));
    }
    n.sk9m = 1;
  }
  if ((n.eqRebuild | 0) < 2 && typeof ZA == "function") {
    let a = 0,
      i = 0;
    const r = n.lvl || 1,
      c = (f) => {
        let h = typeof x0 == "function" ? x0(f) : 0;
        for (let g = 0; g < (f.enh || 0); g++)
          h +=
            (0.2 *
              (1e3 + (f.lvl || 0) * 1e3 + (f.r || 0) * 2e3) *
              Math.pow(1.8, g) *
              (1 + r / 10)) /
            Math.max(0.35, 1 - 0.07 * g);
        return h;
      },
      d = (f) => (ZA(f) ? ((a += c(f)), i++, !1) : !0);
    ((n.inv = (n.inv || []).filter(d)), (n.epBox = (n.epBox || []).filter(d)));
    for (const f in n.eq || {}) n.eq[f] && !d(n.eq[f]) && delete n.eq[f];
    if (n.mats && n.mats.shard && typeof me < "u")
      for (const f in n.mats.shard) {
        const h = me.get(f);
        (!h || !cA(h)) && delete n.mats.shard[f];
      }
    ((a = Math.min(5e8, Math.round(a))),
      a > 0 && (n.gold = (n.gold || 0) + a),
      i && (n.eqRebuildMsg = [i, a]),
      (n.eqRebuild = 2));
  }
  if (n.horseEnhFix)
    for (const a of (n.inv || []).concat(Object.values(n.eq || {}), n.epBox || [], n.stable || []))
      a &&
        a.d === 10 &&
        a.enh > 0 &&
        !a.vio &&
        (delete a.enh, (n.horseEnhCut = (n.horseEnhCut || 0) + 1));
  else {
    let a = 0;
    for (const i of (n.inv || []).concat(Object.values(n.eq || {}), n.epBox || [], n.stable || []))
      if (!(!i || i.d !== 10 || !(i.enh > 0))) {
        for (let r = 0; r < i.enh; r++)
          a +=
            ((1e3 + (i.lvl || 0) * 1e3 + (i.r || 0) * 2e3) *
              Math.pow(1.8, r) *
              (1 + (n.lvl || 1) / 10)) /
            Math.max(0.35, 1 - 0.07 * r);
        delete i.enh;
      }
    ((a = Math.round(a)),
      a > 0 && ((n.gold = (n.gold || 0) + a), (n.horseEnhBack = a)),
      (n.horseEnhFix = 1));
  }
  if (typeof VA == "function") {
    let a = 0,
      i = 0,
      r = 0;
    const c = (d) =>
      VA(d)
        ? (typeof zr == "function" && zr(d) ? i++ : typeof Qr == "function" && Qr(d) ? r++ : a++,
          !1)
        : !0;
    ((n.inv = (n.inv || []).filter(c)),
      (n.epBox = (n.epBox || []).filter(c)),
      Array.isArray(n.stable) && (n.stable = n.stable.filter(c)));
    for (const d in n.eq || {}) n.eq[d] && !c(n.eq[d]) && delete n.eq[d];
    if (n.mats && n.mats.shard) for (const d in n.mats.shard) Bi(d) && delete n.mats.shard[d];
    (a && (n.banMsg = a), i && (n.pjMsg = (n.pjMsg || 0) + i), r && (n.phMsg = (n.phMsg || 0) + r));
  }
  return (iP(n), (n.v = b8), n);
};

var ms = function (A) {
  try {
    const n = localStorage.getItem(h1(A));
    if (!n) return null;
    let t;
    try {
      t = t1(n);
    } catch {
      t = null;
    }
    if (!t || !t.ok) {
      const a = localStorage.getItem(h1(A) + "_bak");
      try {
        t = a && t1(a);
      } catch {
        t = null;
      }
    }
    const e = t && t.state;
    return !e || !e.fac
      ? null
      : {
          fac: e.fac,
          lvl: e.lvl | 0 || 1,
          stage: e.stage | 0 || 1,
          last: e.last || 0,
          name: e.name || "",
          sex: e.sex | 0,
        };
  } catch {
    return null;
  }
};

var oP = function () {
  let A = null;
  try {
    A = localStorage.getItem(f1);
  } catch {}
  const n = [...Array(V1).keys()].filter((i) => ms(i));
  if (A === "menu") return { slot: n[0] ?? 0, menu: n.length > 0 };
  let t = null;
  try {
    t = sessionStorage.getItem("jxidle_in");
  } catch {}
  const e = t === null ? NaN : +t;
  if (Number.isInteger(e) && e >= 0 && e < V1 && ms(e)) return { slot: e, menu: !1 };
  const a = +A;
  return A !== null && Number.isInteger(a) && a >= 0 && a < V1
    ? { slot: a, menu: t === null && n.length > 0 }
    : n.length > 0
      ? { slot: n[0], menu: !0 }
      : { slot: n[0] ?? 0, menu: !1 };
};

var Fd = async function (A) {
  if (typeof h0 == "function" && h0() && b.user)
    try {
      await e0((n) => n.from("saves").delete().eq("owner", b.user.id).eq("slot", A));
    } catch (n) {
      k("Không xóa được trên đám mây: " + n.message);
      return;
    }
  HA = !0;
  try {
    (localStorage.removeItem(h1(A)),
      localStorage.removeItem(h1(A) + "_bak"),
      localStorage.setItem(f1, "menu"));
  } catch {}
  location.reload();
};

var rP = async function () {
  if (($(), typeof h0 == "function" && h0() && b.user && o && o.fac))
    try {
      await U0();
    } catch {}
  HA = !0;
  try {
    (localStorage.setItem(f1, "menu"), sessionStorage.removeItem("jxidle_in"));
  } catch {}
  location.reload();
};

var cP = function () {
  try {
    const A = localStorage.getItem(y8());
    if (A) {
      let n = t1(A);
      if (!n.ok) {
        const t = localStorage.getItem(y8() + "_bak");
        let e = null;
        try {
          e = t && t1(t);
        } catch {}
        (e && e.ok ? (n = e) : (n.state.tampered = 1), (window.__tampered = !0));
      }
      return ((o = v8(n.state)), !0);
    }
  } catch (A) {
    console.warn("Khong doc duoc file luu, tao moi", A);
  }
  return ((o = I3()), !1);
};

var lP = function () {
  return (
    $(),
    JSON.stringify({
      game: "jxidle",
      v: b8,
      exported: Date.now(),
      fac: o.fac,
      lvl: o.lvl,
      data: bn(o),
    })
  );
};

var Vd = function () {
  const A = new Date(),
    n = (t) => String(t).padStart(2, "0");
  return `jxidle_${o.fac}_cap${o.lvl}_${A.getFullYear()}${n(A.getMonth() + 1)}${n(A.getDate())}_${n(A.getHours())}${n(A.getMinutes())}.jxsave`;
};

var dP = function () {
  if (!o.fac) return !1;
  const A = new Blob([lP()], { type: "application/json" }),
    n = document.createElement("a");
  return (
    (o.bakAt = Date.now()),
    $(),
    (n.href = URL.createObjectURL(A)),
    (n.download = Vd()),
    document.body.appendChild(n),
    n.click(),
    setTimeout(() => {
      (URL.revokeObjectURL(n.href), n.remove());
    }, 1500),
    !0
  );
};

var Ud = function (A) {
  if (
    ((A = String(A || "")
      .trim()
      .replace(/^\uFEFF/, "")),
    !A)
  )
    throw new Error("File rỗng");
  let n;
  if (A[0] === "{") {
    const a = JSON.parse(A);
    if (a && a.game === "jxidle" && typeof a.data == "string") n = a.data;
    else if (a && typeof a.d == "string" && typeof a.h == "string") n = A;
    else throw new Error("Không phải file lưu của game");
  } else n = decodeURIComponent(escape(atob(A)));
  const t = t1(n);
  if (!t.ok) throw new Error("File đã bị chỉnh sửa (sai chữ ký)");
  const e = t.state;
  if (!e || typeof e != "object" || !e.fac || !I[e.fac] || !("lvl" in e))
    throw new Error("File không có nhân vật hợp lệ");
  return e;
};

var Xd = function (A, n) {
  const t = v8(n);
  ((t.last = Date.now()), (HA = !0));
  try {
    const e = h1(A),
      a = localStorage.getItem(e);
    (a && localStorage.setItem(e + "_bak", a),
      localStorage.setItem(e, bn(t)),
      localStorage.setItem(f1, String(A)));
    try {
      sessionStorage.setItem("jxidle_in", String(A));
    } catch {}
  } catch {
    throw ((HA = !1), new Error("Không ghi được (bộ nhớ trình duyệt đầy hoặc bị chặn)"));
  }
  return t;
};

var fP = function () {
  return ($(), btoa(unescape(encodeURIComponent(bn(o)))));
};

var oM = function (A) {
  const n = t1(decodeURIComponent(escape(atob(A.trim()))));
  if (!n.ok) throw new Error("Mã đã bị chỉnh sửa");
  const t = n.state;
  if (!t || typeof t != "object" || !("lvl" in t)) throw new Error("Mã không hợp lệ");
  ((o = v8(t)), $(), (l.dirty = !0));
};

var hP = function () {
  const A = Date.now(),
    n = (A - o.last) / 1e3;
  if (!(n >= 60) || !o.fac) return null;
  const t = (o.offDay =
      o.offDay && A - o.offDay.t0 < 864e5 && o.offDay.t0 <= A ? o.offDay : { t0: A, secs: 0 }),
    e = Math.min(uP, n, Math.max(0, DP - t.secs));
  if (e < 60) return null;
  t.secs += e;
  const a = e,
    i = Math.min(a, Wd) + wP * Math.max(0, a - Wd),
    r = Math.min(i, Math.max(0, o.bch || 0)),
    c = Math.floor(((i - r) * pP + r) * E(o.kps || 0.1, 0.02, 3));
  if (!c) return null;
  r && (o.bch = Math.max(0, (o.bch || 0) - r));
  const d = De(o.stage),
    f = o.lvl,
    h = _d(d) * c * Nd(o.lvl, d),
    g = Math.round(O6 * E6({ L: d, cls: "normal" }) * (d >= 119 ? 0.5 : 1) * c * w8);
  (d8(h * z5()),
    (o.gold += g),
    d >= o.lvl - 10 && Z5(c, !0, l.P && l.P.main ? { [l.P.main.id]: 1 } : null));
  let u = 0,
    w = 0;
  const x = Math.min(30, Math.floor(c * 0.08 * w8));
  for (let P = 0; P < x; P++) {
    const _ = P6({ L: d, cls: Math.random() < 0.15 ? "elite" : "normal", bonusDrop: 1 })[0];
    _ && (xn(_, !0) ? u++ : w++);
  }
  (Bn(), typeof p2 == "function" && p2(), Of(), hg(), dl());
  const p = nb(a);
  return {
    secs: a,
    kills: c,
    xp: h,
    gold: g,
    lv0: f,
    lv1: o.lvl,
    got: u,
    sold: w,
    chests: p,
    bch: r,
  };
};

var b8 = 1;

var uP = 8 * 3600;

var V1 = 3;

var f1 = "jxidle_slot";

var m0 = 0;

var HA = !1;

var h1 = (s) => (s === 0 ? "jxidle" : "jxidle_" + (s + 1));

var y8 = () => h1(m0);

var o;

var gP = ["emei", "cuiyan"];

var mP = "jx-idle-v1:";

var Jd = {
  base: [2, 3, 7, 19, 21, 41, 90, 70, 92, 56, 122, 140, 224, 319, 320, 322, 336, 340, 201, 205],
  alt: {
    1: [195],
    2: [43, 179],
    3: [193, 74, 145],
    4: [167],
    6: [68, 342, 341],
    8: [123],
    9: [93, 75],
  },
};

var Wd = 8 * 3600;

var wP = 1;

var pP = 0.7;

var DP = 12 * 3600;

var Zd = function () {
  const n = String(new Error().stack || "")
    .split(
      `
`,
    )
    .map((t) => t.trim())
    .filter(
      (t) => t && !/^Error\b/.test(t) && !/\[native code\]|\(<anonymous>\)$|\(native\)$/.test(t),
    )[2];
  return (
    (LA.lastFr = n || ""),
    n ? n.includes(location.origin) || /\bjs\/|app\.js|\.js\?v=/.test(n) : !0
  );
};

var Et = function (A, n) {
  const t = Date.now(),
    e = A + ":" + (n.k || "");
  (LA.sent[e] && t - LA.sent[e] < 10 * 6e4) ||
    ((LA.sent[e] = t),
    LA.q.push({
      kind: A,
      info: Object.assign(
        {
          fr: String(LA.lastFr || "")
            .trim()
            .slice(0, 120),
          lv: o && o.lvl,
          cs: o && o.rw && o.rw.stat ? o.rw.stat.reborn | 0 : 0,
          v: typeof d5 < "u" ? d5 : 0,
        },
        n,
      ),
    }),
    Af());
};

var Af = async function () {
  if (!LA.q.length || typeof b > "u" || !b.user || typeof e0 != "function") return;
  const A = LA.q
    .splice(0, 20)
    .map((n) => ({
      owner: b.user.id,
      name: String((o && o.name) || "").slice(0, 30),
      kind: n.kind,
      info: n.info,
    }));
  try {
    await e0((n) => n.from("flags").insert(A));
  } catch {}
};

var PP = function () {
  if (!(typeof o > "u" || !o || o.__guard === o)) {
    for (const A of kP) {
      let n = o[A];
      try {
        Object.defineProperty(o, A, {
          configurable: !0,
          enumerable: !0,
          get: () => n,
          set: (t) => {
            const e = n;
            n = t;
            const a = (+t || 0) - (+e || 0);
            a > 0 && ((A === "gold" && a < 5e4) || Zd() || Et("console", { k: A, from: e, to: t }));
          },
        });
      } catch {}
    }
    (Object.defineProperty(o, "__guard", { configurable: !0, enumerable: !1, value: o }),
      (LA.base = null));
  }
};

var vP = function () {
  if (typeof o > "u" || !o || !o.rw || !o.rw.stat || typeof o.rw.stat != "object") return;
  const A = o.rw.stat;
  if (A.__guard === A) {
    LA.base = N3.map((n) => +A[n] || 0);
    return;
  }
  LA.base &&
    N3.forEach((n, t) => {
      (+A[n] || 0) - LA.base[t] > (n === "towerBest" ? 20 : 200) &&
        Et("console", { k: n, from: LA.base[t], to: +A[n] || 0, swap: 1 });
    });
  for (const n of N3) {
    let t = A[n];
    try {
      Object.defineProperty(A, n, {
        configurable: !0,
        enumerable: !0,
        get: () => t,
        set: (e) => {
          const a = t;
          ((t = e), (+e || 0) - (+a || 0) > 0 && (Zd() || Et("console", { k: n, from: a, to: e })));
        },
      });
    } catch {}
  }
  (Object.defineProperty(A, "__guard", { configurable: !0, enumerable: !1, value: A }),
    (LA.base = N3.map((n) => +A[n] || 0)));
};

var bP = function () {
  if (LA.f12 || matchMedia("(pointer: coarse)").matches) return;
  const A = window.outerWidth - window.innerWidth,
    n = window.outerHeight - window.innerHeight;
  (A > 200 || n > 260) && ((LA.f12 = !0), Et("f12", { k: "f12", w: A, h: n }));
};

var yP = function () {
  if (typeof f5 > "u") return;
  const A = f5,
    n = (A && A.src) || "";
  A
    ? (!/\/(?:app\/game|app)\.js(\?|$)/.test(n) ||
        (n && new URL(n, location.href).origin !== location.origin)) &&
      Et("tool", { k: "code", src: n ? n.slice(0, 80) : "inline" })
    : Et("tool", { k: "code", src: "no-currentScript" });
};

var nf = function () {
  const A = [
    ["Math.random", Math.random],
    ["setTimeout", window.setTimeout],
    ["setInterval", window.setInterval],
    ["requestAnimationFrame", window.requestAnimationFrame],
    ["Date.now", Date.now],
    ["performance.now", performance && performance.now],
  ]
    .filter(([, n]) => n && !xP(n))
    .map(([n]) => n);
  A.length && Et("tool", { k: "native", fn: A.join(",") });
};

var k8 = function (A, n) {
  const t = A.textContent || "";
  if (!(t.length > 2e5)) for (const e of BP) t.includes(e) && n.add(e);
};

var tf = function () {
  try {
    if (!document.body) return;
    const A = new Set();
    for (const n of document.body.children)
      _P(n) || (k8(n, A), n.shadowRoot && k8(n.shadowRoot, A));
    for (const n of document.querySelectorAll("body > * *")) n.shadowRoot && k8(n.shadowRoot, A);
    A.size >= 2 && Et("tool", { k: "panel", txt: [...A].join(" | ") });
  } catch {}
};

var ef = function () {
  (yP(),
    nf(),
    setTimeout(tf, 15e3),
    setInterval(
      () => {
        (nf(), tf());
      },
      6e4 + Math.floor(Math.random() * 3e4),
    ));
};

var kP = ["gold", "knb", "lvl", "attrPts", "skPts"];

var LA = { sent: {}, q: [], f12: !1 };

var N3 = ["towerBest", "bosses"];
