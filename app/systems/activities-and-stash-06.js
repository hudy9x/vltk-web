// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var Ve = () => Math.max(0, eg - (I1().boat || 0));

var Xo = () => o.lvl >= Uo || Q().stat.reborn > 0;

var Vs = () => !!(l.dg && l.dg.kind === "boat");

var sg = () => (Vs() ? sl : 1);

var Ue = function (A = o.lvl) {
  let n = 0;
  return (
    k0.forEach((t, e) => {
      t.lo <= A && Wo(e) && (n = e);
    }),
    n
  );
};

var ol = function (A) {
  const n = rl(A);
  let t = n,
    e = 1e9;
  for (let a = 0; a < Kn; a++) {
    const i = n + a;
    if (i > d0) break;
    const r = Math.abs(De(i) - o.lvl);
    r < e && ((e = r), (t = i));
  }
  return t;
};

var ig = function () {
  for (let A = 0; A < k0.length; A++)
    Wo(A) && (o.maxStage = Math.max(o.maxStage || 1, Math.min(d0, rl(A) + Kn - 1)));
};

var Jo = function () {
  if (l.ground.length) {
    const A = WA();
    for (const n of l.ground.slice()) (A.pickAll || mA(n.it) || n3(n.it)) && H6(n, !0);
    l.ground = [];
  }
  ((l.pickTarget = null),
    (l.moveTo = null),
    (l.tgt = null),
    (l.manTgt = null),
    l.tgtBan && l.tgtBan.clear(),
    typeof Y < "u" && ((Y.target = null), (Y.tmp = !1)));
};

var On = function (A, n, t) {
  if (!k0[A] || l.dg || l.tower) return !1;
  l.town && en();
  const e = ol(A),
    a = DA(Math.min(o.stage, d0)) === A;
  if (((o.stage = e), (o.wave = 1), !a)) {
    (t || ((l.enemies = []), (l.corpses = []), (l.spawnT = 0.6)), Jo());
    const i = AA(e);
    ((l.zoneShown = i.id),
      Gn(i),
      (l.banner = { t: 2.2, text: i.n, sub: n || `Cấp ${i.lo}–${i.hi}` }),
      n && C(`🗺 ${D(n)}: tới <b>${D(i.n)}</b>`));
  }
  return !0;
};

var Xe = function () {
  if ((ig(), l.dg || l.tower || l.town || l.sat)) return;
  if (o.mode === "quest" || o.autoMap === !1) {
    const t = ol(DA(Math.min(o.stage, d0)));
    t !== o.stage && (o.stage = t);
    return;
  }
  const A = Ue(),
    n = DA(Math.min(o.stage, d0));
  if (A !== n) On(A, "Đủ cấp, đổi bãi luyện công");
  else {
    const t = ol(A);
    t !== o.stage && (o.stage = t);
  }
};

var og = function (A) {
  if (
    ((Zo -= A),
    Zo > 0 ||
      ((Zo = 1.5), o.mode !== "quest" || !o.fac || ht() || l.dg || l.tower || l.deadT > 0) ||
      l.sat)
  )
    return;
  l.town && en();
  const n = nA();
  if (
    (o.lvl >= kA && n.today >= Qe() && o.autoLdt !== !1 && N("misc", "ldt") > 0 && f2(!0),
    o.lvl >= kA && n.today < Qe())
  ) {
    ((n.auto = !0), n.task || je());
    const e = n.task;
    if (e) {
      if (ot(e)) {
        Gs(!0);
        return;
      }
      if ((e.t === "killm" || e.t === "elite" || e.t === "boss") && e.zi != null) {
        {
          const r = k0[e.zi] ? [k0[e.zi]].concat(Un[e.zi] || []) : null,
            c = r && r[e.za || 0];
          c
            ? ((e.zn = c.n),
              e.t === "killm" &&
                !c.m.includes(e.tid) &&
                (e.tid = C0(c.m.filter((d) => r0[d]).length ? c.m.filter((d) => r0[d]) : c.m)),
              e.t === "boss" && e.tid !== c.boss && (e.tid = c.boss))
            : ((e.zi = null), (e.t = "elite"));
        }
        const i = (o.zalt || {})[e.zi] || 0;
        DA(Math.min(o.stage, d0)) !== e.zi
          ? (((o.zalt || (o.zalt = {}))[e.zi] = e.za || 0), On(e.zi, `Dã Tẩu: ${ze(e)}`))
          : i !== (e.za || 0) &&
            ((o.zalt[e.zi] = e.za || 0),
            Jo(),
            (l.enemies = []),
            (l.corpses = []),
            (l.field = null),
            (l.zoneShown = null),
            C(`🗺 Dã Tẩu: tới <b>${D(e.zn)}</b>`));
        return;
      }
      const a = Ue();
      DA(Math.min(o.stage, d0)) !== a && On(a, `Dã Tẩu: ${ze(e)}`);
      return;
    }
  }
  if (N("misc", "lb") > 0 && o.lvl >= 20) {
    Ou(qc());
    return;
  }
  if (typeof Ve == "function" && Xo() && Ve() > 0 && y0()) {
    nl();
    return;
  }
  const t = Ue();
  DA(Math.min(o.stage, d0)) !== t && On(t, "Hết nhiệm vụ, luyện công");
};

var rg = function (A) {
  if ((o.mode || "farm") !== A) {
    if (
      ((o.mode = A),
      (l.dgSkip = {}),
      $(),
      l.dg && l.dg.kind !== "wb" && Qt(),
      l.tower && A !== "tower" && Cs(!1),
      l.town && en(),
      (l.dgPilotT = 0),
      (Zo = 0),
      (l.towerPilotT = 0),
      A === "quest")
    )
      C("📜 Chế độ <b>Nhiệm Vụ</b>: dịch chuyển tới bản đồ nhiệm vụ.");
    else if (A === "tower")
      wo(e2)
        ? (C(
            "🗼 Chế độ <b>Leo Tháp</b>: tự vào Thông Thiên Tháp, gục ngã thì chuyển về Luyện Công.",
          ),
          !l.tower && !l.dg && A2())
        : ((o.mode = "farm"), k(`Leo Tháp cần cấp ${e2}`));
    else if (A === "dg")
      (C("🏯 Chế độ <b>Phó Bản</b>: tự vào phó bản còn lượt."),
        qo() || k("Hết lượt phó bản hôm nay: luyện công"));
    else {
      C("⚔ Chế độ <b>Luyện Công</b>.");
      const n = o.autoMap === !1 ? DA(Math.min(o.stage, d0)) : Ue();
      On(n, "Luyện công");
    }
    V();
  }
};

var pk = function (A) {
  const n = o.mode === "quest",
    t = o.mode === "dg",
    e = nA(),
    a = e.task,
    i = l.dg
      ? l.dg.kind === "boat"
        ? "⛵ Đang đi thuyền Phong Lăng Độ"
        : `Trong ${l.dg.kind === "wb" ? "Boss tuần" : D(l.dg.d.n)}`
      : l.sat
        ? `🗡 Truy sát Sát Thủ cấp ${l.sat.tier}`
        : n
          ? o.lvl >= kA && e.today < Nc && a
            ? `📜 Dã Tẩu: ${D(ze(a))} ${jo(a)}`
            : "Hết nhiệm vụ: luyện công"
          : t
            ? qo()
              ? `🏯 Sắp vào ${D(qo().n)}`
              : "🏯 Hết lượt phó bản: luyện công"
            : "";
  return `<div class="card modec">
    <div><b>${D(A.n)}</b> <small class="dim">bản đồ cấp ${A.lo}–${A.hi} · quái cấp ~${De(o.stage)} · trùm hồi sinh ${Kd / 60} phút</small></div>
    ${i ? `<div class="small cp">${i}</div>` : ""}
    ${n ? "" : `<label class="small"><input type="checkbox" id="cAutoMap" ${o.autoMap === !1 ? "" : "checked"}> Tự đổi bãi luyện công khi lên cấp</label>`}</div>`;
};

var cg = function () {
  let A = m("#modeSw");
  (A ||
    ((A = document.createElement("div")),
    (A.id = "modeSw"),
    (A.innerHTML = `<button id="mswBtn"></button><div id="mswMenu" class="hidden">${cl.map((t) => `<button data-msw="${t[0]}" title="${t[3]}">${t[1]} ${t[2]}</button>`).join("")}</div>`),
    m("#battle").appendChild(A),
    (m("#mswBtn").onclick = (t) => {
      (t.stopPropagation(), m("#mswMenu").classList.toggle("hidden"));
    }),
    A.querySelectorAll("[data-msw]").forEach(
      (t) =>
        (t.onclick = (e) => {
          (e.stopPropagation(), m("#mswMenu").classList.add("hidden"), rg(t.dataset.msw));
        }),
    ),
    document.addEventListener("pointerdown", (t) => {
      A.contains(t.target) || m("#mswMenu").classList.add("hidden");
    })),
    A.classList.toggle("hidden", !o.fac));
  const n = dg();
  ((m("#mswBtn").innerHTML = `Chế Độ: <b>${n[1]} ${n[2]}</b> ▴`),
    A.querySelectorAll("[data-msw]").forEach((t) =>
      t.classList.toggle("on", t.dataset.msw === n[0]),
    ));
};

var Dk = function () {
  document.querySelectorAll("[data-mode]").forEach((n) => (n.onclick = () => rg(n.dataset.mode)));
  const A = m("#cAutoMap");
  A &&
    (A.onchange = () => {
      ((o.autoMap = A.checked), A.checked && Xe(), $(), V());
    });
};

var lg = 3;

var rl = (s) => s * Kn + 1;

var Pk = () => (v0() ? Q2 : o.lvl);

var Wo = (s) => !!k0[s] && (k0[s].lo <= Pk() + 3 || o.maxStage >= rl(s));

var vk = (s) => {
  const A = k0.findIndex((n) => s <= n.hi);
  return A < 0 ? k0.length - 1 : A;
};

var bk = () => (l.round || 0) % lg === lg - 1;

var Zo = 0;

var cl = [
  ["farm", "⚔", "Luyện Công", "Dịch chuyển tới bãi luyện công hợp cấp"],
  [
    "dg",
    "🏯",
    "Phó Bản",
    "Dịch chuyển vào phó bản cao nhất còn lượt, lần lượt đi hết; hết lượt thì luyện công",
  ],
  [
    "quest",
    "📜",
    "Nhiệm Vụ",
    "Dịch chuyển tới bản đồ nhiệm vụ: Dã Tẩu, Sát Thủ, đi thuyền; xong thì luyện công",
  ],
  [
    "tower",
    "🗼",
    "Leo Tháp",
    "Vào Thông Thiên Tháp leo liên tục từ tầng (kỷ lục − 4); gục ngã thì tự chuyển về Luyện Công",
  ],
];

var dg = () => cl.find((s) => s[0] === (o.mode || "farm")) || cl[0];

var ll = function s() {
  const A = Ar(),
    n = Object.keys(S0().ore).reduce((c, d) => c + N("ore", d), 0),
    t = Object.keys(S0().ht).reduce((c, d) => c + N("ht", d), 0),
    e = o.inv
      .concat(a0(), Object.values(o.eq))
      .filter((c) => c && typeof Re == "function" && Re(c)).length,
    a = Object.keys(S0().shard).filter((c) => NA[c] && N("shard", c) >= NA[c]).length,
    i = Object.values(o.eq)
      .filter((c) => c && we(c))
      .concat(o.inv.filter(we))
      .filter((c) => !Ea(c)).length,
    r = un.map(([c]) => o.eq[c]).filter(Boolean);
  ((m("#t-forge").innerHTML = `
    <div class="card fcard"><div class="fic"><img src="img/ep/ht.png" alt=""></div><div><b>💎 Lò Ép Đồ</b> <small class="dim">tinh luyện Huyền Tinh · lấy thuộc tính · chế tạo phôi · khảm nạm đồ Tím</small>
      ${
        y0()
          ? `<div class="small">Huyền Tinh <b>${t}</b> · đá thuộc tính <b>${n}</b> · phôi <b>${e}</b> · Kho Rèn <b>${a0().length}</b>/${w1}${A.ench ? ' · <span class="cp">có thể khảm</span>' : ""}${A.up ? ' · <span class="cp">thăng cấp được</span>' : ""}</div>
      <div class="btnrow"><button class="btn sm" data-ep="kham">Khảm nạm</button><button class="btn sm" data-ep="hut">Lấy thuộc tính</button><button class="btn sm" data-ep="phoi">Chế phôi</button><button class="btn sm" data-ep="tl">Tinh luyện</button><button class="btn sm" data-ep="box">Kho Rèn</button></div>`
          : ""
      }</div></div>
    <div class="card fcard"><div class="fic"><img src="img/ep/mys.png" alt=""></div><div><b>🔥 Lò Hoàng Kim</b> <small class="dim">ghép mảnh Hoàng Kim (Bộ chung · Môn phái)</small>
      <div class="small">Mảnh đủ ghép <b>${a}</b> · Thủy Tinh Trắng ${N("misc", "wc")} · Thần Bí Khoáng Thạch ${N("misc", "mys")}</div>
      <div class="btnrow"><button class="btn" id="fgHt">Mở Lò Hoàng Kim</button></div></div></div>
    <div class="card"><b>⚒ Cường hóa</b> <small class="dim">+1…+${ut}, mỗi cấp +${Math.round(Ei * 100)}% thuộc tính gốc, +${Math.round(Si * 100)}% các dòng thuộc tính · chạm món đang mặc để rèn riêng (cường hóa, tẩy luyện)</small>
      <div class="invgrid">${r.map((c) => W1(c).replace("</button>", `${c.enh ? `<em class="fenh">+${c.enh}</em>` : ""}</button>`)).join("")}</div></div>
    <div class="card"><label><input type="checkbox" id="fgFuse" ${o.autoFuse === !1 ? "" : "checked"}> 💎 Tự hợp Huyền Tinh từ nhẫn / dây chuyền / ngọc bội thừa (3 món → 1 Huyền Tinh, ${q(d1())} lượng; mỗi 30 giây)</label>
      <div class="dim small">Trang sức thừa có ${Gt().length} món. Không dùng đồ đang mặc, đồ khóa 🔒, đồ tốt hơn đồ đang mặc.</div>
      <label><input type="checkbox" id="fgAuto" ${o.autoForge ? "checked" : ""}> Tự động rèn đồ (ghép mảnh Hoàng Kim, khảm Tím, thăng cấp Huyền Tinh; mỗi 30 giây)</label></div>`),
    document
      .querySelectorAll("#t-forge [data-ep]")
      .forEach((c) => (c.onclick = () => Ke(c.dataset.ep))),
    (m("#fgHt").onclick = () => Qo()),
    (m("#fgFuse").onchange = (c) => {
      ((o.autoFuse = c.target.checked), o.autoFuse && (p2(), s()), $());
    }),
    (m("#fgAuto").onchange = (c) => {
      ((o.autoForge = c.target.checked), o.autoForge && dl(), $());
    }),
    document.querySelectorAll("#t-forge .invgrid [data-uid]").forEach(
      (c) =>
        (c.onclick = () => {
          const d = Object.values(o.eq).find((f) => f && f.uid === +c.dataset.uid);
          d && g2(d);
        }),
    ));
};

var Us = function (A) {
  o.fac && (A && (eA = A), n0(!0), fA("quest"));
};

var m2 = function s() {
  const A = [
    ["dt", "📜 Dã Tẩu"],
    ["boat", `⛵ Đi thuyền${Vs() ? " ●" : ""}`],
    ["st", "🗡 Sát Thủ"],
    ["act", "Hoạt động"],
  ];
  let n = "";
  (eA === "dt"
    ? (n = By())
    : eA === "st"
      ? (n = Ty())
      : eA === "boat"
        ? (n = tl())
        : (n = `<div class="card"><div class="btnrow">${[
            ["dg", "Phó bản"],
            ["tower", "Tháp thử thách"],
            ["wb", "Boss tuần"],
            ["horse", "Mã trường"],
            ["pet", "Đồng hành"],
          ]
            .map(([e, a]) => `<button class="btn" data-act="${e}">${a}</button>`)
            .join("")}</div>
      <div class="btnrow"><button class="btn" id="qGift">🎁 Phần thưởng: điểm danh · mốc cấp · Phúc Duyên · sự kiện · thành tựu</button></div></div>`),
    (m("#t-quest").innerHTML =
      `<div class="dtabs">${A.map(([e, a]) => `<button data-qt="${e}" class="${eA === e ? "on" : ""}">${a}</button>`).join("")}</div>${n}`),
    document.querySelectorAll("#t-quest [data-qt]").forEach(
      (e) =>
        (e.onclick = () => {
          ((eA = e.dataset.qt), s());
        }),
    ),
    eA === "dt" && _y(),
    eA === "boat" && el(m("#t-quest")),
    eA === "st" &&
      document.querySelectorAll("#t-quest [data-st]").forEach(
        (e) =>
          (e.onclick = () => {
            (Ou(+e.dataset.st), s());
          }),
      ),
    document
      .querySelectorAll("#t-quest [data-act]")
      .forEach((e) => (e.onclick = () => N1(e.dataset.act))));
  const t = m("#qGift");
  t && (t.onclick = () => Ce(!0));
};

var eA = "dt";

var yk = () =>
  !!o.fac && !ht() && typeof nA == "function" && nA().task && ot(nA().task) && !nA().auto;

var kk = () => {
  if (!o.fac) return !1;
  const s = Ar();
  return !o.autoForge && s.shard + s.ench + s.up > 0;
};

var w2 = function () {
  const A = Object.values(o.eq).filter(Boolean),
    n = A.concat(o.inv, a0()),
    t = (e) => {
      const a = A.find((i) => i.d === e.d);
      return !a || (!a.set && e.lvl >= a.lvl) ? 1 : 0;
    };
  return n
    .filter(
      (e) =>
        !e.set &&
        e.d >= 0 &&
        e.d <= 9 &&
        e.vio &&
        (e.mag || []).length < Y1(e) &&
        (A.includes(e) || p0(e)),
    )
    .sort(
      (e, a) =>
        A.includes(a) - A.includes(e) ||
        t(a) - t(e) ||
        a.mag.length - e.mag.length ||
        a.lvl - e.lvl,
    );
};

var fg = function () {
  const A = Object.keys(S0().ht)
      .map(Number)
      .sort((t, e) => e - t),
    n = Object.keys(S0().ore);
  if (!A.length || !n.length) return null;
  for (const t of w2()) {
    const e = t.mag.length;
    for (const a of n)
      if (IA(a).place === e) {
        for (const i of A) if (typeof s9(t, i, a) != "string") return { it: t, ht: i, key: a };
      }
  }
  return null;
};

var p2 = function (A) {
  if (!o || !o.fac || o.autoFuse === !1 || !y0()) return 0;
  let n = 0;
  const t = {};
  for (let e = 0; e < $k; e++) {
    const a = Oa(Gt());
    if (a.length < 3 || o.gold < d1() * 2) break;
    const i = u3(a);
    if (!i.ok) break;
    (n++, (t[i.lvl] = (t[i.lvl] || 0) + 1));
  }
  return (
    n &&
      ((l.dirty = !0),
      (R = !0),
      A ||
        C(
          `<span class="dim">💎 Tự hợp ${n} Huyền Tinh từ trang sức (${Object.entries(t)
            .map(([e, a]) => `${a} viên cấp ${e}`)
            .join(", ")}).</span>`,
        )),
    n
  );
};

var Gt = function () {
  return o.inv
    .concat(typeof a0 == "function" ? a0() : [])
    .filter(e8)
    .filter((A) => !FA(A) && !tA(A))
    .sort((A, n) => K0(A) - K0(n));
};

var xk = function () {
  if (w2().length || o.gold < wA.phoi * 3) return !1;
  const A = Object.keys(S0().ht)
    .map(Number)
    .filter((t) => N("ht", t) > 0)
    .sort((t, e) => e - t);
  if (!A.length) return !1;
  const n = I[o.fac];
  for (const t of Object.values(o.eq)
    .filter((e) => e && !e.vio && !e.set && e.d >= 0 && e.d <= 9)
    .sort((e, a) => K0(e) - K0(a))) {
    const e = o.inv
      .concat(a0())
      .filter(
        (i) =>
          i.d === t.d &&
          (i.d > 1 || i.k === t.k) &&
          i.lvl >= t.lvl &&
          !i.set &&
          !i.vio &&
          !i.lock &&
          !i.thanma &&
          (i.r || 0) <= 2 &&
          !tA(i) &&
          p0(i) &&
          !(rA[i.d] === "weapon" && !o1(i)),
      )
      .sort((i, r) => r.lvl - i.lvl)[0];
    if (!e) continue;
    if (!o.inv.includes(e)) {
      if (o.inv.length >= INV_MAX) continue;
      (A1(e), o.inv.push(e));
    }
    if (td(e, A[0]).ok) return ((R = !0), !0);
  }
  return !1;
};

var dl = function () {
  return null;
};

var Bk = function () {
  const A = I[o.fac];
  let n = 0;
  for (const t of o.inv.concat(o.eq.weapon ? [o.eq.weapon] : []))
    t.d <= 1 &&
      mn(t) &&
      (t.req || []).every(([e, a]) => e !== 36 || o.lvl >= a) &&
      o1(t) &&
      (n = Math.max(n, Da(t)));
  return n;
};

var hg = function () {
  const A = I[o.fac];
  if (!A || o.autoBuy === !1 || A.wcode < 0 || !S.shops.weapon || o.inv.length >= INV_MAX)
    return null;
  const n = Bk();
  let t = null;
  for (const a of S.shops.weapon.items) {
    if (a.g === 1) continue;
    const i = ec(a);
    if (!i || i.d > 1 || !o1(i) || !mn(i)) continue;
    const r = io(a),
      c = Da(i);
    if (
      r > o.gold * Ck ||
      c < n * Tk ||
      (i.req.find((h) => h[0] === 36) || [0, 0])[1] > GA() ||
      (i.req || []).some(([h, g]) => (h === 37 || h === 39) && g >= 0 && !p0(i))
    )
      continue;
    const f = Object.values(bt(i)).reduce((h, g) => h + g, 0);
    (f > 0 && !(o.autoPts === !0 && f <= o.attrPts + z2 * U5)) ||
      ((!t || c > t.dmg) && (t = { g: a, dmg: c, price: r, need: f }));
  }
  if (!t) return null;
  const e = _A(t.g.d, t.g.k, t.g.lvl, 0);
  return e
    ? ((e.s = ac(t.g, e)),
      (o.gold -= t.price),
      xn(e, !0, !0, !0),
      C(`<span class="dim">Tự mua <b>${D(e.n)}</b> ở Biện Kinh (${q(t.price)} lượng).</span>`),
      o.autoPts === !0 && yt(),
      Bn(),
      (l.dirty = !0),
      (R = !0),
      e)
    : null;
};

var fl = function () {
  const A = o.autoHut || (o.autoHut = ug()),
    n = ug();
  for (const t in n) A[t] === void 0 && (A[t] = n[t]);
  return A;
};

var _k = function () {
  return (typeof w2 == "function" ? w2() : [])
    .slice(0, 3)
    .map((A) => ({
      place: (A.mag || []).length,
      s: A.s,
      d: A.d,
      k: A.k,
      attrs: new Set((A.mag || []).map((n) => n.a)),
    }));
};

var Mk = function (A, n, t) {
  let e = null;
  for (let a = 0; a < (A.mag || []).length; a++) {
    const i = A.mag[a];
    if (!a8(A, a)) continue;
    const r = pd(A, a)[0],
      c = B3(i),
      d = r % 2 ? A.s : -1,
      f = t.some(
        (g) =>
          g.place === r &&
          (d < 0 || d === g.s) &&
          !g.attrs.has(i.a) &&
          cs(i.a, g.d, g.k) &&
          de(i.a, g.s),
      );
    if ((!f && c < n.minLv) || (N("ore", Ia(r, i.a, c, d)) >= n.cap && !f)) continue;
    const h = (f ? 1e3 : 0) + c * 10 + (r % 2 ? 1 : 0);
    (!e || h > e.score) && (e = { i: a, place: r, need: f, lvl: c, score: h });
  }
  return e;
};

var Hk = function (A, n) {
  const t = Object.keys(S0().ht)
    .map(Number)
    .filter((e) => e <= n.htMax && N("ht", e) > 0)
    .sort((e, a) => e - a);
  if (!t.length) return 0;
  if (A) {
    const e = t.filter((a) => a >= 5);
    if (e.length) return e[0];
  }
  return t[0];
};

var Xs = function (A = 10) {
  if (!y0() || l.dg) return 0;
  const n = fl();
  if (!n.on) return 0;
  const t = _k(),
    e = a0()
      .concat(o.inv)
      .filter((g) => wd(g) && !g.lock && !(typeof tA == "function" && tA(g)) && !mA(g));
  let a = 0,
    i = 0,
    r = 0,
    c = 0,
    d = 0;
  const f = [],
    h = {};
  for (const g of e) {
    if (a >= A || o.gold < n.reserve + x3(g)) break;
    const u = Mk(g, n, t);
    if (!u) {
      if (a0().includes(g) && (g.r === 1 || g.r === 2)) {
        const p = x0(g);
        (A1(g), (o.gold += p), (d += p), c++);
      }
      continue;
    }
    const w = Hk(u.need, n);
    if (!w) break;
    const x = nd(g, u.i, u.place, w, { wc: 0, mys: 0, fd: 0 });
    if ((a++, (h[w] = (h[w] || 0) + 1), x.ok))
      (i++, f.push(x.msg.replace(/^Lấy thuộc tính: /, "") + ` (dòng ${u.place + 1})`));
    else if (x.lost) r++;
    else break;
  }
  if (a || c) {
    const g = Object.entries(h)
      .map(([u, w]) => `${w} Huyền Tinh c${u}`)
      .join(", ");
    (C(
      `⚗ Tự rút ${a} món: ${i} đá${f.length ? ` (${f.slice(0, 4).join("; ")}${f.length > 4 ? "…" : ""})` : ""}${r ? `, ${r} thất bại` : ""}${g ? ` · −${g}` : ""}${c ? ` · bán ${c} món không có dòng tốt (+${q(d)} lượng)` : ""}`,
    ),
      (R = !0),
      (l.dirty = !0),
      $());
  }
  return a;
};

var hl = { fuse: 5, ench: 6, up: 8 };

var Ar = () => ({
  shard: Object.keys(S0().shard).filter((s) => NA[s] && N("shard", s) >= NA[s]).length,
  up: Object.keys(S0().ht)
    .map(Number)
    .filter((s) => s < MA && N("ht", s) >= 3).length,
  ench: fg() ? 1 : 0,
  fuse: Oa(Gt()).length === 3 && o.gold >= d1() * 2 ? 1 : 0,
});

var $k = 10;

var Tk = 1.25;

var Ck = 0.6;

var ug = () => ({ on: !1, minLv: 3, htMax: 4, cap: 3, reserve: 5e4 });

var gg = function s(A = 0) {
  const n = ul[A];
  if (!n) {
    ((o.tut = 1), n0(!0), $());
    return;
  }
  (n[2] && PA !== n[2] && o.fac && fA(n[2]),
    J(
      `<h3>${D(n[0])} <small>${A + 1}/${ul.length}</small></h3><p class="desc">${D(n[1]).replace(/\n/g, "<br>")}</p>
    <div class="btnrow">${A > 0 ? '<button class="btn" id="tPrev">Trước</button>' : ""}<button class="btn" id="tNext">${A === ul.length - 1 ? "Bắt đầu chơi" : "Tiếp"}</button><button class="btn" id="tSkip">Bỏ qua</button></div>`,
      () => {
        const t = m("#tPrev");
        (t && (t.onclick = () => s(A - 1)),
          (m("#tNext").onclick = () => s(A + 1)),
          (m("#tSkip").onclick = () => {
            ((o.tut = 1), n0(!0), $());
          }));
      },
    ),
    (o.tut = 1));
};

var nr = function (A) {
  if (!o || !o.fac || l.quiet) return;
  const n = o.hints || (o.hints = {});
  n[A] || !gl[A] || ((n[A] = 1), k(gl[A]), C(`<span class="dim">Gợi ý: ${D(gl[A])}</span>`));
};

var mg = function () {
  !o ||
    !o.fac ||
    (o.attrPts > 0 && o.lvl >= 2
      ? nr("pts")
      : o.skPts > 0 && I[o.fac].skills.some((A) => Q1(T[A]))
        ? nr("skill")
        : Object.keys(S0().ht).length || Object.keys(S0().ore).length
          ? nr("forge")
          : o.inv.length >= INV_MAX - 5 && nr("full"));
};

var wg = function () {
  const A = [];
  if (!o || !o.fac) return A;
  (ht() &&
    A.push({
      k: "join",
      t: o.lvl >= KA ? "⚑ Gia nhập môn phái" : `Cấp ${KA}: gia nhập môn phái`,
      go: () => U8(),
    }),
    o.attrPts > 0 && A.push({ k: "attr", t: `${o.attrPts} điểm tiềm năng`, go: () => fA("char") }),
    o.skPts > 0 &&
      I[o.fac].skills.some((a) => Q1(T[a])) &&
      A.push({ k: "skill", t: `${o.skPts} điểm kỹ năng`, go: () => fA("skill") }));
  const n = o.inv.filter((a) => FA(a)).length;
  (n && A.push({ k: "gear", t: `${n} món mạnh hơn đồ đang mặc`, go: () => fA("inv") }),
    typeof Sc == "function" &&
      Sc() &&
      A.push({ k: "wb", t: "Rương Boss tuần chờ nhận", go: () => N1("wb") }),
    Ey(A),
    o.fac &&
      typeof OA == "function" &&
      !OA() &&
      A.push({ k: "name", t: "✏ Đặt tên nhân vật", go: () => Aa() }),
    kh() && A.push({ k: "gift", t: "Có quà chờ nhận", go: () => Ce(!0) }));
  const t = Ar();
  return (
    t.shard + t.up + t.ench + t.fuse &&
      !o.autoForge &&
      A.push({
        k: "forge",
        t: `Rèn đồ: ${[t.shard && "ghép mảnh", t.ench && "khảm", t.fuse && "hợp Huyền Tinh", t.up && "thăng cấp"].filter(Boolean).join(", ")}`,
        go: () => (t.ench || t.fuse || t.up ? Ke(t.ench ? "kham" : "tl") : Qo()),
      }),
    o.inv.length >= INV_MAX - 3 &&
      A.push({ k: "full", t: "Hành trang gần đầy", go: () => fA("inv") }),
    o.lvl >= 5 &&
      !(typeof h0 == "function" && h0()) &&
      Date.now() - (o.bakAt || 0) > 7 * 864e5 &&
      A.push({ k: "bak", t: "Nên tải file sao lưu", go: () => fA("more") }),
    A
  );
};

var Ok = function () {
  const A = wg();
  return A.length
    ? `<div class="todo" id="todoBox"><b>Việc cần làm</b>${A.map((n, t) => `<button class="chip2 todochip" data-i="${t}">${D(n.t)}</button>`).join("")}</div>`
    : "";
};

var Ek = function () {
  const A = wg();
  document.querySelectorAll("#todoBox .todochip").forEach(
    (n) =>
      (n.onclick = () => {
        const t = A[+n.dataset.i];
        t && t.go();
      }),
  );
};

var Sk = function () {
  const A = l.P,
    n = o.lvl,
    t = 8 + 3.2 * n,
    e = 30 + 9 * n,
    a = A.main,
    i = a.useAR ? Pe(A.ar, t, a.ignore) / 100 : 1,
    r = 1 - Pe(e, A.def) / 100,
    c = Q0.reduce((u, w) => u + A.res[w], 0) / Q0.length,
    d = {
      power: G0(A),
      dps: a.dps * i,
      hit: i,
      dodge: r,
      avgRes: c,
      ehp: A.life / Math.max(0.2, 1 - c / 100) / Math.max(0.3, 1 - r),
      main: a.n,
    },
    f = G0(j0(o.eq)),
    h = [];
  for (const [u, w] of un) {
    const x = o.eq[u];
    if (!x) continue;
    const p = Object.assign({}, o.eq);
    (delete p[u], h.push({ n: w, name: x.n, v: f / Math.max(1, G0(j0(p))) - 1 }));
  }
  const g = [];
  for (const u of Object.keys(nn)) {
    const w = o.attr[u];
    if (!w) continue;
    o.attr[u] = 0;
    let x;
    try {
      x = G0(j0(o.eq));
    } finally {
      o.attr[u] = w;
    }
    g.push({ n: nn[u], pts: w, v: f / Math.max(1, x) - 1 });
  }
  return { info: d, slots: h.sort((u, w) => w.v - u.v), attrs: g.sort((u, w) => w.v - u.v) };
};

var kM = function () {
  const A = Sk(),
    n = A.info,
    t = (a) => (a * 100).toFixed(1) + "%",
    e = (a, i, r) =>
      `<span>${D(a)}${r ? ` <small class="dim">${D(r)}</small>` : ""}</span><span class="${i > 5e-4 ? "cp" : "dim"}">${i > 0 ? "+" : ""}${t(i)}</span>`;
  J(`<h3>Lực chiến ${F(l.power)}</h3>
    <p class="desc">Lực chiến = DPS thực tế<sup>0,7</sup> × máu hiệu dụng<sup>0,3</sup>, tính so với quái cùng cấp (${o.lvl}), rồi quy đổi theo môn phái để cùng cấp, chưa mặc đồ thì các phái ngang nhau. Mỗi dòng dưới đây là mức lực chiến sẽ <b>mất</b> nếu bỏ đi thành phần đó.</p>
    <div class="card stats"><span>Chiêu chính</span><span>${D(n.main)}</span><span>DPS thực tế</span><span>${F(n.dps)}</span><span>Tỉ lệ trúng quái cùng cấp</span><span>${Math.round(n.hit * 100)}%</span>
      <span>Máu hiệu dụng</span><span>${F(n.ehp)}</span><span>Kháng trung bình</span><span>${Math.round(n.avgRes)}%</span><span>Quái bị né</span><span>${Math.round(n.dodge * 100)}%</span></div>
    <h3>Từ trang bị</h3><div class="card stats">${A.slots.map((a) => e(a.n, a.v, a.name)).join("") || '<span class="dim">Chưa mặc gì</span>'}</div>
    <h3>Từ điểm tiềm năng đã cộng</h3><div class="card stats">${A.attrs.map((a) => e(a.n, a.v, a.pts + " điểm")).join("") || '<span class="dim">Chưa cộng điểm</span>'}</div>`);
};

var Ik = function () {
  return {
    sk: Object.assign({}, o.sk),
    skPts: o.skPts,
    attr: Object.assign({}, o.attr),
    attrPts: o.attrPts,
    main: o.main,
    mainLock: o.mainLock,
  };
};

var pg = function (A) {
  ((o.sk = Object.assign({}, A.sk)),
    (o.skPts = A.skPts),
    (o.attr = Object.assign({}, A.attr)),
    (o.attrPts = A.attrPts),
    (o.main = A.main),
    (o.mainLock = A.mainLock),
    (l.dirty = !0),
    D0());
};

var Dg = function () {
  let A = j5();
  for (; o.attrPts > 0;) {
    const n = G0(j0());
    let t = "vit",
      e = -1 / 0;
    for (const a of ["str", "dex", "vit", "eng"]) {
      o.attr[a]++;
      const i = G0(j0()) - n;
      (o.attr[a]--, i > e && ((e = i), (t = a)));
    }
    (o.attr[t]++, o.attrPts--, A++);
  }
  return (A && (l.dirty = !0), A);
};
