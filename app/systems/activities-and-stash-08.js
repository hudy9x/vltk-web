// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var Bg = function () {
  const A = { inv: [], box: [], st: [], jew: 0, stJew: [], gold: 0 },
    n = (t, e, a) => {
      const i = ar(e, a);
      if (i) {
        if (i === "jew") {
          t === "st" ? A.stJew.push(e) : A.jew++;
          return;
        }
        (A[t].push(e), (A.gold += x0(e)));
      }
    };
  if (H0.inv) for (const t of o.inv) n("inv", t, !0);
  if (H0.box) for (const t of a0()) n("box", t, !0);
  if (H0.st && !(typeof l0 < "u" && l0.on)) {
    const { st: t, err: e } = rn();
    if (!e) for (const a of t.items) n("st", a, !1);
  }
  return A;
};

var Vk = function () {
  const A = { moved: 0, fused: 0, sold: 0, gold: 0, msg: [] };
  if (H0.st && H0.jew && y0() && !(typeof l0 < "u" && l0.on)) {
    const t = Je((e) => {
      const a = e.items.filter((i) => ar(i, !1) === "jew").slice(0, Math.max(0, w1 - a0().length));
      if (!a.length) return { ok: !1 };
      e.items = e.items.filter((i) => !a.includes(i));
      for (const i of a) a0().push(i);
      return {
        ok: !0,
        from: "stash",
        n: a.length,
        undo: () => {
          for (const i of a) {
            const r = a0().indexOf(i);
            r >= 0 && a0().splice(r, 1);
          }
        },
      };
    });
    t && t.ok && (A.moved = t.n);
  }
  if (H0.jew && y0()) {
    const t = {};
    for (let e = 0; e < 200; e++) {
      const a = Oa(
        Gt().filter(
          (r) =>
            (r.lvl || 1) <= H0.lv &&
            (H0.inv || !o.inv.includes(r)) &&
            (H0.box || H0.st || !a0().includes(r)),
        ),
      );
      if (a.length < 3 || o.gold < d1()) break;
      const i = u3(a);
      if (!i.ok) break;
      (A.fused++, (t[i.lvl] = (t[i.lvl] || 0) + 1));
    }
    A.fused &&
      A.msg.push(
        `luyện ${A.fused} Huyền Tinh (${Object.entries(t)
          .map(([e, a]) => `${a}×c${e}`)
          .join(", ")})`,
      );
  }
  const n = Bg();
  for (const [t, e] of [
    ["inv", n.inv],
    ["box", n.box],
  ])
    for (const a of e) {
      const i = t === "inv" ? o.inv : a0(),
        r = i.indexOf(a);
      if (r < 0) continue;
      i.splice(r, 1);
      const c = x0(a);
      ((o.gold += c), (A.gold += c), A.sold++);
    }
  if (H0.st && n.st.length && !(typeof l0 < "u" && l0.on)) {
    const t = Je((e) => {
      const a = [],
        i = [];
      for (const c of e.items) (ar(c, !1) && ar(c, !1) !== "jew" ? i : a).push(c);
      if (!i.length) return { ok: !1 };
      const r = i.reduce((c, d) => c + x0(d), 0);
      return (
        (e.items = a),
        (o.gold += r),
        {
          ok: !0,
          from: "stash",
          n: i.length,
          v: r,
          undo: () => {
            o.gold -= r;
          },
        }
      );
    });
    t && t.ok && ((A.sold += t.n), (A.gold += t.v));
  }
  return (
    A.moved && A.msg.unshift(`chuyển ${A.moved} trang sức từ Kho chung sang Kho Rèn`),
    A.sold && A.msg.push(`bán ${A.sold} món (+${q(A.gold)} lượng)`),
    (R = !0),
    (l.dirty = !0),
    $(),
    A
  );
};

var _g = function () {
  const A = { inv: [], box: [], st: [], gold: 0, kind: {} },
    n = (t, e) => {
      if (!Mg(e)) return;
      (A[t].push(e), (A.gold += x0(e)));
      const a =
        e.thanma || (typeof L0 == "function" && L0(e))
          ? "Ngựa"
          : e.vio
            ? "Tím"
            : Zr[e.r || 0] || "Thường";
      A.kind[a] = (A.kind[a] || 0) + 1;
    };
  if (H0.inv) for (const t of o.inv) n("inv", t);
  if (H0.box) for (const t of a0()) n("box", t);
  if (H0.st && !(typeof l0 < "u" && l0.on)) {
    const { st: t, err: e } = rn();
    if (!e) for (const a of t.items) n("st", a);
  }
  return A;
};

var Uk = function () {
  const A = _g();
  let n = 0,
    t = 0;
  for (const [e, a] of [
    [o.inv, A.inv],
    [a0(), A.box],
  ])
    for (const i of a) {
      const r = e.indexOf(i);
      if (r < 0) continue;
      e.splice(r, 1);
      const c = x0(i);
      ((o.gold += c), (t += c), n++);
    }
  if (H0.st && A.st.length) {
    const e = Je((a) => {
      const i = [],
        r = [];
      for (const d of a.items) (Mg(d) ? r : i).push(d);
      if (!r.length) return { ok: !1 };
      const c = r.reduce((d, f) => d + x0(f), 0);
      return (
        (a.items = i),
        (o.gold += c),
        {
          ok: !0,
          from: "stash",
          n: r.length,
          v: c,
          undo: () => {
            o.gold -= c;
          },
        }
      );
    });
    e && e.ok && ((n += e.n), (t += e.v));
  }
  return ((R = !0), (l.dirty = !0), $(), { n, g: t });
};

var Xk = function () {
  const A = _g(),
    n = A.inv.length + A.box.length + A.st.length,
    t = [
      H0.inv && `Hành trang ${A.inv.length}`,
      H0.box && `Kho Rèn ${A.box.length}`,
      H0.st && `Kho chung ${A.st.length}`,
    ]
      .filter(Boolean)
      .join(" · "),
    e = ["Tím", "Hoàng Kim", "Bạch Kim", "Ngựa"].filter((a) => A.kind[a]);
  J(
    `<h3>⚠ Dọn hết</h3>
    <div class="card warnc"><b class="bad">Lưu ý: bán TOÀN BỘ ${n} món, không lấy lại được.</b>
      <div class="small">Không xét bộ lọc, cấp, độ hiếm: bán cả đồ Tím / phôi, Hoàng Kim, ngựa, trang sức.</div>
      <div class="small">Chỉ giữ: món khóa 🔒, đồ đang mặc, đồ cần cho Dã Tẩu, vật phẩm (Hồng Bao, Quế Hoa Tửu, Tiên Thảo Lộ…).</div></div>
    <table class="dktbl small"><tr><th>Nơi</th><td>${t || "—"}</td></tr>
      <tr><th>Loại</th><td>${
        Object.entries(A.kind)
          .map(([a, i]) => `${a} ${i}`)
          .join(" · ") || "—"
      }</td></tr>
      <tr><th>Nhận</th><td><b>+${q(A.gold)} lượng</b></td></tr></table>
    ${e.length ? `<p class="small bad">Có ${e.map((a) => `${A.kind[a]} ${a}`).join(", ")}: hãy khóa 🔒 món muốn giữ trước khi dọn.</p>` : ""}
    <div class="btnrow"><button class="btn red" id="dhGo" ${n ? "" : "disabled"}>Xác nhận dọn hết ${n} món</button><button class="btn" id="dhNo">Quay lại</button></div>`,
    () => {
      ((m("#dhNo").onclick = () => ni()),
        (m("#dhGo").onclick = () => {
          const a = Uk(),
            i = a.n ? `Dọn hết: bán ${a.n} món (+${q(a.g)} lượng)` : "Không có gì để dọn";
          (k(i), C(`<span class="dim">🧹 ${i}.</span>`), V(), ni());
        }));
    },
  );
};

var ni = function s() {
  const { st: A, err: n } = rn(),
    t = Bg(),
    e = t.stJew.length,
    a = t.jew + e,
    i = Math.floor(a / 3),
    r = (d, f) =>
      `<label class="small" style="display:block"><input type="checkbox" data-dk="${d}" ${H0[d] ? "checked" : ""}> ${f}</label>`,
    c = (d, f, h) => `<tr><td>${d}</td><td>${f}</td><td>${h}</td></tr>`;
  J(
    `<h3>🧹 Dọn kho</h3>
    <div class="card"><b>Dọn ở đâu</b>
      ${r("inv", `Hành trang <small class="dim">${o.inv.length}/${INV_MAX}</small>`)}
      ${r("box", `Kho Rèn <small class="dim">${a0().length}/${w1}</small>`)}
      ${r("st", `Kho chung <small class="dim">${n ? "không đọc được" : `${A.items.length}/${v2}`} · dùng chung 3 nhân vật, xét theo bộ lọc của nhân vật này</small>`)}</div>
    <div class="card"><b>Dọn gì</b>
      ${y0() ? r("jew", "Nhẫn / dây chuyền / ngọc bội thừa → luyện Huyền Tinh") : ""}
      ${r("white", "Bán đồ trắng")}
      ${r("blue", "Bán đồ xanh không khớp bộ lọc nhặt đồ")}
      ${y0() ? r("vio", "Bán đồ Tím / phôi Tím (không tốt hơn đồ đang mặc, chưa cường hóa)") : ""}
      ${r("gold", "Bán Hoàng Kim không thuộc bộ đang giữ (bộ phái khác / ngoài danh sách giữ, chưa cường hóa)")}
      <div class="row small">Chỉ dọn món cấp ≤ <select id="dkLv">${Array.from({ length: 10 }, (d, f) => `<option value="${f + 1}" ${H0.lv === f + 1 ? "selected" : ""}>${f + 1}</option>`).join("")}</select></div></div>
    <table class="dktbl small"><tr><th>Nơi</th><th>Bán</th><th>Trang sức luyện</th></tr>
      ${c("Hành trang", H0.inv ? t.inv.length : "—", "")}${c("Kho Rèn", H0.box ? t.box.length : "—", "")}${c("Kho chung", H0.st ? t.st.length : "—", H0.st ? e : "—")}
      ${c("<b>Tổng</b>", `<b>${t.inv.length + t.box.length + t.st.length}</b> (+${q(t.gold)} lượng)`, H0.jew && y0() ? `<b>${a}</b> → ~${i} Huyền Tinh (${q(d1())}/lần)` : "—")}</table>
    <p class="dim small">Luôn giữ: món khóa 🔒, ${H0.vio ? "" : "đồ Tím / phôi, "}Thần Mã, đồ đang mặc hoặc tốt hơn đồ đang mặc, đồ cần cho Dã Tẩu.</p>
    <div class="btnrow"><button class="btn red" id="dkGo">Dọn ngay</button><button class="btn red" id="dkAll" title="Bán toàn bộ, chỉ giữ món khóa">⚠ Dọn hết</button><button class="btn" id="dkNo">Đóng</button></div>`,
    () => {
      (document.querySelectorAll("#mBody [data-dk]").forEach(
        (d) =>
          (d.onchange = () => {
            ((H0[d.dataset.dk] = d.checked), s());
          }),
      ),
        (m("#dkLv").onchange = (d) => {
          ((H0.lv = +d.target.value), s());
        }),
        (m("#dkNo").onclick = () => n0()),
        (m("#dkAll").onclick = () => Xk()),
        (m("#dkGo").onclick = () => {
          const d = Vk(),
            f = d.msg.length ? "Dọn kho: " + d.msg.join(", ") : "Không có gì để dọn";
          (k(f), C(`<span class="dim">🧹 ${f}.</span>`), V(), s());
        }));
    },
  );
};

var H0 = { inv: !0, box: !0, st: !1, jew: !0, white: !0, blue: !0, gold: !1, vio: !1, lv: 10 };

var Jk = (s) =>
  !!s &&
  !s.ktc &&
  !s.pack &&
  !s.lock &&
  !s.plv &&
  !s.thanma &&
  !(typeof tA == "function" && tA(s)) &&
  !Object.values(o.eq).includes(s);

var Wk = (s) => y0() && vn.includes(s.d) && !s.set;

var Mg = (s) =>
  !!s &&
  !s.ktc &&
  !s.pack &&
  !s.lock &&
  !Object.values(o.eq).includes(s) &&
  !(typeof tA == "function" && tA(s));

var Zk = function (A) {
  return String(A || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[0@4]/g, (n) => ({ 0: "o", "@": "a", 4: "a" })[n])
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/7/g, "t");
};

var sr = function (A) {
  const n = Zk(A),
    t = n.replace(/[^a-z]/g, ""),
    e = n.split(/[^a-z0-9]+/).filter(Boolean);
  if (t === "nov" || Ax.some((i) => t.includes(i)) || e.some((i) => nx.includes(i))) return !0;
  const a = String(A || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d");
  return /^(GM|BQT|QTV|MOD)[A-Z]/.test(a);
};

var vl = function (A) {
  return (
    (A = String(A || "")
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .trim()),
    A.length < bl
      ? { ok: !1, msg: `Tên cần ít nhất ${bl} ký tự` }
      : A.length > ir
        ? { ok: !1, msg: `Tên tối đa ${ir} ký tự` }
        : vA.some((n) => n.n.toLowerCase() === A.toLowerCase()) || /^tân thủ$/i.test(A)
          ? { ok: !1, msg: "Không dùng tên môn phái" }
          : /[\[\]【】()]|^\s*(bot|gm|admin|administrator|quản trị|quan tri|bqt|hệ thống|he thong)(\s|$)/i.test(
                A,
              )
            ? { ok: !1, msg: "Tên không được giả AI / hệ thống" }
            : sr(A)
              ? { ok: !1, msg: "Tên không được giống người vận hành (Admin, GM, Quản trị…)" }
              : /[<>"'`\\]/.test(A)
                ? { ok: !1, msg: "Tên có ký tự không hợp lệ" }
                : /^[0-9A-Za-zÀ-ÖØ-öø-ÿĀ-ɏẠ-ỹ _.-]+$/.test(A)
                  ? { ok: !0, n: A }
                  : { ok: !1, msg: "Tên chỉ dùng chữ cái tiếng Việt, số, khoảng trắng, _ . -" }
  );
};

var Aa = function (A) {
  const n = OA() ? o.name : "";
  if (n && !rr()) {
    J(
      `<h3>Đổi Tên</h3><p class="desc">Nhân vật <b>${D(n)}</b> đã dùng hết lượt Đổi Tên. Mỗi nhân vật được Đổi Tên ${or} lần.</p><div class="btnrow"><button class="btn" id="nmNo">Đóng</button></div>`,
      () => {
        m("#nmNo").onclick = () => n0();
      },
    );
    return;
  }
  J(
    `<h3>${n ? "Đổi Tên" : "Đặt tên nhân vật"}</h3>
    <p class="desc">${n ? "" : "Nhân vật này tạo từ bản cũ nên chưa có tên riêng. "}Tên hiện trên đầu nhân vật, và trong chat thế giới.${n ? ` <b class="cn">Mỗi nhân vật được Đổi Tên ${or} lần, còn ${rr()} lượt.</b>` : ""}</p>
    <div class="row">Tên <input id="nmIn" maxlength="${ir}" placeholder="${bl}–${ir} ký tự" value="${D(n)}"></div>
    <div class="btnrow"><button class="btn" id="nmOk">Lưu tên</button><button class="btn" id="nmNo">Để sau</button></div>`,
    () => {
      const t = m("#nmIn");
      setTimeout(() => t.focus(), 0);
      let e = !1;
      const a = async () => {
        if (e) return;
        const i = vl(t.value);
        if (!i.ok) return k(i.msg);
        if (n && i.n === n) return k("Tên mới trùng tên cũ");
        const r = typeof b < "u" && b.user && typeof e0 == "function";
        ((e = !0), (m("#nmOk").disabled = !0));
        try {
          if (r) {
            const f = await e0((g) =>
                g
                  .from("chars")
                  .select("owner,slot")
                  .ilike(
                    "name",
                    i.n.replace(/[\\%_]/g, (u) => "\\" + u),
                  )
                  .limit(1),
              ),
              h = f && f.data && f.data[0];
            if (h && !(h.owner === b.user.id && +h.slot == +m0)) {
              k(`Tên "${i.n}" đã có người dùng — chọn tên khác (không mất lượt)`);
              return;
            }
          }
          const c = o.name,
            d = o.renamed | 0;
          if ((n && (o.renamed = d + 1), (o.name = i.n), r && typeof D1 == "function")) {
            b.lastChar = 0;
            try {
              await D1(!0);
            } catch (f) {
              if (/duplicate|unique|chars_name|23505/i.test(String(f && (f.message || f)))) {
                ((o.name = c),
                  (o.renamed = d),
                  k(`Tên "${i.n}" vừa có người dùng — chọn tên khác (không mất lượt)`));
                return;
              }
            }
          }
          ($(),
            C(`${n ? "Đổi Tên" : "Đặt tên nhân vật"}: <b>${D(i.n)}</b>`),
            n0(!0),
            V(),
            A && A());
        } catch (c) {
          k("Không kiểm tra được tên: " + (c.message || c) + " — thử lại");
        } finally {
          e = !1;
          const c = m("#nmOk");
          c && (c.disabled = !1);
        }
      };
      ((m("#nmOk").onclick = a),
        (t.onkeydown = (i) => {
          i.key === "Enter" && a();
        }),
        (m("#nmNo").onclick = () => n0()));
    },
  );
};

var bl = 2;

var ir = 14;

var OA = () => !!(o && o.name && o.name !== "Tân thủ" && !vA.some((s) => s.n === o.name));

var Ax = [
  "admin",
  "gamemaster",
  "moderator",
  "quantri",
  "banquantri",
  "hethong",
  "vanhanh",
  "nhaphathanh",
  "dieuhanh",
  "support",
  "sysop",
  "operator",
  "chinhthuc",
];

var nx = [
  "gm",
  "mod",
  "bqt",
  "qtv",
  "smod",
  "nph",
  "cskh",
  "dev",
  "ad",
  "staff",
  "system",
  "official",
];

var or = 5;

var rr = () => Math.max(0, or - (o.renamed | 0));

var tx = () => !OA() || rr() > 0;
