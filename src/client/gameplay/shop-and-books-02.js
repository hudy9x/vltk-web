// gameplay/shop-and-books — shared IIFE scope; order is defined in modules.json.
var N7 = function (A) {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'changeFaction',faction:A})){return;}

  const n = I[A],
    t = I[o.fac];
  if (!n || n.novice || A === o.fac || !hn(n, o.sex) || N("misc", "ldp") < 1) return;
  if (l.dg || l.tower) {
    k("Ra khỏi phó bản / tháp rồi đổi phái");
    return;
  }
  U("misc", "ldp", -1);
  const e = o.bkOk || (o.bkOk = {});
  for (const c in o.sk)
    (T[c] && T[c].book && (e[c] = 1),
      (o.skPts += m4(T[c]) ? 0 : o.sk[c]));
  ((o.sk = {}),
    (o.fac = A),
    (o.main = 0),
    (o.mainLock = !1),
    (o.slots = [0, 0, 0, 0]),
    (o.auraOff = {}),
    (l.sks = null),
    n.starter &&
      ((o.sk[n.starter] = 1), (o.skPts = Math.max(0, o.skPts - 1)), (o.main = n.starter)));
  const a = Kr(n),
    i = (c) => _A(a[0], a[1], c, 0);
  let r = null;
  for (let c = E(Math.round(o.lvl / 12) + 1, 1, 10); c >= 1 && ((r = i(c)), !(r && p0(r))); c--);
  (r && (o.inv.unshift(r), (R = !0), p0(r) && J1(r, !0)),
    (l.dirty = !0),
    D0(),
    typeof Bn == "function" && Bn(),
    o.autoPts === !0 && Pt(),
    tn(),
    (l.dirty = !0),
    D0(),
    (l.life = Math.min(l.life, l.P.life)),
    (l.mana = Math.min(l.mana, l.P.mana)),
    n0(!0),
    qA(),
    V(),
    $(),
    o0("levelup"),
    (l.banner = {
      t: 2.8,
      text: "Gia nhập " + n.n,
      sub: `Rời ${t ? t.n : ""} · ${o.skPts} điểm kỹ năng chờ phân phối`,
    }),
    C(
      `🏮 Lệnh Bài Đổi Phái: rời <b>${D(t ? t.n : "")}</b>, gia nhập <b style="color:${w0[n.series]}">${D(n.n)}</b> (hệ ${g0[n.series]}). Hoàn lại ${o.skPts} điểm kỹ năng.`,
    ));
};

var M4 = function () {
  const A = N("misc", "dgt"),
    n = o.sex ? 0 : 1,
    t = o.fac && o.fac in Zt,
    e = Object.entries(o.eq)
      .filter(([a, i]) => i && a !== "horse" && !u4(i, n))
      .map(([, a]) => a);
  J(
    `<h3>Đổi giới tính <small>${A} thẻ</small></h3>
    <p class="desc">${o.sex ? "Nữ" : "Nam"} → <b>${n ? "Nữ" : "Nam"}</b>. Giữ cấp, tiềm năng, võ công, trang bị.</p>
    ${t ? `<p class="reqbad">${D(I[o.fac].n)} chỉ nhận ${Zt[o.fac] ? "Nữ" : "Nam"}: cần đổi phái trước.</p>` : ""}
    ${e.length ? `<p class="small">Sẽ tháo vào hành trang (chỉ dành cho ${o.sex ? "Nữ" : "Nam"}): ${e.map((a) => D(a.n)).join(", ")}</p>` : ""}
    <div class="btnrow"><button class="btn red" id="dgtGo" ${A && !t ? "" : "disabled"}>Đổi sang ${n ? "Nữ" : "Nam"}</button><button class="btn" id="dgtNo">Đóng</button></div>`,
    () => {
      ((m("#dgtNo").onclick = () => iA()),
        (m("#dgtGo").onclick = () => {
          if (!(!(N("misc", "dgt") > 0) || t)) {
            if (o.inv.length + e.length > INV_MAX) {
              k("Hành trang không đủ chỗ cho đồ phải tháo");
              return;
            }
            (U("misc", "dgt", -1), (o.sex = n));
            for (const [a, i] of Object.entries(o.eq))
              i && e.includes(i) && (delete o.eq[a], o.inv.unshift(i));
            ((R = !0),
              (l.dirty = !0),
              D0(),
              typeof Bn == "function" && Bn(),
              (l.dirty = !0),
              D0(),
              qA(),
              $(),
              C(
                `🎭 Dùng Thẻ Đổi Giới Tính: nhân vật đổi sang <b>${n ? "Nữ" : "Nam"}</b>${e.length ? ` (tháo ${e.length} món)` : ""}.`,
              ),
              k(`Đã đổi sang ${n ? "Nữ" : "Nam"}`),
              o0("levelup"),
              n0(!0),
              V());
          }
        }));
    },
  );
};

var RA = function (A, n) {
  n = Math.max(0, n | 0);
  const t = J0.find((i) => i.k === A);
  if (!t || !o) return;
  const e = o.inv.filter((i) => i.ktc && i.ktc.k === A);
  let a = e.reduce((i, r) => i + r.ktc.c, 0);
  if (a > n)
    for (const i of e) {
      const r = Math.min(i.ktc.c, a - n);
      if (
        ((i.ktc.c -= r),
        (a -= r),
        i.ktc.c <= 0 ? o.inv.splice(o.inv.indexOf(i), 1) : (i.n = se(t, i.ktc.c)),
        a <= n)
      )
        break;
    }
  else a < n && B4(A, n - a);
  R = !0;
};

var ka = async function () {
  if (!(!o || !o.fac)) {
    if (!_t()) {
      (RA("hb", 0), RA("dhb", 0));
      return;
    }
    try {
      const A = await b.sb.rpc("hb_get");
      if (A.error) throw A.error;
      const n = A.data || {};
      (RA("hb", n.hb), RA("dhb", n.dhb), (oe.t = Date.now()), typeof V == "function" && V());
    } catch (A) {
      /hb_get|Could not find the function|schema cache/i.test(String(A && (A.message || A))) &&
        ((oe.off = !0), RA("hb", 0), RA("dhb", 0));
    }
  }
};

var L7 = async function (A) {
  if (!oe.busy) {
    if (!_t()) return k("Cần đăng nhập để mở Hồng Bao");
    oe.busy = !0;
    try {
      if (Date.now() - oe.t > 6e4 && (await ka(), !o.inv.some((a) => a.ktc && a.ktc.k === A))) {
        k("Hồng Bao dùng chung cả tài khoản — đã được mở ở nhân vật khác");
        return;
      }
      const t = (await e0((a) => a.rpc("hb_open", { k: A, cname: o.name || "" }))).data || {},
        e = t.amt | 0;
      (A === "hb"
        ? ((o.gold += e * 1e4),
          C(`🧧 Mở Hồng Bao: nhận <b class="gold">${F(e)} vạn lượng</b>`),
          k(`🧧 Hồng Bao: ${e} vạn lượng${e >= 1e3 ? " — TRÚNG LỚN!" : ""}`))
        : (typeof B2 == "function" && t.bal != null && B2(+t.bal),
          C(`🧧 Mở Đại Hồng Bao: nhận <b class="gold">${F(e)} Kim Nguyên Bảo</b>`),
          k(`🧧 Đại Hồng Bao: ${e} KNB${e >= 1e3 ? " — TRÚNG LỚN!" : ""}`)),
        RA(A, t.n),
        e >= 1e3 && typeof dr == "function" && setTimeout(() => dr(!0), 800),
        (l.dirty = !0),
        $(),
        typeof V == "function" && V());
    } catch (n) {
      const t = String(n.message || n);
      (k(
        /Không còn/.test(t)
          ? "Hồng Bao dùng chung cả tài khoản — số còn lại đã được mở ở nhân vật khác"
          : "Không mở được: " + t,
      ),
        ka());
    } finally {
      oe.busy = !1;
    }
  }
};

var H4 = 10;

var Xi = 8e4;

var $4 = 1e5;

var q7 = 1e4;

var j7 = 10;

var T4 = 5;

var C4 = () => {
  const s = Q(),
    A = Os(new Date());
  return ((!s.ldtBuy || s.ldtBuy.d !== A) && (s.ldtBuy = { d: A, n: 0 }), s.ldtBuy);
};

var Ji = () => {
  const s = Q(),
    A = Os(new Date());
  return ((!s.knbBuy || s.knbBuy.d !== A) && (s.knbBuy = { d: A, n: 0 }), s.knbBuy);
};

var z7 = 15;

var Q7 = 10;

var G7 = 10;

var K7 = { vlmt: 5, ttk: 15 };

var XA = (s) => z7 + (K7[s] || 15) * (typeof v0 == "function" ? v0() : 0);

var pn = (s) => (o.useN || (o.useN = {}))[s] | 0;

var Bt = () => o.lvl >= 80 || v0() > 0;

var O4 = (s) => Bt() && pn(s) < XA(s);

var R7 = () => (v0() > 0 ? 5 : E(Math.floor((Math.min(o.lvl, 89) - 80) / 2) + 1, 1, 5));

var xa = (s) => pn(s) + N("misc", s) < XA(s);

var ns = (s) => Math.max(0, pn(s) + N("misc", s) - XA(s));

var J0 = [
  {
    k: "knb",
    n: "Kim Nguyên Bảo",
    ic: "img/ep/knb.png",
    gold: $4,
    d: "Đổi ngân lượng lấy Kim Nguyên Bảo · tối đa 10.000 / ngày (mỗi tài khoản)",
    use: () => (Dr("buy", 1), Ji().n++, "Nhận 1 Kim Nguyên Bảo"),
  },
  {
    k: "tt",
    n: "Tiên Thảo Lộ",
    ic: "img/ep/tt.png",
    knb: 2,
    d: "+50% kinh nghiệm trong 60 phút (cộng dồn thời gian)",
    use: () => (nt("tt", 0.5, 60), "Tiên Thảo Lộ: +50% kinh nghiệm 60 phút"),
  },
  {
    k: "tsbl",
    n: "Thiên Sơn Bảo Lộ",
    ic: "img/ep/tsbl.png",
    knb: 1,
    d: "+10 may mắn trong 60 phút (cộng dồn với Quế Hoa Tửu, cộng dồn thời gian)",
    use: () => (nt("luck2", 10, 60), (l.dirty = !0), "Thiên Sơn Bảo Lộ: +10 may mắn 60 phút"),
  },
  {
    k: "bch",
    n: "Bạch Câu Hoàn",
    ic: "img/ep/bch.png",
    knb: 3,
    d: "Ủy thác rời mạng: 8 giờ rời mạng kế tiếp nhận 100% tốc độ treo máy (thay vì 70%) · cộng dồn giờ",
    use: () => (
      (o.bch = (o.bch || 0) + 8 * 3600),
      `Bạch Câu Hoàn: rời mạng 100% tốc độ, còn ${Math.round(o.bch / 360) / 10} giờ`
    ),
  },
  {
    k: "ttsp",
    n: "Tiên Thảo Lộ Đặc Biệt",
    ic: "img/ep/ttsp.png",
    knb: 0,
    hide: 1,
    d: "Nhân đôi kinh nghiệm (+100%) trong 8 giờ (cộng dồn thời gian; cộng dồn với Tiên Thảo Lộ: dùng cả hai = +150%)",
    use: () => (nt("tt2", 1, 480), "Tiên Thảo Lộ Đặc Biệt: +100% kinh nghiệm 8 giờ"),
  },
  {
    k: "hb",
    n: "Hồng Bao",
    ic: "img/ep/hb.png",
    knb: 0,
    hide: 1,
    srv: 1,
    d: "Mở nhận ngẫu nhiên 1 – 1000 vạn lượng (máy chủ quay số)",
  },
  {
    k: "dhb",
    n: "Đại Hồng Bao",
    ic: "img/ep/dhb.png",
    knb: 0,
    hide: 1,
    srv: 1,
    d: "Mở nhận ngẫu nhiên 100 – 1000 Kim Nguyên Bảo (máy chủ quay số)",
  },
  {
    k: "qht",
    n: "Quế Hoa Tửu",
    ic: "img/ep/qht.png",
    knb: 2,
    hide: 1,
    d: "+20 may mắn trong 60 phút: đồ rơi nhiều dòng / dòng tốt hơn, +10% tỉ lệ rơi đồ",
    use: () => (nt("luck", 20, 60), (l.dirty = !0), "Quế Hoa Tửu: +20 may mắn 60 phút"),
  },
  {
    k: "rht",
    n: "Rương Huyền Tinh",
    ic: "img/ep/box2.png",
    gold: 3e4,
    vio: 1,
    d: "2–3 Huyền Tinh Khoáng Thạch, mỗi viên cấp ngẫu nhiên 1–10 (mỗi cấp 10%)",
    use: () => {
      const s = N0(2, 3);
      return `Rương Huyền Tinh: ${uh(s)}`;
    },
  },
  {
    k: "rda",
    n: "Rương Đá Thuộc Tính",
    ic: "img/ep/box3.png",
    gold: 5e4,
    vio: 1,
    d: "1–2 đá thuộc tính (hợp hệ / loại đồ đang mặc)",
    use: () => {
      const s = [Le(o.lvl)];
      return (Math.random() < 0.3 && s.push(Le(o.lvl)), "Rương Đá Thuộc Tính: " + s.join(", "));
    },
  },
  {
    k: "mt90",
    n: "Bí Kíp 90",
    ic: "img/ep/mt90.png",
    knb: 5,
    d: "Lĩnh ngộ 1 võ công 90 từ cấp 80 (cấp 1, sau đó luyện)",
    use: () => (U("misc", "bk90", 1), "Nhận 1 Bí Kíp 90"),
  },
  {
    k: "mt120",
    n: "Bí Kíp 120",
    ic: "img/ep/mt90.png",
    knb: 5000, kx: 1,
    d: "Lĩnh ngộ 1 chiêu hỗ trợ cấp 120, sau đó tăng bằng điểm kỹ năng",
    use: () => (U("misc", "bk120", 1), "Nhận 1 Bí Kíp 120"),
  },
  {
    k: "mt150",
    n: "Bí Kíp 150",
    ic: "img/ep/mt90.png",
    knb: 5000, kx: 1,
    d: "Lĩnh ngộ 1 chiêu cấp 150 ở cấp 1; tăng cấp qua rèn luyện hoặc Đại Thành Bí Kíp",
    use: () => (U("misc", "bk150", 1), "Nhận 1 Bí Kíp 150"),
  },
  {
    k: "vlmt",
    n: "Võ Lâm Mật Tịch",
    ic: "img/ep/mt90.png",
    knb: Q7,
    d: "JX1: từ cấp 80, mỗi cuốn +1 điểm kỹ năng · mỗi nhân vật tối đa 15 cuốn, mỗi lần chuyển sinh +5",
    use: () => (
      U("misc", "vlmt", 1),
      (R = !0),
      "Nhận 1 Võ Lâm Mật Tịch (vào Hành trang, bấm Dùng)"
    ),
  },
  {
    k: "ttk",
    n: "Tẩy Tủy Kinh",
    ic: "img/ep/dtbk.png",
    knb: G7,
    d: "JX1: từ cấp 80, mỗi cuốn +1 → 5 điểm tiềm năng (cấp 80 +1, mỗi 2 cấp +1, cấp 88 trở lên +5) · mỗi nhân vật tối đa 15 cuốn, mỗi lần chuyển sinh +15",
    use: () => (U("misc", "ttk", 1), (R = !0), "Nhận 1 Tẩy Tủy Kinh (vào Hành trang, bấm Dùng)"),
  },
  {
    k: "ldt",
    n: "Lệnh Bài Dã Tẩu",
    ic: "img/ep/ldt.png",
    knb: 5,
    d: "Tối đa 5 / ngày · +20 lượt nhiệm vụ Dã Tẩu trong ngày (dùng ở thẻ Nhiệm vụ › Dã Tẩu, tại đây, hoặc tự dùng khi hết lượt)",
    use: () => (U("misc", "ldt", 1), C4().n++, "Nhận 1 Lệnh Bài Dã Tẩu"),
  },
  {
    k: "ldp",
    n: "Lệnh Bài Đổi Phái",
    ic: "img/ep/ldp.png",
    knb: 20,
    d: "Đổi sang môn phái khác (kể cả khác hệ). Giữ cấp, tiềm năng, trang bị; hoàn lại toàn bộ điểm kỹ năng",
    use: () => (U("misc", "ldp", 1), "Nhận 1 Lệnh Bài Đổi Phái (dùng ở thẻ Nhân vật hoặc tại đây)"),
  },
  {
    k: "dgt",
    n: "Thẻ Đổi Giới Tính",
    ic: "img/ep/ldp.png",
    knb: j7,
    d: "Đổi Nam ↔ Nữ: đổi ngoại hình; đồ chỉ dành cho giới cũ tự tháo vào hành trang. Giữ cấp, điểm, võ công. Thiếu Lâm / Nga My / Thúy Yên không đổi được",
    use: () => (U("misc", "dgt", 1), "Nhận 1 Thẻ Đổi Giới Tính"),
  },
  {
    k: "rngua",
    n: "Rương Ngựa",
    ic: "img/ep/box2.png",
    knb: 20,
    kx: 1,
    d: "Cất vào túi, bấm Dùng để mở 1 con ngựa (nguồn ngựa duy nhất) · Thường 56% · Tốt 31,5% · Quý 6% · Thần 3% · Danh mã 2% · Bảo mã 1% · Chí tôn 0,5% (Quý trở lên tự khóa; ngựa cấp yêu cầu cao cần Trùng Sinh). Còn rơi từ trùm, phó bản, mốc Dã Tẩu",
    use: () => (U("misc", "rngua", 1), "Nhận 1 Rương Ngựa (bấm Dùng để mở)"),
  },
  {
    k: "dtbk",
    n: "Đại Thành Bí Kíp",
    ic: "img/ep/dtbk.png",
    knb: 25,
    d: "Luyện tối đa 1 võ công đã học: cấp 90 lên 20, cấp 150 lên 25 (dùng ở thẻ Võ công)",
    use: () => (U("misc", "dtbk", 1), "Nhận 1 Đại Thành Bí Kíp"),
  },
];

for (const s of J0) s.knb && !s.kx && (s.knb *= H4);
