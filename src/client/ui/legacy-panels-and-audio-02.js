// ui/legacy-panels-and-audio — shared IIFE scope; order is defined in modules.json.
var Gf = function s(A, n, t, e = 0) {
  if (!t && typeof skill150EffectRows === "function") {
    const advanced = skill150EffectRows(A, n);
    if (advanced) return advanced;
  }
  const a = window.SK_EV || {},
    i = [],
    r = (f, h, g) =>
      f.attr
        ? b0(f, h, g)
        : f.a && f.a[h]
          ? f.a[h][Math.min(f.a[h].length, Math.max(1, g)) - 1]
          : null;
  if (e > 2 || !A) return i;
  if (!t) {
    const f = r(A, "skill_showevent", n);
    if (!f || !f[0]) return i;
  }
  const c = (r(A, "skill_eventskilllevel", n) || [n])[0] || n;
  let d = 0;
  for (const f of Object.keys(A.attr || A.a || {})) {
    if (!Sv.includes(f)) continue;
    const h = r(A, f, n);
    if (!h || !h[0]) continue;
    const g =
      a[h[2]] ||
      (window.SK_STD && window.SK_STD[h[2]] && T[h[2]]
        ? { n: T[h[2]].n, a: window.SK_STD[h[2]].a }
        : null);
    if (g) {
      (i.push(["ev", `${t ? "Tầng phụ" : "Tầng"} ${d + 2}: ${g.n}`]), d++);
      for (const u in g.a) {
        if (Iv.test(u) || !S.attrDesc[u] || (typeof X8 < "u" && X8.test(u))) continue;
        const w = g.a[u][Math.min(g.a[u].length, c) - 1];
        if (!w || (!w[0] && !w[2])) continue;
        const x = i1(u, w);
        x && i.push(["m", x]);
      }
      for (const u of s(g, c, !0, e + 1)) i.push(u);
    }
  }
  return i;
};

var Kf = function (A, n, t, e, a, i) {
  const r = T[A],
    c = UA(r),
    d = I[r.f],
    f = c ? "Tấn công" : _7[wn(r)] || "—",
    h = (p) => {
      const P = xv(r, p).filter((M) => !/^Tăng sát thương (?!đối với hệ)/.test(M)),
        _ = b0(r, "skill_cost_v", p),
        y = b0(r, "skill_attackradius", p);
      (_ && _[0] && P.push(`Tiêu hao ${i4(r) ? "sinh lực" : "nội lực"}: ${_[0]}`),
        c && P.push(`Phạm vi tấn công: ${y ? y[0] : r.radius || 60}`));
      {
        const M = typeof wn == "function" ? wn(r) : "",
          B = (M === "buff" || M === "curse") && typeof ae == "function" ? ae(r, p) : 0;
        B >= 5 &&
          P.push(`Thời gian duy trì: ${Math.round(M === "curse" ? Math.min(60, B) : B)} giây`);
      }
      return P;
    },
    g = [["b", `Môn phái: ${d ? d.n : "—"}${r.series >= 0 ? ` · Ngũ hành: ${g0[r.series]}` : ""}`]];
  (r.d && g.push(["b in", r.d]),
    g.push([
      j1(r) !== null && !Ci(r) ? "rq" : "b",
      `Loại: ${f}${j1(r) !== null ? ` · Vũ khí: ${B5[j1(r)]}` : ""}`,
    ]),
    g.push([
      o.lvl >= r.req || (r.tier === 90 && v0() > 0) ? "b" : "rq",
      `Cấp yêu cầu: ${r.req}${r.tier === 90 && v0() > 0 ? " (đã chuyển sinh: không cần)" : ""}`,
    ]),
    g.push(["b", `Cấp kỹ năng: ${n}/${r.max}${t ? ` (+${t} từ trang bị → ${e})` : ""}`]),
    r.book && !n && g.push(["b", `Lĩnh ngộ: ${typeof Fi === "object" && Fi[r.book] || `Bí Kíp ${r.tier}`}`]),
    [90, 150].includes(r.tier) && g.push(["g", D7(A)]),
    g.push(["sep"]),
    g.push(["tt", e ? `Cấp hiện tại: ${e}` : "Cấp 1 (chưa học)"]));
  for (const p of h(a)) g.push(["m", p]);
  const u = Gf(r, a);
  if (u.length) for (const p of u) g.push(p);
  else {
    const p = typeof l1 < "u" && l1[A],
      P = typeof f4 == "function" ? f4(r) : 0;
    (p && P && g.push([e >= P ? "m" : "h", `Tầng 2 (từ cấp ${P}): ${p.n}`]),
      p && p.at16 && g.push([e >= 16 ? "m" : "h", `Tầng 3 (từ cấp 16): ${p.at16.n}`]));
  }
  if (i && e) {
    g.push(["tt", `Cấp kế tiếp: ${i}`]);
    for (const p of h(i)) g.push(["h", p]);
    for (const p of Gf(r, i)) g.push([p[0] === "ev" ? "ev" : "h", p[1]]);
  }
  const w = [],
    x = new Set();
  for (const p in r.attr)
    if (p.startsWith("addskilldamage")) {
      const P = b0(r, p, a);
      if (!P || !P[2]) continue;
      const _ = Qf(+P[0], r);
      _ && !x.has(_) && (x.add(_), w.push(`${_}: +${P[2]}%`));
    }
  if (w.length) {
    g.push(["tt", "Hỗ trợ sát thương cho:"]);
    for (const p of w) g.push(["g", p]);
  }
  if (c) {
    const p = Bv(A);
    if (p.length) {
      const primary = p.filter(P => !P[4]).reduce((total, row) => total + row[2], 0);
      const secondary = p.filter(P => P[4]).reduce((total, row) => total + row[2], 0);
      g.push(["tt", +A === 1081
        ? `Được hỗ trợ (chiêu chính: +${primary}%, tầng 2: +${secondary}%):`
        : `Được hỗ trợ (+${primary}%):`]);
      for (const P of p)
        g.push([
          P[1] ? "g" : "h",
          P[1] ? `${P[0]} cấp ${P[1]}: +${P[2]}%` : `${P[0]} (chưa học, cấp 1: +${P[3]}%)`,
        ]);
    }
  }
  return `<div class="idet"><div class="pic"><img src="${D(r.ic || "")}" alt="" style="image-rendering:pixelated"></div><div><h4 style="color:#ffd76a">${D(r.n)}</h4>${c ? "" : y7(r)}</div></div>
    <div class="sl jxsk">${g.map(([p, P]) => (p === "sep" ? '<div class="sep"></div>' : `<div class="${p}">${Ev(D(P))}</div>`)).join("")}</div>`;
};

var bulkSkillPoints = function (id, action) {
  const skill = T[id];
  if (!skill || !I[o.fac] || !I[o.fac].skills.includes(+id)) return 0;
  if (typeof combatSandbox !== "undefined" && combatSandbox && skill.tier === 90 && !SA(id)) {
    k("Chiêu 90 trong phòng test luôn ở cấp tối đa.");
    return 0;
  }
  let count = 0;
  if (action === "max") {
    for (let step = 0; step < skill.max && Q1(skill); step++) {
      if (!Yi(id)) break;
      count++;
    }
    if (count) {
      l.dirty = true; D0(); tn(); Zn(); qA(); _s(); $();
      l.life = Math.min(l.life, l.P.life); l.mana = Math.min(l.mana, l.P.mana);
    }
  } else if (action === "clear") {
    const points = o.sk[id] || 0;
    for (let step = 0; step < points; step++) {
      if (!qf(id)) break;
      count++;
    }
  }
  if (count) k(`${action === "max" ? "Cộng tối đa" : "Xóa hết điểm"}: ${skill.n} ${o.sk[id] || 0}/${skill.max}`);
  return count;
};

var R8 = function s(A) {
  const n = T[A];
  if (!n) return;
  const t = o.sk[A] || 0,
    e = t ? z1(A) : 0,
    a = t + e,
    i = UA(n),
    r = Math.max(1, a),
    c = t < n.max ? a + 1 : 0,
    locked90 = typeof combatSandbox !== "undefined" && combatSandbox && n.tier === 90 && !SA(A);
  J(
    Kf(A, t, e, a, r, c) +
      `
    <div class="btnrow">${i && a ? '<button class="btn" id="skMain">Chọn làm chiêu chính</button>' : ""}<button class="btn" id="skPlus" ${Q1(n) && !locked90 ? "" : "disabled"}>${[90, 150].includes(n.tier) && !SA(A) ? "Lĩnh ngộ" : "+ Cộng điểm"}</button><button class="btn red" id="skMinus" ${t && !locked90 ? "" : "disabled"}>− Rút điểm</button>${[90, 150].includes(n.tier) && t && _4(A) && N("misc", "dtbk") > 0 ? '<button class="btn" id="skMaster">📕 Đại Thành</button>' : ""}</div>
    <div class="btnrow"><button class="btn" id="skMax" ${Q1(n) && !locked90 ? "" : "disabled"}>Cộng tối đa</button><button class="btn red" id="skClear" ${t && !locked90 ? "" : "disabled"}>Xóa hết điểm</button></div>`,
    () => {
      n6(m("#mBody"));
      const master = m("#skMaster");
      master && (master.onclick = () => { h6(A); s(A); });
      const d = m("#skMain");
      (d &&
        (d.onclick = () => {
          ((o.main = n.id),
            (o.mainLock = !0),
            (l.dirty = !0),
            D0(),
            Zn(),
            k("Chiêu chính: " + n.n),
            s(A));
        }),
        (m("#skPlus").onclick = () => {
          Q1(n) && (Yi(A), o0("learn"), (l.dirty = !0), D0(), Zn(), $(), s(A));
        }),
        (m("#skMinus").onclick = () => {
          qf(A) && s(A);
        }),
        (m("#skMax").onclick = () => {
          bulkSkillPoints(A, "max"); s(A);
        }),
        (m("#skClear").onclick = () => {
          bulkSkillPoints(A, "clear"); s(A);
        }));
    },
  );
};

var lM = function () {
  const A = l.P && l.P.basic;
  if (!A) return "";
  const n = o.eq.weapon,
    t = o.mainLock && o.main === "basic",
    e = l.P.main === A,
    a = n ? (l.P.ranged ? "Ám khí / tầm xa" : "Binh khí cận chiến") : "Quyền cước (tay không)";
  return `<div class="skl${e ? " main" : ""}" id="basicSk"><img class="sic" src="img/s/8.png" alt=""><div class="info"><b>Đánh thường</b> <span class="tag attack">Tấn công</span>
    <small>${a} · ~${F(Math.round(A.tot))} sát thương / đòn · ${A.rate.toFixed(2)} đòn/giây · tầm ${A.rad} · 0 nội lực</small></div>
    <span class="pm"><button class="btn sm${t ? " on" : ""}" id="bBasic">${t ? "Đang khóa" : "Dùng làm chiêu chính"}</button></span></div>`;
};

var Zn = function s() {
  const A = I[o.fac];
  if (A.novice) {
    const a = vA.filter((i) => i.series === A.series);
    ((m("#t-skill").innerHTML =
      `<h3>Vô Môn Phái <small>${o.skPts} điểm kỹ năng</small></h3><div class="card"><p class="desc">Chưa có võ công. Đạt <b>cấp ${KA}</b> để gia nhập môn phái hệ <b style="color:${w0[A.series]}">${g0[A.series]}</b>: ${a.map((i) => (hn(i, o.sex) ? D(i.n) : `<s>${D(i.n)}</s>`)).join(", ")}. Điểm kỹ năng nhận được trước đó được giữ lại.</p><div class="btnrow"><button class="btn" id="bJoin" ${o.lvl >= KA ? "" : "disabled"}>Gia nhập môn phái${o.lvl >= KA ? "" : ` (cấp ${o.lvl}/${KA})`}</button></div></div>`),
      (m("#bJoin").onclick = U8));
    return;
  }
  const n = A.skills
    .map((a) => {
      const i = T[a],
        r = o.sk[a] || 0,
        c = UA(i),
        d = r ? z1(a) : 0,
        f = c && r ? F2(l.P, i, r + d) : null;
      return `<div class="skl${W2(i) ? "" : " lock"}${l.P.main.id === +a ? " main" : ""}" data-id="${a}">
      <img class="sic" src="${D(i.ic || "")}" alt=""><div class="info"><b>${D(i.n)}</b>${i.book && !P4(i) ? ` <small class="reqbad">cần ${D(Fi[i.book])}</small>` : ""}${[90, 150].includes(i.tier) && r && r < i.max && N("misc", "dtbk") > 0 && _4(a) ? ` <button class="btn sm" data-dt="${a}">📕</button>` : ""}</div>
      <span class="lvl">${d ? `<b class="skb" title="Cấp hiệu lực = ${r} + ${d} từ trang bị">${r + d}</b><small>/${i.max} (${r}+${d})</small>` : `${r}/${i.max}`}</span><span class="pm"><button class="plus" data-id="${a}" title="Cộng 1 điểm" ${Q1(i) ? "" : "disabled"}>+</button><button class="minus" data-id="${a}" title="Rút lại 1 điểm" ${r > 0 ? "" : "disabled"}>−</button><button class="skinfo" data-id="${a}" title="Thông tin kỹ năng">i</button></span>
      </div>`;
    })
    .join("");
  ((m("#t-skill").innerHTML =
    `<h3>${D(A.n)} <small>${o.skPts} điểm kỹ năng</small> <button class="btn sm" id="bSugSk">Gợi ý</button> <button class="btn sm" id="bTT">Tẩy Tủy</button></h3><div class="dim small">Bí Kíp: ${Object.keys(
      Fi,
    )
      .map((a) => `${Fi[a].replace("Bí Kíp ", "")} ×${N("misc", a)}`)
      .join(
        " · ",
      )} <span class="dim">(hạ trùm cấp cao, Dã Tẩu, Sát Thủ, Kỳ Trân Các)</span> · Đại Thành Bí Kíp ×${N("misc", "dtbk")} · Kim Nguyên Bảo ${o.knb || 0}</div><div class="card"><label><input type="checkbox" id="cRot" ${o.rot === !1 ? "" : "checked"}> Xoay chiêu tự động khi farm: luân phiên các chiêu gán ở ô 1 đến 4 (phím R), luôn có 2 chiêu mạnh nhất, bỏ chiêu hết nội lực</label>${t6()}</div><p class="dim small">Chạm vào chiêu tấn công đã học để khóa làm chiêu chính${o.mainLock ? ' (<a id="bAutoMain">bỏ khóa</a>)' : " (đang tự chọn chiêu mạnh nhất)"}.</p>${n}`),
    document.querySelectorAll("#t-skill .plus").forEach(
      (a) =>
        (a.onclick = (i) => {
          i.stopPropagation();
          const r = T[a.dataset.id];
          Q1(r) && (Yi(r.id), o0("learn"), (l.dirty = !0), D0(), s(), $());
        }),
    ),
    document.querySelectorAll("#t-skill .minus").forEach(
      (a) =>
        (a.onclick = (i) => {
          (i.stopPropagation(), qf(+a.dataset.id));
        }),
    ),
    document.querySelectorAll("#t-skill .skinfo").forEach(
      (a) =>
        (a.onclick = (i) => {
          (i.stopPropagation(), R8(+a.dataset.id));
        }),
    ),
    document.querySelectorAll("#t-skill .slots button").forEach(
      (a) =>
        (a.onclick = (i) => {
          (i.stopPropagation(), th(+a.dataset.slot, +a.dataset.sid), s());
        }),
    ),
    (m("#bSugSk").onclick = D2),
    (m("#bTT").onclick = Ri),
    (m("#cRot").onchange = () => J8()),
    document.querySelectorAll("#t-skill [data-dt]").forEach(
      (a) =>
        (a.onclick = (i) => {
          (i.stopPropagation(), h6(+a.dataset.dt));
        }),
    ),
    e6(),
    n6(m("#t-skill")));
  const t = m("#bAutoMain");
  t &&
    (t.onclick = () => {
      ((o.mainLock = !1), (l.dirty = !0), D0(), s());
    });
  const e = m("#bBasic");
  (e &&
    (e.onclick = (a) => {
      (a.stopPropagation(),
        o.mainLock && o.main === "basic"
          ? (o.mainLock = !1)
          : ((o.main = "basic"), (o.mainLock = !0)),
        (l.dirty = !0),
        D0(),
        s(),
        qA(),
        $(),
        k(o.mainLock && o.main === "basic" ? "Chiêu chính: Đánh thường" : "Bỏ khóa đánh thường"));
    }),
    document.querySelectorAll("#t-skill .skl[data-id]").forEach(
      (a) =>
        (a.onclick = () => {
          const i = T[a.dataset.id];
          UA(i) && o.sk[i.id]
            ? ((o.main = i.id),
              (o.mainLock = !0),
              (l.dirty = !0),
              D0(),
              s(),
              k("Chiêu chính: " + i.n))
            : R8(i.id);
        }),
    ));
};

var _v = function () {
  const A = o.invSort || "new",
    n = o.inv.slice();
  return (
    A === "rar"
      ? n.sort((t, e) => e.r - t.r || e.lvl - t.lvl)
      : A === "lvl"
        ? n.sort((t, e) => e.lvl - t.lvl || e.r - t.r)
        : A === "slot"
          ? n.sort((t, e) => (Jf[rA[t.d]] ?? 99) - (Jf[rA[e.d]] ?? 99) || e.lvl - t.lvl)
          : A === "pow" && n.sort((t, e) => K0(e) - K0(t)),
    n
  );
};

var Y8 = function () {
  An();
};

var An = function () {
  R = !1;
  const A = WA(),
    n = o.lcShow == null ? !!A.custom : !!o.lcShow,
    t = Zr.map(
      (p, P) => `<option value="${P}" ${A.minRar === P ? "selected" : ""}>${p}</option>`,
    ).join(""),
    e = Array.from(
      { length: 10 },
      (p, P) =>
        `<option value="${P + 1}" ${A.minLvl === P + 1 ? "selected" : ""}>${P + 1}</option>`,
    ).join(""),
    a = Array.from(
      { length: 7 },
      (p, P) => `<option value="${P}" ${(A.minMag || 0) === P ? "selected" : ""}>${P}</option>`,
    ).join(""),
    i = Ha.map(
      ([p], P) =>
        `<label class="chip2"><input type="checkbox" data-g="${P}" ${A.groups.includes(P) ? "checked" : ""}>${p}</label>`,
    ).join(""),
    r = g0
      .map(
        (p, P) =>
          `<label class="chip2" style="color:${w0[P]}"><input type="checkbox" data-s="${P}" ${A.series.includes(P) ? "checked" : ""}>${p}</label>`,
      )
      .join(""),
    c = Bp.map(
      ([p, P]) =>
        `<label class="chip2"><input type="checkbox" data-sl="${p}" ${A.slots.includes(p) ? "checked" : ""}>${P}</label>`,
    ).join(""),
    d = l.ground.length,
    f = l.ground.filter((p) => mA(p.it)).length,
    h = o.inv.filter((p) => !mA(p) && !Ja(p)),
    g = o.inv.filter((p) => p.lock).length,
    u = L4();
  m("#t-inv").innerHTML =
    `<div class="invbar"><span>${o.inv.length + (typeof arenaSimulator !== "undefined" && arenaSimulator ? arenaSimulator.warInventory.slots : 0)}/${INV_MAX}</span><select id="iSort" title="Sắp xếp hiển thị">${Nv.map(([p, P]) => `<option value="${p}" ${(o.invSort || "new") === p ? "selected" : ""}>${P}</option>`).join("")}</select><span class="sp"></span>
    <button class="btn sm" id="bStash">Kho chung</button><button class="btn sm" id="bDonKho">🧹 Dọn kho</button><button class="btn sm" id="bBest">Mặc đồ tốt</button><button class="btn sm red" id="bSellAll" ${h.length ? "" : "disabled"}>${h.length ? `Bán ${h.length} món không khớp lọc` : "Không có đồ để bán"}</button></div>
    <div class="invgrid">${typeof arenaSimulator !== "undefined" && arenaSimulator ? arenaSimulator.warInventory.html() : ""}${_v().map(W1).join("")}</div>
    <p class="dim small">${g ? `${g} món đã khóa 🔒 (không tự bán, không bán hàng loạt, không hợp Huyền Tinh). ` : ""}Mở chi tiết món đồ để khóa / mở khóa.</p>
    <div class="btnrow"><button class="btn sm" id="bKtcI">🏮 Kỳ Trân Các</button></div>
    ${
      y0()
        ? (() => {
            const p = A.ep;
            return `<div class="card lootf" id="epLoot"><b>💎 Đồ để ép Tím</b> <small class="dim">nhặt riêng cả khi không khớp bộ lọc bên dưới, không chiếm hành trang</small>
      <label><input type="checkbox" id="eWhite" ${p.white ? "checked" : ""}> Đồ trắng (phôi để chế tạo đồ Tím)</label>
      <label><input type="checkbox" id="eJew" ${p.jew ? "checked" : ""}> Nhẫn / dây chuyền / ngọc bội không tốt hơn đồ đang mặc (luyện Huyền Tinh)</label>
      <label><input type="checkbox" id="eBlue" ${p.blue ? "checked" : ""}> Đồ xanh có dòng cấp ≥ <select id="eBlueLv">${Array.from({ length: 10 }, (P, _) => `<option value="${_ + 1}" ${p.blueLv === _ + 1 ? "selected" : ""}>${_ + 1}</option>`).join("")}</select> (lấy thuộc tính ra đá)</label>
      <div class="row">Cất vào <select id="eDest">${[
        ["box", "Kho Rèn"],
        ["stash", "Kho chung"],
        ["inv", "Hành trang"],
      ]
        .map(([P, _]) => `<option value="${P}" ${p.dest === P ? "selected" : ""}>${_}</option>`)
        .join("")}</select> <small class="dim">Kho Rèn ${a0().length}/${w1}</small></div></div>`;
          })()
        : ""
    }
    <h3>Bộ lọc đồ <small>${d} món trên đất · ${f} khớp</small></h3>
    <div class="card lootf${n ? "" : " smart"}">
      <div class="lmodes">${Np.map(([p, P, _]) => `<button class="btn lmode${Lp(A) === p ? " on" : ""}" data-lm="${p}"><b>${P}</b><small>${_}</small></button>`).join("")}</div>
      <details class="lootadv"${o.lootAdv ? " open" : ""}><summary>Nâng cao (bộ lọc chi tiết, Hoàng Kim, bộ lọc lưu sẵn)</summary>
      <div class="desc small">Giữ đồ quý, đồ nộp Dã Tẩu và các mục được tick dưới đây; còn lại tự bán. Đồ để ép Tím nhặt riêng theo mục 💎 ở trên.</div>
      <div class="btnrow presets">${Q6.map(([p], P) => `<button class="btn sm" data-q="${P}">${p}</button>`).join("")}</div>
      <div class="btnrow presets">${u.map((p, P) => `<span class="pslot"><button class="btn sm" data-pl="${P}" ${p ? "" : "disabled"}>Bộ ${P + 1}${p ? "" : " (trống)"}</button><button class="btn sm" data-ps="${P}" title="Lưu bộ lọc hiện tại vào bộ ${P + 1}">💾</button></span>`).join("")}</div>
      <label><input type="checkbox" id="fAuto" ${A.auto ? "checked" : ""}> Tự đi nhặt đồ khi hết quái</label>
      <label><input type="checkbox" id="fAll" ${A.pickAll ? "checked" : ""}> <b>Nhặt toàn bộ</b>, bán theo bộ lọc: nhặt mọi món rơi ra; khi hành trang đầy hoặc bấm Bán thì chỉ bán món không khớp bộ lọc (bỏ chọn: chỉ nhặt món khớp bộ lọc)</label>
      <label><input type="checkbox" id="fRare" ${A.keepRare ? "checked" : ""}> Luôn nhặt đồ quý (Hoàng Kim, Tím, ngựa hiếm)</label>
      <div class="small"><b>Hoàng Kim giữ lại</b> <small class="dim">(bỏ chọn: tự bán khi đầy / bấm Bán · món đã khóa 🔒 luôn giữ)</small></div>
      <div class="chips"><label class="chip2"><input type="checkbox" id="fHkBc" ${A.hkBc !== !1 ? "checked" : ""}> Hoàng Kim thường (Bộ chung)</label></div>
      <div class="small dim">HKMP của phái: <button class="btn sm" id="fHkAll">Tất cả</button><button class="btn sm" id="fHkMine">Phái mình</button><button class="btn sm" id="fHkNone">Không phái nào</button></div>
      <div class="chips">${vA.map((p) => `<label class="chip2"><input type="checkbox" data-hkf="${p.id}" ${!Array.isArray(A.hkMp) || A.hkMp.includes(p.id) ? "checked" : ""}> ${D(p.n.replace(/ phái$/i, ""))}${o.fac === p.key ? " ★" : ""}</label>`).join("")}</div>
      <label><input type="checkbox" id="fSmart" ${A.smartUp ? "checked" : ""}> ⭐ <b>Giữ đồ nâng cấp</b> (lọc thông minh): món làm nhân vật mạnh hơn đồ đang mặc (▲), kể cả món sắp mặc được (cấp yêu cầu ≤ cấp + 10, đúng giới tính / phái / loại vũ khí) và món cường hóa lên sẽ mạnh hơn (△) <small class="dim">· hành trang có ${o.inv.filter(Fn).length} món</small></label>
      <div class="row lcrow"><label style="flex:1"><input type="checkbox" id="fCustom" ${A.custom ? "checked" : ""}> ⚙ <b>Giữ thêm đồ khớp điều kiện tùy chỉnh</b> bên dưới</label><button class="btn sm lctog" id="fLcTog" title="${n ? "Thu gọn điều kiện tùy chỉnh" : "Mở điều kiện tùy chỉnh"}">${n ? "−" : "+"}</button></div>
      <div class="lc row">Độ hiếm từ <select id="fRar">${t}</select> · cấp đồ từ <select id="fLvl">${e}</select> · ít nhất <select id="fMag">${a}</select> dòng</div>
      <label class="lc"><input type="checkbox" id="fWear" ${A.wear ? "checked" : ""}> Chỉ đồ nhân vật mặc được (giới tính, hệ, môn phái; cấp yêu cầu ≤ cấp hiện tại + 5)</label>
      <label class="lc"><input type="checkbox" id="fFacW" ${A.facW ? "checked" : ""}> Vũ khí: chỉ đúng loại của môn phái</label>
      <label class="lc"><input type="checkbox" id="fAcc" ${A.accrue ? "checked" : ""}> Chỉ hệ được nhân vật tương sinh (${I[o.fac] ? g0[F0()] + " → " + g0[V2[F0()]] : ""}: tự mở 1 dòng ẩn)</label>
      <div class="lc dim small">Loại trang bị (bỏ trống = mọi loại):</div><div class="lc chips">${c}</div>
      <div class="lc dim small">Có ít nhất một thuộc tính (bỏ trống = mọi thuộc tính):</div><div class="lc chips">${i}</div>
      <div class="lc dim small">Hệ của món đồ (bỏ trống = mọi hệ):</div><div class="lc chips">${r}</div>
      </details>
      <div class="dim small">Hành trang: ${o.inv.length - h.length}/${o.inv.length} món khớp hoặc được bảo vệ. Chạm vào món đồ trên sân để đi nhặt tay. Trên 40 món thì món cũ nhất tự bán. Khi vắng mặt, đồ không khớp tự bán.</div>
    </div>`;
  const w = () => {
    ((a3 = null), $(), Y8());
  };
  ((m("#fSmart").onchange = (p) => {
    ((A.smartUp = p.target.checked), w());
  }),
    (m("#fCustom").onchange = (p) => {
      ((A.custom = p.target.checked), A.custom && (o.lcShow = !0), w());
    }),
    (m("#fLcTog").onclick = (p) => {
      (p.preventDefault(), (o.lcShow = !n), $(), Y8());
    }),
    (m("#iSort").onchange = (p) => {
      ((o.invSort = p.target.value), Y8(), $());
    }),
    (m("#fAuto").onchange = (p) => {
      ((A.auto = p.target.checked), w());
    }),
    (m("#fAll").onchange = (p) => {
      ((A.pickAll = p.target.checked), w());
    }),
    (m("#fRare").onchange = (p) => {
      ((A.keepRare = p.target.checked), w());
    }));
  {
    const p = m("#fHkBc");
    p &&
      (p.onchange = (P) => {
        ((A.hkBc = P.target.checked), w());
      });
  }
  const x = (p) => {
    ((A.hkMp = p.length >= vA.length ? null : p), w());
  };
  (document.querySelectorAll("[data-hkf]").forEach(
    (p) =>
      (p.onchange = () => {
        const P = +p.dataset.hkf,
          _ = Array.isArray(A.hkMp) ? A.hkMp : vA.map((y) => y.id);
        x(p.checked ? [...new Set(_.concat(P))] : _.filter((y) => y !== P));
      }),
  ),
    m("#fHkAll") && (m("#fHkAll").onclick = () => x(vA.map((p) => p.id))),
    m("#fHkMine") && (m("#fHkMine").onclick = () => x(I[o.fac] ? [I[o.fac].id] : [])),
    m("#fHkNone") && (m("#fHkNone").onclick = () => x([])),
    (m("#fWear").onchange = (p) => {
      ((A.wear = p.target.checked), w());
    }),
    (m("#fFacW").onchange = (p) => {
      ((A.facW = p.target.checked), w());
    }),
    (m("#fAcc").onchange = (p) => {
      ((A.accrue = p.target.checked), w());
    }),
    (m("#fRar").onchange = (p) => {
      ((A.minRar = +p.target.value), w());
    }),
    (m("#fLvl").onchange = (p) => {
      ((A.minLvl = +p.target.value), w());
    }),
    (m("#fMag").onchange = (p) => {
      ((A.minMag = +p.target.value), w());
    }),
    document.querySelectorAll("#t-inv [data-lm]").forEach(
      (p) =>
        (p.onclick = () => {
          (cp(A, p.dataset.lm), k("Chế độ lọc: " + p.querySelector("b").textContent), w());
        }),
    ));
  {
    const p = m("#fThrN");
    p &&
      (p.onchange = (P) => {
        ((A.thrN = +P.target.value), w());
      });
  }
  {
    const p = m("#fSpec");
    p &&
      (p.onchange = (P) => {
        ((A.keepSpecial = P.target.checked), w());
      });
  }
  {
    const p = m("#fVal");
    p &&
      (p.onchange = (P) => {
        ((A.keepVal = +P.target.value), w());
      });
  }
  {
    const p = document.querySelector("#t-inv .lootadv");
    p &&
      (p.ontoggle = () => {
        o.lootAdv = p.open;
      });
  }
  if (
    (document.querySelectorAll("#t-inv [data-g]").forEach(
      (p) =>
        (p.onchange = () => {
          const P = +p.dataset.g;
          ((A.groups = p.checked
            ? [...new Set(A.groups.concat(P))]
            : A.groups.filter((_) => _ !== P)),
            w());
        }),
    ),
    document.querySelectorAll("#t-inv [data-s]").forEach(
      (p) =>
        (p.onchange = () => {
          const P = +p.dataset.s;
          ((A.series = p.checked
            ? [...new Set(A.series.concat(P))]
            : A.series.filter((_) => _ !== P)),
            w());
        }),
    ),
    document.querySelectorAll("#t-inv [data-sl]").forEach(
      (p) =>
        (p.onchange = () => {
          const P = p.dataset.sl;
          ((A.slots = p.checked ? [...new Set(A.slots.concat(P))] : A.slots.filter((_) => _ !== P)),
            w());
        }),
    ),
    document.querySelectorAll("#t-inv [data-q]").forEach(
      (p) =>
        (p.onclick = () => {
          const P = Q6[+p.dataset.q];
          (_6(Object.assign(is(), P[1])), k("Bộ lọc: " + P[0]), w());
        }),
    ),
    document.querySelectorAll("#t-inv [data-pl]").forEach(
      (p) =>
        (p.onclick = () => {
          const P = L4()[+p.dataset.pl];
          P && (_6(P), k(`Dùng bộ lọc ${+p.dataset.pl + 1}`), w());
        }),
    ),
    document.querySelectorAll("#t-inv [data-ps]").forEach(
      (p) =>
        (p.onclick = () => {
          (lp(+p.dataset.ps), k(`Đã lưu bộ lọc ${+p.dataset.ps + 1}`), w());
        }),
    ),
    (m("#bStash").onclick = () => Rt()),
    (m("#bKtcI").onclick = () => iA()),
    m("#epLoot"))
  ) {
    const p = WA().ep,
      P = () => {
        ($(), (R = !0));
      };
    ((m("#eWhite").onchange = (_) => {
      ((p.white = _.target.checked), P());
    }),
      (m("#eJew").onchange = (_) => {
        ((p.jew = _.target.checked), P());
      }),
      (m("#eBlue").onchange = (_) => {
        ((p.blue = _.target.checked), P());
      }),
      (m("#eBlueLv").onchange = (_) => {
        ((p.blueLv = +_.target.value), P());
      }),
      (m("#eDest").onchange = (_) => {
        ((p.dest = _.target.value), P());
      }));
  }
  ((m("#bBest").onclick = () => {
    let p = 0;
    for (let _ = 0; _ < 14; _++) {
      let y = null,
        M = 0.01;
      for (const B of o.inv) {
        if (!FA(B)) continue;
        const O = Z3(B);
        O > M && ((M = O), (y = B));
      }
      if (!y) break;
      (J1(y, !0), p++);
    }
    const P = o.inv.filter(
      (_) => !_.pack && !_.ktc && !FA(_) && typeof Fn == "function" && Fn(_) && !p0(_),
    ).length;
    (k(
      p
        ? `Đã mặc ${p} món tốt hơn`
        : P
          ? `Không có món mặc được ngay · ${P} món mạnh hơn nhưng chưa đủ điều kiện (▲ xám)`
          : "Đồ đang mặc đã tốt nhất",
    ),
      V());
  }),
    (m("#bDonKho").onclick = () => ni()),
    (m("#bSellAll").onclick = () =>
      K8((p) => {
        (k(
          `Bán ${p.n} món (+${q(p.gold)} lượng)${p.kept ? `, giữ ${p.kept} món được bảo vệ` : ""}`,
        ),
          V());
      })),
    document
      .querySelectorAll("#t-inv .invgrid .it")
      .forEach((p) => (p.onclick = () => He(xs(p.dataset.uid)))));
};

var Ao = function () {
  setTimeout(() => {
    const t = document.getElementById("bGcode");
    t && (t.onclick = () => Tx());
  }, 0);
  const A = typeof h0 == "function" && h0() && !b.offline;
  m("#t-more").innerHTML =
    `<div class="btnrow"><button class="btn" id="bSwitchCharacter">👤 Đổi nhân vật</button><button class="btn red" id="bLogout">⏻ Thoát game</button></div>
    <div class="btnrow"><button class="btn" id="bGcode">🎟 Nhập Giftcode</button></div>${
      A
        ? `<h3>Lưu game</h3><div class="card"><p class="dim small">Nhân vật tự lưu lên máy chủ khi đã đăng nhập (vài phút một lần, khi ẩn tab, đổi nhân vật và khi Đăng xuất). Đăng nhập cùng tài khoản ở máy / điện thoại khác là chơi tiếp.</p><div class="btnrow"><button class="btn" id="bCloud">🌐 Tài khoản · Lưu đám mây</button></div></div>
    `
        : `<h3>Lưu game</h3><div class="card"><p class="dim small">${window.localGameAuth ? "Nhân vật tự lưu theo tài khoản trên máy chủ (3 slot). Đăng nhập cùng tài khoản để chơi tiếp. Có thể sao lưu thêm bằng file:" : "Nhân vật lưu trong trình duyệt của từng thiết bị (3 slot). Để chơi trên thiết bị khác:"} bấm <b>Tải file lưu</b>, chuyển file <code>.jxsave</code> sang thiết bị kia (Zalo, Drive, cáp…), rồi mở game ở đó và bấm <b>Nạp từ file</b>. File có chữ ký, sửa tay sẽ bị từ chối. Nên tải file định kỳ để sao lưu.</p>
    <div class="btnrow"><button class="btn" id="bDl">Tải file lưu (.jxsave)</button><button class="btn" id="bFile">Nạp từ file</button></div>
    <p class="dim small">Hoặc dùng mã văn bản:</p><div class="btnrow"><button class="btn" id="bExp">Xuất mã</button><button class="btn" id="bImp">Nhập mã</button></div><textarea id="saveTxt" rows="4" placeholder="Mã lưu game"></textarea></div>`
    }
    <h3>Âm thanh</h3><div class="card lootf">
      <label><input type="checkbox" id="sOn" ${g1().on ? "checked" : ""}> Tiếng động (đòn đánh, chiêu, quái, rơi đồ)</label>
      <div class="row">Âm lượng <input type="range" id="sVol" min="0" max="1" step="0.05" value="${g1().vol}"></div>
      <label><input type="checkbox" id="mOn" ${g1().music ? "checked" : ""}> Nhạc nền theo bản đồ</label>
      <div class="row">Nhạc <input type="range" id="mVol" min="0" max="1" step="0.05" value="${g1().mvol}"></div></div>
    <h3>Tự động</h3><div class="card"><label><input type="checkbox" id="cAuto" ${o.autoEquip ? "checked" : ""}> Tự mặc đồ tốt hơn khi nhặt</label><br>
      <label><input type="checkbox" id="cPot" ${o.potOff ? "" : "checked"}> Tự dùng thuốc khi sinh lực / nội lực dưới 50% · đã dùng ${F(o.potUsed || 0)}</label><br>
      <label><input type="checkbox" id="cPotBuy" ${o.potBuy === !1 ? "" : "checked"}> Tự mua thuốc khi hết</label><br>
      <label><input type="checkbox" id="cRide" ${o.autoRide === !1 ? "" : "checked"}> Auto tự lên ngựa khi di chuyển, xuống ngựa khi đánh bằng chiêu không dùng được trên ngựa</label>
      <div class="row small">${[0, 1]
        .map((t) => {
          const e = typeof Za == "function" ? Za(t) : { name: "" };
          return `<button class="btn sm" data-potsl="${t}">${t ? "Nội lực (ô 2)" : "Sinh lực (ô 1)"}: ${D(e.name || "Tự động")} ▾</button>`;
        })
        .join(" ")}</div>
      <label><input type="checkbox" id="cJunk" ${o.autoJunk === !1 ? "" : "checked"}> Tự bán đồ thừa (yếu hơn đồ đang mặc cùng ô, vũ khí sai loại của phái; giữ tối đa 6 nhẫn / dây chuyền / ngọc bội để hợp Huyền Tinh)</label><br>
      <label><input type="checkbox" id="cPts" ${o.autoPts === !0 ? "checked" : ""}> Tự cộng điểm tiềm năng và võ công (mặc định tắt: tự cộng ở thẻ Nhân vật và Võ công)</label></div>
    <h3>Tiện ích</h3><div class="card lootf">

      <label><input type="checkbox" id="cBuy" ${o.autoBuy === !1 ? "" : "checked"}> Tự mua vũ khí đúng loại ở Biện Kinh khi mạnh hơn ≥ 25% (tối đa 60% ngân lượng)</label>
      <div class="btnrow"><button class="btn" id="bKtc">🏮 Kỳ Trân Các</button><button class="btn" id="bStashM">Kho chung</button><button class="btn" id="bTut">Hướng dẫn</button><button class="btn" id="bCodex">Bách khoa</button><button class="btn" id="bSug">Gợi ý cộng điểm</button></div></div>
    <h3>Trợ năng</h3><div class="card lootf">
      <div class="row">Cỡ chữ <select id="uFs">${l5.map((t, e) => `<option value="${e}" ${Pi().fs === e ? "selected" : ""}>${B_[e]}</option>`).join("")}</select> <small class="dim">áp dụng cho bảng thông tin, thẻ và hộp thoại</small></div>
      <label><input type="checkbox" id="uSaver" ${Pi().saver ? "checked" : ""}> Tiết kiệm pin (vẽ 30 khung/giây, ngừng vẽ khi ẩn tab)</label>
      <small class="dim">Tay cầm: cần analog / D-pad để đi, A B X Y dùng chiêu 1–4, LB / RB uống thuốc HP / MP. Phím Esc đóng hộp thoại.</small></div>
    <h3>Điều khiển & Hiển thị</h3><div class="card">
      <label><input type="checkbox" id="cLowFx" ${o.lowFx ? "checked" : ""}> Giảm hiệu ứng (mượt hơn trên máy yếu / đông quái)</label></div>
    <h3>Nguồn dữ liệu</h3><div class="card small dim">Kỹ năng, quái, trang bị, thuộc tính và tỉ lệ rơi đồ trích từ dữ liệu Võ Lâm Truyền Kỳ 1 (bản fan chơi offline, phi thương mại).</div>`;
  const n = (t, e) => {
    const a = m(t);
    a && (a.onclick = e);
  };
  (n("#bCloud", () => Y0("acc")),
    n("#bDl", () => {
      dP() && k("Đã tải file lưu: " + Vd());
    }),
    n("#bFile", () => F8(null)),
    n("#bExp", () => {
      ((m("#saveTxt").value = fP()), k("Đã xuất mã"));
    }),
    n("#bImp", () => Rf(m("#saveTxt").value, null)),
    (m("#cAuto").onchange = (t) => {
      ((o.autoEquip = t.target.checked), $());
    }),
    (m("#cJunk").onchange = (t) => {
      ((o.autoJunk = t.target.checked), $());
    }),
    (m("#sOn").onchange = (t) => {
      (j8(), (g1().on = t.target.checked), ks(), $());
    }),
    (m("#mOn").onchange = (t) => {
      (j8(),
        (g1().music = t.target.checked),
        ks(),
        g1().music && _e(l.town ? E0.town.id : AA(Math.min(o.stage, d0)).id),
        $());
    }),
    (m("#sVol").oninput = (t) => {
      ((g1().vol = +t.target.value), ks());
    }),
    (m("#mVol").oninput = (t) => {
      ((g1().mvol = +t.target.value), ks());
    }),
    (m("#sVol").onchange = m("#mVol").onchange = () => $()),
    (m("#cPot").onchange = (t) => {
      ((o.potOff = !t.target.checked), $());
    }),
    (m("#cPotBuy").onchange = (t) => {
      ((o.potBuy = t.target.checked), $());
    }),
    (m("#cRide").onchange = (t) => {
      ((o.autoRide = t.target.checked), $());
    }),
    document
      .querySelectorAll("[data-potsl]")
      .forEach((t) => (t.onclick = () => oo(+t.dataset.potsl))),
    (m("#cPts").onchange = (t) => {
      ((o.autoPts = t.target.checked), o.autoPts && (yt(), Pt(), D0()), $());
    }),
    (m("#cLowFx").onchange = (t) => {
      ((o.lowFx = t.target.checked), $());
    }),
    (m("#cBuy").onchange = (t) => {
      ((o.autoBuy = t.target.checked), $());
    }),
    (m("#bStashM").onclick = () => Rt()),
    (m("#bKtc").onclick = () => iA()),
    (m("#bTut").onclick = () => gg(0)),
    (m("#bCodex").onclick = () => Lk()),
    (m("#bSug").onclick = D2),
    (m("#uFs").onchange = (t) => {
      i5({ fs: +t.target.value });
    }),
    (m("#uSaver").onchange = (t) => i5({ saver: t.target.checked })),
    n("#bSwitchCharacter", async () => {
      const button = m("#bSwitchCharacter");
      button.disabled = !0;
      try {
        await rP();
      } finally {
        button.disabled = !1;
      }
    }),
    n("#bLogout", () => Fg()));
};

var fA = function (A) {
  ((PA = A),
    document.body.classList.toggle("tablog", A === "log"),
    document.body.classList.contains("u2m") &&
      typeof St == "function" &&
      typeof lA < "u" &&
      lA &&
      requestAnimationFrame(() => {
        (St(), typeof jn == "function" && jn());
      }),
    document
      .querySelectorAll("#tabs button")
      .forEach((n) => n.classList.toggle("on", n.dataset.t === A)),
    document
      .querySelectorAll("#panel .tab")
      .forEach((n) => n.classList.toggle("hidden", n.id !== "t-" + A)),
    V());
};

var V = function () {
  (typeof cg == "function" && cg(),
    o.fac &&
      (l.dirty && D0(),
      { log: yv, char: Bs, skill: Zn, inv: An, forge: ll, quest: m2, more: Ao }[PA](),
      PA !== "inv" && typeof dn == "function" && dn() && ((R = !1), An()),
      qA(),
      _s()));
};

var _s = function () {
  m("#dotChar").classList.toggle("on", o.attrPts > 0);
  const A = m("#dotForge"),
    n = m("#dotQuest");
  (A && A.classList.toggle("on", kk()),
    n && n.classList.toggle("on", yk()),
    m("#dotSkill").classList.toggle(
      "on",
      (o.skPts > 0 && I[o.fac] && I[o.fac].skills.some((t) => Q1(T[t]))) || (ht() && o.lvl >= KA),
    ));
};

var Mv = function () {
  const A = l.P;
  if (!A) return;
  {
    const a = Jt(),
      i = m(".lvbox");
    a && i && i.style.setProperty("--pl", `url('${a.img}')`);
  }
  ((m("#lv").textContent = o.lvl), (m("#gold").textContent = q(o.gold)));
  {
    const a = m("#knbTop");
    a && (a.textContent = F(o.knb || 0));
  }
  m("#heroName").textContent = I[o.fac] ? I[o.fac].n : "";
  {
    let a = m("#skBuffs");
    a || ((a = document.createElement("div")), (a.id = "skBuffs"), m("#battle").appendChild(a));
    const r = (typeof a6 == "function" ? a6() : [])
      .map(
        (c) =>
          `<div class="sti" title="${D(c.n)}"><img src="${D(c.ic || "")}" alt=""><b>${$7(c.t)}</b></div>`,
      )
      .join("");
    const consumables = typeof arenaSimulator !== "undefined" && arenaSimulator?.warBuffs ? arenaSimulator.warBuffs() : "";
    const html = `<div class="buffrow support-effects">${r}</div>${consumables ? `<div class="buffrow war-effects" aria-label="Hiệu ứng vật phẩm Tống Kim">${consumables}</div>` : ""}`;
    a.innerHTML !== html && (a.innerHTML = html);
  }
  m("#stageLbl").textContent = l.battlefield
    ? MapsEngine.getMap(Z0.key)?.name || "Tống Kim"
    : l.dg
    ? l.dg.kind === "boat"
      ? "⛵ Phong Lăng Độ"
      : l.dg.kind === "wb"
        ? "Boss tuần"
        : l.dg.d.n
    : `${dg()[1]} ${AA(Math.min(o.stage, d0)).n} ${l.field && !l.town ? ` · hạ ${F(l.field.kills)}` : ""}`;
  const n = S.exp[o.lvl - 1] || 1;
  ((m("#xpBar").style.width = (o.xp / n) * 100 + "%"),
    (m("#xpTxt").textContent = `${((o.xp / n) * 100).toFixed(1)}%`),
    (m("#hpBar").style.width = (l.life / A.life) * 100 + "%"),
    (m("#hpTxt").textContent = `${F(l.life)} / ${F(A.life)}`),
    (m("#mpBar").style.width = (l.mana / A.mana) * 100 + "%"),
    (m("#mpTxt").textContent = `${F(l.mana)} / ${F(A.mana)}`),
    (m("#mainSk").textContent = A.main.n));
  const t = m("#lvS");
  t && (t.textContent = o.lvl);
  const e = m("#pwS");
  e && l.P && (e.textContent = F(Math.round(l.P.main.tot)));
};

var F8 = function (A) {
  if (typeof h0 == "function" && h0()) {
    k("Bản online chỉ dùng lưu đám mây");
    return;
  }
  const n = document.createElement("input");
  ((n.type = "file"),
    (n.accept = ".jxsave,.json,.txt,application/json,text/plain"),
    (n.style.display = "none"),
    (n.onchange = () => {
      const t = n.files && n.files[0];
      if ((n.remove(), !t)) return;
      const e = new FileReader();
      ((e.onload = () => Rf(String(e.result), A)),
        (e.onerror = () => k("Không đọc được file")),
        e.readAsText(t));
    }),
    document.body.appendChild(n),
    n.click());
};

var Rf = function (A, n, t) {
  if (typeof h0 == "function" && h0()) {
    k("Bản online chỉ dùng lưu đám mây");
    return;
  }
  let e;
  try {
    e = Ud(A);
  } catch (c) {
    k(c.message || "File không hợp lệ");
    return;
  }
  const a = I[e.fac],
    i = `${D(a.n)} cấp ${Math.max(1, Math.min(Q2, e.lvl | 0))}`,
    r = [...Array(V1).keys()]
      .map((c) => {
        const d = ms(c),
          f = d && I[d.fac];
        return `<div class="slotrow ${d ? "" : "empty"}"><span><b>Slot ${c + 1}</b><small>${d && f ? D(f.n) + " cấp " + d.lvl + " (sẽ bị ghi đè)" : "Trống"}</small></span><button class="btn ${d ? "red" : ""}" data-into="${c}">${d ? "Ghi đè" : "Nạp vào"}</button></div>`;
      })
      .join("");
  J(
    `<h3>Nạp file lưu</h3><p class="desc">Nhân vật trong file: <b>${i}</b>. Chọn slot để nạp (slot đã có nhân vật sẽ giữ một bản sao lưu).</p><div class="slotlist">${r}</div>${n ? '<div class="btnrow"><button class="btn" id="impBack">Quay lại</button></div>' : ""}`,
    () => {
      document.querySelectorAll("#mBody [data-into]").forEach(
        (d) =>
          (d.onclick = () => {
            try {
              (m0 === +d.dataset.into && (HA = !0), Xd(+d.dataset.into, e));
            } catch (f) {
              k(f.message);
              return;
            }
            location.reload();
          }),
      );
      const c = m("#impBack");
      c && (c.onclick = n);
    },
    !!n && !o.fac,
  );
};

var Ir = function s(A) {
  const n = [...Array(V1).keys()]
    .map((t) => {
      const e = ms(t),
        a = e && I[e.fac];
      if (!e || !a)
        return `<div class="slotrow empty"><span><b>Slot ${t + 1}</b><small>Trống</small></span><button class="btn" data-play="${t}">Tạo nhân vật</button></div>`;
      const i = e.last ? new Date(e.last).toLocaleString("vi-VN") : "";
      return A === t
        ? `<div class="slotrow del"><span><b>Xóa slot ${t + 1}?</b><small>${D(a.n)} cấp ${e.lvl} sẽ mất vĩnh viễn</small></span><button class="btn red" data-del-yes="${t}">Xóa</button><button class="btn" data-del-no="1">Hủy</button></div>`
        : `<div class="slotrow"><img src="${D((Jt(e.fac, e.sex) || {}).img || "")}" alt=""><span><b style="color:${w0[a.series]}">${D(e.name && e.name !== a.n ? e.name + " · " : "")}${D(a.n)}</b><small>Cấp ${e.lvl} · ải ${e.stage}${i ? " · " + D(i) : ""}</small></span><button class="btn" data-play="${t}">Chơi</button><button class="btn red" data-del="${t}">Xóa</button></div>`;
    })
    .join("");
  J(
    `<h3>Chọn nhân vật</h3><p class="desc">Mỗi slot là một nhân vật riêng, lưu độc lập.</p><div class="slotlist">${n}</div>${typeof h0 == "function" && h0() ? "" : '<div class="btnrow"><button class="btn" id="slotImp">Nạp từ file lưu (.jxsave)</button></div>'}`,
    () => {
      const t = m("#slotCloud");
      t && (t.onclick = () => Y0("acc"));
      const e = m("#slotImp");
      (e && (e.onclick = () => F8(() => s())),
        document.querySelectorAll("#mBody [data-play]").forEach(
          (a) =>
            (a.onclick = () => {
              try {
                (localStorage.setItem(f1, a.dataset.play),
                  sessionStorage.setItem("jxidle_in", a.dataset.play));
              } catch {}
              ((HA = !0), location.reload());
            }),
        ),
        document
          .querySelectorAll("#mBody [data-del]")
          .forEach((a) => (a.onclick = () => s(+a.dataset.del))),
        document.querySelectorAll("#mBody [data-del-no]").forEach((a) => (a.onclick = () => s())),
        document
          .querySelectorAll("#mBody [data-del-yes]")
          .forEach((a) => (a.onclick = () => Fd(+a.dataset.delYes))));
    },
    !0,
  );
};
