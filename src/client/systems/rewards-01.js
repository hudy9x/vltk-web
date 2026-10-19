// systems/rewards — shared IIFE scope; order is defined in modules.json.
var oc = (s) => s.kind + ":" + s.tier;

var hh = (s) => S.potions.find((A) => oc(A) === s) || null;

var ro = (s) => o.lvl >= (be[s.tier] || 999);

var rc = ["life", "mana"];

var co = (s) => {
  const A = sc()[s];
  return A && A !== "auto" ? hh(A) : null;
};

var Q = function () {
  const A = o.rw || (o.rw = {});
  (!A.stat || typeof A.stat != "object") && (A.stat = {});
  for (const [n, t] of Object.entries(pb)) n in A.stat || (A.stat[n] = t);
  return (
    (A.login = Object.assign(
      { last: "", streak: 0, total: 0, got: {}, claimed: !0 },
      A.login || {},
    )),
    A.towerRst !== 1 && ((A.stat.towerBest = 0), (A.towerRst = 1), delete o.resumeTower),
    (A.ach = A.ach || {}),
    (A.title = A.title || ""),
    (A.fd = A.fd || 0),
    A.gbT == null && (A.gbT = Mh),
    (A.pet = A.pet || null),
    A
  );
};

var cc = function (A, n) {
  if (((n = Math.trunc(+n || 0)), !n || !o)) return;
  const t = Q();
  (A === "fd"
    ? (t.fd = Math.max(0, (t.fd || 0) + n))
    : (t.stat.tokens = Math.max(0, (t.stat.tokens || 0) + n)),
    at() && (t2()[A] += n));
};

var lo = function (A, n) {
  const t = t2(),
    e = Q();
  (A >= 0 && (e.fd = Math.max(0, A + t.fd)), n >= 0 && (e.stat.tokens = Math.max(0, n + t.tok)));
};

var sn = async function () {
  return !at() || !o || !o.fac
    ? null
    : (CA.busy ||
        (CA.busy = (async () => {
          const A = t2(),
            n = { fd: A.fd, tok: A.tok };
          ((A.fd = 0), (A.tok = 0));
          try {
            const t = await b.sb.rpc("pd_sync", { s: m0, e: n });
            if (t.error) throw t.error;
            ((CA.ok = !0), (CA.t = Date.now()), lo(+t.data.fd, +t.data.tok));
            const e = t.data.got || {},
              a = Math.max(0, n.fd - (e.fd | 0)),
              i = Math.max(0, n.tok - (e.tok | 0));
            return (
              (a > 0 || i > 0) &&
                C(
                  `<span class="dim">Đã đạt giới hạn nhận trong ngày${a > 0 ? ` (${a} Phúc Duyên)` : ""}${i > 0 ? ` (${i} ${$e().token})` : ""}</span>`,
                ),
              typeof $ == "function" && $(),
              typeof et == "function" && et(),
              t.data
            );
          } catch (t) {
            const e = String(t && (t.message || t));
            if (/pd_sync|Could not find the function|schema cache/i.test(e)) CA.off = !0;
            else {
              const a = t2();
              ((a.fd += n.fd), (a.tok += n.tok));
            }
            throw t;
          } finally {
            CA.busy = null;
          }
        })()),
      CA.busy);
};

var fo = async function (A, n, t) {
  n = Math.floor(n);
  const e = Q(),
    a = A === "fd" ? e.fd : e.stat.tokens;
  if (!(n > 0)) return !1;
  if (a < n) return (k(A === "fd" ? `Cần ${n} Phúc Duyên` : `Cần ${n} ${$e().token}`), !1);
  if (at()) {
    try {
      await sn();
    } catch {
      if (!CA.off) return (k("Cần kết nối máy chủ — thử lại"), !1);
    }
    if (at())
      try {
        const i = await e0((r) =>
          r.rpc("pd_spend", { s: m0, k: A, n, why: String(t || "").slice(0, 60) }),
        );
        return (lo(+i.data.fd, +i.data.tok), !0);
      } catch (i) {
        return (k(i.message || String(i)), sn().catch(() => {}), !1);
      }
  }
  return (A === "fd" ? (e.fd -= n) : (e.stat.tokens -= n), !0);
};

var Jv = function () {
  return N0(1, MA);
};

var uh = function (A) {
  const n = {};
  for (let t = 0; t < A; t++) {
    const e = Jv();
    ((n[e] = (n[e] || 0) + 1), U("ht", e, 1));
  }
  return Object.keys(n)
    .sort((t, e) => e - t)
    .map((t) => `${n[t]} Huyền Tinh cấp ${t}`)
    .join(", ");
};

var ho = async function (A, n = 1) {
  if (typeof _t != "function" || !_t()) {
    C('<span class="dim">Hồng Bao / Đại Hồng Bao chỉ nhận khi đã đăng nhập tài khoản.</span>');
    return;
  }
  try {
    const e =
      (await e0((a) => a.rpc("hb_reward", { k: A, cnt: n, s: typeof m0 < "u" ? m0 : 0 }))).data ||
      {};
    e.got
      ? (RA("hb", e.hb), RA("dhb", e.dhb), (R = !0), typeof V == "function" && V())
      : e.why && C(`<span class="dim">Hồng Bao: ${D(e.why)}</span>`);
  } catch (t) {
    C(`<span class="dim">Chưa nhận được Hồng Bao (${D(t.message || t)}).</span>`);
  }
};

var z0 = function (A, n, t) {
  const e = [];
  if (A.gold) {
    const a = Math.round(A.gold * (1 + o.lvl / 10));
    ((o.gold += a), e.push(`${q(a)} lượng`));
  }
  if (A.pot) {
    const a = $h(A.pot.tier),
      i = C1(A.pot.kind),
      r = S.potions.find((c) => c.kind === A.pot.kind && c.tier === a);
    ((i[a] = (i[a] || 0) + A.pot.n), e.push(`${A.pot.n} ${r ? r.n : "bình thuốc"}`));
  }
  if (A.ht && A.htr) e.push(uh(A.ht));
  else if (A.ht) {
    const a = E(Math.floor(o.lvl / 15) + 1, 1, MA);
    (U("ht", a, A.ht), e.push(`${A.ht} Huyền Tinh cấp ${a}`));
  }
  if (A.fd) {
    const a = Math.floor(A.fd * dc + Math.random());
    a > 0 && (cc("fd", a), e.push(`${a} Phúc Duyên`));
  }
  if (A.knb) {
    const a = A.knb * H4;
    (Dr("reward", a), e.push(`${a} Kim Nguyên Bảo`));
  }
  if (A.item) {
    const a = (() => {
      const i = N0(0, 9);
      return _A(i, _a(i, 0), E(Math.round(o.lvl / 12) + 1, 1, 10), A.item);
    })();
    a && (xn(a, !0, !0, !0), e.push(D(a.n)));
  }
  if (A.set && !A.common && Ca("grant") < 1 && Math.random() >= Ca("grant") * zh) {
    const a = E(Math.floor(o.lvl / 15) + 1, 1, MA);
    (U("ht", a, 2), e.push(`2 Huyền Tinh cấp ${a}`));
  } else if (A.set) {
    const a = Ts(A.common);
    a && (xn(a, !0, !0, !0), e.push(`<b style="color:${_0[a.r]}">${D(a.n)}</b>`));
  }
  if ((A.pts && ((o.attrPts += A.pts), e.push(`${A.pts} điểm tiềm năng`)), A.buff))
    for (const a in A.buff) {
      const [i, r] = A.buff[a];
      (nt(a, i, r), e.push(fc(a, i, r)));
    }
  if (
    (A.skp && ((o.skPts = (o.skPts || 0) + A.skp), e.push(`${A.skp} điểm kỹ năng`)),
    A.xp && o.lvl < G2())
  ) {
    const a = o.lvl;
    (d8((S.exp[o.lvl - 1] * A.xp) / ye),
      e.push(
        o.lvl > a
          ? `kinh nghiệm (lên cấp ${o.lvl})`
          : `${Math.round(A.xp * 1e3) / 10}% kinh nghiệm`,
      ));
  }
  if (A.kt)
    for (const a in A.kt) {
      const i = A.kt[a],
        r = typeof J0 < "u" && J0.find((c) => c.k === a);
      if (!(!i || !r)) {
        if (B4(a, i)) e.push(`${i} ${r.n}`);
        else {
          for (let c = 0; c < i; c++) r.use();
          e.push(`${i} ${r.n} (hành trang đầy: dùng ngay)`);
        }
        R = !0;
      }
    }
  if (A.hb || A.dhb) {
    const a = (i, r) => {
      l.batch ? ((l.hbQ = l.hbQ || {}), (l.hbQ[i] = (l.hbQ[i] || 0) + r)) : ho(i, r);
    };
    (t === "srv" ||
      (t && /^(d|m|lv|ach):/.test(t)
        ? a(t, 1)
        : (A.hb && a((t || "fd") + ":hb", A.hb), A.dhb && a((t || "fd") + ":dhb", A.dhb))),
      A.hb && e.push(`${A.hb} Hồng Bao`),
      A.dhb && e.push(`${A.dhb} Đại Hồng Bao`));
  }
  if (A.misc) {
    for (const a of ["vlmt", "ttk"])
      if (A.misc[a] > 0 && typeof xa == "function") {
        const i = Math.max(0, XA(a) - pn(a) - N("misc", a)),
          r = Math.max(0, A.misc[a] - i);
        if (
          (r &&
            (A = Object.assign({}, A, { misc: Object.assign({}, A.misc, { [a]: A.misc[a] - r }) })),
          r)
        ) {
          const c = r * 5;
          (l.batch
            ? ((l.hbQ = l.hbQ || {}), (l.hbQ["bk:hb"] = (l.hbQ["bk:hb"] || 0) + c))
            : ho("bk:hb", c),
            e.push(`${c} Hồng Bao (thay ${r} ${rt(a)} vì đã đủ)`));
        }
      }
  }
  if (A.misc)
    for (const a in A.misc)
      A.misc[a] > 0 &&
        (U("misc", a, A.misc[a]), e.push(`<b style="color:#ffd24a">${A.misc[a]} ${rt(a)}</b>`));
  return (
    e.length && !l.batch && (C(`🎁 ${D(n)}: ${e.join(", ")}`), l.quiet || o0("learn"), $()),
    e
  );
};

var Ts = function (A, n) {
  const t = I[o.fac] ? I[o.fac].id : -1,
    e = o.lvl + 15,
    a = (c, d) => (c.req.find((f) => f[0] === d) || [0, -1])[1],
    i = S.sets.gold.filter((c) => k1(c.req) && cA(c) && c3(c, o.lvl));
  if (A) {
    const c = S.sets.gold.filter((g) => k1(g.req) && cA(g) && a(g, 39) < 0 && Pb.test(g.n)),
      d = c.filter((g) => a(g, 36) <= e && c3(g, o.lvl)),
      f = c.filter((g) => a(g, 36) <= e),
      h = d.length ? d : f.length ? f : c;
    return h.length ? Ta("gold", C0(h), 5) : null;
  }
  if (!n && Math.random() >= Wp) {
    const c = i.filter((d) => a(d, 39) < 0 && a(d, 36) <= e);
    if (c.length) return Ta("gold", C0(c), 5);
  }
  let r = n
    ? i.filter((c) => a(c, 39) === t && a(c, 36) <= e)
    : i.filter((c) => a(c, 39) >= 0 && a(c, 36) <= e);
  return (
    r.length || (r = i.filter((c) => a(c, 36) <= e)),
    r.length || (r = i.filter((c) => a(c, 39) === t)),
    r.length ? Ta("gold", C0(r), 5) : null
  );
};

var uo = function () {
  if (!o || !o.fac) return;
  const A = Q().login,
    n = Oe();
  if (A.last === n) return;
  const t = new Date();
  (t.setDate(t.getDate() - 1),
    (A.streak = A.last === Os(t) ? A.streak + 1 : 1),
    (A.last = n),
    A.total++,
    (A.claimed = !1),
    Q().dq && delete Q().dq,
    tt());
};

var Wv = function () {
  const A = Q().login;
  if (A.claimed) return;
  ((A.claimed = !0),
    z0(Ch[(A.streak - 1) % 7], `Điểm danh ngày ${A.streak}`, "d:" + (((A.streak - 1) % 7) + 1)));
  const n = vb(A.total);
  (n &&
    !A.got[A.total] &&
    ((A.got[A.total] = 1), z0(n, `Điểm danh ${A.total} ngày`, "m:" + (((A.total - 1) % 30) + 1))),
    Mn());
};

var go = function () {
  const A = Q().lvGot || {};
  return uc().filter(([n]) => o.lvl >= n && !A[Es(n)]);
};

var gh = function (A) {
  const n = Q(),
    t = uc().find((e) => e[0] === A);
  ((n.lvGot = n.lvGot || {}),
    !(!t || o.lvl < A || n.lvGot[Es(A)]) &&
      ((n.lvGot[Es(A)] = 1),
      z0(t[1], `Mốc cấp ${A}${v0() ? ` (chuyển sinh ${v0()})` : ""}`, `lv:${v0()}:${A}`),
      Mn(),
      et()));
};

var Lt = function (A) {
  const n = o && o.buf && o.buf[A];
  return n && n.until > Date.now() ? n.p : 0;
};

var nt = function (A, n, t) {
  const e = yb(),
    a = Date.now(),
    i = e[A];
  i && i.until > a
    ? (e[A] =
        n >= i.p
          ? { p: n, until: i.until + t * 6e4 }
          : { p: i.p, until: i.until + (t * 6e4 * n) / i.p })
    : (e[A] = { p: n, until: a + t * 6e4 });
};

var qt = function () {
  const A = Date.now(),
    n = [];
  for (const t in Ss) {
    const e = o.buf && o.buf[t];
    if (!e || e.until <= A) continue;
    const a = Math.round((e.until - A) / 1e3);
    n.push(
      `${bb[t]} ${Ss[t]} +${Ih(t) ? Math.round(e.p) : Math.round(e.p * 100) + "%"} <small class="dim">${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}</small>`,
    );
  }
  return n.join(" · ");
};

var _n = function (A, n = 1) {
  o && o.fac && A === "picked" && (Q().stat.picked += n);
};

var Zv = function () {
  const A = Q();
  if (A.hbFix >= 1 || typeof _t != "function" || !_t() || (typeof b < "u" && !b.user)) return;
  A.hbFix = 1;
  const n = [];
  for (const [e, , , a] of a2) A.ach[e] && (a.hb || a.dhb) && n.push("ach:" + e);
  const t = A.lvGot || {};
  for (const e in t) {
    const a = String(e).match(/^(?:(\d+):)?(\d+)$/);
    if (!a) continue;
    const i = +(a[1] || 0),
      r = +a[2],
      c = (i ? Eh : hc).find((d) => d[0] === r);
    c && (c[1].hb || c[1].dhb) && n.push(`lv:${i}:${r}`);
  }
  (async () => {
    for (const e of n) await ho(e, 1);
  })();
};

var Mn = function () {
  if (!o || !o.fac) return;
  const A = Q();
  Zv();
  const n = A.achx || (A.achx = {});
  for (const [t, e, , a] of a2)
    if (A.ach[t] && !n[t]) {
      n[t] = 1;
      const i = {};
      for (const r of ["kt", "hb", "dhb", "misc"]) a[r] && (i[r] = a[r]);
      Object.keys(i).length && z0(i, `Thành tựu «${e}» (quà bổ sung)`, "ach:" + t);
    }
  for (const [t, e, a, i] of a2)
    !A.ach[t] &&
      a() &&
      ((A.ach[t] = 1),
      (n[t] = 1),
      z0(i, `Thành tựu «${e}»`, "ach:" + t),
      l.quiet || k(`Thành tựu: ${e}`),
      tt());
  typeof Pc == "function" && Pc();
};

var Ab = function (A) {
  o.fac && !l.town && !l.tower && !l.dg && (Q().gbT -= A);
};

var mh = function () {
  return !l.tower && !l.dg && Q().gbT <= 0;
};

var wh = function () {
  const A = AA(Math.min(o.stage, d0)),
    n = Math.min(De(o.stage), o.lvl) + 2,
    [t, e] = X0(v.x + 240, v.y - 120),
    a = n1(A.boss, n, "boss", t, e);
  ((a.hp = a.max = a.max * 2),
    (a.dmg *= 1.15),
    (a.goldBoss = !0),
    (a.n = "Trùm Hoàng Kim · " + ga(A.boss, A.n)),
    l.enemies.push(a),
    (Q().gbT = Mh),
    (l.banner = { t: 2.5, text: "Trùm Hoàng Kim xuất hiện!", sub: "Hạ để nhận đồ Hoàng Kim" }),
    C('<b style="color:#ffb52e">Trùm Hoàng Kim xuất hiện!</b>'));
};

var nb = function (A) {
  let n = 0;
  return (
    A >= 3600 && (z0({ ht: 2, pot: { kind: "life", tier: 2, n: 5 } }, "Tu luyện 1 giờ"), n++),
    A >= 4 * 3600 && (z0({ fd: 10, buff: { xp: [0.3, 30] } }, "Tu luyện 4 giờ"), n++),
    A >= 8 * 3600 - 60 && (z0({ set: 1, fd: 20 }, "Tu luyện 8 giờ"), n++),
    n
  );
};

var A2 = function () {
  if (l.dg) {
    k("Đang ở phó bản");
    return;
  }
  if ((l.town && en(), l.deadT > 0)) {
    k("Đang trọng thương, chờ hồi phục");
    return;
  }
  (typeof Jo == "function" && Jo(),
    (l.tower = { floor: Math.max(1, Q().stat.towerBest - 4) }),
    (l.enemies = []),
    (l.corpses = []),
    (l.spawnT = 1.2),
    (l.stall = 0),
    (l.life = l.P.life),
    (l.mana = l.P.mana),
    tb(),
    (l.banner = {
      t: 2,
      text: `${Hn.n} · tầng ${l.tower.floor}`,
      sub: "Qua tầng không hồi sinh lực · gục ngã là rời tháp",
    }),
    n0(!0),
    C(`🗼 Dịch chuyển vào <b>${Hn.n}</b>, tầng ${l.tower.floor}.`));
};

var tb = function () {
  !window.JMO ||
    !window.JMO[String(Hn.id)] ||
    !MapsEngine.isMapAvailable(Hn.id) ||
    ((l.zoneShown = "tower"),
    ma(Hn.id),
    ([v.x, v.y] = X0(O0.w / 2, O0.h / 2)),
    M1(),
    (l.bgImg = bA(MapsEngine.getMapBackground(Hn.id))),
    _e(Hn.mus || Hn.id));
};

var ph = function (A) {
  if (
    !(o.mode !== "tower" || !o.fac || l.tower || l.dg || l.deadT > 0 || l.sat) &&
    ((l.towerPilotT = (l.towerPilotT || 0) - A), !(l.towerPilotT > 0))
  ) {
    if (((l.towerPilotT = 4), !wo(e2))) {
      ((o.mode = "farm"), k(`Leo Tháp cần cấp ${e2}`));
      return;
    }
    (l.town && en(), A2());
  }
};

var eb = function (A, n) {
  const t = k0.length;
  if (A < 3 * t) return { z: k0[Math.floor(A / 3)] };
  if (!n) return { z: k0[Math.floor(A / 3) % t] };
  const e = Math.floor(A / 5) % 5,
    a = k0.filter((i) => i.boss && j2(i.boss) === e);
  return a.length
    ? { z: a[Math.floor(A / 25) % a.length] }
    : { z: k0[Math.floor(A / 5) % t], ser: e };
};

var ab = function () {
  const A = l.tower.floor,
    n = Nh(A),
    t = A % 5 === 0,
    e = eb(A, t),
    a = e.z;
  ((l.enemies = []), (l.stall = 0), (l.stallHp = null));
  const i = t ? 1 : 3 + (A % 3),
    r = _b(A);
  for (let c = 0; c < i; c++) {
    const [d, f] = X0(v.x + Z(-260, 260), v.y + Z(-220, 220)),
      h = n1(t ? a.boss : C0(a.m), n, t ? "boss" : "elite", d, f);
    ((h.hp = h.max = Math.round(h.max * r.hp)),
      (h.dmg *= r.dmg),
      e.ser != null && (h.series = e.ser),
      l.enemies.push(h));
  }
};

var sb = function () {
  const A = Q(),
    n = l.tower.floor;
  if (n > A.stat.towerBest)
    if (((A.stat.towerBest = n), n % 5 === 0)) {
      const t = l.batch;
      l.batch = !0;
      const e = z0({ fd: 10 }, "") || [],
        a = ib();
      ((l.batch = t), a && e.push(`<b style="color:#ffd24a">${a}</b>`));
      const i = Ts(!1);
      (i && (xn(i, !0, !0, !0), e.push(`<b style="color:${_0[i.r]}">${D(i.n)}</b>`)),
        e.push(`<b style="color:#9fe8ff">${od()} Thần Bí Khoáng Thạch</b>`),
        C(`🎁 Tháp tầng ${n}: ${e.join(", ")}`),
        $());
    } else z0({ ht: 1, htr: 1 }, `Tháp tầng ${n}`);
  else
    n % 5 === 0 &&
      C(`🎁 Tháp tầng ${n}: <b style="color:#9fe8ff">${od()} Thần Bí Khoáng Thạch</b>`);
  (_n("tower"),
    Mn(),
    l.tower.floor++,
    (l.spawnT = 1.5),
    (l.banner = {
      t: 1.5,
      text: `Tầng ${l.tower.floor}`,
      sub: `Quái cấp ${Nh(l.tower.floor)}${gc(l.tower.floor) ? ` · quái mạnh thêm ${+(gc(l.tower.floor) * 100).toFixed(2)}%` : ""}`,
    }));
};

var ib = function () {
  const A = [...me.values()].filter((t) => YA(t, 39) >= 0 && cA(t));
  if (!A.length) return null;
  const n = C0(A);
  return (U("shard", n.n), `Mảnh ${n.n} (${N("shard", n.n)}/${NA[n.n]})`);
};

var Cs = function (A) {
  if (l.tower) {
    if (
      (C(
        `${A ? "Gục ở" : "Rời"} tháp thử thách tầng ${l.tower.floor}. Kỷ lục: ${Q().stat.towerBest}`,
      ),
      A &&
        o.mode === "tower" &&
        ((o.mode = "farm"),
        (l.dgPilotT = 0),
        C("⚔ Gục ngã trong Tháp: chuyển sang chế độ <b>Luyện Công</b>."),
        k("Gục ở Tháp — chuyển sang Luyện Công"),
        (l.afterTowerMap = !0)),
      (l.tower = null),
      (l.enemies = []),
      (l.corpses = []),
      (o.wave = 1),
      (l.spawnT = 0.5),
      (l.zoneShown = null),
      (l.field = null),
      typeof Gn == "function")
    ) {
      const n = AA(Math.min(o.stage, d0));
      ((l.zoneShown = n.id), Gn(n));
    }
    l.afterTowerMap &&
      ((l.afterTowerMap = !1), typeof Xe == "function" && o.autoMap !== !1 && Xe());
  }
};

var lc = function () {
  const A = (o && o.rw && o.rw.stat && o.rw.stat.reborn) || 0;
  return { hp: 1 + Lh * A, dmg: 1 + qh * A };
};

var mo = function () {
  const A = (o.rw && o.rw.stat && o.rw.stat.reborn) || 0;
  return { xp: -0.1 * Math.min(5, A), dmg: 0.1 * A };
};

var ob = async function () {
  const A = Q();
  if (o.lvl < Ee || A.stat.reborn >= n2) return;
  (await X1(
    "Chuyển sinh: về cấp 1, giữ trang bị. Toàn bộ điểm tiềm năng và kỹ năng cũ bị tẩy (giữ nguyên võ công 90 và 150 đã luyện), nhận điểm thưởng chuyển sinh. Quái mạnh hơn. Tiếp tục?",
  ),
    A.stat.reborn++,
    delete o.tanthuXp);
  const n = A.stat.reborn,
    t = I[o.fac].starter,
    e = o.bkOk || (o.bkOk = {});
  for (const i in o.sk) T[i] && T[i].book && (e[i] = 1);
  ((o.lvl = 1),
    (o.xp = 0),
    (o.attr = { str: 0, dex: 0, vit: 0, eng: 0 }),
    (o.attrPts = po + (o.bonusAtp || 0)));
  const a = {};
  for (const i in o.sk)
    T[i] &&
      [90, 150].includes(T[i].tier) &&
      o.sk[i] > 0 &&
      !(typeof SA == "function" && SA(i)) &&
      (a[i] = o.sk[i]);
  ((o.sk = Object.assign({}, a)),
    (o.skPts = Do + (o.bonusSkp || 0)),
    t && ((o.sk[t] = 1), (o.main = t)),
    (o.mainLock = !1),
    (o.slots = [0, 0, 0, 0]),
    (o.stage = 1),
    (o.wave = 1),
    (l.tower = null),
    (l.enemies = []),
    (l.dirty = !0),
    (l.zoneShown = null),
    C(
      `<b class="up">Chuyển sinh lần ${n}!</b> Tẩy toàn bộ điểm cũ (giữ võ công 90/150${
        Object.keys(a).length
          ? ": " +
            Object.keys(a)
              .map((i) => T[i].n + " " + a[i])
              .join(", ")
          : ""
      }), nhận ${po} tiềm năng + ${Do} điểm kỹ năng · −${n * 10}% kinh nghiệm, +${n * 10}% sát thương · quái +${Math.round(Lh * n * 100)}% máu, +${Math.round(qh * n * 100)}% sát thương`,
    ),
    o.autoPts === !0
      ? (yt(), Pt())
      : e4().total && k("Bấm Gợi ý ở thẻ Nhân vật: cộng đủ điểm cho bộ đồ đang mặc"),
    typeof tn == "function" && (tn(), qA()),
    Mn(),
    n0(!0),
    V(),
    $());
};

var rb = function () {
  const A = k0.slice(0, DA(Math.min(o.maxStage, d0)) + 1);
  return [...new Set(A.flatMap((n) => n.m))].filter((n) => r0[n] && r0[n].anim).slice(0, 12);
};

var Dh = function (A) {
  const n = Q().pet;
  ((Q().pet = { tid: A, lvl: n ? n.lvl : 1, xp: n ? n.xp : 0 }),
    (l.petPos = null),
    k("Đồng hành: " + r0[A].n),
    $(),
    m("#actTabs") && N1());
};

var Ph = function (A) {
  return (6 + A.lvl * 5) * (1 + A.lvl * 0.04) * (1 + mo().dmg) * ea() * g8(o.lvl);
};

var cb = function (A) {
  const n = o.rw && o.rw.pet;
  if (n && !r0[n.tid]) {
    const c = k0[E(Math.floor((o.stage || 0) / Kn), 0, k0.length - 1)],
      d = c && c.m && c.m.find((f) => r0[f]);
    d != null && (n.tid = d);
  }
  if (!n || l.town || !r0[n.tid]) {
    l.petPos = null;
    return;
  }
  const t = l.petPos || (l.petPos = { x: v.x - 30, y: v.y + 10, t: 0, act: "st", actT: 0, dir: 0 }),
    e = _1()
      .filter((c) => q0(v, c) < jh)
      .sort((c, d) => q0(v, c) - q0(v, d))[0],
    a = e || { x: v.x - 36, y: v.y + 12 },
    i = Math.hypot(a.x - t.x, a.y - t.y),
    r = e ? e.r + 14 : 10;
  t.t -= A;
  if (actorActionLocked(t)) { t.moving = false; return; }
  if (((t.moving = i > r), t.moving)) {
    const c = Math.min(1, (170 * A) / i);
    ((t.dir = kn(a.x - t.x, a.y - t.y)), (t.x += (a.x - t.x) * c), (t.y += (a.y - t.y) * c));
  }
  if (
    (Math.hypot(v.x - t.x, v.y - t.y) > 500 && ((t.x = v.x - 30), (t.y = v.y + 10)),
    e && !t.moving && t.t <= 0)
  ) {
    t.t = 1.2;
    queueSkillContact(t, e, { melee: true, rad: r / QA, parts: { phys: 1 } }, target => {
      const damage = Ph(n);
      target.hp -= damage;
      applyActorHurt(target, damage, target.max);
      target.hitT = 0.1;
      showDamageNumber(target, damage);
    }, { maxTargets: 1, visual: () => {} });
    ((t.act = "at"),
      (t.actT = 0),
      (t.dir = kn(e.x - t.x, e.y - t.y)));
  }
};

var lb = function (A) {
  const n = o.rw && o.rw.pet;
  if (!n) return;
  n.xp += A;
  const t = 20 + n.lvl * 12;
  n.xp >= t && ((n.xp -= t), n.lvl++, C(`Đồng hành ${D(r0[n.tid].n)} lên cấp ${n.lvl}`));
};

var db = function (A, n) {
  const t = o.rw && o.rw.pet,
    e = l.petPos;
  !t ||
    !e ||
    !r0[t.tid] ||
    ((e.animKey = r0[t.tid].anim),
    H8(e, n, e.moving ? "run" : "st"),
    e.act !== "at" && ps(e, e.moving ? "run" : "st"),
    (A.fillStyle = "#0007"),
    A.beginPath(),
    A.ellipse(e.x, e.y, 10, 4, 0, 0, 7),
    A.fill(),
    Va(e.animKey, e.act || "st", e.dir || 0, e.actT || 0, e.x, e.y, 0.75 * Ua),
    L3(e.x, e.y - 42, `${r0[t.tid].n}`, Ps.pet, 10, -1));
};

var $e = function () {
  const A = new Date().getMonth() + 1;
  return A === 1 || A === 2
    ? { n: "Tết Nguyên Đán", token: "Bánh Chưng", col: "#ff5a4a" }
    : A === 9 || A === 10
      ? { n: "Tết Trung Thu", token: "Bánh Trung Thu", col: "#ffd24a" }
      : A === 12
        ? { n: "Giáng Sinh", token: "Chuông Bạc", col: "#9fe3ff" }
        : { n: "Hội Võ Lâm", token: "Lệnh Bài Võ Lâm", col: "#c8a2ff" };
};

var fb = async function (A) {
  const [n, t, e] = mc[A],
    a = Q().stat;
  if ((t.hb || t.dhb) && (typeof _t != "function" || !_t())) {
    k("Cần đăng nhập để đổi Hồng Bao");
    return;
  }
  if (t.misc && ((t.misc.vlmt && !xa("vlmt")) || (t.misc.ttk && !xa("ttk")))) {
    k("Đã đủ giới hạn sách");
    return;
  }
  if (!wc) {
    wc = !0;
    try {
      if (at() && !CA.noEv) {
        let i = null;
        try {
          await sn();
        } catch {
          if (!CA.off) {
            k("Cần kết nối máy chủ — thử lại");
            return;
          }
        }
        if (at())
          try {
            const r = await e0((d) => d.rpc("ev_buy", { s: m0, i: A })),
              c = r.data || {};
            (lo(-1, +c.tok),
              typeof RA == "function" && (RA("hb", c.hb), RA("dhb", c.dhb)),
              (i = !0));
          } catch (r) {
            if (
              /ev_buy|Could not find the function|schema cache/i.test(String(r && (r.message || r)))
            )
              CA.noEv = !0;
            else {
              (k(r.message || String(r)), sn().catch(() => {}));
              return;
            }
          }
        if (i) {
          (z0(t, $e().n, "srv"), $(), et());
          return;
        }
      }
      if (!(await fo("tok", n, "su kien"))) return;
      (z0(t, $e().n, e ? "ev" : ""), $(), et());
    } finally {
      wc = !1;
    }
  }
};

var vh = async function (A) {
  if (!at() || CA.noChest) return null;
  try {
    await sn();
  } catch {
    if (!CA.off) return (k("Cần kết nối máy chủ — thử lại"), !1);
  }
  if (!at()) return null;
  try {
    const n = ["vlmt", "ttk"].filter((a) => !xa(a)).join(","),
      t = await e0((a) => a.rpc("pd_chest", { s: m0, n: A, nobook: n })),
      e = t.data || {};
    return (
      lo(+e.fd, -1),
      typeof RA == "function" && (RA("hb", e.hb), RA("dhb", e.dhb)),
      (e.picks || [])
        .map((a) => pc[Mb.indexOf(a)])
        .filter(Boolean)
        .map((a) => a[1])
    );
  } catch (n) {
    return /pd_chest|Could not find the function|schema cache/i.test(String(n && (n.message || n)))
      ? ((CA.noChest = !0), null)
      : (k(n.message || String(n)), sn().catch(() => {}), !1);
  }
};

var hb = async function (A) {
  const n = Q();
  if (((A = Math.min(A, Math.floor(n.fd / m1))), A < 1)) {
    k(`Cần ${m1} điểm Phúc Duyên`);
    return;
  }
  if (A === 1) {
    bh();
    return;
  }
  if (s2) return;
  s2 = !0;
  let t;
  try {
    if (((t = await vh(A)), t === !1 || (t === null && !(await fo("fd", A * m1, "ruong x" + A)))))
      return;
  } finally {
    s2 = !1;
  }
  const e = o.gold,
    a = {},
    i = [],
    r = o.inv.length;
  l.batch = !0;
  try {
    for (let g = 0; g < A; g++) {
      n.stat.chests++;
      for (const u of z0(
        t ? t[g] || {} : fa(Po(), (w) => w[0])[1],
        "Rương Phúc Duyên",
        t ? "srv" : void 0,
      )) {
        if (/lượng$/.test(u)) continue;
        const w = u.match(/^(.+?) \+\S+(?: may mắn)? trong (\d+) phút$/);
        if (w) {
          const p = w[1] + " (phút)";
          a[p] = (a[p] || 0) + +w[2];
          continue;
        }
        if (/^<b|^[^\d]/.test(u) && !/^\d+ (Kim Sáng|Ngưng Thần|Phúc Duyên|điểm)/.test(u)) {
          i.push(u);
          continue;
        }
        const x = u.match(/^(\d+) (.+)$/);
        x ? (a[x[2]] = (a[x[2]] || 0) + +x[1]) : (a[u] = (a[u] || 0) + 1);
      }
    }
  } finally {
    l.batch = !1;
    const g = l.hbQ;
    if (((l.hbQ = null), g)) for (const u in g) ho(u, g[u]);
  }
  const c = o.gold - e,
    d = i.filter((g) => g.startsWith("<b")),
    f = [c > 0 ? `${q(c)} lượng` : ""]
      .concat(Object.entries(a).map(([g, u]) => `${u} ${g}`))
      .filter(Boolean);
  (i.length && f.push(`${i.length} món đồ${d.length ? ` (${d.length} Hoàng Kim)` : ""}`),
    C(`🎁 Mở ${A} rương Phúc Duyên: ${f.join(", ")}${d.length ? " · " + d.join(", ") : ""}`),
    o0("learn"),
    Mn(),
    $(),
    et());
  const h = i.length - (o.inv.length - r);
  J(
    `<h3>Mở ${A} rương Phúc Duyên</h3><div class="card stats">${c > 0 ? `<span>Ngân lượng</span><span>+${q(c)}</span>` : ""}${Object.entries(
      a,
    )
      .map(([g, u]) => `<span>${D(g)}</span><span>+${u}</span>`)
      .join(
        "",
      )}<span>Trang bị</span><span>${i.length}${d.length ? ` (${d.length} Hoàng Kim)` : ""}</span></div>
    ${i.length ? `<div class="sl">${i.map((g) => `<div>${g}</div>`).join("")}</div>` : ""}${h > 0 ? `<p class="dim small">${h} món không vào được hành trang (đầy hoặc đồ thừa) đã được bán.</p>` : ""}
    <p class="desc">Còn ${n.fd} Phúc Duyên.</p><div class="btnrow"><button class="btn" id="cBack">Quay lại</button></div>`,
    () => {
      m("#cBack").onclick = () => {
        ((O1 = "chest"), Ce());
      };
    },
  );
};
