// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var $h = (s) => {
  let A = s || 1;
  for (let n = 1; n < be.length; n++) o.lvl >= be[n] && (A = Math.max(A, n));
  return A;
};

var fc = (s, A, n) =>
  s === "luck"
    ? `Quế Hoa Tửu +${A} may mắn trong ${n} phút`
    : `${Ss[s]} +${Math.round(A * 100)}% trong ${n} phút`;

var Th = {
  fd: "img/ep/fd.png",
  ht: "img/ep/ht.png",
  knb: "img/ep/knb.png",
  hb: "img/ep/hb.png",
  dhb: "img/ep/dhb.png",
  qht: "img/ep/qht.png",
  ttsp: "img/ep/ttsp.png",
  tt: "img/ep/tt.png",
  vlmt: "img/ep/mt90.png",
  ttk: "img/ep/dtbk.png",
  rngua: "img/ep/box2.png",
  ldt: "img/ep/ldt.png",
};

var Se = (s) => (Th[s] ? `<img src="${Th[s]}" alt="" class="rwic">` : "");

var Db = (s) => {
  const A = typeof J0 < "u" && J0.find((n) => n.k === s);
  return A ? A.n : s;
};

var Pb = /^(An Bang|Định Quốc|Hiệp Cốt|Nhu Tình|Kim Phong|Thiên Hoàng|Động Sát)/i;

var Ch = [
  { hb: 1, kt: { qht: 1 } },
  { hb: 2, misc: { ldt: 1 } },
  { hb: 2, kt: { qht: 1 } },
  { hb: 3, misc: { ldt: 1 } },
  { hb: 3, kt: { qht: 2 } },
  { hb: 5, misc: { rngua: 1 } },
  { hb: 5, dhb: 1, kt: { ttsp: 1 }, misc: { rngua: 1 } },
];

var Oh = {
  5: { hb: 5, kt: { qht: 3 }, misc: { ldt: 2 } },
  10: { hb: 10, dhb: 1, kt: { ttsp: 1 }, misc: { rngua: 2, vlmt: 1 } },
  15: { hb: 10, kt: { qht: 5 }, misc: { ldt: 3, rngua: 2 } },
  20: { hb: 15, dhb: 2, kt: { ttsp: 2 }, misc: { rngua: 3, ttk: 1 } },
  25: { hb: 15, kt: { qht: 5, ttsp: 1 }, misc: { ldt: 5 } },
  30: { hb: 20, dhb: 3, kt: { ttsp: 3 }, misc: { rngua: 5, vlmt: 1, ttk: 1 } },
};

var vb = (s) => Oh[((s - 1) % 30) + 1] || null;

var hc = [
  [10, { hb: 1, kt: { qht: 1 } }, "Mở khóa: tháp thử thách"],
  [20, { hb: 1, misc: { ldt: 1 } }, "Mở khóa: đồng hành"],
  [30, { hb: 2, kt: { qht: 1 } }, ""],
  [40, { hb: 2, kt: { qht: 2 }, misc: { ldt: 1 } }, ""],
  [50, { hb: 3, misc: { rngua: 1 } }, "Danh hiệu «Thiếu hiệp»"],
  [60, { hb: 3, kt: { qht: 2 }, misc: { ldt: 1 } }, ""],
  [70, { hb: 3, kt: { ttsp: 1 } }, ""],
  [80, { hb: 5, misc: { vlmt: 1, ttk: 1, rngua: 1 } }, ""],
  [90, { hb: 5, kt: { ttsp: 1 }, misc: { ldt: 2 } }, ""],
  [95, { hb: 5, dhb: 1, misc: { rngua: 1 } }, "Danh hiệu «Đại hiệp»"],
  [97, { hb: 5, kt: { qht: 3 }, misc: { ldt: 1 } }, ""],
  [99, { hb: 5, dhb: 1, misc: { rngua: 2 } }, "Danh hiệu «Tông sư»"],
  [110, { hb: 5, kt: { ttsp: 1 }, misc: { ldt: 2 } }, ""],
  [120, { hb: 8, dhb: 1, kt: { ttsp: 1 } }, ""],
  [135, { hb: 8, kt: { qht: 3 }, misc: { rngua: 2 } }, ""],
  [150, { hb: 10, dhb: 2, misc: { vlmt: 1, ttk: 1, rngua: 2 } }, ""],
  [165, { hb: 10, kt: { ttsp: 1 }, misc: { ldt: 3 } }, ""],
  [180, { hb: 10, dhb: 1, kt: { ttsp: 1 }, misc: { rngua: 2 } }, ""],
  [190, { hb: 15, dhb: 1, misc: { rngua: 3 } }, ""],
  [
    200,
    { hb: 20, dhb: 3, kt: { ttsp: 2 }, misc: { vlmt: 1, ttk: 1 } },
    "Cấp tối đa · mở khóa chuyển sinh",
  ],
];

var Eh = [
  [10, { hb: 2, kt: { ttsp: 1 } }, ""],
  [30, { hb: 3, kt: { qht: 2 } }, ""],
  [50, { hb: 5, misc: { ldt: 2 } }, ""],
  [80, { hb: 5, kt: { ttsp: 1 }, misc: { rngua: 1 } }, ""],
  [100, { hb: 8, dhb: 1, misc: { rngua: 2 } }, ""],
  [130, { hb: 8, kt: { ttsp: 1, qht: 3 } }, ""],
  [160, { hb: 10, dhb: 1, misc: { vlmt: 1, ttk: 1 } }, ""],
  [200, { hb: 15, dhb: 2, kt: { ttsp: 1 } }, "Mở khóa chuyển sinh lần sau"],
];

var uc = () => (v0() ? Eh : hc);

var Es = (s) => (v0() ? v0() + ":" + s : s);

var e2 = 10;

var Sh = 20;

var wo = (s) => o.lvl >= s || Q().stat.reborn > 0;

var Ss = {
  xp: "Kinh nghiệm",
  drop: "Tỉ lệ rơi đồ",
  tt: "Tiên Thảo Lộ",
  tt2: "Tiên Thảo Lộ Đặc Biệt",
  luck: "May mắn",
  luck2: "Thiên Sơn Bảo Lộ",
};

var bb = { xp: "⏫", drop: "🎲", tt: "🌿", tt2: "🌺", luck: "🍶", luck2: "🏔" };

var Ih = (s) => s === "luck" || s === "luck2";

var yb = () => o.buf || (o.buf = {});

var a2 = [
  [
    "lv30",
    "Xuất sơn",
    () => o.lvl >= 30 || Q().stat.reborn > 0,
    { hb: 2, kt: { qht: 1 } },
    ["lifemax_p", 3],
  ],
  [
    "lv50",
    "Thiếu hiệp",
    () => (Q().lvGot || {})[50],
    { hb: 2, misc: { ldt: 1 } },
    ["lifemax_p", 4],
  ],
  [
    "lv80",
    "Danh chấn giang hồ",
    () => o.lvl >= 80 || Q().stat.reborn > 0,
    { hb: 3, misc: { vlmt: 1 } },
    ["attackspeed_v", 3],
  ],
  [
    "lv100",
    "Đại hiệp",
    () => (Q().lvGot || {})[95] || (Q().lvGot || {})[100],
    { hb: 3, misc: { ttk: 1 } },
    ["allres_p", 4],
  ],
  [
    "lv150",
    "Tông sư",
    () => (Q().lvGot || {})[99] || (Q().lvGot || {})[150],
    { hb: 5, dhb: 1 },
    ["allres_p", 6],
  ],
  ["k1000", "Sát thủ", () => Q().stat.kills >= 1e3, { hb: 2, kt: { qht: 2 } }, ["manamax_p", 4]],
  [
    "k10000",
    "Vạn nhân địch",
    () => Q().stat.kills >= 1e4,
    { hb: 5, misc: { rngua: 2 } },
    ["attackspeed_v", 5],
  ],
  ["b50", "Diệt trùm", () => Q().stat.bosses >= 50, { hb: 3, misc: { ldt: 2 } }, ["allres_p", 3]],
  [
    "zone8",
    "Nửa giang sơn",
    () => o.maxStage >= d0 / 2,
    { hb: 5, kt: { ttsp: 1 } },
    ["fastwalkrun_p", 5],
  ],
  [
    "zone16",
    "Trường Bạch sơn chủ",
    () => o.maxStage > d0,
    { hb: 5, dhb: 1, kt: { ttsp: 1 } },
    ["lifemax_p", 6],
  ],
  [
    "setfull",
    "Hoàng Kim đủ bộ",
    () => x1(o.eq),
    { hb: 5, dhb: 1, misc: { rngua: 2 } },
    ["allres_p", 5],
  ],
  [
    "tower20",
    "Leo tháp tầng 20",
    () => Q().stat.towerBest >= 20,
    { hb: 5, dhb: 1 },
    ["attackspeed_v", 6],
  ],
  ["reborn1", "Chuyển sinh", () => Q().stat.reborn >= 1, { hb: 10, dhb: 2 }, ["lifemax_p", 8]],
  [
    "gold5",
    "Săn trùm Hoàng Kim",
    () => Q().stat.goldBoss >= 5,
    { hb: 5, dhb: 1, kt: { ttsp: 1 } },
    ["lucky_v", 10],
  ],
  [
    "login30",
    "Giang hồ lão luyện",
    () => Q().login.total >= 30,
    { hb: 10, dhb: 2 },
    ["manamax_p", 6],
  ],
];

var Hn = { id: 397, mus: 50, n: "Thông Thiên Tháp" };

var Nh = (s) => Math.min(G2(), 10 + s * 4);

var kb = (s) => Math.max(0, s | 0);

var xb = 0.001;

var Bb = 5;

var gc = (s) => Math.floor(kb(s) / Bb) * xb;

var _b = (s) => {
  const A = gc(s);
  return { hp: 1 + A, dmg: 1 + A };
};

var Lh = 0.25;

var qh = 0.15;

var po = 5;

var Do = 1;

var jh = 400;

var mc = [
  [10, { kt: { qht: 1 } }],
  [35, { misc: { ldt: 1 } }],
  [50, { hb: 1 }, "hb"],
  [80, { misc: { rngua: 1 } }],
  [150, { kt: { ttsp: 1 } }],
  [300, { dhb: 1 }, "dhb"],
  [400, { misc: { vlmt: 1 } }],
  [400, { misc: { ttk: 1 } }],
];

var wc = !1;

var s2 = !1;

var pc = [
  [30, { kt: { qht: 1 } }],
  [30, { hb: 1 }],
  [18, { misc: { ldt: 1 } }],
  [10, { misc: { rngua: 1 } }],
  [6, { kt: { ttsp: 1 } }],
  [4, { dhb: 1 }],
  [1, { misc: { vlmt: 1 } }],
  [1, { misc: { ttk: 1 } }],
];

var Po = () =>
  pc.filter(([, s]) => !(s.misc && ((s.misc.vlmt && !xa("vlmt")) || (s.misc.ttk && !xa("ttk")))));

var zh = 0.35;

var Mb = ["qht", "hb", "ldt", "rngua", "ttsp", "dhb", "vlmt", "ttk"];

var O1 = "login";

var Dc = [
  ["login", "Điểm danh"],
  ["lvms", "Mốc cấp"],
  ["chest", "Phúc Duyên"],
  ["event", "Sự kiện"],
  ["ach", "Thành tựu"],
];

var Pc = function (A) {
  if (!o || !o.fac) return 0;
  const n = vc();
  let t = 0;
  for (const e of c2)
    !n[e[0]] &&
      e[4]() &&
      ((n[e[0]] = 1),
      t++,
      !A &&
        !l.quiet &&
        (C(
          `🎖 Đạt danh hiệu <b style="color:${r2[e[3]].c}">«${D(Ns(e))}»</b> (${r2[e[3]].n}) — đeo ở thẻ Nhân vật.`,
        ),
        k("Danh hiệu mới: " + Ns(e))));
  return t;
};

var Hb = function (A) {
  const n = bo();
  n && pt(A, n[6][0], [n[6][1], 0, 0]);
};

var Qh = function s() {
  Pc();
  const A = vc(),
    n = bo(),
    t = [...new Set(c2.map((i) => i[2]))],
    e = c2.filter((i) => A[i[0]]).length,
    a = Gh[Kh(o.fac)];
  J(
    `<h3>🎖 Danh hiệu <small>${e}/${c2.length}</small></h3>
    <p class="desc">Phe: <b style="color:${a.c}">${a.n}</b> (màu tên nhân vật). Đeo 1 danh hiệu: hiện phía trên tên và cộng 1 chỉ số. ${n ? `Đang đeo: <b style="color:${r2[n[3]].c}">«${D(Ns(n))}»</b>` : "Chưa đeo danh hiệu."}</p>
    ${t
      .map(
        (i) =>
          `<h3>${i}</h3>` +
          c2
            .filter((r) => r[2] === i)
            .map((r) => {
              const c = !!A[r[0]],
                d = n === r;
              return `<div class="qrow${c ? "" : " lock"}"><span><b style="color:${c ? r2[r[3]].c : "#777"}">«${D(Ns(r))}»</b> <small class="dim">${r2[r[3]].n}</small><small>${D(r[5])} · ${D(i1(r[6][0], [r[6][1], 0, 0]))}</small></span><small></small>
        <button class="btn sm${d ? " on" : ""}" data-tt="${r[0]}" ${c ? "" : "disabled"}>${d ? "Tháo" : c ? "Đeo" : "Chưa đạt"}</button></div>`;
            })
            .join(""),
      )
      .join("")}`,
    () => {
      document.querySelectorAll("#mBody [data-tt]").forEach(
        (i) =>
          (i.onclick = () => {
            const r = Q();
            ((r.title = r.title === i.dataset.tt ? "" : i.dataset.tt),
              (l.dirty = !0),
              $(),
              V(),
              s());
          }),
      );
    },
  );
};

var $b = {
  shaolin: "chinh",
  wudang: "chinh",
  emei: "chinh",
  gaibang: "chinh",
  tianwang: "trung",
  tangmen: "trung",
  cuiyan: "trung",
  kunlun: "trung",
  wudu: "ta",
  tianren: "ta",
};

var Gh = {
  chinh: { n: "Chính phái", c: "#ffb347" },
  trung: { n: "Trung lập", c: "#7ee07e" },
  ta: { n: "Tà phái", c: "#c77bff" },
  tan: { n: "Tân thủ", c: "#ececec" },
};

var Kh = (s) => $b[s] || "tan";

var Tb = (s) => Gh[Kh(s)].c;

var Cb = ["Nov", "Administrator™"];

var Ob = "#ff3b3b";

var Is = (s) => Cb.includes(String(s || "").trim());

var i2 = () => "";

var Rh = () => "";

var o2 = (s, A) => (Is(s) ? Ob : Tb(A));

var r2 = [
  null,
  { n: "Thường", c: "#e8e0d0" },
  { n: "Hiếm", c: "#6aa8ff" },
  { n: "Quý", c: "#c77bff" },
  { n: "Truyền kỳ", c: "#ffb52e" },
  { n: "Chí tôn", c: "#ff5a3c" },
];

var Eb = {
  shaolin: "Thiếu Lâm",
  tianwang: "Thiên Vương",
  tangmen: "Đường Môn",
  wudu: "Ngũ Độc",
  emei: "Nga My",
  cuiyan: "Thúy Yên",
  gaibang: "Cái Bang",
  tianren: "Thiên Nhẫn",
  wudang: "Võ Đang",
  kunlun: "Côn Lôn",
};

var vo = () => Eb[o.fac] || "";

var $n = () => (Q().stat.reborn > 0 ? 200 : o.lvl);

var Yh = (s = 1) => Object.keys(o.sk || {}).some((A) => T[A] && T[A].tier === 90 && o.sk[A] >= s);

var Fh = () => (o.dt && o.dt.n) || 0;

var c2 = [
  [
    "xuatson",
    "Sơ Nhập Giang Hồ",
    "Cấp bậc",
    1,
    () => $n() >= 10 && !I[o.fac].novice,
    "Gia nhập môn phái",
    ["lifemax_p", 2],
  ],
  ["lv30", "Xuất Sơn", "Cấp bậc", 1, () => $n() >= 30, "Đạt cấp 30", ["lifemax_p", 3]],
  ["lv50", "Thiếu Hiệp", "Cấp bậc", 2, () => $n() >= 50, "Đạt cấp 50", ["lifemax_p", 4]],
  [
    "lv80",
    "Danh Chấn Giang Hồ",
    "Cấp bậc",
    2,
    () => $n() >= 80,
    "Đạt cấp 80",
    ["attackspeed_v", 3],
  ],
  ["lv100", "Đại Hiệp", "Cấp bậc", 3, () => $n() >= 100, "Đạt cấp 100", ["allres_p", 4]],
  ["lv150", "Tông Sư", "Cấp bậc", 4, () => $n() >= 150, "Đạt cấp 150", ["allres_p", 6]],
  ["lv200", "Võ Lâm Chí Tôn", "Cấp bậc", 5, () => $n() >= 200, "Đạt cấp 200", ["allres_p", 8]],
  [
    "cs1",
    "Nhất Trùng Sinh",
    "Chuyển sinh",
    3,
    () => Q().stat.reborn >= 1,
    "Chuyển sinh 1 lần",
    ["lifemax_p", 8],
  ],
  [
    "cs3",
    "Tam Trùng Sinh",
    "Chuyển sinh",
    4,
    () => Q().stat.reborn >= 3,
    "Chuyển sinh 3 lần",
    ["lifemax_p", 10],
  ],
  [
    "cs5",
    "Ngũ Trùng Tuyệt Đỉnh",
    "Chuyển sinh",
    5,
    () => Q().stat.reborn >= 5,
    "Chuyển sinh 5 lần",
    ["lifemax_p", 14],
  ],
  [
    "cs10",
    "Thập Trùng Chí Tôn",
    "Chuyển sinh",
    5,
    () => Q().stat.reborn >= 10,
    "Chuyển sinh 10 lần",
    ["lifemax_p", 18],
  ],
  [
    "mp1",
    () => vo() + " Đệ Tử",
    "Môn phái",
    1,
    () => !I[o.fac].novice,
    "Gia nhập môn phái",
    ["manamax_p", 3],
  ],
  [
    "mp2",
    () => vo() + " Hộ Pháp",
    "Môn phái",
    2,
    () => !I[o.fac].novice && $n() >= 60,
    "Cấp 60 trong môn phái",
    ["manamax_p", 5],
  ],
  [
    "mp3",
    () => vo() + " Trưởng Lão",
    "Môn phái",
    3,
    () => !I[o.fac].novice && $n() >= 90 && Yh(),
    "Cấp 90 + lĩnh ngộ võ công 90",
    ["manamax_p", 7],
  ],
  [
    "mp4",
    () => vo() + " Chưởng Môn",
    "Môn phái",
    4,
    () => !I[o.fac].novice && $n() >= 150 && Yh(20),
    "Cấp 150 + một võ công 90 cấp 20",
    ["allres_p", 6],
  ],
  [
    "k1000",
    "Sát Thủ",
    "Chiến công",
    1,
    () => Q().stat.kills >= 1e3,
    "Hạ 1.000 quái",
    ["manamax_p", 4],
  ],
  [
    "k10000",
    "Vạn Nhân Địch",
    "Chiến công",
    2,
    () => Q().stat.kills >= 1e4,
    "Hạ 10.000 quái",
    ["attackspeed_v", 5],
  ],
  [
    "k100000",
    "Huyết Sát Thiên Hạ",
    "Chiến công",
    4,
    () => Q().stat.kills >= 1e5,
    "Hạ 100.000 quái",
    ["attackspeed_v", 8],
  ],
  ["b50", "Diệt Trùm", "Chiến công", 2, () => Q().stat.bosses >= 50, "Hạ 50 Trùm", ["allres_p", 3]],
  [
    "b500",
    "Đồ Long Hiệp Sĩ",
    "Chiến công",
    4,
    () => Q().stat.bosses >= 500,
    "Hạ 500 Trùm",
    ["allres_p", 6],
  ],
  [
    "gold5",
    "Săn Trùm Hoàng Kim",
    "Chiến công",
    3,
    () => Q().stat.goldBoss >= 5,
    "Hạ 5 Trùm Hoàng Kim",
    ["lucky_v", 10],
  ],
  [
    "tower20",
    "Phá Tháp Giả",
    "Chiến công",
    3,
    () => Q().stat.towerBest >= 20,
    "Leo tháp tầng 20",
    ["attackspeed_v", 6],
  ],
  [
    "tower50",
    "Thông Thiên Tháp Chủ",
    "Chiến công",
    5,
    () => Q().stat.towerBest >= 50,
    "Leo tháp tầng 50",
    ["attackspeed_v", 10],
  ],
  [
    "dt100",
    "Hành Hiệp Trượng Nghĩa",
    "Hành hiệp",
    2,
    () => Fh() >= 100,
    "Hoàn thành 100 nhiệm vụ Dã Tẩu",
    ["lucky_v", 8],
  ],
  [
    "dt1000",
    "Nghĩa Hiệp Thiên Hạ",
    "Hành hiệp",
    4,
    () => Fh() >= 1e3,
    "Hoàn thành 1.000 nhiệm vụ Dã Tẩu",
    ["lucky_v", 15],
  ],
  [
    "zone8",
    "Nửa Giang Sơn",
    "Hành hiệp",
    2,
    () => o.maxStage >= d0 / 2,
    "Mở nửa số bản đồ",
    ["fastwalkrun_p", 5],
  ],
  [
    "zone16",
    "Trường Bạch Sơn Chủ",
    "Hành hiệp",
    3,
    () => o.maxStage > d0,
    "Mở hết bản đồ",
    ["lifemax_p", 6],
  ],
  [
    "login30",
    "Giang Hồ Lão Luyện",
    "Giang hồ",
    2,
    () => Q().login.total >= 30,
    "Đăng nhập 30 ngày",
    ["manamax_p", 6],
  ],
  [
    "setfull",
    "Hoàng Kim Gia Thân",
    "Giang hồ",
    4,
    () => typeof x1 == "function" && x1(o.eq),
    "Mặc đủ 1 bộ Hoàng Kim",
    ["allres_p", 5],
  ],
  [
    "vio6",
    "Huyền Tinh Thần Tượng",
    "Giang hồ",
    3,
    () => Object.values(o.eq || {}).some((s) => s && s.vio && (s.mag || []).length >= 6),
    "Mặc 1 món Tím đủ 6 dòng",
    ["allres_p", 4],
  ],
  [
    "rich",
    "Phú Giáp Nhất Phương",
    "Giang hồ",
    3,
    () => o.gold >= 1e7,
    "Có 10 triệu lượng",
    ["lucky_v", 12],
  ],
];

var Vh = Object.fromEntries(c2.map((s) => [s[0], s]));

var Ns = (s) => (typeof s[1] == "function" ? s[1]() : s[1]);

var vc = () => {
  const s = Q();
  s.titles = s.titles || {};
  for (const A in s.ach || {}) Vh[A] && (s.titles[A] = 1);
  return s.titles;
};

var bo = () => {
  const s = o && o.rw && o.rw.title,
    A = s && Vh[s];
  return A && vc()[s] ? A : null;
};

var E1 = function () {
  const A = o.rec || (o.rec = {});
  for (const n of [
    "maxHit",
    "maxDps",
    "fastBoss",
    "bestItem",
    "maxEnh",
    "bestStreak",
    "maxGoldKill",
    "wbBest",
    "horseLv",
  ])
    A[n] && typeof A[n] != "object" && delete A[n];
  return (
    (A.deaths = A.deaths | 0),
    (A.play = +A.play || 0),
    (A.goldKill = +A.goldKill || 0),
    (A.streak = A.streak | 0),
    (A.dgClear = A.dgClear || {}),
    (A.dgBest = A.dgBest || {}),
    (A.dgRank = A.dgRank || {}),
    (A.wbTries = A.wbTries | 0),
    (A.horses = A.horses | 0),
    A
  );
};

var jt = function (A, n, t, e = !0) {
  if (!o || !o.fac || !Number.isFinite(n)) return !1;
  const a = E1(),
    i = a[A];
  return i && (e ? n <= i.v : n >= i.v)
    ? !1
    : ((a[A] = Object.assign({ v: n, t: yc() }, t || {})), !0);
};

var Ls = function (A, n) {
  l.quiet ||
    !(A > 0) ||
    ((l.dpsAcc = (l.dpsAcc || 0) + A),
    jt("maxHit", Math.round(A), { n: n ? n.n : "", L: o.lvl }) &&
      !(l.recToastT > 0) &&
      E1().maxHit.v > 1e3 &&
      ($A(v.x, v.y - 64, "Kỷ lục đòn đánh!", "#ffd24a", 12), (l.recToastT = 20)));
};

var Sb = function (A) {
  if (((l.clock = (l.clock || 0) + A), l.quiet)) return;
  const n = E1();
  if (
    ((n.play += A),
    (l.recToastT = (l.recToastT || 0) - A),
    (l.dpsT = (l.dpsT || 0) + A),
    l.dpsT >= 1)
  ) {
    l.dpsT -= 1;
    const t = l.dpsWin || (l.dpsWin = []);
    (t.push(l.dpsAcc || 0),
      (l.dpsAcc = 0),
      t.length > bc && t.shift(),
      t.length === bc &&
        t.every((e) => e > 0) &&
        jt("maxDps", Math.round(t.reduce((e, a) => e + a, 0) / bc), {
          L: o.lvl,
          n: l.P && l.P.main ? l.P.main.n : "",
        }));
  }
};

var Ib = function (A, n) {
  if (l.quiet || !o.fac) return;
  const t = E1();
  if (
    ((t.goldKill += n || 0),
    t.streak++,
    t.streak > ((t.bestStreak && t.bestStreak.v) || 0) && (t.bestStreak = { v: t.streak, t: yc() }),
    n && jt("maxGoldKill", n, { n: A.n }),
    A.cls === "boss" && A.born != null && !A.wb)
  ) {
    const e = (l.clock || 0) - A.born;
    e > 0.5 && jt("fastBoss", Math.round(e * 10) / 10, { n: A.n, L: A.L }, !1);
  }
};

var Nb = function () {
  if (!o.fac || l.quiet) return;
  const A = E1();
  (A.deaths++, (A.streak = 0));
};

var yo = function (A) {
  if (!A || l.quiet || !o.fac) return;
  const n = E1(),
    t = n.bestItem,
    e = A.r * 1e3 + A.lvl * 10 + (A.mag || []).length;
  (!t || e > t.v) && (n.bestItem = { v: e, n: A.n, r: A.r, t: yc() });
};

var Lb = function (A) {
  A && A.enh && jt("maxEnh", A.enh, { n: A.n });
};

var qb = function () {
  const A = E1(),
    n = Q().stat,
    t = (i, r) => (i ? r(i) : '<span class="dim">chưa có</span>'),
    e = (i) => (i && i.t ? `<small class="dim">${jb(i.t)}</small>` : ""),
    a = typeof l2 < "u" ? l2 : [];
  return [
    [
      "Chiến đấu",
      [
        [
          "Đòn đánh mạnh nhất",
          t(A.maxHit, (i) => `<b>${F(i.v)}</b> ${i.n ? "· " + D(i.n) : ""}`),
          e(A.maxHit),
        ],
        ["DPS cao nhất (5 giây)", t(A.maxDps, (i) => `<b>${F(i.v)}</b>/giây`), e(A.maxDps)],
        [
          "Hạ trùm nhanh nhất",
          t(A.fastBoss, (i) => `<b>${i.v} giây</b> · ${D(i.n)} Lv${i.L}`),
          e(A.fastBoss),
        ],
        [
          "Chuỗi hạ quái không gục",
          t(A.bestStreak, (i) => `<b>${F(i.v)}</b> quái (hiện ${F(A.streak)})`),
          e(A.bestStreak),
        ],
        [
          "Ngân lượng 1 quái",
          t(A.maxGoldKill, (i) => `<b>${F(i.v)}</b> · ${D(i.n)}`),
          e(A.maxGoldKill),
        ],
        ["Số lần trọng thương", `<b>${F(A.deaths)}</b>`, ""],
      ],
    ],
    [
      "Tiến trình",
      [
        ["Bản đồ cao nhất", `<b>${D(AA(Math.min(o.maxStage, d0)).n)}</b>`, ""],
        [
          "Tổng quái đã hạ",
          `<b>${F(o.totalKills || 0)}</b> · trùm ${F(n.bosses)} · Hoàng Kim ${F(n.goldBoss)}`,
          "",
        ],
        ["Tháp thử thách", `<b>tầng ${n.towerBest}</b>`, ""],
        ["Chuyển sinh", `<b>${n.reborn}</b> lần`, ""],
        ["Thời gian chơi", `<b>${zb(A.play)}</b>`, ""],
        ["Ngân lượng từ quái", `<b>${q(A.goldKill)}</b>`, ""],
      ],
    ],
    [
      "Trang bị",
      [
        [
          "Món quý nhất từng có",
          t(A.bestItem, (i) => `<b style="color:${_0[i.r]}">${D(i.n)}</b>`),
          e(A.bestItem),
        ],
        ["Cường hóa cao nhất", t(A.maxEnh, (i) => `<b>+${i.v}</b> · ${D(i.n)}`), e(A.maxEnh)],
        [
          "Ngựa thuần dưỡng cao nhất",
          t(A.horseLv, (i) => `<b>cấp ${i.v}</b> · ${D(i.n)}`),
          e(A.horseLv),
        ],
        ["Sổ ngựa", `<b>${typeof cu == "function" ? cu() : 0}</b> loài đã cưỡi`, ""],
      ],
    ],
    [
      "Phó bản & Boss tuần",
      a
        .map((i) => [
          i.n,
          A.dgClear[i.id]
            ? `<b>${A.dgClear[i.id]}</b> lần · nhanh nhất ${A.dgBest[i.id]} giây · hạng ${A.dgRank[i.id] || "—"}`
            : '<span class="dim">chưa qua</span>',
          "",
        ])
        .concat([
          [
            "Boss tuần: sát thương cao nhất",
            t(A.wbBest, (i) => `<b>${F(i.v)}</b> · ${D(i.n || "")} · hạng ${i.rank || "—"}`),
            e(A.wbBest),
          ],
          ["Boss tuần: số lượt đã đánh", `<b>${A.wbTries}</b>`, ""],
        ]),
    ],
  ];
};

var Uh = function () {
  return `<p class="desc">Kỷ lục riêng của nhân vật này (lưu trong file lưu). Đòn đánh và DPS chỉ tính khi đang chơi, không tính tiến trình vắng mặt.</p>
    ${qb()
      .map(
        ([A, n]) =>
          `<h4 class="rech">${A}</h4><div class="card rect">${n.map(([t, e, a]) => `<span>${t}</span><span>${e} ${a}</span>`).join("")}</div>`,
      )
      .join("")}`;
};

var bc = 5;

var yc = () => Date.now();

var jb = (s) => {
  if (!s) return "";
  const A = new Date(s),
    n = (t) => String(t).padStart(2, "0");
  return `${n(A.getDate())}/${n(A.getMonth() + 1)}/${A.getFullYear()}`;
};

var zb = (s) => {
  s = Math.round(s);
  const A = Math.floor(s / 3600),
    n = Math.floor((s % 3600) / 60);
  return A ? `${A} giờ ${n} phút` : `${n} phút ${s % 60} giây`;
};

var ko = function (A, n) {
  if (!L0(A)) return n;
  const t = W0(A);
  return n >= 0 ? n * (1 + _o * t) : n * Math.max(0, 1 - Mo * t);
};

var st = function (A) {
  return L0(A) ? (A.k <= 4 ? (A.lvl <= 4 ? 0 : A.lvl <= 8 ? 1 : 2) : (Ay[A.k] ?? -1)) : -1;
};
