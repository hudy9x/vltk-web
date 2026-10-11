// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var Xh = function () {
  if (_c) return _c;
  const A = S.items[10],
    n = new Map();
  for (const t of A ? A.list : []) {
    const e = st(Object.assign({}, t, { d: 10 })),
      a = Tn(t);
    e >= 0 && !n.has(a) && n.set(a, [t.n.replace(/\s+\d+$/, ""), e]);
  }
  return (_c = n);
};

var Ie = function () {
  const A = new Map();
  for (const n of R0().concat(L0(o.eq.horse) ? [o.eq.horse] : [])) {
    const t = st(n);
    t >= 0 && A.set(Tn(n), t);
  }
  return A;
};

var Jh = function () {
  const A = Ie();
  let n = 0;
  for (const t of A.values()) n += Ho[t][2];
  return { n: A.size, hp: A.size, xp: n };
};

var kc = function (A) {
  if (!L0(A) || A.thanma || Mc[A.k] == null) return;
  const n = Mc[A.k],
    t = S.items[10] ? S.items[10].list.filter((a) => a.k === n) : [],
    e = t.find((a) => a.lvl === A.lvl) || t.sort((a, i) => i.lvl - a.lvl)[0];
  e &&
    ((A.k = n),
    (A.n = e.n),
    (A.lvl = e.lvl),
    (A.base = e.base.map((a) => a.slice())),
    (A.req = e.req.map((a) => a.slice())),
    e.ic && (A.ic = e.ic),
    e.p != null && (A.p = e.p),
    (R = !0));
};

var Wh = function (A) {
  if ((kc(A), !L0(A) || !A.req)) return;
  const n = A.req.find((e) => e[0] === 36);
  if (!n) return;
  let t = null;
  if (A.thanma) {
    const e = typeof Oo == "function" && Oo(A.thanma);
    e && (t = e[4]);
  } else {
    const e = S.items[10] && S.items[10].list.find((i) => i.k === A.k && i.lvl === A.lvl),
      a = e && e.req.find((i) => i[0] === 36);
    a && (t = a[1]);
  }
  t != null && n[1] !== t && (n[1] = t);
};

var Qb = function (A) {
  for (const t of R0().concat(o.inv.filter(L0), L0(o.eq.horse) ? [o.eq.horse] : [])) Wh(t);
  const n = Jh();
  (n.hp && pt(A, "lifemax_p", [n.hp, 0, 0]), n.xp && pt(A, "expenhance_p", [n.xp, 0, 0]));
};

var gM = function (A) {
  const n = Bc()[A];
  if (typeof n == "string") return n;
  if (isNaN(+A)) return A;
  const t = S.items[10],
    e = t && t.list.find((a) => a.k === +A);
  return e ? e.n.replace(/\s+\d+$/, "") : "Ngựa";
};

var Zh = function (A, n) {
  const t = o.eq.horse;
  if (!L0(t)) return !1;
  const e = Bc(),
    a = t.n.replace(/\s+\d+$/, "");
  if ((e[a] || (e[t.k] === a && delete e[t.k], (e[a] = a)), W0(t) >= S1)) return !1;
  t.hxp = (t.hxp || 0) + A;
  let i = !1;
  for (; W0(t) < S1 && t.hxp >= xc(W0(t));) ((t.hxp -= xc(W0(t))), (t.hlv = W0(t) + 1), (i = !0));
  return (
    W0(t) >= S1 && (t.hxp = 0),
    i &&
      ((l.dirty = !0),
      (R = !0),
      l.quiet ||
        (C(`<b class="up">${D(t.n)}</b> thuần dưỡng lên cấp ${t.hlv}`),
        n || $A(v.x, v.y - 70, `Ngựa cấp ${t.hlv}`, "#ffd24a", 12)),
      typeof jt == "function" && jt("horseLv", t.hlv, { n: t.n })),
    i
  );
};

var Gb = function (A = 1) {
  const n = o.eq.horse;
  if (!L0(n)) return { ok: !1, msg: "Chưa cưỡi ngựa" };
  let t = 0,
    e = 0;
  for (; t < A && W0(n) < S1; t++) {
    const a = $o(n);
    if ((o.knb | 0) < a) break;
    ((o.knb = (o.knb | 0) - a), (e += a), Zh(ou, !0));
  }
  return t
    ? ($(), { ok: !0, msg: `Cho ăn ${t} lần (−${e} KNB) · cấp ${W0(n)}` })
    : { ok: !1, msg: W0(n) >= S1 ? "Ngựa đã thuần dưỡng tối đa" : "Không đủ Kim Nguyên Bảo" };
};

var Kb = function (A) {
  const n = o.eq.horse;
  if (!L0(n) || !L0(A) || n === A || !(o.inv.includes(A) || R0().includes(A)))
    return { ok: !1, msg: "Chọn một ngựa trong hành trang" };
  const t = Math.floor(W0(n) * ru);
  return t <= W0(A)
    ? { ok: !1, msg: "Ngựa nhận đã có cấp cao hơn hoặc bằng" }
    : Lu(lu())
      ? ((A.hlv = t),
        (A.hxp = 0),
        (n.hlv = 0),
        (n.hxp = 0),
        (l.dirty = !0),
        (R = !0),
        $(),
        { ok: !0, msg: `Chuyển thuần dưỡng: ${A.n} cấp ${t}` })
      : { ok: !1, msg: "Không đủ ngân lượng" };
};

var Rb = function s(A) {
  const n = S.items[10];
  if (!n) return null;
  const t = (d) => (d.req.find((f) => f[0] === 36) || [0, 0])[1],
    a = (A ? Wb : [0, 1, 2, 3, 4])
      .map((d) => n.list.filter((f) => f.k === d && k1(f.req) && t(f) <= GA()))
      .filter((d) => d.length);
  if (!a.length) return A ? s(!1) : null;
  const i = C0(a),
    r = i.reduce((d, f) => (f.lvl > d.lvl ? f : d)),
    c = _A(10, r.k, r.lvl, 0);
  return c ? (A && ((c.r = 2), (c.rareH = 1)), c) : null;
};

var qs = function (A, n) {
  (U("misc", "rngua", A),
    (R = !0),
    n &&
      !l.quiet &&
      C(
        `🎁 ${n}: nhận <b style="color:#ffd24a">${A} Rương Ngựa</b> (Kỳ Trân Các › Thú cưỡi › Dùng)`,
      ));
};

var Yb = function () {
  const A = S.items[10];
  if (!A) return "Rương trống";
  let n = Math.random(),
    t = js.length - 1;
  for (let h = 0; h < js.length; h++) {
    if (n < js[h][1]) {
      t = h;
      break;
    }
    n -= js[h][1];
  }
  const [e, , a, i] = js[t],
    r = A.list.filter(
      (h) => Mc[h.k] == null && st(Object.assign({}, h, { d: 10 })) === i && k1(h.req),
    );
  if (!r.length) return "Rương trống";
  const c = {};
  for (const h of r) (c[h.n.replace(/\s+\d+$/, "").toLowerCase()] ||= []).push(h);
  const d = C0(C0(Object.values(c))),
    f = _A(10, d.k, d.lvl, 0);
  return f
    ? ((f.r = a),
      t >= 2 && ((f.rareH = 1), (f.lock = 1)),
      (f.hbt = t),
      Wh(f),
      xn(f, !0, !0, !0),
      t >= 2 &&
        C(
          `🐎 <b style="color:#ffd24a">Rương Ngựa: ngựa ${e}!</b> Nhận <b style="color:${_0[f.r]}">${D(f.n)}</b> (tự khóa 🔒)`,
        ),
      `Rương Ngựa (${e}): ${f.n}`)
    : "Rương trống";
};

var it = function (A = 1) {
  const n = [];
  let t = 0;
  for (; t < A && !(Co() < 1); t++) {
    if (o.inv.length >= INV_MAX) {
      n.push("Hành trang đầy");
      break;
    }
    (U("misc", "rngua", -1), n.push(Yb()));
  }
  if (!t) {
    k(Co() < 1 ? "Không có Rương Ngựa" : "Hành trang đầy");
    return;
  }
  (C(
    `🎁 Mở ${t} Rương Ngựa: ${D(
      n
        .filter((e) => e !== "Hành trang đầy")
        .map((e) => e.replace(/^Rương Ngựa /, ""))
        .join(" · "),
    )}`,
  ),
    k(t > 1 ? `Mở ${t} Rương Ngựa` : n[0]),
    o0("learn"),
    (l.dirty = !0),
    (R = !0),
    $(),
    V());
};

var Fb = function (A) {
  (Zh((A.cls === "boss" ? 10 : A.cls === "elite" ? 3 : 1) * Zb),
    !(A.cls !== "boss" && !A.goldBoss) &&
      Math.random() < (A.goldBoss ? To.gb : To.boss) &&
      qs(1, A.goldBoss ? "Trùm Hoàng Kim" : "Hạ trùm"));
};

var Vb = function (A, n) {
  if (!o.eq.horse || !l.mounted || o.lowFx) {
    l.dust = null;
    return;
  }
  const t = l.dust || (l.dust = []);
  v.moving &&
    l.deadT <= 0 &&
    ((l.dustT = (l.dustT || 0) - n),
    l.dustT <= 0 &&
      ((l.dustT = 0.07), t.push({ x: v.x + Z(-8, 8), y: v.y + Z(-2, 3), life: 0.55 })));
  const e = V3() && l.look,
    a = (e && e.dust) || "#b89c6c",
    i = (e && e.hlv) || 0,
    r = l.clock || performance.now() / 1e3;
  if (i >= 2 && l.deadT <= 0) {
    const c = 0.5 + 0.5 * Math.sin(r * 3),
      d = A.createRadialGradient(v.x, v.y, 2, v.x, v.y, 34);
    (d.addColorStop(0, a),
      d.addColorStop(1, "rgba(0,0,0,0)"),
      (A.globalAlpha = 0.22 + 0.16 * c),
      (A.fillStyle = d),
      A.beginPath(),
      A.ellipse(v.x, v.y + 1, 34, 13, 0, 0, 7),
      A.fill(),
      i >= 3 &&
        ((l.hsT = (l.hsT || 0) - n),
        l.hsT <= 0 &&
          ((l.hsT = 0.12), t.push({ x: v.x + Z(-22, 22), y: v.y + Z(-4, 4), life: 0.9, up: !0 }))));
  }
  for (const c of t) {
    if (((c.life -= n), c.up)) {
      const f = E(c.life / 0.9, 0, 1);
      ((A.globalAlpha = f * 0.85),
        (A.fillStyle = a),
        A.beginPath(),
        A.arc(c.x, c.y - (1 - f) * 46, 1.6 + f * 1.4, 0, 7),
        A.fill());
      continue;
    }
    const d = E(c.life / 0.55, 0, 1);
    ((A.globalAlpha = d * (i ? 0.6 : 0.45)),
      (A.fillStyle = a),
      A.beginPath(),
      A.ellipse(c.x, c.y, 4 + (1 - d) * 9, 2 + (1 - d) * 3, 0, 0, 7),
      A.fill());
  }
  ((A.globalAlpha = 1), (l.dust = t.filter((c) => c.life > 0)));
};

var Au = function (A) {
  return !L0(A) || !o.inv.includes(A)
    ? { ok: !1, msg: "Chọn ngựa trong hành trang" }
    : R0().length >= zt
      ? { ok: !1, msg: `Mã Trường đầy (${zt})` }
      : (delete A.stOut,
        (o.inv = o.inv.filter((n) => n !== A)),
        R0().push(A),
        (R = !0),
        (l.dirty = !0),
        $(),
        { ok: !0, msg: "Đã đưa " + A.n + " vào Mã Trường" });
};

var nu = function (A, n) {
  return !L0(A) || st(A) < 0 || R0().length >= zt || Ie().has(Tn(A))
    ? !1
    : (R0().push(A),
      (l.dirty = !0),
      !n &&
        !l.quiet &&
        C(
          `🐎 <b style="color:${_0[A.r] || "#ffd24a"}">${D(A.n)}</b>: loài mới → tự cất vào Mã Trường (bộ sưu tập ${Ie().size}/${Xh().size})`,
        ),
      !0);
};

var tu = function () {
  let A = 0;
  for (const n of o.inv.filter(L0))
    !n.stOut &&
      R0().length < zt &&
      st(n) >= 0 &&
      !Ie().has(Tn(n)) &&
      ((o.inv = o.inv.filter((t) => t !== n)), R0().push(n), A++);
  return (A && ((R = !0), (l.dirty = !0)), A);
};

var Ub = function (A) {
  const n = R0();
  return n.includes(A)
    ? o.inv.length >= INV_MAX
      ? { ok: !1, msg: "Hành trang đầy" }
      : ((o.stable = n.filter((t) => t !== A)),
        (A.stOut = 1),
        o.inv.unshift(A),
        (R = !0),
        (l.dirty = !0),
        $(),
        { ok: !0, msg: "Lấy " + A.n + " ra hành trang" })
    : { ok: !1, msg: "Không có trong Mã Trường" };
};

var eu = function (A) {
  if (!L0(A)) return { ok: !1, msg: "Không phải ngựa" };
  if (!p0(A)) return { ok: !1, msg: "Chưa đủ điều kiện: " + vt(A).join("; ") };
  const n = o.eq.horse;
  return (
    (o.stable = R0().filter((t) => t !== A)),
    (o.inv = o.inv.filter((t) => t !== A)),
    (o.eq.horse = A),
    n && n !== A && (R0().length < zt ? R0().push(n) : o.inv.unshift(n)),
    (l.dirty = !0),
    (R = !0),
    (l.rideCd = 0),
    typeof Ka == "function" && Ka(!0, !0),
    $(),
    { ok: !0, msg: "Cưỡi " + A.n }
  );
};

var xo = function s() {
  const A = o.eq.horse,
    n = R0()
      .map((e) => [e, "st"])
      .concat(o.inv.filter(L0).map((e) => [e, "inv"])),
    t = ([
      e,
      a,
    ]) => `<div class="qrow"><span><b style="color:${_0[e.r]}">${D(e.n)}</b><small>${a === "st" ? "Mã Trường" : "Hành trang"} · cấp yêu cầu ${(e.req.find((i) => i[0] === 36) || [0, 0])[1]} · thuần dưỡng ${W0(e)} · ${D(Bo(e))}</small></span>
    <span class="btnrow"><button class="btn sm" data-hr="${e.uid}" ${p0(e) ? "" : "disabled"}>Cưỡi</button></span></div>`;
  J(
    `<h3>Chọn ngựa <small>${R0().length}/${zt} trong Mã Trường</small></h3>
    ${
      A
        ? `<div class="card"><b style="color:${_0[A.r]}">${D(A.n)}</b> <small class="dim">đang dùng · thuần dưỡng ${W0(A)}</small><p class="small">${D(Bo(A))}</p>
      <div class="btnrow"><button class="btn" id="hpInfo">Chi tiết</button><button class="btn" id="hpBack" ${R0().length < zt ? "" : "disabled"}>Cất vào Mã Trường</button></div></div>`
        : ""
    }
    ${n.length ? n.map(t).join("") : '<p class="dim small">Chưa có ngựa nào khác. Ngựa nhặt được nằm trong hành trang, bấm vào ngựa → "Cất vào Mã Trường".</p>'}
    <div class="btnrow"><button class="btn" id="hpStable">Mở Mã Trường</button></div>`,
    () => {
      document.querySelectorAll("#mBody [data-hr]").forEach(
        (r) =>
          (r.onclick = () => {
            const c = n.map((f) => f[0]).find((f) => f.uid === +r.dataset.hr),
              d = eu(c);
            (k(d.msg), d.ok && (o0("equipCloth"), V()), s());
          }),
      );
      const e = m("#hpInfo");
      e && (e.onclick = () => He(A, "horse"));
      const a = m("#hpBack");
      a &&
        (a.onclick = () => {
          (delete o.eq.horse,
            R0().push(A),
            (l.mounted = !1),
            (l.dirty = !0),
            (R = !0),
            $(),
            V(),
            s());
        });
      const i = m("#hpStable");
      i &&
        (i.onclick = () => {
          typeof N1 == "function" && N1("horse");
        });
    },
  );
};

var Bo = function (A) {
  const n = [];
  for (const [t, e, a] of A.base) {
    const i = sA(t);
    if (i === "staminamax_v") continue;
    const r = Math.round(ko(A, ((e + a) / 2) * ua(A)));
    n.push(i1(i, [r, 0, r]));
  }
  return n.join(" · ");
};

var Xb = function (A) {
  if (!L0(A) || A === o.eq.horse) return { ok: !1, msg: "Không bán ngựa đang cưỡi" };
  if (A.lock) return { ok: !1, msg: "Ngựa đã khóa: mở khóa trước khi bán" };
  const n = R0().includes(A);
  if (!n && !o.inv.includes(A)) return { ok: !1, msg: "Không tìm thấy ngựa" };
  n ? (o.stable = R0().filter((e) => e !== A)) : (o.inv = o.inv.filter((e) => e !== A));
  const t = x0(A);
  return (
    (o.gold += t),
    (R = !0),
    (l.dirty = !0),
    $(),
    { ok: !0, msg: `Bán ${A.n}: +${q(t)} lượng` }
  );
};

var Ne = function (A) {
  const n = R0().concat(o.inv.filter(L0)),
    t = new Map(),
    e = L0(o.eq.horse) ? o.eq.horse : null,
    a = (i) => (i === e ? 1e9 : 0) + W0(i) * 1e3 + (i.lvl || 0);
  for (const i of n.concat(e ? [e] : [])) {
    const r = Tn(i),
      c = t.get(r);
    (!c || a(i) > a(c)) && t.set(r, i);
  }
  return n.filter((i) => t.get(Tn(i)) !== i && i !== e && (A || !i.lock));
};

var Jb = function () {
  const A = L0(o.eq.horse) ? o.eq.horse : null,
    n = R0()
      .concat(o.inv.filter(L0))
      .concat(A ? [A] : []),
    t = new Map();
  for (const i of n) {
    const r = Tn(i);
    (t.get(r) || t.set(r, []).get(r)).push(i);
  }
  const e = new Set(),
    a = new Set(Ne(!0));
  for (const i of t.values()) if (i.length > 1) for (const r of i) e.add(r);
  return { inDup: e, sell: a };
};

var au = function (A) {
  const n = Ne(A);
  if (!n.length) return { ok: !1, msg: "Không có ngựa trùng loài" };
  let t = 0;
  for (const e of n)
    ((t += x0(e)),
      (o.stable = R0().filter((a) => a !== e)),
      (o.inv = o.inv.filter((a) => a !== e)));
  return (
    (o.gold += t),
    (R = !0),
    (l.dirty = !0),
    $(),
    { ok: !0, msg: `Bán ${n.length} ngựa trùng loài: +${q(t)} lượng` }
  );
};

var su = function () {
  const A = o.eq.horse,
    n = o.inv.filter(L0),
    t = R0(),
    e = L0(A)
      ? (() => {
          const P = W0(A),
            _ = xc(P),
            y = P >= S1 ? 100 : Math.round(((A.hxp || 0) / _) * 100);
          return `<div class="card"><div class="idet"><div class="pic r${A.r}">${A.ic ? `<img src="${D(A.ic)}" alt="">` : ""}</div><div><h4 style="color:${_0[A.r]}">${D(A.n)}</h4>
      <small class="dim">Thuần dưỡng cấp <b>${P}/${S1}</b> · chỉ số +${Math.round(P * _o * 100)}% · phạt né tránh −${Math.min(100, Math.round(P * Mo * 100))}%</small></div></div>
      <div class="bar xpb"><i style="width:${y}%"></i><span>${P >= S1 ? "Tối đa" : `${Math.floor(A.hxp || 0)} / ${_}`}</span></div>
      <p class="small">${D(Bo(A))}</p>
      <div class="btnrow"><button class="btn" id="hFeed" ${P < S1 && (o.knb | 0) >= $o(A) ? "" : "disabled"}>Cho ăn (${$o(A)} KNB, +${ou})</button><button class="btn" id="hFeed10" ${P < S1 && (o.knb | 0) >= $o(A) ? "" : "disabled"}>Cho ăn ×10</button></div></div>`;
        })()
      : '<div class="card"><p class="desc">Chưa cưỡi ngựa. Ngựa chỉ có từ <b>Rương Ngựa</b> (Kỳ Trân Các › Thú cưỡi 20 KNB, hoặc rơi từ trùm / phó bản): Thường 56% · Tốt 31,5% · Quý 6% · Thần 3% · Danh mã 2% · Bảo mã 1% · Chí tôn 0,5%.</p></div>',
    a = (
      P,
      _,
    ) => `<div class="qrow"><span><b style="color:${_0[P.r]}">${D(P.n)}</b>${i.inDup.has(P) ? (i.sell.has(P) ? (P.lock ? ' <small class="bad">· trùng (đang khóa)</small>' : ' <small class="bad">· trùng</small>') : ' <small class="cp">· trùng, giữ lại (tốt nhất)</small>') : ""}<small>cấp yêu cầu ${(P.req.find((y) => y[0] === 36) || [0, 0])[1]} · thuần dưỡng ${W0(P)} · ${D(Bo(P))}</small></span><small></small>
    <span class="btnrow"><button class="btn sm" data-ride="${P.uid}" ${p0(P) ? "" : "disabled"}>Cưỡi</button>${L0(A) && Math.floor(W0(A) * ru) > W0(P) ? `<button class="btn sm" data-mv="${P.uid}">Chuyển cấp (${q(lu())})</button>` : ""}${_ === "st" ? `<button class="btn sm" data-sout="${P.uid}">Lấy ra</button>` : `<button class="btn sm" data-sin="${P.uid}">Cất vào Mã Trường</button>`}<button class="btn sm" data-hsell="${P.uid}" title="Bán lấy ${q(x0(P))} lượng">Bán</button></span></div>`,
    i = Jb(),
    r = i.sell,
    c = (P, _) => (on.w !== "all" && on.w !== _ ? [] : P.filter((y) => ny(y, i))),
    d = c(n, "inv")
      .map((P) => a(P, "inv"))
      .join(""),
    f = c(t, "st")
      .map((P) => a(P, "st"))
      .join(""),
    h = (P, _, y) =>
      `<button class="chip2${on[P] === _ ? " on" : ""}" data-hf="${P}" data-hv="${_}">${y}</button>`,
    g = `<div class="chips" style="margin:6px 0">${h("t", -1, "Mọi bậc")}${Ho.map(([P, _], y) => h("t", y, `<span style="color:${_}">${P}</span>`)).join("")}</div>
    <div class="chips" style="margin:0 0 6px">${h("w", "all", "Tất cả")}${h("w", "st", "Trong Mã Trường")}${h("w", "inv", "Hành trang")}${h("dup", !on.dup, on.dup ? "✓ Chỉ ngựa trùng" : "Chỉ ngựa trùng")}
    <button class="btn sm" id="hSellDup" ${Ne().length ? "" : "disabled"}>Bán ngựa trùng (${Ne().length})</button>${r.size > Ne().length ? `<button class="btn sm red" id="hSellDupL">Bán cả ngựa trùng đang khóa (${r.size})</button>` : ""}</div>`,
    u = Ie(),
    w = Xh(),
    x = Jh(),
    p = Ho.map(([P, _, y], M) => {
      const B = [...w].filter(([, G]) => G[1] === M),
        O = B.filter(([G]) => u.has(G)).length;
      return `<div class="hct"><b style="color:${_}">${P}</b> <small class="dim">${O}/${B.length} · mỗi loài +1% sinh lực, +${y}% EXP</small><div class="chips">${B.map(([G, j]) => `<span class="chip2${u.has(G) ? " hc-on" : ""}" title="${u.has(G) ? "Đã có" : "Chưa có"}">${u.has(G) ? "✓ " : ""}${D(j[0])}</span>`).join("")}</div></div>`;
    }).join("");
  return `<p class="desc">Ngựa đang cưỡi lên cấp khi hạ quái (thường 1, tinh anh 3, trùm 10) hoặc cho ăn. Mỗi cấp +${_o * 100}% chỉ số ngựa, giảm ${Mo * 100}% phạt né tránh. Tốc độ chạy của ngựa chỉ tính khi đang cưỡi (phím M / Auto tự lên ngựa khi di chuyển).</p>
    ${e}
    <h4 class="rech">Lọc ngựa</h4>${g}
    ${on.w !== "inv" ? `<h4 class="rech">Ngựa trong Mã Trường <small class="dim">${t.length}/${zt}</small></h4>${f || `<p class="dim small">${t.length ? "Không có ngựa hợp bộ lọc." : 'Trống. Ngựa nhặt được nằm trong hành trang: bấm "Cất vào Mã Trường".'}</p>`}` : ""}
    ${on.w !== "st" ? `<h4 class="rech">Ngựa trong hành trang</h4>${d || `<p class="dim small">${n.length ? "Không có ngựa hợp bộ lọc." : "Không có ngựa nào khác. Chuyển thuần dưỡng sang ngựa mới giữ 80% cấp."}</p>`}` : ""}
    <h4 class="rech">Bộ sưu tập Mã Trường <small class="dim">${x.n}/${w.size} loài · <b class="gold">+${x.hp}% sinh lực · +${x.xp}% EXP</b></small></h4>
    <p class="dim small">Mỗi loài ngựa nằm trong Mã Trường (hoặc đang cưỡi) được cộng 1 lần. Ngựa trùng loài không cộng thêm.</p>${p}`;
};

var iu = function (A) {
  const n = (i, r) => {
      const c = m(i);
      c && (c.onclick = r);
    },
    t = (i) => {
      (k(i.msg), i.ok && o0("learn"), A());
    },
    e = (i) => _2(i * (3 + Math.floor(S1 / 2)), () => t(Gb(i)), "cho ngua an");
  (n("#hFeed", () => e(1)), n("#hFeed10", () => e(10)));
  const a = (i) => o.inv.concat(R0()).find((r) => r.uid === +i);
  (document.querySelectorAll("#mBody [data-ride]").forEach(
    (i) =>
      (i.onclick = () => {
        const r = a(i.dataset.ride);
        if (r) {
          const c = eu(r);
          (k(c.msg), V());
        }
        A();
      }),
  ),
    document
      .querySelectorAll("#mBody [data-mv]")
      .forEach((i) => (i.onclick = () => t(Kb(a(i.dataset.mv))))),
    document
      .querySelectorAll("#mBody [data-sin]")
      .forEach((i) => (i.onclick = () => t(Au(a(i.dataset.sin))))),
    document
      .querySelectorAll("#mBody [data-sout]")
      .forEach((i) => (i.onclick = () => t(Ub(a(i.dataset.sout))))),
    document.querySelectorAll("#mBody [data-hf]").forEach(
      (i) =>
        (i.onclick = () => {
          const r = i.dataset.hf,
            c = i.dataset.hv;
          ((on[r] = r === "t" ? +c : r === "dup" ? c === "true" : c), A());
        }),
    ),
    document.querySelectorAll("#mBody [data-hsell]").forEach(
      (i) =>
        (i.onclick = async () => {
          const r = a(i.dataset.hsell);
          r &&
            ((st(r) >= 3 && !(await X1(`Bán ${r.n} (${Ho[st(r)][0]}) lấy ${q(x0(r))} lượng?`))) ||
              t(Xb(r)));
        }),
    ),
    n("#hSellDup", async () => {
      const i = Ne();
      i.length &&
        (await X1(
          `Bán ${i.length} ngựa trùng loài (giữ con tốt nhất mỗi loài) lấy ${q(i.reduce((r, c) => r + x0(c), 0))} lượng?`,
        )) &&
        t(au());
    }),
    n("#hSellDupL", async () => {
      const i = Ne(!0);
      i.length &&
        (await X1(
          `Bán ${i.length} ngựa trùng loài (kể cả ngựa đang khóa) (giữ con tốt nhất mỗi loài) lấy ${q(i.reduce((r, c) => r + x0(c), 0))} lượng?`,
        )) &&
        t(au(!0));
    }));
};

var S1 = 20;

var _o = 0.04;

var Mo = 0.05;

var ou = 100;

var ru = 0.8;

var mM = 10;

var wM = { boss: 0.003, gb: 0.02, dg: 0.4, wbS: 0.15 };

var Wb = [5, 6, 7, 8, 9, 11, 13, 19, 20, 21];

var L0 = (s) => !!s && s.d === 10;

var W0 = (s) => (s && s.hlv) | 0;

var xc = (s) => 40 + s * 35;

var Zb = 1 / 3;

var Bc = () => o.hbook || (o.hbook = {});

var cu = () => Object.keys(Bc()).length;

var Ho = [
  ["Thường", "#b08a5a", 1],
  ["Tốt", "#5fd46a", 1],
  ["Quý", "#5fb8ff", 2],
  ["Thần", "#c77dff", 3],
  ["Danh mã", "#ff9a3c", 4],
  ["Bảo mã", "#ff5a5a", 5],
  ["Chí tôn", "#ffd24a", 6],
];

var Ay = {
  5: 3,
  14: 3,
  15: 3,
  17: 3,
  22: 3,
  23: 3,
  24: 3,
  25: 3,
  6: 4,
  8: 4,
  9: 5,
  11: 5,
  13: 5,
  31: 5,
  32: 5,
  7: 6,
  16: 6,
  18: 6,
  19: 6,
  20: 6,
  21: 6,
  30: 6,
};

var Tn = (s) => (s.n || "").replace(/\s+\d+$/, "").toLowerCase();

var _c = null;

var Mc = { 30: 7, 31: 9, 32: 13 };

var $o = (s) => 3 + Math.floor(W0(s) / 2);

var lu = () => Math.round(2e3 * (1 + o.lvl / 10));

var js = [
  ["Thường", 0.56, 0, 0],
  ["Tốt", 0.315, 1, 1],
  ["Quý", 0.06, 2, 2],
  ["Thần", 0.03, 3, 3],
  ["Danh mã", 0.02, 3, 4],
  ["Bảo mã", 0.01, 4, 5],
  ["Chí tôn", 0.005, 4, 6],
];

var To = { boss: 0.02, gb: 0.25, dg: 0.5 };

var Co = () => N("misc", "rngua");

var du = () => E(l.P ? l.P.speed : 1, 1, 1.8);

var zt = 60;

var R0 = () => o.stable || (o.stable = []);

var on = { t: -1, w: "all", dup: !1 };

var ny = (s, A) =>
  (on.t < 0 || st(s) === on.t) && (!on.dup || (A.inDup ? A.inDup.has(s) : A.has(s)));

var fu = function (A) {
  const n = Oo(A),
    t = S.items[10];
  if (!n || !t) return null;
  const e = t.list.filter((c) => c.k === n[1] && (!n[2] || c.n === n[2]));
  if (!e.length) return null;
  const a = e.reduce((c, d) => (d.lvl > c.lvl ? d : c)),
    i = [];
  for (const [c, d, f] of a.base) {
    if (ry.has(c)) continue;
    const h = oy[c] || c,
      g = sA(h) === "adddefense_v" ? Math.abs(d) : d,
      u = sA(h) === "adddefense_v" ? Math.abs(f) : f,
      w = i.find((x) => x[0] === h);
    w ? ((w[1] += g), (w[2] += u)) : i.push([h, g, u]);
  }
  return {
    uid: o.uid++,
    d: 10,
    k: n[1],
    p: a.p,
    n: n[3],
    ic: a.ic || "",
    lvl: 10,
    s: -1,
    price: a.price,
    base: i,
    req: [[36, n[4]]],
    r: 4,
    thanma: n[0],
    lock: !0,
    mag: n[6]
      .filter(([c]) => ha[c] !== void 0)
      .map(([c, d]) => ({ a: ha[c], p: [d, 0, 0], n: "", pre: 1 })),
  };
};

var ty = function () {
  const A = Hc.filter((e) => e[4] <= o.lvl || (Q().stat.reborn > 0 && e[5] <= 2));
  if (!A.length) return null;
  const n = Math.max(...A.map((e) => e[5])),
    t = A.filter((e) => e[5] >= n - 1);
  return fu(fa(t, (e) => (e[5] === n ? 1 : 2))[0]);
};

var pM = function () {
  return ty() || Rb(!1);
};

var ey = async function (A) {
  const n = Oo(A);
  if (!n) return { ok: !1, msg: "Không có ngựa này" };
  if (o.lvl < n[4] && !Q().stat.reborn) return { ok: !1, msg: `Cần cấp ${n[4]}` };
  const t = gu(n),
    e = Q();
  if (e.fd < t.fd) return { ok: !1, msg: `Cần ${t.fd} Phúc Duyên (có ${e.fd})` };
  if (o.gold < t.gold) return { ok: !1, msg: "Không đủ ngân lượng" };
  if (o.inv.length >= INV_MAX) return { ok: !1, msg: "Hành trang đầy" };
  const a = fu(A);
  return a
    ? (await fo("fd", t.fd, "than ma"))
      ? ((o.gold -= t.gold),
        o.inv.unshift(a),
        (R = !0),
        yo(a),
        C(`🐎 Đổi được thần mã <b style="color:${_0[4]}">${D(a.n)}</b>`),
        $(),
        { ok: !0, msg: "Nhận " + a.n, it: a })
      : { ok: !1, msg: "Chưa trừ được Phúc Duyên" }
    : { ok: !1, msg: "Lỗi dữ liệu ngựa" };
};

var ay = function (A) {
  return A[6]
    .map(([n, t]) =>
      i1(n, [t, 0, t])
        .split("<enter>")[0]
        .replace(/\.\s*$/, ""),
    )
    .join(" · ");
};

var hu = function () {
  const A = Q(),
    n = new Set(
      o.inv
        .concat(Object.values(o.eq))
        .filter(cy)
        .map((e) => e.thanma),
    );
  let t = 0;
  return `<p class="desc">không phạt né tránh, có 2–4 dòng thần lực luôn hiệu lực, tự khóa 🔒. Rơi ở phó bản, rương Boss tuần hạng S, Trùm Hoàng Kim; hoặc đổi tại đây bằng Phúc Duyên (đang có <b>${A.fd}</b>) + ngân lượng. Thuần dưỡng như ngựa thường.</p>
    ${Hc.map((e) => {
      const a =
          e[5] !== t
            ? `<h4 class="rech">${sy[(t = e[5])]} <small class="dim">cấp ${e[4]}+</small></h4>`
            : "",
        i = gu(e),
        r = o.lvl >= e[4] || Q().stat.reborn > 0,
        c = S.items[10].list.find((d) => d.k === e[1] && (!e[2] || d.n === e[2]));
      return `${a}<div class="qrow tmrow${r ? "" : " lock"}">${c && c.ic ? `<img src="${D(c.ic)}" alt="">` : ""}<span><b style="color:${_0[4]}">${D(e[3])}</b>${n.has(e[0]) ? ' <small class="cp">✔ đã có</small>' : ""}<small>${D(e[7])}<br>${D(ay(e))}</small></span>
        <button class="btn sm" data-tm="${e[0]}" ${r && A.fd >= i.fd && o.gold >= i.gold ? "" : "disabled"}>${r ? `${i.fd} PD<br>${q(i.gold)}` : `Cấp ${e[4]}`}</button></div>`;
    }).join("")}`;
};

var uu = function (A) {
  document.querySelectorAll("#mBody [data-tm]").forEach(
    (n) =>
      (n.onclick = async () => {
        n.disabled = !0;
        const t = await ey(n.dataset.tm);
        (k(t.msg), t.ok && o0("learn"), A());
      }),
  );
};
