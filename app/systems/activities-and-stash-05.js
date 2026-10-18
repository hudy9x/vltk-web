// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var bM = function s() {
  const A = Yu(),
    n = A.reduce((e, a) => e + jc(a, Math.max(Cn.tgt, a.enh || 0)), 0),
    t = Math.floor(((o.knb | 0) * Cn.pct) / 100);
  J(
    `<h3>Cường hóa hàng loạt <small>${o.knb | 0} KNB</small></h3>
    <p class="desc">Nâng mọi món đang mặc (trừ ngựa) lên mức mục tiêu, mỗi bước chọn món rẻ nhất trước. Từ +6 trở lên thất bại tụt 1 cấp.</p>
    <div class="card lootf"><div class="row">Mục tiêu <select id="bfT">${Array.from(
      { length: ut },
      (e, a) => a + 1,
    )
      .map((e) => `<option value="${e}" ${e === Cn.tgt ? "selected" : ""}>+${e}</option>`)
      .join("")}</select>
      · ngân sách <select id="bfP">${[25, 50, 75, 100].map((e) => `<option value="${e}" ${e === Cn.pct ? "selected" : ""}>${e}%</option>`).join("")}</select> (${t} KNB)</div>
      <div class="stats">${A.map((e) => `<span>${D(e.n)}</span><span>+${e.enh || 0}${(e.enh || 0) < Cn.tgt ? ` → +${Cn.tgt} ≈${F(jc(e, Cn.tgt))}` : " ✔"}</span>`).join("") || '<span class="dim">Chưa mặc trang bị</span><span></span>'}</div>
      <p class="small">KNB kỳ vọng tổng: <b>${n}</b> KNB${n > t ? " (vượt ngân sách: sẽ dừng giữa chừng)" : ""}</p>
      <div class="btnrow"><button class="btn" id="bfGo" ${n > 0 && t > 0 ? "" : "disabled"}>Bắt đầu</button></div></div>`,
    () => {
      ((m("#bfT").onchange = (e) => {
        ((Cn.tgt = +e.target.value), s());
      }),
        (m("#bfP").onchange = (e) => {
          ((Cn.pct = +e.target.value), s());
        }),
        (m("#bfGo").onclick = () =>
          _2(
            t,
            () => {
              const e = Ak(Cn.tgt, t);
              (k(
                e.tries
                  ? `${e.tries} lần, ${e.ok} thành công, −${e.spent} KNB`
                  : "Không đủ Kim Nguyên Bảo",
              ),
                o0(e.ok ? "learn" : "use"),
                V(),
                s());
            },
            "cuong hoa hang loat",
          )));
    },
  );
};

var nk = function (A) {
  const n = typeof me < "u" ? me.get(A) : null,
    t = n ? (n.req.find((e) => e[0] === 39) || [0, -1])[1] : -1;
  return { fac: t >= 0 ? t : "chung", slot: (n && typeof rA < "u" && rA[n.d]) || "khac" };
};

var tk = function () {
  const A = I[o.fac] ? I[o.fac].id : -1,
    n = vA
      .map(
        (e) =>
          `<option value="${e.id}" ${String(xA.fac) === String(e.id) ? "selected" : ""}>${D(e.n)}${e.id === A ? " (phái tôi)" : ""}</option>`,
      )
      .join(""),
    t = (typeof jl < "u" ? jl : [])
      .map(([e, a]) => `<option value="${e}" ${xA.slot === e ? "selected" : ""}>${a}</option>`)
      .join("");
  return `<div class="row mktf hkf"><select id="hkSt"><option value="">Tất cả</option><option value="ok" ${xA.st === "ok" ? "selected" : ""}>Ghép được</option><option value="no" ${xA.st === "no" ? "selected" : ""}>Chưa đủ mảnh</option></select>
    <select id="hkFac"><option value="">Mọi phái</option>${A >= 0 ? `<option value="my" ${xA.fac === "my" ? "selected" : ""}>Phái tôi</option>` : ""}<option value="chung" ${xA.fac === "chung" ? "selected" : ""}>Bộ chung (không phái)</option>${n}</select>
    <select id="hkSl"><option value="">Mọi vị trí</option>${t}</select>
    <select id="hkSo"><option value="ok" ${xA.sort === "ok" ? "selected" : ""}>Ghép được trước</option><option value="pct" ${xA.sort === "pct" ? "selected" : ""}>Gần đủ nhất</option><option value="have" ${xA.sort === "have" ? "selected" : ""}>Nhiều mảnh nhất</option><option value="name" ${xA.sort === "name" ? "selected" : ""}>Theo tên</option></select>
    <small class="dim" id="hkCnt"></small></div>`;
};

var qu = function () {
  const A = document.getElementById("hkCards");
  if (!A) return;
  const n = I[o.fac] ? String(I[o.fac].id) : "-1",
    t = [...A.children];
  let e = 0;
  for (const r of t) {
    const c = r.dataset,
      d = xA.fac === "my" ? n : xA.fac,
      f =
        (!xA.st || (xA.st === "ok") == (c.hkok === "1")) &&
        (!d || c.hkf === String(d)) &&
        (!xA.slot || c.hks === xA.slot);
    ((r.style.display = f ? "" : "none"), f && e++);
  }
  const a =
    {
      ok: (r) => -(+r.dataset.hkok * 1e6 + +r.dataset.hkr),
      pct: (r) => -+r.dataset.hkr,
      have: (r) => -+r.dataset.hkh,
      name: (r) => 0,
    }[xA.sort] || (() => 0);
  t.sort((r, c) => a(r) - a(c) || r.dataset.hkn.localeCompare(c.dataset.hkn, "vi")).forEach((r) =>
    A.appendChild(r),
  );
  const i = document.getElementById("hkCnt");
  i && (i.textContent = `${e} / ${t.length} món`);
};

var ek = function () {
  const A = (n, t, e) => {
    const a = document.getElementById(n);
    a &&
      (a[e] = () => {
        ((xA[t] = a.value), qu());
      });
  };
  (A("hkSt", "st", "onchange"),
    A("hkFac", "fac", "onchange"),
    A("hkSl", "slot", "onchange"),
    A("hkSo", "sort", "onchange"),
    qu());
};

var Qo = function s() {
  const A = Object.keys(S0().shard),
    n = Object.values(o.eq)
      .filter((i) => i && we(i))
      .concat(o.inv.filter(we))
      .sort((i, r) => !Ea(r) - !Ea(i)),
    t = (i) => {
      const r =
        S.sets.gold.find((c) => c.n === i) ||
        S.sets.gold.find((c) => c.ic && (c.n.endsWith(" " + i) || c.n.includes(i)));
      return r && r.ic ? r.ic : "img/ep/box3.png";
    },
    e = (i, r, c) =>
      `<span class="hkc ${i ? "ok" : "no"}">${r ? `<img src="${r}" alt="">` : ""}${c}</span>`,
    a = GA() >= H3;
  J(
    `<h3>Lò Hoàng Kim <small>${q(o.gold)} lượng</small></h3><div class="hkx">
    ${y0() ? '<div class="hkbar"><img src="img/ep/ht.png" alt=""><span><b>Huyền Tinh · đá thuộc tính · đồ Tím</b><small>luyện, thăng cấp Huyền Tinh, lấy thuộc tính, chế phôi, khảm nạm</small></span><button class="u2buy" id="htEp">Lò Ép Đồ</button></div>' : ""}
    <div class="hksec">Mảnh Hoàng Kim <small>rơi từ trùm · đủ mảnh ghép thành món</small></div>
    ${A.length ? tk() : ""}
    ${
      A.length
        ? `<div class="u2cards hkcards" id="hkCards">${A.map((i) => {
            const r = N("shard", i),
              c = NA[i],
              d = r >= c,
              f = nk(i);
            return `<div class="u2card${d ? " hkok" : ""}" data-hkn="${D(i.toLowerCase())}" data-hkok="${d ? 1 : 0}" data-hkf="${f.fac}" data-hks="${f.slot}" data-hkh="${r}" data-hkr="${Math.round((r / c) * 1e3)}"><div class="u2ct" title="${D(i)}">${D(i)}</div><div class="u2cb"><img src="${t(i)}" alt=""><div class="hkp"><div class="hkpb"><i style="width:${Math.min(100, (r / c) * 100)}%"></i></div><small><b class="${d ? "cp" : ""}">${r}</b> / ${c} mảnh${d && r >= c * 2 ? ` · ghép được ${Math.floor(r / c)}` : ""}</small></div></div>
        <div class="u2cf"><button class="u2buy" data-sh="${D(i)}" ${d ? "" : "disabled"}>Ghép</button><input type="number" class="hkn" data-shpn="${D(i)}" min="1" max="${r}" value="${r}" title="Số mảnh đóng gói"><button class="u2buy x" data-shp="${D(i)}" title="Đóng gói số mảnh đã chọn thành 1 món trong hành trang để gửi thư / bán Chợ">📦 Gói</button></div></div>`;
          }).join("")}</div>`
        : '<p class="dim small hkempty">Chưa có mảnh Hoàng Kim.</p>'
    }
${
  d3()
    ? `    <div class="hksec">Chế Bạch Kim <small>thành công 100% · nhận Bạch Kim +0 (không giữ cường hóa)</small></div>
    <div class="hkreq">${e(!0, "", `Hoàng Kim +${fs}`)}${e(N("misc", "mys") >= qa, "img/ep/mys.png", `Thần Bí ${N("misc", "mys")}/${qa}`)}${e(N("ht", pe) >= 1, "img/ep/ht.png", `Huyền Tinh c${pe} ${N("ht", pe)}/1`)}${e(o.gold >= B1, "", q(B1))}${e(a, "", `Mặc: cấp ${H3}${a ? "" : ` (hiện ${GA()})`}`)}</div>
    ${
      n
        .map((i) => {
          const r = g3(i.n),
            c = Ea(i),
            d = Object.values(o.eq).includes(i),
            f = i.enh || 0;
          return `<div class="hkrow${c ? "" : " ready"}"><img class="hki" src="${i.ic || t(i.n)}" alt=""><div class="hkm"><div><b style="color:${_0[4]}">${D(i.n)}</b> <span class="hke ${f >= fs ? "ok" : ""}">+${f}</span>${d ? ' <span class="hkw">đang mặc</span>' : ""}</div>
        <div class="hkto">➜ <span style="color:${_0[5]}">${D(r ? r.n : "?")}</span></div>${c ? `<small class="cn">${D(c)}</small>` : ""}</div><button class="u2buy" data-pm="${i.uid}" ${c ? `disabled title="${D(c)}"` : ""}>Chế</button></div>`;
        })
        .join("") ||
      '<p class="dim small hkempty">Chưa có món Hoàng Kim nào chế được Bạch Kim (41 món theo VNG).</p>'
    }
    <p class="dim small hknote">Món đang mặc chế xong tự mặc lại. Thăng cấp +1 → +10: bấm vào món Bạch Kim ở Rèn đồ.</p>`
    : ""
}</div>`,
    () => {
      const i = m("#htEp");
      (i && (i.onclick = () => Ke("tl")),
        ek(),
        document
          .querySelectorAll("#mBody [data-sh]")
          .forEach((r) => (r.onclick = () => zo(ad(r.dataset.sh), s))),
        document
          .querySelectorAll("#mBody [data-shp]")
          .forEach(
            (r) =>
              (r.onclick = () =>
                zo(
                  m9(
                    r.dataset.shp,
                    +(
                      (
                        document.querySelector(
                          `#mBody [data-shpn="${CSS.escape(r.dataset.shp)}"]`,
                        ) || {}
                      ).value || 0
                    ),
                  ),
                  s,
                )),
          ),
        document.querySelectorAll("#mBody [data-pm]").forEach(
          (r) =>
            (r.onclick = () => {
              const c = n.find((d) => d.uid === +r.dataset.pm);
              c && zo(id(c), s);
            }),
        ));
    },
  );
};

var ju = (s, A) => 1 + A;

var Kc = (s) => Math.max(0.1, 1 - 0.1 * s);

var L1 = (s) => ju(s, s.enh || 0);

var Go = (s) => (s.enhP && s.enhP[s.enh || 0]) || [0, 0];

var zu = 0.1;

var ak = 10;

var sk = 0.465;

var Rc = (s) => Math.min(ak, Go(s)[0]) * zu;

var Qu = (s) => Go(s)[1] >= 0.9999;

var Yc = (s) => (Qu(s) ? 1 : Math.min(1, Kc(s.enh || 0) * (1 + Rc(s))));

var ik = 6;

var Fc = (s) => s >= ik;

var ok = (s) =>
  Math.round((500 + s.lvl * 400) * (1 + (s.mag || []).length * 0.5) * (1 + o.lvl / 15));

var Gu = 0.75;

var Ku = (s, A) => Math.round(ok(s) * (1 + Gu * A));

var Ru = (s) => !s.set && !s.vio && !s.thanma && (s.mag || []).length > 0;

var Vc = (s) => !!s && s.d !== 10;

var Uc = { uid: 0, keep: new Set(), cand: null };

var Fs = {};

var Cn = { tgt: 5, pct: 50 };

var Yu = () => un.map(([s]) => o.eq[s]).filter((s) => s && s.d !== 10);

var xA = { q: "", st: "", fac: "", slot: "", sort: "ok" };

var Fu = function (A) {
  const n = IA(A),
    t = n.lvl < Sa ? ` · chạm: 3 viên → c${n.lvl + 1} (${$t(ue(n.lvl))}, ${q(wA.up)} lượng)` : "";
  return `<button class="it ep-st" data-st="${A}" title="${D(Mt(A) + " · " + hk(n.a) + " · cấp " + n.lvl + t)}"><img src="${Wc(n.place)}" alt=""><i>c${n.lvl}</i><em class="ep-pl"${n.s >= 0 ? ` style="color:${w0[n.s]}"` : ""}>${n.place + 1}</em><b class="ep-n">×${N("ore", A)}</b></button>`;
};

var Xc = function () {
  const A = Ag();
  A.includes(t0.ht) || (t0.ht = A[A.length - 1] || 0);
};

var Ko = function (A) {
  const n = Ag();
  return (
    A && Xc(),
    `<div class="ep-ht">${n.map((t) => (A ? `<button class="ep-htc${t0.ht === t ? " ep-on" : ""}" data-ht="${t}" title="Huyền Tinh Khoáng Thạch cấp ${t} · giá trị ${q(pA[t])}"><img src="img/ep/ht.png" alt=""><i>c${t}</i><b>×${N("ht", t)}</b></button>` : `<span class="ep-htc" title="Huyền Tinh Khoáng Thạch cấp ${t}"><img src="img/ep/ht.png" alt=""><i>c${t}</i><b>×${N("ht", t)}</b></span>`)).join("") || '<small class="dim">Chưa có Huyền Tinh (hạ tinh anh / trùm, Dã Tẩu, hoặc luyện ở thẻ Tinh luyện)</small>'}</div>`
  );
};

var Vu = function () {
  const A = (n, t) => {
    const e = Math.min(9, k3(n));
    return `<label class="small" style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;white-space:nowrap">${t} <select data-aux="${n}" style="width:auto;min-width:44px;display:inline-block" ${fe.on && e ? "" : "disabled"}>${Array.from({ length: e + 1 }, (a, i) => `<option value="${i}" ${(fe[n] | 0) === i ? "selected" : ""}>${i}</option>`).join("")}</select> <span class="dim">/ ${k3(n)}</span></label>`;
  };
  return `<div class="small" style="margin:4px 0"><label><input type="checkbox" id="epAux" ${fe.on ? "checked" : ""} ${T9() ? "" : "disabled"}> Phụ liệu</label> <span class="dim">(cộng giá trị: Thủy Tinh ${q(Na.wc)} · Thần Bí K.T ${q(Na.mys)} · Phúc Duyên Lộ = ${y3} Phúc Duyên ${q(Na.fd)}; giảm dần khi vượt giá trị nguyên liệu chính)</span><br>
    ${A("wc", "Thủy Tinh")}${A("mys", "Thần Bí K.T")}${A("fd", "Phúc Duyên Lộ")}</div>`;
};

var rk = function () {
  return `<div class="dtabs">${[
    ["tl", "Tinh luyện"],
    ["hut", "Lấy thuộc tính"],
    ["phoi", "Chế tạo phôi"],
    ["kham", "Khảm nạm"],
    ["box", `Kho Rèn (${a0().length})`],
  ]
    .map(([n, t]) => `<button data-et="${n}" class="${t0.tab === n ? "on" : ""}">${t}</button>`)
    .join("")}</div>`;
};

var Jc = function (A) {
  return `<div class="idet"><div class="pic r${A.r}">${A.ic ? `<img src="${D(A.ic)}" alt="">` : ""}</div><div><h4 style="color:${_0[A.r]}">${D(A.n)}${A.vio ? ` <small class="vtag">Tím ${A.mag.length}/${Y1(A)}</small>` : ""}</h4><small class="dim">${D(S.items[A.d].n)} · cấp ${A.lvl}${A.s >= 0 && A.s < 5 ? ` · <span style="color:${w0[A.s]}">hệ ${g0[A.s]}</span>` : ""}${a0().includes(A) ? " · trong Kho Rèn" : Object.values(o.eq).includes(A) ? " · đang mặc" : ""}</small></div></div>`;
};

var ck = function () {
  const A = Yo(e8),
    n = Object.keys(S0().ht)
      .map(Number)
      .sort((r, c) => r - c);
  t0.fuse = t0.fuse.filter((r) => A.some((c) => c.uid === r));
  const t = A.filter((r) => t0.fuse.includes(r.uid)),
    a = (t.length === 3 ? W6(t) : "x") ? null : O9(t),
    i = vn.filter((r) => !t.some((c) => c.d === r)).map((r) => C9[r]);
  return `<div class="card"><b>Luyện Huyền Tinh Khoáng Thạch</b> <small class="dim">1 nhẫn + 1 dây chuyền + 1 ngọc bội thường + ${q(d1())} lượng → Huyền Tinh cấp theo giá trị (số dòng mỗi món: 0 dòng ${q(A8[0])} … 6 dòng ${q(A8[6])}; c1 ${q(pA[1])}, c2 ${q(pA[2])}, c3 ${q(pA[3])}, c4 ${q(pA[4])}, c5 ${q(pA[5])})</small>
      <div class="invgrid ep-grid" id="epFuseG">${A.map((r) => W1(r).replace('class="it', `class="it${t0.fuse.includes(r.uid) ? " ep-on" : ""}`)).join("")}</div>${A.length ? "" : '<small class="dim">Không có nhẫn / dây chuyền / ngọc bội chưa mặc, chưa khóa</small>'}
      <div class="small">${a ? `Giá trị ${q(a.src)} → ${b3(a.probs, (r) => "c" + (r + 1))}${Fo(1 - a.sum)}` : `<span class="dim">Chọn thêm: ${i.join(", ") || "—"}</span>`}</div>
      <div class="btnrow"><button class="btn" id="epFuse" ${a && o.gold >= d1() ? "" : "disabled"}>Luyện (${t.length}/3)</button><button class="btn" id="epFuseAuto" ${Oa(Gt()).length === 3 && o.gold >= d1() ? "" : "disabled"}>Tự chọn 3 món thừa</button></div></div>
    <div class="card"><b>Thăng cấp Huyền Tinh</b> <small class="dim">3 viên cùng cấp + ${q(wA.up)} lượng → 1 viên cấp +1 · thất bại mất 1 viên</small>
      ${n.map((r) => `<div class="ep-row"><span class="ep-htc"><img src="img/ep/ht.png" alt=""><i>c${r}</i><b>×${N("ht", r)}</b></span><button class="btn sm" data-up="${r}" ${N("ht", r) >= 3 && r < MA && o.gold >= wA.up ? "" : "disabled"}>${r < MA ? `Thăng lên cấp ${r + 1} · ${$t(ue(r))}` : "Tối đa"}</button></div>`).join("") || '<small class="dim">Chưa có Huyền Tinh</small>'}</div>
    <div class="card"><b>Thăng cấp đá thuộc tính</b> <small class="dim">ở thẻ Kho Rèn: chạm viên đá (3 viên cùng loại, cùng cấp + ${q(wA.up)} → +1 cấp; ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => `c${r}→${r + 1} ${$t(ue(r))}`).join(", ")}; thất bại mất 1 viên)</small></div>`;
};

var Uu = function () {
  const A = fl(),
    n = (t, e, a, i = (r) => r) =>
      `<select id="${t}">${e.map((r) => `<option value="${r}" ${a === r ? "selected" : ""}>${i(r)}</option>`).join("")}</select>`;
  return `<div class="card"><label><input type="checkbox" id="ahOn" ${A.on ? "checked" : ""}> <b>⚗ Tự rút thông minh</b></label> <button class="btn sm" id="ahNow" ${A.on ? "" : "disabled"}>Rút ngay</button>
    <div class="row small">Dòng từ cấp ${n("ahLv", [1, 2, 3, 4, 5, 6, 7], A.minLv)} · Huyền Tinh tối đa c${n("ahHt", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], A.htMax)} · tối đa ${n("ahCap", [1, 2, 3, 5, 10], A.cap)} viên / loại · giữ ${n("ahRes", [0, 1e4, 5e4, 2e5, 1e6], A.reserve, F)} lượng</div>
    <div class="dim small">Rút đồ xanh không được bộ lọc giữ: ưu tiên dòng phôi Tím đang cần, rồi dòng cấp cao. Không dùng phụ liệu. Không đụng đồ khóa / bộ / Tím / đang mặc / nâng cấp (▲ △).</div></div>`;
};

var lk = function () {
  const A = Yo(Wu).sort((c, d) => d.r - c.r || d.lvl - c.lvl);
  let n = Ye(t0.sel);
  if (((!n || !A.includes(n)) && (n = A[0]), !n))
    return Uu() + '<p class="dim">Không có đồ xanh trong hành trang hoặc Kho Rèn.</p>';
  t0.sel = n.uid;
  const t = t0.ht,
    e = h3(),
    a = x3(n),
    i = n.lock ? "Món đang khóa 🔒 — mở khóa ở chi tiết món" : t ? "" : "Cần Huyền Tinh",
    r = n.mag
      .map((c, d) => {
        const f = a8(n, d),
          h = f && t ? Ad(n, d, t, e) : null,
          g = Math.min(d, R1 - 1);
        return `<div class="ep-opt">${f ? `<span class="it ep-st"><img src="${Wc(g)}" alt=""><i>c${B3(c)}</i></span>` : '<span class="it ep-st"></span>'}<span class="${d % 2 ? "h" : "m"}">${ng(c)}<br><small class="dim">${f ? `dòng cấp ${B3(c)} (${q(V0[D3(c)].base)}) → ${le[g]}${g % 2 ? ` hệ ${g0[n.s] || "—"}` : ""}${h ? `: ${b3(h.probs, (u) => "c" + (u + 1))}${Fo(1 - h.sum)}` : ""}` : "không lấy được"}</small></span>
      <span></span><span class="btnrow">${f && !i ? `<button class="btn sm" data-hut="${d}:${g}" ${o.gold >= a ? "" : "disabled"} title="${D(le[g])}">Lấy</button>` : ""}</span></div>`;
      })
      .join("");
  return (
    Uu() +
    `<div class="card">${Jc(n)}<small class="dim">Lấy 1 dòng → 1 viên đá đúng vị trí dòng (dòng ẩn: đá mang hệ ${g0[n.s] || "—"}) · món mất · ${q(a)} lượng + 1 Huyền Tinh · cấp đá theo giá trị dòng + Huyền Tinh${gd(e) ? " + phụ liệu" : ""}</small>
      <div class="dim small">Chọn Huyền Tinh (cấp cao: đá cấp cao hơn):</div>${Ko(!0)}${Vu()}${i ? `<div class="cn small">${i}</div>` : ""}${r}</div>
    <h3>Đồ có thể lấy thuộc tính <small>${A.length} món</small></h3>${Al(A, n)}`
  );
};

var dk = function () {
  const A = Yo(Zc).sort((r, c) => c.lvl - r.lvl || r.r - c.r);
  let n = Ye(t0.sel);
  (!n || !A.includes(n)) && (n = A[0]);
  const t = (r) => {
      const c = E9(r);
      return c.length ? `${c[0][0]} dòng · ${c[0][1]}%` : "thất bại";
    },
    e = (r) => {
      const c = Dd(r);
      return (b3(c.probs, (d) => `${d + 1} dòng`) || "") + Fo(1 - c.sum);
    },
    a = `<p class="desc">Trang bị trắng / xanh (không gồm trang sức) + 1 Huyền Tinh + ${q(wA.phoi)} lượng → phôi Tím 1–6 khung (trang bị thường không tính giá trị; Huyền Tinh c1 không đủ → thất bại, mất cả trang bị).</p>
    <div class="chips">${[1, 2, 3, 4, 5].map((r) => `<span class="chip2${t0.ht && Math.min(t0.ht, 5) === r ? " on" : ""}"><span class="dim">c${r}${r === 5 ? "+" : ""}</span>&nbsp;<b>${t(r)}</b></span>`).join("")}</div>`;
  if (!n) return a + '<p class="dim">Không có đồ trắng / xanh phù hợp.</p>';
  t0.sel = n.uid;
  const i = n.lock
    ? "Món đang khóa 🔒"
    : t0.ht
      ? o.gold < wA.phoi
        ? "Không đủ ngân lượng"
        : ""
      : "Cần Huyền Tinh";
  return `${a}<div class="card">${Jc(n)}${Ko(!0)}${t0.ht ? `<div class="small">Huyền Tinh c${t0.ht}: ${e(t0.ht)}</div>` : ""}
      <div class="btnrow"><button class="btn" id="epPhoi" ${i ? "disabled" : ""}>Chế tạo phôi${t0.ht ? ` · c${t0.ht} → ${t(t0.ht)}` : ""}</button></div>${i ? `<div class="cn small">${i}</div>` : ""}</div>
    <h3>Chọn trang bị <small>${A.length} món</small></h3>${Al(A, n)}`;
};

var Xu = function () {
  const A = Yo(Re)
    .concat(Object.values(o.eq).filter(Re))
    .sort((d, f) => (f.mag || []).length - (d.mag || []).length || f.lvl - d.lvl);
  let n = Ye(t0.sel);
  (!n || !n.vio) && (n = A[0]);
  const t =
    Al(A, n) +
    (A.length
      ? ""
      : '<p class="dim small">Chưa có phôi Huyền Tinh: sang thẻ <b>Chế tạo phôi</b>.</p>');
  if (!n) return `<h3>Chọn phôi</h3>${t}`;
  ((t0.sel = n.uid), Xc());
  const e = (n.mag || []).length,
    a = Y1(n),
    i = t0.ht ? Z4(n, t0.ht) : [],
    r = Array.from({ length: a }, (d, f) => {
      const h = `<b class="ep-no">${f + 1}</b><small class="dim">${f % 2 ? "ẩn" : "hiện"}</small>`;
      if (f < e) {
        const g = n.mag[f];
        return `<div class="ep-slot done">${h}<img src="${Wc(f)}" alt=""><span class="vio">${ng(g)}</span><small class="dim">${t8(g) ? "c" + t8(g) : ""}</small></div>`;
      }
      return f === e
        ? `<div class="ep-slot next">${h}<span class="cp">◀ cần ${D(le[f] || "đá")}${f % 2 ? ` hệ ${g0[n.s]}` : ""}</span></div>`
        : `<div class="ep-slot">${h}<span class="dim">${D(le[f] || "đá")} · trống</span></div>`;
    }).join(""),
    c = i.length
      ? i
          .map(
            (d, f) =>
              `<div class="ep-opt">${Fu(d.key)}<span><b>${D(d.txt)}</b><br><small class="dim">${D(Mt(d.key))} c${IA(d.key).lvl} + Huyền Tinh c${d.ht} → ${b3(d.probs, (h) => "c" + V0[d.js[h]].lvl)}${Fo(d.fail)}</small></span><small class="${d.gain > 5e-4 ? "cp" : "dim"}">${J2(d.gain)}</small><button class="btn sm" data-ep="${f}">Khảm</button></div>`,
          )
          .join("")
      : `<p class="dim small">Không có ${D(le[Math.min(e, R1 - 1)])} hợp món này (đúng vị trí dòng ${e + 1}, thuộc tính gắn được vào ${D(S.items[n.d].n)}, hợp hệ ${g0[n.s] || "—"}, chưa trùng thuộc tính đã có), thiếu Huyền Tinh hoặc ngân lượng. Lấy thuộc tính từ đồ xanh để có đá.</p>`;
  return `<div class="card ep-main">${Jc(n)}<div class="ep-slots">${r}</div>
      <div class="dim small">Huyền Tinh dùng khi khảm (cấp cao: dòng cấp cao hơn, ít thất bại hơn):</div>${Ko(!0)}${Vu()}
      <div class="btnrow">${e ? "" : `<button class="btn red" id="epSell" ${vd(n) ? "" : "disabled"}>Bán (+${q(x0(n))} lượng)</button>`}</div>
      <div class="dim small">Mỗi lần khảm: 1 đá đúng dòng + 1 Huyền Tinh + ${q(wA.kham)} lượng · giá trị phôi ${q(Math.round($9(n)))} + Huyền Tinh + đá (+ phụ liệu) → cấp dòng · thất bại mất đá, Huyền Tinh, phụ liệu (giữ phôi) · khảm lần lượt từng dòng.</div></div>
    <h3>Đá cho dòng ${Math.min(e + 1, a)}</h3>${e < a ? c : '<p class="dim">Đã đủ dòng</p>'}
    <h3>Chọn phôi <small>${A.length} món</small></h3>${t}`;
};

var fk = function () {
  const A = Object.keys(S0().ore).sort(
      (i, r) => IA(i).place - IA(r).place || IA(r).lvl - IA(i).lvl,
    ),
    n = Array.from({ length: R1 }, (i, r) => A.filter((c) => IA(c).place === r)),
    t = a0(),
    e = o.inv.filter(Zu),
    a = t.filter((i) => vn.includes(i.d)).length;
  return `<div class="card"><b>Đá thuộc tính</b> <small class="dim">${A.reduce((i, r) => i + N("ore", r), 0)} viên · chạm đá để thăng cấp (3 viên cùng loại → +1 cấp, ${q(wA.up)} lượng, thất bại mất 1 viên) · số màu = hệ của đá dòng ẩn</small>
      <button class="btn sm" id="epOreAll" style="margin-left:6px">${Ro().length ? "Ẩn tất cả" : "Hiện tất cả"}</button>
      ${n
        .map((i, r) => {
          const c = Ro().includes(r),
            d = i.reduce((h, g) => h + N("ore", g), 0),
            f = i.length ? Math.max(...i.map((h) => IA(h).lvl)) : 0;
          return `<div class="ep-row"><button class="ep-no ep-otg" data-otg="${r}" style="min-width:150px">${c ? "▾" : "▸"} ${r + 1}. ${D(le[r])}<br><small class="dim">${d} viên${f ? " · cao nhất c" + f : ""}</small></button><div class="ep-stones${c ? "" : " ep-hide"}">${i.map((h) => Fu(h)).join("") || '<small class="dim">—</small>'}</div></div>`;
        })
        .join("")}</div>
    <div class="card"><b>Huyền Tinh</b>${Ko(!1)}<div class="ep-ht"><span class="ep-htc" title="Thủy Tinh"><img src="img/ep/wc.png" alt=""><b>×${N("misc", "wc")}</b></span><span class="ep-htc" title="Phúc Duyên"><img src="img/ep/fd.png" alt=""><b>${Q().fd || 0}</b></span><span class="ep-htc" title="Thần Bí Khoáng Thạch"><img src="img/ep/mys.png" alt=""><b>×${N("misc", "mys")}</b></span></div><small class="dim">Phụ liệu (Lấy thuộc tính / Khảm nạm): Thủy Tinh · Phúc Duyên (${y3} điểm = 1 Phúc Duyên Lộ) · Thần Bí Khoáng Thạch</small></div>
    <div class="card"><b>Phôi · đồ lấy thuộc tính · trang sức luyện Huyền Tinh</b> <small class="dim">${t.length}/${w1} · không chiếm hành trang · chạm món để lấy ra</small>
      <div class="btnrow"><button class="btn sm" id="epIn" ${e.length && t.length < w1 ? "" : "disabled"}>Cất ${e.length} món từ hành trang</button><button class="btn sm" id="epOutAll" ${t.length ? "" : "disabled"}>Lấy hết ra</button></div>
      <div class="dim small">Cất: phôi Huyền Tinh chưa đủ dòng · nhẫn / dây chuyền / ngọc bội không tốt hơn đồ đang mặc (${a} trong rương, dùng ở thẻ Tinh luyện) · đồ trắng · đồ xanh không khớp bộ lọc. Món khóa 🔒 không cất.</div>
      <div class="invgrid ep-grid" id="epBoxG">${t.map(W1).join("")}</div>
      <div class="btnrow"><button class="btn sm" id="epToStash" ${t.length ? "" : "disabled"}>Gửi hết sang Kho chung</button><button class="btn sm" id="epDon">🧹 Dọn kho</button><button class="btn sm" id="epLootCfg">⚙ Nhặt đồ để ép (bộ lọc)</button></div>
      <div class="dim small">Tự nhặt đồ để ép: ${(() => {
        const i = WA().ep;
        return (
          [
            i.white && "đồ trắng",
            i.jew && "nhẫn / dây chuyền / ngọc bội",
            i.blue && `đồ xanh có dòng cấp ≥ ${i.blueLv}`,
          ]
            .filter(Boolean)
            .join(", ") || "tắt"
        );
      })()} → ${{ box: "Kho Rèn", stash: "Kho chung", inv: "Hành trang" }[WA().ep.dest]}</div></div>`;
};

var Ke = function s(A, n) {
  if (
    (m("#modal").classList.contains("hidden") && (t0.oreOpen = []),
    A && (t0.tab = A),
    ["tl", "hut", "phoi", "kham", "box"].includes(t0.tab) || (t0.tab = "kham"),
    n && (t0.sel = n),
    Xc(),
    !y0())
  )
    return J('<h3>Lò Ép Đồ</h3><p class="desc">Chưa mở.</p>');
  const t = { tl: ck, hut: lk, phoi: dk, kham: Xu, box: fk },
    e = (t[t0.tab] || Xu)();
  J(`<h3>Lò Ép Đồ · Thợ Rèn <small>${q(o.gold)} lượng</small></h3>${rk()}${e}`, () => {
    (document
      .querySelectorAll("#mBody [data-et]")
      .forEach((d) => (d.onclick = () => s(d.dataset.et))),
      document.querySelectorAll("#mBody [data-ht]").forEach(
        (d) =>
          (d.onclick = () => {
            ((t0.ht = +d.dataset.ht), s());
          }),
      ));
    const a = m("#epAux");
    (a &&
      (a.onchange = (d) => {
        ((fe.on = d.target.checked), s());
      }),
      document.querySelectorAll("#mBody [data-aux]").forEach(
        (d) =>
          (d.onchange = () => {
            ((fe[d.dataset.aux] = +d.value), s());
          }),
      ),
      document.querySelectorAll("#mBody .ep-grid [data-uid]").forEach((d) => {
        t0.tab !== "box" && t0.tab !== "tl" && (d.onclick = () => s(t0.tab, +d.dataset.uid));
      }));
    const i = () => s(),
      r = (d) => {
        (k(d.msg), o0(d.ok ? "learn" : "use"), C(D(d.msg)), (l.dirty = !0), (R = !0), $(), i());
      },
      c = Ye(t0.sel);
    if (t0.tab === "tl")
      ((m("#epFuseAuto").onclick = () => {
        ((t0.fuse = Oa(Gt()).map((d) => d.uid)), i());
      }),
        document.querySelectorAll("#mBody #epFuseG [data-uid]").forEach(
          (d) =>
            (d.onclick = () => {
              const f = +d.dataset.uid,
                h = t0.fuse.indexOf(f),
                g = Ye(f);
              (h >= 0
                ? t0.fuse.splice(h, 1)
                : g &&
                  ((t0.fuse = t0.fuse.filter((u) => {
                    const w = Ye(u);
                    return w && w.d !== g.d;
                  })),
                  t0.fuse.push(f)),
                i());
            }),
        ),
        (m("#epFuse").onclick = () => {
          const d = t0.fuse.map((f) => Ye(f)).filter(Boolean);
          ((t0.fuse = []), r(u3(d)));
        }),
        document
          .querySelectorAll("#mBody [data-up]")
          .forEach((d) => (d.onclick = () => r(Z6(+d.dataset.up)))));
    else if (t0.tab === "kham") {
      const d = c ? Z4(c, t0.ht) : [];
      document.querySelectorAll("#mBody [data-ep]").forEach(
        (u) =>
          (u.onclick = () => {
            const w = d[+u.dataset.ep];
            w && r(W4(c, w.ht, w.key));
          }),
      );
      const f = m("#epAll");
      f && (f.onclick = () => r(o9(c)));
      const h = m("#epTake");
      h && (h.onclick = () => r(r9(c)));
      const g = m("#epSell");
      g &&
        (g.onclick = () => {
          const u = c9(c);
          (u.ok && (t0.sel = 0), r(u));
        });
    } else if (t0.tab === "hut") {
      const d = fl(),
        f = () => {
          ($(), i());
        };
      ((m("#ahOn").onchange = (h) => {
        ((d.on = h.target.checked), f());
      }),
        (m("#ahLv").onchange = (h) => {
          ((d.minLv = +h.target.value), f());
        }),
        (m("#ahHt").onchange = (h) => {
          ((d.htMax = +h.target.value), f());
        }),
        (m("#ahCap").onchange = (h) => {
          ((d.cap = +h.target.value), f());
        }),
        (m("#ahRes").onchange = (h) => {
          ((d.reserve = +h.target.value), f());
        }),
        (m("#ahNow").onclick = () => {
          const h = Xs(20);
          (k(h ? `Tự rút ${h} món (xem nhật ký)` : "Không có món nào để rút"), i());
        }),
        document.querySelectorAll("#mBody [data-hut]").forEach(
          (h) =>
            (h.onclick = () => {
              const [g, u] = h.dataset.hut.split(":").map(Number);
              ((t0.sel = 0), r(nd(c, g, u, t0.ht)));
            }),
        ));
    } else if (t0.tab === "phoi") {
      const d = m("#epPhoi");
      d &&
        (d.onclick = () => {
          const f = td(c, t0.ht);
          (f.ok && (t0.tab = "kham"), r(f));
        });
    } else {
      (document
        .querySelectorAll("#mBody [data-st]")
        .forEach((d) => (d.onclick = () => r(e9(d.dataset.st)))),
        document.querySelectorAll("#mBody [data-otg]").forEach(
          (d) =>
            (d.onclick = () => {
              const f = +d.dataset.otg,
                h = Ro(),
                g = h.indexOf(f);
              g >= 0 ? h.splice(g, 1) : h.push(f);
              const u = g < 0;
              (d.nextElementSibling.classList.toggle("ep-hide", !u),
                (d.firstChild.textContent = (u ? "▾" : "▸") + d.firstChild.textContent.slice(1)));
              const w = m("#epOreAll");
              w && (w.textContent = h.length ? "Ẩn tất cả" : "Hiện tất cả");
            }),
        ));
      {
        const d = m("#epOreAll");
        d &&
          (d.onclick = () => {
            ((t0.oreOpen = Ro().length ? [] : Array.from({ length: R1 }, (f, h) => h)), i());
          });
      }
      (document.querySelectorAll("#mBody #epBoxG [data-uid]").forEach(
        (d) =>
          (d.onclick = () => {
            const f = a0().find((h) => h.uid === +d.dataset.uid);
            if (f) {
              if (o.inv.length >= INV_MAX) return k("Hành trang đầy");
              (A1(f), o.inv.push(f), (R = !0), $(), i());
            }
          }),
      ),
        (m("#epIn").onclick = () => {
          let d = 0;
          for (const f of o.inv.filter(Zu)) {
            if (a0().length >= w1) break;
            (A1(f), a0().push(f), d++);
          }
          (k(`Cất ${d} món vào Kho Rèn`), (R = !0), $(), i());
        }),
        (m("#epOutAll").onclick = () => {
          let d = 0;
          for (; a0().length && o.inv.length < INV_MAX;) (o.inv.push(a0().shift()), d++);
          (k(`Lấy ra ${d} món`), (R = !0), $(), i());
        }),
        (m("#epLootCfg").onclick = () => {
          (n0(),
            fA("inv"),
            setTimeout(() => {
              const d = m("#epLoot");
              d && d.scrollIntoView({ block: "center" });
            }, 50));
        }),
        (m("#epDon").onclick = () => ni()),
        (m("#epToStash").onclick = async () => {
          if (typeof l0 < "u" && l0.on) {
            const f = a0().slice(0, Math.max(0, Math.min(20, INV_MAX - o.inv.length)));
            for (const g of f) (A1(g), o.inv.push(g));
            const h = await Pg(f);
            if (!h.ok) for (const g of f) o.inv.includes(g) && (A1(g), a0().push(g));
            (k(h.msg), (R = !0), $(), i());
            return;
          }
          let d = 0;
          for (const f of a0().slice()) {
            if (o.inv.length >= INV_MAX) break;
            (A1(f), o.inv.push(f));
            const h = Zs(f);
            if (h && h.ok) d++;
            else {
              (A1(f), a0().push(f));
              break;
            }
          }
          (k(`Gửi ${d} món sang Kho chung`), (R = !0), $(), i());
        }));
    }
  });
};

var Ju = function (A) {
  const n = n3(A);
  if (!n || (typeof tA == "function" && tA(A)) || (n === "blue" && mA(A) && o.inv.length < INV_MAX))
    return !1;
  const t = WA().ep.dest;
  if (t === "box" && a0().length < w1) return (a0().push(A), !0);
  if (
    t === "stash" &&
    typeof Zs == "function" &&
    o.inv.length < INV_MAX &&
    !(typeof l0 < "u" && l0.on)
  ) {
    o.inv.push(A);
    const e = Zs(A);
    if (e && e.ok) return !0;
    const a = o.inv.indexOf(A);
    a >= 0 && o.inv.splice(a, 1);
  }
  return a0().length < w1 ? (a0().push(A), !0) : !1;
};

var w1 = 120;

var t0 = { tab: "kham", sel: 0, ht: 0, fuse: [] };

var Ro = () => t0.oreOpen || (t0.oreOpen = []);

var Wc = (s) => `img/ep/da${(s | 0) + 1}.png`;

var hk = (s) => (ge(s)[0] || {}).n || sA(s);

var Re = (s) => !!s && !s.set && s.d >= 0 && s.d <= 9 && !!s.vio && (s.mag || []).length < Y1(s);

var Wu = (s) =>
  !!s && !s.set && !s.vio && !s.thanma && s.d >= 0 && s.d <= 9 && (s.mag || []).length > 0;

var uk = (s) =>
  !!s &&
  vn.includes(s.d) &&
  !s.set &&
  !s.vio &&
  !s.lock &&
  !Object.values(o.eq).includes(s) &&
  !(typeof FA == "function" && o.inv.includes(s) && FA(s));

var Zu = (s) => !s.lock && !tA(s) && (Re(s) || uk(s) || (Zc(s) && (s.r === 0 || !mA(s))));

var Zc = (s) => !!s && !s.set && !s.vio && !s.thanma && _3.includes(s.d) && (s.r || 0) <= 2;

var Yo = (s) => o.inv.concat(a0()).filter(s);

var Ye = (s) => o.inv.concat(a0(), Object.values(o.eq)).find((A) => A && A.uid === s);

var Ag = () =>
  Object.keys(S0().ht)
    .map(Number)
    .filter((s) => N("ht", s) > 0)
    .sort((s, A) => s - A);

var ng = (s) =>
  D(
    i1(
      sA(s.a),
      s.p.map((A) => (A === -1 ? 0 : A)),
    ),
  );

var Al = (s, A) =>
  `<div class="invgrid ep-grid">${s.map((n) => W1(n).replace('class="it', `class="it${A === n ? " ep-on" : ""}`)).join("")}</div>`;

var Fo = (s) => (s >= 5e-4 ? ` · <span class="bad">thất bại ${$t(s)}</span>` : "");

var yM = 0;

var Vo = function (A) {
  if (A) {
    const n = Object.assign({}, al, { bg: window.JMO && window.JMO[337] ? al.bg : al.bgFb });
    ((l.zoneShown = "boat"),
      ma(window.JMO && window.JMO[337] ? 337 : 336),
      ([v.x, v.y] = X0(
        window.JMO && window.JMO[337] ? 2150 : O0.w / 2,
        window.JMO && window.JMO[337] ? 1130 : O0.h / 2,
      )),
      M1(),
      (l.bgImg = bA(n.bg)),
      _e(336));
  } else ((l.zoneShown = null), Gn(AA(Math.min(o.stage, d0))));
};

var nl = function () {
  if (d2()) {
    k(l.deadT > 0 ? "Đang trọng thương, chờ hồi phục" : "Đang ở tháp / phó bản");
    return;
  }
  if (!Xo()) {
    k(`Cần cấp ${Uo}`);
    return;
  }
  if (!Ve()) {
    k("Hết chuyến đò hôm nay");
    return;
  }
  (Tc(),
    (l.dg = { kind: "boat", d: { n: "Phong Lăng Độ" }, room: 1, t: 0, limit: ag, L: Lo(1) }),
    Vo(!0),
    (l.banner = {
      t: 2.6,
      text: "Phong Lăng Độ",
      sub: `Lên thuyền qua sông · ${Fe} đoạn · Thủy Tặc chặn đường`,
    }),
    C(
      "⛵ Lên thuyền <b>Phong Lăng Độ</b>: Huyền Tinh và đá thuộc tính rơi ×" +
        sl +
        " trên thuyền.",
    ),
    PA === "quest" && V());
};

var gk = function () {
  const A = l.dg,
    n = A.room >= Fe,
    t = (e, a) => {
      const i = Z(0, Math.PI * 2),
        r = Z(e, a);
      return X0(v.x + Math.cos(i) * r, v.y + Math.sin(i) * r);
    };
  if (n) {
    const [e, a] = t(200, 250),
      i = n1(il, A.L + 2, "boss", e, a);
    ((i.hp = i.max = i.max * 3), (i.dmg *= 1.2), (i.n = "Thủy Tặc Đầu Lĩnh"), l.enemies.push(i));
    for (let r = 0; r < 3; r++) {
      const [c, d] = t(120, 240),
        f = n1(il, A.L, "elite", c, d);
      ((f.n = "Thủy Tặc"), l.enemies.push(f));
    }
  } else {
    const e = 5 + A.room;
    for (let a = 0; a < e; a++) {
      const [i, r] = t(120, 280),
        c = n1(il, A.L, a < A.room ? "elite" : "normal", i, r);
      ((c.n = "Thủy Tặc"), l.enemies.push(c));
    }
  }
};

var mk = function () {
  const A = l.dg;
  if (A.room >= Fe) {
    wk();
    return;
  }
  (A.room++,
    za(l.P.life * 0.3, !0),
    (l.mana = Math.min(l.P.mana, l.mana + l.P.mana * 0.3)),
    (l.spawnT = 1.6),
    (l.banner = {
      t: 1.4,
      text: `Đoạn sông ${A.room}/${Fe}`,
      sub: A.room >= Fe ? "Thủy Tặc Đầu Lĩnh chặn thuyền!" : "Thủy Tặc nhảy lên thuyền!",
    }));
};

var wk = function () {
  const A = l.dg,
    n = I1();
  n.boat = (n.boat || 0) + 1;
  const t = E1();
  if (
    ((t.boatN = (t.boatN || 0) + 1),
    z0({ gold: 3e3, fd: 10, item: 5, xp: 0.02 }, "Qua sông Phong Lăng Độ"),
    y0())
  ) {
    const e = E(Math.floor(A.L / 15) + 1, 1, MA);
    U("ht", e, 3);
    const a = [Le(A.L), Le(A.L)];
    C(`⛵ Thưởng qua sông: 3 Huyền Tinh cấp ${e}, ${a.join(", ")}`);
  }
  (Math.random() < 0.03 && (U("misc", "wc", 1), C("⛵ Nhận 1 Thủy Tinh Trắng")),
    _n("boat"),
    (l.banner = {
      t: 3,
      text: "Qua sông thành công!",
      sub: `${Math.round(A.t)} giây · còn ${Ve()} chuyến hôm nay`,
    }),
    o0("levelup"),
    Mn(),
    tg(),
    $());
};

var tg = function () {
  (Qt(), Vo(!1), PA === "quest" && V());
};

var tl = function () {
  const A = Vs();
  return `<p class="desc">Lên thuyền Phong Lăng Độ qua sông, Thủy Tặc đánh lên thuyền ${Fe - 1} đợt, đợt cuối là <b>Thủy Tặc Đầu Lĩnh</b>. Nhận nhiệm vụ là <b>tự chuyển lên bản đồ Thuyền</b>.</p>
    <div class="card"><div class="stats"><span>Chuyến còn hôm nay</span><span>${Ve()}/${eg}</span><span>Yêu cầu</span><span>cấp ${Uo}</span><span>Thời gian</span><span>${ag / 60} phút</span><span>Đã qua sông</span><span>${E1().boatN || 0} lần</span></div>
      <div class="small">Trên thuyền: <b class="cp">Huyền Tinh và đá thuộc tính rơi ×${sl}</b>. Qua sông: ${q(3e3 * (1 + o.lvl / 10))} lượng, ~3 Phúc Duyên, đồ 5 dòng, 3 Huyền Tinh + 2 đá thuộc tính, 30% Thủy Tinh Trắng. Gục ngã / hết giờ: thất bại, không mất lượt.</div>
      <div class="btnrow">${A ? '<button class="btn red" id="boatOut">Rời thuyền (không mất lượt)</button>' : `<button class="btn" id="boatGo" ${Xo() && Ve() && !d2() ? "" : "disabled"}>${Xo() ? (Ve() ? "⛵ Lên thuyền" : "Hết chuyến hôm nay") : `Cần cấp ${Uo}`}</button>`}</div></div>`;
};

var el = function (A) {
  const n = A.querySelector("#boatGo");
  n &&
    (n.onclick = () => {
      (n0(!0), nl());
    });
  const t = A.querySelector("#boatOut");
  t &&
    (t.onclick = () => {
      (C("Rời thuyền Phong Lăng Độ."), tg());
    });
};

var al = {
  id: 337,
  n: "Phong Lăng Độ · Thuyền",
  bg: MapsEngine.getMapBackground(337),
  bgFb: MapsEngine.getMapBackground(336),
  lo: 1,
  hi: 200,
  m: [674],
  sw: [20, 20, 20, 20, 20],
};

var eg = 3;

var Fe = 4;

var ag = 240;

var Uo = 30;

var sl = 5;

var il = 674;
