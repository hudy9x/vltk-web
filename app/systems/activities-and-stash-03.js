// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var Hc = [
  [
    "ovan",
    5,
    "Ô Vân Đạp Tuyết",
    "Ô Vân Đạp Tuyết",
    60,
    1,
    [
      ["coldres_p", 15],
      ["lifemax_p", 5],
      ["five_elements_resist_v", 10],
    ],
    "Ngựa đen bốn vó trắng như tuyết, hệ Thủy",
  ],
  [
    "xtho",
    5,
    "Xích Thố",
    "Xích Thố",
    60,
    1,
    [
      ["fireres_p", 15],
      ["attackspeed_v", 6],
      ["deadlystrikeenhance_p", 4],
    ],
    "Ngày đi nghìn dặm, hệ Hỏa",
  ],
  [
    "tanh",
    5,
    "Tuyệt ảnh",
    "Tuyệt Ảnh",
    60,
    1,
    [
      ["physicsres_p", 10],
      ["attackratingenhance_p", 15],
      ["ignoredefense_p", 6],
    ],
    "Nhanh tới mức không thấy bóng, hệ Kim",
  ],
  [
    "dlo",
    5,
    "Đích Lô",
    "Đích Lô",
    60,
    1,
    [
      ["poisonres_p", 15],
      ["steallifeenhance_p", 3],
      ["lifereplenish_v", 25],
    ],
    "Từng cứu chủ nhảy qua suối Đàn Khê, hệ Mộc",
  ],
  [
    "cdsu",
    5,
    "Chiếu Dạ Ngọc Sư Tử",
    "Chiếu Dạ Ngọc Sư Tử",
    60,
    1,
    [
      ["lightingres_p", 15],
      ["lucky_v", 15],
      ["meleedamagereturn_p", 6],
    ],
    "Sáng rực trong đêm, hệ Thổ",
  ],
  [
    "pvan",
    8,
    null,
    "Phi Vân",
    70,
    2,
    [
      ["allres_p", 6],
      ["attackspeed_v", 6],
      ["lifemax_p", 6],
    ],
    "Lướt như mây bay",
  ],
  [
    "btieu",
    6,
    null,
    "Bôn Tiêu",
    70,
    2,
    [
      ["lifemax_p", 8],
      ["steallifeenhance_p", 4],
      ["manamax_p", 6],
    ],
    "Phi nước đại trong đêm",
  ],
  [
    "xlc",
    9,
    null,
    "Xích Long Câu",
    80,
    3,
    [
      ["deadlystrikeenhance_p", 8],
      ["attackspeed_v", 8],
      ["five_elements_enhance_v", 15],
    ],
    "Long câu đỏ rực, chuyên xung trận",
  ],
  [
    "duhuy",
    11,
    null,
    "Du Huy",
    80,
    3,
    [
      ["lifemax_p", 10],
      ["meleedamagereturn_p", 10],
      ["lifereplenish_v", 40],
    ],
    "Ánh sáng lấp lánh trên bờm",
  ],
  [
    "squang",
    13,
    null,
    "Siêu Quang",
    85,
    3,
    [
      ["attackspeed_v", 10],
      ["deadlystrikeenhance_p", 6],
      ["lifemax_p", 6],
    ],
    "Nhanh hơn cả ánh sáng",
  ],
  [
    "pvu",
    7,
    null,
    "Phiên Vũ",
    90,
    4,
    [
      ["allres_p", 8],
      ["steallifeenhance_p", 5],
      ["attackspeed_v", 8],
      ["lifemax_p", 6],
    ],
    "Bay lượn như chim",
  ],
  [
    "hhlc",
    18,
    null,
    "Hãn Huyết Long Câu",
    92,
    4,
    [
      ["lifemax_p", 12],
      ["deadlystrikeenhance_p", 8],
      ["five_elements_enhance_v", 20],
      ["steallifeenhance_p", 4],
    ],
    "Mồ hôi đỏ như máu",
  ],
  [
    "bhv",
    16,
    null,
    "Kim Tinh Bạch Hổ Vương",
    95,
    4,
    [
      ["allres_p", 10],
      ["meleedamagereturn_p", 12],
      ["lifemax_p", 10],
      ["attackspeed_v", 8],
    ],
    "Chúa sơn lâm lông trắng",
  ],
  [
    "pvtm",
    21,
    null,
    "Phong Vân Thần Mã",
    97,
    4,
    [
      ["allres_p", 12],
      ["attackspeed_v", 10],
      ["deadlystrikeenhance_p", 8],
      ["lifemax_p", 10],
    ],
    "Thần mã của Phong Vân hội",
  ],
];

var sy = ["", "Ngũ đại thần mã", "Danh mã", "Bảo mã", "Thần mã tối thượng"];

var iy = { 1: [120, 6e4], 2: [200, 12e4], 3: [320, 25e4], 4: [500, 5e5] };

var oy = { 233: 85, 241: 114 };

var ry = new Set([93, 243]);

var Oo = (s) => Hc.find((A) => A[0] === s);

var cy = (s) => !!(s && s.d === 10 && s.thanma);

var gu = (s) => {
  const [A, n] = iy[s[5]];
  return { fd: A, gold: Math.round(n * (1 + o.lvl / 10)) };
};

var $c = function (A = new Date()) {
  const n = new Date(A);
  return (n.setHours(0, 0, 0, 0), n.setDate(n.getDate() - ((n.getDay() + 6) % 7)), n);
};

var I1 = function () {
  const A = o.dg || (o.dg = {});
  return (
    A.day !== Oe() && ((A.day = Oe()), (A.runs = {})),
    A.week !== $u() &&
      ((A.week = $u()), (A.wbTries = 0), (A.wbBest = 0), (A.wbRank = ""), (A.wbClaimed = !1)),
    (A.runs = A.runs || {}),
    A
  );
};

var mu = function () {
  const A = [...new Set(k0.map((t) => t.boss))].filter((t) => r0[t]),
    n = Math.floor($c().getTime() / 6048e5);
  return A[((n % A.length) + A.length) % A.length];
};

var ly = function (A) {
  const n = A && A.map && MapsEngine.isMapAvailable(Number(A.map)) && window.JMO && window.JMO[String(A.map)] ? A.map : null;
  n &&
    ((l.zoneShown = "dg"),
    ma(n),
    ([v.x, v.y] = X0(O0.w / 2, O0.h / 2)),
    M1(),
    (l.bgImg = bA(MapsEngine.getMapBackground(Number(n)))),
    _e(n));
};

var Tc = function () {
  (l.town && en(),
    (l.enemies = []),
    (l.corpses = []),
    (l.pickTarget = null),
    (l.moveTo = null),
    (l.spawnT = 0.8),
    (l.stall = 0),
    (l.deadT = 0),
    (l.life = l.P.life),
    (l.mana = l.P.mana),
    n0(!0));
};

var Cc = function (A) {
  const n = l2.find((t) => t.id === A);
  if (n) {
    if (d2()) {
      k(l.deadT > 0 ? "Đang trọng thương, chờ hồi phục" : "Đang ở tháp / phó bản");
      return;
    }
    if (!Io(n)) {
      k(`Cần cấp ${n.lv}`);
      return;
    }
    if (!So(n)) {
      k("Hết lượt hôm nay");
      return;
    }
    (Tc(),
      (l.dg = {
        kind: "dg",
        id: A,
        d: n,
        room: 1,
        t: 0,
        limit: n.limit,
        L: Math.min(200, n.lv + No),
      }),
      (l.banner = {
        t: 2.4,
        text: n.n,
        sub: `${n.rooms} phòng · ${n.limit >= 120 && n.limit % 60 === 0 ? n.limit / 60 + " phút" : n.limit + " giây"} · gục ngã là thất bại`,
      }),
      ly(n),
      C(`🏯 Dịch chuyển vào phó bản <b>${D(n.n)}</b>.`));
  }
};

var wu = function () {
  const A = I1();
  if (d2()) {
    k(l.deadT > 0 ? "Đang trọng thương, chờ hồi phục" : "Đang ở tháp / phó bản");
    return;
  }
  if (o.lvl < 20 && !Q().stat.reborn) {
    k("Cần cấp 20");
    return;
  }
  if (A.wbTries >= qe) {
    k("Hết lượt tuần này");
    return;
  }
  (A.wbTries++,
    E1().wbTries++,
    Tc(),
    (l.dg = { kind: "wb", t: 0, limit: Ec, L: Lo(3), tid: mu(), dmg: 0 }),
    (l.banner = {
      t: 2.4,
      text: "Boss tuần: " + r0[l.dg.tid].n,
      sub: `${Ec} giây · gây càng nhiều sát thương càng tốt`,
    }),
    $());
};

var Qt = function () {
  const A = l.dg && l.dg.kind === "boat",
    n = l.dg && l.dg.kind === "dg" && l.zoneShown === "dg";
  ((l.dg = null),
    (l.dgPilotT = 3),
    (l.enemies = []),
    (l.corpses = []),
    (o.wave = 1),
    (l.spawnT = 0.8),
    (l.zoneShown = null),
    (l.stall = 0),
    A && typeof Vo == "function"
      ? Vo(!1)
      : n && ((l.zoneShown = null), Gn(AA(Math.min(o.stage, d0)))),
    PA === "log" && V());
};

var dy = function () {
  const A = l.dg;
  if (((l.enemies = []), (l.stall = 0), A.kind === "boat")) {
    gk();
    return;
  }
  const n = (i, r) => {
    const c = Z(0, Math.PI * 2),
      d = Z(i, r);
    return X0(v.x + Math.cos(c) * d, v.y + Math.sin(c) * d);
  };
  if (A.kind === "wb") {
    const [i, r] = n(200, 240),
      c = n1(A.tid, A.L, "boss", i, r);
    ((c.hp = c.max = c.max * _u),
      (c.dmg *= 1.1),
      (c.wb = !0),
      (c.n = "Boss tuần · " + c.n),
      (A.boss = c),
      l.enemies.push(c));
    return;
  }
  const t = A.kind === "dg" ? Tu(A) : A.L,
    e = Dy(t);
  if (A.room >= A.d.rooms) {
    const [i, r] = n(220, 260),
      c = n1(e.boss, t, "boss", i, r);
    ((c.hp = c.max = (c.max * A.d.bossMul) / 2),
      (c.dmg *= 1.25),
      (c.n = "Trấn thủ · " + ga(e.boss, e.n)),
      l.enemies.push(c));
    for (let d = 0; d < 2; d++) {
      const [f, h] = n(140, 240),
        g = n1(C0(e.m), t, "elite", f, h);
      ((g.dmg *= xu), (g.hp = g.max = g.max * Bu), l.enemies.push(g));
    }
  } else {
    const i = 3 + Math.floor(A.room / 3);
    for (let r = 0; r < i; r++) {
      const [c, d] = n(140, 260),
        f = n1(C0(e.m), t, "elite", c, d);
      ((f.dmg *= xu), (f.hp = f.max = f.max * Bu), l.enemies.push(f));
    }
  }
};

var fy = function (A) {
  const n = l.dg;
  n &&
    ((n.t += A),
    (l.stall = 0),
    n.kind === "wb" && n.boss && (n.dmg = Math.max(n.dmg, n.boss.max - Math.max(0, n.boss.hp))),
    n.t >= n.limit && (n.kind === "wb" ? zs(!1) : pu("Hết thời gian")));
};

var hy = function () {
  const A = l.dg;
  if (A.kind === "boat") {
    mk();
    return;
  }
  if (A.kind === "wb") {
    if (!A.boss || A.boss.hp > 0) {
      l.spawnT = 0.5;
      return;
    }
    ((A.dmg = A.boss.max), zs(!0));
    return;
  }
  if (A.room >= A.d.rooms) {
    uy();
    return;
  }
  if ((A.room++, A.kind === "dg" && A.d.islands && l.zoneShown === "dg")) {
    const n = xw(A.room - 1);
    if (n) {
      (([v.x, v.y] = n), (l.moveTo = null), (l.pickTarget = null));
      for (const t of l.ground) [t.x, t.y] = X0(t.x, t.y);
      typeof M1 == "function" && M1();
    }
  }
  (za(l.P.life * 0.25, !0),
    (l.mana = Math.min(l.P.mana, l.mana + l.P.mana * 0.3)),
    (l.spawnT = 1.5),
    (l.banner = {
      t: 1.4,
      text: `Phòng ${A.room}/${A.d.rooms} · quái cấp ${Tu(A)}`,
      sub: A.room >= A.d.rooms ? "Trùm trấn thủ!" : `Còn ${Math.ceil(A.limit - A.t)} giây`,
    }));
};

var pu = function (A) {
  const n = l.dg;
  if (n) {
    if (n.kind === "wb") {
      zs(!1);
      return;
    }
    if (n.kind === "boat") {
      (C(`<span class="bad">Phong Lăng Độ thất bại: ${D(A)}.</span> Không mất lượt.`),
        (l.banner = { t: 2.2, text: "Thuyền bị cướp", sub: A + " · không mất lượt" }),
        Qt(),
        PA === "quest" && V());
      return;
    }
    (C(`<span class="bad">Phó bản ${D(n.d.n)} thất bại: ${D(A)}.</span> Không mất lượt.`),
      ((l.dgSkip || (l.dgSkip = {}))[n.d.id] = !0),
      (l.banner = { t: 2.2, text: "Thất bại", sub: A + " · không mất lượt" }),
      Qt());
  }
};

var Le = function (A) {
  const n = ce(0, R1 - 1),
    t = Object.values(o.eq).filter((f) => f && f.d <= 9),
    e = t.length ? C0(t) : null,
    a = e
      ? S.affixLevel
          .filter(
            (f) =>
              f.lvl === 1 && f.pre === (n % 2 === 0 ? 1 : 0) && de(f.a, e.s) && cs(f.a, e.d, e.k),
          )
          .map((f) => f.a)
      : [],
    i = a.length ? C0([...new Set(a)]) : C0(bd(n)),
    r = E(Math.floor(A / 12) + ce(0, 1), 1, Sa),
    c = Object.values(o.eq).filter((f) => f && f.d <= 9),
    d = Ia(n, i, r, n % 2 ? (c.length ? C0(c).s : N0(0, 4)) : -1);
  return (U("ore", d), `${Mt(d)} cấp ${r}`);
};

var Du = function (A, n) {
  const t = [],
    e = E(Math.floor(A / 15) + 1, 1, MA);
  (U("ht", e, n), t.push(`${n} Huyền Tinh cấp ${e}`));
  for (let a = 0; a < n; a++) t.push(Le(A));
  return t;
};

var uy = function () {
  const A = l.dg,
    n = A.d,
    t = Math.round(A.t),
    e = t <= n.limit * 0.5 ? "S" : t <= n.limit * 0.75 ? "A" : "B",
    a = py[e];
  I1().runs[n.id] = (I1().runs[n.id] || 0) + 1;
  const i = E1();
  ((i.dgClear[n.id] = (i.dgClear[n.id] || 0) + 1),
    (!i.dgBest[n.id] || t < i.dgBest[n.id]) && (i.dgBest[n.id] = t),
    (!i.dgRank[n.id] || "SAB".indexOf(e) < "SAB".indexOf(i.dgRank[n.id])) && (i.dgRank[n.id] = e));
  const r = z0(
      {
        fd: Math.round(n.fd * a),
        knb: Math.round((n.knb || 0) * a),
        buff: { tt: [0.5, e === "S" ? 30 : e === "A" ? 20 : 10] },
      },
      `Phó bản ${n.n} · hạng ${e}`,
    ),
    c = Du(A.L, e === "S" ? 3 : e === "A" ? 2 : 1);
  if ((C(`🎁 ${c.join(", ")}`), Math.random() < n.set * Mu * a)) {
    const d = Ts(!1);
    d && (xn(d, !0, !0, !0), C(`🎁 Phó bản ${D(n.n)}: <b style="color:${_0[d.r]}">${D(d.n)}</b>`));
  }
  (typeof qs == "function" && Math.random() < n.horse * To.dg * a && qs(1, "Phó bản " + n.n),
    _n("dungeon"),
    (l.banner = {
      t: 3,
      text: `Qua ${n.n} · hạng ${e}`,
      sub: `${t} giây · ${r.join(", ").replace(/<[^>]+>/g, "")}`.slice(0, 70),
    }),
    o0("levelup"),
    Mn(),
    Qt(),
    $());
};

var gy = function (A, n) {
  for (const [t, e] of Eo) if (A >= n * e - 0.5) return t;
  return "";
};

var zs = function (A) {
  const n = l.dg,
    t = I1(),
    e = n.boss ? n.boss.max : 1,
    a = n.boss ? Math.round(A ? e : n.dmg) : 0,
    i = n.boss ? gy(a, e) : "";
  (a > (t.wbBest || 0) && ((t.wbBest = a), (t.wbHp = e)),
    i && (!t.wbRank || "SABC".indexOf(i) < "SABC".indexOf(t.wbRank)) && (t.wbRank = i),
    jt("wbBest", a, { n: r0[n.tid].n, rank: i || "—", pct: Math.round((a / e) * 100) }),
    C(
      `Boss tuần ${D(r0[n.tid].n)}: gây <b>${F(a)}</b> sát thương (${Math.round((a / e) * 100)}% máu) · hạng ${i || "chưa đạt"}`,
    ),
    (l.banner = {
      t: 3,
      text: A ? "Hạ Boss tuần!" : "Hết giờ",
      sub: `${F(a)} sát thương · hạng ${i || "—"}`,
    }),
    Qt(),
    tt(),
    $());
};

var Pu = function () {
  const A = I1();
  if (A.wbClaimed || !A.wbRank) return;
  ((A.wbClaimed = !0), z0(Hu[A.wbRank], `Rương Boss tuần hạng ${A.wbRank}`));
  const n = Du(Lo(3), { S: 3, A: 2, B: 1, C: 1 }[A.wbRank]);
  (C(`🎁 ${n.join(", ")}`), Mn(), $());
};

var my = function (A) {
  const n = l.dg;
  if (!n) return;
  const t = Math.max(0, n.limit - n.t),
    e = Math.floor(t / 60),
    a = String(Math.floor(t % 60)).padStart(2, "0"),
    i =
      n.kind === "wb"
        ? `Boss tuần · ${F(n.dmg)} (${(() => {
            const c = (n.dmg / Math.max(1, n.boss ? n.boss.max : 1)) * 100;
            return c < 10 ? c.toFixed(1) : Math.round(c);
          })()}%) · ${e}:${a}`
        : n.kind === "boat"
          ? `⛵ Phong Lăng Độ · đoạn ${n.room}/${Fe} · ${e}:${a}`
          : `${n.d.n} · phòng ${n.room}/${n.d.rooms} · ${e}:${a}`;
  ((A.font = '12px "IBM Plex Mono", monospace'), (A.textAlign = "center"));
  const r = A.measureText(i).width + 18;
  ((A.fillStyle = "#000b"),
    A.fillRect(M0.w / 2 - r / 2, 34, r, 20),
    (A.fillStyle = t < 20 ? "#ff7a6a" : "#f3d88a"),
    A.fillText(i, M0.w / 2, 48));
};

var vu = function () {
  const A = l.dg
      ? `<div class="card"><b>Đang trong ${l.dg.kind === "wb" ? "Boss tuần" : D(l.dg.d.n)}</b><div class="btnrow"><button class="btn red" id="dgOut">Rời đi${l.dg.kind === "wb" ? " (giữ sát thương đã gây)" : " (không mất lượt)"}</button></div></div>`
      : "",
    n = E1();
  return `<p class="desc">Phó bản: quái tinh anh cấp cố định theo phó bản (phòng 1 = cấp phó bản, mỗi phòng mạnh dần, phòng cuối +10 là trùm trấn thủ), không mạnh lên theo cấp nhân vật. ${Oc} lượt / ngày cho mỗi phó bản, chỉ trừ lượt khi vượt qua. Hạng theo thời gian: S ≤ 50% giới hạn (thưởng ×1.5), A ≤ 75% (×1.2), B.</p>${A}
    ${l2
      .map((t) => {
        const e = Io(t),
          a = So(t);
        return `<div class="card dgc${e ? "" : " lock"}"><b>${D(t.n)}</b> <small class="dim">từ cấp ${t.lv} · quái cấp ${t.lv} → ${Math.min(200, t.lv + No)} · ${t.rooms} phòng · ${t.limit >= 120 && t.limit % 60 === 0 ? t.limit / 60 + " phút" : t.limit + " giây"}</small><br><small>${D(t.d)}</small><br>
      <small class="dim">Thưởng: ~${Math.round(t.fd * dc)} Phúc Duyên, <b style="color:#ffd24a">${t.knb || 0} KNB</b>, Tiên Thảo Lộ 10–30 phút, Huyền Tinh + khoáng · Hoàng Kim ${(t.set * Mu * 100).toFixed(1)}% · Rương Ngựa ${(t.horse * To.dg * 100).toFixed(1)}%${n.dgClear[t.id] ? ` · kỷ lục ${n.dgBest[t.id]} giây (hạng ${n.dgRank[t.id]})` : ""}</small>
      <div class="btnrow"><button class="btn" data-dg="${t.id}" ${e && a && !d2() ? "" : "disabled"}>${e ? (a ? `Vào (còn ${a}/${Oc} lượt)` : "Hết lượt hôm nay") : `Cần cấp ${t.lv}`}</button></div></div>`;
      })
      .join("")}`;
};

var bu = function () {
  const A = I1(),
    n = mu(),
    t = r0[n],
    e = Lo(3),
    a = o.lvl >= 20 || Q().stat.reborn > 0,
    i = $c();
  i.setDate(i.getDate() + 7);
  const r = Math.max(0, Math.round((i - Date.now()) / 36e5)),
    c = A.wbBest && A.wbHp ? Math.round((A.wbBest / A.wbHp) * 100) : 0;
  return `<p class="desc">Mỗi tuần một trùm cực trâu (máu ×${_u} trùm thường). ${qe} lượt / tuần, mỗi lượt ${Ec} giây. Hạng theo % máu trùm đã đánh mất: C ${Eo[3][1] * 100}% · B ${Eo[2][1] * 100}% · A ${Eo[1][1] * 100}% · S hạ gục. Nhận rương tuần theo hạng tốt nhất.</p>
    <div class="card"><div class="idet">${t.img ? `<div class="pic"><img src="${D(t.img)}" alt=""></div>` : ""}<div><h4 class="boss">${D(t.n)}</h4><small class="dim">Cấp ${e} · đổi trùm sau ${r} giờ</small></div></div>
      <div class="stats"><span>Lượt còn</span><span>${qe - A.wbTries}/${qe}</span><span>Sát thương tốt nhất</span><span>${F(A.wbBest || 0)}${c ? ` (${c}%)` : ""}</span><span>Hạng tuần</span><span>${A.wbRank || "—"}</span></div>
      <div class="chips">${["S", "A", "B", "C"].map((d) => `<span class="chip2${A.wbRank === d ? " on" : ""}">${d}: ${Te(Hu[d])}${d === "S" ? ", 35% thần mã" : ""}</span>`).join("")}</div>
      <div class="btnrow"><button class="btn" id="wbGo" ${a && A.wbTries < qe && !d2() ? "" : "disabled"}>${a ? (A.wbTries < qe ? "Khiêu chiến" : "Hết lượt tuần này") : "Cần cấp 20"}</button>
      <button class="btn" id="wbClaim" ${A.wbRank && !A.wbClaimed ? "" : "disabled"}>${A.wbClaimed ? "Đã nhận rương tuần" : "Nhận rương tuần"}</button></div></div>`;
};

var N1 = function s(A) {
  if (!o.fac) return;
  if (A === "dt" || A === "st") {
    Us(A);
    return;
  }
  (A && (yA = A), yA === "rec" && (yA = "dg"));
  const n = [
      ["dg", "Phó bản"],
      ["tower", "Tháp"],
      ["wb", "Boss tuần"],
      ["horse", "Mã trường"],
      ["pet", "Đồng hành"],
    ],
    t =
      yA === "tower"
        ? xh()
        : yA === "pet"
          ? Bh()
          : yA === "dg"
            ? vu()
            : yA === "wb"
              ? bu()
              : yA === "horse"
                ? su()
                : yA === "tm"
                  ? hu()
                  : Uh();
  J(
    `<h3>Hoạt động <small>${q(o.gold)} lượng</small></h3><div class="dtabs" id="actTabs">${n.map(([e, a]) => `<button data-a="${e}" class="${e === yA ? "on" : ""}">${a}</button>`).join("")}</div>${t}`,
    () => {
      (document
        .querySelectorAll("#actTabs button")
        .forEach((a) => (a.onclick = () => s(a.dataset.a))),
        document
          .querySelectorAll("#mBody [data-dg]")
          .forEach((a) => (a.onclick = () => Cc(a.dataset.dg))));
      const e = (a, i) => {
        const r = m(a);
        r && (r.onclick = i);
      };
      (e("#wbGo", wu),
        e("#wbClaim", () => {
          (Pu(), s());
        }),
        e("#dgOut", () => {
          (l.dg.kind === "wb" ? zs(!1) : (C("Rời phó bản."), Qt()), s());
        }),
        yA === "horse" && iu(() => s()),
        yA === "tm" && uu(() => s()),
        e("#gTower", A2),
        e("#gTowerOut", () => {
          (Cs(!1), s());
        }),
        document
          .querySelectorAll("#mBody .petpick [data-p]")
          .forEach((a) => (a.onclick = () => Dh(+a.dataset.p))));
    },
  );
};

var yu = function () {
  const A = m("#actBtn");
  if (!A || !o.fac) return;
  const n =
    l2.some((t) => Io(t) && So(t)) ||
    ((o.lvl >= 20 || Q().stat.reborn) && I1().wbTries < qe) ||
    Sc();
  A.classList.toggle("on", !!n);
};

var ku = function (A) {
  if (
    o.mode !== "dg" ||
    !o.fac ||
    l.dg ||
    l.tower ||
    l.deadT > 0 ||
    l.sat ||
    ((l.dgPilotT = (l.dgPilotT || 0) - A), l.dgPilotT > 0)
  )
    return;
  l.dgPilotT = 1.5;
  const n = qo();
  if (n) {
    (l.town && en(), Cc(n.id));
    return;
  }
  if (!l.town) {
    const t = Ue();
    o.autoMap !== !1 && DA(Math.min(o.stage, d0)) !== t && On(t, "Hết lượt phó bản, luyện công");
  }
};

var l2 = [
  {
    id: "dvc",
    map: 140,
    n: "Dược Vương Cốc",
    lv: 20,
    add: -2,
    rooms: 5,
    limit: 120,
    bossMul: 5,
    set: 0.2,
    horse: 0.08,
    fd: 8,
    item: 5,
    gold: 2500,
    knb: 2,
    pot: 5,
    d: "Hang dược thảo bị độc nhân chiếm giữ. 4 phòng tinh anh, phòng 5 là trùm.",
  },
  {
    id: "tbk",
    map: 50,
    n: "Thiên Bảo Khố",
    lv: 50,
    add: 0,
    rooms: 6,
    limit: 150,
    bossMul: 6,
    set: 0.35,
    horse: 0.12,
    fd: 12,
    item: 6,
    gold: 6e3,
    knb: 3,
    pot: 8,
    d: "Kho báu triều đình, lính canh tinh nhuệ. 5 phòng tinh anh, phòng 6 là trùm.",
  },
  {
    id: "lal",
    map: 8,
    n: "Lâm An Hoàng Lăng",
    lv: 80,
    add: 2,
    rooms: 7,
    limit: 210,
    bossMul: 7,
    set: 0.5,
    horse: 0.18,
    fd: 18,
    item: 6,
    gold: 12e3,
    knb: 4,
    pot: 10,
    d: "Lăng mộ hoàng tộc, cơ quan trùng trùng. 6 phòng tinh anh, phòng 7 là trùm.",
  },
  {
    id: "pdq",
    map: 206,
    n: "Phong Đô Quỷ Thành",
    lv: 110,
    rooms: 7,
    limit: 240,
    bossMul: 7,
    set: 0.55,
    horse: 0.2,
    fd: 22,
    item: 6,
    gold: 2e4,
    knb: 5,
    pot: 12,
    d: "Thành ma nơi âm khí ngút trời. 6 phòng tinh anh, phòng 7 là trùm.",
  },
  {
    id: "kct",
    map: 4,
    n: "Kiếm Các Thục Đạo",
    lv: 140,
    rooms: 8,
    limit: 270,
    bossMul: 8,
    set: 0.6,
    horse: 0.22,
    fd: 26,
    item: 6,
    gold: 3e4,
    knb: 6,
    pot: 14,
    d: "Đường Thục hiểm trở, sơn tặc trấn ải. 7 phòng tinh anh, phòng 8 là trùm.",
  },
  {
    id: "mcb",
    map: 225,
    n: "Mạc Cao Bí Cảnh",
    lv: 170,
    rooms: 8,
    limit: 300,
    bossMul: 7,
    set: 0.65,
    horse: 0.25,
    fd: 30,
    item: 6,
    gold: 45e3,
    knb: 7,
    pot: 16,
    d: "Hang động cổ giữa sa mạc, cao thủ ẩn tu. 7 phòng tinh anh, phòng 8 là trùm.",
  },
  {
    id: "hsl",
    map: 212,
    n: "Hoa Sơn Luận Kiếm",
    lv: 190,
    rooms: 9,
    limit: 330,
    bossMul: 7,
    set: 0.7,
    horse: 0.28,
    fd: 35,
    item: 6,
    gold: 6e4,
    knb: 8,
    pot: 20,
    d: "Đỉnh Hoa Sơn, quần hùng tranh phong. 8 phòng tinh anh, phòng 9 là trùm.",
  },
];

var xu = 0.55;

var Bu = 0.6;

var wy = 10;

var Oc = 2;

var qe = 3;

var Ec = 75;

var _u = 60;

var Eo = [
  ["S", 1],
  ["A", 0.5],
  ["B", 0.2],
  ["C", 0.05],
];

var Mu = 0.03;

var DM = 0.04;

var Hu = {
  S: { gold: 1e4, fd: 50, set: 1, knb: 15, pts: 3 },
  A: { gold: 6e3, fd: 30, set: 1, knb: 10 },
  B: { gold: 3e3, fd: 20, item: 6, knb: 6 },
  C: { gold: 1500, fd: 10, item: 5, knb: 3 },
};

var py = { S: 1.5, A: 1.2, B: 1 };

var $u = () => Os($c());

var So = (s) => Math.max(0, Oc - (I1().runs[s.id] || 0));

var Io = (s) => o.lvl >= s.lv || Q().stat.reborn > 0;

var No = 10;

var Tu = (s) => E(Math.round(s.d.lv + (No * (s.room - 1)) / Math.max(1, s.d.rooms - 1)), 1, 200);

var PM = (s) => (1 + Math.min(o.lvl, s.lv + No) / 10) / (1 + o.lvl / 10);

var Lo = (s) => E(Math.max(o.lvl, De(Math.max(1, o.maxStage - wy))) + s, 1, G2());

var Dy = (s) => k0.find((A) => s <= A.hi) || k0[k0.length - 1];

var d2 = () => l.dg || l.tower || l.deadT > 0;

var Sc = () => o && o.fac && ((I1().wbRank && !I1().wbClaimed) || !1);

var yA = "dg";

var qo = () =>
  l2.filter((s) => Io(s) && So(s) > 0 && !(l.dgSkip || {})[s.id]).sort((s, A) => A.lv - s.lv)[0] ||
  null;
