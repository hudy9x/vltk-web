// core/game-loop — shared IIFE scope; order is defined in modules.json.
var l_ = function (A, n) {
  const t = l.traps || (l.traps = []);
  for (; t.length >= f_;) t.shift();
  const e = typeof A0 < "u" && A0.f && A0.f[A.id],
    a = n || v;
  t.push({
    a: A,
    x: a.x + Z(-6, 6),
    y: a.y + Z(-4, 4),
    t: 0,
    life: m_[A.id] || 30,
    c: e ? e.c : 0,
  });
};

var d_ = function (A) {
  if (l.quiet || !l.fx || typeof A0 > "u") return;
  const n = A0.m[A.c + 1] || A0.m[A.c],
    t = n && (n.hit || n.fly);
  t && l.fx.push({ k: "boom", s: t, x: A.x, y: A.y, t: 0, life: yn(t), dir: 0 });
};

var Lm = function (A) {
  const n = l.traps;
  if (!n || !n.length) return;
  if (l.town) {
    n.length = 0;
    return;
  }
  const t = _1(),
    e = [],
    a = [];
  for (const i of n)
    if (((i.t += A), !(i.t >= i.life))) {
      if (i.t >= zm && t.some((r) => q0(i, r) <= h_ + r.r / QA)) {
        a.push(i);
        continue;
      }
      e.push(i);
    }
  l.traps = e;
  for (const i of a) {
    for (const r of t) r.hp > 0 && q0(i, r) <= u_ + r.r / QA && Ls(hs(i.a, r), i.a);
    d_(i);
  }
};

var qm = function (A, n) {
  const t = l.traps;
  if (!(!t || !t.length || l.town || typeof A0 > "u")) {
    for (const e of t) {
      const a = A0.m[e.c],
        i = a && a.fly,
        r = e.life - e.t < 2 ? E((e.life - e.t) / 2, 0.2, 1) : 1;
      ((A.globalAlpha = r * (e.t < zm ? 0.5 : 0.9)),
        (i && Fa(i, 0, e.t, e.x, e.y, !0)) ||
          ((A.strokeStyle = "#ffb347"),
          (A.lineWidth = 1.5),
          A.beginPath(),
          A.ellipse(e.x, e.y, 12, 5, 0, 0, 7),
          A.stroke()));
    }
    A.globalAlpha = 1;
  }
};

var jm = function (A, n) {
  return w_(A)
    ? skillCastDistance(v, n) - n.r / QA > g_
      ? ((l.moveTo = (hA() && l.clickHold) || ($1() && !(hA() && l.manTgt === n)) ? null : n), 0.05)
      : ((l.moveTo = null),
        (l.tgtHitT = l.clock || 0),
        (l.tgtD = 0),
        o4(A),
        typeof Y !== "undefined" && Y.stopAfterCast(),
        A.cd && ((l.skCd = l.skCd || {})[A.id] = (l.clock || 0) + A.cd),
        l.rotNext != null && ((l.rotI = l.rotNext), (l.rotNext = null)),
        l_(A, n),
        (v.face = n.x >= v.x ? 1 : -1),
        (v.dir = kn(n.x - v.x, n.y - v.y)),
        (v.act = "at"),
        (v.actT = 0),
        G8(A.id),
        1 / A.rate)
    : 0;
};

var f_ = 5;

var zm = 0.4;

var h_ = 36;

var u_ = 64;

var g_ = 240;

var m_ = { 351: 60 };

var w_ = (s) => !!s && !!s.id && typeof T < "u" && te(T[s.id]);

var Pi = function () {
  if (!s1)
    try {
      s1 = JSON.parse(localStorage.getItem(Um) || "{}") || {};
    } catch {
      s1 = {};
    }
  return (
    (s1.fs = Number.isInteger(s1.fs) && s1.fs >= 0 && s1.fs < l5.length ? s1.fs : 1),
    (s1.saver = !!s1.saver),
    (s1.compact = !!s1.compact),
    s1
  );
};

var s5 = function () {
  const A = document.querySelector("meta[name=viewport]");
  if (!A) return;
  const n = navigator.maxTouchPoints > 0 || "ontouchstart" in window,
    t = Math.min(screen.width, screen.height),
    e = matchMedia("(orientation: portrait)").matches,
    a =
      n && e && t >= 600
        ? "width=480, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content"
        : "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content";
  A.content !== a && (A.content = a);
};

var Qm = function () {
  const A = Pi();
  (document.documentElement.style.setProperty("--fs", l5[A.fs]),
    document.body.classList.toggle("saver", A.saver),
    document.body.classList.toggle("compact", A.compact));
};

var i5 = function (A) {
  Object.assign(Pi(), A);
  try {
    localStorage.setItem(Um, JSON.stringify(s1));
  } catch {}
  (Qm(), vi());
};

var Gn = function (A) {
  ((l.traps = []), (l.unvoid = 1), (l.unvoidT = null), ma(A.id), ([v.x, v.y] = X0(v.x, v.y)));
  for (const n of l.enemies) [n.x, n.y] = X0(n.x, n.y);
  for (const n of l.ground) [n.x, n.y] = X0(n.x, n.y);
  (M1(), (l.bgImg = A.bg ? bA(A.bg) : null), _e(A.id), Tf(A), PA === "log" && V());
};

var Ut = function () {
  PA === "log" && V();
};

var Gm = function () {
  (o.lvl === pa && !v0() && C("🌱 Đạt cấp " + pa + ": hết <b>Hỗ Trợ Tân Thủ</b>."),
    typeof Xe == "function" && Xe(),
    ht() &&
      o.lvl >= KA &&
      !l.quiet &&
      (k("Đạt cấp " + KA + ": gia nhập môn phái!"),
      m("#modal").classList.contains("hidden") && U8()),
    o.autoPts === !0 && (yt(), Pt()),
    Bn(),
    l.quiet ||
      (mg(),
      _s(),
      qA(),
      tt(),
      hc.some((A) => A[0] === o.lvl) && k(`Đạt mốc cấp ${o.lvl}: nhận quà ở nút 🎁`)));
};

var Km = function () {
  return [v, l.petPos].concat(l.enemies).filter(Boolean);
};

var p_ = function (A) {
  N2 += A;
  let n = 0;
  for (; N2 >= Lr && n < Xm;) {
    for (const t of Km()) ((t._px = t.x), (t._py = t.y));
    (Td(Lr), (N2 -= Lr), n++);
  }
  n === Xm && (N2 = 0);
};

var D_ = function (A) {
  const n = N2 / Lr,
    t = Km().filter((e) => e._px !== void 0 && Math.hypot(e.x - e._px, e.y - e._py) < __);
  for (const e of t)
    ((e._cx = e.x),
      (e._cy = e.y),
      (e.x = e._px + (e.x - e._px) * n),
      (e.y = e._py + (e.y - e._py) * n));
  try {
    NP(A);
  } finally {
    for (const e of t) ((e.x = e._cx), (e.y = e._cy));
  }
};

var ra = function (A, n) {
  try {
    (n(), (bi = Math.max(0, bi - 0.02)));
  } catch (t) {
    bi++;
    const e = A + ": " + (t && t.message);
    (e !== Jm && ((Jm = e), console.error("[loi vong lap]", A, t)),
      bi > 30 &&
        ((bi = 0),
        (l.fx = []),
        (l.txt = []),
        (l.enemies = []),
        (l.spawnT = 0.5),
        (l.deadT = 0),
        (N2 = 0),
        (l.quiet = !1),
        n0(!0)));
  }
};

var P_ = function s(A) {
  Wm = Date.now();
  const n = Math.min(0.25, (A - o5) / 1e3);
  ((o5 = A),
    ra("tay cam", zv),
    o.fac &&
      !document.hidden &&
      !window.NET_GATE &&
      !i0.blocked &&
      (ra("mo phong", () => p_(n)), (!Pi().saver || (Vm = !Vm)) && ra("ve", () => D_(n))),
    (c5 += n),
    c5 > 0.1 &&
      o.fac &&
      ((c5 = 0),
      ra("giao dien", () => {
        (Mv(),
          Kv(),
          l.logDirty && PA === "log" && ((l.logDirty = !1), kv()),
          R && (PA === "inv" || (typeof dn == "function" && dn())) && An());
      })),
    (r5 += n),
    r5 > 10 &&
      o.fac &&
      ra("luu", () => {
        ((r5 = 0), Rm());
      }),
    requestAnimationFrame(s));
};

var Rm = function () {
  (uo(), Mn(), tt(), yu());
  const A = l.activeT || 0;
  (A > 30 && (o.kps = l.kills / A), $());
};

var Ym = function () {
  if ((typeof Nr == "function" && Nr(), !o || !o.fac || window.NET_GATE || i0.blocked)) {
    ((yi = 0), (L2 = 0));
    return;
  }
  const A = Date.now(),
    n = document.hidden || A - Wm > 1500;
  if (yi) {
    const e = (A - yi) / 1e3;
    e > 0 && (n || e >= 2.5) && (L2 = Math.min(M_, L2 + e));
  }
  if (((yi = n ? A : 0), !(L2 > 0))) return;
  const t = Math.min(L2, 60);
  ((L2 -= t),
    ra("mo phong an", () => {
      const e = l.quiet;
      l.quiet = !0;
      try {
        fD(t, t > 5 ? 0.1 : 0.05);
      } finally {
        l.quiet = e;
      }
    }),
    (qr += t),
    qr >= 10 && ((qr = 0), ra("luu", Rm)));
};

var v_ = function (A) {
  if (!A) return;
  const n = Math.floor(A.secs / 3600),
    t = Math.floor((A.secs % 3600) / 60);
  J(
    `<h3>Chào mừng trở lại!</h3><p class="desc">Vắng mặt ${n ? n + " giờ " : ""}${t} phút, nhân vật vẫn luyện công tại ${D(AA(Math.min(o.stage, d0)).n)}.</p>
    <div class="card stats"><span>Quái bị hạ</span><span>${F(A.kills)}</span><span>Kinh nghiệm</span><span>${F(A.xp)}</span>
    <span>Ngân lượng</span><span>${q(A.gold)}</span><span>Cấp</span><span>${A.lv0} → ${A.lv1}</span><span>Vật phẩm</span><span>${A.got}${A.sold ? ` (+${A.sold} bán)` : ""}</span>
    ${A.bch ? `<span>Bạch Câu Hoàn</span><span>${Math.round(A.bch / 360) / 10} giờ × 100% (còn ${Math.round((o.bch || 0) / 360) / 10} giờ)</span>` : ""}<span>Rương tu luyện</span><span>${A.chests || 0} / 3 mốc (1 · 4 · 8 giờ)</span></div>
    ${A.chests ? '<p class="desc">Quà các mốc đã vào túi — xem nhật ký Giang hồ.</p>' : ""}
    <div class="btnrow"><button class="btn" id="offOk">Nhận</button></div>`,
    () => {
      m("#offOk").onclick = () => n0();
    },
  );
};

var vi = function () {
  document.body.classList.toggle("mob", zP());
  const A = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  (A > 0 && document.documentElement.style.setProperty("--app-h", Math.round(A) + "px"),
    lA && St());
};

var b_ = function (A) {
  if ((i5({ compact: A }), !A && o.fac && V(), typeof jn == "function"))
    try {
      jn();
    } catch {}
};

var y_ = function () {
  const A = oP();
  ((m0 = A.slot), A.menu && (o = I3()));
  const n = A.menu ? !1 : cP();
  (!A.menu && typeof Em == "function" && Em(),
    (lA = m("#arena")),
    (W = lA.getContext("2d")),
    m("#tabs").addEventListener("click", (a) => {
      if (a.target.closest("#tabRide")) {
        typeof ui == "function" && ui();
        return;
      }
      const i = a.target.closest("button[data-t]");
      if (i) {
        if (
          (i.dataset.t === "more" && typeof Vt < "u" && (Vt = "sys"),
          document.body.classList.contains("u2m") && i.dataset.t === PA && i.dataset.t !== "log")
        ) {
          fA("log");
          return;
        }
        fA(i.dataset.t);
      }
    }),
    (m("#mClose").onclick = () => n0()),
    (m("#giftBtn").onclick = () => {
      o.fac && (o0("click"), Ce(!0));
    }),
    (m("#actBtn").onclick = () => {
      o.fac && (o0("click"), Us("act"));
    }),
    (m("#modal").onclick = (a) => {
      a.target.id === "modal" && n0();
    }),
    window.addEventListener("resize", vi),
    window.addEventListener("orientationchange", vi),
    window.visualViewport && window.visualViewport.addEventListener("resize", vi),
    (m("#compactBtn").onclick = () => b_(!document.body.classList.contains("compact"))),
    Qm(),
    vi(),
    Rv());
  const t = () => {
    j8();
    const a = AA(Math.min(o.stage, d0));
    (Tf(a),
      c0.music && g1().music && c0.music.paused
        ? c0.music.play().catch(() => {})
        : !c0.music && o.fac && _e(l.town ? E0.town.id : a.id));
  };
  if (
    (document.addEventListener("pointerdown", t, !0),
    document.addEventListener("keydown", t, !0),
    St(),
    ([v.x, v.y] = X0(O0.w / 2, O0.h / 2)),
    M1(),
    up(),
    A.menu)
  )
    Ir();
  else if (o.fac) {
    try {
      sessionStorage.setItem("jxidle_in", String(m0));
    } catch {}
    if (
      (delete o.jxLook,
      delete o.lookFx,
      D0(),
      (l.life = l.P.life),
      (l.mana = l.P.mana),
      n && (D0(), v_(hP())),
      typeof ye < "u" &&
        ye > 1 &&
        C(`<b style="color:#ffd24a">🎉 Sự kiện toàn máy chủ: x${ye} kinh nghiệm!</b>`),
      fA("log"),
      C("Tiếp tục hành tẩu giang hồ…"),
      o.eqRebuildMsg)
    ) {
      const [a, i] = o.eqRebuildMsg;
      (C(
        `Đồ Hoàng Kim / Bạch Kim không còn trong game (theo bảng gốc VNG) — thu hồi <b>${a}</b> món, hoàn <b class="up">${q(i)}</b> lượng`,
      ),
        k(`Thu hồi ${a} món, hoàn ${q(i)} lượng`),
        delete o.eqRebuildMsg,
        $());
    }
    if (
      (o.phMsg &&
        (C(
          `<span class="bad">Đã xóa ${o.phMsg} ngựa Tím (ngựa không có bản Tím — đồ chỉnh sửa / hack).</span>`,
        ),
        delete o.phMsg),
      o.horseEnhCut &&
        (C(
          `<span class="bad">${o.horseEnhCut} ngựa đang cường hóa (ngựa không cường hóa được) đã về +0.</span>`,
        ),
        delete o.horseEnhCut),
      o.pjMsg &&
        (C(
          `<span class="bad">Đã xóa ${o.pjMsg} món trang sức Tím (dây chuyền / nhẫn / ngọc bội): loại đồ này không chế tạo được trong game.</span>`,
        ),
        delete o.pjMsg),
      o.banMsg &&
        (C(
          `Hoàng Kim biến thể ([Cực phẩm], [Hoàn Mỹ], [Tinh Xảo]…), Dương Thần và đồ sự kiện (Hắc Thần, Thương Khung, Long Tương…) đã xóa khỏi game: thu hồi <b>${o.banMsg}</b> món`,
        ),
        delete o.banMsg,
        $()),
      o.horseEnhBack &&
        (C(
          `Ngựa không còn cường hóa: ngựa đã cường hóa về +0, hoàn lại <b class="up">${q(o.horseEnhBack)}</b> lượng`,
        ),
        k(`Hoàn ${q(o.horseEnhBack)} lượng cường hóa ngựa`),
        delete o.horseEnhBack,
        $()),
      window.__tampered &&
        (C(
          '<span class="dim">Dữ liệu lưu không khớp chữ ký (đã chỉnh sửa ngoài game): dùng bản sao lưu gần nhất nếu có.</span>',
        ),
        k("Phát hiện chỉnh sửa file lưu")),
      uo(),
      tt(),
      yu(),
      typeof Xe == "function" && (ig(), o.mode !== "quest" && o.autoMap !== !1 && Xe()),
      o.resumeTower)
    ) {
      const a = o.resumeTower | 0;
      (delete o.resumeTower,
        setTimeout(() => {
          typeof A2 == "function" &&
            !l.dg &&
            !l.tower &&
            (A2(),
            l.tower &&
              a > 0 &&
              ((l.tower.floor = a),
              (l.banner = { t: 2, text: `${Hn.n} · tầng ${a}`, sub: "Tiếp tục sau khi cập nhật" })),
            C(`🗼 Cập nhật xong: vào lại Tháp tầng ${a}.`));
        }, 1200));
    }
    {
      let a = 0,
        i = 0;
      for (const r of o.inv.concat(Object.values(o.eq || {}), o.epBox || [])) {
        const c = l9(r);
        c && ((a += c), i++);
      }
      a &&
        ((l.dirty = !0),
        C(
          `Sửa ${i} món Tím bị trùng dòng: gỡ ${a} dòng từ dòng trùng đầu tiên trở đi, trả lại đá thuộc tính để khảm lại.`,
        ));
    }
    if (
      (window.HKMP_CONV &&
        window.HKMP_CONV.length &&
        (C(
          `Hoàng Kim Môn Phái chỉ còn các bộ theo cẩm nang JX1: đổi ${window.HKMP_CONV.length} món bộ đã bỏ (Thiên Quang, Kim Quang, HKMP cấp 120, đồ đôi / Vinh Diệu…) sang món cùng vị trí: ${window.HKMP_CONV.slice(0, 6).map(D).join(", ")}${window.HKMP_CONV.length > 6 ? "…" : ""}`,
        ),
        (window.HKMP_CONV = null),
        (l.dirty = !0)),
      window.GONE_CONV && window.GONE_CONV.length)
    ) {
      const a = window.GONE_CONV;
      (C(
        `Đồ Hoàng Kim / Bạch Kim không theo bảng gốc VNG: đổi <b>${a.length}</b> món sang món cùng môn phái, cùng vị trí (giữ cường hóa / cấp Bạch Kim): ${D([...new Set(a)].slice(0, 6).join(", "))}${a.length > 6 ? "…" : ""}`,
      ),
        k(`Đổi ${a.length} món sang bảng mới`),
        (window.GONE_CONV = []));
    }
    if (window.SET_PURGED) {
      const a = window.SET_PURGED.reduce((i, r) => i + r, 0);
      ((window.SET_PURGED = null),
        C(`Đã xóa ${a} món thuộc bộ không còn trong game (Đằng Long, Tinh Sương…).`));
    }
  } else {
    try {
      sessionStorage.setItem("jxidle_in", String(m0));
    } catch {}
    Yf();
  }
  (document.addEventListener("visibilitychange", () => {
    (document.hidden && (o.fac && $(), (yi = Date.now()), (qr = 0)), (o5 = performance.now()));
  }),
    window.addEventListener("pagehide", () => {
      o.fac && $();
    }),
    window.addEventListener("keydown", (a) => {
      a.key === "Escape" && !m("#modal").classList.contains("hidden") && n0();
    }));
  const e = () => {
    if (typeof $g == "function")
      try {
        $g();
      } catch {}
    if (typeof Yg == "function")
      try {
        Yg();
      } catch {}
  };
  (fetch("ver.json?t=" + Date.now(), { cache: "no-store" })
    .then((a) => (a.ok ? a.json() : null))
    .then((a) => {
      (a && +a.xp > 0 && typeof ye < "u" && (ye = +a.xp), a && a.bt ? x_(a) : e(), Fm(a));
    })
    .catch(e),
    requestAnimationFrame(P_));
};

var k_ = function () {
  fetch("ver.json?t=" + Date.now(), { cache: "no-store" })
    .then((A) => (A.ok ? A.json() : null))
    .then((A) => {
      if (A && A.bt && !window.MAINT) {
        try {
          $();
        } catch {}
        location.reload();
        return;
      }
      if ((Fm(A), !(!A || !(+A.v > d5)) && !(typeof l < "u" && l.dg))) {
        typeof l < "u" && l.tower && o && o.fac && (o.resumeTower = l.tower.floor);
        try {
          $();
        } catch {}
        (typeof k == "function" && k("Có bản cập nhật mới — đang tải lại…"),
          setTimeout(() => location.reload(), 3e3));
      }
    })
    .catch(() => {});
};

var Fm = function (A) {
  let n = document.getElementById("fclose");
  const t = A && A.dong;
  let e = "";
  try {
    e = localStorage.getItem("jx_fc_ok") || "";
  } catch {}
  if (!t || e === String(t) || window.FC_OK) {
    n && (n.remove(), document.body.classList.remove("fclose"));
    return;
  }
  n ||
    ((n = document.createElement("div")),
    (n.id = "fclose"),
    document.body.appendChild(n),
    document.body.classList.add("fclose"),
    (n.innerHTML = `<div class="fcbox"><div style="font-size:40px">📜</div><h2 style="color:#f3d27a">THÔNG BÁO</h2>
    <p>Máy chủ phi thương mại vĩnh viễn, chủ yếu đem lại niềm vui cho mọi người.</p>
    <p><b style="color:#ff6a55">Mọi hành vi bug, cheat, hack là xấu!</b></p>
    <p><b>BAN CO DONG TINH KHONG?</b></p>
    <div class="btnrow" style="justify-content:center"><button class="btn" id="fcOk">&lt;TOI DONG TINH&gt;</button></div></div>`),
    (m("#fcOk").onclick = () => {
      window.FC_OK = !0;
      try {
        localStorage.setItem("jx_fc_ok", String(t));
      } catch {}
      (n.remove(), document.body.classList.remove("fclose"));
    }));
};

var x_ = function (A) {
  ((window.MAINT = !0), typeof b < "u" && (b.holdUntil = 9e15));
  let n = document.getElementById("maint");
  (n || ((n = document.createElement("div")), (n.id = "maint"), document.body.appendChild(n)),
    (n.style.cssText =
      "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse,#2a1d10f2,#0b0805fa);color:#efe1bd;text-align:center;padding:20px;font-family:inherit"),
    (n.innerHTML = `<div style="max-width:440px;border:1px solid #8a6a32;border-radius:10px;padding:22px 18px;background:#1a120acc;box-shadow:0 0 30px #000">
    <div style="font-size:42px">🛠</div><h2 style="color:#f3d27a;margin:8px 0">Máy chủ đang bảo trì</h2>
    <p style="font-size:14px;line-height:1.5">${typeof A.msg == "string" ? D(A.msg) : "Đang dọn dẹp và nâng cấp máy chủ. Nhân vật của bạn vẫn an toàn (đã lưu trong máy)."}</p>
    <p style="font-size:12px;color:#b9a77d">Game tự vào lại khi bảo trì xong — không cần tải lại trang.</p></div>`),
    clearInterval(window.maintT),
    (window.maintT = setInterval(
      () =>
        fetch("ver.json?t=" + Date.now(), { cache: "no-store" })
          .then((t) => (t.ok ? t.json() : null))
          .then((t) => {
            t && !t.bt && location.reload();
          })
          .catch(() => {}),
      6e4,
    )));
};

var o5 = performance.now();

var r5 = 0;

var c5 = 0;

var Vm = !1;

var Um = "jxidle_ui";

var l5 = [0.9, 1, 1.15, 1.3];

var B_ = ["Nhỏ", "Vừa", "Lớn", "Rất lớn"];

var s1 = null;

s5();

window.addEventListener("orientationchange", () => setTimeout(s5, 50));

window.addEventListener("resize", s5);

var Lr = 1 / 60;

var Xm = 10;

var __ = 120;

var N2 = 0;

var bi = 0;

var Jm = "";

var yi = 0;

var qr = 0;

var Wm = 0;

var L2 = 0;

var M_ = 12 * 3600;

(function () {
  try {
    const A = new Worker(
      URL.createObjectURL(
        new Blob(["setInterval(function(){postMessage(0)},1000)"], { type: "text/javascript" }),
      ),
    );
    A.onmessage = Ym;
  } catch {
    setInterval(Ym, 1e3);
  }
})();

y_();

typeof ef == "function" && ef();

"serviceWorker" in navigator &&
  location.protocol.startsWith("http") &&
  navigator.serviceWorker.register("sw.js").catch(() => {});

var d5 = 622;

setInterval(k_, 300 * 1e3);
