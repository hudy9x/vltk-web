// ui/world-panels — shared IIFE scope; order is defined in modules.json.
var mi = function (A, n) {
  if (Bm()) return Ul(A, n);
  (n && typeof eA < "u" && (eA = n),
    A === "tt" && (Vt = "tt"),
    n0(!0),
    fA(A === "tt" ? "more" : A));
};

var MB = function s() {
  const A = m("#u2doll");
  if (!A || typeof It != "function" || !l.jx) return;
  const n = document.createElement("canvas");
  ((n.width = 600), (n.height = 600));
  const t = n.getContext("2d"),
    e = W;
  W = t;
  let a = !1;
  try {
    a = It("st", 0, 0, 300, 520, 3, 1);
  } catch {
    a = !1;
  } finally {
    W = e;
  }
  if (!a) {
    setTimeout(() => {
      m("#u2doll") === A && s();
    }, 400);
    return;
  }
  const i = t.getImageData(0, 0, 600, 600).data;
  let r = 600,
    c = 0,
    d = 600,
    f = 0;
  for (let P = 3; P < i.length; P += 16)
    if (i[P] > 20) {
      const _ = (P - 3) / 4,
        y = _ % 600,
        M = (_ / 600) | 0;
      (y < r && (r = y), y > c && (c = y), M < d && (d = M), M > f && (f = M));
    }
  if (c <= r) return;
  const h = c - r + 4,
    g = f - d + 4,
    u = Math.min(236 / h, 284 / g),
    w = h * u,
    x = g * u,
    p = A.getContext("2d");
  (p.clearRect(0, 0, A.width, A.height),
    p.drawImage(n, r - 2, d - 2, h, g, (252 - w) / 2, 296 - x, w, x));
};

var HB = function () {
  const A = l.P,
    n = I[o.fac],
    t = Object.values(o.eq).filter((y) => y && !p0(y)),
    e = j0({}),
    a = { life: Math.round(A.life - e.life), mana: Math.round(A.mana - e.mana) },
    i = un
      .map(([y, M]) => {
        const [B, O, G, j] = YB[y];
        return `<div class="u2s slot" data-slot="${y}" style="left:${B}px;top:${O}px;width:${G}px;height:${j}px">${o.eq[y] ? W1(o.eq[y]) : `<span>${M}</span>`}</div>`;
      })
      .join(""),
    r = Object.keys(nn)
      .map(
        (y) =>
          `<div class="u2a"><span>${nn[y]}</span><b>${Math.round(A[y])}</b><button class="plus" data-a="${y}" ${o.attrPts ? "" : "disabled"}>+</button><button class="minus" data-a="${y}" title="Rút lại 1 điểm" ${o.attr[y] > 0 ? "" : "disabled"}>−</button></div>`,
      )
      .join(""),
    c = (y) => (y ? ` <small class="cp">+${F(y)}</small>` : ""),
    d = [
      ["Sinh lực", F(A.life) + c(a.life)],
      ["Nội lực", F(A.mana) + c(a.mana)],
      ["Né tránh", F(Math.round(A.def))],
      ["Tốc độ chạy", Math.round((A.speed || 1) * 100) + "%"],
    ],
    f = [
      ["Sát thương VK", `${F(Math.round(A.wmin))}–${F(Math.round(A.wmax))}`],
      ["Chính xác", F(Math.round(A.ar))],
      ["Chí mạng", Math.round(A.main.crit) + "%"],
      ["Tốc độ đánh", A.aspd.toFixed(2)],
    ],
    h = { phys: "#d8d2c0", poison: "#7fd46a", cold: "#6fc4ff", fire: "#ff7a4a", light: "#ffd84a" },
    g = Q0.map(
      (y) =>
        `<div class="c2r" style="--ec:${h[y]}"><i>${D5[y]}</i><b>${Math.round(A.res[y])}%</b></div>`,
    ).join(""),
    u = (y) => y.map(([M, B]) => `<span>${M}</span><b>${B}</b>`).join(""),
    w = S.exp[o.lvl - 1],
    x = w ? E((o.xp / w) * 100, 0, 100) : 100,
    p = [];
  A.plusSkill && p.push(`<i class="all">Tất cả +${A.plusSkill}</i>`);
  for (const [y, M] of Object.entries(A.skAdd || {}))
    p.push(`<i>${T[y] ? D(T[y].n) : y} +${M}</i>`);
  ((m("#t-char").innerHTML = `<div class="u2char c2">
    <div class="u2dollw"><div class="u2nm">${D(OA() ? o.name : n.n)}${tx() ? `<button class="u2pen" id="bName" title="${OA() ? `Đổi Tên (còn ${rr()}/${or} lượt)` : "Đặt tên nhân vật"}">✎</button>` : ""}</div><div class="u2doll"><canvas id="u2doll" width="252" height="300"></canvas>${i}</div>
      <div class="u2btns"><button class="btn sm" id="bTitle">Danh hiệu</button><button class="btn sm${o.lvl >= Ee && Q().stat.reborn < n2 ? " on" : ""}" id="bReb">Chuyển sinh</button>${N("misc", "ldp") > 0 ? `<button class="btn sm on" id="bDoiPhai">Đổi phái (${N("misc", "ldp")})</button>` : ""}</div>
      ${p.length ? `<div class="c2sk"><div class="c2t">Kỹ năng từ trang bị</div>${p.join("")}</div>` : ""}</div>
    <div class="u2info">
      <div class="c2hd"><div class="c2id"><b style="color:${w0[n.series]}">${D(n.n)}</b><span class="c2tag" style="--ec:${w0[n.series]}">${g0[n.series]}</span><span class="c2lv">Cấp <b>${o.lvl}</b></span>${v0() ? `<span class="c2cs">CS ${v0()}</span>` : ""}</div>
        <div class="c2xp" title="Kinh nghiệm"><i style="width:${x.toFixed(1)}%"></i><span>${w ? `${t5(o.xp)} / ${t5(w)}` : "Cấp tối đa"}</span></div></div>
      <div class="c2cb"><div class="c2main"><span>Chiêu chính</span><b>${D(A.main.n)}</b></div>
        <div class="c2lt"><span>Lực tay trái</span><b>${Ki(A.basic)}</b></div><div class="c2lt"><span>Lực tay phải</span><b>${Ki(A.main)}</b></div></div>
      <div class="u2h">Tiềm năng <b class="gold">${o.attrPts}</b><span class="sp"></span><button class="btn sm" id="bSugAt">Gợi ý</button><button class="btn sm" id="bTTa">Tẩy Tủy</button></div>
      <div class="u2box">${r}</div>
      <div class="u2h">Chỉ số</div>
      <div class="u2box c2st"><div><div class="c2t">Sinh tồn</div><div class="c2kv">${u(d)}</div></div><div><div class="c2t">Tấn công</div><div class="c2kv">${u(f)}</div></div></div>
      <div class="u2box"><div class="c2t">Kháng</div><div class="c2res">${g}</div></div>
      <div class="u2box c2misc"><span>🍀 May mắn <b>${Math.round(A.lucky || 0)}</b></span><span>🎐 Phúc Duyên <b>${t5(Q().fd || 0)}</b></span></div>
    </div></div>
    ${t.length ? `<div class="reqbad"><b>⚠ ${t.length} món chưa đủ điều kiện, không được cộng chỉ số:</b><br>${t.map((y) => `${D(y.n)}: ${D(vt(y).join("; "))}`).join("<br>")}</div>` : ""}`),
    (m("#bTTa").onclick = Ri),
    document.querySelectorAll("#t-char .plus").forEach((y) => (y.onclick = () => jf(y.dataset.a))),
    document.querySelectorAll("#t-char .minus").forEach((y) => (y.onclick = () => zf(y.dataset.a))),
    (m("#bTitle").onclick = () => Qh()));
  const P = m("#bName");
  (P && (P.onclick = () => Aa()), (m("#bReb").onclick = _h));
  {
    const y = m("#bDoiPhai");
    y && (y.onclick = As);
  }
  ((m("#bSugAt").onclick = D2),
    document
      .querySelectorAll("#t-char .slot .it")
      .forEach(
        (y) =>
          (y.onclick = () =>
            y.parentNode.dataset.slot === "horse"
              ? xo()
              : He(xs(y.dataset.uid), y.parentNode.dataset.slot)),
      ));
  const _ = document.querySelector('#t-char .slot[data-slot="horse"]');
  (_ && !o.eq.horse && (_.onclick = () => xo()), MB());
};

var $B = function () {
  const A = I[o.fac];
  if (A.novice) return a1.skill();
  const n = {};
  for (const g of A.skills) {
    const u = T[g],
      w = u.tier === 90 ? 90 : u.req;
    (n[w] || (n[w] = [])).push(g);
  }
  const t = Object.keys(n)
      .map(Number)
      .sort((g, u) => g - u),
    e = Math.max(1, ...t.map((g) => n[g].length)),
    a = (g) => (g <= 1 ? "Nhập môn" : `Lv${g}`),
    i = (g) => {
      if (!g) return '<div class="u2k empty"></div>';
      const u = T[g],
        w = o.sk[g] || 0,
        x = w ? z1(g) : 0,
        p = Q1(u);
      return `<div class="u2k ${[W2(u) ? "" : "lock", l.P.main.id === +g ? "main" : "", w ? "on" : ""].join(" ")}" data-id="${g}" title="${D(u.n)}"><img src="${D(u.ic || "")}" alt=""><i>${w ? w + x : ""}</i>${p ? `<button class="plus" data-id="${g}" title="${[90, 150].includes(u.tier) ? "Lĩnh ngộ bằng bí kíp" : "Cộng 1 điểm"}">+</button>` : ""}${[90, 150].includes(u.tier) && w && w < u.max && N("misc", "dtbk") > 0 && _4(g) ? `<button class="u2dt" data-dt="${g}" title="Dùng Đại Thành Bí Kíp">📕</button>` : ""}</div>`;
    },
    r = l.P && l.P.basic,
    c = o.mainLock && o.main === "basic",
    d = `<div class="u2kc"><div class="u2kh">Cơ bản</div><div class="u2k on${l.P.main === r ? " main" : ""}${c ? " lockm" : ""}" id="u2basic" title="Đánh thường · bấm để ${c ? "bỏ khóa" : "khóa làm chiêu chính"}"><img src="img/s/8.png" alt=""><i>1</i></div>${'<div class="u2k empty"></div>'.repeat(e - 1)}</div>`,
    f = t
      .map(
        (g) =>
          `<div class="u2kc"><div class="u2kh">${a(g)}</div>${Array.from({ length: e }, (u, w) => i(n[g][w])).join("")}</div>`,
      )
      .join("");
  ((m("#t-skill").innerHTML =
    `<div class="u2tabs"><button class="on">${D(A.n)}</button><button id="u2skOpt">› Trợ Thủ Kiếm Hiệp</button></div>
    <div class="u2kg">${d}${f}</div>
    <div class="u2foot"><span class="dim small">Bí Kíp 90 ×${N("misc", "bk90")} · 120 ×${N("misc", "bk120")} · 150 ×${N("misc", "bk150")} · Đại Thành ×${N("misc", "dtbk")}${o.mainLock ? ' · <a id="bAutoMain">bỏ khóa chiêu chính</a>' : ""}</span><span class="sp"></span><button class="btn sm" id="bSugSk">Gợi ý</button><button class="btn sm" id="bTT">Tẩy Tủy</button><span class="u2pts">Điểm kỹ năng còn: <b>${o.skPts}</b></span></div>
    <p class="dim small u2tip">Bấm biểu tượng: xem chi tiết, chọn chiêu chính, rút điểm. Bấm <b class="plusd">+</b> để cộng điểm.</p>`),
    document.querySelectorAll("#t-skill .plus").forEach(
      (g) =>
        (g.onclick = (u) => {
          u.stopPropagation();
          const w = T[g.dataset.id];
          Q1(w) && (Yi(w.id), o0("learn"), (l.dirty = !0), D0(), Zn(), $());
        }),
    ),
    document.querySelectorAll("#t-skill [data-dt]").forEach(
      (g) =>
        (g.onclick = (u) => {
          (u.stopPropagation(), h6(+g.dataset.dt));
        }),
    ),
    document
      .querySelectorAll("#t-skill .u2k[data-id]")
      .forEach((g) => (g.onclick = () => R8(+g.dataset.id))),
    (m("#u2basic").onclick = () => {
      (o.mainLock && o.main === "basic"
        ? (o.mainLock = !1)
        : ((o.main = "basic"), (o.mainLock = !0)),
        (l.dirty = !0),
        D0(),
        Zn(),
        qA(),
        $(),
        k(o.mainLock && o.main === "basic" ? "Chiêu chính: Đánh thường" : "Bỏ khóa đánh thường"));
    }));
  const h = m("#bAutoMain");
  (h &&
    (h.onclick = () => {
      ((o.mainLock = !1), (l.dirty = !0), D0(), Zn());
    }),
    (m("#bSugSk").onclick = D2),
    (m("#bTT").onclick = Ri),
    (m("#u2skOpt").onclick = () => Hr("skill")));
};

var TB = function (A) {
  A === "vlmt" || A === "ttk"
    ? Z2(A)
    : A === "rngua"
      ? it(1)
      : A === "ldt" && (o.lvl < kA ? k(`Dã Tẩu mở từ cấp ${kA}`) : f2(!1));
};

var CB = function s(A) {
  const n = _m.find((a) => a[0] === A);
  if (!n) return;
  const t = N("misc", A),
    e =
      A === "vlmt" || A === "ttk"
        ? `<p class="small">Đã dùng <b>${pn(A)}/${XA(A)}</b>${Bt() ? "" : ' · <span class="reqbad">cần cấp 80</span>'}</p>`
        : "";
  J(
    `<h3>${D(rt(A))}</h3><div class="row" style="gap:10px;align-items:center"><img src="${n[1]}" alt="" style="width:40px;height:40px;image-rendering:pixelated"><div><p class="desc">${D(Cr[A] || "")}</p><p class="small">Đang có: <b>${t}</b></p>${e}</div></div>
    <div class="btnrow"><button class="btn" id="miUse" ${t ? "" : "disabled"}>Dùng</button>${A === "rngua" && t > 1 ? `<button class="btn" id="miUse10">Dùng ×${Math.min(10, t)}</button>` : ""}<button class="btn" id="miX">Đóng</button></div>`,
    () => {
      m("#miUse").onclick = () => {
        (TB(A), N("misc", A) > 0 && (A === "vlmt" || A === "ttk") ? s(A) : n0(!0), An());
      };
      const a = m("#miUse10");
      (a &&
        (a.onclick = () => {
          (it(10), n0(!0), An());
        }),
        (m("#miX").onclick = () => n0(!0)));
    },
  );
};

var wm = function s() {
  a1.inv();
  const A = m("#t-inv"),
    n = A.querySelector(".invgrid"),
    t = m("#iSort"),
    e = Mm().length;
  n.insertAdjacentHTML("afterbegin", FB());
  for (let w = o.inv.length + e; w < INV_MAX; w++)
    n.insertAdjacentHTML("beforeend", '<span class="it empty"></span>');
  const a = {};
  for (const w of ["bBest", "bDonKho", "bStash", "bSellAll", "bKtcI"]) a[w] = m("#" + w);
  const i = document.createElement("div");
  ((i.className = "u2bag"),
    (i.innerHTML = `<div class="u2bh"><span>${o.inv.length}/${INV_MAX}</span><button class="u2buy x${dt ? " on" : ""}" id="bInvX" title="Mở rộng rương (như JX1)">Mở rộng</button><span class="sp"></span></div>`),
    i.firstChild.appendChild(t),
    i.appendChild(n));
  const r = [...n.children],
    c = r1.map(() => []);
  r.slice(K2).forEach((w, x) => {
    const p = Math.floor(x / Ae);
    (c[p] && c[p].push(w), w.remove());
  });
  const d = document.createElement("div");
  if (((d.className = "u2rx"), (d.hidden = !dt), dt)) {
    const w = o.invX | 0;
    if (
      (Qn > w && (Qn = Math.min(w, r1.length - 1)),
      (d.innerHTML = `<div class="u2rxt">Mở rộng rương</div><div class="u2rxtab">${r1.map((x, p) => `<button data-rx="${p}" class="${p === Qn ? "on" : ""}${p < w ? "" : " lk"}" title="${p < w ? "Rương " + (p + 1) : "Chưa mở · " + x + " KNB"}">${p + 1}${p < w ? "" : "🔒"}</button>`).join("")}</div>`),
      Qn < w)
    ) {
      const x = document.createElement("div");
      ((x.className = "invgrid"), c[Qn].forEach((p) => x.appendChild(p)), d.appendChild(x));
    } else
      d.insertAdjacentHTML(
        "beforeend",
        `<div class="u2rxlk">${Qn > w ? `<p class="dim small">Mở Rương ${w + 1} trước.</p>` : `<p>Rương ${Qn + 1}: <b>+${Ae} ô</b></p><button class="btn" id="bRxBuy" ${(o.knb | 0) >= r1[Qn] ? "" : "disabled"}>Mở với ${r1[Qn]} KNB</button><p class="dim small">Có ${F(o.knb || 0)} KNB</p>`}</div>`,
      );
    d.insertAdjacentHTML("beforeend", '<button class="btn" id="bRxClose">Đóng lại</button>');
  }
  i.insertAdjacentHTML(
    "beforeend",
    `<div class="u2money"><span>Ng.lượng</span><b>${Tr(o.gold)}</b><span>Kim Ng.Bảo</span><b>${F(o.knb || 0)}</b></div><div class="u2act" id="u2invB"></div><div class="u2act" id="u2invB2"></div>`,
  );
  {
    const w = i.querySelector("#bInvX");
    w &&
      (w.onclick = (x) => {
        (x.stopPropagation(), (dt = !dt), s());
      });
  }
  const f = i.querySelector("#u2invB"),
    h = i.querySelector("#u2invB2");
  ((a.bBest.textContent = "⚔ Mặc đồ tốt"),
    (a.bDonKho.textContent = "🧹 Dọn kho"),
    (a.bStash.textContent = "📦 Kho chung"));
  {
    const w = o.inv.filter((x) => !mA(x) && !Ja(x)).length;
    ((a.bSellAll.innerHTML =
      a.bSellAll.disabled || !w ? "💰 Bán đồ thừa" : `💰 Bán thừa <small>${w}</small>`),
      a.bSellAll.classList.toggle("u2sell", !a.bSellAll.disabled && w > 0));
  }
  (f.append(a.bBest, a.bDonKho, a.bStash),
    h.append(a.bSellAll),
    typeof y0 == "function" &&
      y0() &&
      typeof Ke == "function" &&
      f.insertAdjacentHTML(
        "beforeend",
        `<button class="btn sm" id="u2kren">🔨 Kho Rèn <small>${a0().length}</small></button>`,
      ),
    h.insertAdjacentHTML("beforeend", '<button class="btn sm" id="u2filt">⚙ Bộ lọc nhặt</button>'));
  const g = document.createElement("div");
  ((g.className = "u2bagrow"),
    g.append(i, d),
    (A.innerHTML = ""),
    A.appendChild(g),
    document.body.classList.toggle("u2rxon", dt),
    g.querySelectorAll("[data-mi]").forEach(
      (w) =>
        (w.onclick = (x) => {
          (x.stopPropagation(), CB(w.dataset.mi));
        }),
    ),
    dn() ? QB(d) : document.body.classList.remove("u2rxw"),
    d.querySelectorAll("[data-rx]").forEach(
      (w) =>
        (w.onclick = () => {
          ((Qn = +w.dataset.rx), s());
        }),
    ));
  {
    const w = m("#bRxClose");
    w &&
      (w.onclick = () => {
        ((dt = !1), s());
      });
    const x = m("#bRxBuy");
    x &&
      (x.onclick = () => {
        S4();
      });
  }
  m("#u2filt").onclick = () => Hr("loot");
  const u = m("#u2kren");
  u && (u.onclick = () => Ke("box"));
};

var OB = function () {
  const A = Ar(),
    n = Object.keys(S0().ore).reduce((u, w) => u + N("ore", w), 0),
    t = Object.keys(S0().ht).reduce((u, w) => u + N("ht", w), 0),
    e = o.inv
      .concat(a0(), Object.values(o.eq))
      .filter((u) => u && typeof Re == "function" && Re(u)).length,
    a = Object.keys(S0().shard).filter((u) => NA[u] && N("shard", u) >= NA[u]).length,
    i = Object.values(o.eq)
      .filter((u) => u && we(u))
      .concat(o.inv.filter(we))
      .filter((u) => !Ea(u)).length,
    r = un.map(([u]) => o.eq[u]).filter(Boolean),
    c = (
      y0()
        ? [
            ["tl", "Tinh luyện"],
            ["hut", "Lấy"],
            ["phoi", "Chế tạo"],
            ["kham", "Khảm nạm"],
            ["box", "Kho Rèn"],
          ]
        : []
    ).concat([["ht", "Hoàng Kim"]]),
    d = r.length,
    f = r
      .map((u, w) => {
        const x = -Math.PI / 2 + (w * 2 * Math.PI) / Math.max(1, d),
          p = 118 + Math.cos(x) * 92 - 19,
          P = 118 + Math.sin(x) * 92 - 19;
        return `<div class="u2ri" style="left:${p.toFixed(0)}px;top:${P.toFixed(0)}px">${W1(u)}</div>`;
      })
      .join(""),
    h = (u, w, x) => `<div class="${x ? "cp" : ""}">${u}: <b>${w}</b></div>`;
  m("#t-forge").innerHTML =
    `<div class="u2tabs">${c.map(([u, w]) => `<button data-fg="${u}">${w}</button>`).join("")}</div>
    <div class="u2forge"><div class="u2circ"><svg viewBox="0 0 236 236"><g fill="none" stroke="#d9b65a" stroke-width="1.6" opacity=".85"><circle cx="118" cy="118" r="112"/><circle cx="118" cy="118" r="104"/><circle cx="118" cy="118" r="60"/>
      <rect x="44" y="44" width="148" height="148"/><rect x="44" y="44" width="148" height="148" transform="rotate(45 118 118)"/><circle cx="118" cy="118" r="30" stroke-dasharray="4 3"/></g></svg>
      <div class="u2rc"><img src="img/ep/ht.png" alt=""><b>${t}</b><small>Huyền Tinh</small></div>${f}</div>
      <div class="u2ftxt"><div class="u2h">Nguyên liệu</div>
        ${y0() ? h("Huyền Tinh Khoáng Thạch", t) + h("Đá thuộc tính", n) + h("Phôi đồ Tím", e) + h("Kho Rèn", `${a0().length}/${w1}`) : ""}
        ${h("Mảnh Hoàng Kim đủ ghép", a, a > 0)}${h("Thủy Tinh Trắng", N("misc", "wc"))}${h("Thần Bí Khoáng Thạch", N("misc", "mys"))}
        ${A.ench ? '<div class="cp">Có thể khảm nạm</div>' : ""}${A.up ? '<div class="cp">Huyền Tinh thăng cấp được</div>' : ""}
        <div class="u2h">Quy tắc</div><div class="dim small">Cường hóa +1…+${ut}, mỗi cấp +${Math.round(Ei * 100)}% thuộc tính gốc, +${Math.round(Si * 100)}% các dòng thuộc tính. Bấm món đồ trên vòng pháp trận để rèn riêng (cường hóa, tẩy luyện).</div>
        <div class="u2btns"><button class="btn sm" id="u2fgOpt">Tự động rèn…</button></div></div></div>`;
  const g = { ht: () => Qo() };
  (document
    .querySelectorAll("#t-forge [data-fg]")
    .forEach((u) => (u.onclick = () => (g[u.dataset.fg] || (() => Ke(u.dataset.fg)))())),
    (m("#u2fgOpt").onclick = () => Hr("other")),
    document.querySelectorAll("#t-forge .u2ri [data-uid]").forEach(
      (u) =>
        (u.onclick = () => {
          const w = Object.values(o.eq).find((x) => x && x.uid === +u.dataset.uid);
          w && g2(w);
        }),
    ));
};

var EB = function (A) {
  const n = () => m2(),
    t = (a) => () => {
      (_r(), a());
    },
    e = (a, i) => {
      const r = A.querySelector(a);
      r && (r.onclick = i);
    };
  if (
    (A.querySelectorAll("[data-dg]").forEach((a) => (a.onclick = t(() => Cc(a.dataset.dg)))),
    e("#wbGo", t(wu)),
    e("#wbClaim", () => {
      (Pu(), n());
    }),
    e("#dgOut", () => {
      (l.dg.kind === "wb" ? zs(!1) : (C("Rời phó bản."), Qt()), n());
    }),
    e("#gTower", t(A2)),
    e("#gTowerOut", () => {
      (Cs(!1), n());
    }),
    A.querySelectorAll(".petpick [data-p]").forEach(
      (a) =>
        (a.onclick = () => {
          (Dh(+a.dataset.p), n());
        }),
    ),
    eA === "boat")
  ) {
    (el(A), e("#boatGo", t(nl)));
    const a = A.querySelector("#boatOut");
    if (a) {
      const i = a.onclick;
      a.onclick = () => {
        (i(), n());
      };
    }
  }
  if (eA === "horse") {
    const a = m("#mBody");
    ((a.id = "mBodyX"), (A.id = "mBody"));
    try {
      iu(n);
    } finally {
      ((A.id = ""), (a.id = "mBody"));
    }
  }
};

var SB = function () {
  if (UB(eA) || eA === "act" || eA === "tm") {
    const c = eA;
    ((eA = "dt"), c !== "act" && setTimeout(() => N1(c), 0));
  }
  const A = !1;
  A ? (m("#t-quest").innerHTML = `<div class="dtabs"></div>${XB(eA)}`) : a1.quest();
  const n = m("#t-quest"),
    t = n.querySelector(".dtabs");
  if (!t) return;
  const e = document.createElement("div");
  for (e.className = "u2qd"; t.nextSibling;) e.appendChild(t.nextSibling);
  const a = ([c, d]) =>
      `<button data-qt="${c}" class="${eA === c ? "on" : ""}">${d}${c === "boat" && Vs() ? " ●" : ""}</button>`,
    i = document.createElement("div");
  ((i.className = "u2tree"),
    (i.innerHTML = `<div class="u2tg">⊟ Nhiệm vụ</div>${VB.map(a).join("")}<div class="u2tg">⊟ Phó bản · Hoạt động</div>${Hm.map(([c, d]) => `<button data-act="${c}">${d}${c === "boat" && Vs() ? " ●" : ""}</button>`).join("")}<div class="u2tg">⊟ Khác</div><button id="u2gift">Phần thưởng</button>`),
    (n.innerHTML = ""));
  const r = document.createElement("div");
  ((r.className = "u2quest"),
    r.appendChild(i),
    r.appendChild(e),
    n.appendChild(r),
    n.insertAdjacentHTML(
      "beforeend",
      `<div class="u2btns u2qb"><button class="btn sm${oa ? " on" : ""}" id="u2trkB">${oa ? "Hủy theo dõi" : "Theo dõi NV"}</button></div>`,
    ),
    i.querySelectorAll("[data-qt]").forEach(
      (c) =>
        (c.onclick = () => {
          ((eA = c.dataset.qt), m2());
        }),
    ),
    i.querySelectorAll("[data-act]").forEach((c) => (c.onclick = () => N1(c.dataset.act))),
    (m("#u2gift").onclick = () => Ce(!0)),
    (m("#u2trkB").onclick = () => {
      ((oa = !oa), (o.u20trk = oa), $(), m2(), pm());
    }),
    A && EB(e));
};

var pm = function s() {
  const A = m("#u20trk");
  if (!A) return;
  const n = [];
  if (o.fac && o.lvl >= (typeof kA < "u" ? kA : 20)) {
    const a = nA(),
      i = a.task;
    i &&
      n.push(
        `<div data-q="dt"><b>Dã Tẩu</b> <small>chuỗi ${a.chain || 0}</small><br>${D(ze(i))} <span class="${ot(i) ? "cp" : "gold"}">${ot(i) ? "xong" : jo(i)}</span></div>`,
      );
  }
  (l.sat && n.push('<div data-q="st"><b>Sát Thủ</b><br>Truy sát mục tiêu</div>'),
    l.dg &&
      n.push(
        `<div><b>${D(l.dg.kind === "boat" ? "Đi thuyền" : l.dg.d ? l.dg.d.n : "Phó bản")}</b></div>`,
      ));
  const t = !!o.u20trkMin,
    e =
      oa && n.length
        ? `<div class="u2trh" title="Thu gọn / mở rộng">Nhiệm vụ Theo Dấu <b>${t ? "▸" : "▾"}</b></div>${t ? "" : n.join("")}`
        : "";
  if (A.innerHTML !== e) {
    ((A.innerHTML = e),
      (A.style.display = e ? "" : "none"),
      A.querySelectorAll("[data-q]").forEach((i) => (i.onclick = () => Ul("quest", i.dataset.q))));
    const a = A.querySelector(".u2trh");
    a &&
      (a.onclick = () => {
        ((o.u20trkMin = !o.u20trkMin), $(), s());
      });
  }
};

var IB = function () {
  const A = (i) => (G1.includes(i) || ts[i] ? E4(i) : null),
    n = {
      ldp: "ktcLdp",
      ldt: "ktcLdt",
      mt90: "ktcMt",
      dgt: "ktcDgt",
      dtbk: "ktcDtbk",
      rngua: "ktcRngua",
    },
    t = !1,
    e = t ? [] : e5[wi][1].map((i) => J0.find((r) => r.k === i)).filter(Boolean),
    a = (i) => {
      const r = es(i),
        c = A(i.k);
      return `<div class="u2card${r ? "" : " bad"}" title="${D(i.d)}"><div class="u2ct">${D(i.n)}</div><div class="u2cb"><img src="${i.ic}" alt=""><div><div>Giá: <b class="${i.knb ? "gold" : ""}">${w6(i)}</b></div><small class="dim">${i.k === "knb" ? `Không giới hạn · hôm nay đổi ${Ji().n}` : i.k === "ldt" ? `Hôm nay ${C4().n}/${T4} · có ${c}` : i.k === "vlmt" || i.k === "ttk" ? `Đã dùng ${pn(i.k)}/${XA(i.k)} · có ${E4(i.k)}${Bt() ? "" : " · cần cấp 80"}` : c != null ? `Đang có ${c}` : D(i.d.slice(0, 40))}</small></div></div>
      <div class="u2cf"><button class="u2buy" data-ktc="${i.k}" ${r && ie(i) ? "" : "disabled"}>Mua</button>${i.k === "vlmt" || i.k === "ttk" || i.k === "dtbk" || i.k === "ldp" || i.k === "dgt" || i.k === "ldt" ? "" : `<button class="u2buy x" data-ktc10="${i.k}" ${r && ie(i, 10) ? "" : "disabled"}>×10</button>`}${i.k === "knb" ? `<button class="u2buy x" data-ktc100="${i.k}" ${r && ie(i, 100) ? "" : "disabled"}>×100</button>` : ""}${(i.k === "vlmt" || i.k === "ttk") && typeof ns == "function" && ns(i.k) > 0 ? `<button class="u2buy x on" data-ktcsell="${i.k}" title="Bán lại ${ns(i.k)} cuốn dư (đã dùng + đang có vượt ${XA(i.k)}), ${i.knb} KNB / cuốn">Bán dư ${ns(i.k)}</button>` : ""}${g6(i, "u2buy u")}</div></div>`;
    };
  (J(
    `<h3>Kỳ Trân Các</h3><div class="u2shop"><div class="u2cat">${e5.map(([i], r) => `<button data-kc="${r}" class="${r === wi ? "on" : ""}">${i}</button>`).join("")}</div>
    <div><div class="u2sh"><img src="img/ep/knb.png" alt=""> <span>Kim Nguyên Bảo:</span> <b class="gold">${o.knb || 0}</b> <span>· Ngân lượng:</span> <b>${Tr(o.gold)}</b></div>${t ? "" : m6()}${t ? `<div class="u2tm">${hu().replace('<p class="desc">không', '<p class="desc">Thần Mã không')}</div>` : `<div class="u2cards">${e.map(a).join("")}${wi === 0 ? `<div class="u2card" title="Đổi Kim Nguyên Bảo ra ngân lượng"><div class="u2ct">Đổi KNB → Lượng</div><div class="u2cb"><img src="img/ep/knb.png" alt=""><div><div>1 KNB = <b>${Tr(Xi)}</b></div><small class="dim">mua 1 KNB = ${Tr($4)} · đổi lại được 80%</small></div></div><div class="u2cf">${[1, 10, 100].map((i) => `<button class="u2buy x" data-k2g="${i}" ${(o.knb | 0) >= i ? "" : "disabled"}>${i}</button>`).join("")}</div></div>` : ""}</div>`}
    ${t ? "" : `${qt() ? `<div class="small u2buf">Đang có: ${qt()}</div>` : ""}<p class="dim small">Kim Nguyên Bảo rơi từ trùm (10%), trùm Hoàng Kim / boss tuần (50%). Mua là dùng ngay; riêng Võ Lâm Mật Tịch, Tẩy Tủy Kinh, Rương Ngựa vào Hành trang (bán Chợ được), bấm <b>Dùng</b> để dùng. Rê chuột lên vật phẩm để xem công dụng.</p>`}</div></div>`,
    () => {
      (document.querySelectorAll("#mBody [data-kc]").forEach(
        (r) =>
          (r.onclick = () => {
            ((wi = +r.dataset.kc), iA());
          }),
      ),
        t && uu(() => iA()),
        document
          .querySelectorAll("#mBody [data-ktc]")
          .forEach((r) => (r.onclick = () => Ba(r.dataset.ktc, 1))),
        document
          .querySelectorAll("#mBody [data-ktc10]")
          .forEach((r) => (r.onclick = () => Ba(r.dataset.ktc10, 10))),
        document
          .querySelectorAll("#mBody [data-ktc100]")
          .forEach((r) => (r.onclick = () => Ba(r.dataset.ktc100, 100))),
        d6(),
        document
          .querySelectorAll("#mBody [data-invx]")
          .forEach((r) => (r.onclick = () => S4().then(() => iA()))),
        document
          .querySelectorAll("#mBody [data-k2g]")
          .forEach((r) => (r.onclick = () => V7(+r.dataset.k2g).then(() => iA()))),
        document.querySelectorAll("#mBody [data-ktcsell]").forEach(
          (r) =>
            (r.onclick = () => {
              (T7(r.dataset.ktcsell), iA(), typeof b1 == "function" && b1().catch(() => {}));
            }),
        ));
      const i = (r, c) => {
        const d = m("#" + r);
        d && (d.onclick = c);
      };
      (i("ktcLdp", As),
        i("ktcDgt", M4),
        i("ktcDtbk", () => {
          (n0(!0), mi("skill"), k("Bấm 📕 ở võ công 90 đã học để đại thành cấp 20"));
        }),
        i("ktcMt", () => {
          if (o.lvl < 80 && !v0()) {
            k("Võ công 90 cần cấp 80");
            return;
          }
          (n0(!0), mi("skill"), k("Bấm + ở võ công 90 để lĩnh ngộ (không tốn điểm)"));
        }),
        i("ktcLdt", () => {
          if (o.lvl < kA) {
            k(`Dã Tẩu mở từ cấp ${kA}`);
            return;
          }
          (f2(!1), iA());
        }),
        i("ktcRngua", () => {
          (it(1), iA());
        }),
        i("ktcRngua10", () => {
          (it(10), iA());
        }));
    },
  ),
    m("#modal").classList.add("u2ktc"));
};

var Hr = function (A) {
  (A && (q1 = A), mi("tt"));
};

var NB = function () {
  const A = (i, r, c) =>
      `<label><input type="checkbox" id="${i}" ${r ? "checked" : ""}> ${c}</label>`,
    n = typeof nA == "function" ? nA() : {};
  let t = "";
  if (
    (q1 === "basic"
      ? (t = `<div class="u2h">Tự đánh</div>${A("tAuto", !hA(), "Tự đánh quái (Auto) · phím F")}${A("tMap", o.autoMap !== !1, "Tự đổi bãi luyện công theo cấp")}${A("tClose", !!o.closeAtk, "Đánh tiếp cận (chạy sát quái rồi mới ra chiêu, cả chiêu tầm xa)")}<label>Ưu tiên mục tiêu: <select id="tPri">${qD.map(([i, r]) => `<option value="${i}" ${jd() === i ? "selected" : ""}>${r}</option>`).join("")}</select></label>${A("tRide", o.autoRide !== !1, "Tự lên ngựa khi di chuyển, xuống ngựa khi đánh chiêu không dùng trên ngựa · phím M")}
    <div class="u2h">Dược phẩm</div>${A("tPot", !o.potOff, `Tự dùng thuốc · đã dùng ${F(o.potUsed || 0)}`)}<div class="u2pot">${[
      ["potHp", "Sinh lực dưới", 50],
      ["potMp", "Nội lực dưới", 50],
      ["potUrg", "Nguy kịch (uống chồng) dưới", 30],
    ]
      .map(
        ([i, r, c]) =>
          `<label>${r} <select data-pk="${i}">${[...Array(18)]
            .map((d, f) => (f + 1) * 5)
            .map(
              (d) => `<option value="${d}" ${(o[i] ?? c) === d ? "selected" : ""}>${d}%</option>`,
            )
            .join("")}</select></label>`,
      )
      .join(" ")}</div>${A("tBuy", o.potBuy !== !1, "Tự mua thuốc khi hết (tối đa 20% ngân lượng)")}
    <div class="u2btns">${[0, 1]
      .map((i) => {
        const r = typeof Za == "function" ? Za(i) : { name: "" };
        return `<button class="btn sm" data-potsl="${i}">${i ? "Nội lực" : "Sinh lực"}: ${D(r.name || "Tự động")} ▾</button>`;
      })
      .join("")}</div>
    <div class="u2h">Trang bị</div>${A("tEq", !!o.autoEquip, "Tự mặc đồ tốt hơn khi nhặt")}${A("tJunk", o.autoJunk !== !1, "Tự bán đồ thừa (yếu hơn đồ đang mặc, vũ khí sai loại; giữ 6 trang sức để hợp Huyền Tinh)")}${A("tWb", o.autoBuy !== !1, "Tự mua vũ khí đúng loại ở Biện Kinh khi mạnh hơn ≥ 25%")}
`)
      : q1 === "skill"
        ? (t = `<div class="u2h">Xoay chiêu</div>${A("tRot", o.rot !== !1, "Xoay chiêu tự động: luân phiên chiêu ở ô F1–F4 (phím R), luôn có 2 chiêu mạnh nhất, bỏ chiêu hết nội lực")}${t6()}
    <div class="u2h">Cộng điểm</div>${A("tPts", o.autoPts === !0, "Tự cộng điểm tiềm năng và võ công")}<div class="u2btns"><button class="btn sm" id="tSug">Gợi ý cộng điểm</button></div>`)
        : q1 === "other" &&
          (t = `<div class="u2h">Lò rèn</div>${A("fgFuse", o.autoFuse !== !1, `Tự hợp Huyền Tinh từ trang sức thừa (3 món → 1, ${q(d1())} lượng; mỗi 30 giây) · có ${Gt().length} món`)}
    <div class="u2h">Nhiệm vụ</div>${A("tDt", n.auto !== !1, "Dã Tẩu tự trả / nhận")}${A("tLdt", o.autoLdt !== !1, "Tự dùng Lệnh Bài Dã Tẩu khi hết lượt")}
`),
    q1 === "sys")
  ) {
    (a1.more(), Pm(), m("#t-more").insertAdjacentHTML("afterbegin", WB()), Dm());
    return;
  }
  if (
    ((m("#t-more").innerHTML = `<div class="u2tabs">${$m()
      .map(([i, r]) => `<button data-tt="${i}" class="${q1 === i ? "on" : ""}">${r}</button>`)
      .join("")}</div><div class="u2tt" id="u2ttBody">${t}</div>`),
    Dm(),
    q1 === "loot")
  ) {
    An();
    return;
  }
  const e = (i, r) => {
    const c = m(i);
    c &&
      (c.onchange = () => {
        (r(c.checked), $());
      });
  };
  (e("#tAuto", (i) => Wa(i ? "auto" : "manual")),
    e("#tRot", (i) => {
      ((o.rot = i), eo(), (l.dirty = !0));
    }),
    e("#tRide", (i) => {
      o.autoRide = i;
    }),
    e("#tMap", (i) => {
      o.autoMap = i;
    }),
    e("#tClose", (i) => {
      o.closeAtk = i;
    }),
    e("#tBoss", (i) => {
      ((o.bossFirst = i), (o.tgtPri = i ? "hk" : "near"));
    }));
  {
    const i = m("#tPri");
    i &&
      (i.onchange = () => {
        ((o.tgtPri = i.value), (o.bossFirst = i.value === "hk"), $());
      });
  }
  (document.querySelectorAll("#t-more [data-pk]").forEach(
    (i) =>
      (i.onchange = () => {
        ((o[i.dataset.pk] = +i.value), $());
      }),
  ),
    e("#tPot", (i) => {
      o.potOff = !i;
    }),
    e("#tBuy", (i) => {
      o.potBuy = i;
    }),
    e("#tEq", (i) => {
      o.autoEquip = i;
    }),
    e("#tWb", (i) => {
      o.autoBuy = i;
    }),
    e("#tJunk", (i) => {
      o.autoJunk = i;
    }),
    e("#tPts", (i) => {
      ((o.autoPts = i), i && (yt(), Pt(), D0()));
    }),
    e("#tDt", (i) => {
      nA().auto = i;
    }),
    e("#tLdt", (i) => {
      o.autoLdt = i;
    }),
    e("#fgFuse", (i) => {
      ((o.autoFuse = i), i && p2());
    }),
    e("#tGoldMsg", (i) => {
      o.goldMsg = i;
    }),
    e("#tMatMsg", (i) => {
      o.matMsg = i;
    }));
  {
    const i = m("#tLootMsg");
    i &&
      (i.onchange = () => {
        ((o.lootMsg = +i.value), $());
      });
  }
  document
    .querySelectorAll("#t-more [data-potsl]")
    .forEach((i) => (i.onclick = () => oo(+i.dataset.potsl)));
  const a = m("#tSug");
  (a && (a.onclick = D2), e6());
};

var Dm = function () {
  document.querySelectorAll("#t-more [data-tt]").forEach(
    (A) =>
      (A.onclick = () => {
        ((q1 = A.dataset.tt), Ao());
      }),
  );
};

var LB = function () {
  if ((q1 === "sys" && (q1 = "basic"), Vt === "tt")) return NB();
  (a1.more(), Pm());
  const A = m("#t-more");
};

var Pm = function () {
  const A = m("#t-more");
  for (const t of A.querySelectorAll("h3"))
    if (/^Tự động/.test(t.textContent)) {
      const e = t.nextElementSibling;
      (t.remove(), e && e.remove());
    }
  for (const t of ["#cForge", "#cBuy"]) {
    const e = m(t);
    e && e.closest("label").remove();
  }
  const n = [...A.querySelectorAll("h3")].find((t) => /^Tiện ích/.test(t.textContent));
  n && (n.textContent = "Tiện ích");
};

var qB = function () {
  const A = m("#u2ttBody");
  if (!dn()) {
    (A && (A.innerHTML = ""), a1.inv(), vm());
    return;
  }
  (wm(), A && (A.innerHTML = ""));
  const n = m("#t-inv"),
    t = document.createElement("div");
  ((n.id = "t-inv-bag"),
    (t.id = "t-inv"),
    (t.className = "tab"),
    (t.style.display = "none"),
    document.body.appendChild(t));
  try {
    (a1.inv(), vm());
  } finally {
    (t.remove(), (n.id = "t-inv"));
  }
  R = !1;
};

var vm = function () {
  const A = m("#u2ttBody");
  if (!A || !Tm()) return;
  const n = m("#t-inv");
  ((A.innerHTML = ""),
    [...n.children]
      .filter((e) => e.matches("h3, .lootf, #epLoot"))
      .forEach((e) => A.appendChild(e)));
  const t = A.querySelector("h3");
  (t && t.classList.add("u2h"), (n.innerHTML = ""), (R = !0));
};

var bm = function () {
  const A = m("#u20zn");
  if (!A || !o.fac) return;
  const n =
    l.tower && typeof Hn < "u"
      ? `${Hn.n} · tầng ${l.tower.floor}`
      : l.dg
        ? l.dg.kind === "boat"
          ? "Phong Lăng Độ"
          : l.dg.d
            ? l.dg.d.n
            : "Phó bản"
        : l.town
          ? (E0.town && E0.town.n) || "Thành thị"
          : (() => {
              const t = DA(Math.min(o.stage, d0)),
                e = k0[t],
                a = Un[t],
                i = (o.zalt || {})[t] || 0;
              return ((a && i && a[i - 1]) || e).n;
            })();
  A.textContent !== n && (A.textContent = n);
};
