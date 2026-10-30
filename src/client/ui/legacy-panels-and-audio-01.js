// ui/legacy-panels-and-audio — shared IIFE scope; order is defined in modules.json.
var X3 = {
  头部: 0,
  发型: 1,
  肩膀: 4,
  躯体: 5,
  左手: 6,
  右手: 7,
  左手武器: 8,
  右手武器: 9,
  马前: 12,
  马中: 13,
  马后: 14,
};

var fv = Object.fromEntries(Object.entries(X3).map(([s, A]) => [A, s]));

var _f = {
  头部: "helm",
  发型: "helm",
  肩膀: "armor",
  躯体: "armor",
  左手: "armor",
  右手: "armor",
  左手武器: "weapon",
  右手武器: "weapon",
  马前: "horse",
  马中: "horse",
  马后: "horse",
};

var L8 = (s, A) => (A.startsWith("m:") ? "m/" + A.slice(2) : s + "/" + A);

var J3 = () => !!P0 && o && o.jxLook !== !1;

var Mf = {
  ovan: 5,
  xtho: 13,
  tanh: 3,
  dlo: 2,
  cdsu: 11,
  pvan: 1,
  btieu: 6,
  xlc: 9,
  duhuy: 4,
  tdia: 0,
  dvu: 8,
  squang: 10,
  pvu: 7,
  hhlc: 15,
  bhv: 11,
  pvtm: 10,
};

var Hf = {
  "Bôn Tiêu": 6,
  "Phiên Vũ": 7,
  "Phi Vân": 1,
  "Xích Long Câu": 9,
  "Tuyệt Địa": 0,
  "Du Huy": 4,
  "Đằng Vụ": 8,
  "Siêu Quang": 10,
  "Kim Tinh Hổ Vương": 10,
  "Hỏa Tinh Kim Hổ Vương": 13,
  "Kim Tinh Bạch Hổ Vương": 11,
  "Long Tinh Hắc Hổ Vương": 3,
  "Hãn Huyết Long Câu": 15,
  "Phong Vân Bạch Mã": 11,
  "Phong Vân Chiến Mã": 2,
  "Phong Vân Thần Mã": 10,
  "Sư tử": 10,
  "Lạc đà": 9,
  "Dương Đà": 0,
  "Hươu đốm": 9,
  "Dương Sa": 7,
  "Ngự Phong": 8,
  "Truy điện": 4,
  "Lưu Tinh": 1,
};

var hv = {
  6: 10,
  7: 11,
  8: 12,
  9: 13,
  11: 15,
  13: 17,
  14: 18,
  15: 19,
  16: 20,
  17: 21,
  18: 22,
  19: 11,
  20: 11,
  21: 11,
  22: 23,
  23: 24,
  24: 25,
  25: 26,
  30: 11,
  31: 13,
  32: 17,
};

var uv = {
  "Ô Vân Đạp Tuyết": 5,
  "Xích Thố": 0,
  "Tuyệt Ảnh": 9,
  "Tuyệt ảnh": 9,
  "Đích Lô": 2,
  "Chiếu Dạ Ngọc Sư Tử": 1,
};

var $f = { helm: "头部", armor: "躯体", melee: "右手武器", range: "右手武器" };

var q8 = new Map();

var gv = { st: 120, run: 85 };

var g1 = function () {
  return o.snd || (o.snd = { on: !0, vol: 0.7, music: !0, mvol: 0.4 });
};

var j8 = function () {
  if (c0.ctx) {
    c0.ctx.state === "suspended" && c0.ctx.resume();
    return;
  }
  const A = window.AudioContext || window.webkitAudioContext;
  A &&
    ((c0.ctx = new A()),
    (c0.gain = c0.ctx.createGain()),
    c0.gain.connect(c0.ctx.destination),
    ks(),
    z8(Me.skill[1081]));
};

var ks = function () {
  const A = g1();
  (c0.gain && (c0.gain.gain.value = A.on ? A.vol : 0),
    c0.music &&
      ((c0.music.volume = A.music ? A.mvol : 0),
      A.music ? c0.music.paused && c0.music.play().catch(() => {}) : c0.music.pause()));
};

var z8 = function (A) {
  c0.buf[A] ||
    c0.loading[A] ||
    !c0.ctx ||
    ((c0.loading[A] = !0),
    fetch(A)
      .then((n) => n.arrayBuffer())
      .then((n) => c0.ctx.decodeAudioData(n))
      .then((n) => {
        c0.buf[A] = n;
      })
      .catch(() => {
        c0.buf[A] = null;
      }));
};

var Q8 = function (A, n = 1, t = 1) {
  if (!A || l.quiet || !c0.ctx || !g1().on) return;
  const e = c0.ctx.currentTime;
  if (c0.last[A] && e - c0.last[A] < mv) return;
  const a = c0.buf[A];
  if (!a) {
    z8(A);
    return;
  }
  if (c0.voices >= wv) return;
  ((c0.last[A] = e), c0.voices++);
  const i = c0.ctx.createBufferSource(),
    r = c0.ctx.createGain();
  ((i.buffer = a),
    (i.playbackRate.value = t),
    (r.gain.value = n),
    i.connect(r),
    r.connect(c0.gain),
    (i.onended = () => c0.voices--),
    i.start());
};

var _e = function (A) {
  const n = Object.values(Me.music);
  if (!n.length) return;
  const t = Me.music[A] || n[Math.abs(A) % n.length];
  if (c0.musicSrc === t) return;
  (c0.music && c0.music.pause(),
    (c0.musicSrc = t),
    (c0.music = new Audio(t)),
    (c0.music.loop = !0));
  const e = g1();
  ((c0.music.volume = e.music ? e.mvol : 0), e.music && c0.music.play().catch(() => {}));
};

var Tf = function (A) {
  if (c0.ctx) {
    for (const n of A.m.concat([A.boss])) {
      const t = Me.npc[r0[n] && r0[n].anim];
      t && Object.values(t).forEach((e) => e && z8(e));
    }
    Object.values(Me.ui).forEach((n) => n && z8(n));
  }
};

var Me = window.JS || { music: {}, npc: {}, skill: {}, ui: {} };

var c0 = {
  ctx: null,
  gain: null,
  buf: {},
  loading: {},
  last: {},
  voices: 0,
  music: null,
  musicSrc: "",
};

var mv = 0.07;

var wv = 10;

var W3 = (s, A, n = 0.6) => {
  const t = Me.npc[s];
  t && Q8(t[A], n, Z(0.93, 1.07));
};

var G8 = (s) => Q8(Me.skill[s], 0.5);

var o0 = (s) => Q8(Me.ui[s], 0.6);

var C = function (A) {
  l.quiet ||
    (l.logs.unshift(A),
    (l.logT || (l.logT = [])).unshift(Date.now()),
    l.logs.length > 150 && l.logs.pop(),
    l.logT.length > 150 && (l.logT.length = 150),
    (l.logDirty = !0));
};

var k = function (A) {
  const n = m("#toast");
  ((n.textContent = A),
    n.classList.add("on"),
    clearTimeout(Uf),
    (Uf = setTimeout(() => n.classList.remove("on"), 1800)));
};

var X1 = function (A, n = "Đồng ý", t = "Hủy") {
  return new Promise((e) => {
    const a = document.getElementById("askBox");
    a && a.remove();
    const i = document.createElement("div");
    ((i.id = "askBox"),
      (i.style.cssText =
        "position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px"),
      (i.innerHTML = `<div style="max-width:420px;width:100%;background:#1b1712;border:1px solid #8a6a2c;border-radius:8px;padding:16px;color:#f0e2c0;font:inherit;box-shadow:0 8px 30px rgba(0,0,0,.6)"><p style="margin:0 0 14px;line-height:1.5;white-space:pre-line">${D(A)}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" data-a="0">${D(t)}</button><button class="btn red" data-a="1">${D(n)}</button></div></div>`));
    const r = (d) => {
      (i.remove(), e(d));
    };
    (i.addEventListener("click", (d) => {
      const f = d.target.closest("[data-a]");
      f ? r(f.dataset.a === "1") : d.target === i && r(!1);
    }),
      document.body.appendChild(i));
    const c = i.querySelector('[data-a="1"]');
    c && c.focus();
  });
};

var J = function (A, n, t) {
  ((m("#mBody").innerHTML = A),
    m("#modal").classList.remove("hidden"),
    (m("#modal").dataset.locked = t ? "1" : ""),
    n && n());
  try {
    m("#modal .mbox").focus({ preventScroll: !0 });
  } catch {}
};

var n0 = function (A) {
  (m("#modal").dataset.locked && !A) || m("#modal").classList.add("hidden");
};

var Cf = function (A) {
  if (
    (typeof tA == "function" && tA(A)) ||
    (o.lootF && o.lootF.pickAll && mA(A)) ||
    (A.set && !A.lock && !A.plv && Ma(A),
    A.set || A.vio || A.plv || A.lock || A.thanma || A.pack || A.ktc)
  )
    return !1;
  if (!mn(A)) return !0;
  const n = I[o.fac];
  if (rA[A.d] === "weapon" && n && !o1(A)) return !0;
  const t = o.eq[JA(A)];
  return !(
    !t ||
    FA(A) ||
    K0(A) > K0(t) * 0.85 ||
    (vn.includes(A.d) && o.inv.filter((e) => vn.includes(e.d) && !e.set && !e.vio).length < Tv)
  );
};

var Of = function () {
  if (o.autoJunk === !1) return 0;
  let A = 0;
  for (let n = 0; n < INV_MAX; n++) {
    const t = o.inv.filter(Cf).sort((e, a) => K0(e) - K0(a))[0];
    if (!t) break;
    (o.inv.splice(o.inv.indexOf(t), 1), (o.gold += x0(t)), A++);
  }
  return (A && (R = !0), A);
};

var xn = function (A, n, t, e) {
  if (typeof VA == "function" && VA(A))
    return (n || C(`<span class="dim">${D(A.n)}: đồ đã xóa khỏi game</span>`), !1);
  if (typeof ZA == "function" && ZA(A)) {
    const i = x0(A);
    return (
      (o.gold += i),
      n || C(`<span class="dim">${D(A.n)} (đồ đã bỏ khỏi game) đổi thành ${q(i)} lượng</span>`),
      !1
    );
  }
  const a = (i) => {
    t &&
      !l.quiet &&
      no() >= 0 &&
      (A.r || 0) >= no() &&
      C(
        `Nhặt được <span style="color:${_0[A.r || 0]}">${D(A.n)}</span>${i ? ` <span class="dim">${i}</span>` : ""}`,
      );
  };
  return !e && typeof Ju == "function" && Ju(A)
    ? ((R = !0), a("→ Rương ép"), !0)
    : typeof nu == "function" && nu(A, n)
      ? ((R = !0), a("→ Mã Trường"), !0)
      : !t && !mA(A)
        ? ((o.gold += x0(A)), !1)
        : (o.inv.length >= INV_MAX && (A.set || A.vio || A.plv) && M6(A, !0),
          o.inv.length >= INV_MAX
            ? ((o.gold += x0(A)),
              n || C('<span class="dim">Túi đầy, tự bán ' + D(A.n) + "</span>"),
              !1)
            : !e && o.autoJunk !== !1 && Cf(A)
              ? ((o.gold += x0(A)), a(`(đồ thừa, tự bán +${q(x0(A))} lượng)`), !1)
              : (o.inv.unshift(A),
                (R = !0),
                yo(A),
                typeof Cu == "function" && Cu(A),
                t
                  ? a("")
                  : !n &&
                    no() >= 0 &&
                    (A.r || 0) >= no() &&
                    C(`Nhặt được <span style="color:${_0[A.r]}">${D(A.n)}</span>`),
                o.autoEquip && FA(A) && J1(A, !0),
                !0));
};

var Z3 = function (A) {
  if (!p0(A)) return -1;
  const n = Object.assign({}, o.eq);
  return ((n[JA(A)] = A), G0(j0(n)) / Math.max(1, G0(j0(o.eq))) - 1);
};

var pv = function (A) {
  if (A.pack || A.ktc || typeof Fn != "function") return "";
  if (FA(A)) return '<u class="up" title="Mạnh hơn đồ đang mặc: bấm Mặc đồ tốt">▲</u>';
  if (Fn(A)) {
    const n = p0(A) ? ["mạnh hơn rất ít (dưới 1%)"] : vt(A);
    return `<u class="up soon" title="${D("Chưa tự mặc: " + n.join("; "))}">▲</u>`;
  }
  return K4(A)
    ? `<u class="up pot" title="Cường hóa lên +${t3(A).enh} thì mạnh hơn đồ đang mặc">△</u>`
    : "";
};

var FA = function (A) {
  if (A.pack || A.ktc) return !1;
  const n = I[o.fac];
  return rA[A.d] === "weapon" && n && !o1(A) ? !1 : Z3(A) > 0.01;
};

var J1 = function (A, n) {
  if(typeof OnlineProgression!=="undefined"&&OnlineProgression.dispatch({kind:"equip",uid:A?.uid}))return;
  if (!p0(A)) {
    n || k("Chưa mặc được: " + vt(A).join("; "));
    return;
  }
  const t = JA(A),
    e = o.eq[t];
  ((o.inv = o.inv.filter((a) => a !== A)),
    e && o.inv.unshift(e),
    (o.eq[t] = A),
    (l.dirty = !0),
    (R = !0),
    n || o0(A.d <= 1 ? "equipWeapon" : "equipCloth"),
    n || (n0(), V()));
};

var Dv = function (A) {
  if(typeof OnlineProgression!=="undefined"&&OnlineProgression.dispatch({kind:"unequip",slot:A}))return;
  const n = o.eq[A];
  if (n) {
    if (o.inv.length >= INV_MAX) {
      k("Túi đầy");
      return;
    }
    (delete o.eq[A], o.inv.unshift(n), (l.dirty = !0), (R = !0), n0(), V());
  }
};

var Pv = function () {
  const A = o.inv.filter((t) => !mA(t) && !Ja(t));
  let n = 0;
  for (const t of A) n += x0(t);
  return (
    (o.gold += n),
    (o.inv = o.inv.filter((t) => !A.includes(t))),
    (R = !0),
    { n: A.length, gold: n, kept: o.inv.filter((t) => !mA(t)).length }
  );
};

var Ef = function (A) {
  if (!o.inv.includes(A)) {
    n0();
    return;
  }
  if (A.lock) {
    k("Món đã khóa: mở khóa trước khi bán");
    return;
  }
  ((o.inv = o.inv.filter((n) => n !== A)), (o.gold += x0(A)), (R = !0), n0(), V());
};

var Sf = async function (A, n) {
  if (!A || !o.inv.includes(A)) return Ef(A);
  if (A.lock) return k("Món đã khóa: mở khóa trước khi bán");
  (await X1(`Bán «${A.n}${A.enh ? " +" + A.enh : ""}» lấy ${q(x0(A))} lượng?`, "Bán", "Hủy")) &&
    (Ef(A), n && n());
};

var K8 = async function (A) {
  const n = o.inv.filter((a) => !mA(a) && !Ja(a));
  if (!n.length) {
    k("Không có đồ thừa để bán");
    return;
  }
  const t = n.reduce((a, i) => a + x0(i), 0);
  if (
    !(await X1(
      `Bán ${n.length} món đồ thừa (không khớp bộ lọc, không khóa) lấy ${q(t)} lượng?`,
      "Bán",
      "Hủy",
    ))
  )
    return;
  const e = Pv();
  A && A(e);
};

var xs = function (A) {
  return (
    (A = +A),
    o.inv.find((n) => n.uid === A) ||
      (o.stable || []).find((n) => n.uid === A) ||
      Object.values(o.eq).find((n) => n && n.uid === A) ||
      (l.ground.find((n) => n.it.uid === A) || {}).it
  );
};

var vv = function (A) {
  !A || A.uid == null || (to.size > 3e3 && to.clear(), to.set(+A.uid, A));
};

var W1 = function (A) {
  return (
    vv(A),
    A
      ? `<button class="it r${A.r}${p0(A) ? "" : " bad"}" data-uid="${A.uid}"${p0(A) ? "" : ` title="${D("Chưa mặc được: " + vt(A).join("; "))}"`}>${A.ic ? `<img src="${D(A.ic)}" alt="">` : ""}<i>${A.ktc ? A.ktc.c : A.pack ? A.pack.c : A.lvl}</i>${o.inv.includes(A) ? pv(A) : ""}${A.s >= 0 && A.s < 5 ? `<b class="s5" style="background:${w0[A.s]}"></b>` : ""}${A.lock ? '<u class="lk">🔒</u>' : typeof tA == "function" && o.inv.includes(A) && tA(A) ? '<u class="lk" title="Giữ để trả Dã Tẩu">📜</u>' : ""}${A.enh ? `<u class="en">+${A.enh}</u>` : ""}</button>`
      : ""
  );
};

var Z1 = function (A) {
  if (A && A.ktc) {
    const n = (typeof J0 < "u" && J0.find((t) => t.k === A.ktc.k)) || { d: "" };
    return `<div class="idet"><div class="pic r${A.r}">${A.ic ? `<img src="${D(A.ic)}" alt="">` : ""}</div><div><h4 style="color:${_0[A.r]}">${D(A.n)}</h4><small class="dim">${n.hide ? "Vật phẩm" : "Vật phẩm Kỳ Trân Các"} · số lượng ${A.ktc.c}</small></div></div><div class="sl"><div class="m">${D(n.d || "")}</div></div>`;
  }
  return `<div class="idet"><div class="pic r${A.r}">${A.ic ? `<img src="${D(A.ic)}" alt="">` : ""}</div><div><h4 style="color:${_0[A.r]}">${D(A.n)}${A.enh ? ` <span class="enh">+${A.enh}</span>` : ""}${A.vio ? ` <small class="vtag">Tím ${(A.mag || []).length}/${R1}</small>` : ""}</h4>
  <small class="dim">${D((S.items[A.d] || { n: A.pack ? "Gói mảnh" : "Vật phẩm" }).n)} · cấp ${A.lvl}${A.s >= 0 && A.s < 5 ? ` · <span style="color:${w0[A.s]}">hệ ${g0[A.s]}</span>` : ""}</small></div></div>
  <div class="sl">${ap(A)
    .map(
      ([n, t, e]) =>
        `<div class="${n}"${e ? ` style="color:${e}"` : ""}>${D(t)
          .replace(/\u0001/g, '<span class="rng">')
          .replace(/\u0002/g, "</span>")}</div>`,
    )
    .join("")}</div>`;
};

var bv = function (A) {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'equipWithPotential',uid:A?.uid}))return false;
  const n = bt(A),
    t = Object.values(n).reduce((e, a) => e + a, 0);
  if (!t) return !1;
  if (o.attrPts < t) return (k(`Cần ${t} điểm tiềm năng, đang có ${o.attrPts}`), !1);
  for (const e in n) ((o.attr[e] += n[e]), (o.attrPts -= n[e]));
  return ((l.dirty = !0), D0(), k("Đã cộng điểm để đủ điều kiện"), !0);
};

var If = function (A, n) {
  if (n || !A || A.ktc || A.pack || !rA[A.d]) return "";
  const t = p0(A),
    e = qw(A, !t),
    a = (g) => (g > 5e-4 ? "cp" : g < -5e-4 ? "cn" : "dim"),
    i = (g, u, w) => `<span class="${a(u)}">${g} ${w}</span>`,
    r = t ? "So với đang mặc" : "Nếu đủ điều kiện, so với đang mặc",
    c = t ? [] : vt(A),
    d = rA[A.d] === "weapon" && I[o.fac] && !o1(A),
    f = Object.values(bt(A)).reduce((g, u) => g + u, 0),
    h = c.length > 0 && c.length === Object.keys(bt(A)).length;
  return `<div class="cmp2"><small class="dim">${r}:</small><div class="cmpv">${i("Sức mạnh", e.gain, J2(e.gain))} ${i("DPS", e.dps, J2(e.dps))} ${i("Sinh lực", e.life, g4(e.life))} ${i("Né", e.def, g4(e.def))} ${i("Kháng TB", e.res, g4(e.res) + "%")}</div>
    ${c.length ? `<div class="reqbad"><b>Chưa mặc được, thiếu:</b><br>${c.map(D).join("<br>")}${h ? `<br><small>Cần ${f} điểm tiềm năng${o.attrPts >= f ? ` (đang có ${o.attrPts}): bấm "Cộng điểm" để đủ điều kiện` : `, đang có ${o.attrPts}: lên cấp thêm`}.</small>` : ""}</div>` : ""}
    <div class="reqnote"><b>Vì sao:</b><br>${e.why.map(D).join("<br>")}</div>
    ${d ? '<div class="reqnote">Sai loại vũ khí của môn phái: tự mặc sẽ bỏ qua, bạn vẫn mặc tay được.</div>' : ""}</div>`;
};

var Bn = function () {
  if (!o.autoEquip) return 0;
  let A = 0;
  for (let n = 0; n < 14; n++) {
    let t = null,
      e = 0.01;
    for (const i of o.inv.concat(
      typeof a0 == "function" ? a0().filter((r) => r.vio && (r.mag || []).length) : [],
    )) {
      if (!p0(i)) continue;
      const r = I[o.fac];
      if (rA[i.d] === "weapon" && r && !o1(i)) continue;
      const c = Z3(i);
      c > e && ((e = c), (t = i));
    }
    if (!t) break;
    o.inv.includes(t) || (A1(t), o.inv.push(t));
    const a = o.eq[JA(t)];
    (J1(t, !0),
      A++,
      a &&
        a.lock &&
        !l.quiet &&
        C(
          `<span class="dim">Tự mặc đồ tốt hơn: thay <b>${D(a.n)}</b> bằng <b>${D(t.n)}</b> (món cũ đã khóa 🔒, ở hành trang)</span>`,
        ),
      o.inv.length > INV_MAX && typeof a0 == "function" && a0().push(o.inv.shift()));
  }
  return (A && ((R = !0), (l.dirty = !0)), A);
};

var He = function s(A, n) {
  if (A && A.pack && typeof ed == "function") return ed(A);
  if (A && A.ktc && typeof f6 == "function") return f6(A);
  const t = !n && o.eq[JA(A)],
    e = !n && typeof t3 == "function" && !Fn(A) && t3(A);
  J(
    `${Z1(A)}${If(A, n)}${e ? `<div class="cp small">△ Cường hóa lên +${e.enh}: mạnh hơn đồ đang mặc ${(e.gain * 100).toFixed(1)}% · ước tính ${jc(A, e.enh)} KNB</div>` : ""}${t ? `<div class="cmp"><small class="dim">Đang mặc:</small>${Z1(t)}</div>` : ""}
    <div class="btnrow">${n ? '<button class="btn" id="bUn">Tháo</button>' : `<button class="btn" id="bEq" ${p0(A) ? "" : "disabled"}>Trang bị</button>${!p0(A) && Object.keys(bt(A)).length && vt(A).length === Object.keys(bt(A)).length ? '<button class="btn" id="bReqPts">Cộng điểm</button>' : ""}<button class="btn red" id="bSell" ${A.lock ? "disabled" : ""}>Bán (${F(x0(A))})</button>${o.inv.includes(A) ? '<button class="btn" id="bStashIt">Gửi kho</button>' : ""}${o.inv.includes(A) && A.d === 10 ? '<button class="btn" id="bStable">Cất vào Mã Trường</button>' : ""}`}${xs(A.uid) && A.d <= 10 ? '<button class="btn" id="bForge">Rèn đồ</button>' : ""}${he(A) ? `<button class="btn" id="bLock">${A.lock ? "🔓 Mở khóa" : "🔒 Khóa"}</button>` : ""}</div>`,
    () => {
      const a = m("#bEq"),
        i = m("#bSell"),
        r = m("#bUn"),
        c = m("#bForge"),
        d = m("#bStable");
      d &&
        (d.onclick = () => {
          const u = Au(A);
          (k(u.msg), u.ok && (n0(), V()));
        });
      const f = m("#bStashIt");
      f &&
        (f.onclick = () => {
          const u = Zs(A);
          (k(u.msg), u.ok && (n0(), V()));
        });
      const h = m("#bReqPts");
      h &&
        (h.onclick = () => {
          bv(A) && (p0(A) ? J1(A) : s(A, n));
        });
      const g = m("#bLock");
      (g &&
        (g.onclick = () => {
          ((A.lock = !A.lock),
            A.lock || delete A.lock,
            (R = !0),
            $(),
            k(A.lock ? "Đã khóa: không tự bán, không hợp Huyền Tinh" : "Đã mở khóa"),
            s(A, n));
        }),
        a && (a.onclick = () => J1(A)),
        i && (i.onclick = () => Sf(A)),
        r && (r.onclick = () => Dv(n)),
        c && (c.onclick = () => g2(A)));
    },
  );
};

var Nf = function (A) {
  return p5(A)
    .map((t, e) => (t ? `<span style="color:${w0[e]}">${g0[e]} ${t}</span>` : ""))
    .filter(Boolean)
    .join(" · ");
};

var Lf = function (A) {
  return p5(A)
    .map((t, e) => ('<i class="sdot" style="background:' + w0[e] + '"></i>').repeat(t))
    .join("");
};

var yv = function () {
  const A = AA(Math.min(o.stage, d0)),
    n = k0
      .map((e, a) => {
        if (![e].concat(Un[a] || []).some(zone => MapsEngine.isMapAvailable(zone.id))) return "";
        const i = Wo(a),
          r = DA(Math.min(o.stage, d0)) === a,
          c = Un[a],
          d = (o.zalt || {})[a] || 0,
          f = [e].concat(c || []).find((zone, index) => index === d && MapsEngine.isMapAvailable(zone.id)) || [e].concat(c || []).find(zone => MapsEngine.isMapAvailable(zone.id)) || e,
          h =
            c && i
              ? `<div class="zalt">${[e]
                  .concat(c)
                  .map(
                    (g, u) =>
                      MapsEngine.isMapAvailable(g.id) ? `<button class="chip2${u === d ? " on" : ""}" data-za="${a}:${u}">${D(g.n)}</button>` : "",
                  )
                  .join("")}</div>`
              : "";
        return `<button class="zrow${r ? " cur" : ""}${i ? "" : " lock"}" data-z="${a}" ${i ? "" : "disabled"}><b>${D(f.n)}</b><span>${Lf(f)} Cấp ${e.lo}–${e.hi}${c ? ` · ${c.length + 1} bản đồ` : ""}</span></button>${h}`;
      })
      .join("");
  ((m("#t-log").innerHTML =
    `${Ok()}${pk(A)}<div class="card"><div><small class="dim">Quái hệ: ${Nf(A)}${I[o.fac] ? ` · bạn hệ <span style="color:${w0[F0()]}">${g0[F0()]}</span>: khắc <span style="color:${w0[Wt[F0()]]}">${g0[Wt[F0()]]}</span> (+10%), bị <span style="color:${w0[+Object.keys(Wt).find((e) => Wt[e] === F0())]}">${g0[+Object.keys(Wt).find((e) => Wt[e] === F0())]}</span> khắc (−10%)` : ""}</small></div>
    ${qt() ? `<div class="small">${qt()}</div>` : ""}</div>
    <div class="log" id="logBox">${l.logs.map((e) => `<div>${e}</div>`).join("")}</div>
    <h3>Bản đồ luyện công <small>chạm để chọn bãi (tắt tự đổi theo cấp)</small></h3><div class="zlist">${n}</div>`),
    Ek(),
    Dk());
  const t = (e) => {
    ((o.mode === "quest" || o.mode === "dg") &&
      ((o.mode = "farm"), C("⚔ Chọn bãi luyện công: chuyển sang chế độ Luyện công.")),
      (o.autoMap = !1),
      On(e, "Chọn bãi luyện công", false, true),
      $(),
      V());
  };
  (document.querySelectorAll(".zrow").forEach((e) => (e.onclick = () => t(+e.dataset.z))),
    document.querySelectorAll("[data-za]").forEach(
      (e) =>
        (e.onclick = () => {
          const [a, i] = e.dataset.za.split(":").map(Number);
          (((o.zalt || (o.zalt = {}))[a] = i),
            t(a));
        }),
    ));
};

var kv = function () {
  const A = m("#logBox");
  A && (A.innerHTML = l.logs.map((n) => `<div>${n}</div>`).join(""));
};

var Bs = function () {
  const A = l.P,
    n = I[o.fac],
    t = Object.values(o.eq).filter((h) => h && !p0(h)),
    e = j0({}),
    a = { life: Math.round(A.life - e.life), mana: Math.round(A.mana - e.mana) },
    i = un
      .map(
        ([h, g]) =>
          `<div class="slot" data-slot="${h}">${o.eq[h] ? W1(o.eq[h]) : `<span>${g}</span>`}</div>`,
      )
      .join(""),
    r = Object.keys(nn)
      .map(
        (h) =>
          `<div class="attr"><span>${nn[h]}</span><b>${Math.round(A[h])}</b><span class="pm"><button class="plus" data-a="${h}" ${o.attrPts ? "" : "disabled"}>+</button><button class="minus" data-a="${h}" title="Rút lại 1 điểm" ${o.attr[h] > 0 ? "" : "disabled"}>−</button></span></div>`,
      )
      .join(""),
    c = Q0.map((h) => `<span>Kháng ${D5[h]}</span><span>${Math.round(A.res[h])}%</span>`).join("");
  ((m("#t-char").innerHTML =
    `<div class="card"><b style="color:${w0[n.series]}">${D(n.n)}</b> · hệ ${g0[n.series]} · Cấp ${o.lvl}${v0() ? ` <small class="cp">chuyển sinh ${v0()} · mặc đồ như cấp ${GA()}</small>` : ""}<br><small class="dim">Lực tay trái ${Ki(A.basic)} · Lực tay phải ${Ki(A.main)}</small> <button class="btn sm" id="bTitle">🎖 Danh hiệu</button> <button class="btn sm${OA() ? "" : " on"}" id="bName">${OA() ? "✏ Đổi Tên" : "✏ Đặt tên"}</button> <button class="btn sm" id="bReb" disabled title="Tính năng chuyển sinh hiện đã tắt">Chuyển sinh (đã tắt)</button>${N("misc", "ldp") > 0 ? ` <button class="btn sm on" id="bDoiPhai">Đổi phái (${N("misc", "ldp")})</button>` : ""}</div>
    <div class="eqgrid">${i}</div>${t.length ? `<div class="reqbad"><b>⚠ ${t.length} món đang mặc chưa đủ điều kiện, không được cộng chỉ số:</b><br>${t.map((h) => `${D(h.n)}: ${D(vt(h).join("; "))}`).join("<br>")}</div>` : ""}
    <p class="dim small">Dòng ẩn (2, 4, 6) của mỗi món mở khi hệ nhân vật hoặc 2 món liên kết <b>tương sinh</b> với hệ món đó (Kim→Thủy→Mộc→Hỏa→Thổ→Kim). Đang mở: ${
      un
        .filter(([h]) => o.eq[h] && o.eq[h].mag.length > 1)
        .map(([h, g]) => `${g} ${Dt(o.eq[h])}/${Math.floor(o.eq[h].mag.length / 2)}`)
        .join(" · ") || "—"
    }</p>
    <h3>Tiềm năng <small>${o.attrPts} điểm</small> <button class="btn sm" id="bSugAt">Gợi ý</button> <button class="btn sm" id="bTTa">Tẩy Tủy</button></h3><div class="card">${r}</div>
    <h3>Chỉ số</h3><div class="card stats">
      <span>Sinh lực</span><span>${F(A.life)}${a.life ? ` <small class="cp">(trang bị +${F(a.life)})</small>` : ""}</span><span>Nội lực</span><span>${F(A.mana)}${a.mana ? ` <small class="cp">(+${F(a.mana)})</small>` : ""}</span>
      ${
        A.plusSkill || Object.keys(A.skAdd || {}).length
          ? `<span>Kỹ năng từ trang bị</span><span class="cp">${A.plusSkill ? `Tất cả +${A.plusSkill}` : ""}${Object.entries(
              A.skAdd || {},
            )
              .map(([h, g]) => ` · ${T[h] ? D(T[h].n) : h} +${g}`)
              .join("")}</span>`
          : ""
      }
      <span>Sát thương vũ khí</span><span>${Math.round(A.wmin)}–${Math.round(A.wmax)}</span>
      <span>Chiêu chính</span><span>${D(A.main.n)} (${F(A.main.tot)})</span>
      <span>Chính xác</span><span>${Math.round(A.ar)}</span><span>Né tránh</span><span>${Math.round(A.def)}</span>
      <span>Chí mạng</span><span>${Math.round(A.main.crit)}%</span><span>Tốc độ đánh</span><span>${(A.main.rawRate ?? A.main.rate ?? A.aspd).toFixed(2)}</span>${c}</div>`),
    (m("#bTTa").onclick = Ri),
    document.querySelectorAll("#t-char .plus").forEach((h) => (h.onclick = () => jf(h.dataset.a))),
    (m("#bTitle").onclick = () => Qh()),
    (m("#bName").onclick = () => Aa()),
    (m("#bReb").onclick = _h));
  const d = m("#bDoiPhai");
  (d && (d.onclick = As),
    (m("#bSugAt").onclick = D2),
    document.querySelectorAll("#t-char .minus").forEach((h) => (h.onclick = () => zf(h.dataset.a))),
    document
      .querySelectorAll("#t-char .slot .it")
      .forEach(
        (h) =>
          (h.onclick = () =>
            h.parentNode.dataset.slot === "horse"
              ? xo()
              : He(xs(h.dataset.uid), h.parentNode.dataset.slot)),
      ));
  const f = document.querySelector('#t-char .slot[data-slot="horse"]');
  f && !o.eq.horse && (f.onclick = () => xo());
};

var qf = function (A) {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'unlearn',skill:+A})){return false;}

  const n = o.sk[A] || 0;
  if (!n) return !1;
  const t = m4(T[A]);
  return (
    n <= 1 || t ? delete o.sk[A] : (o.sk[A] = n - 1),
    t || o.skPts++,
    !o.sk[A] && o.main === A && (o.mainLock = !1),
    (l.dirty = !0),
    D0(),
    tn(),
    Zn(),
    qA(),
    _s(),
    $(),
    k(`Rút 1 điểm: ${T[A].n} ${o.sk[A] || 0}/${T[A].max}`),
    !0
  );
};

var jf = function (A) {
  if (!o.attrPts) return;
  const n = o.attrPts;
  J(
    `<h3>Cộng tiềm năng: ${D(nn[A])}</h3><div class="small">Còn <span style="color:#ffd24a;font-weight:bold">${n}</span> điểm · hiện ${Math.round(l.P[A])}</div>
    <div class="btnrow"><input type="number" id="apN" min="1" max="${n}" value="${n}" style="width:110px;font-size:16px;padding:4px 6px"></div>
    <div class="btnrow">${[1, 10, 50, 100]
      .filter((t) => t < n)
      .map((t) => `<button class="btn sm" data-apq="${t}">${t}</button>`)
      .join("")}<button class="btn sm" data-apq="${n}">Tất cả (${n})</button></div>
    <div class="btnrow"><button class="btn on" id="apOk">Cộng</button><button class="btn" id="apNo">Hủy</button></div>`,
    () => {
      const t = m("#apN"),
        e = () => {
          const a = E(Math.floor(+t.value || 0), 0, o.attrPts);
          if(a>0&&typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'potential',key:A,amount:a})){n0(true);return;}
          (a > 0 &&
            ((o.attrPts -= a),
            (o.attr[A] += a),
            (l.dirty = !0),
            D0(),
            _s(),
            $(),
            k(`+${a} ${nn[A]}`)),
            n0(!0),
            Bs());
        };
      (t.focus(),
        t.select(),
        (t.onkeydown = (a) => {
          a.key === "Enter" && e();
        }),
        document.querySelectorAll("#mBody [data-apq]").forEach(
          (a) =>
            (a.onclick = () => {
              ((t.value = a.dataset.apq), t.focus());
            }),
        ),
        (m("#apOk").onclick = e),
        (m("#apNo").onclick = () => n0(!0)));
    },
  );
};

var zf = function (A) {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'potential',key:A,amount:-1})){return false;}

  return o.attr[A] > 0 ? (o.attr[A]--, o.attrPts++, (l.dirty = !0), D0(), Bs(), _s(), $(), !0) : !1;
};

var xv = function (A, n) {
  const t = [];
  for (const a in A.attr) {
    if (Cv.test(a) || X8.test(a) || !S.attrDesc[a]) continue;
    const i = b0(A, a, n);
    if (!i || (!i[0] && !i[2])) continue;
    const r =
      i1(a, i) + (a === "dynamicmagicshield_v" ? ` (tối đa ${Math.round(Jr * 100)}% mỗi đòn)` : "");
    r && !/^\s*$/.test(r) && t.push(r);
  }
  const e = new Set();
  for (const a in A.attr)
    if (a.startsWith("addskilldamage")) {
      const i = b0(A, a, n);
      if (!i || !i[2]) continue;
      const r = Qf(+i[0], A);
      if (!r || e.has(r)) continue;
      (e.add(r), t.push(`Tăng sát thương ${r}: +${i[2]}%`));
    }
  return t;
};

var Qf = function (A, n) {
  const advanced = window.SKILL_150_TARGET_NAMES && window.SKILL_150_TARGET_NAMES[A];
  if (advanced) return advanced;
  const t = Xf[A];
  if (t && T[t[1]]) return `${t[0]} (tầng ${t[2]} ${T[t[1]].n})`;
  if (A >= 1e3) return null;
  const e = T[A];
  if (!e || /\(##\)/.test(e.n) || (n.f && e.f && e.f !== n.f)) return null;
  const a = Object.values(T).find((i) => i.child === A && i.f === n.f && i.id !== A);
  return a ? a.n : e.req > 0 || e.f ? e.n : null;
};

var Bv = function (A) {
  const n = [];
  const detail = T[A].tier === 150 && window.SKILL_150_DETAILS && window.SKILL_150_DETAILS[A];
  for (const t in T) {
    const e = T[t];
    if (!(!e.attr || (e.f && e.f !== T[A].f))) {
      for (const a in e.attr)
        if (a.startsWith("addskilldamage")) {
          const i = o.sk[t] ? o.sk[t] + z1(+t) : 0,
            r = b0(e, a, Math.max(1, i));
          if (!r || !r[2] || /\(##\)/.test(e.n) || e.req <= 0) continue;
          const child = detail && detail.support.find(link => link.id === +t && link.target === +r[0] && link.target !== +A);
          const c = Xf[+r[0]] || (child ? [detail.name, +A, 2] : null);
          +r[0] == +A
            ? n.push([e.n, i, i ? r[2] : 0, r[2]])
            : c &&
              c[1] === +A &&
              n.push([e.n + ` → ${c[0]} (tầng ${c[2]})`, i, i ? r[2] : 0, r[2], !0]);
        }
    }
  }
  return n;
};
