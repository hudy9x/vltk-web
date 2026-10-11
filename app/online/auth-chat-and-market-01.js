// online/auth-chat-and-market — shared IIFE scope; order is defined in modules.json.
window.CHAT_CFG = {
  url: "https://bzgxytkuwqvshbnkazyv.supabase.co",
  key: "sb_publishable_fvDq743OAeHgmavUkBzD3g_tQ4nwr4E",
  turnstile: "",
};

var ex = function () {
  if (m("#chatBox")) return;
  const A = document.createElement("div");
  ((A.id = "chatBox"),
    (A.innerHTML = `<div id="chatHead"><button type="button" class="cch on" data-cc="w">🌐 Thế giới</button><button type="button" class="cch" data-cc="p">👥 Tổ đội<b id="chatPN"></b></button><small id="chatOn"></small><button type="button" id="chatX" title="Thu gọn khung chat">−</button></div>
    <div id="chatLines"></div>
    <form id="chatIn" autocomplete="off"><span id="chatAtt"></span><input id="chatTxt" maxlength="${fr}" placeholder="Nhập tin nhắn…"><button class="btn sm">Gửi</button></form>
    <button id="chatBtn" title="Chat thế giới">💬<b id="chatN"></b></button>`),
    m("#battle").appendChild(A),
    (m("#chatLines").onclick = (n) => {
      const t = n.target.closest("[data-ci]");
      if (t) {
        xl(+t.dataset.ci);
        return;
      }
      const e = n.target.closest("[data-pn]");
      e && H.open && typeof En == "function" && En(e.dataset.pn);
    }),
    (m("#chatBtn").onclick = () => na(!0)),
    (m("#chatX").onclick = () => na(!1)),
    A.querySelectorAll("[data-cc]").forEach((n) => (n.onclick = () => ax(n.dataset.cc))),
    (m("#chatIn").onsubmit = (n) => {
      (n.preventDefault(), yl(m("#chatTxt").value));
    }));
};

var ax = function (A) {
  (typeof Nn < "u" && Nn && (A = "w"),
    (H.chan = A === "p" ? "p" : "w"),
    document
      .querySelectorAll("#chatHead [data-cc]")
      .forEach((n) => n.classList.toggle("on", n.dataset.cc === H.chan)),
    (H.lastH = null),
    H.chan === "p" && typeof s0 < "u" && ((s0.unread = 0), M2(!0)),
    H.chan === "w" && ((H.unread = 0), ei(!0)),
    BA());
};

var na = function (A) {
  ((H.open = A),
    m("#chatBox").classList.toggle("open", A),
    A && H.chan === "p" && typeof s0 < "u" && ((s0.unread = 0), M2(!0)),
    A &&
      (H.chan === "w" && (H.unread = 0),
      ei(!0),
      setTimeout(() => {
        const n = m("#chatTxt");
        n && !matchMedia("(pointer:coarse)").matches && n.focus();
      }, 0)),
    BA());
};

var ti = function (A) {
  return A.sys
    ? `<div class="cl sys${A.hb ? " hb" : ""}">${A.ts ? `<i>${hr(A.ts)}</i> ` : ""}${D(A.msg)}</div>`
    : `<div class="cl${A.cid === ta() ? " me" : ""}${A.pending ? " pend" : ""}"><i>${hr(A.ts)}</i> <b data-pn="${D(A.name)}"${(() => {
        const t = vA.find((e) => e.n === A.fac);
        return typeof o2 == "function"
          ? ` style="color:${o2(A.name, t ? t.key : "")}${Is(A.name) ? ";font-weight:bold" : ""}"`
          : "";
      })()}>${D(A.name)}${typeof i2 == "function" ? i2(A.name) : ""}</b>${A.lvl ? `<small> ${D(A.fac || "")} ${A.lvl}</small>` : ""}: ${ix(A)}</div>`;
};

var BA = function () {
  H.rq ||
    (H.rq = requestAnimationFrame(() => {
      ((H.rq = 0), sx());
    }));
};

var sx = function () {
  const A = m("#chatBox");
  if (!A) return;
  const n = H.chan === "p" && typeof s0 < "u";
  {
    const f = m("#chatTxt"),
      h = Ig()
        ? n
          ? L.pid
            ? "Nhắn cho tổ đội…"
            : "Chưa có tổ đội · bấm 👥 để mời"
          : "Nhập tin nhắn…"
        : "🔒 Đăng nhập tài khoản để chat";
    f && f.placeholder !== h && (f.placeholder = h);
  }
  const t = n ? s0.msgs.map(lm) : H.msgs.filter((f) => !Sg(f.msg) && !ai(f)),
    e = H.open ? t : t.slice(-4),
    a =
      H.state === "off"
        ? '<div class="cl sys">Chat chưa bật (điền js/chatcfg.js)</div>'
        : H.state === "load"
          ? '<div class="cl sys">Đang kết nối…</div>'
          : H.state === "err"
            ? `<div class="cl sys">Không kết nối được chat${H.err ? ": " + D(H.err) : ""}</div>`
            : "",
    i = m("#chatLines"),
    r = i.scrollTop + i.clientHeight >= i.scrollHeight - 30,
    c = n
      ? L.pid
        ? s0.off
          ? '<div class="cl sys">Máy chủ chưa bật chat Tổ đội (chạy lại TO_DOI.sql).</div>'
          : s0.msgs.length
            ? ""
            : `<div class="cl sys">Kênh tổ đội (${L.mem.length}/${sa}): ${L.mem.map((f) => D(f.name)).join(", ")}</div>`
        : '<div class="cl sys">Bạn chưa có tổ đội. Bấm 👥 để mời người chơi, hoặc bấm tên trên kênh Thế giới → 👥 Mời tổ đội.</div>'
      : "",
    d = n ? c + e.map(ti).join("") : (H.open || !H.msgs.length ? a : "") + e.map(ti).join("");
  (d !== H.lastH &&
    ((H.lastH = d), (i.innerHTML = d), (r || !H.open) && (i.scrollTop = i.scrollHeight)),
    (m("#chatOn").textContent =
      H.state === "ok" && !H.subOk ? " · đang nối…" : H.online > 0 ? ` · ${H.online} online` : ""));
  {
    const f = document.getElementById("u20onl");
    f &&
      ((f.textContent = H.online > 0 ? `${H.online} online` : ""),
      (f.title = H.online > 0 ? `${H.online} người đang online` : ""));
  }
  {
    const f = typeof s0 < "u" ? s0.unread : 0,
      h = H.unread + f;
    m("#chatN").textContent = h ? (h > 9 ? "9+" : h) : "";
    const g = m("#chatPN");
    g && (g.textContent = f ? (f > 9 ? "9+" : f) : "");
  }
  A.classList.toggle("quiet", !H.open && !H.msgs.length && H.state === "off");
  {
    const f = typeof s0 < "u" ? s0.unread : 0,
      h = (g, u) => {
        const w = document.querySelector(`#u20ct [data-lt="${g}"] .ctn`);
        w && (w.textContent = u ? (u > 9 ? "9+" : u) : "");
      };
    (h("chat", H.unread), h("party", f));
  }
};

var cr = function (A) {
  if (!(A.id && H.msgs.some((n) => n.id === A.id)) && !ai(A)) {
    if (A.cid === ta()) {
      const n = H.msgs.findIndex((t) => t.pending && t.msg === A.msg);
      if (n >= 0) {
        ((H.msgs[n] = A), BA());
        return;
      }
    }
    (H.msgs.push(A),
      H.msgs.length > cx && H.msgs.shift(),
      !H.open && !A.sys && A.cid !== ta() && H.unread++,
      BA());
  }
};

var yl = async function (A) {
  if (
    ((A = String(A || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, fr)),
    !A && H.att && (A = `[${H.att.n}]`),
    !A)
  )
    return;
  if (Sg(A)) return k("Không gửi được tin dạng câu lệnh / mã lệnh");
  if (!H.sb)
    return k(H.state === "load" ? "Chat đang kết nối, thử lại sau giây lát" : "Chat chưa kết nối");
  if (!Ig()) {
    (k("Đăng nhập tài khoản để chat"), typeof Y0 == "function" && Y0("acc"));
    return;
  }
  if (!OA())
    return Aa(() => {
      (na(!0), (m("#chatTxt").value = A));
    });
  if (H.chan === "p" && typeof am == "function") {
    (H.att && (A = A.includes(`[${H.att.n}]`) ? A : (A + ` [${H.att.n}]`).slice(0, fr)),
      (m("#chatTxt").value = ""),
      lr(null),
      (await am(A)) || (m("#chatTxt").value = A));
    return;
  }
  if (Date.now() - H.last < Og)
    return k(`Chờ ${Math.ceil((Og - (Date.now() - H.last)) / 1e3)} giây nữa mới gửi được`);
  if (H.att && typeof U0 == "function")
    try {
      await U0();
    } catch {}
  if (typeof Sn == "function")
    try {
      await Sn();
    } catch (r) {
      return k("Nhân vật chưa lưu lên máy chủ nên chưa chat được: " + (r.message || r));
    }
  ((H.last = Date.now()), (m("#chatTxt").value = ""));
  const n = { cid: ta(), name: Eg(), fac: I[o.fac] ? I[o.fac].n : "", lvl: o.lvl | 0, msg: A },
    t = H.att;
  if (t) {
    n.item = t;
    const r = `[${t.n}]`;
    A.includes(r) || (n.msg = (A === r ? "" : A.slice(0, fr - r.length - 1) + " ") + r);
  }
  const e = Object.assign({ id: "tmp" + Date.now(), ts: Date.now(), pending: !0 }, n);
  (H.msgs.push(e), lr(null), BA());
  const { data: a, error: i } = await H.sb.from("chat").insert(n).select().single();
  if (i) {
    ((H.msgs = H.msgs.filter((r) => r !== e)),
      BA(),
      t && lr(t),
      k(
        t && /Món đồ khoe/.test(i.message || "")
          ? "Món đồ chưa có trên bản lưu máy chủ — chờ vài giây rồi gửi lại"
          : t && /item/.test(i.message || "")
            ? "Máy chủ chat chưa bật khoe đồ (chạy CHAT_ITEM.sql trên Supabase)"
            : "Gửi lỗi: " + (i.message || ""),
      ),
      (m("#chatTxt").value = A));
    return;
  }
  if (a) {
    const r = H.msgs.indexOf(e);
    (r >= 0 ? (H.msgs.some((c) => c.id === a.id) ? H.msgs.splice(r, 1) : (H.msgs[r] = a)) : cr(a),
      BA());
  }
};

var Hg = function () {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  const A = (n) =>
    new Promise((t, e) => {
      const a = document.createElement("script");
      ((a.src = n),
        (a.onload = () =>
          window.supabase && window.supabase.createClient ? t() : e(new Error("thư viện lỗi"))),
        (a.onerror = () => e(new Error("không tải được thư viện"))),
        document.head.appendChild(a));
    });
  return (
    H.libP ||
    (H.libP = A("js/lib/supabase.js?v=2.117.3")
      .catch(() => A("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"))
      .catch(() => {
        throw ((H.libP = null), new Error("không tải được thư viện (mất mạng?)"));
      }))
  );
};

var $g = async function s() {
  if (typeof h0 == "function" && !h0()) {
    document.body.classList.add("nochat");
    return;
  }
  ex();
  const A = window.CHAT_CFG || {};
  if (!A.url || !A.key) {
    ((H.state = "off"), BA());
    return;
  }
  ((H.state = "load"), BA());
  try {
    (await Hg(), (H.sb = await si()));
    const { data: n, error: t } = await H.sb
      .from("chat")
      .select("*")
      .order("id", { ascending: !1 })
      .limit(50);
    if (t) throw t;
    ((H.msgs = (n || []).reverse().filter((e) => !ai(e))),
      (H.state = "ok"),
      BA(),
      Cg(),
      setTimeout(() => ei(!0), 3e3),
      dr(!0),
      H.polling ||
        ((H.polling = !0),
        setInterval(ei, 5e3),
        document.addEventListener("visibilitychange", () => {
          !document.hidden && Date.now() - (H.polled || 0) > 3e4 && ei(!0);
        })));
  } catch (n) {
    ((H.state = "err"), (H.initN = Math.min(6, (H.initN || 0) + 1)));
    const t = Math.min(3e5, 1e4 * 2 ** (H.initN - 1));
    ((H.err = (n.message || String(n)) + ` · thử lại sau ${Math.round(t / 1e3)} giây`),
      BA(),
      clearTimeout(H.initT),
      (H.initT = setTimeout(s, t * (0.8 + Math.random() * 0.4))));
  }
};

var Tg = function s(A, n = 0) {
  if (!(n > 4 || A == null)) {
    if (typeof A == "number") return Number.isFinite(A) ? A : void 0;
    if (typeof A == "boolean") return A;
    if (typeof A == "string") return A.slice(0, 60);
    if (Array.isArray(A))
      return A.slice(0, 24)
        .map((t) => s(t, n + 1))
        .filter((t) => t !== void 0);
    if (typeof A == "object") {
      const t = {};
      let e = 0;
      for (const a in A) {
        if (fx.has(a) || ++e > 30 || !/^\w{1,12}$/.test(a)) continue;
        const i = s(A[a], n + 1);
        i !== void 0 && (t[a] = i);
      }
      return t;
    }
  }
};

var kl = function (A) {
  const n = A && A.d === 99 && A.ktc && typeof J0 < "u" && J0.some((t) => t.k === A.ktc.k);
  if (
    !A ||
    typeof A != "object" ||
    !(S.items[A.d] || n) ||
    typeof A.n != "string" ||
    !A.n ||
    ((A = Tg(A)),
    (A.r = E(Math.round(+A.r || 0), 0, _0.length - 1)),
    (A.lvl = E(Math.round(+A.lvl || 1), 1, 99)),
    (typeof A.ic != "string" ||
      !/^img\/[\w\/.-]+\.(png|webp|jpg)$/.test(A.ic) ||
      A.ic.includes("..")) &&
      delete A.ic,
    Array.isArray(A.mag) || (A.mag = []),
    typeof f3 == "function"
      ? f3(A)
      : (typeof VA == "function" && VA(A)) || (typeof ZA == "function" && ZA(A)))
  )
    return null;
  if (typeof Z1 == "function")
    try {
      Z1(A);
    } catch {
      return null;
    }
  return A;
};

var lr = function s(A) {
  const n = A && A.uid;
  ((H.att = A ? kl(Tg(A)) : null), H.att && n != null && (H.att.uid = n));
  const t = m("#chatAtt");
  if (!t) return;
  t.innerHTML = H.att
    ? `<b style="color:${_0[H.att.r]}">[${D(H.att.n)}]</b><button type="button" title="Bỏ đính kèm">✕</button>`
    : "";
  const e = t.querySelector("button");
  e && (e.onclick = () => s(null));
};

var ix = function (A) {
  const n =
    A.item && typeof A.item == "object"
      ? (ur.has(A.item) || ur.set(A.item, kl(JSON.parse(JSON.stringify(A.item)))), ur.get(A.item))
      : null;
  let t = D(A.msg);
  if (n) {
    const e = D(`[${n.n}]`),
      a = `<a class="chit" data-ci="${+A.id || 0}" style="color:${_0[n.r]}">${e}</a>`;
    t = t.includes(e) ? t.replace(e, a) : t + " " + a;
  }
  return t;
};

var xl = function (A) {
  const n = H.msgs.find((a) => +a.id === A),
    t = n && kl(n.item);
  if (!t) return;
  let e = "";
  try {
    e = Z1(t);
  } catch {
    e = `<h4 style="color:${_0[t.r]}">${D(t.n)}</h4><p class="dim">Không đọc được chi tiết món đồ.</p>`;
  }
  J(`<h3>Đồ của ${D(n.name)} <small>${D(n.fac || "")} ${n.lvl || ""}</small></h3>${e}`);
};

var ox = function (A) {
  if (document.body.classList.contains("nochat")) return k("Bản chơi trên máy không có chat");
  if (!m("#chatBox")) return k("Chat chưa bật");
  (n0(!0), lr(A));
  const n = document.getElementById("u20txt");
  (n && (document.body.classList.contains("u2m") || document.body.classList.contains("u20"))
    ? (o && ((o.u20logOff = !1), typeof $2 == "function" && $2()),
      (n.placeholder = `📎 [${H.att ? H.att.n : ""}] · gõ lời nhắn rồi Gửi`),
      n.focus())
    : na(!0),
    k("Đã đính kèm vào chat · gõ thêm lời nhắn rồi bấm Gửi"));
};

var Cg = async function s() {
  if (!_l) {
    H.subOk = !0;
    return;
  }
  if (!H.sb || H.subBusy) return;
  H.subBusy = !0;
  const A = H.ch;
  if (((H.ch = null), clearTimeout(H.reT), A))
    try {
      await H.sb.removeChannel(A);
    } catch {}
  H.subBusy = !1;
  const n = (H.ch = H.sb.channel("the-gioi", { config: { presence: { key: ta() } } })),
    t = () => {
      H.ch === n && ((H.online = Object.keys(n.presenceState()).length), BA());
    };
  n.on("postgres_changes", { event: "INSERT", schema: "public", table: "chat" }, (e) => cr(e.new))
    .on("presence", { event: "sync" }, t)
    .on("presence", { event: "join" }, t)
    .on("presence", { event: "leave" }, t)
    .subscribe(async (e) => {
      if (H.ch === n)
        if (e === "SUBSCRIBED") {
          ((H.subOk = !0), (H.reN = 0), (H.state = "ok"), (H.err = ""), BA());
          try {
            await n.track({ name: Eg(), lvl: o.lvl | 0 });
          } catch {}
          t();
        } else
          (e === "CHANNEL_ERROR" || e === "TIMED_OUT" || e === "CLOSED") &&
            ((H.subOk = !1),
            clearTimeout(H.reT),
            (H.reN = (H.reN || 0) + 1),
            (H.reT = setTimeout(
              s,
              Math.min(12e4, 3e3 * 2 ** Math.min(6, H.reN - 1)) + Math.random() * 3e3,
            )));
    });
};

var rx = function () {
  const A = Date.now(),
    n = typeof uA < "u" ? uA : "chat";
  return !(
    H.open ||
    (document.getElementById("u20log") &&
      !document.body.classList.contains("u20logoff") &&
      (n === "chat" || n === "all"))
  ) || A - (H.act || 0) > 12e4
    ? 9e4
    : /^(u20txt|chatTxt)$/.test((document.activeElement || {}).id || "") || A - (H.last || 0) < 6e4
      ? 5e3
      : 15e3;
};

var ei = async function (A) {
  if (!H.sb || document.hidden) return;
  const n = _l && H.subOk && H.ch && H.ch.state === "joined";
  if (typeof b2 == "function" && b2() && A !== !0) return;
  const t = n ? 6e4 : rx();
  if (!(A !== !0 && Date.now() - (H.polled || 0) < t)) {
    ((H.polled = Date.now()),
      _l && !H.reN && (!H.ch || H.ch.state === "closed" || H.ch.state === "errored") && Cg());
    try {
      const e = H.msgs.reduce((i, r) => Math.max(i, +r.id || 0), 0),
        { data: a } = await H.sb
          .from("chat")
          .select("*")
          .gt("id", e)
          .order("id", { ascending: !0 })
          .limit(50);
      if (((a || []).forEach(cr), dr(), H.ch && H.ch.presenceState))
        ((H.online = Object.keys(H.ch.presenceState()).length), BA());
      else if (Date.now() - (H.onAt || 0) > 18e4) {
        H.onAt = Date.now();
        let i = null;
        if (H.onRpc !== !1) {
          const r = await H.sb.rpc("jx_online");
          r && !r.error && r.data != null ? (i = +r.data) : (H.onRpc = !1);
        }
        if (i == null) {
          const r = Date.now(),
            c = await H.sb
              .from("chars")
              .select("owner", { count: "exact", head: !0 })
              .gte("updated", new Date(r - 12 * 6e4).toISOString())
              .lte("updated", new Date(r + 2 * 6e4).toISOString());
          c && typeof c.count == "number" && (i = c.count);
        }
        i != null && ((H.online = Math.max(1, i)), BA());
      }
    } catch {}
  }
};

var dr = async function (A) {
  if (!(!H.sb || H.sysOff) && !(A !== !0 && Date.now() - (H.sysAt || 0) < 6e4)) {
    H.sysAt = Date.now();
    try {
      let n = H.sb.from("jx_sysmsg").select("id,msg,at");
      n = H.sysId
        ? n.gt("id", H.sysId).order("id", { ascending: !0 }).limit(20)
        : n.order("id", { ascending: !1 }).limit(5);
      const { data: t, error: e } = await n;
      if (e) {
        /jx_sysmsg|does not exist|schema cache/i.test(e.message || "") && (H.sysOff = !0);
        return;
      }
      const a = (t || []).slice().sort((r, c) => r.id - c.id),
        i = !H.sysId;
      for (const r of a) {
        if (
          r.id <= (H.sysId || 0) ||
          ((H.sysId = r.id), i && Date.now() - new Date(r.at).getTime() > 15 * 6e4)
        )
          continue;
        const c = {
            id: "s" + r.id,
            sys: !0,
            hb: 1,
            ts: r.at,
            msg: "📢 Hệ thống: " + String(r.msg || "").slice(0, 200),
          },
          d = new Date(r.at).getTime(),
          f = H.msgs.findIndex((h) => h.ts && new Date(h.ts).getTime() > d);
        f >= 0 ? (H.msgs.splice(f, 0, c), BA()) : cr(c);
      }
    } catch {}
  }
};

var H = {
  sb: null,
  ch: null,
  msgs: [],
  open: !1,
  unread: 0,
  online: 0,
  state: "off",
  last: 0,
  err: "",
  chan: "w",
};

var fr = 150;

var cx = 80;

var Og = 1e4;

var ta = () => {
  try {
    let s = localStorage.getItem("jxidle_cid");
    return (
      s ||
        ((s = Math.random().toString(36).slice(2, 12) + Date.now().toString(36)),
        localStorage.setItem("jxidle_cid", s)),
      s
    );
  } catch {
    return "anon" + Math.random().toString(36).slice(2, 10);
  }
};

var Eg = () => String((o && (o.name || (I[o.fac] && I[o.fac].n))) || "Vô danh").slice(0, 20);

var hr = (s) => {
  const A = new Date(s);
  return `${String(A.getHours()).padStart(2, "0")}:${String(A.getMinutes()).padStart(2, "0")}`;
};

var lx =
  /^\s*[\/／]|(?<![A-Za-z0-9])[SR]\s*\.\s*[a-z_]{2,}\s*(\[|=|\.|\()|\w\s*=>\s*[\{\w(]|\bconsole\b|localStorage|sessionStorage|\.forEach\s*\(|\bfunction\s*\(|\bdocument\s*\.|\bwindow\s*\.|\beval\s*\(|Object\s*\.\s*(keys|assign|values)/i;

var Sg = (s) => lx.test(String(s || ""));

var dx = /[\[\]【】()]|^\s*(bot|gm|admin|hệ thống|he thong)(\s|$)/i;

var Bl = () => Bl.s || (Bl.s = new Set(Object.values(I).map((s) => s.n)));

var ai = (s) =>
  !s.sys &&
  (dx.test(String(s.name || "")) ||
    String(s.name || "").length > 14 ||
    !Bl().has(String(s.fac || "")) ||
    (s.lvl != null && !(+s.lvl >= 0 && +s.lvl <= 200)));

var Ig = () => typeof b < "u" && !!(b.user && b.user.id && !b.user.is_anonymous);

var fx = new Set(["uid", "lock", "price", "dtk"]);

var ur = new WeakMap();

if (typeof He == "function") {
  const s = He;
  He = (A, n) => {
    if ((s(A, n), document.body.classList.contains("nochat") || !m("#chatBox"))) return;
    const t = document.querySelector("#mBody .btnrow");
    if (!t || !A) return;
    const e = document.createElement("button");
    ((e.className = "btn"),
      (e.textContent = "💬 Khoe lên chat"),
      (e.onclick = () => ox(A)),
      t.appendChild(e));
  };
}

var _l = !1;

["pointerdown", "keydown", "wheel", "touchstart"].forEach((s) =>
  window.addEventListener(
    s,
    () => {
      H.act = Date.now();
    },
    { passive: !0, capture: !0 },
  ),
);

var xM = async function (A) {
  const n = location.origin + "/sb";
  if (!(/^https:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname)))
    return A.url;
  let e = "";
  try {
    e = localStorage.getItem(Ug) || "";
  } catch {}
  const a = (c, d) =>
      Promise.race([
        fetch(c + "/auth/v1/health", { headers: { apikey: A.key }, cache: "no-store" }).then(
          (f) => f.ok && /json/.test(f.headers.get("content-type") || ""),
        ),
        new Promise((f) => setTimeout(() => f(!1), d)),
      ]).catch(() => !1),
    i = (c) => {
      try {
        localStorage.setItem(Ug, c);
      } catch {}
    },
    r =
      e === "p"
        ? [
            [n, 6e3, "p"],
            [A.url, 4e3, "d"],
          ]
        : [
            [A.url, 4e3, "d"],
            [n, 6e3, "p"],
          ];
  for (const [c, d, f] of r) if (await a(c, d)) return (i(f), c);
  return A.url;
};

var si = function () {
  return b.sb
    ? Promise.resolve(b.sb)
    : h0()
      ? b.sbP ||
        (b.sbP = (async () => {
          await Hg();
          const A = window.CHAT_CFG,
            n = A.url;
          try {
            localStorage.removeItem("jxidle_auth");
          } catch {}
          const t = window.supabase.createClient(n, A.key, {
            auth: {
              persistSession: !0,
              autoRefreshToken: !0,
              storageKey: "jxidle_auth",
              storage: window.sessionStorage,
            },
          });
          try {
            const { data: e } = await t.auth.getSession();
            b.user = e && e.session ? e.session.user : null;
          } catch {
            b.user = null;
          }
          return (
            t.auth.onAuthStateChange((e, a) => {
              if (a && a.user) b.user = a.user;
              else if (e === "SIGNED_OUT") {
                const i = !!b.user;
                ((b.user = null), i && !b.loggingOut && o && o.fac && setTimeout(() => Gg(), 0));
              }
              oi();
            }),
            (b.sb = t),
            t
          );
        })().catch((A) => {
          throw ((b.sbP = null), A);
        }))
      : Promise.reject(new Error("Chưa cấu hình máy chủ (js/chatcfg.js)"));
};

var hx = function (A) {
  Rx(A) &&
    ((b.failN = Math.min(6, (b.failN || 0) + 1)),
    (b.holdUntil =
      Date.now() + Math.min(6e5, 3e4 * 2 ** (b.failN - 1)) * (0.8 + Math.random() * 0.4)));
};

var ux = function () {
  return (
    P1.p ||
    (P1.p = new Promise((A, n) => {
      if (window.turnstile) return A();
      const t = document.createElement("script");
      ((t.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"),
        (t.async = !0),
        (t.onload = () => A()),
        (t.onerror = () => {
          ((P1.p = null), n(new Error("Không tải được captcha — kiểm tra mạng rồi thử lại")));
        }),
        document.head.appendChild(t));
    }))
  );
};

var gx = async function () {
  const A = (window.CHAT_CFG || {}).turnstile;
  if (!A) return "";
  await ux();
  let n = document.getElementById("capBox");
  return (
    (!n || !n.isConnected) &&
      ((n = document.createElement("div")),
      (n.id = "capBox"),
      (n.style.cssText = "display:flex;justify-content:center;margin:6px 0"),
      (
        document.querySelector("#mBody .ng2x") ||
        document.querySelector("#mBody .card") ||
        document.getElementById("mBody")
      ).appendChild(n),
      (P1.id = null)),
    new Promise((t, e) => {
      const a = setTimeout(
        () => e(new Error("Chưa xác minh captcha — làm theo ô xác minh rồi bấm lại")),
        9e4,
      );
      P1.wait = (r) => {
        (clearTimeout(a), (P1.wait = null), t(r));
      };
      const i = {
        sitekey: A,
        appearance: "interaction-only",
        execution: "execute",
        language: "vi",
        callback: (r) => P1.wait && P1.wait(r),
        "error-callback": () => {
          (clearTimeout(a), (P1.wait = null), e(new Error("Captcha lỗi — thử lại")));
        },
      };
      try {
        (P1.id == null ? (P1.id = window.turnstile.render(n, i)) : window.turnstile.reset(P1.id),
          window.turnstile.execute(P1.id));
      } catch (r) {
        (clearTimeout(a), e(new Error("Captcha lỗi: " + (r.message || r))));
      }
    })
  );
};

var Ng = async function (A, n, t) {
  if (
    ((n = String(n || "")
      .trim()
      .toLowerCase()),
    !/^[a-z0-9_]{3,16}$/.test(n))
  )
    throw new Error("Tên đăng nhập 3–16 ký tự: chữ không dấu, số, _");
  if (String(t || "").length < 6) throw new Error("Mật khẩu ít nhất 6 ký tự");
  const e = await gx(),
    a = e ? { captchaToken: e } : void 0,
    i = await Promise.race([
      e0((r) =>
        A === "up"
          ? r.auth.signUp({ email: n + Ol, password: t, options: a })
          : r.auth.signInWithPassword({ email: n + Ol, password: t, options: a }),
      ),
      new Promise((r, c) =>
        setTimeout(() => c(new Error("Máy chủ không phản hồi — kiểm tra mạng rồi bấm lại")), 2e4),
      ),
    ]);
  if (!i.data || !i.data.session)
    throw new Error('Supabase đang bật "Confirm email" — hãy tắt (xem HUONG_DAN_WEB.txt)');
  ((b.user = i.data.session.user), Yt());
};

var mx = function () {
  const A = {};
  for (const [n, t] of Object.entries(o.eq || {})) t && (A[n] = t);
  return A;
};

var wx = async function (A) {
  const n = await e0((e) =>
      e.from("chars").select("name").eq("owner", b.user.id).eq("slot", m0).maybeSingle(),
    ),
    t = n && n.data && n.data.name;
  if (t && t !== o.name && /^TôiDạiDột\d{3}$/.test(t)) {
    const e = o.name;
    ((o.name = t),
      $(),
      C(`Tên <b>${D(e)}</b> giả người vận hành nên đã bị đổi thành <b>${D(t)}</b>.`),
      k("Tên nhân vật đã bị Admin đổi"));
    return;
  }
  if (/^TôiDạiDột\d{3}$/.test(o.name)) {
    if (t && t !== o.name && !sr(t) && vl(t).ok) {
      const e = o.name;
      ((o.name = t),
        $(),
        C(`Đã trả lại tên <b>${D(t)}</b> (thay ${D(e)}).`),
        k("Đã trả lại tên nhân vật"));
    }
    return;
  }
  throw (A || Aa(), new Error("Tên giống người vận hành — hãy đổi tên"));
};

var D1 = async function (A) {
  if (typeof i0 < "u" && i0.blocked) return;
  if (!b.user) throw new Error("Chưa đăng nhập");
  if (!o || !o.fac) throw new Error("Chưa có nhân vật");
  if (!OA()) throw (A || Aa(), new Error("Cần đặt tên nhân vật trước"));
  if (
    (typeof sr == "function" &&
      ((sr(o.name) && !Is(o.name)) || /^TôiDạiDột\d{3}$/.test(o.name)) &&
      (await wx(A)),
    y2(o))
  )
    throw new Error("Nhân vật thuộc tài khoản khác");
  const n = Q().stat || {},
    t = {
      owner: b.user.id,
      slot: m0,
      name: o.name,
      fac: o.fac,
      sex: o.sex | 0,
      lvl: o.lvl | 0,
      reborn: Math.min(10, n.reborn | 0),
      power: Math.round(l.power || 0),
      tower: n.towerBest | 0,
      bosses: n.bosses | 0,
      gear: mx(),
      updated: new Date().toISOString(),
    };
  if ((b.snapOk !== !1 || Date.now() - (b.snapNo || 0) > 3e5) && typeof Zg == "function") {
    const a = Zg();
    a && (t.snap = a);
  }
  const e = JSON.stringify(Object.assign({}, t, { updated: 0 }));
  if (A && e === b.charSig && Date.now() - (b.charSent || 0) < 30 * 6e4) {
    b.lastChar = Date.now();
    return;
  }
  try {
    await e0((a) => a.from("chars").upsert(t));
  } catch (a) {
    if (!t.snap || !/snap/i.test(String(a && a.message))) throw a;
    ((b.snapOk = !1),
      (b.snapNo = Date.now()),
      delete t.snap,
      await e0((i) => i.from("chars").upsert(t)));
  }
  ((b.lastChar = b.charSent = Date.now()), (b.charSig = e), Dx().catch(() => {}));
};

var px = function () {
  const A = (t) => /^[a-zA-Z0-9-]{8,64}$/.test(t || "");
  let n = "";
  try {
    n = localStorage.getItem("jxDev") || "";
  } catch {}
  (A(n) || (n = gr("jxdev")),
    A(n) ||
      (n =
        crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12)));
  try {
    localStorage.setItem("jxDev", n);
  } catch {}
  return (gr("jxdev", n), n);
};

var Lg = function (A) {
  let n = 0;
  try {
    n = +localStorage.getItem("jxBanMark") || 0;
  } catch {}
  if (((n = n || +gr("jxbm") || 0), A && !n && (n = Date.now()), n)) {
    try {
      localStorage.setItem("jxBanMark", String(n));
    } catch {}
    gr("jxbm", String(n));
  }
  return n;
};
