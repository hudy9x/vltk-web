// systems/rewards — shared IIFE scope; order is defined in modules.json.
var bh = async function () {
  const A = Q();
  if (A.fd < m1) {
    k(`Cần ${m1} điểm Phúc Duyên`);
    return;
  }
  if (s2) return;
  s2 = !0;
  let n;
  try {
    if (((n = await vh(1)), n === !1 || (n === null && !(await fo("fd", m1, "ruong"))))) return;
  } finally {
    s2 = !1;
  }
  A.stat.chests++;
  const t = z0(n ? n[0] || {} : fa(Po(), (e) => e[0])[1], "Rương Phúc Duyên", n ? "srv" : void 0);
  (k("Rương Phúc Duyên: " + t.join(", ").replace(/<[^>]+>/g, "")), et());
};

var ub = function (A) {
  if (!o.fac) return;
  const n = Q();
  if (
    (n.stat.kills++,
    _n("kills"),
    A.cls === "boss" && (n.stat.bosses++, _n("bosses")),
    A.goldBoss && (n.stat.goldBoss++, z0({ set: 1, fd: 10 }, "Hạ Trùm Hoàng Kim")),
    Math.random() < 0.05)
  ) {
    cc("tok", 1);
    const t = $e();
    o.matMsg !== !1 && C(`Nhặt được <b style="color:${t.col}">${D(t.token)}</b>`);
  }
  (lb(A.cls === "boss" ? 10 : A.cls === "elite" ? 3 : 1),
    (n.stat.kills % 25 === 0 || A.cls === "boss") && Mn());
};

var yh = function () {
  const A = Q(),
    n = A.stat.tokens || 0;
  return {
    login: A.login.claimed ? 0 : 1,
    lvms: go().length,
    chest: Math.floor(A.fd / m1),
    event: mc.filter(([t]) => n >= t).length,
  };
};

var kh = function () {
  if (!o || !o.fac) return !1;
  const A = Q();
  return Object.values(yh()).some((n) => n > 0);
};

var tt = function () {
  const A = m("#giftBtn");
  A && A.classList.toggle("on", kh());
};

var et = function () {
  (!m("#modal").classList.contains("hidden") && m("#giftTabs") && Ce(), tt());
};

var gb = function () {
  const A = Ca("grant") < 1 ? Ca("grant") * zh : 1,
    n = E(Math.floor(o.lvl / 15) + 1, 1, MA);
  return A >= 1
    ? "1 đồ Hoàng Kim"
    : `2 Huyền Tinh cấp ${n} (${Math.round(A * 1e3) / 10}% thay bằng 1 đồ Hoàng Kim)`;
};

var Te = function (A) {
  const n = [];
  if ((A.gold && n.push(`${q(A.gold * (1 + o.lvl / 10))} lượng`), A.pot)) {
    const t = S.potions.find((e) => e.kind === A.pot.kind && e.tier === $h(A.pot.tier));
    n.push(`${A.pot.n} ${t ? t.n : "bình thuốc"}`);
  }
  if (
    (A.ht && n.push(`${Se("ht")}${A.ht} Huyền Tinh cấp ${E(Math.floor(o.lvl / 15) + 1, 1, MA)}`),
    A.fd && n.push(`${Se("fd")}~${Math.max(1, Math.round(A.fd * dc))} Phúc Duyên`),
    A.knb && n.push(`${Se("knb")}${A.knb * H4} Kim Nguyên Bảo`),
    A.hb && n.push(`${Se("hb")}<b class="rw-hb">${A.hb} Hồng Bao</b>`),
    A.dhb && n.push(`${Se("dhb")}<b class="rw-dhb">${A.dhb} Đại Hồng Bao</b>`),
    A.kt)
  )
    for (const t in A.kt) n.push(`${Se(t)}<b class="rw-kt">${A.kt[t]} ${Db(t)}</b>`);
  if (
    (A.item && n.push(`đồ ${A.item} dòng`),
    A.set && n.push(A.common ? "1 đồ Hoàng Kim dùng chung (Kim Phong, An Bang, Định Quốc…)" : gb()),
    A.pts && n.push(`${A.pts} tiềm năng`),
    A.buff)
  )
    for (const t in A.buff) n.push(fc(t, A.buff[t][0], A.buff[t][1]).replace(" trong ", " "));
  if ((A.skp && n.push(`${A.skp} điểm kỹ năng`), A.misc))
    for (const t in A.misc)
      n.push(
        `${Se(t)}${["vlmt", "ttk", "rngua", "ldt"].includes(t) ? `<b class="rw-kt">${A.misc[t]} ${rt(t)}</b>` : `${A.misc[t]} ${rt(t)}`}`,
      );
  return n.join(", ");
};

var mb = function (A) {
  if (O1 === "login") {
    const n = A.login,
      t = (((n.streak - 1) % 7) + 7) % 7;
    return `<p class="desc">Chuỗi ${n.streak} ngày · tổng ${n.total} ngày. Mốc 5 / 10 / 15 / 20 / 25 / 30 ngày có quà lớn (lặp lại mỗi 30 ngày).</p>
      <div class="days">${Ch.map((e, a) => `<div class="day${a < t || (a === t && n.claimed) ? " got" : ""}${a === t ? " cur" : ""}"><b>Ngày ${a + 1}</b><small>${Te(e)}</small></div>`).join("")}</div>
      <div class="btnrow"><button class="btn" id="gLogin" ${n.claimed ? "disabled" : ""}>${n.claimed ? "Đã nhận hôm nay" : "Nhận quà hôm nay"}</button></div>
      <h4 style="margin:10px 0 4px">Mốc ngày điểm danh <small class="dim">· vòng hiện tại: ngày ${((((n.total - 1) % 30) + 30) % 30) + 1}/30</small></h4>
      ${Object.entries(Oh)
        .map(([e, a]) => {
          const i = n.total > 0 ? Math.floor((n.total - 1) / 30) * 30 : 0,
            r = i + +e;
          return `<div class="qrow${n.got[r] || n.total >= r ? "" : " lock"}"><span><b>${e} ngày</b><small>${Te(a)}</small></span><small>${n.got[r] ? "✓" : n.total >= r ? "đã qua" : `còn ${r - n.total} ngày`}</small></div>`;
        })
        .join("")}`;
  }
  if (O1 === "lvms") {
    const n = A.lvGot || {},
      t = v0();
    return `<p class="desc">${t ? `Mốc cấp vòng chuyển sinh ${t}: nhận lại mỗi lần chuyển sinh.` : "Quà mốc cấp: nhận một lần."} Vật phẩm vào Hành trang (dùng khi cần).</p>${go().length > 1 ? `<div class="btnrow"><button class="btn on" id="gLvAll">Nhận tất cả (${go().length})</button></div>` : ""}${qt() ? `<div class="card">${qt()}</div>` : ""}${uc()
      .map(
        ([e, a, i]) =>
          `<div class="qrow${o.lvl >= e ? "" : " lock"}"><span><b>Cấp ${e}</b><small>${Te(a)}${i ? " · " + i : ""}</small></span><small></small><button class="btn sm" data-lv="${e}" ${o.lvl >= e && !n[Es(e)] ? "" : "disabled"}>${n[Es(e)] ? "Đã nhận" : "Nhận"}</button></div>`,
      )
      .join("")}`;
  }
  if (O1 === "ach")
    return `<p class="desc">Đạt <b>${a2.filter((n) => A.ach[n[0]]).length}/${a2.length}</b> · thưởng tự nhận khi hoàn thành. Danh hiệu: thẻ Nhân vật → 🎖 Danh hiệu.</p>${[
      ...a2,
    ]
      .sort((n, t) => !!A.ach[t[0]] - !!A.ach[n[0]])
      .map(
        ([n, t, , e, a]) =>
          `<div class="qrow${A.ach[n] ? "" : " lock"}"><span><b>${t}</b><small>${Te(e)}</small></span><small>${A.ach[n] ? "✓" : ""}</small></div>`,
      )
      .join("")}`;
  if (O1 === "chest")
    return `<p class="desc">Điểm Phúc Duyên: <b>${A.fd}</b> (chỉ nhận khi đánh quái: Dã Tẩu, phó bản, tháp tầng trùm, Trùm Hoàng Kim, Boss tuần). Mỗi lần mở: ${m1} điểm.</p>
      <div class="chips">${(() => {
        const n = Po(),
          t = n.reduce((e, a) => e + a[0], 0) || 1;
        return n
          .map(
            ([e, a]) => `<span class="chip2">${Te(a)} · ${Math.round((e / t) * 1e3) / 10}%</span>`,
          )
          .join("");
      })()}</div>${Po().length < pc.length ? '<p class="dim small">Đã đủ giới hạn Võ Lâm Mật Tịch / Tẩy Tủy Kinh nên rương không ra hai món này (tỉ lệ đã tính lại).</p>' : ""}
      <div class="btnrow"><button class="btn" id="gChest" ${A.fd >= m1 ? "" : "disabled"}>Mở ×1</button><button class="btn" data-ch="10" ${A.fd >= m1 * 10 ? "" : "disabled"}>Mở ×10</button><button class="btn" data-ch="100" ${A.fd >= m1 * 100 ? "" : "disabled"}>Mở ×100</button><button class="btn" data-ch="999999" ${A.fd >= m1 * 2 ? "" : "disabled"}>Mở hết (${Math.floor(A.fd / m1)})</button></div>`;
  if (O1 === "event") {
    const n = $e();
    return `<p class="desc">Sự kiện: <b style="color:${n.col}">${n.n}</b>. Quái rơi ${n.token} (5%). Đang có: <b>${A.stat.tokens}</b>.</p>${mc.map(([t, e], a) => `<div class="qrow"><span>${Te(e)}</span><small>${t} ${n.token}</small><button class="btn sm" data-e="${a}" ${A.stat.tokens >= t ? "" : "disabled"}>Đổi</button></div>`).join("")}`;
  }
  return "";
};

var xh = function (A = Q()) {
  return `<p class="desc">Mỗi tầng một đợt tinh anh; lần đầu qua: tầng thường 1 Huyền Tinh; tầng chia hết cho 5 là trùm: 1 Mảnh HK Môn Phái + 1 món Hoàng Kim + ~3 Phúc Duyên + 1 / 2 / 5 Thần Bí Khoáng Thạch (qua lại tầng trùm vẫn nhận). Quái cấp 10 + 4 × tầng (tối đa 200); từ tầng 49 mỗi tầng quái thêm 0,05% máu và sát thương. Gục ngã ở chế độ Leo Tháp: tự chuyển về Luyện Công. Gục ngã là rời tháp.</p>
      <p>Kỷ lục: <b>tầng ${A.stat.towerBest}</b>${l.tower ? ` · đang ở tầng ${l.tower.floor}` : ""}</p>
      <div class="btnrow">${l.tower ? '<button class="btn red" id="gTowerOut">Rời tháp</button>' : wo(e2) ? `<button class="btn" id="gTower">Vào tháp (từ tầng ${Math.max(1, A.stat.towerBest - 4)})</button>` : `<button class="btn" disabled>Cần cấp ${e2}</button>`}</div>`;
};

var Bh = function (A = Q()) {
  const n = A.pet;
  return wo(Sh)
    ? `<p class="desc">Đồng hành đi theo và cùng đánh quái, lên cấp theo số quái hạ. Chọn trong các loài ở vùng đã tới (đổi loài vẫn giữ cấp).</p>${n && r0[n.tid] ? `<p>Đang dẫn: <b>${D(r0[n.tid].n)}</b> · cấp ${n.lvl} · sát thương ${F(Ph(n))}/đòn</p>` : ""}
      <div class="petpick">${rb()
        .map(
          (t) =>
            `<button data-p="${t}" class="${n && n.tid === t ? "on" : ""}">${r0[t].img ? `<img src="${D(r0[t].img)}" alt="">` : ""}<b>${D(r0[t].n)}</b></button>`,
        )
        .join("")}</div>`
    : `<p class="desc">Đồng hành mở khóa ở cấp ${Sh}.</p>`;
};

var wb = function (A = Q()) {
  const n = mo(),
    t = A.stat.reborn >= n2;
  return `<p class="desc">Đạt cấp ${Ee}: về cấp 1, giữ trang bị; <b>mỗi lần chuyển sinh +${$i} cấp khi xét yêu cầu trang bị</b> (vd cấp 10 chuyển sinh 1 = cấp ${10 + $i}: mặc được mọi trang bị); võ công 90 học không cần Bí Kíp 90; mỗi lần +10% tỉ lệ rơi đồ; mốc cấp nhận lại mỗi vòng; tẩy toàn bộ điểm tiềm năng và kỹ năng cũ, nhận cố định <b>${po} điểm tiềm năng + ${Do} điểm kỹ năng</b>; mỗi lần quái mạnh thêm (+25% máu, +15% sát thương), +10% sát thương nhưng <b>kinh nghiệm nhận được −10%</b> mỗi lần (tối đa ${n2} lần).</p>
      <p>Đã chuyển sinh: <b>${A.stat.reborn}</b> lần · hiện ${Math.round(n.xp * 100)}% kinh nghiệm, +${Math.round(n.dmg * 100)}% sát thương, kháng tất cả +${Vr * A.stat.reborn}%, kháng tối đa ${Yr + Fr * A.stat.reborn}% (mỗi lần +${Vr}% kháng tất cả, +${Fr}% kháng tối đa) · độ khó: quái ×${lc().hp.toFixed(2)} máu, ×${lc().dmg.toFixed(2)} sát thương.</p>
      <div class="btnrow"><button class="btn red" id="gReborn" ${o.lvl >= Ee && !t ? "" : "disabled"}>${t ? "Đã chuyển sinh tối đa" : o.lvl >= Ee ? "Chuyển sinh" : `Cần cấp ${Ee}`}</button></div>`;
};

var Ce = function s(A) {
  if (!o.fac) return;
  const n = Q(),
    t = yh();
  if ((Dc.some(([e]) => e === O1) || (O1 = "login"), A && !t[O1])) {
    const e = Dc.find(([a]) => t[a] > 0);
    e && (O1 = e[0]);
  }
  J(
    `<h3>🎁 Phần thưởng <small>Phúc Duyên ${n.fd}${n.stat.tokens ? ` · ${$e().token} ${n.stat.tokens}` : ""}</small></h3><div class="dtabs" id="giftTabs">${Dc.map(([e, a]) => `<button data-g="${e}" class="${e === O1 ? "on" : ""}">${a}${t[e] ? ` <b class="gdot">${t[e] > 99 ? "99+" : t[e]}</b>` : ""}</button>`).join("")}</div>${mb(n)}`,
    () => {
      document.querySelectorAll("#mBody #giftTabs button").forEach(
        (a) =>
          (a.onclick = () => {
            ((O1 = a.dataset.g), s());
          }),
      );
      const e = (a, i) => {
        const r = m(a);
        r && (r.onclick = i);
      };
      (e("#gLogin", () => {
        (Wv(), et());
      }),
        e("#gChest", bh),
        document
          .querySelectorAll("#mBody [data-ch]")
          .forEach((a) => (a.onclick = () => hb(+a.dataset.ch))),
        document
          .querySelectorAll("#mBody [data-lv]")
          .forEach((a) => (a.onclick = () => gh(+a.dataset.lv))),
        e("#gLvAll", () => {
          for (const [a] of go()) gh(a);
          $();
        }),
        document.querySelectorAll("#mBody [data-t]").forEach(
          (a) =>
            (a.onclick = () => {
              ((n.title = n.title === a.dataset.t ? "" : a.dataset.t), (l.dirty = !0), $(), et());
            }),
        ),
        document
          .querySelectorAll("#mBody [data-e]")
          .forEach((a) => (a.onclick = () => fb(+a.dataset.e))));
    },
  );
};

var _h = function () {
  k("Tính năng chuyển sinh hiện đã tắt.");
};

var Os = (s) => `${s.getFullYear()}-${s.getMonth() + 1}-${s.getDate()}`;

var Oe = () => Os(new Date());

var Mh = 1800;

var Hh = 300;

var Ee = 200;

var n2 = 10;

var m1 = 10;

var dc = 0.3;

var pb = {
  kills: 0,
  bosses: 0,
  goldBoss: 0,
  picked: 0,
  towerBest: 0,
  reborn: 0,
  chests: 0,
  tokens: 0,
};

var CA = { off: !1, t: 0, busy: null, ok: !1 };

var at = () => !CA.off && typeof b < "u" && !!b.user && typeof m0 < "u";

var t2 = () => {
  const s = o.pq || (o.pq = { fd: 0, tok: 0 });
  return ((s.fd = s.fd | 0), (s.tok = s.tok | 0), s);
};

setInterval(() => {
  at() &&
    o &&
    o.fac &&
    (t2().fd || t2().tok || Date.now() - CA.t > 5 * 6e4) &&
    sn().catch(() => {});
}, 6e4);
