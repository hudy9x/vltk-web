// online/auth-chat-and-market — shared IIFE scope; order is defined in modules.json.
var ea = function () {
  if (typeof b > "u" || !b.user) return 1;
  if (b.cheatU !== b.user.id) {
    b.cheatU = b.user.id;
    try {
      b.cheat = localStorage.getItem(Sl) === b.user.id;
    } catch {
      b.cheat = !1;
    }
  }
  return b.ban ? 0 : b.cheat ? 0.01 : 1;
};

var Dx = async function () {
  if (b.user && b.banU !== b.user.id) {
    let e = !1;
    try {
      const a = await e0((i) => i.rpc("jx_hello", { dev: px(), mark: Lg(!1) }));
      e = !!(a && a.data && a.data.ban);
    } catch {}
    try {
      const a = await e0((i) => i.rpc("jx_am_banned"));
      ((b.banU = b.user.id), (b.ban = !!(a && a.data) || e));
    } catch {
      e && ((b.banU = b.user.id), (b.ban = !0));
    }
    b.ban && (Lg(!0), Px());
  }
  if (!b.user || !(l.power > 20)) return;
  ea();
  const A = await e0((e) =>
      e.from("chars").select("power").eq("owner", b.user.id).eq("slot", m0).maybeSingle(),
    ),
    n = A && A.data;
  if (!n || n.power == null) return;
  const t = (n.power | 0) === 1;
  if (t !== !!b.cheat) {
    ((b.cheat = t), (b.cheatU = b.user.id));
    try {
      t ? localStorage.setItem(Sl, b.user.id) : localStorage.removeItem(Sl);
    } catch {}
    t &&
      typeof C == "function" &&
      C('<span class="bad">⚠ Tài khoản bị ghi nhận dùng console: sát thương giảm 99%.</span>');
  }
};

var Px = function () {
  if (typeof o > "u" || !o || !b.user) return;
  const A = "jxBanWiped_" + b.user.id + "_" + m0;
  let n = !1;
  try {
    n = localStorage.getItem(A) === "1" && o.lvl <= 1 && !(o.gold > 0) && !(o.inv && o.inv.length);
  } catch {}
  if (!n) {
    const t = o.name,
      e = o.sex | 0,
      a = o.netOwner,
      i = (I[o.fac] && I[o.fac].series) | 0;
    ((o = I3()),
      typeof V8 == "function" ? V8(t, e, i) : ((o.name = t), (o.sex = e), (o.fac = "vo" + i)),
      a && (o.netOwner = a));
    try {
      (localStorage.removeItem(p1), localStorage.setItem(A, "1"));
    } catch {}
    ((l.enemies = []),
      (l.dirty = !0),
      typeof D0 == "function" && D0(),
      typeof $ == "function" && $(),
      typeof V == "function" && V());
  }
  ((l.power = 0),
    typeof C == "function" &&
      C(
        '<span class="bad">⛔ Tài khoản bị khóa vì dùng console: đồ, tiền, cấp đã bị xóa · lực tay 0 · không thể treo chợ / gửi thư.</span>',
      ));
};

var ii = function (A) {
  try {
    const n = JSON.parse(A);
    if (n && n.v === 2 && typeof n.d == "string") return { d: n.d, k: n.k };
  } catch {}
  return { d: A, k: null };
};

var vx = async function () {
  if (!o || !o.cloudAt || !b.user) return !0;
  const A = await e0((e) => e.from("saves").select("updated").eq("slot", m0).maybeSingle()),
    n = A && A.data;
  if (!n || !n.updated) return !0;
  const t = Date.parse(n.updated);
  return t > o.cloudAt + 5e3 ? (bx(t), !1) : !0;
};

var bx = function (A) {
  if (!(typeof i0 > "u")) {
    i0.cloudU = A;
    try {
      i0.cloudT = new Date(A).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      i0.cloudT = "";
    }
    Di("cloud");
  }
};

var U0 = async function () {
  if (!b.user) throw new Error("Chưa đăng nhập");
  if (!o || !o.fac) throw new Error("Chưa có nhân vật");
  if ((await Nl(), y2(o))) throw new Error("Nhân vật thuộc tài khoản khác");
  const A = new Date(),
    n = o.cloudAt;
  ((o.cloudAt = A.getTime()), (o.netOwner = b.user.id));
  const t = {
    owner: b.user.id,
    slot: m0,
    name: o.name || "",
    lvl: o.lvl | 0,
    fac: o.fac,
    data: Xg(bn(o), Jg()),
    updated: A.toISOString(),
  };
  jA.on && (t.sid = jA.id);
  try {
    await e0((e) => e.from("saves").upsert(t));
  } catch (e) {
    const a = String(e && (e.message || e));
    if (t.sid && /column .*sid|sid.*does not exist|schema cache/i.test(a)) {
      ((jA.on = !1), delete t.sid);
      try {
        await e0((i) => i.from("saves").upsert(t));
      } catch (i) {
        throw ((o.cloudAt = n), i);
      }
    } else throw ((o.cloudAt = n), /JX_SESS/.test(a) && Vg(), e);
  }
  ((b.upSig = El()), typeof Dl < "u" && (Dl[m0] = A.getTime()), $(), (b.lastUp = Date.now()));
};

var yx = async function (A, n) {
  const t = new Date();
  n.cloudAt = t.getTime();
  try {
    localStorage.setItem(h1(A), bn(n));
  } catch {}
  await e0((e) =>
    e
      .from("saves")
      .upsert({
        owner: b.user.id,
        slot: A,
        name: n.name || "",
        lvl: n.lvl | 0,
        fac: n.fac,
        data: Xg(bn(n), Jg()),
        updated: t.toISOString(),
      }),
  );
};

var Ml = function (A) {
  if (!A || (typeof l0 < "u" && l0.on)) return !1;
  try {
    const n = t1(A);
    if (!n.ok) return !1;
    const t = rn().st,
      e = +n.state.at || 0,
      a = +t.at || 0;
    if (e || a ? e <= a : (n.state.rev | 0) <= (t.rev | 0)) return !1;
    const i = localStorage.getItem(p1);
    return (i && localStorage.setItem(p1 + "_bak", i), localStorage.setItem(p1, A), !0);
  } catch {
    return !1;
  }
};

var kx = function () {
  try {
    const A = localStorage.getItem("jxidle_lastuser");
    if (A && A !== b.user.id) {
      const n = localStorage.getItem(p1);
      (n && localStorage.setItem(p1 + "_" + A, n), localStorage.removeItem(p1));
    }
    localStorage.setItem("jxidle_lastuser", b.user.id);
  } catch {}
};

var qg = async function () {
  if (!b.user) return !1;
  kx();
  const A = await e0((a) => a.from("saves").select("slot,updated").order("slot")),
    n = A.data || [];
  let t = !1;
  for (let a = 0; a < V1; a++) {
    const i = n.find((g) => g.slot === a),
      r = i ? Date.parse(i.updated) : 0;
    if (a === m0 && o && o.fac) continue;
    const c = Yx(a);
    if (!i) {
      if (c && c.netOwner === b.user.id) await yx(a, c);
      else if (c)
        try {
          const g = h1(a);
          (localStorage.setItem(g + "_bak", localStorage.getItem(g)),
            localStorage.removeItem(g),
            (t = !0));
        } catch {}
      continue;
    }
    if (!Ll(c, r) && !y2(c)) continue;
    const d = await e0((g) => g.from("saves").select("data").eq("slot", a).single()),
      f = ii(d.data.data),
      h = Il(f.d);
    if (((h.cloudAt = r), (h.netOwner = b.user.id), !(c && !y2(c) && mr(h) < mr(c))))
      try {
        const g = h1(a),
          u = localStorage.getItem(g);
        (u && localStorage.setItem(g + "_bak", u), localStorage.setItem(g, bn(h)), (t = !0));
      } catch {}
  }
  if (typeof ml == "function")
    try {
      await ml();
    } catch {}
  const e =
    typeof l0 < "u" && l0.on
      ? null
      : n.slice().sort((a, i) => Date.parse(i.updated) - Date.parse(a.updated))[0];
  if (e) {
    const a = await e0((i) => i.from("saves").select("data").eq("slot", e.slot).single());
    Ml(ii(a.data.data).k) && (t = !0);
  }
  return t;
};

var jg = async function () {
  if (!b.user || !o || !o.fac) return;
  const A = await e0((e) =>
      e.from("saves").select("slot,name,lvl,fac,updated").eq("slot", m0).maybeSingle(),
    ),
    n = A.data;
  if (!n) {
    if (o.netOwner === b.user.id) {
      await U0();
      return;
    }
    HA = !0;
    try {
      const e = h1(m0);
      (localStorage.setItem(e + "_bak", localStorage.getItem(e)),
        localStorage.removeItem(e),
        localStorage.setItem(f1, "menu"));
    } catch {}
    (k("Nhân vật chỉ có trên máy này, không có trên đám mây: không dùng được"),
      setTimeout(() => location.reload(), 1500));
    return;
  }
  const t = Date.parse(n.updated);
  if (o.netOwner && !y2(o) && Ll(o, t)) {
    let e = !1;
    try {
      const a = await e0((i) => i.from("saves").select("data").eq("slot", m0).single());
      e = mr(Il(ii(a.data.data).d)) < mr(o);
    } catch {}
    if (e) {
      o.cloudAt = Math.max(o.cloudAt || 0, t);
      try {
        await U0();
      } catch {}
      return;
    }
  }
  !o.netOwner || y2(o) || Ll(o, t)
    ? (k("Đang tải nhân vật từ đám mây…"), await Hl(m0, t))
    : (o.last || 0) > t + 5e3
      ? await U0()
      : await U0().catch(() => {});
};

var Hl = async function (A, n) {
  const t = await e0((i) => i.from("saves").select("data,updated").eq("slot", A).single()),
    e = ii(t.data.data),
    a = Il(e.d);
  ((a.cloudAt = n || Date.parse(t.data.updated)),
    (a.netOwner = b.user.id),
    Ml(e.k),
    Xd(A, a),
    location.reload());
};

var xx = async function () {
  return (
    (await e0((n) => n.from("saves").select("slot,name,lvl,fac,updated").order("slot"))).data || []
  );
};

var Bx = async function (A) {
  await Hl(A);
};

var $l = function (A) {
  if (
    ((window.NET_GATE = !0),
    document.body.classList.add("ngate-on"),
    !document.getElementById("ngateCss"))
  ) {
    const e = document.createElement("style");
    e.id = "ngateCss";
    const a = Math.random() < 0.5 ? "bg20a" : "bg20b";
    ((e.textContent = `body.ngate-on #modal{position:fixed!important;inset:0;z-index:9000!important;background:radial-gradient(ellipse at 50% 55%,#0000 35%,#000b 100%),url(img/u2/login/${a}.jpg) center/cover #0b1418!important;display:flex!important;flex-direction:column;align-items:center;justify-content:center}
body.ngate-on #modal.hidden{display:none!important}body.ngate-on #modal .mx{display:none!important}
body.ngate-on #modal::before{content:'VÕ LÂM IDLE';font-size:clamp(28px,6vw,46px);letter-spacing:5px;color:#f3d27a;text-shadow:0 0 16px #c8902a,0 0 4px #000,0 3px 0 #000;margin-bottom:6px;font-weight:bold;font-family:serif}
body.ngate-on #modal .mbox{max-width:none!important;width:min(440px,94vw)!important;background:none!important;border:0!important;outline:0!important;box-shadow:none!important;padding:0!important;overflow:visible!important;zoom:1}
body.ngate-on #modal .mbox::before,body.ngate-on #modal .mbox::after{display:none!important}
body.ngate-on #csel{display:none}
.ng2{container-type:inline-size;position:relative;width:100%;aspect-ratio:308/197;background:url(img/u2/login/panel.png) 0 0/100% 100% no-repeat;image-rendering:auto;filter:drop-shadow(0 8px 24px #000c)}
.ng2>*{position:absolute;box-sizing:border-box}
.ng2 .t{display:flex;align-items:center;justify-content:center;color:#f2ecd0;font-weight:bold;font-size:4.6cqw;text-shadow:0 0 3px #000,0 1px 1px #000;white-space:nowrap}
.ng2 .l{display:flex;align-items:center;justify-content:flex-end;padding-right:1.2cqw;color:#fff;font-weight:bold;font-size:3.3cqw;text-shadow:-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000;white-space:nowrap}
.ng2 input{background:transparent;border:0;outline:0;color:#f6e7b8;font:bold 4.2cqw/1 inherit;font-family:inherit;padding:0 1.6cqw;margin:0;border-radius:0}
.ng2 input:focus{box-shadow:inset 0 0 0 1px #e3ffd4}
.ng2 .cb{cursor:pointer;background:transparent!important;border:0!important;padding:0!important;box-shadow:none!important;min-height:0!important}.ng2 .cb.on{background:url(img/u2/login/tick.png) 20% 30%/150% auto no-repeat!important}
.ng2 .cl{display:flex;align-items:center;color:#fff;font-weight:bold;font-size:3.6cqw;text-shadow:-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000;cursor:pointer;white-space:nowrap;padding-left:.8cqw;user-select:none}
.ng2 .b{display:flex;align-items:center;justify-content:center;border:0!important;border-radius:0!important;box-shadow:none!important;min-height:0!important;background:#000;color:#ffe23a;font-weight:bold;font-size:4.6cqw;text-shadow:0 1px 0 #000;cursor:pointer;padding:0}
.ng2 .b:hover{background:radial-gradient(ellipse 60% 70% at 50% 50%,#3fb2e2 0%,#1a6f95 45%,#06222e 80%,#000 100%);color:#fff7c0}
.ng2 .b:active,.ng2 .b[disabled]{background:radial-gradient(ellipse 60% 70% at 50% 50%,#8a8a8a 0%,#3c3c3c 55%,#000 100%);color:#d8d8d8}
.ng2x{margin-top:10px;text-align:center;color:#f3ead2;font-size:12px;text-shadow:0 1px 2px #000,0 0 4px #000}.ng2x .reqbad{margin:6px 0}`),
      document.head.appendChild(e));
  }
  const n = A
      ? `<p class="reqbad">${D(A)}</p><div class="btnrow" style="justify-content:center"><button class="btn sm" id="ngRetry">Thử kết nối lại</button></div>`
      : "",
    t = Wg();
  J(
    `<div class="ng2">
      <div class="t" style="${cn(0, 5, 308, 22)}">Xác nhận tên tài khoản</div>
      <label class="l" for="ngU" style="${cn(6, 53, 68, 24)}">Tài khoản:</label><input id="ngU" style="${cn(74, 55, 210, 20)}" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" value="${D(t)}">
      <label class="l" for="ngP" style="${cn(6, 91, 68, 24)}">Mật mã:</label><input id="ngP" style="${cn(74, 93, 210, 20)}" type="password" maxlength="64" autocomplete="current-password">
      <button type="button" class="cb" id="ngShow" style="${cn(73, 123, 18, 20)}" aria-label="Hiện mật mã"></button><span class="cl" data-cb="ngShow" style="${cn(91, 123, 80, 20)}">Hiện mật mã</span>
      <button type="button" class="cb${t ? " on" : ""}" id="ngRem" style="${cn(173, 123, 18, 20)}" aria-label="Nhớ tài khoản"></button><span class="cl" data-cb="ngRem" style="${cn(191, 123, 110, 20)}">Nhớ tài khoản</span>
      <button type="button" class="b" id="ngIn" style="${cn(7, 167, 144, 23)}">Đăng nhập</button>
      <button type="button" class="b" id="ngUp" style="${cn(157, 167, 144, 23)}">Đăng ký</button>
    </div>
    <div class="ng2x">Một tài khoản dùng cho 3 nhân vật · tên 3–16 ký tự không dấu · mật mã ít nhất 6 ký tự.<br>Nhớ mật mã — hiện chưa có cách lấy lại.${n}</div>`,
    () => {
      const e = (r) =>
        v1(
          m(r === "up" ? "#ngUp" : "#ngIn"),
          async () => (
            await Ng(r, m("#ngU").value, m("#ngP").value),
            Wg(
              m("#ngRem").classList.contains("on")
                ? String(m("#ngU").value || "")
                    .trim()
                    .toLowerCase()
                : null,
            ),
            _x()
          ),
        );
      ((m("#ngIn").onclick = () => e("in")),
        (m("#ngUp").onclick = () => e("up")),
        (m("#ngP").onkeydown = (r) => {
          r.key === "Enter" && e("in");
        }),
        (m("#ngU").onkeydown = (r) => {
          r.key === "Enter" && m("#ngP").focus();
        }));
      const a = (r) => {
        const c = m("#" + r);
        (c.classList.toggle("on"),
          r === "ngShow" && (m("#ngP").type = c.classList.contains("on") ? "text" : "password"));
      };
      ((m("#ngShow").onclick = () => a("ngShow")),
        (m("#ngRem").onclick = () => a("ngRem")),
        document
          .querySelectorAll(".ng2 [data-cb]")
          .forEach((r) => (r.onclick = () => a(r.dataset.cb))),
        setTimeout(() => {
          try {
            m(t ? "#ngP" : "#ngU").focus();
          } catch {}
        }, 50));
      const i = m("#ngRetry");
      i && (i.onclick = () => location.reload());
    },
    !0,
  );
};

var _x = async function () {
  ((window.NET_GATE = !1), Cl(), document.body.classList.remove("ngate-on"));
  const A = await qg();
  if (!o || !o.fac) {
    const n = [...Array(V1).keys()].filter((t) => ms(t));
    if (n.length) {
      try {
        localStorage.setItem(f1, n.length > 1 ? "menu" : String(n[0]));
      } catch {}
      location.reload();
      return;
    }
    (n0(!0), Yf());
    return;
  }
  (n0(!0), k("Đã đăng nhập: " + ri()), D1(!0).catch(() => {}), jg().catch(() => {}), Yt());
};

var Yt = async function () {
  if (!b.user) {
    ((b.mailN = 0), oi());
    return;
  }
  if (!b2()) {
    try {
      const A = await e0((n) => n.from("mail").select("id", { count: "exact", head: !0 }));
      b.mailN = A.count || 0;
    } catch {}
    oi();
  }
};

var Mx = function (A) {
  if (!A || typeof A != "object" || !Array.isArray(A.base) || !Array.isArray(A.mag)) return null;
  const n = JSON.parse(JSON.stringify(A));
  return (
    (n.uid = o.uid++),
    delete n.lock,
    n.d === 10 && delete n.enh,
    typeof P8 == "function" && P8(n),
    typeof ft == "function" && ft(n),
    n
  );
};

var zg = async function (A, n) {
  if (di.includes("mail")) throw new Error("Hộp thư đang tạm đóng");
  if (A.item && o.inv.length >= INV_MAX) throw new Error("Hành trang đầy");
  await Nl();
  const t = await e0((i) => i.rpc("claim_mail", { mid: A.id })),
    e = t.data || A,
    a = [];
  if (e.item) {
    const i = Mx(e.item);
    if ((i && (i.lock = !0), i && typeof VA == "function" && VA(i)))
      a.push(`${i.n} (đồ đã xóa khỏi game)`);
    else if (i && typeof ZA == "function" && ZA(i)) {
      const r = x0(i);
      ((o.gold += r), a.push(`${i.n} → ${q(r)} lượng (đồ đã bỏ khỏi game)`));
    } else i && (o.inv.push(i), a.push(i.n), (R = !0));
  }
  return (
    e.gold > 0 && ((o.gold += +e.gold), a.push(q(+e.gold) + " lượng")),
    e.knb > 0 && ((o.knb = (o.knb | 0) + (e.knb | 0)), a.push((e.knb | 0) + " KNB")),
    $(),
    n || C(`📨 Nhận thư từ <b>${D(e.from_name)}</b>: ${D(a.join(", "))}`),
    await U0().catch(() => {}),
    a
  );
};

var Hx = async function (A, n, t, e) {
  const a = Array.isArray(n) ? n.filter(Boolean) : n ? [n] : [];
  if (((n = a[0] || null), b.ban)) throw new Error("Tài khoản bị khóa giao dịch (dùng console)");
  if (di.includes("mail")) throw new Error("Hộp thư đang tạm đóng");
  if (((A = String(A || "").trim()), (t = Math.max(0, Math.floor(+t || 0))), ln() && t > 0)) {
    if (!A) throw new Error("Nhập tên người nhận");
    if (t > (o.knb | 0)) throw new Error("Không đủ KNB");
    await b1().catch(() => {});
    const d = await e0((f) =>
      f.rpc("knb_gift", { cname: o.name, to_name: A, k: t, note: String(e || "").slice(0, 100) }),
    );
    if ((B2(+d.data.bal), $(), C(`📨 Gửi <b>${D(A)}</b>: ${F(t)} KNB`), !a.length)) return;
    t = 0;
  }
  if (!A) throw new Error("Nhập tên người nhận");
  if (!a.length && !t) throw new Error("Chọn món đồ hoặc nhập số lượng");
  if (a.length > x2) throw new Error(`Mỗi lần gửi tối đa ${x2} món`);
  for (const d of a) {
    if (d.ktc && typeof G1 < "u" && !G1.includes(d.ktc.k))
      throw new Error("Thư chỉ gửi được Võ Lâm Mật Tịch, Tẩy Tủy Kinh, Rương Ngựa của Kỳ Trân Các");
    if (d.lock || !o.inv.includes(d))
      throw new Error(`${d.n}: không gửi được (đang khóa / đang mặc)`);
  }
  if (t > o.gold) throw new Error("Không đủ ngân lượng");
  (await Sn(), await U0());
  const i = String(e || "").slice(0, 92),
    r = a.length,
    c = (r ? a : [null]).map((d, f) => ({
      to_name: A,
      from_name: o.name,
      from_owner: b.user.id,
      kind: "gift",
      item: d,
      gold: f === 0 ? t : 0,
      note: r > 1 ? `${i}${i ? " " : ""}(${f + 1}/${r})` : i,
    }));
  await e0((d) => d.from("mail").insert(c));
  {
    for (const d of a) {
      const f = o.inv.indexOf(d);
      f >= 0 && o.inv.splice(f, 1);
    }
    ((o.gold -= t), (R = !0), $());
  }
  (C(
    `📨 Gửi <b>${D(A)}</b>: ${D(
      a
        .map((d) => d.n)
        .concat(t ? [q(t) + " lượng"] : [])
        .join(", "),
    )}`,
  ),
    U0().catch(() => {}));
};

var $x = async function (A) {
  if (
    ((A = String(A || "")
      .trim()
      .toUpperCase()),
    !A)
  )
    throw new Error("Nhập giftcode");
  if (!/^[A-Z0-9_-]{3,32}$/.test(A)) throw new Error("Giftcode không hợp lệ");
  if (!b.user) throw new Error("Cần đăng nhập tài khoản để nhập giftcode");
  (await Nl(), await D1().catch(() => {}));
  let n;
  try {
    n = await e0((i) => i.rpc("jx_redeem2", { c: A, cname: o.name }));
  } catch (i) {
    if (!/jx_redeem2|function|schema cache/i.test(String(i && i.message))) throw i;
    n = await e0((r) => r.rpc("jx_redeem", { c: A, cname: o.name }));
  }
  const t = (n && n.data) || {};
  if (t.err) throw new Error(t.err);
  const e = t.reward || {},
    a = [];
  if (
    (+e.knb > 0 && a.push(`${+e.knb} KNB`),
    +e.gold > 0 && a.push(q(+e.gold) + " lượng"),
    e.buff && typeof e.buff == "object" && typeof nt == "function")
  ) {
    const i = [];
    for (const r of ["xp", "drop"]) {
      const c = e.buff[r];
      if (!Array.isArray(c)) continue;
      const d = Math.min(10, +c[0] || 0),
        f = Math.min(1440, +c[1] || 0);
      d > 0 && f > 0 && (nt(r, d, f), i.push(fc(r, d, f)));
    }
    i.length &&
      ((l.dirty = !0),
      $(),
      C(
        `🎟 Giftcode <b>${D(A)}</b>: <b style="color:#7fe08a">${i.join(", ")}</b> (nhân vật ${D(o.name)})`,
      ));
  }
  return (
    +e.xpbuff > 0 &&
      ((o.tanthuXp = Math.max(+o.tanthuXp || 0, +e.xpbuff)),
      $(),
      C(
        `🌱 Giftcode <b>${D(A)}</b>: <b style="color:#7fe08a">+${Math.round(+e.xpbuff * 100)}% kinh nghiệm</b> đến khi chuyển sinh lần 1 (nhân vật ${D(o.name)})`,
      )),
    C(`🎟 Giftcode <b>${D(A)}</b>: quà (${a.join(", ")}) đã gửi vào Thư`),
    Yt(),
    { note: t.note || "", out: a }
  );
};

var Tx = async function () {
  let A = -1;
  try {
    if (typeof h0 == "function" && h0() && !window.MAINT) {
      const n = await e0((t) => t.rpc("jx_gift_open"));
      A = Number.isFinite(+n.data) ? +n.data : -1;
    }
  } catch {
    A = -1;
  }
  if (A === 0) {
    J(
      '<h3>🎟 Giftcode</h3><div class="card" style="text-align:center;padding:18px 10px"><div style="font-size:30px">🎁</div><p>Hiện tại server <b>chưa có giftcode nào</b>.</p><p class="small dim">Theo dõi kênh Thế giới / thông báo để nhận giftcode khi có sự kiện.</p></div>',
    );
    return;
  }
  J(
    `<h3>🎟 Nhập Giftcode</h3>
    <p class="small dim">Mỗi tài khoản nhập mỗi code 1 lần. Quà gửi qua <b>Thư</b> từ Hệ Thống cho nhân vật đang chơi (<b>${D(o.name || "")}</b>).</p>
    <div class="btnrow"><input id="gcIn" maxlength="32" placeholder="VD: VOLAM2026" style="flex:1;text-transform:uppercase" autocomplete="off"><button class="btn" id="gcOk">Nhận quà</button></div>
    <div id="gcMsg" class="small" style="min-height:1.5em;margin-top:6px"></div>`,
    () => {
      const n = m("#gcIn"),
        t = m("#gcOk"),
        e = m("#gcMsg");
      n.focus();
      const a = async () => {
        if (!t.disabled) {
          ((t.disabled = !0), (e.innerHTML = '<span class="dim">Đang kiểm tra…</span>'));
          try {
            const i = await $x(n.value);
            (typeof ct < "u" && (ct.mail = null),
              (e.innerHTML = `<span class="cp">✔ Quà (${i.out.join(", ") || "—"}) đã gửi vào Thư.</span> <button class="btn sm" id="gcMail">Mở Thư</button>`),
              o0("levelup"),
              (n.value = ""));
            const r = m("#gcMail");
            r && (r.onclick = () => Y0("mail"));
          } catch (i) {
            ((e.innerHTML = `<span class="cn">✖ ${D(i.message || String(i))}</span>`), o0("use"));
          }
          t.disabled = !1;
        }
      };
      ((t.onclick = a),
        (n.onkeydown = (i) => {
          i.key === "Enter" && a();
        }));
    },
  );
};

var Cx = async function (A, n, t) {
  if (b.ban) throw new Error("Tài khoản bị khóa giao dịch (dùng console)");
  if (di.includes("mkt")) throw new Error("Chợ đang tạm đóng");
  if (((n = Math.floor(+n || 0)), n < 1)) throw new Error("Nhập giá bán");
  if (!A || A.lock || !o.inv.includes(A))
    throw new Error("Món không bán được (đang khóa / đang mặc)");
  if (A.ktc && typeof G1 < "u" && !G1.includes(A.ktc.k))
    throw new Error("Chợ chỉ nhận Võ Lâm Mật Tịch, Tẩy Tủy Kinh, Rương Ngựa của Kỳ Trân Các");
  (await Sn(), await U0(), ln() && (t = "knb"));
  const e = () =>
    e0((a) =>
      a
        .from("market")
        .insert(
          Object.assign(
            {
              seller: b.user.id,
              seller_name: o.name,
              item: A,
              iname: String(A.n).slice(0, 80),
              price: n,
            },
            t === "knb" ? { cur: "knb" } : {},
          ),
        ),
    );
  try {
    try {
      await e();
    } catch (a) {
      if (!/row-level security/i.test(String(a && a.message))) throw a;
      let i = null;
      try {
        const r = await b.sb.auth.refreshSession();
        i = r && r.data && r.data.session ? r.data.session.user.id : null;
      } catch {}
      if (!i)
        throw new Error("Phiên đăng nhập đã hết hạn — đăng xuất rồi đăng nhập lại để bày bán");
      if (i !== b.user.id)
        throw new Error("Trình duyệt đang đăng nhập tài khoản khác — tải lại trang (F5)");
      ((b.lastChar = 0), await D1());
      try {
        await e();
      } catch (r) {
        throw new Error(
          `Máy chủ từ chối (nhân vật ${o.name}, tài khoản ${String(i).slice(0, 8)}): ${r.message}`,
        );
      }
    }
  } catch (a) {
    throw a;
  }
  {
    const a = o.inv.indexOf(A);
    (a >= 0 && o.inv.splice(a, 1), (R = !0), $());
  }
  (C(`🏪 Bày bán <b>${D(A.n)}</b> giá ${k2({ price: n, cur: t })} · bày 2 giờ, hết hạn tự về Thư`),
    U0().catch(() => {}));
};

var Ox = async function (A) {
  if (di.includes("mkt")) throw new Error("Chợ đang tạm đóng");
  const n = ci(A);
  if ((typeof b1 == "function" && (await b1().catch(() => {})), ln())) {
    if (!n) throw new Error("Chợ chỉ còn giao dịch bằng KNB");
    if (!wr(A)) throw new Error("Không đủ KNB");
    await Sn();
    const e = await e0((a) => a.rpc("market_buy2", { lid: A.id, buyer: o.name }));
    (B2(+e.data.bal),
      $(),
      C(`🏪 Mua <b>${D(A.iname)}</b> của ${D(A.seller_name)} giá ${k2(A)} (món đã vào Thư)`),
      Yt());
    return;
  }
  if (!wr(A)) throw new Error(n ? "Không đủ KNB" : "Không đủ ngân lượng");
  await Sn();
  const t = (e) => {
    n ? (o.knb = (o.knb | 0) + e) : (o.gold += e);
  };
  (t(-A.price), $());
  try {
    await U0();
  } catch (e) {
    throw (
      t(A.price),
      $(),
      new Error("Không lưu được nhân vật lên máy chủ, chưa mua: " + e.message)
    );
  }
  try {
    await e0((e) => e.rpc("market_buy", { lid: A.id, buyer: o.name }));
  } catch (e) {
    throw (t(A.price), $(), U0().catch(() => {}), e);
  }
  (C(`🏪 Mua <b>${D(A.iname)}</b> của ${D(A.seller_name)} giá ${k2(A)} (món đã vào Thư)`),
    Yt(),
    U0().catch(() => {}));
};

var oi = function () {
  const A = m("#netBtn");
  A && (A.classList.toggle("on", b.mailN > 0), (A.dataset.n = b.mailN > 9 ? "9+" : b.mailN || ""));
};

var Tl = function (A, n, t, e) {
  let a;
  Dn = e || null;
  try {
    a = Z1(A);
  } finally {
    Dn = null;
  }
  J(
    `${a}${n || ""}<div class="btnrow"><button class="btn" id="niBack">Quay lại</button></div>`,
    () => {
      m("#niBack").onclick = t;
    },
  );
};

var Qg = async function () {
  if (b.user || !b.sb) return !!b.user;
  try {
    const { data: A } = await b.sb.auth.getSession();
    b.user = A && A.session ? A.session.user : null;
  } catch {}
  return !!b.user;
};

var Gg = async function () {
  (await Qg()) ||
    $l("Phiên đăng nhập đã hết — đăng nhập lại để tiếp tục lưu nhân vật lên đám mây.");
};

var Y0 = async function s(A, n) {
  if ((A && (b.tab = A), b.sb && (await Qg()), !h0()))
    return J(
      '<h3>🌐 Giang hồ online</h3><p class="desc">Chưa cấu hình máy chủ (js/chatcfg.js).</p>',
    );
  const t = [
      ["acc", "Tài khoản"],
      ["rank", "Xếp hạng"],
      ["mail", `Thư${b.mailN ? ` (${b.mailN})` : ""}`],
      ["mkt", "Chợ"],
    ],
    e = `<h3>🌐 Giang hồ online <small>${b.user ? D(ri()) : "chưa đăng nhập"}</small></h3><div class="dtabs" id="netTabs">${t.map(([r, c]) => `<button data-nt="${r}" class="${r === b.tab ? "on" : ""}">${c}</button>`).join("")}</div>${n ? `<p class="cn small">${D(n)}</p>` : ""}${o && o.fac ? "" : '<div class="btnrow"><button class="btn sm" id="netSlot">← Chọn nhân vật</button></div>'}`;
  J(
    e + '<div id="netBody"><p class="dim small">Đang tải…</p></div>',
    () => {
      document
        .querySelectorAll("#netTabs [data-nt]")
        .forEach((c) => (c.onclick = () => s(c.dataset.nt)));
      const r = m("#netSlot");
      r && (r.onclick = () => Ir());
    },
    !(o && o.fac),
  );
  try {
    await si();
  } catch (r) {
    m("#netBody").innerHTML = `<p class="reqbad">${D(r.message)}</p>`;
    return;
  }
  const a = m("#netBody");
  if (!a) return;
  const i = !b.user && b.tab !== "rank";
  if (!i && di.includes(b.tab)) {
    a.innerHTML = `<div class="card"><b>⛔ Tạm đóng</b><p class="desc">${b.tab === "mkt" ? "Chợ" : "Hộp thư"} đang tạm đóng để bảo trì. Đồ và ngân lượng trong ${b.tab === "mkt" ? "Chợ" : "thư"} vẫn được giữ nguyên.</p></div>`;
    return;
  }
  try {
    await { acc: Ex, rank: Kg, mail: Ix, mkt: Lx }[i ? "acc" : b.tab](a);
  } catch (r) {
    a.innerHTML = `<p class="reqbad">${D(r.message || r)}</p>`;
  }
};

var Ex = async function (A) {
  if (!b.user) {
    A.innerHTML = `<div class="card"><b>Đăng nhập / Đăng ký</b><p class="dim small">Một tài khoản dùng cho cả 3 nhân vật: lưu đám mây, bảng xếp hạng, gửi thư, Chợ. Không cần email.</p>
      <div class="row">Tên đăng nhập <input id="naU" maxlength="16" autocomplete="username" placeholder="chữ không dấu, số, _"></div>
      <div class="row">Mật khẩu <input id="naP" type="password" maxlength="64" autocomplete="current-password" placeholder="ít nhất 6 ký tự"></div>
      <div class="btnrow"><button class="btn" id="naIn">Đăng nhập</button><button class="btn" id="naUp">Đăng ký mới</button></div>
      <p class="dim small">Nhớ mật khẩu — hiện chưa có cách lấy lại.</p></div>`;
    const i = (r) =>
      v1(
        m(r === "up" ? "#naUp" : "#naIn"),
        () => Ng(r, m("#naU").value, m("#naP").value),
        () => {
          (k(r === "up" ? "Đã tạo tài khoản" : "Đã đăng nhập"), Y0("acc"));
        },
      );
    ((m("#naIn").onclick = () => i("in")), (m("#naUp").onclick = () => i("up")));
    return;
  }
  const n = await xx(),
    t = (i) => (i ? new Date(i).toLocaleString("vi-VN") : "—");
  ((A.innerHTML = `<div class="card"><b>Tài khoản ${D(ri())}</b> <button class="btn sm" id="naOut">Đăng xuất</button>
      ${
        o.fac
          ? `<p class="small">Nhân vật đang chơi: <b>${D(OA() ? o.name : "(chưa đặt tên)")}</b> · ${D(ql(o.fac))} cấp ${o.lvl} · slot ${m0 + 1}</p>
      <div class="btnrow"><button class="btn sm" id="naSync">Cập nhật lên bảng xếp hạng</button>${OA() ? "" : '<button class="btn sm on" id="naName">✏ Đặt tên</button>'}</div>`
          : ""
      }</div>
    <div class="card"><b>☁ Lưu đám mây</b> <small class="dim">mỗi slot 1 bản, chơi tiếp trên máy khác</small>
      ${
        o.fac
          ? `<div class="btnrow"><button class="btn sm" id="naUp">Tải lên ngay (slot ${m0 + 1})</button></div>
      <p class="dim small">Nhân vật chỉ lưu trên đám mây: tự lưu lên mỗi 2 phút và khi rời trang; vào game luôn lấy bản đám mây.</p>`
          : ""
      }
      <table class="dktbl small"><tr><th>Slot</th><th>Nhân vật</th><th>Lưu lúc</th><th></th></tr>
      ${[0, 1, 2]
        .map((i) => {
          const r = n.find((c) => c.slot === i);
          return `<tr><td>${i + 1}</td><td>${r ? `${D(r.name || "")} · ${D(ql(r.fac))} ${r.lvl}` : '<span class="dim">trống</span>'}</td><td>${r ? t(r.updated) : ""}</td><td>${r ? `<button class="btn sm" data-cl="${i}">Tải về</button>` : ""}</td></tr>`;
        })
        .join("")}</table>
      <p class="dim small">Tải về: thay nhân vật slot đó trên máy này bằng bản đám mây (bản cũ giữ 1 bản sao lưu). Bình thường game tự đồng bộ, không cần bấm.</p></div>`),
    (m("#naOut").onclick = () =>
      v1(
        m("#naOut"),
        async () => {
          (o && o.fac && (await U0().catch(() => {})),
            (b.loggingOut = !0),
            await b.sb.auth.signOut(),
            (b.loggingOut = !1),
            (b.user = null),
            (b.mailN = 0),
            oi());
        },
        () => location.reload(),
      )));
  const e = (i, r) => {
    const c = m(i);
    c && (c.onclick = r);
  };
  (e("#naSync", () =>
    v1(
      m("#naSync"),
      () => D1(),
      () => k("Đã cập nhật"),
    ),
  ),
    e("#naName", () => Aa(() => Y0("acc"))),
    e("#naUp", () =>
      v1(
        m("#naUp"),
        () => U0(),
        () => {
          (k("Đã lưu lên đám mây"), Y0("acc"));
        },
      ),
    ));
  const a = m("#naAuto");
  (a &&
    (a.onchange = () => {
      ((o.cloudAuto = a.checked), $());
    }),
    A.querySelectorAll("[data-cl]").forEach(
      (i) => (i.onclick = () => v1(i, () => Bx(+i.dataset.cl))),
    ));
};
