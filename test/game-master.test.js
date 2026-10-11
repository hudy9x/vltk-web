const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const acorn = require("acorn");
const { createServer } = require("../server");
const { openDatabase } = require("../server/database");
const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "app/dev/game-master-01.js"), "utf8");
function declaration(file, name) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  const node = acorn
    .parse(code, { ecmaVersion: "latest" })
    .body.find((n) => n.type === "VariableDeclaration" && n.declarations[0].id.name === name);
  return code.slice(node.start, node.end);
}
function game(development = true) {
  const nodes = [];
  const listeners = {};
  const element = () => ({ setAttribute() {}, hidden: false });
  const s = {
    window: { localGameConfig: { development } },
    document: {
      createElement: element,
      head: { appendChild() {} },
      body: { appendChild: (n) => nodes.push(n), classList: { toggle() {} } },
      addEventListener: (name, handler) => {
        listeners[name] = handler;
      },
    },
    nodes,
    listeners,
    inspected: [],
    He: (item) => s.inspected.push(item),
    n0() {},
    q: String,
    fA() {},
    I: { shaolin: { id: 0, n: "Thiếu Lâm" }, wudang: { id: 1, n: "Võ Đang" } },
    o: {
      fac: "shaolin",
      lvl: 1,
      xp: 0,
      gold: 7,
      knb: 3,
      attrPts: 0,
      skPts: 0,
      inv: [],
      uid: 1,
      tanthuXp: 1,
    },
    l: { P: { expPct: 25 } },
    J0: [],
    R: false,
    Wi: 999,
    INV_MAX: 3,
    S: {
      exp: [10, 20, 30, 40, 50],
      sets: {
        gold: [
          {
            n: "Đồ Thiếu Lâm",
            req: [
              [39, 0],
              [36, 1],
            ],
          },
          {
            n: "Đồ Võ Đang",
            req: [
              [39, 1],
              [36, 1],
            ],
          },
        ],
      },
    },
    saved: [],
    messages: [],
    $() {
      s.saved.push(JSON.parse(JSON.stringify(s.o)));
    },
    V() {},
    k: (msg) => s.messages.push(msg),
    c6: () => false,
    k1: () => true,
    cA: () => true,
    c3: () => true,
    C0: (items) => items[0],
    Ta: (kind, item) => ({ uid: s.o.uid++, n: item.n, req: item.req }),
    D: (s) => s,
    C: () => {},
    ye: 2,
    v0: () => 0,
    mo: () => ({ xp: 0.5 }),
    Lt: () => 0,
    G2: () => 5,
    z2: 5,
    x5: 1,
    o0() {},
    Gm() {},
    af() {},
  };
  vm.createContext(s);
  for (const [file, name] of [
    ["app/gameplay/shop-and-books-01.js", "se"],
    ["app/gameplay/shop-and-books-01.js", "B4"],
    ["app/core/state-and-save-02.js", "d8"],
    ["app/gameplay/equipment-01.js", "x0"],
    ["app/ui/legacy-panels-and-audio-01.js", "Ef"],
  ])
    vm.runInContext(declaration(file, name), s);
  vm.runInContext(source, s);
  return s;
}
test("GM grants exact currencies and XP through real level-up logic; rejects absent characters and unsafe balances", () => {
  const s = game();
  s.gameMaster.grant("gold");
  s.gameMaster.grant("knb");
  assert.equal(s.o.gold, 1_000_000_000_007);
  assert.equal(s.o.knb, 100_003);
  s.gameMaster.grant("xp");
  assert.equal(s.o.lvl, 5);
  assert.equal(s.o.attrPts, 20);
  assert.equal(s.o.skPts, 4);
  assert.equal(s.o.xp + 10 + 20 + 30 + 40, 100_000_000);
  assert.equal(s.saved.length, 3);
  assert.throws(() => s.gameMaster.grant("xp"), /giới hạn cấp/);
  s.o.gold = Number.MAX_SAFE_INTEGER;
  assert.throws(() => s.gameMaster.grant("gold"), /an toàn/);
  s.o.fac = null;
  assert.throws(() => s.gameMaster.grant("knb"), /vào game/);
});
test("GM chests stack, preserve the rewarded faction, and never consume a chest when inventory is full", () => {
  const s = game();
  s.gameMaster.grant("chest");
  s.gameMaster.grant("chest");
  assert.equal(s.o.inv.length, 1);
  assert.equal(s.o.inv[0].ktc.c, 200);
  const chest = s.o.inv[0];
  s.o.fac = "wudang";
  assert.equal(s.c6(chest), true);
  assert.equal(chest.ktc.c, 199);
  assert.equal(s.o.inv[1].n, "Đồ Thiếu Lâm");
  assert.equal(s.o.inv[1].lock, true);
  s.o.inv.push({ n: "Full" });
  assert.equal(s.c6(chest), false);
  assert.equal(chest.ktc.c, 199);
  // Only 50 spaces remain in the existing stack and no empty inventory slots.
  s.o.fac = "shaolin";
  chest.ktc.c = 949;
  assert.throws(() => s.gameMaster.grant("chest"), /không đủ chỗ/);
  assert.equal(chest.ktc.c, 949);
  chest.ktc.c = 1;
  assert.equal(s.c6(chest), true);
  assert.equal(s.o.inv.length, 3);
});
test("GM grants two independent original Can Khon rings with +2 all skills and rejects insufficient inventory space", () => {
  const s = game();
  const catalog = {};
  catalog.window = catalog;
  for (const file of ["data.js", "setvi.js"])
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), "utf8"), catalog);
  s.S = catalog.JX;
  for (const name of ["Pn", "Ta"])
    vm.runInContext(declaration("app/gameplay/crafting-01.js", name), s);
  s.gameMaster.grant("rings");
  assert.equal(s.o.inv.length, 2);
  assert.notEqual(s.o.inv[0].uid, s.o.inv[1].uid);
  for (const ring of s.o.inv) {
    assert.equal(ring.n, "Càn Khôn Giới Chỉ");
    assert.equal(ring.ic, "img/i/g44.png");
    assert.equal(ring.lvl, 10);
    assert.equal(ring.s, 0);
    assert.equal(ring.lock, true);
    assert.equal(ring.set.kind, "gold");
    assert.equal(ring.req.find(([kind]) => kind === 36)[1], 60);
    assert.equal(ring.mag.find((m) => m.a === 139).p[0], 2);
  }
  assert.notEqual(s.o.inv[0].mag, s.o.inv[1].mag);
  assert.equal(s.saved.at(-1).inv.length, 2);
  const uid = s.o.uid;
  assert.throws(() => s.gameMaster.grant("rings"), /2 ô trống/);
  assert.equal(s.o.inv.length, 2);
  assert.equal(s.o.uid, uid);
});
test("production has no GM controls or grants, while previously earned chests remain usable", () => {
  const s = game(false);
  assert.equal(s.gameMaster, null);
  assert.equal(s.nodes.length, 0);
  s.B4("gm_hk_shaolin", 1);
  assert.equal(s.c6(s.o.inv[0]), true);
  assert.equal(s.o.inv[0].n, "Đồ Thiếu Lâm");
});
test("quick sale sells clicked inventory items without confirmation, unlocks locked items, saves, and stops on Escape", () => {
  const s = game();
  const item = { uid: 3, n: "Ngựa", d: 10, price: 100, mag: [] },
    locked = { uid: 4, n: "Đồ khóa", lock: true, d:10, price:200, mag:[] };
  s.o.inv.push(item, locked);
  s.gameMaster.setQuickSale(true);
  s.He(item);
  assert.equal(s.o.gold, 17);
  assert.equal(s.o.inv.includes(item), false);
  assert.equal(s.inspected.length, 0);
  assert.equal(s.saved.at(-1).gold, 17);
  s.He(locked);
  assert.equal(s.o.inv.includes(locked), false);
  assert.equal(locked.lock, undefined);
  assert.equal(s.o.gold,37);
  assert.equal(s.saved.at(-1).inv.length,0);
  const equipped = { uid: 5, n: "Đang mặc" };
  s.He(equipped, "weapon");
  assert.equal(s.inspected.at(-1), equipped);
  let intercepted = false;
  s.listeners.keydown({
    key: "Escape",
    preventDefault() {},
    stopImmediatePropagation() {
      intercepted = true;
    },
  });
  assert.equal(intercepted, true);
  assert.equal(s.gameMaster.quickSale, false);
  s.He(locked);
  assert.equal(s.inspected.at(-1), locked);
});
test("development is explicitly advertised by the development server", async () => {
  const db = openDatabase(":memory:");
  const { server } = createServer({ db, development: true, downloadAssets: false });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    assert.deepEqual(
      await (await fetch(`http://127.0.0.1:${server.address().port}/api/config`)).json(),
      { development: true },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
