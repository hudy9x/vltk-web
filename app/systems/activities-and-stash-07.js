// systems/activities-and-stash — shared IIFE scope; order is defined in modules.json.
var Nk = function () {
  const A = Ik(),
    n = G0(j0()),
    t = { skills: [], attrs: [], gainSk: 0, gainAt: 0 },
    e = JSON.stringify(o.skL || {});
  ((l.sim = 1), (l.buffAssume = !0));
  try {
    if (o.skPts > 0) {
      const a = Object.assign({}, o.sk);
      Pt();
      for (const i in o.sk) {
        const r = o.sk[i] - (a[i] || 0);
        r > 0 && t.skills.push({ id: +i, n: T[i].n, d: r, to: o.sk[i], max: T[i].max });
      }
      t.gainSk = G0(j0()) / Math.max(1, n) - 1;
    }
    if ((pg(A), o.attrPts > 0)) {
      const a = Object.assign({}, o.attr);
      Dg();
      for (const i of Object.keys(nn)) {
        const r = o.attr[i] - a[i];
        r > 0 && t.attrs.push({ k: i, n: nn[i], d: r });
      }
      t.gainAt = G0(j0()) / Math.max(1, n) - 1;
    }
  } finally {
    ((l.buffAssume = !1), pg(A), (l.sim = 0), (o.skL = JSON.parse(e)));
  }
  return t;
};

var D2 = function s() {
  const A = Nk(),
    n = (r) => (r >= 0 ? "+" : "") + (r * 100).toFixed(1) + "%",
    t = A.skills.length
      ? `<div class="card"><b>Võ công</b> <small class="cp">sức mạnh ${n(A.gainSk)}</small>${A.skills.map((r) => `<div>${D(r.n)}: +${r.d} → ${r.to}/${r.max}</div>`).join("")}<div class="btnrow"><button class="btn" id="sgSk">Áp dụng</button></div></div>`
      : "",
    e = e4(),
    a = e.total
      ? `<div class="card"><b>Đủ điểm cho đồ đang mặc</b> <small class="dim">cần ${e.total} điểm · đang có ${o.attrPts}${e.total > o.attrPts ? ` · thiếu ${e.total - o.attrPts} (≈ ${Math.ceil((e.total - o.attrPts) / z2)} cấp nữa)` : ""}</small>${e.list
          .map(
            (r) =>
              `<div class="small">${D(r.it.n)} <span class="dim">(cấp ${r.lv})</span>: ${Object.entries(
                r.d,
              )
                .map(([c, d]) => `${nn[c]} +${d}`)
                .join(", ")}</div>`,
          )
          .join(
            "",
          )}<div class="dim small">Gợi ý tiềm năng bên dưới cộng phần này trước, phần còn lại theo lực chiến.</div></div>`
      : "",
    i = A.attrs.length
      ? `<div class="card"><b>Tiềm năng</b> <small class="cp">sức mạnh ${n(A.gainAt)}</small>${A.attrs.map((r) => `<div>${r.n}: +${r.d}</div>`).join("")}<div class="btnrow"><button class="btn" id="sgAt">Áp dụng</button></div></div>`
      : "";
  J(
    `<h3>Gợi ý cộng điểm</h3><p class="desc">Xem trước, chưa cộng gì. Gợi ý chọn cách tăng sức mạnh nhiều nhất với trang bị hiện tại. Bạn vẫn rút điểm được bằng nút −.</p>${t}${a}${i}${!t && !i ? '<p class="dim">Bạn không có điểm nào để cộng.</p>' : ""}`,
    () => {
      const r = m("#sgSk");
      r &&
        (r.onclick = () => {
          (Pt(), D0(), $(), V(), s());
        });
      const c = m("#sgAt");
      c &&
        (c.onclick = () => {
          (Dg(), D0(), $(), V(), s());
        });
    },
  );
};

var Lk = function s(A) {
  A && (Js = A);
  const n = [
    ["zone", "Vùng và quái"],
    ["set", "Bộ Hoàng Kim"],
    ["plat", "Bạch Kim"],
    ["mat", "Nguyên liệu rèn"],
  ];
  let t = "";
  if (Js === "zone")
    t = k0
      .map((e, a) => {
        const i = o.maxStage >= a * Kn + 1,
          r = e.m
            .filter((c) => r0[c])
            .map((c) => D(r0[c].n))
            .join(", ");
        return `<div class="card${i ? "" : " lock"}"><b>${D(e.n)}</b> <small class="dim">cấp ${e.lo}–${e.hi}${i ? "" : " · chưa tới"}</small><br><small>Trùm: <b class="boss">${D((r0[e.boss] || {}).n || "?")}</b></small><br><small class="dim">Quái: ${r}</small><br><small>Ngũ hành: ${
          e.sw
            .map((c, d) => (c ? `<span style="color:${w0[d]}">${g0[d]}</span>` : ""))
            .filter(Boolean)
            .join(" ") || "—"
        }</small></div>`;
      })
      .join("");
  else if (Js === "set") {
    const e = I[o.fac] ? I[o.fac].id : -1,
      a = new Map();
    for (const r of S.sets.gold) {
      if (!k1(r.req) || !cA(r)) continue;
      const c = YA(r, 39);
      (c !== e && c !== -1) || (a.get(r.grp) || a.set(r.grp, []).get(r.grp)).push(r);
    }
    const i = [...a.values()].sort((r, c) => YA(r[0], 36) - YA(c[0], 36));
    t =
      `<p class="desc">Bộ Hoàng Kim của phái bạn (${i.length} bộ). Mặc đủ số món của một bộ sẽ mở hết dòng ẩn của mọi trang bị.</p>` +
        i
          .map((r) => {
            const c = r[0],
              d = c.n2 || 99;
            return `<div class="card"><b>${D(c.n.split(" ").slice(0, 2).join(" "))}…</b> <small class="dim">cấp ${YA(c, 36)} · ${r.length} món · đủ ${d} món mở dòng ẩn</small><br><small class="dim">${r.map((f) => D(f.n)).join(" · ")}</small></div>`;
          })
          .join("") || '<p class="dim">Không có.</p>';
  } else if (Js === "plat") {
    const e = I[o.fac] ? I[o.fac].id : -1,
      a = new Set(
        Object.values(o.eq)
          .concat(o.inv)
          .filter((d) => d && d.set && d.set.kind === "gold")
          .map((d) => d.n),
      ),
      i = new Map();
    for (const d of S.sets.gold) {
      if (d.fixed || !k1(d.req) || !cA(d)) continue;
      const f = YA(d, 39);
      (f !== e && f !== -1) || (i.get(d.grp) || i.set(d.grp, []).get(d.grp)).push(d);
    }
    const r = [...i.values()]
      .filter((d) => d.some((f) => F1.has(f.n)))
      .sort((d, f) => (YA(f[0], 39) >= 0) - (YA(d[0], 39) >= 0) || YA(d[0], 36) - YA(f[0], 36));
    t =
      `<div class="card"><small>Món Hoàng Kim chế được Bạch Kim của môn phái bạn (${r.reduce((d, f) => d + f.filter((h) => F1.has(h.n)).length, 0)} món). Điều kiện: Hoàng Kim cường hóa +${fs}, ${qa} Thần Bí Khoáng Thạch, 1 Huyền Tinh cấp ${pe}, ${q(B1)} lượng · Bạch Kim cần cấp ${H3} · Lò rèn → Hoàng Kim → Chế Bạch Kim.${d3() ? "" : ' <b class="bad">Chưa mở ở phiên bản này.</b>'}</small></div>` +
        r
          .map((d) => {
            const f = d[0],
              h = YA(f, 39) >= 0;
            return (
              `<div class="card"><b>${D(f.n.split(" ").slice(0, 2).join(" "))}…</b> <small class="dim">${h ? "Hoàng Kim Môn Phái" : "Bộ chung"} · cấp ${YA(f, 36)}</small><br>` +
              d
                .map((g) => {
                  const u = F1.has(g.n) ? g3(g.n) : null,
                    w = a.has(g.n) ? ' <small style="color:#7dff7d">(đang có)</small>' : "";
                  return u
                    ? `<small>✓ ${D(g.n)} → <b style="color:${_0[5] || "#e0e0ff"}">${D(Y6(u.n))}</b>${w}</small>`
                    : "";
                })
                .filter(Boolean)
                .join("<br>") +
              "</div>"
            );
          })
          .join("") ||
      (e < 0
        ? '<p class="dim">Gia nhập môn phái để xem.</p>'
        : '<p class="dim">Không có món nào.</p>');
  } else {
    const e = (a) =>
      `${Math.round(ls[a].boss * 1e3) / 10}% trùm · ${Math.round(ls[a].elite * 1e3) / 10}% tinh anh · ${Math.round(ls[a].normal * 1e4) / 100}% quái thường`;
    t = `<div class="card"><b>Chuỗi rèn</b><br><small>Tím (Lò rèn → Lò Ép Đồ): tinh luyện Huyền Tinh (3 trang sức + ${q(d1())}; 3 viên cùng cấp → 1, thất bại mất 1 viên) → lấy thuộc tính từ đồ xanh thành đá (5.000) → chế tạo phôi Tím trống (10.000, số dòng theo cấp Huyền Tinh) → khảm nạm lần lượt từng dòng (10.000; dòng ẩn đúng hệ; không trùng thuộc tính).<br>Hoàng Kim: gom mảnh từ trùm (9 / 6 / 4 mảnh) ghép thành món bộ.</small></div>
      <div class="card"><b>Huyền Tinh Khoáng Thạch</b> <small class="dim">đang có ${Object.values(S0().ht).reduce((a, i) => a + i, 0)}</small><br><small>Rơi: ${e("ht")} · Dã Tẩu (35% mỗi nhiệm vụ, mỗi 10 nhiệm vụ 3 viên) · Sát Thủ · phó bản · luyện 3 nhẫn / dây chuyền / ngọc bội (Lò rèn → Tinh luyện)</small></div>
      <div class="card"><b>Đá thuộc tính (dòng 1–6)</b> <small class="dim">đang có ${Object.values(S0().ore).reduce((a, i) => a + i, 0)}</small><br><small>Dòng 1/3/5: Huyền Thiết · Mật Ngân · Chu Sa Nguyên Khoáng (không phân hệ) · dòng 2/4/6: Khổng Tước · Phù Dung · Chung Nhũ Nguyên Thạch (đúng hệ món)</small><br>
        <small>Nguồn: <b>Lấy thuộc tính</b> từ đồ xanh (Lò rèn → Lò Ép Đồ, chọn được thuộc tính) · quái rơi: ${e("ore")} · phần thưởng phó bản · tách dòng đồ Tím</small></div>
      <div class="card"><b>Mảnh Hoàng Kim</b> <small class="dim">đang gom ${Object.keys(S0().shard).length} loại</small><br><small>Rơi: ${e("shard")}</small></div>
      <div class="card"><b>Thủy Tinh Trắng / Thần Bí Khoáng Thạch</b> <small class="dim">${N("misc", "wc")} / ${N("misc", "mys")}</small><br><small>Thủy Tinh Trắng: quái cấp ≥ 60 hoặc trùm, rơi ${e("wc")}. Thần Bí Khoáng Thạch: chỉ Trùm Hoàng Kim (1–3 viên) và tầng trùm Thông Thiên Tháp (1 / 2 / 5 viên).</small></div>`;
  }
  J(
    `<h3>Bách khoa</h3><div class="dtabs">${n.map(([e, a]) => `<button data-c="${e}" class="${e === Js ? "on" : ""}">${a}</button>`).join("")}</div><div class="codex">${t}</div>`,
    () => {
      document
        .querySelectorAll("#mBody .dtabs [data-c]")
        .forEach((e) => (e.onclick = () => s(e.dataset.c)));
    },
  );
};

var ul = [
  [
    "Hành tẩu tự động",
    "Nhân vật tự đánh quái, nhặt đồ, uống thuốc. Ở thẻ Giang hồ chọn ⚔ Luyện công (đánh ở bãi hợp cấp, tự đổi bãi khi lên cấp) hoặc 📜 Làm nhiệm vụ (tự làm Dã Tẩu, Sát Thủ, đi thuyền, tự chuyển bản đồ). Bạn không cần bấm gì để chơi. Kéo joystick bên trái để tự điều khiển khi muốn; bấm ⚙ Tự động để quay lại.",
    "log",
  ],
  [
    "Trang bị và nhặt đồ",
    "Đồ rơi trên đất, nhân vật tự nhặt món khớp bộ lọc (thẻ Hành trang). Món mạnh hơn được tự mặc (có thể tắt ở thẻ Khác). Bấm vào một món để xem so sánh và lý do thay đổi sức mạnh.",
    "inv",
  ],
  [
    "Điểm tiềm năng và võ công",
    'Mỗi cấp bạn nhận điểm tiềm năng (thẻ Nhân vật) và điểm kỹ năng (thẻ Võ công). Dùng nút + để cộng, − để rút lại, i để xem kỹ năng làm gì, và "Gợi ý" để xem trước cách cộng hiệu quả.',
    "skill",
  ],
  [
    "Rèn đồ",
    'Thẻ Lò rèn, ba chặng: Tím (luyện Huyền Tinh, lấy thuộc tính, chế phôi, khảm nạm), Hoàng Kim Bộ chung / Môn phái (gom mảnh từ trùm). Bật "Tự động rèn đồ" ở thẻ Khác nếu không muốn bấm tay.',
    "forge",
  ],
  [
    "Ép đồ Tím",
    `Thẻ Lò rèn → 💎 Lò Ép Đồ:
1. Tinh luyện: 3 nhẫn / dây chuyền / ngọc bội + 1.000 lượng → 1 Huyền Tinh; 3 viên cùng cấp → 1 viên cấp +1.
2. Lấy thuộc tính: đồ xanh + 1 Huyền Tinh + 5.000 → 1 đá thuộc tính đúng dòng bạn chọn (món nguồn mất).
3. Chế tạo phôi: đồ trắng / xanh + 1 Huyền Tinh + 10.000 → đồ Tím trống, số dòng theo cấp Huyền Tinh (cấp 3 ≈ 5 dòng).
4. Khảm nạm: khảm lần lượt dòng 1 → 6, mỗi dòng 1 đá + 1 Huyền Tinh + 10.000.
Dòng 1/3/5 hiện (Nguyên Khoáng, không phân hệ) · dòng 2/4/6 ẩn (Nguyên Thạch, phải đúng hệ món). Mỗi thuộc tính chỉ 1 lần trên 1 món. Phụ liệu (Thủy Tinh hoặc 5 Phúc Duyên): +15% thành công.`,
    "forge",
  ],
  [
    "Đá thuộc tính và Huyền Tinh ở đâu",
    `ĐÁ THUỘC TÍNH:
• Lấy thuộc tính từ đồ xanh (nguồn chính, chọn được thuộc tính).
• Quái rơi: trùm 20%, tinh anh 3%, quái thường 0,3% (thường hợp hệ / loại đồ đang mặc).
• Phần thưởng phó bản.
HUYỀN TINH:
• Quái rơi: trùm 45%, tinh anh 8%, quái thường 1%.
• Dã Tẩu: 35% mỗi nhiệm vụ, mỗi 10 nhiệm vụ 3 viên. Sát Thủ: mỗi lần hạ 1 viên. Phó bản.
• Luyện từ 3 trang sức thừa.
MẸO: Hành trang → 💎 Đồ để ép Tím: bật tự nhặt đồ trắng, trang sức thừa, đồ xanh có dòng cấp cao; tự cất vào Kho Rèn hoặc Kho chung.`,
    "forge",
  ],
  [
    "Quà và sao lưu",
    "Nút 🎁: điểm danh, mốc cấp, thành tựu, rương Phúc Duyên, sự kiện. Tháp thử thách và Đồng hành ở thẻ Nhiệm vụ › Hoạt động; Chuyển sinh ở thẻ Nhân vật. Game chạy trên máy bạn: hãy vào thẻ Khác → Tải file lưu để sao lưu và chơi trên thiết bị khác.",
    "more",
  ],
];

var gl = {
  pts: 'Bạn có điểm tiềm năng chưa cộng: mở thẻ Nhân vật (nút "Gợi ý" cho cách cộng hiệu quả).',
  skill: "Có điểm kỹ năng: mở thẻ Võ công, bấm i để xem kỹ năng làm gì.",
  forge:
    'Bạn vừa nhặt nguyên liệu rèn (Huyền Tinh / khoáng). thẻ Lò rèn → 💎 Lò Ép Đồ (Huyền Tinh, đá thuộc tính, đồ Tím), hoặc bật "Tự động rèn đồ" ở thẻ Khác.',
  gift: "Có quà chờ nhận ở nút 🎁.",
  full: "Hành trang gần đầy: chỉnh bộ lọc nhặt đồ ở thẻ Hành trang để bớt đồ thừa.",
};

var Js = "zone";

var Ws = function (A) {
  const n = Ai();
  if (!A || typeof A != "object") return n;
  ((n.id = typeof A.id == "string" ? A.id : n.id),
    (n.rev = Math.max(0, +A.rev || 0)),
    (n.at = Math.max(0, +A.at || 0)),
    (n.gold = Number.isFinite(+A.gold) ? Math.max(0, Math.floor(+A.gold)) : 0),
    (n.items = (Array.isArray(A.items) ? A.items : [])
      .filter((t) => t && typeof t == "object" && Array.isArray(t.base) && Array.isArray(t.mag))
      .slice(0, v2)));
  for (const t of n.items) (t.set && /[\u3400-\u9fff]/.test(t.n) && (t.n = setNameVi(t.n)), ft(t));
  if (
    ((n.items = n.items.filter((t) => !xi(t) && !(typeof VA == "function" && VA(t)))),
    typeof ZA == "function")
  ) {
    let t = 0;
    ((n.items = n.items.filter((e) =>
      ZA(e) ? ((t += typeof x0 == "function" ? x0(e) : 0), !1) : !0,
    )),
      (n.gold += Math.min(2e8, Math.round(t))));
  }
  for (const t of n.items)
    (t.set && /[\u3400-\u9fff]/.test(t.n) && (t.n = setNameVi(t.n)),
      ft(t),
      typeof kc == "function" && kc(t));
  for (const t of ["ht", "ore", "shard", "misc"])
    for (const e in (A.mats || {})[t] || {}) {
      const a = Math.floor(+A.mats[t][e]);
      a > 0 && (n.mats[t][e] = a);
    }
  return n;
};

var ml = async function () {
  if (!yg()) return null;
  try {
    const A = await e0((n) => n.rpc("stash_get"));
    return (
      (l0.st = Ws(A.data.data)),
      (l0.rev = +A.data.rev || 0),
      (l0.on = !0),
      (l0.t = Date.now()),
      l0.st
    );
  } catch (A) {
    throw (
      /stash_get|Could not find the function|schema cache/i.test(String(A && (A.message || A))) &&
        (l0.off = !0),
      A
    );
  }
};

var P2 = async function (A, n) {
  for (let t = 0; t < 3; t++) {
    if (t && A === "take_items" && n.uids) {
      const i = (l0.st && l0.st.items) || [];
      if (
        ((n = { ...n, idx: n.uids.map((r) => i.findIndex((c) => c && c.uid === r)) }),
        n.idx.some((r) => r < 0))
      )
        throw new Error("Món không còn trong kho");
    }
    const e = await e0((i) => i.rpc("stash_op", { op: A, rv: l0.rev, cname: o.name || "", p: n })),
      a = e.data || {};
    if (((l0.st = Ws(a.data)), (l0.rev = +a.rev || 0), (l0.t = Date.now()), a.err !== "stale"))
      return a;
  }
  throw new Error("Kho đang được dùng ở nơi khác — thử lại");
};

var Pg = async function (A) {
  if (
    ((A = A.filter(
      (n) =>
        o.inv.includes(n) &&
        !(n.ktc && typeof J0 < "u" && (J0.find((t) => t.k === n.ktc.k) || {}).srv),
    )),
    !A.length)
  )
    return { ok: !1, msg: "Không có món gửi được" };
  try {
    (await We(), await P2("dep_items", { items: A.map(kg) }));
    for (const n of A) {
      const t = o.inv.indexOf(n);
      t >= 0 && o.inv.splice(t, 1);
    }
    return (
      (R = !0),
      $(),
      We().catch(() => {}),
      { ok: !0, msg: A.length > 1 ? `Gửi ${A.length} món vào kho` : `Gửi vào kho: ${A[0].n}` }
    );
  } catch (n) {
    return { ok: !1, msg: n.message || String(n) };
  }
};

var rn = function () {
  if (l0.on) return { st: l0.st || Ai() };
  let A = null;
  try {
    A = localStorage.getItem(p1);
  } catch {
    return { st: Ai(), err: "storage" };
  }
  if (!A) return { st: Ai() };
  const n = (i) => {
      try {
        const r = t1(i);
        return r.ok ? Ws(r.state) : null;
      } catch {
        return null;
      }
    },
    t = n(A);
  if (t) return { st: t };
  let e = null;
  try {
    e = localStorage.getItem(p1 + "_bak");
  } catch {}
  const a = e && n(e);
  return a ? { st: a, restored: !0 } : { st: Ai(), err: "tampered" };
};

var wl = function (A) {
  (A.rev++, (A.at = Math.max(Date.now(), (A.at || 0) + 1)));
  const n = localStorage.getItem(p1);
  if (n)
    try {
      t1(n).ok && localStorage.setItem(p1 + "_bak", n);
    } catch {}
  localStorage.setItem(p1, bn(A));
};

var Je = function (A) {
  if (l0.on) return { ok: !1, msg: "Kho chung đang ở máy chủ — thao tác qua cửa sổ Kho chung" };
  const { st: n, err: t } = rn();
  if (t === "tampered")
    return { ok: !1, msg: "Kho đã bị chỉnh sửa ngoài game (sai chữ ký), không dùng được" };
  if (t) return { ok: !1, msg: "Không đọc được bộ nhớ trình duyệt" };
  let e;
  try {
    e = A(n);
  } catch (i) {
    return { ok: !1, msg: i.message || "Lỗi kho" };
  }
  if (!e || !e.ok) return e || { ok: !1, msg: "" };
  const a = () => (
    e.undo && e.undo(),
    $(),
    { ok: !1, msg: "Không ghi được kho (bộ nhớ đầy hoặc bị chặn)" }
  );
  if (e.from === "char") {
    $();
    try {
      wl(n);
    } catch {
      return a();
    }
  } else {
    try {
      wl(n);
    } catch {
      return (e.undo && e.undo(), { ok: !1, msg: "Không ghi được kho (bộ nhớ đầy hoặc bị chặn)" });
    }
    $();
  }
  return (qk(), e);
};

var qk = function () {
  typeof h0 != "function" ||
    !h0() ||
    typeof b > "u" ||
    !b.user ||
    !o ||
    !o.fac ||
    typeof U0 != "function" ||
    (clearTimeout(xg),
    (xg = setTimeout(() => {
      U0().catch(() => k("Chưa tải được kho lên máy chủ, sẽ thử lại"));
    }, 1500)));
};

var jk = async function (A) {
  if (l0.on || (!l0.off && yg()))
    try {
      return (await ml(), !0);
    } catch {
      if (!l0.off) return !1;
    }
  if (
    typeof h0 != "function" ||
    !h0() ||
    typeof b > "u" ||
    !b.user ||
    typeof e0 != "function" ||
    (!A && Date.now() - er < 2e4)
  )
    return !1;
  er = Date.now();
  try {
    const n = Dl,
      e = (
        (await e0((i) => i.from("saves").select("slot,updated").eq("owner", b.user.id))).data || []
      )
        .filter((i) => new Date(i.updated).getTime() !== n[i.slot])
        .map((i) => i.slot);
    let a = !1;
    if (e.length) {
      const i = await e0((r) =>
        r.from("saves").select("slot,data,updated").eq("owner", b.user.id).in("slot", e),
      );
      for (const r of i.data || [])
        ((n[r.slot] = new Date(r.updated).getTime()), Ml(ii(r.data).k) && (a = !0));
    }
    return a;
  } catch {
    return !1;
  }
};

var Zs = function (A) {
  return o.inv.includes(A)
    ? l0.on
      ? Pg([A])
      : A.ktc && typeof J0 < "u" && (J0.find((n) => n.k === A.ktc.k) || {}).srv
        ? { ok: !1, msg: "Hồng Bao nằm trên máy chủ, dùng chung cả tài khoản — không cần gửi kho" }
        : Je((n) => {
            if (n.items.length >= v2) return { ok: !1, msg: `Kho đầy (${v2} món)` };
            const t = kg(A),
              e = o.inv.indexOf(A);
            return (
              o.inv.splice(e, 1),
              n.items.push(t),
              (R = !0),
              {
                ok: !0,
                from: "char",
                msg: `Gửi vào kho: ${A.n}`,
                undo: () => {
                  (o.inv.splice(e, 0, A), (R = !0));
                },
              }
            );
          })
    : { ok: !1, msg: "Chỉ gửi được món trong hành trang (không phải đồ đang mặc)" };
};

var zk = function (A) {
  return o.inv.length >= INV_MAX
    ? { ok: !1, msg: "Hành trang đầy" }
    : l0.on
      ? (async () => {
          try {
            const n = (l0.st.items || [])[A];
            if (!n) return { ok: !1, msg: "Món không còn trong kho" };
            const t = await P2("take_items", { idx: [A], uids: [n.uid] });
            for (const e of t.taken || []) ((e.uid = o.uid++), o.inv.unshift(e));
            return (
              (R = !0),
              (l.dirty = !0),
              $(),
              We().catch(() => {}),
              { ok: !0, msg: `Lấy ra: ${(t.taken || [])[0] ? t.taken[0].n : ""}` }
            );
          } catch (n) {
            return { ok: !1, msg: n.message || String(n) };
          }
        })()
      : Je((n) => {
          const t = n.items[A];
          return t
            ? (n.items.splice(A, 1),
              (t.uid = o.uid++),
              o.inv.unshift(t),
              (R = !0),
              (l.dirty = !0),
              {
                ok: !0,
                msg: `Lấy ra: ${t.n}`,
                undo: () => {
                  o.inv.shift();
                },
              })
            : { ok: !1, msg: "Món không còn trong kho" };
        });
};

var tr = function (A, n) {
  return (
    (n = Math.floor(+n)),
    n > 0
      ? l0.on
        ? (async () => {
            try {
              if (A === "in") {
                if (n > o.gold) return { ok: !1, msg: "Không đủ ngân lượng" };
                (await We(), await P2("dep_gold", { n }), (o.gold -= n));
              } else (await P2("take_gold", { n }), (o.gold += n));
              return (
                $(),
                We().catch(() => {}),
                { ok: !0, msg: `${A === "in" ? "Gửi" : "Rút"} ${q(n)} lượng` }
              );
            } catch (t) {
              return { ok: !1, msg: t.message || String(t) };
            }
          })()
        : Je((t) =>
            A === "in"
              ? n > o.gold
                ? { ok: !1, msg: "Không đủ ngân lượng" }
                : ((o.gold -= n),
                  (t.gold += n),
                  {
                    ok: !0,
                    from: "char",
                    msg: `Gửi ${q(n)} lượng`,
                    undo: () => {
                      o.gold += n;
                    },
                  })
              : n > t.gold
                ? { ok: !1, msg: "Kho không đủ ngân lượng" }
                : ((t.gold -= n),
                  (o.gold += n),
                  {
                    ok: !0,
                    msg: `Rút ${q(n)} lượng`,
                    undo: () => {
                      o.gold -= n;
                    },
                  }),
          )
      : { ok: !1, msg: "Nhập số ngân lượng" }
  );
};

var vg = function (A, n, t, e) {
  return l0.on
    ? (async () => {
        try {
          const a = A === "in" ? N(n, t) : (l0.st.mats[n] || {})[t] || 0;
          return (
            (e = e == null ? a : Math.min(a, Math.floor(+e))),
            e > 0
              ? (A === "in"
                  ? (await We(), await P2("dep_mat", { g: n, k: t, n: e }), U(n, t, -e))
                  : (await P2("take_mat", { g: n, k: t, n: e }), U(n, t, e)),
                $(),
                We().catch(() => {}),
                { ok: !0, msg: `${A === "in" ? "Gửi" : "Rút"} ${e} ${pl(n, t)}` })
              : { ok: !1, msg: "Không có gì để chuyển" }
          );
        } catch (a) {
          return { ok: !1, msg: a.message || String(a) };
        }
      })()
    : Je((a) => {
        const i = A === "in" ? N(n, t) : a.mats[n][t] || 0;
        return (
          (e = e == null ? i : Math.min(i, Math.floor(+e))),
          e > 0
            ? (A === "in"
                ? (U(n, t, -e), (a.mats[n][t] = (a.mats[n][t] || 0) + e))
                : ((a.mats[n][t] -= e), a.mats[n][t] <= 0 && delete a.mats[n][t], U(n, t, e)),
              {
                ok: !0,
                from: A === "in" ? "char" : "stash",
                msg: `${A === "in" ? "Gửi" : "Rút"} ${e} ${pl(n, t)}`,
                undo: () => U(n, t, A === "in" ? e : -e),
              })
            : { ok: !1, msg: "Không có gì để chuyển" }
        );
      });
};

var pl = function (A, n) {
  if (A === "ht") return `Huyền Tinh cấp ${n}`;
  if (A === "shard") return `Mảnh ${n}`;
  if (A === "misc") return rt(n);
  const t = IA(n),
    e = ge(t.a)[0];
  return `Khoáng dòng ${t.place + 1} · ${e ? e.n : sA(t.a)} · cấp ${t.lvl}`;
};

var Qk = function () {
  const { st: A } = rn();
  return JSON.stringify({ game: "jxidle-stash", v: bg, exported: Date.now(), data: bn(A) });
};

var Gk = function (A) {
  if (
    ((A = String(A || "")
      .trim()
      .replace(/^﻿/, "")),
    !A)
  )
    throw new Error("File rỗng");
  const n = JSON.parse(A);
  if (!n || n.game !== "jxidle-stash" || typeof n.data != "string")
    throw new Error("Không phải file kho của game");
  const t = t1(n.data);
  if (!t.ok) throw new Error("File đã bị chỉnh sửa (sai chữ ký)");
  return Ws(t.state);
};

var Kk = function (A) {
  const n = rn(),
    t = Ws(A);
  t.rev = Math.max(n.st.rev, t.rev);
  try {
    wl(t);
  } catch {
    return { ok: !1, msg: "Không ghi được kho" };
  }
  return { ok: !0, msg: "Đã nạp kho từ file" };
};

var Rk = function (A, n) {
  return `<button class="it r${A.r}${p0(A) ? "" : " bad"}" data-si="${n}" title="${D(A.n)}">${A.ic ? `<img src="${D(A.ic)}" alt="">` : ""}<i>${A.lvl}</i>${A.s >= 0 && A.s < 5 ? `<b class="s5" style="background:${w0[A.s]}"></b>` : ""}${A.enh ? `<em>+${A.enh}</em>` : ""}</button>`;
};

var Kt = async function (A, n) {
  if (A && typeof A.then == "function") {
    if (Pl) return;
    Pl = !0;
    try {
      A = await A;
    } finally {
      Pl = !1;
    }
  }
  (k(A.msg || (A.ok ? "Xong" : "Không thực hiện được")), A.ok && o0("use"), n !== !1 && Rt(), V());
};

var Rt = function s(A) {
  if (
    (A && (Ze = A),
    typeof h0 == "function" &&
      h0() &&
      typeof b < "u" &&
      b.user &&
      (l0.on ? Date.now() - l0.t >= 2e4 : Date.now() - er >= 2e4))
  ) {
    (J('<h3>Kho chung</h3><p class="desc">Đang đồng bộ kho với máy chủ…</p>'),
      (er = Date.now()),
      l0.on && (l0.t = Date.now()),
      jk(!0).finally(() => s(A)));
    return;
  }
  const { st: n, err: t } = rn(),
    e = [
      ["item", "Đồ"],
      ["mat", "Nguyên liệu"],
      ["gold", "Ngân lượng"],
    ].concat(typeof h0 == "function" && h0() ? [] : [["file", "File kho"]]);
  Ze === "file" && e.length < 4 && (Ze = "item");
  let a = "";
  if (
    (t &&
      (a = `<p class="reqbad">${t === "tampered" ? "Kho đã bị chỉnh sửa ngoài game (sai chữ ký) và không có bản sao lưu hợp lệ. Có thể nạp lại từ file kho." : "Không đọc được bộ nhớ trình duyệt."}</p>`),
    Ze === "item")
  )
    a += `<p class="desc">Bấm món trong <b>hành trang</b> để gửi vào kho. Bấm món trong <b>kho</b> để xem và lấy ra. Kho dùng chung cho cả 3 slot (${n.items.length}/${v2} món).</p>
      <h3>Hành trang <small>${o.inv.length}/${INV_MAX}</small></h3><div class="invgrid" id="stInv">${o.inv.map(W1).join("") || '<small class="dim">Trống</small>'}</div>
      <h3>Kho chung <small>${n.items.length}/${v2}</small></h3><div class="invgrid" id="stBox">${n.items.map(Rk).join("") || '<small class="dim">Kho trống</small>'}</div>`;
  else if (Ze === "mat") {
    const i = [];
    for (const r of ["ht", "ore", "shard", "misc"])
      for (const c of new Set([...Object.keys(S0()[r]), ...Object.keys(n.mats[r])])) i.push([r, c]);
    a +=
      '<p class="desc">Nguyên liệu rèn đang có / trong kho.</p>' +
      (i
        .map(
          ([r, c]) =>
            `<div class="qrow"><span>${D(pl(r, c))}<small>có ${N(r, c)} · kho ${n.mats[r][c] || 0}</small></span><span></span><span class="pm"><button class="btn sm" data-mi="${r}|${c}" ${N(r, c) ? "" : "disabled"}>Gửi hết</button><button class="btn sm" data-mo="${r}|${c}" ${n.mats[r][c] ? "" : "disabled"}>Rút hết</button></span></div>`,
        )
        .join("") || '<small class="dim">Chưa có nguyên liệu</small>');
  } else
    Ze === "gold"
      ? (a += `<p class="desc">Ngân lượng: bạn <b>${q(o.gold)}</b> · kho <b>${q(n.gold)}</b>.</p><div class="row"><input type="number" id="stGold" min="1" placeholder="Số lượng"></div>
      <div class="btnrow"><button class="btn" id="stIn">Gửi vào kho</button><button class="btn" id="stOut">Rút ra</button><button class="btn" id="stInAll">Gửi hết</button><button class="btn" id="stOutAll">Rút hết</button></div>`)
      : (a += `<p class="desc">Chuyển kho sang thiết bị khác: tải file kho (.jxkho) ở đây, nạp ở thiết bị kia. Nạp file sẽ <b>thay thế</b> kho hiện tại. File có chữ ký, sửa tay sẽ bị từ chối.</p>
      <div class="btnrow"><button class="btn" id="stDl">Tải file kho</button><button class="btn red" id="stUp">Nạp file kho</button></div>`);
  J(
    `<h3>Kho chung <small>${q(n.gold)} lượng · ${n.items.length} món</small></h3><div class="btnrow"><button class="btn sm" id="stDon">🧹 Dọn kho (bán / luyện đồ thừa)</button></div><div class="dtabs" id="stTabs">${e.map(([i, r]) => `<button data-st="${i}" class="${i === Ze ? "on" : ""}">${r}</button>`).join("")}</div>${a}`,
    () => {
      const i = (f) => document.querySelectorAll("#mBody " + f);
      (((f, h) => {
        const g = m(f);
        g && (g.onclick = h);
      })("#stDon", () => ni()),
        i("#stTabs [data-st]").forEach((f) => (f.onclick = () => s(f.dataset.st))),
        i("#stInv .it").forEach(
          (f) =>
            (f.onclick = () => {
              const h = o.inv.find((g) => g.uid === +f.dataset.uid);
              h && Kt(Zs(h));
            }),
        ),
        i("#stBox .it").forEach((f) => (f.onclick = () => Yk(+f.dataset.si))),
        i("[data-mi]").forEach(
          (f) =>
            (f.onclick = () => {
              const [h, g] = f.dataset.mi.split("|");
              Kt(vg("in", h, g));
            }),
        ),
        i("[data-mo]").forEach(
          (f) =>
            (f.onclick = () => {
              const [h, g] = f.dataset.mo.split("|");
              Kt(vg("out", h, g));
            }),
        ));
      const c = () => m("#stGold").value,
        d = (f, h) => {
          const g = m(f);
          g && (g.onclick = h);
        };
      (d("#stIn", () => Kt(tr("in", c()))),
        d("#stOut", () => Kt(tr("out", c()))),
        d("#stInAll", () => Kt(tr("in", o.gold))),
        d("#stOutAll", () => Kt(tr("out", rn().st.gold))),
        d("#stDl", () => {
          const f = new Blob([Qk()], { type: "application/json" }),
            h = document.createElement("a");
          ((h.href = URL.createObjectURL(f)),
            (h.download = `jxidle_kho_${new Date().toISOString().slice(0, 10)}.jxkho`),
            document.body.appendChild(h),
            h.click(),
            setTimeout(() => {
              (URL.revokeObjectURL(h.href), h.remove());
            }, 1500),
            k("Đã tải file kho"));
        }),
        d("#stUp", () => {
          const f = document.createElement("input");
          ((f.type = "file"),
            (f.accept = ".jxkho,.json"),
            (f.style.display = "none"),
            (f.onchange = () => {
              const h = f.files && f.files[0];
              if ((f.remove(), !h)) return;
              const g = new FileReader();
              ((g.onload = () => Fk(String(g.result))), g.readAsText(h));
            }),
            document.body.appendChild(f),
            f.click());
        }));
    },
  );
};

var Yk = function (A) {
  const n = rn().st.items[A];
  if (!n) {
    Rt();
    return;
  }
  J(
    `${Z1(n)}<div class="btnrow"><button class="btn" id="stTake">Lấy ra</button><button class="btn" id="stBack">Quay lại</button></div>`,
    () => {
      ((m("#stTake").onclick = () => Kt(zk(A))), (m("#stBack").onclick = () => Rt()));
    },
  );
};

var Fk = function (A) {
  let n;
  try {
    n = Gk(A);
  } catch (e) {
    k(e.message || "File không hợp lệ");
    return;
  }
  const t = rn().st;
  J(
    `<h3>Nạp file kho</h3><p class="desc">File: <b>${n.items.length}</b> món, <b>${q(n.gold)}</b> lượng. Kho hiện tại: ${t.items.length} món, ${q(t.gold)} lượng. Nạp sẽ <b>thay thế</b> kho hiện tại.</p>
    <div class="btnrow"><button class="btn red" id="stOk">Thay thế kho</button><button class="btn" id="stNo">Hủy</button></div>`,
    () => {
      ((m("#stOk").onclick = () => {
        const e = Kk(n);
        (k(e.msg), Rt());
      }),
        (m("#stNo").onclick = () => Rt("file")));
    },
  );
};

var p1 = "jxidle_stash";

var v2 = 60;

var bg = 1;

var Ai = () => ({
  v: bg,
  id: Math.random().toString(36).slice(2, 10),
  rev: 0,
  gold: 0,
  items: [],
  mats: { ht: {}, ore: {}, shard: {}, misc: {} },
});

var l0 = { on: !1, off: !1, st: null, rev: 0, t: 0 };

var yg = () =>
  !l0.off &&
  typeof h0 == "function" &&
  h0() &&
  typeof b < "u" &&
  !!b.user &&
  typeof e0 == "function";

var We = async () => {
  typeof U0 == "function" && (await U0());
};

var kg = (s) => JSON.parse(JSON.stringify(s));

var xg = 0;

var er = 0;

var Dl = {};

var Ze = "item";

var Pl = !1;

var ar = function (A, n) {
  return !Jk(A) || (A.lvl || 1) > H0.lv || (n && !A.set && typeof FA == "function" && FA(A))
    ? ""
    : A.vio
      ? H0.vio && !A.enh
        ? "vio"
        : ""
      : H0.jew && Wk(A)
        ? "jew"
        : A.set
          ? H0.gold && !Ma(A) && !A.enh
            ? "gold"
            : ""
          : mA(A)
            ? ""
            : (A.r || 0) === 0
              ? H0.white
                ? "white"
                : ""
              : H0.blue
                ? "blue"
                : "";
};
