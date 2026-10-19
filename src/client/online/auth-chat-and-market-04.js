// online/auth-chat-and-market — shared IIFE scope; order is defined in modules.json.
var mr = (s) => (s ? ((s.rw && s.rw.stat && s.rw.stat.reborn) | 0) * 200 + (s.lvl | 0) : 0);

var Ll = (s, A) => !s || !s.cloudAt || A > s.cloudAt + 5e3;

var cn = (s, A, n, t) =>
  `left:${s / 3.08}%;top:${A / 1.97}%;width:${n / 3.08}%;height:${t / 1.97}%`;

var Wg = (s) => {
  try {
    if (s === void 0) return localStorage.getItem("jx_lu") || "";
    s ? localStorage.setItem("jx_lu", s) : localStorage.removeItem("jx_lu");
  } catch {
    return "";
  }
  return "";
};

var Fx = 5e6;

var Vx = 5e7;

var BM = 3;

var ci = (s) => s && s.cur === "knb";

var k2 = (s) => (ci(s) ? `${F(s.price)} KNB` : `${q(s.price)} lượng`);

var wr = (s) => (ci(s) ? (o.knb | 0) >= s.price : !ln() && o.gold >= s.price);

var ln = () => typeof aa == "function" && aa() && e1.ok;

var _M = (s) => !!s && ((s.r | 0) >= 4 || !!s.set);

var MM = (s) => (s.set && $a(s) >= 0 ? Vx : Fx);

var x2 = 10;

var ql = (s) => (I[s] ? I[s].n : s || "");

var li = (s) =>
  W1(s)
    .replace(" bad", "")
    .replace(/ title="[^"]*"/, "");

var di = [];

var Ux = 2 * 36e5;

var Xx = (s) => {
  const A = Math.max(0, Math.round((new Date(s.created).getTime() + Ux - Date.now()) / 6e4));
  return A >= 60 ? `còn ${Math.floor(A / 60)} giờ ${A % 60} phút` : `còn ${A} phút`;
};

var v1 = async (s, A, n) => {
  s && (s.disabled = !0);
  try {
    const t = await A();
    n && n(t);
  } catch (t) {
    (k(t.message || String(t)), s && (s.disabled = !1));
  }
};

var Jx = 10;

var pr = [
  ["lvl", "Cấp"],
  ["tower", "Tháp"],
  ["bosses", "Trùm đã hạ"],
];

var ct = { mail: null, mkt: null };

var jl = [
  ["weapon", "Vũ khí"],
  ["armor", "Áo"],
  ["helm", "Mũ"],
  ["belt", "Đai lưng"],
  ["boot", "Giày"],
  ["cuff", "Hộ uyển"],
  ["amulet", "Dây chuyền"],
  ["ring", "Nhẫn"],
  ["pendant", "Ngọc bội"],
  ["horse", "Ngựa"],
];

var Wx = [
  ["hkmp", "Hoàng Kim Môn Phái"],
  ["hk", "Hoàng Kim bộ chung"],
  ["bk", "Bạch Kim"],
  ["tim", "Tím"],
  ["hiem", "Hiếm"],
  ["xanh", "Xanh"],
  ["trang", "Thường"],
];

var Zx = () => {
  const s = v0();
  return (
    5 * (Math.max(1, o.lvl) - 1) +
    (s > 0 ? po : 0) +
    Math.min(Math.max(0, o.bonusAtp | 0), Math.min(825, 5 * (15 + 15 * s)))
  );
};

var jA = {
  id:
    typeof crypto < "u" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2),
  on: !0,
  off: !1,
  t: 0,
  kicked: !1,
};

var Dr = function (A, n) {
  if (((n = Math.floor(+n || 0)), !(!(n > 0) || !o) && ((o.knb = (o.knb | 0) + n), aa()))) {
    const t = o.kp || (o.kp = {});
    t[A] = (t[A] | 0) + n;
  }
};

var B2 = function (A) {
  !(A >= 0) || !o || (o.knb = Math.floor(A) + Pr());
};

var b1 = async function () {
  return aa()
    ? (e1.busy ||
        (e1.busy = (async () => {
          const A = o.kp || {};
          o.kp = {};
          try {
            const n = await b.sb.rpc("knb_sync", { e: A });
            if (n.error) throw n.error;
            ((e1.ok = !0), (e1.day = n.data.day || {}), (e1.t = Date.now()), B2(+n.data.bal));
            const t = Object.keys(A).reduce(
              (e, a) => e + Math.max(0, (A[a] | 0) - ((n.data.got || {})[a] | 0)),
              0,
            );
            return (
              t > 0 &&
                C(
                  `<span class="dim">💰 Đã đạt giới hạn Kim Nguyên Bảo nhận trong ngày (${t} KNB không được cộng)</span>`,
                ),
              typeof $ == "function" && $(),
              n.data
            );
          } catch (n) {
            const t = String(n && (n.message || n));
            if (/knb_sync|Could not find the function|schema cache/i.test(t)) e1.off = !0;
            else {
              const e = o.kp || (o.kp = {});
              for (const a of Object.keys(A)) e[a] = (e[a] | 0) + (A[a] | 0);
            }
            throw n;
          } finally {
            e1.busy = null;
          }
        })()),
      e1.busy)
    : null;
};

var AB = async function (A, n, t) {
  if (!aa()) return n();
  try {
    await b1();
  } catch {
    if (!e1.off) throw new Error("Cần kết nối máy chủ để dùng Kim Nguyên Bảo — thử lại");
  }
  if (!aa() || ((A = Math.min(Math.floor(+A || 0), o.knb | 0)), !(A > 0))) return n();
  const e = await e0((h) => h.rpc("knb_spend", { n: A, why: String(t || "").slice(0, 60) }));
  let a = +e.data.bal;
  const i = o.knb | 0;
  let r,
    c = null;
  try {
    r = n();
  } catch (h) {
    c = h;
  }
  const d = Math.max(0, Math.min(A, i - (o.knb | 0))),
    f = A - d;
  if (f > 0)
    for (let h = 0; h < 3; h++)
      try {
        const g = await b.sb.rpc("knb_refund", { hid: e.data.hid, n: f });
        if (g.error) throw g.error;
        a = +g.data.bal;
        break;
      } catch {
        h === 2
          ? C(
              '<span class="bad">Chưa hoàn được ' +
                f +
                " KNB (mất mạng) — báo Admin nếu thiếu</span>",
            )
          : await new Promise((u) => setTimeout(u, 1200));
      }
  if ((B2(a), typeof $ == "function" && $(), c)) throw c;
  return r;
};

var e1 = { off: !1, ok: !1, busy: null, day: {}, t: 0 };

var HM = { boss: 1500, reward: 8e3, book: 5e3, buy: 1e4 };

var aa = () => !e1.off && typeof b < "u" && !!b.user;

var Pr = () => Object.values((o && o.kp) || {}).reduce((s, A) => s + (+A || 0), 0);

var _2 = (s, A, n) => AB(s, A, n).catch((t) => k(t.message || String(t)));

setInterval(() => {
  aa() && o && o.fac && (Pr() > 0 || Date.now() - e1.t > 5 * 6e4) && b1().catch(() => {});
}, 6e4);
