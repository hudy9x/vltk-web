// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var nA = function s() {
  const A = o.dt || (o.dt = {});
  return (
    A.n == null &&
      Object.assign(A, { n: 0, chain: 0, best: 0, day: "", today: 0, task: null, auto: !0 }),
    A.day !== Oe() && ((A.day = Oe()), (A.today = 0), (A.extra = 0)),
    A.task &&
      (A.task.t === "item" || A.task.t === "mat") &&
      ((A.task = null),
      setTimeout(() => {
        s().task || je();
      }, 0)),
    A
  );
};

var f2 = function (A) {
  const n = nA();
  return N("misc", "ldt") < 1
    ? (A || k("Chưa có Lệnh Bài Dã Tẩu (mua ở Kỳ Trân Các)"), !1)
    : (U("misc", "ldt", -1),
      (n.extra = (n.extra || 0) + h2),
      n.task || je(),
      C(`📜 Dùng Lệnh Bài Dã Tẩu: +${h2} lượt nhiệm vụ hôm nay (${n.today}/${Qe()}).`),
      A || k(`+${h2} lượt Dã Tẩu`),
      (l.dirty = !0),
      $(),
      typeof V == "function" && V(),
      !0);
};

var Py = function () {
  const A = typeof Ue == "function" ? Ue() : DA(Math.min(o.stage, d0)),
    n = Math.max(0, A - N0(0, 1)),
    t = [k0[n]].concat(Un[n] || []),
    e = N0(0, t.length - 1);
  return { zi: n, za: e, zn: t[e].n, z: t[e] };
};

var vy = function () {
  const A = C0(Iy),
    n = rA.map((i, r) => (i === A ? r : -1)).filter((i) => i >= 0 && i <= 9),
    t = E(Math.ceil(o.lvl / 12), 1, 10),
    e = Ha.map(() => 0);
  for (let i = 0; i < 40; i++) {
    const r = C0(n),
      c = _A(r, _a(r, N0(0, 5)), t, 2);
    c &&
      (o.uid--,
      Ha.forEach((d, f) => {
        (c.mag || []).some((h) => d[1].includes(Ti(sA(h.a)))) && e[f]++;
      }));
  }
  const a = e.map((i, r) => [r, i]).filter((i) => i[1] >= 10);
  return { slot: A, grp: a.length ? C0(a)[0] : -1 };
};

var je = function () {
  const A = nA();
  if (A.today >= Qe()) {
    A.task = null;
    return;
  }
  const n = Object.entries(Ly).filter(
      ([a]) => (a !== "boss" || o.lvl >= 30) && (a !== "mat" || y0()),
    ),
    t = fa(n, (a) => a[1])[0],
    e = { t, have: 0 };
  if (t === "killm" || t === "elite" || t === "boss") {
    const a = Py();
    if ((Object.assign(e, { zi: a.zi, za: a.za, zn: a.zn }), t === "killm")) {
      const i = a.z.m.filter((r) => r0[r]);
      Object.assign(e, { tid: C0(i.length ? i : AA(o.stage).m), need: 25 + N0(0, 15) });
    }
    (t === "elite" && (e.need = 5 + N0(0, 3)),
      t === "boss" && Object.assign(e, { tid: a.z.boss, need: 1 }));
  }
  (t === "mat" && Object.assign(e, { lv: Qy(), cnt: 2 + N0(0, 2) }),
    t === "gold" && (e.cost = Math.round((300 + o.lvl * o.lvl * 6) * 4)),
    t === "item" && Object.assign(e, vy(), { minR: o.lvl >= 40 ? 2 : 1 }),
    (A.task = e));
};

var ze = function (A) {
  if (!A) return "—";
  const n = A.zn ? ` ở ${A.zn}` : "";
  switch (A.t) {
    case "kill":
      return `Hạ ${A.need} quái (cấp ≥ ${A.minL})`;
    case "killm":
      return `Săn ${A.need} ${r0[A.tid] ? r0[A.tid].n : "quái"}${n}`;
    case "elite":
      return `Diệt ${A.need} quái tinh anh${n}`;
    case "boss":
      return `Hạ trùm ${ga(A.tid, A.zn)}${n}`;
    case "mat":
      return `Thu thập ${A.cnt} Huyền Tinh Khoáng Thạch cấp ${A.lv} (có ${Math.min(A.cnt, N("ht", A.lv))})`;
    case "gold":
      return `Nộp ${q(A.cost)} lượng`;
    case "item":
      return `Tìm ${Ny(A.slot)} ${Zr[A.minR]} trở lên${A.grp >= 0 ? ` có dòng ${Ha[A.grp][0]}` : ""}`;
  }
  return "?";
};

var tA = function (A) {
  const n = o.dt && o.dt.task;
  if (
    !n ||
    n.t !== "item" ||
    !o.fac ||
    o.lvl < kA ||
    !A ||
    !Ys(A, n) ||
    Object.values(o.eq).includes(A)
  )
    return !1;
  const t = Ge(n);
  return !t || t === A;
};

var Cu = function (A) {
  const n = o.dt,
    t = n && n.task;
  !t ||
    t.t !== "item" ||
    !n.auto ||
    !Ys(A, t) ||
    !o.inv.includes(A) ||
    (C(`📜 Dã Tẩu: nhặt được <b>${D(A.n)}</b> để nộp.`), Gs(!0));
};

var ot = function (A) {
  return A
    ? A.t === "gold"
      ? o.gold >= A.cost
      : A.t === "item"
        ? !!A.bought || !!Ge(A)
        : A.t === "mat"
          ? !!A.bought || N("ht", A.lv) >= A.cnt
          : A.have >= A.need
    : !1;
};

var Qs = function (A) {
  if (A && (A.sat || A.satG)) return !0;
  const n = o.dt && o.dt.task;
  return !n || !n.need || n.have >= n.need || !A || !Iu(n)
    ? !1
    : n.t === "killm"
      ? A.tid === n.tid
      : n.t === "elite"
        ? A.cls === "elite"
        : n.t === "boss"
          ? A.cls === "boss" && A.tid === n.tid
          : !1;
};

var by = function (A) {
  if (!o.fac || o.lvl < kA) return;
  const n = nA(),
    t = n.task;
  if (t && t.t === "item" && !Ge(t) && !l.ground.some((a) => Ys(a.it, t)) && Math.random() < jy) {
    const a = rA.map((r, c) => (r === t.slot ? c : -1)).filter((r) => r >= 0 && r <= 9),
      i = E(Math.ceil(Math.min(A.L, o.lvl) / 12), 1, 10);
    for (let r = 0; r < 40; r++) {
      const c = C0(a),
        d = _A(c, _a(c, N0(0, 5)), i, 2);
      if (d && Ys(d, t)) {
        (q4(d, A), C(`📜 Dã Tẩu: <b>${D(d.n)}</b> rơi ra (vật phẩm cần tìm).`));
        break;
      }
    }
  }
  if (t && t.t === "mat" && n.auto && ot(t)) {
    Gs(!0);
    return;
  }
  !t ||
    !t.need ||
    t.have >= t.need ||
    !Qs(A) ||
    (t.have++,
    t.have >= t.need &&
      (n.auto
        ? Gs(!0)
        : (k("Dã Tẩu: nhiệm vụ hoàn thành, về trả!"),
          C("📜 Dã Tẩu: <b>hoàn thành</b> " + D(ze(t)) + " — về trả nhiệm vụ."))));
};

var Gs = function s(A) {
  const n = nA(),
    t = n.task;
  if (!ot(t)) return !1;
  if ((t.t === "gold" && (o.gold -= t.cost), t.t === "item" && !t.bought)) {
    const i = Ge(t);
    (o.inv.splice(o.inv.indexOf(i), 1), (R = !0));
  }
  (t.t === "mat" && !t.bought && U("ht", t.lv, -t.cnt),
    n.n++,
    n.chain++,
    n.today++,
    (n.best = Math.max(n.best, n.chain)));
  const e = n.chain,
    a = u2[t.t] || 1;
  if (
    (z0(
      {
        gold: Math.round(120 * a),
        xp: Math.min(0.05, 0.02 + e * 6e-4) * a,
        fd: a > 1 ? 2 : 1,
        knb: Math.random() < 0.08 * a ? 1 : 0,
      },
      `Dã Tẩu #${e}`,
    ),
    y0() && (Math.random() < 0.35 || e % 50 === 0))
  ) {
    const i = E(Math.floor(o.lvl / 15) + (e % 50 === 0 ? 1 : 0), 1, MA),
      r = e % 50 === 0 ? 3 : 1;
    (U("ht", i, r), C(`📜 Dã Tẩu: nhận ${r} Huyền Tinh cấp ${i}`));
  }
  return (
    e % 20 === 0 &&
      (z0({ misc: { lb: 1 } }, `Dã Tẩu chuỗi ${e}`),
      y0() && C(`📜 Dã Tẩu chuỗi ${e}: ${Le(o.lvl)}`)),
    e % 500 === 0 && typeof qs == "function" && qs(1, `Mốc Dã Tẩu ${e}`),
    _n("dt"),
    e % 50 === 0 && z0({ item: 5, fd: 5 }, `Rương Dã Tẩu ${e}`),
    yy(e, n.n),
    je(),
    A
      ? ((n.task && n.task.t === "gold" && o.gold >= n.task.cost * 20) ||
          (n.task &&
            ((n.task.t === "item" && Ge(n.task)) || (n.task.t === "mat" && ot(n.task))))) &&
        s(!0)
      : Ic(),
    !0
  );
};

var yy = function (A, n) {
  const t = (e, a) => {
    e && (xn(e, !0, !0, !0), C(`📜 ${a}: <b style="color:${_0[e.r]}">${D(e.n)}</b>`));
  };
  (A % 200 === 0 &&
    (o.lvl >= 75
      ? z0({ misc: { bk90: 1 } }, `Mốc Dã Tẩu ${A}`)
      : z0({ buff: { tt: [0.5, 60] } }, `Mốc Dã Tẩu ${A}`)),
    A % 100 === 0 &&
      (z0({ knb: 3, fd: 10 }, `Mốc Dã Tẩu ${A}`),
      typeof nt == "function" &&
        (nt("luck", 20, 60), C(`📜 Mốc Dã Tẩu ${A}: Quế Hoa Tửu +20 may mắn 60 phút`))),
    A % 500 === 0 && z0({ knb: 5, fd: 20, item: 6, misc: { wc: 1 } }, `Mốc Dã Tẩu ${A}`),
    n % Rs === 0
      ? t(Ts(!1, !0), `Dã Tẩu ${n} nhiệm vụ — Hoàng Kim Môn Phái`)
      : n % 1e3 === 0
        ? t(Ts(!0), `Dã Tẩu ${n} nhiệm vụ — Hoàng Kim`)
        : n % 500 === 0 && z0({ misc: { dtbk: 1 } }, `Dã Tẩu ${n} nhiệm vụ`));
};

var ky = function () {
  const A = nA();
  return N("misc", "ldt") < 1
    ? !1
    : (U("misc", "ldt", -1),
      je(),
      C("📜 Dùng Lệnh Bài Dã Tẩu đổi nhiệm vụ (giữ chuỗi)."),
      Ic(),
      $(),
      !0);
};

var xy = function () {
  if (ky()) return;
  const A = nA();
  ((A.chain = 0), je(), C("📜 Hủy nhiệm vụ Dã Tẩu, chuỗi liên tiếp về 0."), Ic(), $());
};

var Ic = function () {
  V();
};

var By = function () {
  if (o.lvl < kA) return `<p class="desc">Dã Tẩu giao nhiệm vụ từ cấp ${kA}.</p>`;
  const A = nA();
  !A.task && A.today < Qe() && je();
  const n = A.task,
    t = ot(n),
    e = Eu.map((r) => r[0] - (A.chain % r[0])).sort((r, c) => r - c)[0],
    [a, i] = Gy(A.n);
  return `<p class="desc">Mốc chuỗi liên tiếp: ${Eu.map(([r, c]) => `<b>${r}</b>: ${c}`).join(" · ")}. Mốc tổng nhiệm vụ: <b>500</b>: Đại Thành Bí Kíp · <b>1000</b>: Hoàng Kim dùng chung · <b class="gold">${Rs} / ${Rs * 2} / ${Rs * 3}…</b>: <b style="color:#ffd24a">Hoàng Kim Môn Phái</b> (chắc chắn). Đổi nhiệm vụ: tốn 1 Lệnh Bài Dã Tẩu (giữ chuỗi); không có lệnh bài thì hủy = mất chuỗi. ${Nc} nhiệm vụ / ngày + ${h2} mỗi lệnh bài (mua tối đa ${T4} / ngày).</p>
    <div class="card"><div class="stats"><span>Chuỗi liên tiếp</span><span><b>${A.chain}</b> (kỷ lục ${A.best})</span><span>Hôm nay</span><span>${A.today}/${Qe()}${A.extra ? ` <small class="cp">(+${A.extra} lệnh bài)</small>` : ""}</span><span>Mốc chuỗi kế</span><span>còn ${e}</span><span>Tổng</span><span>${A.n}</span><span>Mốc tổng kế</span><span>${a}: ${i} <small class="dim">(còn ${a - A.n})</small></span></div></div>
    <div class="card"><b>📜 ${n ? D(ze(n)) : "Hết nhiệm vụ hôm nay"}</b> <small class="dim">${n ? jo(n) : ""}</small>
      ${n && n.t === "item" ? `<div class="dim small">${Ge(n) ? "Sẽ nộp: " + D(Ge(n).n) + " (đang giữ 📜)" : `Chưa có món phù hợp: món rơi phù hợp sẽ được tự nhặt và giữ lại. Tự trả: sau ${qy} quái chưa có thì mua ở tiệm (${q(zy())} lượng) · đã hạ ${n.kw || 0}`}</div>` : ""}
      <div class="dim small">${n && n.zn && !Iu(n) ? `Auto sẽ dịch chuyển tới ${D(n.zn)}. ` : ""}Thưởng${n && u2[n.t] ? " ×1,5" : ""}: ${Math.round(Math.min(0.05, 0.02 + (A.chain + 1) * 6e-4) * ((n && u2[n.t]) || 1) * 1e3) / 10}% kinh nghiệm cấp, ${q(120 * ((n && u2[n.t]) || 1) * (1 + o.lvl / 10))} lượng, ${n && u2[n.t] ? 2 : 1} Phúc Duyên, <b style="color:#ffd24a">${n && u2[n.t] ? 12 : 8}% 1 KNB</b>${y0() ? ", 35% Huyền Tinh (mỗi 10 nhiệm vụ: 3 viên)" : ""}</div>
      <div class="btnrow"><button class="btn" id="dtDo" ${t ? "" : "disabled"}>${n && (n.t === "gold" || n.t === "item" || n.t === "mat") ? "Nộp" : "Trả nhiệm vụ"}</button><button class="btn red" id="dtCancel" ${n ? "" : "disabled"}>${N("misc", "ldt") ? "Đổi (1 Lệnh Bài)" : "Hủy (mất chuỗi)"}</button>
      <label class="chk"><input type="checkbox" id="dtAuto" ${A.auto ? "checked" : ""}> Tự trả / nhận</label></div></div>
    <div class="card small"><img src="img/ep/ldt.png" alt="" style="height:20px;vertical-align:middle;image-rendering:pixelated"> <b>Lệnh Bài Dã Tẩu</b>: có ${N("misc", "ldt")} · mỗi lệnh bài +${h2} lượt hôm nay (mua ở Kỳ Trân Các)
      <div class="btnrow"><button class="btn sm${A.today >= Qe() ? " on" : ""}" id="dtLdt" ${N("misc", "ldt") ? "" : "disabled"}>Dùng Lệnh Bài (+${h2} lượt)</button>
      <label class="chk"><input type="checkbox" id="dtLdtAuto" ${o.autoLdt === !1 ? "" : "checked"}> Tự dùng khi hết lượt (chế độ Làm nhiệm vụ)</label></div></div>`;
};

var _y = function () {
  const A = (e, a) => {
    const i = m(e);
    i && (i.onclick = a);
  };
  (A("#dtDo", () => {
    (Gs(!1), $());
  }),
    A("#dtCancel", xy));
  const n = m("#dtAuto");
  (n &&
    (n.onchange = () => {
      ((nA().auto = n.checked), $());
    }),
    A("#dtLdt", () => f2(!1)));
  const t = m("#dtLdtAuto");
  t &&
    (t.onchange = () => {
      ((o.autoLdt = t.checked), $());
    });
};

var Ks = function () {
  const A = o.st || (o.st = { day: "", kills: 0, fails: 0, best: 0 });
  return (
    A.day !== Oe() && ((A.day = Oe()), U("misc", "lb", Math.max(0, Nu - N("misc", "lb")))),
    A
  );
};

var My = function (A) {
  const n = [...new Set(k0.map((t) => t.boss))].filter(
    (t) => r0[t] && j2(t) === A && !/boss/i.test(r0[t].n),
  );
  return n.length ? n : [...new Set(k0.map((t) => t.boss))];
};

var Ou = function (A) {
  if ((Ks(), l.sat)) {
    k("Đang có Sát Thủ trên bản đồ");
    return;
  }
  if (l.dg || l.tower || l.town) {
    k("Ra bãi luyện công để gọi Sát Thủ");
    return;
  }
  if (A > qc()) return;
  if (N("misc", "lb") < 1) {
    k("Cần Lệnh Bài Sát Thủ");
    return;
  }
  U("misc", "lb", -1);
  const n = N0(0, 4),
    t = C0(My(n)),
    e = A + 5;
  if (typeof On == "function") {
    const d = vk(e);
    DA(Math.min(o.stage, d0)) !== d && On(d, `Sát Thủ cấp ${A} xuất hiện`);
  }
  const a = AA(Math.min(o.stage, d0)),
    i = (d, f) => {
      const h = Z(0, Math.PI * 2),
        g = Z(d, f);
      return X0(v.x + Math.cos(h) * g, v.y + Math.sin(h) * g);
    },
    r = i(200, 240),
    c = n1(t, e, "boss", r[0], r[1]);
  ((c.hp = c.max = c.max * 2.2),
    (c.dmg *= 1.2),
    (c.sat = A),
    (c.series = n),
    (c.n = `${g0[n]} Sát Thủ · ${r0[t].n}`),
    l.enemies.push(c));
  for (let d = 0; d < 2; d++) {
    const f = i(150, 220),
      h = n1(C0(a.m), e, "elite", f[0], f[1]);
    ((h.satG = 1), (h.n = "Hộ vệ · " + h.n), l.enemies.push(h));
  }
  ((l.sat = { t: Lc, tier: A, id: c.id }),
    n0(!0),
    (l.banner = { t: 2.6, text: `${g0[n]} Sát Thủ cấp ${A}`, sub: `Hạ trong ${Lc} giây` }),
    C(`🗡 <b style="color:${w0[n]}">${D(c.n)}</b> (cấp ${e}) xuất hiện!`),
    $());
};

var Hy = function (A) {
  const n = l.sat;
  if (!n) return;
  n.t -= A;
  const t = l.enemies.find((e) => e.id === n.id && !e.dead);
  if (n.done) {
    l.sat = null;
    return;
  }
  (!t || n.t <= 0) &&
    ((l.enemies = l.enemies.filter((e) => !(e.sat || e.satG) || e.dead)),
    Ks().fails++,
    (l.sat = null),
    C('<span class="bad">🗡 Sát Thủ đã trốn thoát.</span>'),
    (l.banner = { t: 2, text: "Sát Thủ trốn thoát", sub: "" }));
};

var $y = function (A) {
  if (!A.sat) return;
  const n = A.sat,
    t = Ks();
  (t.kills++, (t.best = Math.max(t.best, n)), l.sat && l.sat.id === A.id && (l.sat.done = !0));
  const e = { wc: n >= 40 && Math.random() < 0.1 ? 1 : 0, mys: 0 };
  n >= 90 && Math.random() < 0.08 && (e.bk90 = 1);
  for (const i in e) e[i] || delete e[i];
  z0({ gold: n * 25, xp: 0.01 + (n / 90) * 0.03, item: 5, misc: e }, `Hạ Sát Thủ cấp ${n}`);
  const a = E(Math.floor(n / 10) - 1, 1, 10);
  (U("ht", a),
    C(`🗡 Nhận Huyền Tinh cấp ${a}${y0() && n >= 50 ? ", " + Le(n) : ""}`),
    l.enemies.forEach((i) => {
      i.satG && (i.satG = 0);
    }));
};

var Ty = function () {
  const A = Ks(),
    n = qc(),
    t = N("misc", "lb");
  return `<p class="desc">Sát Thủ Đường: dùng 1 Lệnh Bài gọi Sát Thủ (5 hệ) kèm 2 hộ vệ ngay tại bãi luyện công, hạ trong ${Lc} giây. Mỗi ngày nhận ${Nu} lệnh bài miễn phí; thêm từ Dã Tẩu (mỗi 5 nhiệm vụ) và trùm. Thưởng: kinh nghiệm, Thủy Tinh Trắng, Thần Bí Khoáng Thạch, Huyền Tinh (Sát Thủ cấp 50+: thêm 1 đá thuộc tính), đồ 5 dòng; Sát Thủ 90 có cơ hội rơi Bí Kíp 90.</p>
    <div class="card stats"><span>Lệnh Bài Sát Thủ</span><span><b>${t}</b></span><span>Đã hạ</span><span>${A.kills} (cao nhất cấp ${A.best || "—"})</span><span>Trốn thoát</span><span>${A.fails}</span></div>
    ${l.sat ? `<div class="card"><b>🗡 Đang truy sát Sát Thủ cấp ${l.sat.tier}</b> <small class="dim">còn ${Math.ceil(l.sat.t)} giây</small></div>` : ""}
    <div class="stgrid">${Ky.map((e) => `<button class="btn" data-st="${e}" ${e <= n && t && !l.sat ? "" : "disabled"}>Cấp ${e}${e > n ? ` <small>(cần cấp ${e})</small>` : ""}</button>`).join("")}</div>`;
};

var Cy = function (A) {
  if (o.fac) {
    if ((by(A), $y(A), A.cls === "boss")) {
      const n = A.goldBoss || A.wb;
      if (Math.random() < (n ? 0.5 : 0.1)) {
        const t = n ? N0(1, 2) : 1;
        (Dr("boss", t), C(`💰 Nhặt được <b style="color:#ffd700">${t} Kim Nguyên Bảo</b>`));
      }
    }
    if (A.cls === "boss") {
      const n = A.L,
        t = (A.goldBoss || A.wb ? 4 : 1) * ss(),
        e = [];
      (n >= 75 && Math.random() < 0.03 * t && e.push("bk90"),
        !A.sat && Math.random() < 0.06 && e.push("lb"));
      for (const a of e) (U("misc", a, 1), C(`Nhặt được <b style="color:#ffd24a">${rt(a)}</b>`));
    }
  }
};

var Oy = function (A) {
  (Hy(A),
    typeof og == "function" && og(A),
    typeof ku == "function" && ku(A),
    typeof ph == "function" && ph(A));
};

var Ey = function (A) {
  if (!o.fac || o.lvl < kA) return;
  Ks();
  const n = nA(),
    t = n.task;
  (t && ot(t) && !n.auto
    ? A.push({ k: "dt", t: "📜 Trả nhiệm vụ Dã Tẩu", go: () => Us("dt") })
    : t && t.need && A.push({ k: "dtp", t: `📜 ${ze(t)} ${jo(t)}`, go: () => Us("dt") }),
    N("misc", "lb") > 0 &&
      !l.sat &&
      o.lvl >= 20 &&
      o.st &&
      o.st.kills < 1 &&
      A.push({ k: "st", t: "🗡 Có Lệnh Bài Sát Thủ", go: () => Us("st") }));
};

var Sy = Object.assign(
  {
    wc: "Thủy Tinh Trắng",
    mys: "Thần Bí Khoáng Thạch",
    lb: "Lệnh Bài Sát Thủ",
    dtbk: "Đại Thành Bí Kíp",
    ldp: "Lệnh Bài Đổi Phái",
    ldt: "Lệnh Bài Dã Tẩu",
    dgt: "Thẻ Đổi Giới Tính",
    rngua: "Rương Ngựa",
    vlmt: "Võ Lâm Mật Tịch",
    ttk: "Tẩy Tủy Kinh",
  },
  Fi,
);

var rt = (s) => Sy[s] || s;

var kA = 20;

var Nc = 40;

var h2 = 20;

var Rs = 2e3;

var Eu = [
  [20, "Lệnh Bài Sát Thủ + 1 đá thuộc tính"],
  [50, "rương đồ 5 dòng + 3 Huyền Tinh + ~2 Phúc Duyên"],
  [100, "Quế Hoa Tửu 60 phút + 3 KNB + ~3 Phúc Duyên"],
  [200, "Bí Kíp 90 (chưa đủ cấp 75: Tiên Thảo Lộ 60 phút)"],
  [
    500,
    "1 Rương Ngựa + Thủy Tinh Trắng + Thần Bí Khoáng Thạch + đồ 6 dòng + 5 KNB + ~6 Phúc Duyên",
  ],
];

var Su = [
  [Rs, "Hoàng Kim Môn Phái"],
  [1e3, "Hoàng Kim dùng chung (Kim Phong, An Bang, Định Quốc…)"],
  [500, "Đại Thành Bí Kíp"],
];

var Qe = () => Nc + (nA().extra || 0);

var Iy = ["weapon", "armor", "helm", "belt", "boot", "cuff", "amulet", "ring", "pendant"];

var Ny = (s) => (s === "ring" ? "Nhẫn" : Wr[s]);

var Ly = { killm: 50, elite: 25, boss: 15, gold: 10 };

var u2 = { boss: 1.5, item: 1.5 };

var qy = 80;

var jy = 0.06;

var zy = () => Math.round((300 + o.lvl * o.lvl * 6) * 3);

var Qy = () => E(Math.floor(o.lvl / 15), 1, MA);

var Iu = (s) =>
  s.zi == null ||
  (DA(Math.min(o.stage, d0)) === s.zi && ((o.zalt || {})[s.zi] || 0) === (s.za || 0));

var jo = (s) => (s && s.need ? `${Math.min(s.have, s.need)}/${s.need}` : "");

var Ys = (s, A) =>
  s &&
  !s.set &&
  !s.vio &&
  !s.plv &&
  !s.lock &&
  !s.thanma &&
  (s.r || 0) >= A.minR &&
  rA[s.d] === A.slot &&
  (A.grp == null || A.grp < 0 || (s.mag || []).some((n) => Ha[A.grp][1].includes(Ti(sA(n.a)))));

var Ge = (s) => o.inv.filter((A) => Ys(A, s)).sort((A, n) => K0(A) - K0(n))[0];

var Gy = (s) => {
  const A = Su.map(([e, a]) => [Math.ceil((s + 1) / e) * e, a]).sort((e, a) => e[0] - a[0] || 0),
    n = A[0][0],
    t = Su.find(([e]) => n % e === 0);
  return [n, t ? t[1] : A[0][1]];
};

var Ky = [20, 30, 40, 50, 60, 70, 80, 90];

var Lc = 150;

var Nu = 3;

var qc = () => Math.max(20, Math.min(90, Math.floor(o.lvl / 10) * 10));

var Ry = function s(A, n) {
  const t = Kc(n),
    e = ju(A, n);
  return Fc(n) ? (e + (1 - t) * s(A, n - 1)) / t : e / t;
};

var jc = function (A, n) {
  let t = 0;
  for (let e = A.enh || 0; e < n; e++) t += Ry(A, e);
  return Math.round(t);
};

var Lu = function (A) {
  return o.gold < A ? (k("Không đủ ngân lượng"), !1) : ((o.gold -= A), !0);
};

var zc = function (A) {
  if (!Vc(A) || (A.enh || 0) >= ut || (o.knb | 0) < L1(A)) return null;
  o.knb = (o.knb | 0) - L1(A);
  const n = Yc(A),
    t = A.enh || 0;
  if (Math.random() < n)
    return (
      A.enhP && (delete A.enhP[t], Object.keys(A.enhP).length || delete A.enhP),
      (A.enh = t + 1),
      Lb(A),
      !0
    );
  const e = Go(A);
  return (
    ((A.enhP || (A.enhP = {}))[t] = [
      e[0] + 1,
      Math.min(1, Math.round((e[1] + sk * n) * 1e4) / 1e4),
    ]),
    Fc(A.enh || 0) && (A.enh--, A.enh || delete A.enh),
    !1
  );
};

var Yy = function (A) {
  if (!he(A)) {
    n0();
    return;
  }
  if (!Vc(A)) return k("Ngựa không cường hóa được");
  if ((A.enh || 0) >= ut) return;
  if ((o.knb | 0) < L1(A)) return k("Không đủ Kim Nguyên Bảo");
  const n = A.enh || 0,
    t = zc(A);
  (t
    ? (o0(A.enh >= 7 ? "levelup" : "learn"), C(`Cường hóa <b>${D(A.n)}</b> lên +${A.enh}`))
    : (o0("use"),
      (A.enh || 0) < n &&
        C(`<span class="bad">Cường hóa <b>${D(A.n)}</b> thất bại, tụt về +${A.enh || 0}</span>`)),
    (l.dirty = !0),
    (R = !0),
    $(),
    g2(A),
    Fy(t, A.enh || 0, !t && (A.enh || 0) < n));
};

var Fy = function (A, n, t) {
  if (!document.getElementById("enhFxCss")) {
    const i = document.createElement("style");
    ((i.id = "enhFxCss"),
      (i.textContent = `
.enhfx{position:absolute;inset:0;pointer-events:none;z-index:50;display:flex;align-items:center;justify-content:center;overflow:hidden}
.enhfx b{font:900 34px/1 serif;letter-spacing:2px;text-shadow:0 0 8px #000,0 2px 0 #000;animation:enhTxt 1.3s ease-out forwards}
.enhfx.ok{background:radial-gradient(circle,rgba(255,214,90,.55) 0,rgba(255,170,0,.18) 35%,transparent 70%);animation:enhFlash 1.3s ease-out forwards}
.enhfx.ok b{color:#ffe27a}
.enhfx.ok i{position:absolute;left:50%;top:50%;width:4px;height:120px;margin:-60px 0 0 -2px;background:linear-gradient(#fff6c0,transparent);transform-origin:50% 100%;animation:enhRay 1s ease-out forwards}
.enhfx.fail{background:radial-gradient(circle,rgba(120,120,120,.45) 0,rgba(60,0,0,.25) 45%,transparent 75%);animation:enhFlash 1.2s ease-out forwards}
.enhfx.fail b{color:#ff6a5a;animation:enhShake .45s linear 2,enhTxt 1.2s ease-out forwards}
.modal-shake{animation:enhShake .4s linear 1}
@keyframes enhFlash{0%{opacity:0}12%{opacity:1}100%{opacity:0}}
@keyframes enhTxt{0%{transform:scale(.4);opacity:0}20%{transform:scale(1.15);opacity:1}35%{transform:scale(1)}80%{opacity:1}100%{transform:translateY(-30px);opacity:0}}
@keyframes enhRay{0%{opacity:0;transform:rotate(var(--r)) scaleY(.2)}25%{opacity:1}100%{opacity:0;transform:rotate(var(--r)) scaleY(1.6)}}
@keyframes enhShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`),
      document.head.appendChild(i));
  }
  const e =
    (document.getElementById("mBody") || {}).parentElement || document.querySelector(".modal");
  if (!e) return;
  getComputedStyle(e).position === "static" && (e.style.position = "relative");
  const a = document.createElement("div");
  ((a.className = "enhfx " + (A ? "ok" : "fail")),
    (a.innerHTML =
      (A
        ? Array.from(
            { length: n >= 7 ? 16 : 10 },
            (i, r) => `<i style="--r:${r * (360 / (n >= 7 ? 16 : 10))}deg"></i>`,
          ).join("")
        : "") +
      `<b>${A ? `+${n} THÀNH CÔNG` : "THẤT BẠI"}${t ? `<br><small style="font-size:18px">tụt về +${n}</small>` : ""}</b>`),
    e.appendChild(a),
    A || (e.classList.remove("modal-shake"), e.offsetWidth, e.classList.add("modal-shake")),
    setTimeout(() => a.remove(), 1400));
};

var vM = function (A, n, t) {
  const e = { tries: 0, ok: 0, fail: 0, spent: 0, from: A.enh || 0 };
  for (; (A.enh || 0) < n && e.tries < 200;) {
    const a = L1(A);
    if (a > (o.knb | 0) || e.spent + a > t) break;
    const i = zc(A);
    if (i === null) break;
    (e.tries++, (e.spent += a), i ? e.ok++ : e.fail++);
  }
  return (
    e.tries &&
      ((l.dirty = !0),
      (R = !0),
      C(
        `Cường hóa <b>${D(A.n)}</b>: +${e.from} → +${A.enh || 0} (${e.tries} lần, ${e.fail} thất bại, −${e.spent} KNB)`,
      ),
      $()),
    e
  );
};

var Vy = function (A) {
  if (!Object.values(o.eq).includes(A) || (A.enh || 0) >= ut) return null;
  const n = G0(j0());
  A.enh = (A.enh || 0) + 1;
  const t = G0(j0());
  return (A.enh--, A.enh || delete A.enh, t / Math.max(1, n) - 1);
};

var Uy = function (A, n) {
  const t = new Set(A.mag.filter((a, i) => n.has(i)).map((a) => a.a)),
    e = l.P ? l.P.lucky : 0;
  return A.mag.map((a, i) => (n.has(i) ? a : p6(A, i, E(A.lvl + N0(-1, 0), 1, 10), t, e) || a));
};

var Qc = function (A) {
  return (Uc.uid !== A.uid && (Uc = { uid: A.uid, keep: new Set(), cand: null }), Uc);
};

var Xy = function (A) {
  if (!he(A) || !Ru(A)) return;
  const n = Qc(A),
    t = Ku(A, n.keep.size);
  if (n.keep.size >= A.mag.length) {
    k("Phải để ít nhất 1 dòng tẩy luyện");
    return;
  }
  Lu(t) && ((n.cand = Uy(A, n.keep)), o0("learn"), $(), g2(A));
};

var Jy = function (A) {
  const n = Qc(A);
  !n.cand ||
    !he(A) ||
    ((A.mag = n.cand),
    delete A.leg,
    (n.cand = null),
    (l.dirty = !0),
    (R = !0),
    k("Đã nhận dòng mới"),
    $(),
    g2(A));
};

var Gc = function (A, n) {
  const t = Object.assign({}, A, { mag: n }),
    e = Y2(A, o.eq);
  if (e) {
    const a = Object.assign({}, o.eq);
    return ((a[e] = t), G0(j0(a)) / Math.max(1, G0(j0())) - 1);
  }
  return K0(t) / Math.max(1, K0(A)) - 1;
};

var zo = function (A, n) {
  (k(A.msg), o0(A.ok ? "learn" : "use"), C(D(A.msg)), (l.dirty = !0), (R = !0), $(), n());
};

var Wy = function (A) {
  if (!A.set || A.set.kind !== "platina") return "";
  const n = A.plv || 0;
  if (n >= ds)
    return '<div class="card"><b>Thăng cấp Bạch Kim</b> <small class="dim">Đã tối đa +10</small></div>';
  const t = i8(A),
    e = N("misc", "mys"),
    a = Fs[A.uid] ?? Math.min(t, e),
    i = xd(A, a);
  return `<div class="card"><b>Thăng cấp Bạch Kim</b> <small class="dim">+${n} → +${n + 1} · ${A.pv3 ? `6 dòng tăng theo cấp${n + 1 >= 5 && n + 1 <= 9 ? ' · <b class="cp">tung lại 2 dòng Bạch Kim</b>' : n + 1 < 5 ? " · +5 mở 2 dòng Bạch Kim" : ""}` : `mỗi cấp +${Math.round(A4 * 100)}% thuộc tính gốc`} · phí ${q(B1)} lượng</small>
    <div class="bttrow"><label><img src="img/ep/mys.png" alt=""> Thần Bí Khoáng Thạch <small class="dim">(cần ${t} viên cho 100% · có ${e})</small> <input type="number" min="0" max="${e}" value="${a}" id="fMys" style="width:52px"></label></div>
    <div class="btnrow"><b class="${i >= 1 ? "cp" : i >= 0.5 ? "" : "cn"}">Tỉ lệ thành công ${Math.round(i * 100)}%</b><button class="btn sm" id="fMysAll">Đủ 100%</button><button class="btn" id="fPlat" ${i > 0 && o.gold >= B1 ? "" : "disabled"}>Thăng cấp</button></div>
    <small class="dim">Thất bại mất số đá đã bỏ + phí, giữ cấp cũ. Thần Bí Khoáng Thạch rơi từ Trùm Hoàng Kim và tầng trùm Thông Thiên Tháp.</small></div>`;
};

var Zy = function (A) {
  const n = Go(A),
    t = Math.min(1, n[1]),
    e = Rc(A),
    a = Math.round(Kc(A.enh || 0) * 100);
  return `<div class="enhe"><small>Tinh Lực <b class="${t >= 1 ? "cp" : ""}">${(t * 100).toFixed(1)}%</b>${t >= 1 ? ' · lần sau <b class="cp">chắc chắn thành công</b>' : ""}${e && t < 1 ? ` · thất bại ${n[0]} lần: ${a}% → ${Math.round(Yc(A) * 100)}%` : ""}</small><div class="enhbar"><i style="width:${(t * 100).toFixed(1)}%"></i></div>
    <small class="dim">Mỗi lần thất bại: +${zu * 100}% tỉ lệ gốc (tối đa ×2) và nạp Tinh Lực. Đầy 100% → chắc chắn thành công. Tinh Lực tính riêng từng cấp (+${A.enh || 0} → +${(A.enh || 0) + 1}): tụt cấp vẫn giữ, chỉ về 0 khi lên cấp này thành công.</small></div>`;
};

var g2 = function s(A) {
  const n = A.enh || 0,
    t = n >= ut,
    e = Vy(A),
    a = Qc(A),
    i = a.keep.size,
    r = Ku(A, i),
    c = (f) =>
      f
        .map(
          (h, g) =>
            `<div class="${g % 2 ? "h" : "m"}">${D(
              i1(
                sA(h.a),
                h.p.map((u) => (u === -1 ? 0 : u)),
              ),
            )}${g % 2 ? " (ẩn)" : ""}</div>`,
        )
        .join(""),
    d = Ru(A)
      ? a.cand
        ? (() => {
            const f = Gc(A, a.cand),
              h = f > 5e-4 ? "cp" : f < -5e-4 ? "cn" : "dim";
            return `<div class="forgecmp"><div class="sl"><b>Dòng cũ</b>${c(A.mag)}</div><div class="sl"><b>Dòng mới</b>${c(a.cand)}</div></div>
      <p class="small">${Object.values(o.eq).includes(A) ? "Sức mạnh nhân vật" : "Chỉ số món"} nếu nhận: <b class="${h}">${J2(f)}</b></p>
      <div class="btnrow"><button class="btn" id="fRrOk">Nhận dòng mới</button><button class="btn" id="fRrNo">Giữ dòng cũ</button></div>`;
          })()
        : `<small>Đánh dấu dòng muốn <b>giữ lại</b> (mỗi dòng +${Gu * 100}% giá). Kết quả hiện để so sánh trước khi nhận.</small>
      ${A.mag
        .map(
          (f, h) =>
            `<label class="keepl"><input type="checkbox" data-keep="${h}" ${a.keep.has(h) ? "checked" : ""}><span class="${h % 2 ? "h" : "m"}">${D(
              i1(
                sA(f.a),
                f.p.map((g) => (g === -1 ? 0 : g)),
              ),
            )}${h % 2 ? " (ẩn)" : ""}</span></label>`,
        )
        .join("")}
      <div class="btnrow"><button class="btn red" id="fRe" ${o.gold >= r && i < A.mag.length ? "" : "disabled"}>Tẩy luyện (${q(r)} lượng${i ? `, giữ ${i} dòng` : ""})</button></div>`
      : '<small class="dim">Đồ trắng / đồ bộ / đồ Tím không tẩy luyện được</small>';
  J(
    `<h3>Rèn đồ <small>${o.knb | 0} KNB · ${q(o.gold)} lượng</small></h3>${Z1(A)}
    ${
      Vc(A)
        ? `    <div class="card"><b>Cường hóa</b> <small class="dim">+${n} / +${ut} · mỗi cấp +${Math.round(Ei * 100)}% thuộc tính gốc, +${Math.round(Si * 100)}% các dòng thuộc tính</small><br>
      ${t ? '<small class="dim">Đã cường hóa tối đa</small>' : `<small>Giá ${L1(A)} KNB (có ${o.knb | 0}) · thành công <b class="${Qu(A) || Rc(A) ? "cp" : ""}">${Math.round(Yc(A) * 100)}%</b> · ${Fc(n) ? '<b class="cn">thất bại tụt về +' + (n - 1) + "</b>" : "thất bại chỉ mất KNB"}${e != null ? ` · sức mạnh <b class="cp">${J2(e)}</b>` : ""}</small>`}
      <div class="btnrow"><button class="btn" id="fEnh" ${t || (o.knb | 0) < L1(A) ? "disabled" : ""}>Cường hóa lên +${n + 1}</button></div>
      ${t ? "" : Zy(A)}</div>`
        : '<div class="card"><b>Cường hóa</b><br><small class="dim">Ngựa không cường hóa được</small></div>'
    }
    <div class="card"><b>Tẩy luyện</b> <small class="dim">gieo lại ${(A.mag || []).length} dòng thuộc tính</small><br>${d}</div>
    ${y0() && !A.set && A.d >= 0 && A.d <= 9 && (Zc(A) || A.vio) ? `<div class="card"><b>💎 Lò Ép Đồ</b> <small class="dim">${A.vio ? "khảm đá thuộc tính vào phôi Huyền Tinh này" : "lấy thuộc tính thành đá, hoặc chế tạo thành phôi Huyền Tinh"}</small><div class="btnrow"><button class="btn" id="fEp">Mở Lò Ép Đồ</button></div></div>` : ""}${Wy(A)}`,
    () => {
      const f = m("#fEnh");
      f && (f.onclick = () => _2(L1(A), () => Yy(A), "cuong hoa"));
      const h = m("#fRe");
      h && (h.onclick = () => Xy(A));
      const g = m("#fRrOk"),
        u = m("#fRrNo");
      (g && (g.onclick = () => Jy(A)),
        u &&
          (u.onclick = () => {
            ((a.cand = null), k("Giữ dòng cũ"), s(A));
          }),
        document.querySelectorAll("#mBody [data-keep]").forEach(
          (P) =>
            (P.onchange = () => {
              const _ = +P.dataset.keep;
              (P.checked ? a.keep.add(_) : a.keep.delete(_), s(A));
            }),
        ));
      const w = m("#fHtLo");
      w && (w.onclick = () => Qo());
      const x = m("#fEp");
      x && (x.onclick = () => Ke(A.vio ? "kham" : Wu(A) ? "hut" : "phoi", A.uid));
      const p = m("#fPlat");
      p &&
        (p.onclick = () => {
          const P = D9(A, Fs[A.uid]);
          (delete Fs[A.uid], zo(P, () => s(A)));
        });
      {
        const P = m("#fMys");
        P &&
          (P.onchange = () => {
            ((Fs[A.uid] = E(+P.value | 0, 0, N("misc", "mys"))), s(A));
          });
        const _ = m("#fMysAll");
        _ &&
          (_.onclick = () => {
            (delete Fs[A.uid], s(A));
          });
      }
    },
  );
};

var Ak = function (A, n) {
  const t = { tries: 0, ok: 0, spent: 0, items: new Set() };
  for (let e = 0; e < 600; e++) {
    const a = Yu()
      .filter((c) => (c.enh || 0) < A)
      .sort((c, d) => L1(c) - L1(d))[0];
    if (!a || L1(a) > (o.knb | 0) || t.spent + L1(a) > n) break;
    const i = L1(a),
      r = zc(a);
    if (r === null) break;
    (t.tries++, (t.spent += i), r && (t.ok++, t.items.add(a)));
  }
  return (
    t.tries &&
      ((l.dirty = !0),
      (R = !0),
      C(`Cường hóa hàng loạt: ${t.tries} lần, ${t.ok} thành công, −${t.spent} KNB`),
      $()),
    t
  );
};
