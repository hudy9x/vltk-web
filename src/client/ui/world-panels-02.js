// ui/world-panels — shared IIFE scope; order is defined in modules.json.
var jB = function s(A) {
  const n = m("#u20zl");
  if (!A && !n.classList.contains("hidden")) {
    (n.classList.add("hidden"), m("#u20zone").style.removeProperty("z-index"));
    return;
  }
  const t = AA(Math.min(o.stage, d0)),
    e = k0
      .map((r, c) => {
        if (![r].concat(Un[c] || []).some(zone => MapsEngine.isMapAvailable(zone.id))) return "";
        const d = Wo(c),
          f = DA(Math.min(o.stage, d0)) === c,
          h = Un[c],
          g = (o.zalt || {})[c] || 0,
          u = [r].concat(h || []).find((zone, index) => index === g && MapsEngine.isMapAvailable(zone.id)) || [r].concat(h || []).find(zone => MapsEngine.isMapAvailable(zone.id)) || r,
          w =
            h && d
              ? `<div class="zalt">${[r]
                  .concat(h)
                  .map(
                    (x, p) =>
                      MapsEngine.isMapAvailable(x.id) ? `<button class="chip2${p === g ? " on" : ""}" data-za="${c}:${p}">${D(x.n)}</button>` : "",
                  )
                  .join("")}</div>`
              : "";
        return `<button class="zrow${f ? " cur" : ""}${d ? "" : " lock"}" data-z="${c}" ${d ? "" : "disabled"}><b>${D(u.n)}</b><span>${Lf(u)} Cấp ${r.lo}–${r.hi}</span></button>${w}`;
      })
      .join("");
  ((n.innerHTML = `<div class="u2zh"><b>Bản đồ luyện công</b><label><input type="checkbox" id="u20za" ${o.autoMap !== !1 ? "checked" : ""}> Tự đổi theo cấp</label></div>
    <div class="u2zs">Quái hệ: ${Nf(t)}</div><div class="u2zr">${e}</div>`),
    n.classList.remove("hidden"));
  const a = n.querySelector(".zrow.cur");
  a && !A && a.scrollIntoView({ block: "center" });
  const i = (r) => {
    ((o.mode === "quest" || o.mode === "dg") &&
      ((o.mode = "farm"), C("⚔ Chọn bãi luyện công: chuyển sang chế độ Luyện công.")),
      (o.autoMap = !1),
      On(r, "Chọn bãi luyện công", false, true),
      $(),
      V(),
      n.classList.add("hidden"));
  };
  (n.querySelectorAll(".zrow").forEach((r) => (r.onclick = () => i(+r.dataset.z))),
    n.querySelectorAll("[data-za]").forEach(
      (r) =>
        (r.onclick = () => {
          const [c, d] = r.dataset.za.split(":").map(Number);
          (((o.zalt || (o.zalt = {}))[c] = d),
            i(c),
            s(!0));
        }),
    ),
    (m("#u20za").onchange = (r) => {
      ((o.autoMap = r.target.checked), $());
    }));
};

var zB = async function s() {
  if (typeof h0 != "function" || !h0()) return k("Bản chơi trên máy không có bảng xếp hạng");
  const A = pr
    .map(([i, r]) => `<button data-rk="${i}" class="${i === b.rank ? "on" : ""}">${r}</button>`)
    .join("");
  J(
    `<h3>Bảng Xếp Hạng</h3><div class="dtabs" id="rkTabs">${A}</div><div id="rkBody"><p class="dim small">Đang tải…</p></div>`,
    () => {
      document.querySelectorAll("#rkTabs [data-rk]").forEach(
        (i) =>
          (i.onclick = () => {
            ((b.rank = i.dataset.rk), s());
          }),
      );
    },
  );
  try {
    await si();
  } catch (i) {
    const r = m("#rkBody");
    r && (r.innerHTML = `<p class="reqbad">${D(i.message)}</p>`);
    return;
  }
  const n = m("#rkBody");
  if (!n) return;
  try {
    await Kg(n);
  } catch (i) {
    n.innerHTML = `<p class="reqbad">${D(i.message || i)}</p>`;
    return;
  }
  const t = m("#nrCol");
  t && (t.style.display = "none");
  const e = m("#nrFac");
  (e &&
    (e.onchange = (i) => {
      ((b.rfac = i.target.value), s());
    }),
    n.querySelectorAll("[data-pn]").forEach(
      (i) =>
        (i.onclick = (r) => {
          (r.preventDefault(), En(i.dataset.pn, () => s()));
        }),
    ));
  const a =
    o &&
    o.name &&
    [...n.querySelectorAll("tr")].findIndex(
      (i) => i.querySelector("[data-pn]") && i.querySelector("[data-pn]").dataset.pn === o.name,
    );
  n.insertAdjacentHTML(
    "afterbegin",
    `<p class="small">Hạng của bạn: <span class="gold" style="font-weight:700">${a > 0 ? "#" + a : "ngoài top 50"}</span>${b.user ? "" : ' <span class="dim">(đăng nhập ở Hệ thống › Tài khoản để có tên trên bảng)</span>'}</p>`,
  );
};

var O2 = function () {
  return (
    document.body.classList.contains("u20") &&
    !document.body.classList.contains("u2m") &&
    matchMedia("(hover: hover) and (pointer: fine)").matches
  );
};

var dn = function () {
  return document.body.classList.contains("u2bagon");
};

var Zl = function () {
  if (m("#u2bagcss")) return;
  const A = [],
    n = (i) =>
      i
        .replace(/#panel\b/g, "#u2bagw")
        .replace(/#u20wh\b/g, "#u2bwh")
        .replace(/#u20wt\b/g, "#u2bwt")
        .replace(/#u20wx\b/g, "#u2bwx"),
    t = (i) =>
      i
        .replace(/#panel\b/g, "#u2rxw")
        .replace(/#u20wh\b/g, "#u2rwh")
        .replace(/#u20wt\b/g, "#u2rwt")
        .replace(/#u20wx\b/g, "#u2rwx"),
    e = (i, r) => {
      for (const c of i) {
        if (c.cssRules && c.media) {
          const f = [];
          (e(c.cssRules, f), f.length && A.push(`@media ${c.media.mediaText}{${f.join("")}}`));
          continue;
        }
        if (!c.selectorText || !/#panel\b|#u20wh\b|#u20wx\b|#u20wt\b/.test(c.selectorText))
          continue;
        const d = c.selectorText
          .split(",")
          .filter(
            (f) =>
              /#panel\b|#u20wh\b|#u20wx\b|#u20wt\b/.test(f) && !/u20win|data-u2t|u2m\b/.test(f),
          )
          .map(n);
        if (d.length) {
          const f = c.selectorText
            .split(",")
            .filter(
              (h) =>
                /#panel\b|#u20wh\b|#u20wx\b|#u20wt\b/.test(h) && !/u20win|data-u2t|u2m\b/.test(h),
            );
          (r || A).push(
            `${d.join(",")}{${c.style.cssText}}`,
            `${f.map(t).join(",")}{${c.style.cssText}}`,
          );
        }
      }
    };
  for (const i of document.styleSheets) {
    let r;
    try {
      r = i.cssRules;
    } catch {
      continue;
    }
    r && e(r, null);
  }
  (A.push(
    "body.u20 #u2bagw{display:none!important}body.u20.u2bagon #u2bagw{display:block!important;left:auto;right:200px;top:64px;transform:none!important;width:262px;max-height:calc(100vh - 160px);overflow:auto}",
  ),
    A.push("body.u2s.u2bagon #u2bagw{width:346px;top:2px;right:4px;max-height:calc(100vh - 4px)}"),
    A.push("body.u20.u2bagon #u2bagw{overflow-x:hidden}body.u2s.u2bagon #u2bagw{width:262px}"),
    A.push(
      "body.u20 #u2rxw{display:none!important}body.u20.u2rxw #u2rxw{display:block!important;left:auto;right:470px;top:64px;transform:none!important;width:auto;max-height:calc(100vh - 160px);overflow:auto}body.u2s.u2rxw #u2rxw{top:2px;right:272px;max-height:calc(100vh - 4px)}#u2rxw .u2rx{display:block!important;padding:4px 10px 0}#u2rxw .u2rxt{display:none}",
    ),
    A.push(
      "#u2tip{position:fixed;z-index:99999;pointer-events:none;max-width:340px;background:var(--w2bg,#1b1a14);border:1px solid var(--w2ln,#8a7f55);outline:1px solid #000;box-shadow:0 4px 18px #000;color:var(--w2tx,#eee);padding:8px 10px;border-radius:4px;font-size:12px;display:none}#u2tip .idet .pic{width:40px;height:40px}#u2tip .cmp,#u2tip .cp{font-size:11px}#u2tip{max-height:92vh;overflow:hidden}#u2tip.sm{max-width:280px;padding:4px 8px}#u2tip .u2tt{white-space:pre-line}#u2tip .btnrow,#u2tip button{display:none!important}",
    ));
  const a = document.createElement("style");
  ((a.id = "u2bagcss"),
    (a.textContent = A.join(`
`)),
    document.head.appendChild(a));
};

var $r = function () {
  let A = m("#u2bagw");
  return (
    A ||
    (Zl(),
    (A = document.createElement("div")),
    (A.id = "u2bagw"),
    (A.innerHTML =
      '<div id="u2bwh"><span id="u2bwt">Hành trang</span><button id="u2bwx">✕</button></div>'),
    document.body.appendChild(A),
    (m("#u2bwx").onclick = A5),
    Vl(m("#u2bwh"), A),
    A.addEventListener("pointerdown", () => {
      m("#modal").classList.contains("hidden") && qn(A);
    }),
    A)
  );
};

var E2 = function () {
  const A = document.querySelector('#u20menu .u20mi[data-u="inv"]');
  A &&
    A.classList.toggle("on", dn() || (C2 === "inv" && document.body.classList.contains("u20win")));
};

var ym = function () {
  const A = $r(),
    n = m("#t-inv");
  (C2 === "inv" && document.body.classList.contains("u20win") && _r(),
    n.parentNode !== A && A.appendChild(n),
    n.classList.remove("hidden"),
    document.body.classList.add("u2bagon"),
    qn(A),
    (R = !1),
    An(),
    E2());
};

var A5 = function () {
  document.body.classList.remove("u2bagon");
  const A = m("#t-inv"),
    n = m("#panel");
  (A && n && A.parentNode !== n && n.appendChild(A), document.body.classList.remove("u2rxw"));
  {
    const t = m("#u2rwb");
    t && (t.innerHTML = "");
  }
  (A && A.classList.toggle("hidden", PA !== "inv"), E2(), S2());
};

var QB = function (A) {
  let n = m("#u2rxw");
  n ||
    (Zl(),
    (n = document.createElement("div")),
    (n.id = "u2rxw"),
    (n.innerHTML =
      '<div id="u2rwh"><span id="u2rwt">Mở rộng rương</span><button id="u2rwx">✕</button></div><div id="u2rwb"></div>'),
    document.body.appendChild(n),
    (m("#u2rwx").onclick = () => {
      ((dt = !1), An());
    }),
    Vl(m("#u2rwh"), $r()),
    n.addEventListener("pointerdown", () => {
      m("#modal").classList.contains("hidden") && (qn($r()), qn(n));
    }),
    new MutationObserver(n5).observe($r(), { attributes: !0, attributeFilter: ["style"] }),
    window.addEventListener("resize", n5));
  const t = m("#u2rwb"),
    e = document.body.classList.contains("u2rxw");
  ((t.innerHTML = ""),
    dt
      ? (t.appendChild(A), (A.hidden = !1), document.body.classList.add("u2rxw"), e || qn(n), n5())
      : (A.remove(), document.body.classList.remove("u2rxw")));
};

var n5 = function () {
  const A = m("#u2rxw"),
    n = m("#u2bagw");
  if (!A || !n || !document.body.classList.contains("u2rxw")) return;
  const t = n.getBoundingClientRect(),
    e = A.offsetWidth || 250;
  let a = t.left - e + 1;
  (a < 2 && (a = Math.min(window.innerWidth - e - 2, t.right - 1)),
    A.style.setProperty("left", Math.round(a) + "px", "important"),
    A.style.setProperty("top", Math.round(t.top) + "px", "important"),
    A.style.setProperty("right", "auto", "important"));
  const i = +getComputedStyle(n).zIndex || 0;
  i && A.style.setProperty("z-index", String(i), "important");
};

var GB = function () {
  dn() ? A5() : ym();
};

var KB = function (A) {
  const n = [
    o.inv,
    Object.values(o.eq || {}),
    typeof R0 == "function" ? R0() : [],
    typeof a0 == "function" ? a0() : [],
  ];
  for (const t of n) {
    const e = (t || []).find((a) => a && a.uid === A);
    if (e) return e;
  }
  return null;
};

var S2 = function () {
  const A = m("#u2tip");
  (A && (A.style.display = "none"), (Or.uid = null));
};

var km = function (A, n) {
  const t = m("#u2tip");
  if (!t || t.style.display === "none") return;
  const e = t.getBoundingClientRect(),
    a = window.innerWidth,
    i = window.innerHeight;
  let r = A + 16,
    c = n + 14;
  (r + e.width > a - 4 && (r = A - e.width - 12),
    c + e.height > i - 4 && (c = Math.max(4, i - e.height - 4)),
    (t.style.left = Math.max(4, r) + "px"),
    (t.style.top = c + "px"));
};

var RB = function (A) {
  if (!A || !A.closest) return null;
  const n = A.closest("[data-uid],[data-x]");
  if (n) {
    const r = +(n.dataset.uid || n.dataset.x),
      c = KB(r) || to.get(r);
    if (c) {
      const d = Object.values(o.eq || {}).includes(c);
      let f = "";
      try {
        f = Z1(c) + (d ? "" : If(c));
      } catch {
        f = "";
      }
      if (f) return { k: "i" + r, h: f };
    }
  }
  let t = 0;
  const e = A.closest(".u2k[data-id],.skl[data-id]");
  if ((e && (t = +e.dataset.id), !t)) {
    const r = A.closest("[data-ss]");
    r && +r.dataset.ss > 0 && (t = +r.dataset.ss);
  }
  if (!t) {
    const r = A.closest("#pad .sk[data-i]");
    r && (t = +(o.slots || [])[+r.dataset.i] || 0);
  }
  if (t && T[t]) {
    const r = o.sk[t] || 0,
      c = r && typeof z1 == "function" ? z1(t) : 0,
      d = r + c,
      f = T[t];
    let h = "";
    try {
      h = Kf(t, r, c, d, Math.max(1, d), r < f.max ? d + 1 : 0);
    } catch {
      h = "";
    }
    if (h) return { k: "s" + t + ":" + d, h };
  }
  const a = A.closest("[data-mi]");
  if (a && typeof Cr < "u" && Cr[a.dataset.mi]) {
    const r = a.dataset.mi;
    return {
      k: "m" + r,
      h: `<h4>${D(rt(r))}</h4><div class="desc">${D(Cr[r])}</div><div class="small">Đang có: <b>${N("misc", r)}</b></div>`,
    };
  }
  const i = A.closest("[title],[data-tip]");
  if (i && !/^(INPUT|TEXTAREA|SELECT)$/.test(i.tagName)) {
    i.title && ((i.dataset.tip = i.title), i.removeAttribute("title"));
    const r = i.dataset.tip;
    if (r && r.trim()) return { k: "t" + r, h: `<div class="u2tt">${D(r)}</div>` };
  }
  return null;
};

// Delegate to the document so quick equip survives panel and bag re-renders.
var quickEquipContextMenu = function (event) {
  const button = event.target.closest && event.target.closest(".it[data-uid]");
  if (!button || !o || !o.fac) return;
  const modal = m("#modal");
  if (modal && !modal.classList.contains("hidden")) return;
  const slot = button.closest("#t-char .slot[data-slot]"),
    inBag = button.closest("#t-inv .invgrid, #t-inv-bag .invgrid"),
    item = slot ? o.eq[slot.dataset.slot] : inBag && o.inv.find((entry) => entry.uid === +button.dataset.uid);
  if (!item || item.uid !== +button.dataset.uid || item.pack || item.ktc || !rA[item.d]) return;
  event.preventDefault();
  event.stopPropagation();
  S2();
  if (slot) Dv(slot.dataset.slot);
  else J1(item);
};

var xm = function () {
  window.__u2tip ||
    ((window.__u2tip = 1),
    document.addEventListener("mouseover", (A) => {
      if (!O2() || !o || !o.fac) {
        S2();
        return;
      }
      if (
        !m("#modal").classList.contains("hidden") &&
        A.target.closest &&
        !A.target.closest("#modal")
      ) {
        S2();
        return;
      }
      const t = RB(A.target);
      if (!t) {
        S2();
        return;
      }
      if (Or.uid === t.k) return;
      let e = m("#u2tip");
      (e ||
        (Zl(), (e = document.createElement("div")), (e.id = "u2tip"), document.body.appendChild(e)),
        (e.innerHTML = t.h),
        e.classList.toggle("sm", t.k[0] === "t"),
        (e.style.display = "block"),
        (Or.uid = t.k),
        km(A.clientX, A.clientY));
    }),
    document.addEventListener(
      "mousemove",
      (A) => {
        Or.uid != null && km(A.clientX, A.clientY);
      },
      { passive: !0 },
    ),
    document.addEventListener("contextmenu", quickEquipContextMenu),
    document.addEventListener("pointerdown", S2, !0),
    window.addEventListener("blur", S2));
};

var Bm = () => document.body.classList.contains("u20");

var zn = () => Bm() || document.body.classList.contains("u2m");

var a1 = { char: Bs, skill: Zn, inv: An, forge: ll, quest: m2, more: Ao, ktc: iA };

var Vt = "sys";

var q1 = "basic";

var oa = !0;

var Tr = (s) => (
  (s = Math.floor(s)),
  s >= 1e4 ? `${F(Math.floor(s / 1e4))} vạn ${s % 1e4} lượng` : `${s} lượng`
);

var I2 = (s) => {
  document.body.dataset.u2t = s;
};

var YB = {
  helm: [92, 8, 64, 64],
  amulet: [180, 8, 60, 40],
  cuff: [12, 34, 46, 66],
  armor: [92, 80, 64, 98],
  weapon: [180, 56, 60, 112],
  ring1: [12, 108, 46, 40],
  ring2: [12, 154, 46, 40],
  belt: [92, 186, 64, 34],
  pendant: [12, 200, 46, 66],
  boot: [180, 176, 60, 62],
  horse: [92, 228, 64, 64],
};

var t5 = (s) => Math.floor(s || 0).toLocaleString("vi-VN");

var _m = [
  ["vlmt", "img/ep/mt90.png"],
  ["ttk", "img/ep/dtbk.png"],
  ["rngua", "img/ep/box2.png"],
  ["ldt", "img/ep/ldt.png"],
];

var Cr = {
  vlmt: "Từ cấp 80: +1 điểm kỹ năng / cuốn · mỗi nhân vật tối đa 15 cuốn, mỗi lần chuyển sinh +5",
  ttk: "Từ cấp 80: +1 → 5 điểm tiềm năng / cuốn (cấp 88 trở lên +5) · tối đa 15 cuốn, mỗi lần chuyển sinh +15",
  rngua: "Mở ra 1 con ngựa (Thường → Chí tôn)",
  ldt: "+20 lượt Dã Tẩu trong ngày · tối đa 5 / ngày",
};

var Mm = () => _m.filter(([s]) => N("misc", s) > 0);

var FB = () =>
  Mm()
    .map(
      ([s, A]) =>
        `<button class="it r1 mi" data-mi="${s}" title="${D(rt(s))}"><img src="${A}" alt=""><i>${N("misc", s)}</i></button>`,
    )
    .join("");

var dt = !1;

var Qn = 0;

var VB = [
  ["dt", "Dã Tẩu"],
  ["st", "Sát Thủ"],
];

var Hm = [
  ["dg", "Phó bản"],
  ["boat", "Đi thuyền"],
  ["tower", "Tháp thử thách"],
  ["wb", "Boss tuần"],
  ["horse", "Mã trường"],
  ["pet", "Đồng hành"],
];

var UB = (s) => Hm.some((A) => A[0] === s);

var XB = (s) =>
  s === "boat"
    ? tl()
    : s === "tower"
      ? xh()
      : s === "pet"
        ? Bh()
        : s === "dg"
          ? vu()
          : s === "wb"
            ? bu()
            : s === "horse"
              ? su()
              : Uh();

var e5 = [
  ["Tiện ích", ["knb", "tt", "tsbl", "bch", "ldt"]],
  ["Quý hiếm", ["rht", "rda", "mt90", "mt120", "mt150", "dtbk", "vlmt", "ttk"]],
  ["Đặc biệt", ["ldp", "dgt"]],
  ["Thú cưỡi", ["rngua"]],
];

var wi = 0;

var JB = [
  ["basic", "Cơ bản"],
  ["skill", "Kỹ năng"],
  ["loot", "Nhặt đồ"],
  ["other", "Khác"],
];

var $m = () => JB;

var WB = () =>
  `<div class="u2tabs">${$m()
    .map(([s, A]) => `<button data-tt="${s}" class="${q1 === s ? "on" : ""}">${A}</button>`)
    .join("")}</div>`;

var Tm = () => PA === "more" && Vt === "tt" && q1 === "loot";

Bs = () => (zn() ? (I2("char"), HB()) : a1.char());

Zn = () => (zn() ? (I2("skill"), $B()) : a1.skill());

An = () => (zn() ? (Tm() ? qB() : (dn() || I2("inv"), wm())) : a1.inv());

ll = () => (zn() ? (I2("forge"), OB()) : a1.forge());

m2 = () => (zn() ? (I2("quest"), SB()) : a1.quest());

Ao = () => (zn() ? (I2(Vt === "tt" ? "tt" : "more"), LB()) : a1.more());

iA = () => (zn() ? IB() : a1.ktc());

var ZB = [
  ["dg", "Phó bản"],
  ["boat", "Đi thuyền"],
  ["tower", "Tháp"],
  ["wb", "Boss tuần"],
  ["horse", "Mã trường"],
  ["pet", "Đồng hành"],
];

var Cm = N1;

N1 = (s) => {
  if (!zn()) return Cm(s === "boat" ? "dg" : s);
  if (!o.fac) return;
  if (s === "dt" || s === "st") {
    mi("quest", s);
    return;
  }
  if (s === "tm") {
    ((wi = e5.length - 1), iA());
    return;
  }
  (s && (yA = s), (yA === "tm" || yA === "rec") && (yA = "dg"));
  const A = () =>
    ZB.map(([n, t]) => `<button data-a="${n}" class="${n === yA ? "on" : ""}">${t}</button>`).join(
      "",
    );
  if (yA !== "boat") {
    Cm();
    const n = m("#actTabs");
    n &&
      ((n.innerHTML = A()),
      n.querySelectorAll("button").forEach((t) => (t.onclick = () => N1(t.dataset.a))));
    return;
  }
  J(`<h3>Hoạt động</h3><div class="dtabs" id="actTabs">${A()}</div>${tl()}`, () => {
    (document
      .querySelectorAll("#actTabs button")
      .forEach((n) => (n.onclick = () => N1(n.dataset.a))),
      el(m("#mBody")));
  });
};

var A_ = n0;

n0 = (s) => {
  (A_(s), m("#modal").classList.remove("u2ktc"));
};

document.addEventListener("pointerdown", (s) => {
  const A = m("#u20zone");
  if (A && !A.contains(s.target)) {
    const n = m("#u20zl");
    n &&
      !n.classList.contains("hidden") &&
      (n.classList.add("hidden"), A.style.removeProperty("z-index"));
  }
});

var Or = { uid: null };

document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", xm) : xm();
