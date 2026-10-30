// ui/world-shell — shared IIFE scope; order is defined in modules.json.
var dm = function () {
  if (document.getElementById("u20menu")) return;
  const A = (a) => {
    const i = document.createElement("div");
    ((i.innerHTML = a), document.body.appendChild(i.firstElementChild));
  };
  (A(
    `<div id="u20menu">${um.map(([a, i, r]) => `<button class="u20mi" data-u="${a}" title="${r}" style="background-image:url(img/u2/${i}.png)"><i class="dot"></i></button>`).join("")}</div>`,
  ),
    A(
      '<div id="u20rc"><div id="u20trk" style="display:none"></div><button id="u20mail" title="Hộp thư: quà, đồ gửi, đồ mua ở Chợ"><b id="u20mailN"></b></button><button id="u20stb" title="Mã Trường: bộ sưu tập ngựa"><b id="u20stbN"></b></button><button id="u20tt" title="Trợ Thủ Kiếm Hiệp: tự đánh, thuốc, ưu tiên mục tiêu, nhặt đồ"></button><div id="u20travel"></div></div>',
    ));
  m("#u20travel").appendChild(m("#bBack"));
  const tools = document.getElementById("dev-tools");
  if (tools) m("#u20travel").appendChild(tools);
  {
    const a = m("#pwS");
    a &&
      !m("#u20rank") &&
      a.parentNode.insertAdjacentHTML(
        "afterend",
        '<button id="u20rank" title="Bảng xếp hạng">🏆 Hạng</button>',
      );
  }
  (A(
    '<div id="u20zone"><button id="u20zb" title="Bản đồ luyện công"><span id="u20zn"></span> ▾</button><div id="u20zl" class="hidden"></div></div>',
  ),
    A(
      `<div id="u20side">${gm.map(([a, i], r) => `<button class="u20sq" data-s="${r}" data-n="${i}">${a}</button>`).join("")}</div>`,
    ),
    A(
      '<div id="u20r"><button class="u20rb" id="u20gift">Phần<br>thưởng</button><button class="u20rb" id="u20ktc">Kỳ Trân<br>Các</button><button class="u20rb" id="u20mkt">Chợ</button></div>',
    ),
    A(
      '<div id="u20gold"><span><img src="img/ep/knb.png" alt=""><b id="u20knb">0</b></span><span>🪙 <b id="u20g">0</b></span></div>',
    ),
    A(
      `<div id="u20log"><div id="u20lines"></div><div id="u20ct"><button id="u20lt" title="Ẩn / hiện khung thông báo">📜</button>${xB.map(([a, i]) => `<button data-lt="${a}" class="${a === uA ? "on" : ""}" title="${a === "sys" ? "Thông báo hệ thống" : "Bấm lần nữa để mở khung nhắn tin"}">${a === "chat" ? "🌐 " : a === "party" ? "👥 " : ""}${i}<b class="ctn"></b></button>`).join("")}<span id="u20onl"></span><button id="u20hide" title="Ẩn khung thông báo">−</button></div><form id="u20in" autocomplete="off"><button type="button" id="u20ch" title="Đổi kênh chat">Thế giới</button><input id="u20txt" maxlength="150" placeholder="Nhập tin nhắn… (Enter để chat)"><button type="submit" id="u20go">Gửi</button></form></div>`,
    ),
    A('<div id="u20boss"><div class="t"></div><div class="b"><i></i><span></span></div></div>'));
  const n = document.getElementById("panel"),
    t = document.createElement("div");
  ((t.id = "u20wh"),
    (t.innerHTML = '<span id="u20wt"></span><button id="u20wx">✕</button>'),
    n.prepend(t),
    document
      .querySelectorAll("#u20menu .u20mi")
      .forEach(
        (a) =>
          (a.onclick = () =>
            a.dataset.u === "ride"
              ? D8()
              : a.dataset.u === "team"
                ? typeof ui == "function" && ui()
                : bB(a.dataset.u)),
      ),
    (oa = !o || o.u20trk !== !1),
    document
      .querySelectorAll("#u20side .u20sq")
      .forEach((a) => (a.onclick = () => gm[+a.dataset.s][2]())),
    (m("#u20lt").onclick = () => {
      ((o.u20logOff = !o.u20logOff), $(), $2());
    }),
    (m("#u20hide").onclick = () => {
      ((o.u20logOff = !o.u20logOff), $(), $2());
    }),
    (m("#u20ch").onclick = () => {
      (Br(Wl() === "p" ? "w" : "p"), m("#u20txt").focus());
    }),
    (m("#u20in").onsubmit = async (a) => {
      a.preventDefault();
      const i = m("#u20txt"),
        r = i.value;
      if ((!r.trim() && !(typeof H < "u" && H.att)) || typeof yl != "function") {
        i.blur();
        return;
      }
      const c = Wl();
      ((H.chan = c),
        uA !== (c === "p" ? "party" : "chat") &&
          !(uA === "all" && c === "w") &&
          ((uA = c === "p" ? "party" : "chat"),
          document
            .querySelectorAll("#u20ct button[data-lt]")
            .forEach((f) => f.classList.toggle("on", f.dataset.lt === uA))),
        (i.value = ""));
      const d = m("#chatTxt");
      (await yl(r),
        d && d.value && ((i.value = d.value), (d.value = "")),
        (typeof H < "u" && H.att) || (i.placeholder = "Nhập tin nhắn… (Enter để chat)"),
        T2());
    }),
    (m("#u20txt").onkeydown = (a) => {
      a.key === "Escape" && a.target.blur();
    }),
    m("#u20lines").addEventListener("click", (a) => {
      const i = a.target.closest("[data-ci]");
      if (i && typeof xl == "function") {
        xl(+i.dataset.ci);
        return;
      }
      const r = a.target.closest("[data-pn]");
      r && typeof En == "function" && En(r.dataset.pn);
    }));
  {
    const a = (i) => {
      (i && !document.body.classList.contains("u2m")) ||
        (document.body.classList.toggle("u2kb", i),
        setTimeout(
          () => {
            (window.scrollTo(0, 0), jn(), typeof St == "function" && typeof lA < "u" && lA && St());
          },
          i ? 250 : 60,
        ));
    };
    if (
      (m("#u20txt").addEventListener("focus", () => a(!0)),
      m("#u20txt").addEventListener("blur", () =>
        setTimeout(() => {
          document.activeElement !== m("#u20txt") && a(!1);
        }, 120),
      ),
      window.visualViewport)
    ) {
      const i = () => {
        document.body.classList.contains("u2kb") && (window.scrollTo(0, 0), jn());
      };
      (visualViewport.addEventListener("resize", i), visualViewport.addEventListener("scroll", i));
    }
  }
  (window.addEventListener("keydown", (a) => {
    a.key !== "Enter" ||
      /INPUT|TEXTAREA|SELECT/.test(a.target.tagName) ||
      !document.body.classList.contains("u20") ||
      !m("#modal").classList.contains("hidden") ||
      (o && o.u20logOff && ((o.u20logOff = !1), $2()), a.preventDefault(), m("#u20txt").focus());
  }),
    Br(Wl()),
    document.querySelectorAll("#u20ct button[data-lt]").forEach(
      (a) =>
        (a.onclick = () => {
          ((uA = a.dataset.lt),
            uA === "combat" && o && ((o.u20logOff = false), $2()),
            uA === "party" ? Br("p") : (uA === "chat" || uA === "all") && Br("w"),
            document
              .querySelectorAll("#u20ct button[data-lt]")
              .forEach((i) => i.classList.toggle("on", i === a)),
            T2());
        }),
    ),
    $2());
  const e = (a) => () =>
    typeof Y0 == "function" && typeof h0 == "function" && h0()
      ? Y0(a)
      : k("Bản chơi trên máy không có xếp hạng / chợ / thư");
  ((m("#u20mkt").onclick = () =>
    typeof h0 == "function" && h0()
      ? Y0("mkt")
      : J(
          '<h3>Chợ</h3><p class="desc">Chợ trong game gốc là giao dịch giữa người chơi qua máy chủ online. Bản local hiện lưu nhân vật bằng SQLite và chưa có backend giao dịch.</p><p class="dim small">Cửa hàng NPC và Kỳ Trân Các vẫn dùng được trên máy này.</p>',
        )),
    (m("#u20mail").onclick = e("mail")),
    (m("#u20stb").onclick = () => N1("horse")),
    (m("#u20tt").onclick = () => {
      (typeof o0 == "function" && o0("click"), Hr("basic"));
    }));
  {
    const a = m("#u20rank");
    a && (a.onclick = () => zB());
  }
  if (
    ((m("#u20zb").onclick = () => {
      (jB(), qn(m("#u20zone")));
    }),
    (m("#u20wx").onclick = _r),
    (m("#u20gift").onclick = () => Ce(!0)),
    (m("#u20ktc").onclick = () => iA()),
    Vl(t, n),
    n.addEventListener("pointerdown", () => {
      m("#modal").classList.contains("hidden") && qn(n);
    }),
    typeof J == "function")
  ) {
    const a = J;
    J = (...i) => {
      const r = a(...i);
      return (qn(m("#modal")), r);
    };
  }
  if (typeof na == "function") {
    const a = na;
    na = (i) => {
      (a(i), i && qn(m("#chatBox")));
    };
  }
  (hm(), window.addEventListener("resize", hm), setInterval(kB, 250));
};

var Br = function (A) {
  (typeof Nn < "u" && Nn && (A = "w"), (gi = A === "p" ? "p" : "w"));
  const n = m("#u20ch");
  n &&
    ((n.textContent = gi === "p" ? "👥" : "🌐"),
    (n.className = gi === "p" ? "pt" : ""),
    (n.title = (gi === "p" ? "Kênh Tổ đội" : "Kênh Thế giới") + " · bấm để đổi kênh"));
};

var PB = function () {
  const A = m("#u20stb");
  if (!A || ((A.style.display = o && o.fac ? "" : "none"), !o || !o.fac)) return;
  typeof tu == "function" && o.inv.some(L0) && tu() && typeof $ == "function" && $();
  const n = typeof Co == "function" ? Co() : 0;
  let t = 0;
  if (typeof Ie == "function") {
    const i = Ie(),
      r = new Set();
    for (const c of o.inv)
      L0(c) && !c.stOut && st(c) >= 0 && !i.has(Tn(c)) && !r.has(Tn(c)) && (r.add(Tn(c)), t++);
  }
  const e = n + t,
    a = e ? String(e > 99 ? "99+" : e) : "";
  A.dataset.n !== a &&
    ((A.dataset.n = a),
    (m("#u20stbN").textContent = a),
    A.classList.toggle("on", !!e),
    (A.title =
      "Mã Trường: bộ sưu tập ngựa" +
      (n ? ` · ${n} Rương Ngựa chưa mở` : "") +
      (t ? ` · ${t} loài mới chưa cất vào Mã Trường` : "")));
};

var fm = function () {
  const A = m("#arena"),
    n = m("#u20zone");
  if (!A || !n) return;
  const t = A.getBoundingClientRect(),
    e = t.width / (A.clientWidth || t.width || 1);
  Object.assign(n.style, {
    top: t.top + (dA.top + dA.s + 2) * e + "px",
    right: window.innerWidth - t.right + dA.m * e + "px",
    width: dA.s * e + "px",
  });
};

var $2 = function () {
  vB();
  try {
    (jn(), Xl(), Jl());
  } catch {}
};

var vB = function () {
  const A = !!(o && o.u20logOff);
  document.body.classList.toggle("u20logoff", A);
  {
    const t = m("#u20hide");
    t &&
      ((t.textContent = A ? "+" : "−"),
      (t.title = A ? "Hiện khung chat / thông báo" : "Ẩn khung chat / thông báo"));
  }
  const n = m("#u20lt");
  n &&
    (n.classList.toggle("on", !A), (n.title = A ? "Hiện khung thông báo" : "Ẩn khung thông báo"));
};

var qn = function (A) {
  A &&
    document.body.classList.contains("u20") &&
    A.style.setProperty("z-index", String(++_B), "important");
};

var Vl = function (A, n) {
  let t,
    e,
    a,
    i,
    r = !1;
  (A.addEventListener("pointerdown", (c) => {
    if (c.target.tagName === "BUTTON") return;
    ((r = !0), (t = c.clientX), (e = c.clientY));
    const d = n.getBoundingClientRect();
    ((a = d.left), (i = d.top), A.setPointerCapture(c.pointerId));
  }),
    A.addEventListener("pointermove", (c) => {
      r &&
        ((n.style.left = a + c.clientX - t + "px"),
        (n.style.top = Math.max(0, i + c.clientY - e) + "px"),
        (n.style.transform = "none"));
    }),
    A.addEventListener("pointerup", () => {
      r = !1;
    }));
};

var hm = function () {
  const A = mm(),
    n = A && window.innerHeight < 560,
    t = BB();
  (document.body.classList.toggle("u20", A),
    document.body.classList.toggle("u2s", n),
    document.body.classList.toggle("u2m", t));
  for (const a of [
    "u20menu",
    "u20side",
    "u20r",
    "u20gold",
    "u20log",
    "u20boss",
    "u20rc",
    "u20rank",
  ]) {
    const i = document.getElementById(a);
    i && (i.style.display = A ? "" : "none");
  }
  {
    const a = document.getElementById("u20log");
    a && t && (a.style.display = "");
  }
  if (
    ((m("#u20zone").style.display = A || t ? "" : "none"),
    typeof dA < "u" &&
      (A
        ? ((dA.s = n ? 104 : 150), (dA.top = n ? 2 : 4), (dA.m = n ? 4 : 6))
        : ((dA.s = 92), (dA.top = 62), (dA.m = 8))),
    A)
  ) {
    m("#u20r").style.right = dA.s + dA.m + (n ? 6 : 12) + "px";
    const a = dA.s + dA.top + 2;
    Object.assign(m("#u20zone").style, { top: a + "px", right: dA.m + "px", width: dA.s + "px" });
    const i = n && matchMedia("(pointer: coarse)").matches ? 32 : 24;
    ((m("#u20side").style.top = a + i + 4 + "px"), (m("#u20rc").style.top = a + i + 4 + "px"));
  }
  t && fm();
  const e = m("#chatBox");
  if (e) {
    const a = A ? document.body : m("#battle");
    e.parentNode !== a && a.appendChild(e);
  }
  (!A &&
    typeof PA < "u" &&
    o &&
    o.fac &&
    (document.body.classList.remove("u20win"), (C2 = null), (Vt = "sys"), V()),
    typeof dn == "function" && dn() && !O2() && A5(),
    typeof St == "function" && typeof lA < "u" && lA && St(),
    setTimeout(jn, 60));
};

var jn = function () {
  const A = m("#u20log");
  if (!A) return;
  if ((A.scrollLeft && (A.scrollLeft = 0), document.body.classList.contains("u2m"))) {
    const t = m("#arena"),
      e = m("#pad");
    if (!t || !e) return;
    const a = t.getBoundingClientRect(),
      i = e.getBoundingClientRect();
    if (document.body.classList.contains("u2kb")) {
      const f = window.visualViewport,
        h = f ? Math.max(0, window.innerHeight - f.height - f.offsetTop) : 0;
      {
        const g = m("#u20lines");
        g && (g.style.removeProperty("height"), g.style.removeProperty("max-height"));
      }
      Object.assign(A.style, {
        left: a.left + "px",
        width: Math.round(a.width) + "px",
        bottom: Math.round(h) + "px",
        top: "auto",
      });
      return;
    }
    Object.assign(A.style, {
      left: a.left + "px",
      width: Math.round(a.width) + "px",
      bottom: Math.round(window.innerHeight - i.top + 2) + "px",
      top: "auto",
    });
    const r = m("#modeSw"),
      c = m("#u20lines");
    let d = a.top + 40;
    if (r) {
      const f = m("#skBuffs"),
        h = f && f.offsetParent !== null && f.children.length ? f.getBoundingClientRect() : null,
        g = Math.round(Math.max(a.top + 44, h ? h.bottom + 4 : 0));
      for (const [w, x] of [
        ["top", g + "px"],
        ["left", a.left + 4 + "px"],
        ["right", "auto"],
        ["bottom", "auto"],
        ["position", "fixed"],
      ])
        r.style.setProperty(w, x, "important");
      const u = g - r.getBoundingClientRect().top;
      (Math.abs(u) > 1 && r.style.setProperty("top", g + u + "px", "important"),
        (d = r.getBoundingClientRect().bottom));
    }
    if (c && !document.body.classList.contains("u20logoff")) {
      const f = i.top - 2 - (A.offsetHeight - c.offsetHeight),
        h = Math.max(56, Math.min(Math.round(f - d - 6), Math.round(a.height * 0.42))) + "px";
      (c.style.setProperty("max-height", h, "important"),
        c.style.setProperty("height", h, "important"),
        Xl(),
        Jl());
    }
    return;
  }
  if (!document.body.classList.contains("u20")) {
    A.style.width = "";
    return;
  }
  const n = ["#pad", "#modeSw"]
    .map((t) => document.querySelector(t))
    .filter((t) => t && t.offsetParent !== null)
    .map((t) => t.getBoundingClientRect().left)
    .filter((t) => t > 40);
  n.length &&
    A.style.setProperty(
      "width",
      Math.round(Math.max(220, Math.min(470, Math.min(...n) - 8))) + "px",
      "important",
    );
};

var Ul = function (A, n) {
  if (A === "inv" && typeof O2 == "function" && O2()) {
    ym();
    return;
  }
  (n && typeof eA < "u" && (eA = n),
    (C2 = A),
    (A === "tt" || A === "more") && (Vt = A === "tt" ? "tt" : "sys"),
    A !== "tt" && m("#u2ttBody") && (m("#t-more").innerHTML = ""),
    fA(A === "tt" ? "more" : A),
    document.body.classList.add("u20win"),
    qn(m("#panel")));
  const t = um.find((e) => e[0] === A);
  ((m("#u20wt").textContent = t ? t[3] : A === "tt" ? "Trợ Thủ Kiếm Hiệp" : ""),
    document
      .querySelectorAll("#u20menu .u20mi:not([data-u=ride])")
      .forEach((e) => e.classList.toggle("on", e.dataset.u === A)),
    typeof E2 == "function" && E2());
};

var _r = function () {
  ((C2 = null),
    document.body.classList.remove("u20win"),
    document
      .querySelectorAll("#u20menu .u20mi:not([data-u=ride])")
      .forEach((A) => A.classList.remove("on")),
    typeof E2 == "function" && E2());
};

var bB = function (A) {
  if (A === "inv" && typeof O2 == "function" && O2()) {
    GB();
    return;
  }
  C2 === A && document.body.classList.contains("u20win") ? _r() : Ul(A);
};

var OM = function () {
  const A = (t, e, a) =>
      `<label><input type="checkbox" id="${t}" ${e ? "checked" : ""}> ${a}</label>`,
    n = typeof nA == "function" ? nA() : {};
  J(
    `<h3>Trợ Thủ Kiếm Hiệp</h3><div class="u20tt">
    <h4>Chiến đấu</h4>${A("tPvpDamage", typeof pvpDamageDisplay!=="undefined"&&pvpDamageDisplay.enabled, "Hiển thị sát thương người chơi / SIM (chỉ máy này)")}${A("tAuto", !hA(), "Tự đánh (Auto) · phím F")}${A("tRot", o.rot !== !1, "Xoay chiêu ô F1–F4")}${A("tClose", !!o.closeAtk, "Đánh tiếp cận (chạy sát quái rồi mới ra chiêu)")}${A("tBoss", !!o.bossFirst, "Ưu tiên đánh boss (trùm / trùm Hoàng Kim trên bản đồ: bỏ quái thường, chạy tới đánh trùm)")}${A("tRide", o.autoRide !== !1, "Tự lên ngựa khi di chuyển, xuống ngựa khi đánh chiêu không dùng trên ngựa · phím M")}${A("tMap", o.autoMap !== !1, "Tự đổi bãi luyện công theo cấp")}
    <h4>Thuốc</h4>${A("tPot", !o.potOff, "Dùng thuốc khi sinh lực / nội lực dưới 50%")}${A("tBuy", o.potBuy !== !1, "Tự mua thuốc khi hết (tối đa 20% ngân lượng)")}
    <h4>Đồ đạc</h4>${A("tEq", !!o.autoEquip, "Tự mặc đồ tốt hơn khi nhặt")}${A("tJunk", o.autoJunk !== !1, "Tự bán đồ thừa")}${A("tPts", o.autoPts === !0, "Tự cộng điểm tiềm năng và võ công")}
    <h4>Nhiệm vụ</h4>${A("tDt", n.auto !== !1, "Dã Tẩu tự trả / nhận")}${A("tLdt", o.autoLdt !== !1, "Tự dùng Lệnh Bài Dã Tẩu khi hết lượt")}</div>`,
    () => {
      const t = (e, a) => {
        const i = m(e);
        i &&
          (i.onchange = () => {
            (a(i.checked), $());
          });
      };
      t("#tPvpDamage",value=>pvpDamageDisplay.set(value));
      (t("#tAuto", (e) => Wa(e ? "auto" : "manual")),
        t("#tRot", (e) => {
          ((o.rot = e), eo(), (l.dirty = !0));
        }),
        t("#tRide", (e) => {
          o.autoRide = e;
        }),
        t("#tMap", (e) => {
          o.autoMap = e;
        }),
        t("#tClose", (e) => {
          o.closeAtk = e;
        }),
        t("#tBoss", (e) => {
          ((o.bossFirst = e), (o.tgtPri = e ? "hk" : "near"));
        }),
        t("#tPot", (e) => {
          o.potOff = !e;
        }),
        t("#tBuy", (e) => {
          o.potBuy = e;
        }),
        t("#tEq", (e) => {
          o.autoEquip = e;
        }),
        t("#tJunk", (e) => {
          o.autoJunk = e;
        }),
        t("#tPts", (e) => {
          o.autoPts = e;
        }),
        t("#tDt", (e) => {
          nA().auto = e;
        }),
        t("#tLdt", (e) => {
          o.autoLdt = e;
        }));
    },
  );
};

var T2 = function () {
  const A = m("#u20lines");
  A &&
    (A.__stk ||
      ((A.__stk = 1),
      (A._stick = !0),
      A.addEventListener(
        "scroll",
        () => {
          A.clientHeight && (A._stick = A.scrollHeight - A.scrollTop - A.clientHeight < 12);
        },
        { passive: !0 },
      )),
    A.dataset.lt !== uA && (A._stick = !0),
    (A.dataset.lt = uA),
    yB(A),
    Xl(),
    Jl());
};

var Xl = function () {
  const A = m("#u20lines");
  A && A._stick !== !1 && (A.scrollTop = A.scrollHeight);
};

var Jl = function s() {
  const A = m("#u20lines"),
    n = m("#u20log");
  if (!A || !n) return;
  let t = m("#u20sb");
  t ||
    ((t = document.createElement("div")),
    (t.id = "u20sb"),
    (t.innerHTML = "<i></i>"),
    n.appendChild(t),
    A.addEventListener("scroll", s, { passive: !0 }));
  const e = A.clientHeight,
    a = A.scrollHeight;
  if ((t.classList.toggle("no", a <= e + 2 || !e), a <= e + 2 || !e)) return;
  Object.assign(t.style, { top: A.offsetTop + "px", height: e + "px" });
  const i = Math.max(14, (e * e) / a);
  Object.assign(t.firstChild.style, {
    height: i + "px",
    top: ((e - i) * A.scrollTop) / (a - e) + "px",
  });
};

var yB = function (A) {
  if (uA === "combat" && typeof combatLog !== "undefined" && combatLog) { combatLog.render(A); return; }
  if (uA === "party") {
    const t = typeof s0 < "u" ? s0.msgs.slice(-40).map(lm) : [];
    A.innerHTML = t.length
      ? t.map(ti).join("")
      : `<div style="color:#999">${typeof L < "u" && L.pid ? "Chưa có tin nhắn tổ đội · gõ vào ô chat bên dưới" : "Chưa có tổ đội · mở nút Tổ đội trên thanh menu để mời người chơi"}</div>`;
    return;
  }
  if (uA === "chat") {
    A.innerHTML =
      typeof H < "u" && H.msgs.length
        ? H.msgs
            .filter((t) => !ai(t))
            .slice(-40)
            .map(ti)
            .join("")
        : '<div style="color:#999">Chưa có tin nhắn · gõ vào ô chat bên dưới (Enter)</div>';
    return;
  }
  if (uA === "all") {
    const t = [],
      e = l.logT || [],
      a = typeof hr == "function" ? hr : (i) => "";
    ((l.logs || [])
      .slice(0, 40)
      .forEach((i, r) =>
        t.push([e[r] || 0, `<div class="cl syl"><i>${e[r] ? a(e[r]) : ""}</i> ${i}</div>`]),
      ),
      typeof H < "u" &&
        H.msgs
          .filter((i) => !ai(i))
          .slice(-40)
          .forEach((i) => t.push([+i.ts || 0, ti(i)])),
      t.sort((i, r) => i[0] - r[0]),
      (A.innerHTML =
        t
          .slice(-60)
          .map((i) => i[1])
          .join("") || '<div style="color:#999">Chưa có tin</div>'));
    return;
  }
  const n = (l.logs || []).slice(0, 40).reverse();
  A.innerHTML = n.map((t) => `<div>${t}</div>`).join("");
};

var kB = function () {
  if (document.body.classList.contains("u2m") && o && o.fac) {
    (bm(), fm());
    const a = document.getElementById("tabRide");
    a && a.classList.toggle("on", typeof L < "u" && !!L.pid);
    const i =
      (l.logs || []).length + "|" + (l.logs || [])[0] + "|" + (typeof H < "u" ? H.msgs.length : 0) + "|" + (uA === "combat" && typeof combatLog !== "undefined" && combatLog ? combatLog.revision : 0);
    i !== Mr && ((Mr = i), T2());
    return;
  }
  if (!document.body.classList.contains("u20") || !o || !o.fac) return;
  (pm(), bm(), PB());
  {
    const a = typeof h0 == "function" && h0(),
      i = (typeof b < "u" && b.mailN) || 0;
    ((m("#u20mail").style.display = a ? "" : "none"), (m("#u20mkt").style.display = ""));
    const r = m("#u20rank");
    (r && (r.style.display = a ? "block" : "none"),
      (m("#u20mailN").textContent = i ? (i > 9 ? "9+" : i) : ""),
      m("#u20mail").classList.toggle("on", i > 0));
  }
  const A = m("#chatBox");
  A && A.parentNode !== document.body && document.body.appendChild(A);
  for (const a of document.querySelectorAll('#u20menu [data-u="ride"], #tabRide'))
    (a.classList.toggle("on", !!l.mounted), a.classList.toggle("off", !xe()));
  const n =
    (l.logs || []).length + "|" + (l.logs || [])[0] + "|" + (typeof H < "u" ? H.msgs.length : 0) + "|" + (uA === "combat" && typeof combatLog !== "undefined" && combatLog ? combatLog.revision : 0);
  (n !== Mr && ((Mr = n), T2()),
    (m("#u20g").textContent = q(o.gold)),
    (m("#u20knb").textContent = F(o.knb || 0)));
  const t =
      l.enemies &&
      l.enemies
        .filter((a) => !a.dead && a.cls === "boss" && Math.hypot(a.x - v.x, a.y - v.y) < 700)
        .sort((a, i) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(i.x - v.x, i.y - v.y))[0],
    e = m("#u20boss");
  if (t) {
    ((e.style.display = "block"), (e.querySelector(".t").textContent = `${t.n} · Lv ${t.L}`));
    const a = Math.max(0, (t.hp / t.max) * 100);
    // The focused boss HUD follows the same alliance colors as its nameplate.
    e.querySelector("i").style.background = t.battlefieldTeam && typeof arenaSimulator !== "undefined" && arenaSimulator
      ? arenaSimulator.battlefieldHealthColor(t.battlefieldTeam, arenaSimulator.battlefield.state.team) : "";
    ((e.querySelector("i").style.width = a + "%"),
      (e.querySelector("span").textContent = a.toFixed(1) + "%"));
  } else e.style.display = "none";
  for (const [a, i] of [
    ["char", "dotChar"],
    ["skill", "dotSkill"],
    ["forge", "dotForge"],
    ["quest", "dotQuest"],
  ]) {
    const r = document.getElementById(i),
      c = document.querySelector(`#u20menu [data-u="${a}"] .dot`);
    r && c && c.classList.toggle("on", r.classList.contains("on"));
  }
};

var um = [
  ["char", "char", "Nhân vật", "Nhân vật"],
  ["inv", "inv", "Hành trang", "Vật phẩm"],
  ["skill", "skill", "Võ công", "Kỹ năng"],
  ["team", "team", "Tổ đội", "Tổ đội"],
  ["forge", "forge", "Lò rèn", "Lò rèn"],
  ["quest", "quest", "Nhiệm vụ · Phó bản", "Chỉ nam nhiệm vụ"],
  ["more", "more", "Hệ thống", "Hệ thống"],
];

var gm = [];

var xB = [
  ["chat", "Thế giới"],
  ["party", "Tổ đội"],
  ["sys", "Hệ thống"],
  ["combat", "Log"],
];

var uA = "chat";

var C2 = null;

var mm = () =>
  !!o &&
  window.innerWidth > window.innerHeight &&
  (window.innerWidth >= 900 || (window.innerWidth >= 640 && window.innerHeight <= 520));

var BB = () => !!o && !mm();

var gi = "w";

var Wl = () => gi;

var _B = 50;

var EM = (s) =>
  /class="xpl"/.test(s)
    ? "fight"
    : /Nhặt được|rơi ra|Tự mua|Hành trang đầy/.test(s)
      ? "loot"
      : /📜|Dã Tẩu|Sát Thủ|Phó bản|🏯|thuyền/i.test(s)
        ? "quest"
        : /Hạ |xuất hiện|trọng thương|Trùm|trốn thoát/.test(s)
          ? "fight"
          : "sys";

var Mr = -1;

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", () => setTimeout(dm, 300))
  : setTimeout(dm, 300);

setInterval(() => {
  try {
    jn();
  } catch {}
}, 2e3);

{
  let s = 0;
  const A = () => {
    s ||
      (s = requestAnimationFrame(() => {
        s = 0;
        try {
          jn();
        } catch {}
      }));
  };
  if (window.ResizeObserver) {
    const n = new ResizeObserver(A),
      t = () => {
        for (const e of ["#arena", "#pad", "#u20log", "#battle"]) {
          const a = document.querySelector(e);
          a && !a.__u20ro && ((a.__u20ro = 1), n.observe(a));
        }
      };
    (t(), setInterval(t, 3e3));
  }
  (new MutationObserver(A).observe(document.body, { attributes: !0, attributeFilter: ["class"] }),
    window.addEventListener("resize", A));
}
