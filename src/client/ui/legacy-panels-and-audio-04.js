// ui/legacy-panels-and-audio — shared IIFE scope; order is defined in modules.json.
var Rv = function () {
  const A = (e) => {
    const a = lA.getBoundingClientRect(),
      i = $8();
    return [(e.clientX - a.left) / i, (e.clientY - a.top) / i];
  };
  (lA.addEventListener("pointerdown", (e) => {
    if (Y.active) return;
    if (Hs() && e.pointerType !== "touch") {
      const [r, c] = A(e),
        d = $6(r + B0.x, c + B0.y);
      if (
        (Object.assign(Y, {
          active: !0,
          id: e.pointerId,
          fromJoy: !1,
          mouse: !0,
          moved: !1,
          x: r,
          y: c,
          selected: !1,
        }),
        lA.setPointerCapture && lA.setPointerCapture(e.pointerId),
        !eh(r + B0.x, c + B0.y) && d)
      ) {
        Y.releaseTarget();
        l.clickedTarget = d;
        l.clickedUntil = (l.clock || 0) + 1;
        ((l.pickTarget = l.pickTarget === d ? null : d),
          l.pickTarget && k(`Đi nhặt: ${d.it.n}`),
          (Y.mouse = !1));
        return;
      }
      {
        const g = eh(r + B0.x, c + B0.y);
        if (g) {
          Y.selectTarget(g);
          return;
        }
      }
      hA() || (Y.tmp = !0);
      Y.releaseTarget();
      const [f, h] = X0(r + B0.x, c + B0.y);
      (Y.moveTarget(f, h), (l.pickTarget = null));
      return;
    }
    const [a, i] = A(e);
    (Object.assign(Y, {
      active: !0,
      id: e.pointerId,
      fromJoy: !1,
      ox: a,
      oy: i,
      x: a,
      y: i,
      moved: !1,
      selected: !1,
    }),
      lA.setPointerCapture && lA.setPointerCapture(e.pointerId));
  }),
    lA.addEventListener("pointermove", (e) => {
      if (Hs() && e.pointerType !== "touch") {
        const [x, y] = A(e);
        lA.style.cursor = Y.pendingSupport ? "crosshair" : eh(x + B0.x, y + B0.y) ? 'url("img/cursors/attack.png") 13 12, pointer' : 'url("img/cursors/move.png") 12 10, default';
      }
      if (!Y.active || e.pointerId !== Y.id) return;
      if (Y.selected) return;
      const [a, i] = A(e);
      if (((Y.x = a), (Y.y = i), Y.mouse)) {
        const [r, c] = X0(a + B0.x, i + B0.y);
        Y.releaseTarget();
        Y.moveTarget(r, c);
        return;
      }
      if (!Y.fromJoy) {
        if (Y.moved || Math.hypot(a - Y.ox, i - Y.oy) > sh) {
          ((Y.moved = !0), hA() || (Y.tmp = !0));
          const [r, c] = X0(a + B0.x, i + B0.y);
          Y.releaseTarget();
          Y.moveTarget(r, c);
        }
        return;
      }
      !Y.moved &&
        Math.hypot(a - Y.ox, i - Y.oy) > sh &&
        ((Y.moved = !0), (Y.target = null), hA() || (Y.tmp = !0));
    }));
  const n = (e) => {
    if (e.pointerId !== Y.id) return;
    const [a, i] = A(e),
      r = !Y.moved && !Y.mouse && !Y.selected;
    if (((Y.mouse = !1), (Y.active = !1), (Y.id = null), (Y.moved = !1), !r)) return;
    {
      const d = eh(a + B0.x, i + B0.y);
      if (d) {
        Y.selectTarget(d);
        return;
      }
    }
    const c = $6(a + B0.x, i + B0.y);
    Y.releaseTarget();
    if (c) {
      l.clickedTarget = c;
      l.clickedUntil = (l.clock || 0) + 1;
      ((l.pickTarget = l.pickTarget === c ? null : c), l.pickTarget && k(`Đi nhặt: ${c.it.n}`));
      return;
    }
    {
      hA() || (Y.tmp = !0);
      const [d, f] = X0(a + B0.x, i + B0.y);
      Y.moveTarget(d, f);
    }
  };
  (lA.addEventListener("pointerup", n),
    lA.addEventListener("pointercancel", (e) => {
      e.pointerId === Y.id && ((Y.active = !1), (Y.id = null), (Y.moved = !1));
    }),
    window.addEventListener("keydown", (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const a = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      ((Y.keys[a] = !0),
        ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(a) &&
          !$1() &&
          Wa("manual"),
        !e.repeat &&
          (/^F[1-4]$/.test(a) && (e.preventDefault(), Ac(+a[1] - 1)),
          (a === "1" || a === "q") && Ms("life"),
          (a === "2" || a === "e") && Ms("mana"),
          (a === "3" || a === "t") && (l.town ? en() : nc()),
          a === "f" && Wa(hA() ? "auto" : "manual"),
          a === "r" && J8(),
          a === "m" && D8(),
          a === " " && (e.preventDefault(), fp())));
    }),
    window.addEventListener("keyup", (e) => {
      Y.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = !1;
    }));
  const t = (e, a) =>
    e.addEventListener("pointerdown", (i) => {
      (i.preventDefault(), i.stopPropagation(), a());
    });
  document.querySelectorAll("#pad .sk").forEach((e) => {
    (e.addEventListener("pointerdown", (a) => {
      if ((a.preventDefault(), a.stopPropagation(), a.button === 2)) return;
      const i = +e.dataset.i;
      (tn(), a.target.closest(".pk") || !(o.slots[i] > 0) ? Z8(i) : Ac(i));
    }),
      e.addEventListener("contextmenu", (a) => {
        (a.preventDefault(), Z8(+e.dataset.i));
      }));
  });
  for (const [e, a, i] of [
    ["#bHp", 0, "life"],
    ["#bMp", 1, "mana"],
  ]) {
    const r = m(e);
    (r.addEventListener("pointerdown", (c) => {
      (c.preventDefault(),
        c.stopPropagation(),
        c.button !== 2 && (c.target.closest(".pk") ? oo(a) : Ms(i)));
    }),
      r.addEventListener("contextmenu", (c) => {
        (c.preventDefault(), oo(a));
      }));
  }
  (t(m("#bTp"), () => (l.town ? en() : nc())),
    (m("#bMain").onclick = () => typeof fA == "function" && fA("skill")),
    (m("#ctrlBtn").onclick = () => Wa(hA() ? "auto" : "manual")),
    (m("#inBtn").onclick = () => {
      ((o.inputMode = Hs() ? "joy" : "mouse"),
        (Y.target = null),
        W8(),
        $(),
        k(
          Hs()
            ? "Điều khiển bằng chuột: bấm hoặc giữ chuột để đi"
            : "Điều khiển bằng joystick: kéo ở góc trái dưới",
        ));
    }),
    W8(),
    window.addEventListener("resize", W8),
    (m("#rotBtn").onclick = () => J8()),
    (m("#rideBtn").onclick = () => D8()),
    O3(),
    eo(),
    (m("#bBack").onclick = () => en()));
  {
    const e = m("#ktcBtn");
    e && (e.onclick = () => iA());
  }
  ((m("#bShop").onclick = () => lh()),
    (m("#bKtcT").onclick = () => iA()),
    (m("#bStashT").onclick = () => Rt()),
    (m("#bSellTown").onclick = () =>
      K8((e) => {
        (k(`Bán ${e.n} món`), V());
      })));
};

var ah = function (A) {};

var Y = {
  hasMovementInput() {
    if (Y.active && Y.moved) return Math.hypot(Y.x - Y.ox, Y.y - Y.oy) >= 6;
    if (typeof T1 !== "undefined" && (T1.v[0] || T1.v[1])) return true;
    const keys = Y.keys || {};
    const dx = +(!!(keys.ArrowRight || keys.d)) - +(!!(keys.ArrowLeft || keys.a));
    const dy = +(!!(keys.ArrowDown || keys.s)) - +(!!(keys.ArrowUp || keys.w));
    return !!(dx || dy || (Y.target && Math.hypot(Y.target.x - v.x, Y.target.y - v.y) >= 6));
  },
  prioritizeMovement() {
    if (!hA()) Y.tmp = true;
    l.clickHold = false;
    if (v.castT > 0 && !(v.hurtT > 0)) {
      v.castT = 0; v.atT = 0;
      v.actionRevision = (v.actionRevision || 0) + 1;
      v.act = "st"; v.actT = 0;
    }
  },
  moveTarget(x, y) {
    Y.target = { x, y };
    // Cancel before the next simulation tick can release an auto windup.
    Y.prioritizeMovement();
  },
  selectTarget(target) {
    if (!hA()) Wa("manual", !0);
    l.manTgt = target;
    l.clickedTarget = target;
    l.clickedUntil = (l.clock || 0) + 1;
    l.clickHold = false;
    l.moveTo = null;
    l.pickTarget = null;
    Y.target = null;
    Y.mouse = false;
    Y.selected = true;
    if (Y.pendingSupport) {
      if (castSupportSkill(Y.pendingSupport)) {
        Y.pendingSupport = 0;
        // This click issued a curse, not a follow-up primary attack command.
        l.manTgt = null;
        l.clickHold = true;
      }
      qA();
      return;
    }
    k("Tấn công: " + target.n);
  },
  releaseTarget() {
    Y.pendingSupport = 0;
    l.manTgt = null;
    l.moveTo = null;
    l.pickTarget = null;
    l.clickHold = false;
  },
  stopAfterCast() {
    if (!hA() || !l.manTgt) return;
    // A battlefield target is an ongoing attack command: keep following it.
    // Ordinary manual training retains its existing stand-after-cast behavior.
    l.clickHold = !l.battlefield;
    l.moveTo = null;
    l.pickTarget = null;
    Y.target = null;
    Y.mouse = false;
  },
  active: !1,
  id: null,
  fromJoy: !1,
  ox: 0,
  oy: 0,
  x: 0,
  y: 0,
  moved: !1,
  keys: {},
  target: null,
};

var an = 45;

var sh = 8;

var ih = 0.3;

var ao = 0.3;

var $1 = () => o.ctrl === "manual" || !!Y.tmp;

var hA = () => o.ctrl === "manual";

var Yv = () => o.joy !== "float";

var so = () =>
  !!(
    window.matchMedia &&
    window.matchMedia(
      "(orientation: landscape) and (min-width: 900px) and (hover: hover) and (pointer: fine)",
    ).matches
  );

var Fv = () => (so() ? "mouse" : "joy");

var Hs = () => Fv() === "mouse";

var $s = null;

var oh = 0;

var T1 = { v: [0, 0], prev: [] };

var io = function (A) {
  if (A.g === 1) {
    const t = tc(A);
    return t ? Ot(t) : A.price || 50;
  }
  const n = as(A.d, A.k, A.lvl);
  return A.price || (n ? n.price : 100);
};

var tc = function (A) {
  return A.d > 2
    ? null
    : S.potions.find(
        (n) => n.kind === (A.d === 2 ? "both" : A.d === 1 ? "mana" : "life") && n.tier === A.lvl,
      );
};

var ec = function (A) {
  const n = _A(A.d, A.k, A.lvl, 0);
  return n ? (o.uid--, (n.uid = -1), (n.s = ac(A, n)), n) : null;
};

var C1 = function (A) {
  return (
    (o.potStock = o.potStock || { life: {}, mana: {} }),
    o.potStock[A] || (o.potStock[A] = {})
  );
};

var rh = function (A) {
  return Object.values(C1(A)).reduce((n, t) => n + t, 0);
};

var ch = function (A) {
  const n = C1(A),
    t = Object.keys(n)
      .map(Number)
      .filter((a) => n[a] > 0)
      .sort((a, i) => i - a);
  if (!t.length) return null;
  const e = S.potions.find((a) => a.kind === A && a.tier === t[0]);
  return e ? (n[t[0]]--, e) : null;
};

var Vv = function (A) {
  const n = io(A) * (A.g === 1 ? At : 1);
  if (o.gold < n) {
    k("Không đủ ngân lượng");
    return;
  }
  if (A.g === 1) {
    const t = tc(A);
    if (!t) return;
    o.gold -= n;
    const e = C1(t.kind);
    ((e[t.tier] = (e[t.tier] || 0) + At), k(`Mua ${At} ${t.n}`), o0("use"));
  } else {
    if (o.inv.length >= INV_MAX) {
      k("Hành trang đầy");
      return;
    }
    const t = _A(A.d, A.k, A.lvl, 0);
    if (!t) return;
    ((t.s = ac(A, t)), (o.gold -= n), xn(t, !0, !0, !0), k(`Mua ${t.n}`), o0("dropOther"));
  }
  ($(), lh());
};

var lh = function s() {
  const A = I[o.fac],
    n = Uv.filter(([e]) => e === "sell" || (S.shops[e] && S.shops[e].items.length));
  n.find((e) => e[0] === Nt) || (Nt = n[0][0]);
  let t = "";
  if (Nt === "sell") {
    const e = o.inv.filter((a) => !mA(a) && !Ja(a));
    t = `<p class="desc">Bán món trong hành trang. Món không khớp bộ lọc: ${e.length} (${q(e.reduce((a, i) => a + x0(i), 0))} lượng). Đồ bộ / Tím không bị bán hàng loạt.</p>
      <div class="btnrow"><button class="btn red" id="bSellBad">Bán đồ không khớp lọc</button></div>
      <div class="invgrid">${o.inv.map(W1).join("")}</div>`;
  } else {
    const e = S.shops[Nt].items
      .filter((a) => {
        if (a.g === 1) return !0;
        const i = ec(a);
        return !i || mn(i);
      })
      .slice()
      .sort((a, i) => a.d - i.d || a.k - i.k || a.lvl - i.lvl);
    ((t = `<div class="shoplist">${e
      .map((a, i) => {
        if (a.g === 1) {
          const d = tc(a);
          return d
            ? `<button class="shoprow" data-i="${i}"><img src="${D(d.ic || "")}" alt=""><span><b>${D(d.n)}</b><small>Hồi ${F(d.total)} ${d.kind === "mana" ? "nội lực" : "sinh lực"}${d.kind === "both" ? ` + ${F(d.mtotal)} nội lực` : ""} trong ${d.dur}s · còn ${C1(d.kind)[d.tier] || 0}</small></span><em>${F(io(a) * At)} / ${At}</em></button>`
            : "";
        }
        const r = ec(a);
        if (!r) return "";
        const c = Nt === "weapon" && A && o1(r);
        return `<button class="shoprow${p0(r) ? "" : " bad"}${c ? " own" : ""}" data-i="${i}"><img src="${D(r.ic)}" alt=""><span><b>${D(r.n)}</b><small>Cấp ${r.lvl}${r.s >= 0 ? " · hệ " + g0[r.s] : ""}${c ? " · đúng loại vũ khí môn phái" : ""}</small></span><em>${F(io(a))}</em></button>`;
      })
      .join("")}</div>`),
      (l.shopList = e));
  }
  J(
    `<h3>Cửa hàng ${D(E0.town.n)} <small>${q(o.gold)} lượng</small></h3>
    <div class="dtabs">${n.map(([e, a]) => `<button data-t="${e}" class="${e === Nt ? "on" : ""}">${a}</button>`).join("")}</div>${t}`,
    () => {
      (document.querySelectorAll("#mBody .dtabs button").forEach(
        (a) =>
          (a.onclick = () => {
            ((Nt = a.dataset.t), s());
          }),
      ),
        document
          .querySelectorAll("#mBody .shoprow")
          .forEach((a) => (a.onclick = () => Vv(l.shopList[+a.dataset.i]))));
      const e = m("#bSellBad");
      (e &&
        (e.onclick = () =>
          K8(() => {
            ($(), s());
          })),
        document.querySelectorAll(".mbox .invgrid .it").forEach(
          (a) =>
            (a.onclick = () => {
              const i = xs(a.dataset.uid);
              i &&
                Sf(i, () => {
                  ((Nt = "sell"), s());
                });
            }),
        ));
    },
  );
};

var Uv = [
  ["weapon", "Vũ khí"],
  ["cloth", "Trang phục"],
  ["jewel", "Trang sức"],
  ["med", "Dược phẩm"],
  ["sell", "Bán đồ"],
];

var At = 10;

var Nt = "weapon";

var dh = { 1: 1e5, 2: 1e5, 3: 3e5, 4: 3e5, 5: 4e5, 6: 4e5, 7: 7e5, 8: 7e5, 9: 1e6, 10: 2e6 };

var Xv = [0, 100, 1200, 2700, 4800, 7500, 10800, 15e3, 2e4];
