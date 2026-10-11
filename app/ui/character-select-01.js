// ui/character-select — shared IIFE scope; order is defined in modules.json.
var n_ = function (A) {
  try {
    const n = localStorage.getItem(h1(A));
    if (!n) return null;
    let t;
    try {
      t = t1(n);
    } catch {
      t = null;
    }
    if (!t || !t.ok) {
      const a = localStorage.getItem(h1(A) + "_bak");
      try {
        t = a && t1(a);
      } catch {
        t = null;
      }
    }
    const e = t && t.state;
    return e && e.fac ? e : null;
  } catch {
    return null;
  }
};

var a5 = function (A, n, t) {
  const e = P0.res[A];
  if (!e) return -1;
  if (n && n.set && P0.set) {
    const r = n.set,
      c = P0.set[r.kind],
      d = c && c[r.grp + "." + r.sid + "." + n.d + "." + n.k],
      f = d != null && ((P0.tabs[t] || {})[$f[A]] || {})[d];
    if (f && Object.keys(f).length) return d;
  }
  const a = S8(n),
    i = e[a >= 0 ? a + 2 : 1] ?? e[1];
  return i == null ? -1 : i - 2;
};

var t_ = function (A) {
  if (typeof P0 > "u" || !P0 || !A) return null;
  try {
    const n = A.sex ? "f" : "m",
      t = A.eq || {},
      e = t.weapon,
      a = {
        helm: a5("helm", t.helm, n),
        armor: a5("armor", t.armor, n),
        weapon: a5(e && e.d === 1 ? "range" : "melee", e, n),
        horse: -1,
      };
    a.weapon < 0 && (a.weapon = 0);
    const i = (P0.wnames[n] || [])[a.weapon] || "空手",
      r = P0.assoc[n][i] || P0.assoc[n].空手;
    return { sx: n, rows: a, asc: r ? r[0] : {}, ride: 0 };
  } catch {
    return null;
  }
};

var pi = function () {
  ((u0.on = !1), cancelAnimationFrame(u0.raf));
  const A = m("#csel");
  (A && A.remove(), document.removeEventListener("keydown", Om));
};

var Om = function (A) {
  !u0.on ||
    !m("#modal").classList.contains("hidden") ||
    (A.key === "ArrowLeft"
      ? ((u0.sel = (u0.sel + V1 - 1) % V1), (u0.del = -1), Sr())
      : A.key === "ArrowRight"
        ? ((u0.sel = (u0.sel + 1) % V1), (u0.del = -1), Sr())
        : A.key === "Enter" && Er());
};

var Er = function () {
  const A = u0.sel;
  try {
    (localStorage.setItem(f1, String(A)), sessionStorage.setItem("jxidle_in", String(A)));
  } catch {}
  if (o && o.fac && m0 === A) {
    pi();
    return;
  }
  ((HA = !0), location.reload());
};

var Sr = function s() {
  document
    .querySelectorAll("#csel .cs-slot")
    .forEach((d) => d.classList.toggle("on", +d.dataset.i === u0.sel));
  const A = u0.st[u0.sel],
    n = A && I[A.fac],
    t = m("#csel .cs-panel");
  if (!t) return;
  const e = A && A.rw && A.rw.stat ? A.rw.stat.reborn | 0 : 0,
    a = typeof h0 == "function" && h0(),
    i =
      A && n
        ? `<div class="cs-info"><span>Nhân vật</span><b style="color:${w0[n.series]}">${D(A.name || n.n)}</b><span>Môn phái</span><span>${D(n.n)}</span>
      <span>Đẳng cấp</span><span>${A.lvl | 0 || 1}${e ? ` · CS ${e}` : ""}</span><span>Hệ</span><span style="color:${w0[n.series]}">${g0[n.series]}</span>
      <span>Ngân lượng</span><span>${q(A.gold || 0)}</span><span>Lần chơi cuối</span><span>${A.last ? new Date(A.last).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "-"}</span></div>`
        : `<div class="cs-info" style="display:block;text-align:center">Ô nhân vật ${u0.sel + 1} đang trống</div>`,
    r = u0.del === u0.sel;
  t.innerHTML = `${i}${r ? `<div class="cs-warn">Xóa vĩnh viễn <b>${D(A.name || n.n)}</b> (cấp ${A.lvl})? Không thể khôi phục.</div>` : ""}
    <div class="cs-btns">${A && n ? (r ? '<button class="red" id="csDelY">Xác nhận xóa</button><button id="csDelN">Hủy</button>' : '<button class="go" id="csGo">Vào Game</button><button class="red" id="csDel">Xóa Nhân Vật</button>') : '<button class="go" id="csNew">Tạo Nhân Vật</button>'}
      ${o && o.fac ? '<button id="csBack">Quay lại</button>' : ""}</div>
    <div class="cs-small">${a ? '<button id="csAcc">🌐 Tài khoản</button>' : '<button id="csImp">📂 Nạp từ file</button>'}${a && typeof b < "u" && b.user ? '<button id="csOut" class="out">⏻ Đăng xuất</button>' : ""}</div>`;
  const c = (d, f) => {
    const h = m(d);
    h && (h.onclick = f);
  };
  (c("#csGo", Er),
    c("#csNew", Er),
    c("#csDel", () => {
      ((u0.del = u0.sel), s());
    }),
    c("#csDelN", () => {
      ((u0.del = -1), s());
    }),
    c("#csDelY", () => {
      (pi(), Fd(u0.sel));
    }),
    c("#csBack", () => pi()),
    c("#csAcc", () => Y0("acc")),
    c("#csOut", () => Fg()),
    c("#csImp", () =>
      F8(() => {
        (pi(), Ir());
      }),
    ));
};

var e_ = function s(A) {
  if (!u0.on) return;
  u0.raf = requestAnimationFrame(s);
  const n = (A - u0.t0) / 1e3;
  document.querySelectorAll("#csel .cs-slot canvas").forEach((t) => {
    const e = +t.dataset.i,
      a = u0.st[e],
      i = t.getContext("2d");
    if ((i.clearRect(0, 0, t.width, t.height), !a)) return;
    !u0.look[e] && typeof P0 < "u" && P0 && (u0.look[e] = t_(a));
    const r = u0.look[e],
      c = W;
    let d = !1;
    if (r && typeof It == "function") {
      W = i;
      try {
        d = It("st", 0, e === u0.sel ? n : 0, t.width / 2, t.height - 20, 4.6, 1, null, r);
      } catch {
        d = !1;
      } finally {
        W = c;
      }
    }
    if (!d) {
      const f = Jt(a.fac, a.sex),
        h = f && f.img ? bA(f.img) : null;
      if (h && h.complete && h.naturalWidth) {
        const g = Math.min((t.width * 0.8) / h.naturalWidth, (t.height * 0.85) / h.naturalHeight);
        i.drawImage(
          h,
          (t.width - h.naturalWidth * g) / 2,
          t.height - 18 - h.naturalHeight * g,
          h.naturalWidth * g,
          h.naturalHeight * g,
        );
      }
    }
  });
};

var Ir = function () {
  if (!m("#cselCss")) {
    const e = document.createElement("style");
    ((e.id = "cselCss"), (e.textContent = a_), document.head.appendChild(e));
  }
  (pi(), n0(!0), (u0.st = [...Array(V1).keys()].map(n_)), (u0.look = []), (u0.del = -1));
  const A = u0.st.map((e, a) => (e ? a : -1)).filter((e) => e >= 0);
  let n = -1;
  try {
    n = +localStorage.getItem(f1);
  } catch {}
  u0.sel = Number.isInteger(n) && u0.st[n] ? n : o && o.fac ? m0 : (A[0] ?? 0);
  const t = document.createElement("div");
  ((t.id = "csel"),
    (t.innerHTML = `<div style="text-align:center"><h1>VÕ LÂM IDLE</h1><div class="cs-sub">Chọn nhân vật</div></div>
    <div class="cs-row">${u0.st
      .map((e, a) => {
        const i = e && I[e.fac];
        return `<div class="cs-slot${e ? "" : " empty"}" data-i="${a}"><canvas data-i="${a}" width="300" height="380"></canvas><div class="ped"></div>
        <div class="nm" style="${i ? `color:${w0[i.series]}` : ""}">${e && i ? D(e.name || i.n) : "Trống"}</div><div class="lv">${e && i ? `Cấp ${e.lvl | 0 || 1} · ${D(i.n)}` : "Tạo nhân vật mới"}</div></div>`;
      })
      .join("")}</div>
    <div class="cs-panel"></div>`),
    document.body.appendChild(t),
    t.querySelectorAll(".cs-slot").forEach((e) => {
      ((e.onclick = () => {
        (u0.sel === +e.dataset.i && u0.del < 0) || ((u0.sel = +e.dataset.i), (u0.del = -1), Sr());
      }),
        (e.ondblclick = () => {
          ((u0.sel = +e.dataset.i), Er());
        }));
    }),
    (u0.on = !0),
    (u0.t0 = performance.now()),
    Sr(),
    (u0.raf = requestAnimationFrame(e_)),
    document.addEventListener("keydown", Om));
};

var u0 = { on: !1, sel: 0, del: -1, raf: 0, t0: 0, st: [] };

var a_ = `#csel{position:fixed;inset:0;z-index:55;display:flex;flex-direction:column;align-items:center;justify-content:space-between;color:#e8dcc0;
  background:radial-gradient(ellipse at 50% 60%,#0000 30%,#000d 100%),linear-gradient(#000a,#000d),url(img/z/town.jpg) center/cover #120d08;font-family:inherit;overflow:hidden;padding:14px 10px 18px}
#csel h1{margin:6px 0 0;font-size:clamp(22px,5vw,34px);letter-spacing:3px;color:#f3d27a;text-shadow:0 0 12px #c8902a,0 2px 0 #000}
#csel .cs-sub{font-size:12px;color:#bba;letter-spacing:1px;margin-top:2px}
#csel .cs-row{display:flex;gap:clamp(6px,2vw,28px);justify-content:center;align-items:flex-end;width:100%;max-width:820px;flex:1;min-height:0;padding-top:8px}
#csel .cs-slot{flex:1;max-width:240px;display:flex;flex-direction:column;align-items:center;cursor:pointer;position:relative;transition:filter .2s,transform .2s;filter:brightness(.55) saturate(.7)}
#csel .cs-slot.on{filter:none;transform:translateY(-4px)}
#csel .cs-slot canvas{width:100%;max-height:52vh;aspect-ratio:30/38;display:block}
#csel .cs-slot .ped{width:80%;height:22px;margin-top:-14px;border-radius:50%;background:radial-gradient(ellipse,#d9a54a99 0%,#7a521c55 45%,#0000 70%)}
#csel .cs-slot.on .ped{background:radial-gradient(ellipse,#ffe08acc 0%,#d08a2a77 45%,#0000 72%);box-shadow:0 0 24px #f0b04a55}
#csel .cs-slot .nm{margin-top:6px;font-weight:bold;font-size:clamp(12px,3vw,16px);text-align:center;text-shadow:0 1px 2px #000;min-height:1.3em}
#csel .cs-slot .lv{font-size:clamp(10px,2.6vw,13px);color:#cbb88f;text-align:center;min-height:1.2em}
#csel .cs-slot.empty canvas{opacity:.0}
#csel .cs-slot .plus{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);font-size:clamp(32px,9vw,56px);color:#d9b56a;text-shadow:0 0 10px #000}
#csel .cs-panel{width:100%;max-width:560px;background:linear-gradient(#2a1d10ee,#140d07ee);border:1px solid #8a6a32;border-radius:8px;box-shadow:0 0 0 1px #000,0 6px 24px #000a;padding:10px 12px;margin-top:10px}
#csel .cs-info{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:3px 10px;font-size:13px}
#csel .cs-info span:nth-child(odd){color:#a8946a}
#csel .cs-btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px}
#csel .cs-btns button{min-width:110px;padding:8px 14px;font-weight:bold;border-radius:5px;border:1px solid #a07a34;background:linear-gradient(#5a3f1c,#2e1f0d);color:#f3dfae;cursor:pointer;font-size:14px}
#csel .cs-btns button.go{background:linear-gradient(#b8862e,#6b4612);color:#fff6d8;border-color:#f0c36a;min-width:150px;font-size:15px}
#csel .cs-btns button.red{background:linear-gradient(#6a2318,#33100b);border-color:#b2493a}
#csel .cs-btns button:disabled{opacity:.45;cursor:default}
#csel .cs-small{display:flex;gap:6px;justify-content:center;margin-top:8px;flex-wrap:wrap}
#csel .cs-small button{background:#0006;border:1px solid #6a5430;color:#cdb98a;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer}
#csel .cs-small button.out{border-color:#a0604a;color:#ffc0a8;background:#3a141088}
#csel .cs-warn{color:#ff9a7a;text-align:center;font-size:13px;margin-top:6px}
@media (max-width:520px){#csel .cs-info{grid-template-columns:auto 1fr}#csel .cs-btns button{min-width:0;flex:1}}`;

var Em = function () {
  if (i0.name || typeof o > "u" || !o || !o.fac || !navigator.locks || !navigator.locks.request)
    return;
  i0.name = "jxidle-slot-" + m0;
  try {
    ((i0.ch = new BroadcastChannel("jxidle-tab")), (i0.ch.onmessage = (n) => i_(n.data || {})));
  } catch {
    i0.ch = null;
  }
  ((i0.blocked = !0), (HA = !0));
  const A = (n) =>
    navigator.locks
      .request(i0.name, { ifAvailable: !0 }, (t) => {
        if (!t) {
          if (s_() > c_) {
            Sm();
            return;
          }
          n > 0 ? setTimeout(() => A(n - 1), 1200) : Di("other");
          return;
        }
        return (
          (i0.has = !0),
          (i0.blocked = !1),
          (HA = !1),
          Nr(),
          new Promise((e) => {
            i0.rel = e;
          })
        );
      })
      .catch(() => {
        i0.has && ((i0.has = !1), Di("moved"));
      });
  A(1);
};

var Nr = function () {
  if (i0.has)
    try {
      localStorage.setItem(Nm(), String(Date.now()));
    } catch {}
};

var s_ = function () {
  let A = 0;
  try {
    A = +localStorage.getItem(Nm()) || 0;
  } catch {}
  return Date.now() - A;
};

var Sm = function () {
  navigator.locks &&
    navigator.locks
      .request(
        i0.name,
        { steal: !0 },
        () => (
          (i0.has = !0),
          (i0.blocked = !1),
          (i0.why = ""),
          (HA = !1),
          Nr(),
          document.getElementById("tabLockBox") && n0(!0),
          new Promise((n) => {
            i0.rel = n;
          })
        ),
      )
      .catch(() => {
        i0.has && ((i0.has = !1), Di("moved"));
      });
};

var i_ = function (A) {
  if (!(A.slot !== m0 || A.t !== "yield" || !i0.has)) {
    try {
      typeof $ == "function" && $();
    } catch {}
    ((i0.has = !1), Di("moved"));
    try {
      i0.rel && i0.rel();
    } catch {}
    try {
      i0.ch && i0.ch.postMessage({ t: "released", slot: m0 });
    } catch {}
  }
};

var Di = function (A) {
  ((i0.blocked = !0), (i0.why = A), (HA = !0), Im());
};

var Im = function () {
  if (!i0.blocked || document.getElementById("tabLockBox")) return;
  const A = typeof D == "function" ? D((o && o.name) || "") : "",
    n =
      i0.why === "cloud"
        ? `<h3>⚠ Nhân vật vừa được lưu ở thiết bị / tab khác</h3><p class="desc">Bản trên máy chủ (lúc ${i0.cloudT || "?"}) mới hơn bản đang chạy ở đây. Để không ghi đè (mất đồ vừa nhận / vừa mua), máy này đã <b>dừng lưu</b>.</p>
       <p class="desc dim">Tiến độ chơi ở máy này từ lần lưu trước sẽ không được giữ.</p><div class="btnrow"><button class="btn" id="tabGo">Tải bản mới</button></div>`
        : i0.why === "moved"
          ? `<h3>Nhân vật ${A} đã chuyển sang tab khác</h3><p class="desc">Tab này đã lưu và tạm dừng để không ghi đè tab đang chơi.</p><div class="btnrow"><button class="btn" id="tabGo">Chơi ở tab này</button></div>`
          : `<h3>⚠ Nhân vật ${A} đang mở ở tab khác</h3><p class="desc">Mỗi nhân vật chỉ chạy ở 1 tab để 2 tab không ghi đè bản lưu của nhau. Tab này đang tạm dừng.</p>
         <p class="desc dim">Muốn chơi nhân vật khác song song: chọn ô nhân vật khác ở tab này.</p><div class="btnrow"><button class="btn" id="tabGo">Chơi ở tab này</button> <button class="btn" id="tabMenu">Chọn nhân vật khác</button></div>`;
  J(
    `<div id="tabLockBox">${n}</div>`,
    () => {
      const t = document.getElementById("tabGo");
      t &&
        (t.onclick = () => {
          ((t.disabled = !0), (t.textContent = "Đang chuyển…"), i0.why === "cloud" ? r_() : o_());
        });
      const e = document.getElementById("tabMenu");
      e &&
        (e.onclick = () => {
          try {
            (sessionStorage.removeItem("jxidle_in"), localStorage.setItem(f1, "menu"));
          } catch {}
          location.reload();
        });
    },
    !0,
  );
};

var o_ = async function () {
  HA = !0;
  const A = new Promise((t) => {
    const e = setTimeout(() => t(!1), 2500),
      a = (i) => {
        const r = i.data || {};
        r.t === "released" && r.slot === m0 && (clearTimeout(e), t(!0));
      };
    i0.ch ? i0.ch.addEventListener("message", a) : (clearTimeout(e), t(!1));
  });
  try {
    i0.ch && i0.ch.postMessage({ t: "yield", slot: m0 });
  } catch {}
  if (!(await A) && navigator.locks) {
    Sm();
    return;
  }
  try {
    sessionStorage.setItem("jxidle_in", String(m0));
  } catch {}
  location.reload();
};

var r_ = async function () {
  HA = !0;
  try {
    await Hl(m0, i0.cloudU);
  } catch (A) {
    k("Chưa tải được: " + (A.message || A));
    const n = document.getElementById("tabGo");
    n && ((n.disabled = !1), (n.textContent = "Tải bản mới"));
  }
};

var i0 = { has: !1, blocked: !1, why: "", name: "", ch: null, rel: null };

var c_ = 8e3;

var Nm = () => "jxidle_hb_" + m0;

setInterval(Im, 1e3);
