// ui/legacy-panels-and-audio — shared IIFE scope; order is defined in modules.json.
var Yf = function s() {
  const A = (a) => vA.filter((i) => i.series === a),
    n = (a, i) =>
      A(a)
        .map((r) => (hn(r, i) ? D(r.n) : `<s>${D(r.n)}</s>`))
        .join(" · "),
    t = S.start[TA.s * 2 + TA.sex] || {},
    e = A(TA.s).some((a) => hn(a, TA.sex));
  J(
    `<h3>Tạo nhân vật</h3><p class="desc">Như Võ Lâm Truyền Kỳ: chọn tên, giới tính và hệ ngũ hành. Đến <b>cấp ${KA}</b> mới gia nhập môn phái cùng hệ.</p>
    <div class="card lootf newc"><div class="row">Tên <input id="ncName" maxlength="14" placeholder="Tên nhân vật" value="${D(TA.name)}"></div><div class="reqbad small" id="ncWarn"></div>
      <div class="row">Giới tính <span class="seg">${["Nam", "Nữ"].map((a, i) => `<button class="btn sm${TA.sex === i ? " on" : ""}" data-sx="${i}">${a}</button>`).join("")}</span></div>
      <div class="dim small">Hệ ngũ hành (Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim):</div>
      <div class="serpick">${[0, 1, 2, 3, 4].map((a) => `<button data-se="${a}" class="${TA.s === a ? "on" : ""}" style="--c:${w0[a]}"><b>${g0[a]}</b><small>${Lv[a]}</small><small>Phái: ${n(a, TA.sex)}</small></button>`).join("")}</div>
      <div class="stats"><span>Sức mạnh</span><span>${t.str ?? "-"}</span><span>Thân pháp</span><span>${t.dex ?? "-"}</span><span>Sinh khí</span><span>${t.vit ?? "-"}</span><span>Nội công</span><span>${t.eng ?? "-"}</span></div>
      ${e ? "" : `<p class="reqbad">Hệ ${g0[TA.s]} không có môn phái nhận ${TA.sex ? "nữ" : "nam"}.</p>`}
      <div class="btnrow"><button class="btn" id="ncGo" ${e ? "" : "disabled"}>Vào giang hồ</button></div></div>`,
    () => {
      const a = m("#ncName");
      ((a.oninput = () => {
        TA.name = a.value;
      }),
        document.querySelectorAll("#mBody [data-sx]").forEach(
          (i) =>
            (i.onclick = () => {
              ((TA.name = a.value), (TA.sex = +i.dataset.sx), s());
            }),
        ),
        document.querySelectorAll("#mBody [data-se]").forEach(
          (i) =>
            (i.onclick = () => {
              ((TA.name = a.value), (TA.s = +i.dataset.se), s());
            }),
        ),
        (m("#ncGo").onclick = async () => {
          const i = vl(a.value.slice(0, 14));
          if (!i.ok) {
            k(i.msg);
            const f = m("#ncWarn");
            f && (f.textContent = i.msg);
            return;
          }
          const r = i.n,
            c = m("#ncGo");
          ((c.disabled = !0), (c.textContent = "Đang kiểm tra tên…"));
          const d = await Hv(r);
          if (c.isConnected) {
            if (d) {
              ((c.disabled = !1),
                (c.textContent = "Vào giang hồ"),
                a.focus(),
                k(`Tên "${r}" đã có người dùng — chọn tên khác`));
              const f = m("#ncWarn");
              f && (f.textContent = `Tên "${r}" đã có người dùng`);
              return;
            }
            V8(r, TA.sex, TA.s);
          }
        }));
    },
    !0,
  );
};

var Hv = async function (A) {
  if (typeof b > "u" || !b.user || typeof e0 != "function") return !1;
  try {
    const n = await Promise.race([
        e0((e) =>
          e
            .from("chars")
            .select("owner,slot")
            .ilike(
              "name",
              A.replace(/[\\%_]/g, (a) => "\\" + a),
            )
            .limit(1),
        ),
        new Promise((e) => setTimeout(() => e(null), 6e3)),
      ]),
      t = n && n.data && n.data[0];
    return !!(t && !(t.owner === b.user.id && +t.slot == +m0));
  } catch {
    return !1;
  }
};

var V8 = function (A, n, t) {
  ((o.fac = "vo" + t),
    (o.sex = n),
    (o.sexSet = 1),
    (o.name = A),
    typeof b < "u" && b.user && (o.netOwner = b.user.id),
    Vf(),
    (l.dirty = !0),
    D0(),
    (l.life = l.P.life),
    (l.mana = l.P.mana),
    uo(),
    tt(),
    n0(!0),
    $(),
    fA("log"),
    Ff(),
    C(
      `<b>${D(A)}</b> (${n ? "nữ" : "nam"}, hệ <span style="color:${w0[t]}">${g0[t]}</span>) bước vào giang hồ. Đạt cấp ${KA} để gia nhập môn phái.`,
    ),
    C(
      `🌱 Nhận <b>Hỗ Trợ Tân Thủ</b>: vòng sáng hồi ${kt.life * 100}% sinh lực + ${kt.mana * 100}% nội lực mỗi giây, <b>+${qi * 100}% kinh nghiệm</b> luyện cấp đến cấp ${pa}.`,
    ));
};

var U8 = function () {
  if (!ht()) return;
  const A = F0(),
    n = vA.filter((e) => e.series === A);
  if (o.lvl < KA) {
    J(
      `<h3>Gia nhập môn phái</h3><p class="desc">Cần đạt cấp ${KA} (hiện cấp ${o.lvl}). Các phái hệ ${g0[A]}: ${n.map((e) => D(e.n)).join(", ")}.</p>`,
    );
    return;
  }
  const t = n
    .map((e) => {
      const a = hn(e, o.sex),
        i = e.starter && T[e.starter];
      return `<button data-j="${e.key}" ${a ? "" : "disabled"} style="--c:${w0[e.series]}"><img src="${(E0.hero[e.key] || {}).img || ""}" alt=""><b>${D(e.n)}</b><small>${a ? `Chiêu nhập môn: ${i ? D(i.n) : "—"} · ${Wf(e)}` : `Chỉ nhận ${Zt[e.key] ? "nữ" : "nam"}`}</small></button>`;
    })
    .join("");
  J(
    `<h3>Gia nhập môn phái <small>hệ ${g0[A]}</small></h3><p class="desc">Đã đạt cấp ${KA}. Chọn môn phái cùng hệ ${g0[A]}: nhận chiêu nhập môn và vũ khí của phái. Điểm kỹ năng tích lũy từ trước vẫn giữ.</p><div class="facpick">${t}</div>`,
    () => {
      document
        .querySelectorAll("#mBody [data-j]")
        .forEach((e) => (e.onclick = () => $v(e.dataset.j)));
    },
  );
};

var $v = function (A) {
  const n = I[A];
  if (!n || n.novice || !ht() || n.series !== F0() || !hn(n, o.sex)) return;
  ((o.fac = A),
    n.starter &&
      !o.sk[n.starter] &&
      ((o.sk[n.starter] = 1), (o.skPts = Math.max(0, o.skPts - 1)), (o.main = n.starter)));
  const t = E(Math.round(o.lvl / 12) + 1, 1, 10),
    e = Kr(n),
    a = _A(e[0], e[1], t, 0);
  if ((a && (o.inv.unshift(a), (R = !0)), o.autoPts === !0)) {
    let i = 0;
    for (const r in o.attr) ((i += o.attr[r]), (o.attrPts += o.attr[r]), (o.attr[r] = 0));
    if (a) {
      const r = bt(a);
      for (const c in r) {
        const d = Math.min(r[c], o.attrPts);
        ((o.attr[c] += d), (o.attrPts -= d));
      }
    }
    ((l.dirty = !0),
      D0(),
      a && p0(a) && J1(a, !0),
      (l.dirty = !0),
      D0(),
      Pt(),
      yt(),
      typeof Bn == "function" && Bn(),
      i && C(`🌊 Vào phái: phân phối lại ${i} điểm tiềm năng theo võ công / vũ khí ${D(n.n)}.`));
  } else a && p0(a) && J1(a, !0);
  (tn(),
    (l.dirty = !0),
    D0(),
    n0(!0),
    V(),
    qA(),
    $(),
    (l.banner = { t: 2.6, text: "Gia nhập " + n.n, sub: "Học võ công ở thẻ Võ công" }),
    C(`<b class="up">Gia nhập <span style="color:${w0[n.series]}">${D(n.n)}</span>!</b>`),
    o0("levelup"));
};

var Ff = function () {
  (J(
    `<h3>JxOffline</h3><p class="desc notice">${D(Zf)}</p><div class="btnrow"><button class="btn" id="bNotice">Đã hiểu</button></div>`,
    () => {
      m("#bNotice").onclick = () => {
        (n0(!0), o.tut || gg(0));
      };
    },
  ),
    C(`<span class="dim">${D(Zf)}</span>`));
};

var dM = function (A) {
  const n = I[A];
  ((o.fac = A),
    (o.sex = ["emei", "cuiyan"].includes(A) ? 1 : 0),
    (o.sexSet = 1),
    (o.name = o.name && o.name !== "Tân thủ" ? o.name : n.n),
    n.starter &&
      ((o.sk[n.starter] = 1), (o.skPts = Math.max(0, o.skPts - 1)), (o.main = n.starter)),
    Vf(),
    (l.dirty = !0),
    D0(),
    (l.life = l.P.life),
    (l.mana = l.P.mana),
    uo(),
    tt(),
    n0(!0),
    $(),
    fA("log"),
    Ff(),
    C(`Gia nhập <b style="color:${w0[n.series]}">${D(n.n)}</b>. Bắt đầu hành tẩu giang hồ!`),
    C(
      `🌱 Nhận <b>Hỗ Trợ Tân Thủ</b>: vòng sáng hồi ${kt.life * 100}% sinh lực + ${kt.mana * 100}% nội lực mỗi giây, <b>+${qi * 100}% kinh nghiệm</b> luyện cấp đến cấp ${pa}.`,
    ));
};

var Vf = function () {
  if (o.eq.weapon) return;
  const A = I[o.fac],
    n = A && !A.novice ? Kr(A) : [0, A && A.wcode >= 0 && A.wcode !== 9 ? A.wcode : 6],
    t = _A(n[0], n[1], 1, 0);
  t && (o.eq.weapon = t);
  const e = _A(2, _a(2, 0), 1, 0);
  e && mn(e) && (o.eq.armor = e);
};

var PA = "log";

var R = !0;

var no = () => 0;

var Uf;

var Tv = 6;

var Ja = (s) =>
  !!(
    (s.set && Ma(s)) ||
    s.vio ||
    s.plv ||
    s.lock ||
    s.thanma ||
    s.pack ||
    s.ktc ||
    (typeof tA == "function" && tA(s))
  );

var to = new Map();

var nn = { str: "Sức mạnh", dex: "Thân pháp", vit: "Sinh khí", eng: "Nội công" };

var Cv = /^(skill_attackradius|missle_|skill_cost_v|skill_eventskilllevel|addskilldamage|skill_)/;

var X8 =
  /^(me2(metal|wood|water|fire|earth)damage_p|(metal|wood|water|fire|earth)2medamage_p|melee_returnres_p|range_returnres_p)$/;

var fM = {
  1055: "Kim Cang Chưởng",
  1056: "Vi Đà Hiến Chử",
  1057: "Tam Giới Quy Thiền",
  1058: "Hào Hùng Trảm",
  1059: "Tung Hoành Bát Hoang",
  1060: "Bá Vương Tạm Kim",
  1061: "Kiếm Hoa Vãn Tinh",
  1062: "Băng Vũ Lạc Tinh",
  1063: "Băng Tước Việt Chi",
  1065: "Thủy Ánh Mạn Tú",
  1066: "Hình Tiêu Cốt Lập",
  1067: "U Hồn Phệ Ảnh",
  1069: "Vô Ảnh Xuyên",
  1070: "Thiết Liên Tứ Sát",
  1071: "Càn Khôn Nhất Trịch",
  1073: "Thời Thừa Lục Long",
  1074: "Bổng Huýnh Lược Địa",
  1075: "Giang Hải Nộ Lan",
  1076: "Tật Hỏa Liêu Nguyên",
  1078: "Tạo Hóa Thái Thanh",
  1079: "Kiếm Thùy Tinh Hà",
  1080: "Cửu Thiên Cương Phong",
  1083: "Long Thừa Bát Nhã Thủ",
  1091: "Lưu Phong Hồi Tuyết Băng Trụ",
  1108: "Phong Minh Ngọc Toái",
  1109: "Lôi Động Càn Khôn",
};

var hM = {
  1084: 1058,
  1086: 1058,
  1087: 1059,
  1088: 1060,
  1094: 1066,
  1096: 1066,
  1099: 1071,
  1100: 1071,
  1101: 1073,
};

var uM = {
  1064: ["Băng Ngưng Hàn Yên", 1063],
  1085: ["Vạn Vật Đế Quy Nhất", 1057],
  1093: ["Khinh Sa Phù Thủy", 1065],
  1095: ["Hồn Ảnh Tùng Sinh", 1067],
  1097: ["Truy Tâm Tỏa Mệnh", 1069],
  1107: ["Kiếm Minh Thương Khung", 1079],
};

var Xf = (() => {
  const s = {};
  for (const A in l1) {
    const n = l1[A];
    (n.sid && (s[n.sid] = [n.n, +A, 2]),
      n.at16 && n.at16.sid && (s[n.at16.sid] = [n.at16.n, +A, 3]));
  }
  return s;
})();

var Ov = {
  orange: "#ff9a3c",
  yellow: "#ffe066",
  red: "#ff6b5b",
  green: "#7dff7d",
  blue: "#6aa8ff",
  white: "#ffffff",
  gold: "#ffd76a",
  purple: "#c77bff",
  water: "#8fd8ff",
  metal: "#ffe8a3",
};

var Ev = (s) =>
  String(s)
    .replace(
      /&lt;color=([a-zA-Z]+)&gt;([\s\S]*?)(?:&lt;color&gt;|$)/g,
      (A, n, t) => `<span style="color:${Ov[n.toLowerCase()] || "inherit"}">${t}</span>`,
    )
    .replace(/&lt;color&gt;/g, "");

var Sv = ["skill_collideevent", "skill_vanishedevent", "skill_startevent", "skill_flyevent"];

var Iv =
  /^(skill_|missle_|addskill|seriesdamage_p|ignoredefense_p|attackrating_[vp]|magicdamage_v)/;

var Nv = [
  ["new", "Mới nhặt"],
  ["rar", "Độ hiếm"],
  ["lvl", "Cấp đồ"],
  ["slot", "Loại"],
  ["pow", "Sức mạnh"],
];

var Jf = Object.fromEntries(un.map(([s], A) => [s, A]).concat([["ring", 7]]));

var Lv = [
  "Cương mãnh, ngoại công mạnh",
  "Độc dược, ám khí",
  "Mềm dẻo, nội công băng",
  "Hỏa công, lực đánh lớn",
  "Lôi, kiếm khí, bền bỉ",
];

var TA = { name: "", sex: 0, s: 0 };

var qv = {
  0: "kiếm",
  1: "đao",
  2: "côn",
  3: "thương",
  4: "chùy",
  5: "song đao",
  7: "ám khí",
  9: "quyền chưởng",
};

var Wf = (s) => qv[s.wcode] || "vũ khí";

var Zf = "JxOffline - Phi thương mại, ưu tiên giải trí trên chính thiết bị của mình";

var eo = function () {
  const A = m("#rotBtn");
  if (!A) return;
  const n = o.rot !== !1;
  ((A.innerHTML = 'Xoay chiêu: <i class="ck"></i>'),
    (A.title = n ? "Xoay chiêu: luân phiên chiêu ở ô F1–F4 khi tự đánh" : "Chỉ đánh chiêu chính"),
    A.classList.toggle("on", n));
};

var J8 = function () {
  ((o.rot = o.rot === !1),
    eo(),
    (l.dirty = !0),
    $(),
    k(
      o.rot !== !1
        ? "Xoay chiêu: luân phiên các chiêu ở ô F1 đến F4 khi tự đánh"
        : "Xoay chiêu tắt: chỉ đánh chiêu chính",
    ));
};

var W8 = function () {
  const A = so();
  document.body.classList.toggle("deskland", A);
  const n = m("#inBtn");
  n && (n.textContent = Hs() ? "🖱 Chuột" : "👆 Chạm");
};

var jv = function () {
  const A = performance.now();
  if ($s && A - oh < 500 && $s.h === M0.h && $s.w === M0.w) return $s;
  oh = A;
  const n = an + 14;
  let t = M0.h - an - 14;
  const e = document.getElementById("battle"),
    a = e && e.getBoundingClientRect();
  if (a && a.width) {
    let i = a.bottom;
    for (const r of ["u20log", "chatBox", "mswBtn", "pad", "u20lt", "u20ct"]) {
      const c = document.getElementById(r);
      if (!c || getComputedStyle(c).visibility === "hidden") continue;
      const d = c.getBoundingClientRect();
      !d.width ||
        !d.height ||
        d.left > a.left + n + an + 8 ||
        d.right < a.left + n - an - 8 ||
        d.bottom < a.top + M0.h * 0.45 ||
        d.top > a.bottom ||
        (i = Math.min(i, d.top));
    }
    t = Math.max(M0.h * 0.42, i - a.top - an - 14);
  }
  return ($s = { x: n, y: t, w: M0.w, h: M0.h });
};

var zv = function () {
  const A = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [],
    n = A.find((r) => r && r.connected);
  if (!n) {
    ((T1.v = [0, 0]), (T1.prev = []));
    return;
  }
  const t = (r) => !!(n.buttons[r] && n.buttons[r].pressed);
  let e = n.axes[0] || 0,
    a = n.axes[1] || 0;
  (Math.hypot(e, a) < 0.25 && ((e = 0), (a = 0)),
    t(14) && (e = -1),
    t(15) && (e = 1),
    t(12) && (a = -1),
    t(13) && (a = 1),
    (T1.v = [e, a]),
    (e || a) && o.fac && !l.town && !$1() && Wa("manual", !0));
  const i = (r) => t(r) && !T1.prev[r];
  if (o.fac) {
    for (let r = 0; r < 4; r++) i(r) && Ac(r);
    (i(4) && Ms("life"), i(5) && Ms("mana"), i(8) && (l.town ? en() : nc()));
  }
  T1.prev = n.buttons.map((r) => !!r.pressed);
};

var Qv = function () {
  if (Y.active && Y.moved) {
    const a = Y.x - Y.ox,
      i = Y.y - Y.oy,
      r = Math.hypot(a, i);
    if (r < 6) return [0, 0];
    const c = Math.min(1, r / an) / r;
    return [a * c, i * c];
  }
  if (T1.v[0] || T1.v[1]) {
    Y.target = null;
    const a = Math.hypot(T1.v[0], T1.v[1]);
    return a > 1 ? [T1.v[0] / a, T1.v[1] / a] : T1.v.slice();
  }
  const A = Y.keys;
  let n = 0,
    t = 0;
  ((A.ArrowLeft || A.a) && (n -= 1),
    (A.ArrowRight || A.d) && (n += 1),
    (A.ArrowUp || A.w) && (t -= 1),
    (A.ArrowDown || A.s) && (t += 1));
  const e = Math.hypot(n, t);
  if (e) return ((Y.target = null), [n / e, t / e]);
  if (Y.target) {
    const a = Y.target.x - v.x,
      i = Y.target.y - v.y,
      r = Math.hypot(a, i);
    return r < 6 ? ((Y.target = null), [0, 0]) : [a / r, i / r];
  }
  return [0, 0];
};

var Ah = function (A) {
  if (actorActionLocked(v)) { v.moving = false; return false; }
  if (hA() && l.clickHold) return !1;
  const [n, t] = Qv();
  if (!n && !t) return (Y.tmp && !Y.active && (Y.tmp = !1), !1);
  const e = 150 * Ra(),
    [a, i] = H5(v.x + n * e * A, v.y + t * e * A);
  return (!gt(v, a, i) && Y.target && (Y.target = null), (l.pickTarget = null), !0);
};

var Wa = function (A, n) {
  ((o.ctrl = A),
    (l.clickHold = false),
    (l.moveTo = null),
    (Y.target = null),
    (Y.tmp = !1),
    qA(),
    n ||
      k(
        A === "manual"
          ? "Tự điều khiển: kéo trên sân để đi, nhân vật tự đánh quái trong tầm"
          : "Tự động: nhân vật tự đi đánh và nhặt đồ",
      ));
};

var nh = function () {
  return Object.keys(o.sk)
    .map(Number)
    .filter((A) => o.sk[A] && UA(T[A]));
};

var tn = function () {
  ((o.slots = (o.slots || [0, 0, 0, 0]).map((A) => (A === -1 ? -1 : A && o.sk[A] ? A : 0))),
    o.trapV || ((o.trapV = 1), (o.slots = o.slots.map((A) => (A > 0 && te(T[A]) ? 0 : A)))));
  for (const A of nh()
    .filter((n) => !te(T[n]))
    .sort((n, t) => T[t].req - T[n].req)) {
    if (o.slots.includes(A)) continue;
    const n = o.slots.indexOf(0);
    if (n < 0) break;
    o.slots[n] = A;
  }
};

var th = function (A, n) {
  if ((tn(), n === -1)) {
    ((o.slots[A] = -1), qA(), $());
    return;
  }
  const t = o.slots.indexOf(n);
  (t >= 0 && (o.slots[t] = o.slots[A]), (o.slots[A] = n), qA(), $());
};

var Z8 = function (A) {
  tn();
  let n = m("#skPick");
  if (n && n.dataset.i === String(A)) {
    n.remove();
    return;
  }
  n && n.remove();
  const t = o.slots[A],
    e = nh().sort((u, w) => T[u].req - T[w].req),
    a = m("#battle");
  ((n = document.createElement("div")), (n.id = "skPick"), (n.dataset.i = A));
  const i = (u) => {
    const w = T[u],
      x = o.slots.indexOf(u);
    return `<b>${D(w.n)}</b> <small>cấp ${o.sk[u] || 0}${x >= 0 && x !== A ? ` · đang ở F${x + 1}` : ""}</small>`;
  };
  ((n.innerHTML =
    `<div class="nm">F${A + 1} · ${t > 0 ? i(t) : "<small>trống</small>"}</div>` +
    (t > 0 ? '<button class="spk spk0" data-ss="-1" title="Bỏ chiêu khỏi ô này">✕</button>' : "") +
    (e
      .map((u) => {
        const w = o.slots.indexOf(u);
        return `<button class="spk${u === t ? " on" : ""}" data-ss="${u}" style="background-image:url('${D(T[u].ic || "")}')">${w >= 0 ? `<i>F${w + 1}</i>` : ""}<u>${o.sk[u] || 0}</u></button>`;
      })
      .join("") || '<small class="dim">Chưa học chiêu tấn công</small>')),
    a.appendChild(n));
  const r = $8(),
    c = a.getBoundingClientRect(),
    d = m(`#pad .sk[data-i="${A}"]`).getBoundingClientRect(),
    f = m("#pad").getBoundingClientRect(),
    h = n.offsetWidth,
    g = E((d.left + d.width / 2 - c.left) / r - h / 2, 4, c.width / r - h - 4);
  ((n.style.left = g + "px"),
    (n.style.bottom = (c.bottom - f.top) / r + 6 + "px"),
    n.querySelectorAll("[data-ss]").forEach((u) => {
      ((u.onpointerenter = () => {
        n.querySelector(".nm").innerHTML =
          `F${A + 1} · ${+u.dataset.ss == -1 ? "<b>Bỏ trống ô này</b>" : i(+u.dataset.ss)}`;
      }),
        (u.onclick = (w) => {
          (w.stopPropagation(), th(A, +u.dataset.ss), n.remove(), PA === "skill" && V());
        }));
    }),
    setTimeout(
      () =>
        document.addEventListener(
          "pointerdown",
          function u(w) {
            n.contains(w.target) ||
              (n.remove(), document.removeEventListener("pointerdown", u, !0));
          },
          !0,
        ),
      0,
    ));
};

var eh = function (A, n) {
  let target = null, nearest = Infinity;
  for (const actor of typeof _1 === "function" ? _1() : []) {
    const height = actor.cls === "boss" ? 150 : 100;
    const width = Math.max(38, (actor.r || 17) + 28);
    const distance = Math.hypot((actor.x - A) / width, (actor.y - height / 2 - n) / (height / 2 + 18));
    if (distance <= 1 && distance < nearest) { nearest = distance; target = actor; }
  }
  return target;
};

var Ac = function (A) {
  tn();
  const n = o.slots[A];
  if (!(n > 0)) {
    Z8(A);
    return;
  }
  if (hA() && typeof _1 == "function") {
    const t = _1();
    t.length && (l.manTgt = c8(t));
  }
  ((o.main = n), (o.mainLock = !0), (l.dirty = !0), D0(), qA(), k("Chiêu chính: " + T[n].n));
};

var Ms = function (A) {
  if (((l.potCd = l.potCd || { life: 0, mana: 0 }), l.potCd[A] > 0)) return;
  const n = ic(A === "mana" ? 1 : 0);
  if (!n) {
    k("Không đủ ngân lượng mua thuốc");
    return;
  }
  const t = n.p;
  (Hd(A, t, n.free),
    (l.potCd[A] = ao),
    k(n.free ? `${t.n} (còn ${C1(t.kind)[t.tier] || 0})` : `${t.n} (-${q(Ot(t))} lượng)`));
};

var nc = function () {
  if (!l.town) {
    if (l.dg) {
      k("Đang trong phó bản / boss tuần");
      return;
    }
    if ((l.tpCd || 0) > 0) {
      k(`Thổ Địa Phù hồi sau ${Math.ceil(l.tpCd)} giây`);
      return;
    }
    ((l.town = !0),
      (l.enemies = []),
      (l.corpses = []),
      (l.pickTarget = null),
      (l.moveTo = null),
      (Y.target = null),
      ma("town"),
      ([v.x, v.y] = X0(O0.w / 2, O0.h / 2)),
      M1(),
      (l.bgImg = bA(E0.town.bg)),
      o0("use"),
      _e(E0.town.id),
      (m("#townName").textContent = E0.town.n),
      m("#townBar").classList.remove("hidden"),
      (l.banner = { t: 2.2, text: E0.town.n, sub: "Hồi phục · bán đồ · trở lại bãi" }),
      C(`Dùng Thổ Địa Phù về <b>${D(E0.town.n)}</b>.`));
  }
};

var en = function () {
  if (l.town) {
    l.town = !1;
    {
      const A = AA(Math.min(o.stage, d0));
      (ma(A.id), ([v.x, v.y] = X0(v.x, v.y)), M1(), (l.unvoid = 1), (l.unvoidT = null));
    }
    ((l.tpCd = ih),
      (o.wave = 1),
      (l.spawnT = 0.5),
      (l.zoneShown = null),
      m("#townBar").classList.add("hidden"),
      Gn(AA(Math.min(o.stage, d0))));
  }
};

var Gv = function (A) {
  ((l.life = Math.min(l.P.life, l.life + l.P.life * 0.25 * A)),
    (l.mana = Math.min(l.P.mana, l.mana + l.P.mana * 0.25 * A)),
    Ah(A));
};

var qA = function () {
  if (!o || !o.fac) return;
  (tn(),
    document.querySelectorAll("#pad .sk").forEach((e) => {
      const a = o.slots[+e.dataset.i],
        i = T[a];
      (e.classList.toggle("empty", !i),
        e.classList.toggle("nowp", !!i && !Ci(i)),
        e.classList.toggle("cur", !!(i && l.P && l.P.main.id === a)),
        (e.querySelector("i").style.backgroundImage = i && i.ic ? `url('${i.ic}')` : ""));
      const r = i ? (o.sk[a] || 0) + (typeof z1 == "function" ? z1(a) : 0) : 0,
        c = i && typeof z1 == "function" ? z1(a) : 0;
      e.title = i
        ? `${i.n} · cấp ${r}${c ? ` (${o.sk[a]}+${c})` : ""}${Ci(i) ? "" : " · cần " + B5[j1(i)]}`
        : "Ô trống";
      let d = e.querySelector(".sklv");
      (d || ((d = document.createElement("u")), (d.className = "sklv"), e.appendChild(d)),
        (d.textContent = i ? r : ""),
        d.classList.toggle("up", !!c));
    }));
  const A = l.P && l.P.main,
    n = m("#bMain");
  if (n) {
    const e = o.eq && o.eq.weapon,
      a = A && l.P.basic === A,
      i = a ? "img/s/8.png" : A && T[A.id] && T[A.id].ic;
    ((n.querySelector("i").style.backgroundImage = i ? `url('${i}')` : ""),
      (n.title = "Chiêu chính: " + (a ? "Đánh thường" : A && T[A.id] ? T[A.id].n : "—")));
  }
  const t = m("#ctrlBtn");
  ((t.innerHTML = 'Auto: <i class="ck"></i>'),
    t.classList.toggle("on", !hA()),
    (t.title = hA() ? "Tự điều khiển (F)" : "Tự động đánh (F)"));
};

var Kv = function () {
  const A = l.potCd || {},
    n = (t, e, a) =>
      t && t.querySelector(".cd").style.setProperty("--p", `${E(e / a, 0, 1) * 100}%`);
  (n(m("#bHp"), A.life || 0, ao), n(m("#bMp"), A.mana || 0, ao), n(m("#bTp"), l.tpCd || 0, ih));
  for (const [t, e] of [
    ["#bHp", 0],
    ["#bMp", 1],
  ]) {
    const a = m(t);
    if (!a || typeof Za != "function") continue;
    const i = Za(e),
      r = i.ic + "|" + i.n + "|" + i.name;
    a._k !== r &&
      ((a._k = r),
      (a.querySelector("i").style.backgroundImage = i.ic ? `url('${i.ic}')` : ""),
      (a.querySelector("em").textContent = i.n || ""),
      (a.title = `${i.name} (phím ${e + 1}) · chuột phải / ▾ để chọn thuốc`));
  }
};
