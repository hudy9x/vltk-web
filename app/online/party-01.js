// online/party — shared IIFE scope; order is defined in modules.json.
var Zg = function () {
  const A = l.P;
  if (!A || !o.fac) return null;
  const n = (o.mainLock ? A.main : A.bestAuto || A.main) || {},
    t = n.parts || {};
  let e = "phys",
    a = -1;
  for (const r in t) t[r] > a && ((a = t[r]), (e = r));
  const i = Q0.reduce((r, c) => r + (A.res[c] || 0), 0) / Q0.length;
  return {
    v: 1,
    f: o.fac,
    sx: o.sex ? 1 : 0,
    l: o.lvl | 0,
    hp: Math.round(A.life),
    def: Math.round(A.def),
    res: Math.round(i),
    dps: Math.round(n.dps || 0),
    mel: n.melee === !1 ? 0 : 1,
    se: A.series | 0,
    el: e,
    sk: n.n ? String(n.n).slice(0, 24) : "",
    j: l.jx
      ? {
          sx: l.jx.sx,
          r: Object.assign({}, l.jx.rows, {
            horse: o.eq && o.eq.horse && typeof I8 == "function" ? I8(o.eq.horse) : -1,
          }),
          ride: o.eq && o.eq.horse ? 1 : 0,
        }
      : null,
    id: n.id | 0,
    L: n.L | 0,
    nm: n.nMis | 0,
    rt: Math.round((n.rate || 1) * 100) / 100,
    pf: nB(t),
    stn: Math.round(n.stun || 0),
    ct: Math.round((n.coldT || 0) * 10) / 10,
    ...tB(),
  };
};

var nB = function (A) {
  const n = Object.values(A).reduce((e, a) => e + (a > 0 ? a : 0), 0) || 1,
    t = {};
  for (const e in A) A[e] > 0 && (t[e] = Math.round((A[e] / n) * 100) / 100);
  return t;
};

var tB = function () {
  const A = [],
    n = [];
  let t = null;
  if (typeof wn != "function") return { bf: A, cu: n, hl: t };
  for (const e in o.sk || {}) {
    const a = T[e];
    if (!a || !o.sk[e]) continue;
    const i = wn(a),
      r = zi(e);
    if (i === "aura" && !(o.auraOff || {})[e]) kr.has(+e) && A.push([+e, r]);
    else if (i === "buff") {
      if (!kr.has(+e)) continue;
      const c = ae(a, r);
      if (c >= 5) A.push([+e, r]);
      else {
        const d = b0(a, "lifereplenish_v", r);
        d && d[0] > 0 && (t = [+e, Math.round(d[0] * c * 2)]);
      }
    } else i === "curse" && n.push([+e, r, Math.round(Math.min(60, ae(a, r)))]);
  }
  return { bf: A.slice(0, 10), cu: n.slice(0, 4), hl: t };
};

var zl = function (A) {
  return !!(
    A &&
    A.v === 1 &&
    I[A.f] &&
    Number.isFinite(+A.hp) &&
    Number.isFinite(+A.dps) &&
    +A.hp > 0
  );
};

var In = async function (A) {
  if (!yr() || L.busy || document.hidden) return;
  L.nm !== lt() &&
    ((L.nm = lt()),
    (L.pid = null),
    (L.me = null),
    (L.mem = []),
    (L.snaps = {}),
    (L.inv = []),
    (L.closed = !1),
    (l.allies = []),
    (A = !0),
    fi(),
    Kl());
  const n = Date.now();
  if (!(!A && !L.dirty && n - (L.lastP || 0) < (L.wait ? 2e4 : mB))) {
    ((L.busy = !0), (L.lastP = n), (L.dirty = !1));
    try {
      await eB();
    } catch (t) {
      Rl(t) && (L.off = !0);
    } finally {
      L.busy = !1;
    }
  }
};

var eB = async function () {
  const A = !!L.pid && (L.wait || Date.now() - (L.snapAt || 0) > 6e4),
    t = (await Ln((i) => i.rpc("party_state", { p_me: o.name, p_full: A }))).data || {};
  for (const i of t.inv || [])
    L.seen.has(i.id) ||
      (L.seen.add(i.id),
      o.ptRefuse
        ? (Ln((r) => r.rpc("party_answer", { p_id: i.id, p_ok: !1 })).catch(() => {}),
          C(`<span class="dim">👥 Tự từ chối lời mời tổ đội của ${D(i.from_name)}.</span>`))
        : L.inv.push(i));
  Kl();
  const e = L.mem.map((i) => i.name);
  if (!t.pid) {
    (L.pid && C('<span class="dim">👥 Tổ đội đã giải tán / bạn đã rời tổ.</span>'),
      (L.pid = null),
      (L.me = null),
      (L.mem = []),
      (L.wait = !1),
      Gl(),
      fi());
    return;
  }
  (t.pid !== L.pid && (L.snaps = {}),
    (L.pid = t.pid),
    (L.closed = !!t.closed),
    (L.mem = (t.mem || [])
      .slice(0, sa)
      .map((i) => ({
        owner: ia(i.name),
        uid: i.owner,
        name: i.name,
        leader: !!i.leader,
        at: i.at,
      }))),
    (L.me = L.mem.find((i) => i.owner === lt()) || { leader: !!t.leader }));
  const a = {};
  for (const i of t.mem || []) {
    const r = ia(i.name);
    if (r === lt()) continue;
    const c = L.snaps[r] || {};
    a[r] = { name: i.name, lvl: i.lvl, fac: i.fac, updated: i.updated, snap: A ? i.snap : c.snap };
  }
  ((L.snaps = a), A && (L.snapAt = Date.now()));
  for (const i of L.mem)
    i.owner !== lt() &&
      !e.includes(i.name) &&
      e.length &&
      (C(`👥 <b>${D(i.name)}</b> đã vào tổ đội.`), em(`${i.name} đã vào tổ đội`));
  for (const i of e)
    L.mem.some((r) => r.name === i) ||
      (C(`<span class="dim">👥 ${D(i)} đã rời tổ đội.</span>`), em(`${i} đã rời tổ đội`));
  (L.mem.length > 1 &&
    Date.now() - (L.mySnap || 0) > 12e4 &&
    typeof D1 == "function" &&
    ((L.mySnap = Date.now()), (b.lastChar = 0), D1(!0).catch(() => {})),
    (L.wait = L.mem.some(
      (i) => i.owner !== lt() && !zl(L.snaps[i.owner] && L.snaps[i.owner].snap),
    )),
    L.wait && !A && (L.dirty = !0),
    +t.chat > (s0.last || 0) &&
      typeof M2 == "function" &&
      ((s0.at = 0), setTimeout(() => M2(!0), 0)),
    Gl(),
    fi());
};

var Ql = async function (A) {
  if (Nn) {
    k("Tính năng Tổ đội đang tạm đóng");
    return;
  }
  if (!yr()) {
    k(L.off ? "Máy chủ chưa bật Tổ đội (TO_DOI.sql)" : "Cần đăng nhập Giang hồ online");
    return;
  }
  try {
    (typeof Sn == "function" && (await Sn()),
      await Ln((n) => n.rpc("party_invite", { p_from: o.name, p_to: A })),
      k(`Đã mời ${A} vào tổ đội — chờ đồng ý`),
      C(`👥 Đã gửi lời mời tổ đội tới <b>${D(A)}</b> (hết hạn sau 5 phút).`),
      (L.dirty = !0),
      setTimeout(() => In(!0), 25e3));
  } catch (n) {
    Rl(n) ? ((L.off = !0), k("Máy chủ chưa bật Tổ đội (TO_DOI.sql)")) : k(n.message);
  }
};

var vr = async function (A, n) {
  ((L.inv = L.inv.filter((t) => t.id !== A.id)), Kl());
  try {
    const t = await Ln((e) => e.rpc("party_answer", { p_id: A.id, p_ok: n }));
    (n && t.data === "ok"
      ? (k(`Đã vào tổ đội của ${A.from_name}`), C(`👥 Vào tổ đội cùng <b>${D(A.from_name)}</b>.`))
      : n && k("Lời mời đã hết hạn"),
      await In(!0));
  } catch (t) {
    k(t.message);
  }
};

var aB = async function () {
  try {
    (await Ln((A) => A.rpc("party_leave", { p_me: o.name })), k("Đã rời tổ đội"), await In(!0));
  } catch (A) {
    k(A.message);
  }
};

var sB = async function (A) {
  try {
    (await Ln((n) => n.rpc("party_kick", { p_me: o.name, p_name: A.name })),
      k(`Đã mời ${A.name} ra khỏi tổ`),
      await In(!0));
  } catch (n) {
    k(n.message);
  }
};

var iB = async function (A) {
  try {
    (await Ln((n) => n.rpc("party_appoint", { p_me: o.name, p_name: A.name })),
      k(`${A.name} làm đội trưởng`),
      C(`👥 Bổ nhiệm <b>${D(A.name)}</b> làm đội trưởng.`),
      await In(!0));
  } catch (n) {
    k(n.message);
  }
};

var oB = async function () {
  try {
    (await Ln((A) => A.rpc("party_disband", { p_me: o.name })),
      k("Đã giải tán tổ đội"),
      await In(!0));
  } catch (A) {
    k(A.message);
  }
};

var rB = async function (A) {
  try {
    (await Ln((n) => n.rpc("party_close", { p_me: o.name, p_closed: !!A })),
      (L.closed = !!A),
      k(A ? "Đã đóng tổ: không nhận thêm người" : "Đã mở tổ"),
      await In(!0));
  } catch (n) {
    k(n.message);
  }
};

var Gl = function () {
  const A = l.allies || [],
    n = [];
  for (const t of L.mem) {
    if (typeof b > "u" || !b.user || t.owner === lt()) continue;
    const e = L.snaps[t.owner];
    if (!e || !zl(e.snap) || Date.now() - new Date(e.updated).getTime() > im) continue;
    const a = e.snap,
      i = A.find((d) => d.owner === t.owner) || {
        owner: t.owner,
        x: v.x - 40,
        y: v.y + 20,
        t: 0,
        atkT: Math.random(),
        dir: 0,
      },
      r = E(+a.hp, 1, 1e9),
      c = (d) =>
        Array.isArray(d)
          ? d.filter((f) => Array.isArray(f) && T[f[0]]).map((f) => f.map((h) => +h || 0))
          : [];
    (Object.assign(i, {
      id: T[a.id] ? +a.id : cB(a.f),
      L: E(+a.L | 0, 1, 60),
      nm: E(+a.nm | 0, 0, 16),
      rt: E(+a.rt || 1, 0.3, 5),
      pf: a.pf && typeof a.pf == "object" ? a.pf : {},
      stn: E(+a.stn || 0, 0, 100),
      ct: E(+a.ct || 0, 0, 10),
      bf: c(a.bf).slice(0, 10),
      cu: c(a.cu).slice(0, 4),
      hl:
        Array.isArray(a.hl) && T[a.hl[0]] && kr.has(+a.hl[0])
          ? [+a.hl[0], E(+a.hl[1] || 0, 0, 1e7)]
          : null,
    }),
      Object.assign(i, {
        n: e.name,
        f: a.f,
        s: a.sx,
        l: E(+a.l | 0, 1, 999),
        hpMax: r,
        def: Math.max(0, +a.def || 0),
        res: E(+a.res || 0, 0, 95),
        dps: E(+a.dps || 0, 0, 1e9),
        mel: a.mel !== 0,
        se: E(+a.se | 0, 0, 4),
        el: ["phys", "cold", "fire", "light", "poison"].includes(a.el) ? a.el : "phys",
        J: lB(a.j),
      }),
      a.L || (i.L = Math.min(20, Math.max(1, Math.floor((i.l - 80) / 3)))),
      i.J && (i.J.mg = !!(T[i.id] && !T[i.id].phys)),
      i.hp == null && (i.hp = r),
      (i.hp = Math.min(i.hp, r)),
      n.push(i));
  }
  l.allies = n;
};

var cB = function (A) {
  const n = I[A];
  if (!n) return 0;
  let t = 0,
    e = -1;
  for (const a of n.skills) {
    const i = T[a];
    i && i.enemy && !i.aura && (i.tier || i.req || 0) > e && ((e = i.tier || i.req || 0), (t = a));
  }
  return t;
};

var lB = function (A) {
  if (!A || typeof P0 > "u" || !P0 || (A.sx !== "m" && A.sx !== "f") || !A.r) return null;
  const n = (c) => (Number.isInteger(c) ? c : -1),
    t = {
      helm: n(A.r.helm),
      armor: n(A.r.armor),
      weapon: Math.max(0, n(A.r.weapon)),
      horse: n(A.r.horse),
    },
    e = (P0.wnames[A.sx] || [])[t.weapon] || "空手",
    a = P0.assoc[A.sx] || {},
    i = a[e] || a.空手;
  if (!i) return null;
  const r = t.horse >= 0 && A.ride && i[1] ? 1 : 0;
  return (r || (t.horse = -1), { sx: A.sx, rows: t, asc: i[r] || i[0], ride: r });
};

var Am = function (A) {
  const n = l.allies;
  if (!n || !n.length || !H2()) return;
  const t = _1();
  {
    const e =
      H2() +
      ":" +
      n
        .filter((a) => !a.dead)
        .map((a) => a.owner)
        .join(",");
    e !== L.bk && ((L.bk = e), (l.dirty = !0));
  }
  n.forEach((e, a) => {
    if (((e.t += A), e.dead)) {
      ((e.resp -= A),
        e.resp <= 0 &&
          ((e.dead = !1),
          (e.hp = e.hpMax),
          (e.x = v.x - 40),
          (e.y = v.y + 20),
          l.quiet || C(`<span class="dim">👥 ${D(e.n)} hồi sinh.</span>`)));
      return;
    }
    const i = t.filter((u) => q0(v, u) < jh);
    i.length || (e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.03 * A));
    const r = i.sort(
        (u, w) => Math.hypot(u.x - e.x, u.y - e.y) - Math.hypot(w.x - e.x, w.y - e.y),
      )[0],
      c = (a / Math.max(1, n.length)) * Math.PI * 2,
      d = { x: v.x + Math.cos(c) * 46, y: v.y + Math.sin(c) * 22 },
      f = r || d,
      h = r ? (e.mel ? r.r + 18 : 260) : 8,
      g = Math.hypot(f.x - e.x, f.y - e.y);
    if (((e.mv = g > h), e.mv)) {
      const u =
          150 * (typeof Ra == "function" ? Ra() : 1.3) * 1.15 * (e.J && e.J.ride ? 1.25 : 1) * A,
        w = e.x,
        x = e.y;
      if (
        (typeof wa == "function" && !(e.free > 0) && wa(e, f.x, f.y, u),
        Math.hypot(e.x - w, e.y - x) < 0.05)
      ) {
        const p = Math.min(1, u / g);
        ((e.x += (f.x - e.x) * p), (e.y += (f.y - e.y) * p), (e.free = 1));
      } else e.free > 0 && (e.free -= A);
      Math.hypot(e.x - w, e.y - x) > 0.5 && (e.dir = kn(e.x - w, e.y - x));
    }
    if (
      (Math.hypot(v.x - e.x, v.y - e.y) > 600 && ((e.x = d.x), (e.y = d.y)),
      (e.atkT -= A),
      fB(e, t, A),
      r && !e.mv && e.atkT <= 0)
    ) {
      const u = E(1 / (e.rt || 1), 0.35, 2);
      ((e.atkT = u),
        (e.dir = kn(r.x - e.x, r.y - e.y)),
        (e.atD = E(
          (typeof ws == "function" && e.gk && ws(e.gk, "at")) || 0.45,
          0.25,
          Math.max(0.3, u * 0.95),
        )),
        (e.atT = e.atD),
        (e.hurtT = 0));
      const parts = Object.keys(e.pf).length ? e.pf : { [e.el]: 1 };
      const attack = { id: e.id, L: e.L, nMis: e.nm, parts, melee: e.mel, rad: h, ox: e.x, oy: e.y };
      queueSkillContact(e, r, attack, (r) => {
        let w = e.dps * u * Z(0.85, 1.15),
          x = 0;
        const p = Object.keys(e.pf).length ? e.pf : { [e.el]: 1 };
        for (const P in p) {
          let _ = w * p[P];
          if (P === "poison") {
            dB(r, ja(_, "poison", e.se, r.series, r.res, 75, 0));
            continue;
          }
          x += ja(_, P, e.se, r.series, r.res, 75, 0);
        }
        (y1(e.se, r.series) ? (x *= 1 + Ct) : y1(r.series, e.se) && (x *= 1 - Ct),
          (x = Math.max(1, x)),
          (r.hp -= x),
          (r.hitT = 0.1),
          (r.aggro = !0),
          (!r.tgtA || Math.random() < 0.35) && (r.tgtA = e),
          p.cold && !(r.slowT > 0) && (r.slowT = e.ct || f8),
          p.light && Math.random() < Od && (r.stun = Math.max(r.stun || 0, Ed)),
          e.stn && Math.random() * 100 < e.stn && (r.stun = Math.max(r.stun || 0, 0.8)),
          e.id && typeof E8 == "function" && E8({ id: e.id }, r),
          !l.quiet && $A(r.x, r.y - r.r - 6, F(x), "#8fe36a", 11));
      }, { maxTargets: 1 });
    }
    (e.atT > 0 && (e.atT -= A), e.hurtT > 0 && (e.hurtT -= A));
  });
};

var dB = function (A, n) {
  const t = A.poison > 0 ? A.poisonDmg * A.poison : 0;
  ((A.poisonDmg = (t + n) / Math.max(ve, A.poison > 0 ? A.poison : 0)),
    (A.poison = Math.max(ve, A.poison > 0 ? A.poison : 0)));
};

var fB = function (A, n, t) {
  if ((A.supT = (A.supT || 0) - t) > 0) return;
  A.supT = 0.5;
  const e = ya(),
    a = n.length > 0;
  if (A.hl && a && (A.hlCd || 0) <= e) {
    const i = [{ me: !0, hp: l.life, max: l.P.life }]
      .concat(
        (l.allies || []).filter((r) => !r.dead).map((r) => ({ x: r, hp: r.hp, max: r.hpMax })),
      )
      .filter((r) => r.hp < r.max * 0.6);
    if (i.length) {
      A.hlCd = e + 8;
      for (const r of i) r.me ? za(A.hl[1], !0) : (r.x.hp = Math.min(r.x.hpMax, r.x.hp + A.hl[1]));
      l.quiet || $A(A.x, A.y - 60, "✚ " + T[A.hl[0]].n, "#8f8", 11);
    }
  }
  if (!(!a || !A.cu || !A.cu.length))
    for (const [i, r, c] of A.cu) {
      const f = n
        .filter((g) => !((g.curse || {})[i] > e))
        .sort(
          (g, u) =>
            (u.cls === "boss") - (g.cls === "boss") ||
            (u.cls === "elite") - (g.cls === "elite") ||
            Math.hypot(g.x - A.x, g.y - A.y) - Math.hypot(u.x - A.x, u.y - A.y),
        )[0];
      if (!f || Math.hypot(f.x - A.x, f.y - A.y) > 420 || (f.cls === "normal" && n.length < 3))
        continue;
      const h = (g) => {
        (((g.curse || (g.curse = {}))[i] = ya() + Math.max(3, c || 10)),
          ((g.curseL || (g.curseL = {}))[i] = r));
      };
      queueSkillContact(A, f, {
        id: i, L: r, parts: {}, melee: false, rad: 420,
        geo: { k: "spot", r: 120, pierce: true }, ox: A.x, oy: A.y,
      }, target => {
        h(target);
      }, { maxTargets: Infinity });
      break;
    }
};

var nm = function () {
  if (!H2() || !l.allies) return [];
  const A = {};
  for (const n of l.allies)
    if (!n.dead)
      for (const [t, e] of n.bf || [])
        kr.has(+t) && !(o.sk && o.sk[t]) && (!A[t] || A[t] < e) && (A[t] = e);
  return Object.entries(A).map(([n, t]) => [+n, t]);
};

var hB = function (A, n) {
  if (Math.random() * 100 >= Pe(n.ar, A.def)) {
    l.quiet || $A(A.x, A.y - 30, "Né", "#9cf", 10);
    return;
  }
  let t = n.dmg * Z(0.8, 1.2) * (1 - Math.min(75, A.res) / 100);
  if (
    (y1(n.series, A.se) ? (t *= 1 + Ct) : y1(A.se, n.series) && (t *= 1 - Ct),
    (A.hp -= t),
    l.quiet || $A(A.x + Z(-8, 8), A.y - 34, "-" + F(t), "#ff8a7a", 10),
    !(A.atT > 0) && Math.random() < 0.3 && (A.hurtT = 0.25),
    A.hp <= 0)
  ) {
    ((A.hp = 0), (A.dead = !0), (A.resp = sm));
    for (const e of l.enemies) e.tgtA === A && (e.tgtA = null);
    l.quiet || C(`<span class="dim">👥 ${D(A.n)} trọng thương, hồi sinh sau ${sm} giây.</span>`);
  }
};

var uB = function (A, n, t) {
  ((A.fillStyle = "#0007"), A.beginPath(), A.ellipse(n.x, n.y, 16, 6, 0, 0, 7), A.fill());
  const e = n.atT > 0 ? "at" : n.hurtT > 0 ? "hurt" : n.mv ? "run" : "st",
    a = e === "at" ? (n.atD || 0.45) - n.atT : e === "hurt" ? 0.25 - n.hurtT : n.t,
    i = Jt(n.f, n.s);
  n.gk = i && i.anim;
  let r = !1;
  (n.J &&
    typeof It == "function" &&
    ((r = It(e, n.dir || 0, a, n.x, n.y, Jn, 1, n.gk, n.J)),
    !r && e !== "st" && (r = It(n.mv ? "run" : "st", n.dir || 0, n.t, n.x, n.y, Jn, 1, n.gk, n.J))),
    !r &&
      i &&
      i.anim &&
      (r =
        Va(i.anim, e, n.dir || 0, a, n.x, n.y, Jn) ||
        Va(i.anim, "st", n.dir || 0, n.t, n.x, n.y, Jn)),
    r ||
      ((A.fillStyle = w0[I[n.f].series]), A.beginPath(), A.arc(n.x, n.y - 20, 12, 0, 7), A.fill()),
    L3(
      n.x,
      n.y - (r ? Math.min(r, 90) * 0.9 : 52) - 6,
      `${n.n}`,
      "#7fe36a",
      11,
      n.hp / n.hpMax,
      "#5fd35a",
    ));
};

var tm = function (A) {
  const n = A.owner === lt(),
    t = (l.allies || []).find((r) => r.owner === A.owner),
    e = L.snaps[A.owner],
    a = n ? (l.P ? l.life / l.P.life : 1) : t ? (t.dead ? 0 : t.hp / t.hpMax) : 0,
    i = n ? "" : t ? (t.dead ? `hồi sinh ${Math.ceil(t.resp)}s` : "") : wB(e);
  return {
    me: n,
    a: t,
    c: e,
    hp: E(a, 0, 1),
    st: i,
    fac: n ? o.fac : e && e.fac,
    lv: n ? o.lvl : e ? e.lvl : "?",
  };
};

var fi = function s() {
  let A = document.getElementById("ptBox");
  if (!L.pid || !L.mem.length) {
    A && A.remove();
    return;
  }
  A ||
    ((A = document.createElement("div")),
    (A.id = "ptBox"),
    document.body.appendChild(A),
    (A.onclick = (e) => {
      const a = e.target.closest("[data-ptn]");
      if (e.target.closest(".ptsh")) {
        ((o.ptHide = !o.ptHide), s());
        return;
      }
      a && typeof En == "function" && En(a.dataset.ptn);
    }));
  const n = !!o.ptHide,
    t =
      `<div class="pth"><button class="ptsh${n ? " off" : ""}" title="${n ? "Hiện" : "Ẩn"} khung tổ đội"></button><span>Tổ đội ${L.mem.length}/${sa}${L.closed ? " 🔒" : ""}</span></div>` +
      (n
        ? ""
        : L.mem
            .map((e) => {
              const a = tm(e);
              return `<div class="ptf${a.me ? " me" : ""}${a.a && a.a.dead ? " dead" : ""}" data-ptn="${D(e.name)}" title="${D(e.name)} · Lv${a.lv}"><i class="fi" style="background-position:${(cm(a.fac) * 100) / 11}% 0"></i>${e.leader ? '<i class="fl"></i>' : ""}
        <span class="nm">${D(e.name)}</span><small class="lv">${a.lv}</small><em class="lf"><u style="width:${Math.round(a.hp * 100)}%"></u></em>${a.st ? `<small class="st">${D(a.st)}</small>` : ""}</div>`;
            })
            .join(""));
  t !== L.boxH && ((L.boxH = t), (A.innerHTML = t));
};

var Kl = function () {
  typeof hi == "function" && hi();
  let A = document.getElementById("ptInv");
  L.inv = L.inv.filter((t) => Date.now() - new Date(t.created).getTime() < 5 * 6e4);
  const n = L.inv[0];
  if (!n) {
    A && A.remove();
    return;
  }
  if (
    (A || ((A = document.createElement("div")), (A.id = "ptInv"), document.body.appendChild(A)),
    (A.innerHTML = `<div>👥 <b>${D(n.from_name)}</b> mời bạn vào tổ đội</div><div class="btnrow"><button class="btn sm" id="ptY">Đồng ý</button><button class="btn sm" id="ptN">Từ chối</button></div>`),
    (m("#ptY").onclick = () => vr(n, !0)),
    (m("#ptN").onclick = () => vr(n, !1)),
    typeof o0 == "function")
  )
    try {
      o0("learn");
    } catch {}
};

var gB = function () {
  const A = m("#giftBtn");
  if (!A || m("#ptBtn")) return;
  const n = document.createElement("button");
  ((n.id = "ptBtn"),
    (n.title = "Tổ đội"),
    (n.textContent = "👥"),
    A.parentNode.insertBefore(n, A),
    (n.onclick = () => {
      (typeof o0 == "function" && o0("click"), ui());
    }),
    hi());
};

var hi = function () {
  const A = L.inv.length,
    n = typeof h0 != "function" || h0();
  for (const e of [m("#ptBtn"), m("#u20pt")])
    e &&
      (e.classList.toggle("on", A > 0),
      (e.dataset.n = A || ""),
      e.classList.toggle("in", !!L.pid),
      (e.style.display = n ? "" : "none"));
  {
    const e = m("#tabRide");
    e && e.classList.toggle("inv", A > 0);
  }
  const t = document.querySelector('#u20menu [data-u="team"]');
  if (t) {
    const e = t.querySelector(".dot");
    (e && e.classList.toggle("on", A > 0),
      (t.title = L.pid ? `Tổ đội (${L.mem.length}/${sa})` : "Tổ đội"),
      t.classList.toggle("pt", !!L.pid));
  }
};

var ui = function s() {
  if (Nn) {
    k("Tính năng Tổ đội đang tạm đóng");
    return;
  }
  const A = !!(L.me && L.me.leader),
    n = L.mem.length,
    t = yr(),
    e = (u) => (typeof I < "u" && I[u] && I[u].n) || "",
    a = t
      ? ""
      : `<div class="ptmsg">${L.off ? "⚠ Máy chủ chưa bật Tổ đội." : "🌐 Cần đăng nhập Giang hồ online để lập tổ đội."}</div>`,
    i = L.inv.length
      ? '<div class="pth2">📨 Lời mời đang chờ</div>' +
        L.inv
          .map(
            (u) =>
              `<div class="ptm"><span class="nm"><b>${D(u.from_name)}</b> mời bạn vào tổ</span><button class="btn sm on" data-pty="${u.id}">Đồng ý</button><button class="btn sm" data-ptn2="${u.id}">Từ chối</button></div>`,
          )
          .join("")
      : "",
    r = n
      ? L.mem
          .map((u) => {
            const w = tm(u),
              x = e(w.fac);
            return `<div class="ptm${w.me ? " me" : ""}"><i class="fi" style="background-position:${(cm(w.fac) * 100) / 11}% 0"></i><span class="nm">${u.leader ? '<b class="ld" title="Đội trưởng">★</b> ' : ""}${D(u.name)} ${w.me ? '<small class="dim">(bạn)</small>' : w.st ? `<small class="dim">${D(w.st)}</small>` : ""}<br><small>Lv${w.lv}${x ? " · " + D(x) : ""}</small><i style="width:${Math.round(w.hp * 100)}%"></i></span>
        ${w.me ? "" : `<button class="btn sm" data-ptv="${D(u.name)}">Xem</button>`}${A && !w.me ? `<button class="btn sm" data-ptap="${D(u.owner)}" title="Chuyển đội trưởng">Bổ nhiệm</button><button class="btn sm" data-ptk2="${D(u.owner)}">Mời ra</button>` : ""}</div>`;
          })
          .join("")
      : `<div class="ptmsg dim">Nhân vật <b>${D(o.name || "")}</b> chưa có tổ đội. Mời người chơi bằng tên bên dưới, hoặc bấm tên trên kênh chat → <b>👥 Mời tổ đội</b>.</div>`,
    d =
      t && n < sa && (!n || A) && !L.closed
        ? '<div class="ptadd"><input id="ptName" maxlength="20" placeholder="Tên nhân vật cần mời"><button class="btn sm on" id="ptGo">Mời</button></div>'
        : n && !A
          ? '<div class="ptmsg dim">Chỉ đội trưởng mới mời được người vào tổ.</div>'
          : n && L.closed
            ? '<div class="ptmsg dim">🔒 Tổ đang đóng — mở tổ để mời thêm.</div>'
            : "",
    f = Yl(),
    h =
      n > 1
        ? `<div class="ptmsg">📈 Kinh nghiệm <b>+${Math.round((f - 1) * 100)}%</b> (mỗi đồng đội +15%, chênh cấp nhận ít hơn) · bùa lợi của đồng đội cộng cho cả tổ</div>`
        : "",
    g =
      (A && n
        ? `<button class="btn sm" id="ptClose">${L.closed ? "🔓 Mở tổ" : "🔒 Đóng tổ"}</button><button class="btn sm" id="ptDis">Giải tán</button>`
        : "") +
      (n ? '<button class="btn sm" id="ptLeave">Rời tổ đội</button>' : "") +
      '<button class="btn sm" id="ptRef">Làm mới</button>';
  J(
    `<div id="ptMgr"><h3>👥 Tổ đội ${n ? `<small>${n}/${sa}${L.closed ? " · đang đóng" : ""}</small>` : ""}</h3>${a}${i}<div class="pth2">Thành viên</div>${r}${h}${d}
    <div class="btnrow">${g}</div>
    <label class="ptchk"><input type="checkbox" id="ptRefuse"${o.ptRefuse ? " checked" : ""}> Tự từ chối lời mời tổ đội</label>
    <div class="dim ptnote">Tổ đội theo nhân vật · tối đa ${sa} người · lời mời hết hạn sau 5 phút · đồng đội không vào Thông Thiên Tháp / Boss tuần.</div></div>`,
    () => {
      const u = (P) => m("#ptMgr").querySelectorAll(P),
        w = (P) => L.mem.find((_) => _.owner === P);
      (u("[data-pty]").forEach(
        (P) =>
          (P.onclick = async () => {
            const _ = L.inv.find((y) => String(y.id) === P.dataset.pty);
            _ && (await vr(_, !0), s());
          }),
      ),
        u("[data-ptn2]").forEach(
          (P) =>
            (P.onclick = async () => {
              const _ = L.inv.find((y) => String(y.id) === P.dataset.ptn2);
              _ && (await vr(_, !1), s());
            }),
        ),
        u("[data-ptv]").forEach(
          (P) =>
            (P.onclick = () => {
              typeof En == "function" && En(P.dataset.ptv);
            }),
        ),
        u("[data-ptk2]").forEach(
          (P) =>
            (P.onclick = async () => {
              const _ = w(P.dataset.ptk2);
              _ && (await xr(`Mời ${_.name} ra khỏi tổ đội?`)) && (await sB(_), s());
            }),
        ),
        u("[data-ptap]").forEach(
          (P) =>
            (P.onclick = async () => {
              const _ = w(P.dataset.ptap);
              _ && (await xr(`Bổ nhiệm ${_.name} làm đội trưởng?`)) && (await iB(_), s());
            }),
        ));
      const x = m("#ptGo");
      if (x) {
        const P = async () => {
          const _ = (m("#ptName").value || "").trim();
          if (_) {
            if (o.name && _.toLowerCase() === o.name.toLowerCase()) {
              k("Không tự mời chính mình");
              return;
            }
            (await Ql(_), s());
          }
        };
        ((x.onclick = P),
          (m("#ptName").onkeydown = (_) => {
            _.key === "Enter" && P();
          }));
      }
      const p = (P, _) => {
        const y = m(P);
        y && (y.onclick = _);
      };
      (p("#ptLeave", async () => {
        (await xr("Rời tổ đội?")) && (await aB(), s());
      }),
        p("#ptDis", async () => {
          (await xr("Giải tán tổ đội? Mọi thành viên sẽ rời tổ.")) && (await oB(), s());
        }),
        p("#ptClose", async () => {
          (await rB(!L.closed), s());
        }),
        p("#ptRef", async () => {
          (await In(!0), s());
        }),
        (m("#ptRefuse").onchange = (P) => {
          ((o.ptRefuse = !!P.target.checked),
            typeof $ == "function" && $(),
            k(o.ptRefuse ? "Sẽ tự từ chối lời mời tổ đội" : "Nhận lời mời tổ đội"));
        }));
    },
  );
};

var em = function (A) {
  (s0.msgs.push({ id: "sys" + Date.now() + Math.random(), sys: !0, msg: A, ts: Date.now() }),
    s0.msgs.length > 80 && s0.msgs.shift(),
    br());
};

var br = function () {
  (typeof BA == "function" && BA(),
    typeof T2 == "function" && typeof uA < "u" && uA === "party" && T2(),
    hi());
};

var M2 = async function (A) {
  if (!L.pid || !yr() || s0.off || s0.busy) return;
  s0.pid !== L.pid && ((s0.pid = L.pid), (s0.msgs = []), (s0.last = 0), (s0.unread = 0));
  const n = (typeof H < "u" && H.open && H.chan === "p") || (typeof uA < "u" && uA === "party");
  if (!document.hidden && !(!A && (!n || Date.now() - s0.at < 8e3))) {
    ((s0.at = Date.now()), (s0.busy = !0));
    try {
      let t = b.sb
        .from("party_chat")
        .select("id,owner,name,fac,lvl,msg,ts")
        .eq("pid", L.pid)
        .order("id", { ascending: !!s0.last })
        .limit(40);
      s0.last && (t = t.gt("id", s0.last));
      const e = await t;
      if (e.error) throw e.error;
      let a = e.data || [];
      s0.last || (a = a.reverse());
      for (const i of a) {
        s0.last = Math.max(s0.last, +i.id);
        const r = s0.msgs.findIndex(
          (c) => c.pending && ia(c.name) === ia(i.name) && c.msg === i.msg,
        );
        r >= 0
          ? (s0.msgs[r] = i)
          : s0.msgs.some((c) => c.id === i.id) ||
            (s0.msgs.push(i), ia(i.name) !== Fl() && !(H.open && H.chan === "p") && s0.unread++);
      }
      (s0.msgs.length > 80 && s0.msgs.splice(0, s0.msgs.length - 80), a.length && br());
    } catch (t) {
      (Rl(t) || /party_chat/.test(String(t && t.message))) && (s0.off = !0);
    } finally {
      s0.busy = !1;
    }
  }
};

var am = async function (A) {
  if (!L.pid) return (k("Bạn chưa có tổ đội · bấm 👥 để mời người chơi"), !1);
  if (s0.off) return (k("Máy chủ chưa bật chat Tổ đội (chạy lại TO_DOI.sql)"), !1);
  if (Date.now() - (s0.sent || 0) < 2500) return (k("Gửi chậm lại một chút"), !1);
  s0.sent = Date.now();
  const n = I[o.fac] ? I[o.fac].n : "",
    t = {
      id: "tmp" + Date.now(),
      owner: Fl(),
      name: o.name,
      fac: n,
      lvl: o.lvl | 0,
      msg: A,
      ts: new Date().toISOString(),
      pending: !0,
    };
  (s0.msgs.push(t), br());
  try {
    return (
      typeof Sn == "function" && (await Sn()),
      await Ln((e) => e.rpc("party_say", { p_name: o.name, p_fac: n, p_lvl: o.lvl | 0, p_msg: A })),
      (s0.at = 0),
      await M2(!0),
      !0
    );
  } catch (e) {
    return (
      (s0.msgs = s0.msgs.filter((a) => a !== t)),
      br(),
      /party_say|Could not find the function/i.test(String(e && e.message))
        ? ((s0.off = !0), k("Máy chủ chưa bật chat Tổ đội (chạy lại TO_DOI.sql)"))
        : k(e.message || "Gửi lỗi"),
      !1
    );
  }
};

var Nn = !0;

Nn && document.documentElement.classList.add("ptclosed");

var L = {
  off: Nn,
  pid: null,
  me: null,
  mem: [],
  snaps: {},
  seen: new Set(),
  lastI: 0,
  lastP: 0,
  busy: !1,
  inv: [],
};

var sa = 8;

var $M = 0.05;
