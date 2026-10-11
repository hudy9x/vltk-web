// online/auth-chat-and-market — shared IIFE scope; order is defined in modules.json.
var Kg = async function (A) {
  pr.some((r) => r[0] === b.rank) || (b.rank = "lvl");
  const n = b.rank,
    t = await e0((r) => {
      let c = r.from("chars").select("name,fac,lvl,reborn,power,tower,bosses");
      return (
        b.rfac && (c = c.eq("fac", b.rfac)),
        (c =
          n === "lvl"
            ? c
                .order("reborn", { ascending: !1 })
                .order("lvl", { ascending: !1 })
                .order("power", { ascending: !1 })
            : c.order(n, { ascending: !1 })),
        c.limit(n === "lvl" ? 100 : 50)
      );
    }),
    e = (r) => Math.min(Jx, Math.max(0, r.reborn | 0));
  let a = t.data || [];
  n === "lvl" &&
    (a = a
      .map((r, c) => [r, c])
      .sort((r, c) => e(c[0]) - e(r[0]) || (c[0].lvl | 0) - (r[0].lvl | 0) || r[1] - c[1])
      .map((r) => r[0])
      .slice(0, 50));
  const i = (r) =>
    n === "lvl" ? `${e(r) ? `<small class="cp">CS${e(r)}</small> ` : ""}${r.lvl}` : F(r[n] || 0);
  ((A.innerHTML = `<div class="row"><select id="nrCol">${pr.map(([r, c]) => `<option value="${r}" ${r === n ? "selected" : ""}>${c}</option>`).join("")}</select>
      <select id="nrFac"><option value="">Mọi phái</option>${vA
        .filter((r) => !r.novice)
        .map(
          (r) =>
            `<option value="${r.key}" ${r.key === b.rfac ? "selected" : ""}>${D(r.n)}</option>`,
        )
        .join("")}</select></div>
    <table class="dktbl small"><tr><th>#</th><th>Nhân vật</th><th>Phái</th><th>${pr.find((r) => r[0] === n)[1]}</th></tr>
    ${a.map((r, c) => `<tr${o && r.name === o.name ? ' style="background:#2a2410"' : ""}><td>${c + 1}</td><td><a href="#" data-pn="${D(r.name)}" style="color:${typeof o2 == "function" ? o2(r.name, r.fac) : "#ffd76a"}">${D(r.name)}${typeof i2 == "function" ? i2(r.name) : ""}</a></td><td>${D(ql(r.fac))}</td><td>${i(r)}</td></tr>`).join("") || '<tr><td colspan="4" class="dim">Chưa có ai</td></tr>'}</table>
    <p class="dim small">Bấm tên để xem trang bị. Nhân vật của bạn tự cập nhật khi đã đăng nhập.</p>`),
    (m("#nrCol").onchange = (r) => {
      ((b.rank = r.target.value), Y0("rank"));
    }),
    (m("#nrFac").onchange = (r) => {
      ((b.rfac = r.target.value), Y0("rank"));
    }),
    A.querySelectorAll("[data-pn]").forEach(
      (r) =>
        (r.onclick = (c) => {
          (c.preventDefault(), En(r.dataset.pn, () => Y0("rank")));
        }),
    ));
};

var En = async function s(A, n) {
  ((n = n || (() => n0())), J(`<h3>${D(A)}</h3><p class="dim small">Đang tải…</p>`));
  let t;
  try {
    t = await e0((c) =>
      c
        .from("chars")
        .select("name,fac,sex,lvl,reborn,power,tower,bosses,gear,updated")
        .ilike(
          "name",
          String(A).replace(/[\\%_]/g, (d) => "\\" + d),
        )
        .limit(1)
        .maybeSingle(),
    );
  } catch (c) {
    return J(`<h3>${D(A)}</h3><p class="reqbad">${D(c.message)}</p>`);
  }
  const e = t.data;
  if (!e)
    return J(
      `<h3>${D(A)}</h3><p class="desc">Nhân vật này chưa liên kết tài khoản online nên chưa xem được trang bị.</p><div class="btnrow"><button class="btn" id="pfB">Quay lại</button></div>`,
      () => {
        m("#pfB").onclick = n;
      },
    );
  const a = e.gear || {},
    i = I[e.fac],
    r = un
      .map(
        ([c, d]) =>
          `<div class="pfs"><small class="dim">${d}</small>${a[c] ? li(a[c]).replace("data-uid=", `data-pk="${c}" data-x=`) : '<div class="it"></div>'}</div>`,
      )
      .join("");
  J(
    `<h3${typeof Is == "function" && Is(e.name) ? ' style="color:#ff3b3b"' : ""}>${D(e.name)}${typeof i2 == "function" ? i2(e.name) : ""} <small>${D(i ? i.n : "")} · cấp ${e.lvl}${e.reborn ? ` · chuyển sinh ${e.reborn}` : ""}</small></h3>
    <p class="small">Tháp tầng <b>${e.tower || 0}</b> · Trùm đã hạ <b>${F(e.bosses || 0)}</b> <small class="dim">· cập nhật ${new Date(e.updated).toLocaleString("vi-VN")}</small></p>
    <div class="pfgrid">${r}</div>
    <div class="btnrow">${o && o.fac && e.name !== o.name ? '<button class="btn" id="pfParty">👥 Mời tổ đội</button><button class="btn" id="pfMail">📨 Gửi thư</button>' : ""}<button class="btn" id="pfB">Quay lại</button></div>`,
    () => {
      (document
        .querySelectorAll("#mBody [data-pk]")
        .forEach((f) => (f.onclick = () => Tl(a[f.dataset.pk], "", () => s(A, n), a))),
        (m("#pfB").onclick = n));
      const c = m("#pfMail");
      c &&
        (c.onclick = () => {
          ((b.mailTo = e.name), Y0("mail"));
        });
      const d = m("#pfParty");
      d &&
        (d.onclick = () => {
          typeof Ql == "function" && Ql(e.name);
        });
    },
  );
};

var Ft = function (A) {
  ((ct[A] = null), Y0(A));
};

var Sx = async function () {
  const A = ct.mail;
  if (A && Date.now() - A.t < 3e4) return A.data;
  let n = null;
  if (!b.mlOff)
    try {
      n = (await e0((e) => e.rpc("mail_list"))).data || [];
    } catch (t) {
      if (/mail_list|Could not find the function|schema cache/i.test(String(t && (t.message || t))))
        b.mlOff = !0;
      else throw t;
    }
  return (
    n == null &&
      (n =
        (await e0((e) => e.from("mail").select("*").order("id", { ascending: !1 }).limit(50)))
          .data || []),
    (ct.mail = { t: Date.now(), data: n }),
    n
  );
};

var Ix = async function (A) {
  const n = await Sx();
  ((b.mailN = n.length), oi(), (b.sels = b.sels instanceof Set ? b.sels : new Set()));
  for (const r of [...b.sels]) o.inv.some((c) => c.uid === r) || b.sels.delete(r);
  const t = o.fac ? o.inv.filter((r) => !(r.ktc && typeof G1 < "u" && !G1.includes(r.ktc.k))) : [];
  ((A.innerHTML = `<div class="card"><b>📥 Hộp thư</b> ${n.length ? '<button class="btn sm" id="nmAll">Nhận tất cả</button>' : ""}
      ${
        n
          .map(
            (
              r,
            ) => `<div class="nmrow">${r.item ? li(r.item).replace("data-uid=", `data-mi="${r.id}" data-x=`) : '<span class="nmg">💰</span>'}<span><b>${D(r.from_name)}</b> <small class="dim">${new Date(r.created).toLocaleString("vi-VN")}</small><br>
        ${r.item ? `<span style="color:${_0[r.item.r] || "#ddd"}">${D(r.item.n)}</span>` : ""}${r.gold > 0 ? ` <span class="cp">+${q(r.gold)} lượng</span>` : ""}${r.knb > 0 ? ` <span class="gold">+${r.knb} KNB</span>` : ""}${r.note ? `<br><small class="dim">${D(r.note)}</small>` : ""}</span>
        <button class="btn sm" data-take="${r.id}" ${o.fac ? "" : "disabled"}>Nhận</button>${r.kind === "gift" ? ` <button class="btn sm" data-rej="${r.id}" ${o.fac ? "" : "disabled"}>Hủy</button>` : ""}</div>`,
          )
          .join("") || '<p class="dim small">Không có thư.</p>'
      }</div>
    ${
      o.fac
        ? `<div class="card"><b>📤 Gửi thư</b> <small class="dim">từ ${D(OA() ? o.name : "(chưa đặt tên)")}</small>
      <div class="row">Gửi cho <input id="nmTo" maxlength="14" placeholder="Tên nhân vật" value="${D(b.mailTo || "")}"></div>
      <div class="row">${ln() ? "KNB" : "Ngân lượng"} <input id="nmGold" type="number" min="0" placeholder="0"> <small class="dim">có ${ln() ? F(o.knb | 0) + " KNB" : q(o.gold)}</small></div>
      <div class="row">Lời nhắn <input id="nmNote" maxlength="100" placeholder="(không bắt buộc)"></div>
      <div class="small">Kèm món đồ (chạm để chọn, chạm lại để bỏ · tối đa ${x2} món / lần):</div>
      <div class="invgrid" id="nmInv">${t.map((r) => li(r).replace('class="it', `${r.lock ? 'style="opacity:.4" title="Đang khóa 🔒" ' : ""}class="it${b.sels.has(r.uid) ? " ep-on" : ""}`)).join("") || '<small class="dim">Hành trang trống</small>'}</div>
      <small class="dim">Món mờ = đang khóa 🔒: mở khóa trong Hành trang mới gửi được.</small>
      <div id="nmPick"></div>
      <div class="btnrow"><button class="btn" id="nmSend">Gửi</button></div></div>`
        : ""
    }`),
    A.querySelectorAll("[data-mi]").forEach(
      (r) =>
        (r.onclick = () => {
          const c = n.find((d) => d.id === +r.dataset.mi);
          Tl(c.item, "", () => Y0("mail"));
        }),
    ),
    A.querySelectorAll("[data-rej]").forEach(
      (r) =>
        (r.onclick = async () => {
          const c = n.find((d) => d.id === +r.dataset.rej);
          c &&
            (c.kind !== "gift" ||
              !(await X1(
                `Không nhận thư của ${c.from_name}? Thư sẽ được trả lại cho người gửi.`,
                "Trả lại",
              )) ||
              v1(
                r,
                () => e0((d) => d.rpc("reject_mail", { mid: c.id })),
                () => {
                  (k("Đã trả lại thư"), Ft("mail"));
                },
              ));
        }),
    ),
    A.querySelectorAll("[data-take]").forEach(
      (r) =>
        (r.onclick = () =>
          v1(
            r,
            () => zg(n.find((c) => c.id === +r.dataset.take)),
            (c) => {
              (k("Đã nhận: " + c.join(", ")), V(), Ft("mail"));
            },
          )),
    ));
  const e = m("#nmAll");
  if (
    (e &&
      (e.onclick = () =>
        v1(
          e,
          async () => {
            let r = 0;
            for (const c of n)
              try {
                (await zg(c, !1), r++);
              } catch (d) {
                k(d.message);
                break;
              }
            return r;
          },
          (r) => {
            (k(`Đã nhận ${r} thư`), V(), Ft("mail"));
          },
        )),
    !o.fac)
  )
    return;
  const a = () => {
    b.mailTo = m("#nmTo").value;
  };
  A.querySelectorAll("#nmInv [data-uid]").forEach(
    (r) =>
      (r.onclick = () => {
        const c = +r.dataset.uid,
          d = o.inv.find((f) => f.uid === c);
        if (d) {
          if (d.lock) {
            k("Món đang khóa 🔒 — mở khóa trong Hành trang rồi gửi");
            return;
          }
          if (b.sels.has(c)) b.sels.delete(c);
          else {
            if (b.sels.size >= x2) {
              k(`Tối đa ${x2} món / lần`);
              return;
            }
            b.sels.add(c);
          }
          (A.querySelectorAll("#nmInv [data-uid]").forEach((f) =>
            f.classList.toggle("ep-on", b.sels.has(+f.dataset.uid)),
          ),
            i());
        }
      }),
  );
  const i = () => {
    const r = o.inv.filter((d) => b.sels.has(d.uid)),
      c = m("#nmPick");
    c &&
      (c.innerHTML = r.length
        ? r.length === 1
          ? `<div class="small">✓ Đang chọn: <b style="color:${_0[r[0].r] || "#ddd"}">${D(r[0].n)}</b>${r[0].enh ? " +" + r[0].enh : ""}</div><div class="card">${Z1(r[0])}</div>`
          : `<div class="small">✓ Đang chọn <b>${r.length}/${x2}</b> món:</div><div class="card small">${r.map((d) => `<div><b style="color:${_0[d.r] || "#ddd"}">${D(d.n)}</b>${d.enh ? " +" + d.enh : ""}</div>`).join("")}</div>`
        : '<p class="dim small">Chưa chọn món nào.</p>');
  };
  (i(),
    (m("#nmSend").onclick = async () => {
      a();
      const r = o.inv.filter((c) => b.sels.has(c.uid));
      (r.length &&
        !(await X1(
          `Gửi ${r.length > 1 ? r.length + " món (" + r.map((c) => c.n + (c.enh ? " +" + c.enh : "")).join(", ") + ")" : r[0].n + (r[0].enh ? " +" + r[0].enh : "")} cho ${m("#nmTo").value.trim() || "?"}?`,
          "Gửi",
        ))) ||
        v1(
          m("#nmSend"),
          () => Hx(m("#nmTo").value, r, m("#nmGold").value, m("#nmNote").value),
          () => {
            (k(r.length > 1 ? `Đã gửi ${r.length} món` : "Đã gửi"),
              b.sels.clear(),
              V(),
              Ft("mail"));
          },
        );
    }));
};

var Nx = function (A) {
  return A
    ? A.set
      ? A.set.kind === "platina"
        ? "bk"
        : $a(A) >= 0
          ? "hkmp"
          : "hk"
      : ["trang", "xanh", "hiem", "tim", "hk", "bk"][A.r | 0] || "trang"
    : "";
};

var Lx = async function s(A) {
  const t = `<div class="seg" id="nkSub">${[
      ["buy", "Mua"],
      ["sell", "Bày bán"],
      ["mine", "Hàng của tôi"],
    ]
      .map(
        ([y, M]) =>
          `<button class="btn sm${b.mkt === y ? " on" : ""}" data-nk="${y}">${M}</button>`,
      )
      .join("")}</div>`,
    e = () =>
      A.querySelectorAll("[data-nk]").forEach(
        (y) =>
          (y.onclick = () => {
            ((b.mkt = y.dataset.nk), (b.sel = null), Y0("mkt"));
          }),
      );
  if ((typeof b1 == "function" && !e1.ok && (await b1().catch(() => {})), b.mkt === "sell")) {
    const y = o.fac
        ? o.inv.filter((O) => !O.lock && !(O.ktc && typeof G1 < "u" && !G1.includes(O.ktc.k)))
        : [],
      M = b.sel ? y.find((O) => O.uid === b.sel) : null;
    ((A.innerHTML = `${t}<p class="dim small">Mỗi nhân vật bày tối đa 10 món. Bán được: nhận ${100 - Qx * 100}% giá ${ln() ? "cộng thẳng vào KNB" : "vào Thư"}. Gỡ hàng: món về Thư.</p>
      <div class="invgrid" id="nkInv">${y.map((O) => li(O).replace('class="it', `class="it${b.sel === O.uid ? " ep-on" : ""}`)).join("") || '<small class="dim">Hành trang trống (món khóa 🔒 không bày được)</small>'}</div>
      ${M ? `<div class="card">${Z1(M)}<div class="row">Giá <input id="nkPrice" type="number" min="1" placeholder="số tiền"> <select id="nkCur">${ln() ? "" : `<option value="gold" ${b.cur !== "knb" ? "selected" : ""}>lượng</option>`}<option value="knb" ${b.cur === "knb" || ln() ? "selected" : ""}>KNB</option></select> <small class="dim">giá bán NPC ${F(x0(M))} lượng</small> <small class="dim">Bày 2 giờ, hết hạn tự trả về Thư.</small></div><div class="btnrow"><button class="btn" id="nkGo">Bày bán</button></div></div>` : '<p class="dim small">Chạm món muốn bán.</p>'}`),
      e(),
      A.querySelectorAll("#nkInv [data-uid]").forEach(
        (O) =>
          (O.onclick = () => {
            ((b.sel = b.sel === +O.dataset.uid ? null : +O.dataset.uid), Y0("mkt"));
          }),
      ));
    const B = m("#nkGo");
    B &&
      (B.onclick = () =>
        v1(
          B,
          () => Cx(M, m("#nkPrice").value, (b.cur = m("#nkCur").value)),
          () => {
            (k("Đã bày bán"), (b.sel = null), V(), Ft("mkt"));
          },
        ));
    return;
  }
  const a = b.mkt === "mine",
    i = b.mf || (b.mf = { slot: "", rar: "", fit: !1, can: !1, sort: "new", cur: "" }),
    r = 15,
    c = String(b.q || "")
      .replace(/[,()*%\\:."']/g, " ")
      .trim()
      .replace(/\s+/g, "*")
      .slice(0, 40),
    d = Math.max(0, b.mp | 0),
    f = a ? "mine:" + o.name : ["all", c.toLowerCase(), i.slot, i.sort, d].join("|"),
    h = ct.mkt;
  let g,
    u = 0;
  if (h && h.k === f && Date.now() - h.t < 6e4) ((g = h.data), (u = h.n));
  else {
    try {
      await b.sb.rpc("market_expire");
    } catch {}
    const y = await e0((M) => {
      let B = M.from("market").select("*", a ? void 0 : { count: "exact" });
      if (a)
        return B.eq("seller", b.user.id)
          .eq("seller_name", o.name)
          .order("id", { ascending: !1 })
          .limit(50);
      if ((c && (B = B.or(`iname.ilike.*${c}*,seller_name.ilike.*${c}*`)), i.slot)) {
        const O = rA.map((G, j) => (G === i.slot ? String(j) : null)).filter((G) => G !== null);
        B =
          i.slot === "other"
            ? B.not("item->>d", "in", `(${rA.map((G, j) => j).join(",")})`)
            : B.in("item->>d", O);
      }
      return (
        (B =
          i.sort === "lo"
            ? B.order("price", { ascending: !0 }).order("id", { ascending: !1 })
            : i.sort === "hi"
              ? B.order("price", { ascending: !1 }).order("id", { ascending: !1 })
              : B.order("id", { ascending: !1 })),
        B.range(d * r, d * r + r - 1)
      );
    }).catch((M) => {
      if (d > 0 && /PGRST103|range not satisfiable/i.test(String(M && (M.message || M.code))))
        return ((b.mp = 0), null);
      throw M;
    });
    if (!y) return s(A);
    ((g = y.data || []),
      (u = y.count != null ? y.count : g.length),
      (ct.mkt = { k: f, t: Date.now(), data: g, n: u }));
  }
  let w = g.filter((y) => y && y.item && (a || typeof f3 != "function" || !f3(y.item)));
  const x = Math.max(1, Math.ceil(u / r));
  if (!a) {
    (i.rar && (w = w.filter((M) => Nx(M.item) === i.rar)),
      i.fit &&
        o.fac &&
        (w = w.filter((M) => {
          const B = M.item;
          try {
            if (
              (typeof p0 == "function" && !p0(B)) ||
              (rA[B.d] === "weapon" && typeof o1 == "function" && !o1(B))
            )
              return !1;
            const O = $a(B);
            return O < 0 || !I[o.fac] || O === I[o.fac].id;
          } catch {
            return !0;
          }
        })),
      i.cur && !ln() && (w = w.filter((M) => (ci(M) ? "knb" : "gold") === i.cur)),
      i.can && (w = w.filter((M) => wr(M))));
    const y = (M) => M.price * (ci(M) ? $4 : 1);
    i.sort === "lo"
      ? w.sort((M, B) => y(M) - y(B))
      : i.sort === "hi" && w.sort((M, B) => y(B) - y(M));
  }
  const p = (y, M, B) => `<option value="${y}" ${y === M ? "selected" : ""}>${B}</option>`,
    P = a
      ? ""
      : `<div class="row"><input id="nkQ" placeholder="Tìm tên món / người bán" value="${D(b.q)}"></div>
    <div class="row mktf"><select id="nkSlot">${p("", i.slot, "Mọi loại")}${jl.map(([y, M]) => p(y, i.slot, M)).join("")}${p("other", i.slot, "Khác")}</select>
      <select id="nkRar">${p("", i.rar, "Mọi phẩm chất")}${Wx.map(([y, M]) => p(y, i.rar, M)).join("")}</select>
      ${ln() ? "" : `<select id="nkCur2">${p("", i.cur, "Mọi loại tiền")}${p("gold", i.cur, "Lượng")}${p("knb", i.cur, "KNB")}</select>`}
      <select id="nkSort">${p("new", i.sort, "Mới nhất")}${p("lo", i.sort, "Giá thấp → cao")}${p("hi", i.sort, "Giá cao → thấp")}</select></div>
    <div class="row mktf"><label><input type="checkbox" id="nkFit" ${i.fit ? "checked" : ""}> Hợp với tôi (đủ cấp, đúng phái / vũ khí)</label> <label><input type="checkbox" id="nkCan" ${i.can ? "checked" : ""}> Đủ tiền mua</label> <small class="dim">${F(u)} món</small></div>
    <div class="row mktf mktpg"><button class="btn sm" id="nkPrev" ${d > 0 ? "" : "disabled"}>◀</button> <small>Trang ${d + 1} / ${x}</small> <button class="btn sm" id="nkNext" ${d + 1 < x ? "" : "disabled"}>▶</button> <button class="btn sm" id="nkRe" title="Tải lại">🔄</button></div>`;
  ((A.innerHTML = `${t}${P}
    ${
      w
        .map(
          (
            y,
          ) => `<div class="nmrow">${li(y.item).replace("data-uid=", `data-li="${y.id}" data-x=`)}<span><span style="color:${_0[y.item.r] || "#ddd"}">${D(y.iname)}</span><br><small class="dim">${D(y.seller_name)} · ${Xx(y)}</small></span>
      <span class="cp">${k2(y)}</span>${a ? `<button class="btn sm red" data-cx="${y.id}">Gỡ</button>` : y.seller === b.user.id ? `<small class="dim">${y.seller_name === o.name ? "của bạn" : "cùng tài khoản"}</small>` : `<button class="btn sm" data-buy="${y.id}" ${o.fac && wr(y) ? "" : "disabled"}>Mua</button>`}</div>`,
        )
        .join("") || '<p class="dim small">Chưa có món nào.</p>'
    }
    ${a ? "" : `<p class="dim small">Bạn có ${o.fac ? q(o.gold) : 0} lượng · ${o.fac ? F(o.knb | 0) : 0} KNB. Món mua được gửi vào Thư.</p>`}`),
    e());
  const _ = m("#nkQ");
  _ &&
    (_.onchange = () => {
      ((b.q = _.value), (b.mp = 0), Y0("mkt"));
    });
  for (const [y, M] of [
    ["#nkSlot", "slot"],
    ["#nkRar", "rar"],
    ["#nkSort", "sort"],
    ["#nkCur2", "cur"],
  ]) {
    const B = m(y);
    B &&
      (B.onchange = () => {
        ((i[M] = B.value), (M === "slot" || M === "sort") && (b.mp = 0), Y0("mkt"));
      });
  }
  {
    const y = m("#nkPrev"),
      M = m("#nkNext"),
      B = m("#nkRe");
    (y &&
      (y.onclick = () => {
        ((b.mp = Math.max(0, d - 1)), Y0("mkt"));
      }),
      M &&
        (M.onclick = () => {
          ((b.mp = d + 1), Y0("mkt"));
        }),
      B && (B.onclick = () => Ft("mkt")));
  }
  for (const [y, M] of [
    ["#nkFit", "fit"],
    ["#nkCan", "can"],
  ]) {
    const B = m(y);
    B &&
      (B.onchange = () => {
        ((i[M] = B.checked), Y0("mkt"));
      });
  }
  (A.querySelectorAll("[data-li]").forEach(
    (y) =>
      (y.onclick = () => {
        const M = w.find((B) => B.id === +y.dataset.li);
        Tl(
          M.item,
          `<p class="small">Người bán <b>${D(M.seller_name)}</b> · giá <b class="cp">${k2(M)}</b></p>`,
          () => Y0("mkt"),
        );
      }),
  ),
    A.querySelectorAll("[data-buy]").forEach(
      (y) =>
        (y.onclick = async () => {
          const M = w.find((B) => B.id === +y.dataset.buy);
          M &&
            (await X1(`Mua ${M.iname} của ${M.seller_name} giá ${k2(M)}?`, "Mua")) &&
            v1(
              y,
              () => Ox(M),
              () => {
                (k("Đã mua — món trong Thư"), V(), Ft("mkt"), (ct.mail = null));
              },
            );
        }),
    ),
    A.querySelectorAll("[data-cx]").forEach(
      (y) =>
        (y.onclick = () =>
          v1(
            y,
            () =>
              e0((M) => M.rpc("market_cancel", { lid: +y.dataset.cx, cname: o.name })).catch(
                (M) => {
                  if (!/market_cancel|function|schema cache/i.test(String(M && M.message))) throw M;
                  return e0((B) => B.rpc("market_cancel", { lid: +y.dataset.cx }));
                },
              ),
            () => {
              (k("Đã gỡ — món về Thư"), Yt(), (ct.mail = null), Ft("mkt"));
            },
          )),
    ));
};

var Rg = async function () {
  if (!b.user || !o || !o.fac) return;
  const A = await b.sb.rpc("jx_reset_get", { s: m0 });
  if (A.error || !Array.isArray(A.data)) return;
  const n = o.rsDone || (o.rsDone = []);
  for (const t of A.data)
    if (t.kind === "attr") {
      ((o.attr = { str: 0, dex: 0, vit: 0, eng: 0 }),
        (o.attrPts = Zx()),
        o.rw && o.rw.stat && (o.rw.stat.reborn | 0) > 10 && (o.rw.stat.reborn = 10));
      for (const e in o.sk) {
        const a = T[e];
        a && a.max > 0 && o.sk[e] > a.max && (o.sk[e] = a.max);
      }
      for (const e in o.skL || {}) {
        const a = T[e];
        a && a.max > 0 && o.skL[e].lv > a.max && (o.skL[e].lv = a.max);
      }
      {
        const e = v0(),
          a =
            Math.max(1, o.lvl) +
            (e > 0 ? Do : 0) +
            Math.min(Math.max(0, o.bonusSkp | 0), 15 + 15 * e),
          i = Object.keys(o.sk).reduce(
            (r, c) => r + (T[c] && T[c].tier === 90 ? 1 : o.sk[c] | 0),
            0,
          );
        (o.skPts | 0) > Math.max(0, a - i) && (o.skPts = Math.max(0, a - i));
      }
      (n.includes(t.id) || n.push(t.id),
        o.autoPts === !0 && typeof yt == "function" && yt(),
        (l.dirty = !0),
        typeof D0 == "function" && D0(),
        C(
          `<span class="bad">⚠ Hệ thống: tiềm năng / điểm kỹ năng vượt mức cho phép đã được đặt lại (${o.attrPts} tiềm năng theo cấp ${o.lvl}).</span>`,
        ),
        $(),
        await U0().catch(() => {}),
        typeof D1 == "function" && D1(!0).catch(() => {}),
        typeof refreshAll == "function" && refreshAll());
      break;
    }
};

var Yg = async function () {
  if (!h0()) return;
  const A = m("#giftBtn");
  if (A && !m("#netBtn")) {
    const n = document.createElement("button");
    ((n.id = "netBtn"),
      (n.title = "Giang hồ online: tài khoản, xếp hạng, thư, chợ"),
      (n.textContent = "🌐"),
      A.parentNode.insertBefore(n, A),
      (n.onclick = () => {
        (typeof o0 == "function" && o0("click"), Y0());
      }));
  }
  try {
    await si();
  } catch (n) {
    $l("Không kết nối được máy chủ: " + (n.message || n));
    return;
  }
  if (!b.user) {
    $l();
    return;
  }
  (qg()
    .then((n) => {
      n && (!o || !o.fac) && location.reload();
    })
    .catch(() => {}),
    typeof b1 == "function" && b1().catch(() => {}),
    typeof sn == "function" && sn().catch(() => {}),
    Cl(),
    Rg().catch(() => {}),
    typeof ka == "function" && ka(),
    Yt(),
    jg().catch(() => {}),
    document.addEventListener("visibilitychange", () => {
      document.hidden &&
        b.user &&
        o &&
        o.fac &&
        !b2() &&
        !jA.kicked &&
        Date.now() - b.lastUp > 15e3 &&
        El() !== b.upSig &&
        U0().catch(() => {});
    }),
    setInterval(async () => {
      if (
        !b.user &&
        o &&
        o.fac &&
        !document.hidden &&
        !b2() &&
        m("#modal").classList.contains("hidden")
      ) {
        Gg();
        return;
      }
      if (!(!b.user || !o || !o.fac || b2())) {
        try {
          (OA() && Date.now() - b.lastChar > 10 * 6e4 && (await D1(!0)),
            Date.now() - b.lastUp > 8 * 6e4 && El() !== b.upSig && (await U0()));
        } catch {}
        (Date.now() - (b.mailT || 0) > 5 * 6e4 && ((b.mailT = Date.now()), Yt()),
          Date.now() - (jA.t || 0) > 2 * 6e4 && zx(),
          Date.now() - (b.rsT || 0) > 10 * 6e4 &&
            ((b.rsT = Date.now()), Rg().catch(() => {}), typeof ka == "function" && ka()));
      }
    }, 6e4));
};

var Fg = function () {
  if (!(typeof h0 == "function" && h0() && b.user)) {
    J(
      '<h3>Về màn hình chọn nhân vật?</h3><p class="desc">Tiến trình đã được lưu trên máy này.</p><div class="btnrow"><button class="btn red" id="loY">Đồng ý</button><button class="btn" id="loN">Hủy</button></div>',
      () => {
        ((m("#loY").onclick = () => rP()), (m("#loN").onclick = () => n0()));
      },
    );
    return;
  }
  J(
    `<h3>⏻ Đăng xuất?</h3><p class="desc">Tài khoản <b>${D(ri())}</b>. Nhân vật sẽ được lưu lên máy chủ trước khi đăng xuất, sau đó về màn hình Đăng nhập / Đăng ký.</p><p class="desc dim" id="loMsg"></p><div class="btnrow"><button class="btn red" id="loY">Đăng xuất</button><button class="btn" id="loN">Hủy</button></div>`,
    () => {
      ((m("#loY").onclick = () => jx(!1)), (m("#loN").onclick = () => n0()));
    },
  );
};

var qx = async function () {
  const A = (e) => {
    const a = m("#loMsg");
    a && (a.textContent = e);
  };
  try {
    $();
  } catch {}
  if (!o || !o.fac || (typeof i0 < "u" && i0.blocked)) return !0;
  let n = !1,
    t = "";
  for (let e = 0; e < 3 && !n; e++) {
    A(`Đang lưu lên máy chủ${e ? ` (thử lại ${e + 1}/3)` : ""}…`);
    try {
      (await U0(), (n = !0));
    } catch (a) {
      ((t = a.message || String(a)), await new Promise((i) => setTimeout(i, 1200)));
    }
  }
  try {
    OA() && (await D1(!0));
  } catch {}
  try {
    typeof b1 == "function" && typeof Pr == "function" && Pr() > 0 && (await b1());
  } catch {}
  try {
    typeof sn == "function" && o && o.pq && (o.pq.fd || o.pq.tok) && (await sn());
  } catch {}
  return (n || A("Chưa lưu được lên máy chủ: " + t), n);
};

var jx = async function s(A) {
  const n = m("#loY"),
    t = m("#loN");
  if ((n && (n.disabled = !0), t && (t.disabled = !0), !(A || (await qx())))) {
    (n && ((n.disabled = !1), (n.textContent = "Vẫn đăng xuất"), (n.onclick = () => s(!0))),
      t && ((t.disabled = !1), (t.textContent = "Ở lại")));
    const i = m("#loMsg");
    i &&
      (i.innerHTML +=
        "<br>Tiến trình vẫn còn trên máy này và sẽ tự tải lên ở lần đăng nhập sau (cùng máy).");
    return;
  }
  const a = m("#loMsg");
  (a && (a.textContent = "Đã lưu. Đang đăng xuất…"), (HA = !0));
  try {
    (localStorage.setItem(f1, "menu"), sessionStorage.removeItem("jxidle_in"));
  } catch {}
  try {
    ((b.loggingOut = !0), await b.sb.auth.signOut());
  } catch {}
  ((b.user = null), location.reload());
};

var Cl = async function s() {
  if (!(jA.off || typeof b > "u" || !b.user)) {
    if (typeof i0 < "u" && i0.blocked) {
      setTimeout(s, 3e3);
      return;
    }
    try {
      const A = await b.sb.rpc("sess_claim", { s: jA.id });
      if (A.error) throw A.error;
      jA.t = Date.now();
    } catch (A) {
      /sess_claim|Could not find the function|schema cache/i.test(String(A && (A.message || A))) &&
        ((jA.off = !0), (jA.on = !1));
    }
  }
};

var zx = async function () {
  if (!(jA.off || jA.kicked || !b.user)) {
    jA.t = Date.now();
    try {
      const A = await b.sb.rpc("sess_ok", { s: jA.id });
      !A.error && A.data === !1 && Vg();
    } catch {}
  }
};

var Vg = function () {
  if (!jA.kicked) {
    ((jA.kicked = !0), (window.NET_GATE = !0));
    try {
      HA = !0;
    } catch {}
    J(
      `<h3>⚠ Tài khoản đang mở ở nơi khác</h3><p class="desc">Tài khoản <b>${D(ri())}</b> vừa được mở ở máy / tab khác. Game ở đây đã dừng để không ghi đè tiến trình.</p>
    <div class="btnrow"><button class="btn" id="ssHere">Chơi ở đây</button><button class="btn red" id="ssOut">Đăng xuất</button></div>`,
      () => {
        ((m("#ssHere").onclick = async () => {
          await Cl();
          try {
            localStorage.setItem(f1, String(m0));
          } catch {}
          location.reload();
        }),
          (m("#ssOut").onclick = async () => {
            try {
              await b.sb.auth.signOut();
            } catch {}
            location.reload();
          }));
      },
    );
  }
};

var b = {
  sb: null,
  user: null,
  tab: "acc",
  mkt: "buy",
  rank: "lvl",
  rfac: "",
  mailN: 0,
  lastChar: 0,
  lastUp: 0,
  sel: null,
  q: "",
};

var Ol = "@volamidle.game";

var Qx = 0.05;

var Gx = /[?&]offline_test=1\b/.test(location.search);

var h0 = () => {
  const s = window.CHAT_CFG || {};
  return !!(s.url && s.key) && !Gx;
};

var ri = () => (b.user && b.user.email ? b.user.email.replace(Ol, "") : "");

var Kx = (s) => {
  const A = (s && (s.message || s.error_description)) || String(s || "Lỗi mạng");
  return /chars_name|duplicate key/i.test(A)
    ? "Tên nhân vật đã có người dùng — hãy đổi tên (thẻ Nhân vật ✏)"
    : /Invalid login/i.test(A)
      ? "Sai tên đăng nhập hoặc mật khẩu"
      : /already registered|already exists/i.test(A)
        ? "Tên đăng nhập đã có người dùng"
        : /Email not confirmed/i.test(A)
          ? 'Supabase đang bật "Confirm email" — hãy tắt (xem HUONG_DAN_WEB.txt)'
          : /relation .* does not exist|Could not find the (table|function)/i.test(A)
            ? "Máy chủ chưa chạy NET_SETUP.sql"
            : A;
};

var Ug = "jxidle_sbvia";

var Rx = (s) =>
  /timeout|timed out|fetch|network|503|502|504|520|522|524|544|too many|overload|connection|failed to/i.test(
    String((s && (s.message || s.code || s.status)) || s),
  );

var b2 = () => Date.now() < (b.holdUntil || 0);

var El = () =>
  o
    ? [
        o.lvl,
        Math.floor(o.xp || 0),
        o.gold,
        o.knb | 0,
        (o.inv || []).length,
        o.uid,
        (o.rw && o.rw.stat && o.rw.stat.towerBest) | 0,
      ].join("|")
    : "";

var e0 = async (s) => {
  if (window.MAINT) throw new Error("Máy chủ đang bảo trì");
  try {
    const A = await si(),
      n = await s(A);
    if (n && n.error) throw n.error;
    return ((b.failN = 0), (b.holdUntil = 0), n);
  } catch (A) {
    throw (hx(A), new Error(Kx(A)));
  }
};

var P1 = { p: null, id: null, wait: null };

var gr = (s, A) => {
  try {
    if (A !== void 0)
      return ((document.cookie = `${s}=${A}; max-age=${3600 * 24 * 400}; path=/; SameSite=Lax`), A);
    const n = document.cookie.match(new RegExp("(?:^|; )" + s + "=([^;]*)"));
    return n ? n[1] : "";
  } catch {
    return "";
  }
};

var Sl = "jxCheat";

var Sn = async () => {
  Date.now() - b.lastChar > 6e4 && (await D1());
};

var Xg = (s, A) => JSON.stringify({ v: 2, d: s, k: A || null });

var Jg = () => {
  if (typeof l0 < "u" && l0.on) return null;
  try {
    return localStorage.getItem(p1);
  } catch {
    return null;
  }
};

var Yx = (s) => {
  try {
    const A = localStorage.getItem(h1(s)),
      n = A && t1(A);
    return n && n.ok && n.state && n.state.fac ? n.state : null;
  } catch {
    return null;
  }
};

var Il = (s) => Ud(JSON.stringify({ game: "jxidle", data: s }));

var y2 = (s) => !!(s && s.netOwner && b.user && s.netOwner !== b.user.id);

var Nl = async () => {
  if (typeof i0 < "u" && i0.blocked) throw new Error("Tab này đang tạm dừng");
  if (!(await vx()))
    throw new Error("Nhân vật vừa được lưu ở thiết bị khác — hãy tải bản mới trước");
};
