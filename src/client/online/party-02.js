// online/party — shared IIFE scope; order is defined in modules.json.
var sm = 30;

var mB = 3e4;

var im = 2 * 864e5;

var yr = () =>
  !L.off && typeof b < "u" && b.user && b.sb && o && o.fac && typeof OA == "function" && OA();

var Rl = (s) =>
  /party|relation .* does not exist|Could not find the (table|function)|snap/i.test(
    String(s && (s.message || s)),
  );

var Ln = (s) => e0(s);

var ia = (s) => String(s || "").toLowerCase();

var lt = () => ia(o && o.name);

var kr = new Set([15, 16, 93, 89, 86, 92, 282, 332, 159, 171, 173, 178]);

var wB = (s) =>
  s
    ? zl(s.snap)
      ? Date.now() - new Date(s.updated).getTime() > im
        ? "lâu không online"
        : "đang tải…"
      : "chờ đồng đội vào game bản mới"
    : "chưa đồng bộ nhân vật";

var H2 = () => !l.town && !l.tower && !(l.dg && l.dg.kind === "wb");

var TM = () => (l.allies || []).filter((s) => !s.dead);

var pB = 0.15;

var Yl = () => {
  if (Nn || !H2() || !l.allies || !l.allies.length) return 1;
  const s = Math.max(1, o.lvl | 0);
  return 1 + l.allies.reduce((A, n) => A + (pB * Math.min(s, n.l || 1)) / Math.max(s, n.l || 1), 0);
};

var om = (s) =>
  s.tgtA && !s.tgtA.dead && l.allies && l.allies.includes(s.tgtA) && H2() ? s.tgtA : null;

var rm = () =>
  H2() ? (l.allies || []).filter((s) => !s.dead).map((s) => ({ ally: s, y: s.y })) : [];

var DB = [
  "shaolin",
  "tianwang",
  "tangmen",
  "wudu",
  "emei",
  "cuiyan",
  "gaibang",
  "tianren",
  "wudang",
  "kunlun",
  "huashan",
];

var cm = (s) => {
  const A = DB.indexOf(s);
  return A < 0 ? 11 : A;
};

setInterval(() => In(!1), 5e3);

setInterval(() => {
  if (Nn) {
    (L.pid || (l.allies && l.allies.length)) &&
      ((L.pid = null), (L.mem = []), (l.allies = []), fi());
    return;
  }
  L.pid && ((!l.allies || (l.allies.some((s) => !s.J) && typeof P0 < "u" && P0)) && Gl(), fi());
}, 1e3);

document.addEventListener("visibilitychange", () => {
  document.hidden || In(!1);
});

var CM = () => !m("#modal").classList.contains("hidden") && !!m("#ptMgr");

var xr = (s) => X1(s);

setInterval(() => {
  (gB(), hi());
}, 1e3);

var s0 = { msgs: [], last: 0, pid: null, at: 0, unread: 0, off: !1 };

var Fl = () => lt();

var lm = (s) =>
  s.sys
    ? s
    : {
        id: s.id,
        ts: s.ts,
        name: s.name,
        fac: s.fac || "",
        lvl: s.lvl,
        msg: s.msg,
        cid: ia(s.name) === Fl() ? (typeof ta == "function" ? ta() : "me") : "p",
        pending: s.pending,
      };

setInterval(() => M2(!1), 4e3);
