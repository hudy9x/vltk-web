const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const acorn = require("acorn");
const { loadCombatEngine } = require('./helpers/combat-engine');
const { createServer } = require("../src/server/index.ts");
const { openDatabase } = require("../src/server/database.ts");
const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "src/client/dev/game-master-01.js"), "utf8");
function declaration(file, name) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  const node = acorn
    .parse(code, { ecmaVersion: "latest" })
    .body.find((n) => n.type === "VariableDeclaration" && n.declarations[0].id.name === name);
  return code.slice(node.start, node.end);
}
function game(development = true, gameMasterMode = "all") {
  const nodes = [];
  const listeners = {};
  const element = () => ({ setAttribute() {}, hidden: false });
  const s = {
    window: { localGameConfig: { development, gameMasterMode } },
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
  s.SKILL_RANGE_Y_RATIO = loadCombatEngine(s, { bridge: false }).SKILL_RANGE_Y_RATIO;
  for (const [file, name] of [
    ["src/client/gameplay/shop-and-books-01.js", "se"],
    ["src/client/gameplay/shop-and-books-01.js", "B4"],
    ["src/client/core/state-and-save-02.js", "d8"],
    ["src/client/gameplay/equipment-01.js", "x0"],
    ["src/client/ui/legacy-panels-and-audio-01.js", "Ef"],
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
test("GM level 150 awards level points once, preserves higher levels, and saves potential separately", () => {
  const s = game();
  s.G2 = () => 200;
  s.o.lvl = 20;
  s.o.xp = 123;
  s.gameMaster.grant("level150");
  assert.equal(s.o.lvl, 150);
  assert.equal(s.o.xp, 0);
  assert.equal(s.o.attrPts, 130 * s.z2);
  assert.equal(s.o.skPts, 130 * s.x5);
  s.gameMaster.grant("level150");
  assert.equal(s.o.attrPts, 130 * s.z2);
  s.o.lvl = 152;
  s.o.xp = 123;
  s.gameMaster.grant("level150");
  assert.equal(s.o.lvl, 152);
  assert.equal(s.o.xp, 123);
  s.gameMaster.grant("potential");
  assert.equal(s.saved.at(-1).attrPts, 130 * s.z2 + 3000);
  s.o.attrPts = Number.MAX_SAFE_INTEGER;
  assert.throws(() => s.gameMaster.grant("potential"), /an toàn/);
  s.o.lvl = 10;
  s.G2 = () => 100;
  assert.throws(() => s.gameMaster.grant("level150"), /Giới hạn cấp/);
  assert.equal(s.o.lvl, 10);
});
test("GM finds real level 90 skills for every faction, preserves learning progress, and maxes only learned skills", () => {
  const s = game();
  const catalog = {};
  catalog.window = catalog;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "public/data.js"), "utf8"), catalog);
  s.T = catalog.JX.skills;
  for (const skill of Object.values(s.T)) {
    if (skill.learn === "90") Object.assign(skill, { tier: 90, req: 80, book: "bk90" });
  }
  s.I = Object.fromEntries(catalog.JX.factions.filter(faction => faction.skills?.length).map(faction => [faction.key, faction]));
  vm.runInContext(declaration("src/client/gameplay/shop-and-books-01.js", "va"), s);
  vm.runInContext(declaration("src/client/combat/skills-01.js", "W2"), s);
  for (const faction of Object.values(s.I)) {
    const ids = faction.skills.filter(id => s.T[id]?.tier === 90);
    assert.ok(ids.length, faction.key);
    Object.assign(s.o, { fac: faction.key, lvl: 150, sk: {}, skL: {}, bkOk: {} });
    assert.throws(() => s.gameMaster.grant("max90"), /Hãy học/);
    const first = ids[0];
    s.o.sk[first] = 5;
    s.o.skL[first] = { lv: 5, xp: 42 };
    s.gameMaster.grant("learn90");
    assert.deepEqual(Object.keys(s.o.sk).sort(), Array.from(ids, String).sort());
    assert.equal(s.o.sk[first], 5);
    assert.equal(s.o.skL[first].xp, 42);
    assert.ok(ids.every(id => s.o.bkOk[id]));
    assert.equal(s.o.skPts, 0);
    if (ids.length > 1) delete s.o.sk[ids[1]];
    s.gameMaster.grant("max90");
    for (const id of ids.filter(id => id !== ids[1])) {
      assert.equal(s.saved.at(-1).sk[id], s.T[id].max);
      assert.equal(s.saved.at(-1).skL[id].lv, s.T[id].max);
      assert.equal(s.saved.at(-1).skL[id].xp, 0);
    }
    if (ids.length > 1) assert.equal(s.o.sk[ids[1]], undefined);
  }
  Object.assign(s.o, { fac: "wudang", lvl: 1, sk: {}, skL: {}, bkOk: {} });
  assert.throws(() => s.gameMaster.grant("learn90"), /Chưa đủ cấp/);
  assert.deepEqual(Object.keys(s.o.sk), []);
  s.o.fac = "vo0";
  assert.throws(() => s.gameMaster.grant("learn90"), /gia nhập/);
});
test("Can Khon ring grant moved out of GM into the equipment NPC", () => {
  const s = game();
  const panel = s.nodes.find(node => node.id === "gm-panel");
  assert.doesNotMatch(panel.innerHTML, /data-gm="rings"/);
  assert.throws(() => s.gameMaster.grant("rings"), /không hợp lệ/);
  assert.equal(s.o.inv.length, 0);
});
test("production exposes and permits every GameMaster grant when gameMasterMode is all", () => {
  const s = game(false, "all");
  const panel = s.nodes.find(node => node.id === "gm-panel");
  assert.ok(s.nodes.some(node => node.id === "gm-toggle"));
  assert.ok(s.nodes.some(node => node.id === "quick-sale-toggle"));
  for (const action of ["level150", "learn90", "max90", "gold", "knb", "xp"])
    assert.ok(panel.innerHTML.includes(`data-gm="${action}"`), action);
  for (const action of ["potential", "chest"]) {
    assert.ok(panel.innerHTML.includes(`data-gm="${action}"`), action);
  }
  assert.equal(s.o.attrPts, 0);
  assert.equal(s.o.inv.length, 0);
  assert.equal(s.saved.length, 0);
  s.gameMaster.grant("gold");
  s.gameMaster.grant("knb");
  s.gameMaster.grant("xp");
  assert.equal(s.o.gold, 1_000_000_000_007);
  assert.equal(s.o.knb, 100_003);
  assert.equal(s.o.lvl, 5);
  const earnedPoints=s.o.attrPts;s.gameMaster.grant("potential");assert.equal(s.o.attrPts,earnedPoints+3000);
  s.gameMaster.grant("chest");assert.equal(s.o.inv[0].ktc.c,100);
  assert.equal(s.c6(s.o.inv[0]), true);
  assert.equal(s.o.inv[0].ktc.c, 99);
  assert.equal(s.o.inv[1].n, "Đồ Thiếu Lâm");
});
test("development-only mode disables GM and quick sale in production while keeping earned chests usable", () => {
  const prod = game(false, "development");
  assert.equal(prod.gameMaster, null);
  assert.equal(prod.nodes.length, 0);
  prod.B4("gm_hk_shaolin", 1);
  assert.equal(prod.c6(prod.o.inv[0]), true);
  assert.equal(prod.o.inv[0].n, "Đồ Thiếu Lâm");
  const dev = game(true, "development");
  const panel = dev.nodes.find(node => node.id === "gm-panel");
  assert.ok(dev.gameMaster);
  assert.match(panel.innerHTML, /data-gm="potential"/);
  assert.match(panel.innerHTML, /data-gm="chest"/);
});
test("development retains potential and chest controls", () => {
  const s = game();
  const panel = s.nodes.find(node => node.id === "gm-panel");
  assert.match(panel.innerHTML, /data-gm="potential"/);
  assert.match(panel.innerHTML, /data-gm="chest"/);
});
test("GM range checkbox draws only the current skill at the moving hero, updates on skill change, and restores canvas state", () => {
  const s = game();
  s.QA = 0.81;
  s.v = { x: 120, y: 200 };
  s.l.P.main = { rad: 300 };
  const calls = [];
  const context = {
    save: () => calls.push("save"), restore: () => calls.push("restore"),
    setLineDash() {}, beginPath() {}, fill() {}, stroke() {},
    ellipse: (...args) => calls.push(args),
  };
  const panel = s.nodes.find(node => node.id === "gm-panel");
  assert.match(panel.innerHTML, /type="checkbox" id="gm-show-range"/);
  s.gameMaster.drawSkillRange(context);
  assert.equal(calls.length, 0);
  panel.onchange({ target: { id: "gm-show-range", checked: true } });
  s.gameMaster.drawSkillRange(context);
  assert.deepEqual(calls[1].slice(0, 2), [120, 200]);
  assert.ok(Math.abs(calls[1][2] - 243) < 1e-9);
  assert.ok(Math.abs(calls[1][3] - 145.8) < 1e-9);
  assert.equal(calls[0], "save");
  assert.equal(calls[2], "restore");
  calls.length = 0;
  s.v.x = 160;
  s.l.P.main = { rad: 600, geo: { k: "self", r: 96 } };
  s.gameMaster.drawSkillRange(context);
  assert.equal(calls.filter(Array.isArray).length, 1);
  assert.deepEqual(calls[1].slice(0, 4), [160, 200, 96 * 0.81, 96 * 0.81 * 0.6]);
  calls.length = 0;
  panel.onchange({ target: { id: "gm-show-range", checked: false } });
  s.gameMaster.drawSkillRange(context);
  assert.equal(calls.length, 0);
});
test('GM damage checkbox independently draws actual active fields, including SIM and hidden FX, without mutating combat',()=>{
  const s=game(),calls=[];
  Object.assign(s,{QA:.81,wf:1,v:{x:20,y:30}});
  Object.assign(s.l,{zoneShown:1,quiet:true,fx:[],combatProjectiles:[]});
  const cast={skill:{id:1078,geo:{k:'spot',r:512}},zone:1,actor:{x:900,y:900},elapsed:.4};
  const effect={k:'jm',kind:0,x:200,y:286,z:0,hz:0,age:7,combat:cast};
  s.l.combatProjectiles.push(effect,{...effect});
  const before=JSON.stringify(s.l.combatProjectiles);
  const context={save(){calls.push('save');},restore(){calls.push('restore');},setLineDash(){},
    beginPath(){},fill(){},stroke(){},ellipse(...args){calls.push(args);}};
  const panel=s.nodes.find(node=>node.id==='gm-panel');
  assert.match(panel.innerHTML,/type="checkbox" id="gm-show-damage"/);
  s.gameMaster.drawSkillRange(context);assert.equal(calls.length,0);
  panel.onchange({target:{id:'gm-show-damage',checked:true}});
  s.gameMaster.drawSkillRange(context);
  const ellipses=calls.filter(Array.isArray);
  assert.equal(ellipses.length,1,'overlapping field sprites share one overlay');
  assert.deepEqual(ellipses[0].slice(0,4),[200,300,512*.81,512*.81/2]);
  assert.equal(calls[0],'save');assert.equal(calls.at(-1),'restore');
  assert.equal(JSON.stringify(s.l.combatProjectiles),before,'drawing changes no combat state');
  calls.length=0;panel.onchange({target:{id:'gm-show-damage',checked:false}});
  s.gameMaster.drawSkillRange(context);assert.equal(calls.length,0);
});

test('GM damage overlay follows moving missiles, splash and self ellipses, and skips inactive/foreign-map effects',()=>{
  const s=game(),calls=[];Object.assign(s,{QA:.81,wf:1,v:{x:0,y:0}});
  s.E=(value,min,max)=>Math.max(min,Math.min(max,value));
  Object.assign(s.l,{zoneShown:1,combatProjectiles:[]});
  const cast=geo=>({skill:{geo},zone:1});
  s.l.combatProjectiles.push(
    {k:'mis',x:0,y:0,x1:0,y1:0,x2:100,y2:80,t:.5,life:1,combat:cast({area:96})},
    {k:'boom',x:20,y:36,t:.1,combat:cast({k:'self',r:170})},
    {k:'boom',x:500,y:500,t:-.1,combat:cast({r:500})},
    {k:'boom',x:500,y:500,t:0,contactAlive:false,combat:cast({r:500})},
    {k:'boom',x:500,y:500,t:0,combat:{...cast({r:500}),zone:2}},
  );
  const context={save(){},restore(){},setLineDash(){},beginPath(){},fill(){},stroke(){},
    ellipse(...args){calls.push(args);}};
  s.CombatEngine.drawSkillDamageAreas(context);
  assert.equal(calls.length,3);
  assert.deepEqual(calls[0].slice(0,4),[50,54,8,4]);
  assert.deepEqual(calls[1].slice(0,4),[50,54,96*.81,96*.81/2]);
  assert.deepEqual(calls[2].slice(0,4),[20,50,170*.81,170*.81*.6]);
});

test('GM damage overlay draws oriented rectangular fields using collision dimensions',()=>{
  const s=game(),points=[];s.QA=.81;
  Object.assign(s.l,{zoneShown:1,combatProjectiles:[{k:'boom',x:800,y:800,t:0,
    combat:{zone:1,origin:{x:100,y:86},direction:Math.PI/2,
      skill:{geo:{k:'self',shape:'rect',len:200,width:24}}}}]});
  s.CombatEngine.drawSkillDamageAreas({save(){},restore(){},setLineDash(){},beginPath(){},fill(){},stroke(){},
    closePath(){},moveTo(...args){points.push(args);},lineTo(...args){points.push(args);}});
  assert.equal(points.length,4);
  assert.ok(Math.abs(points[0][0]-(100+12*.81))<1e-9);
  assert.ok(Math.abs(points[0][1]-100)<1e-9);
  assert.ok(Math.abs(points[1][1]-(100+200*.81/2))<1e-9);
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
  const { app, server } = createServer({ db, development: true, downloadAssets: false });
  await app.ready();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    assert.deepEqual(
      await (await fetch(`http://127.0.0.1:${server.address().port}/api/config`)).json(),
      { development: true },
    );
  } finally {
    await app.close();
    db.close();
  }
});

test('GM adds 10,000 accumulated military merit to the current character and saves without displaying its balance',()=>{
 const s=game(false),panel=s.nodes.find(node=>node.id==='gm-panel');assert.match(panel.innerHTML,/data-gm="warMerit"/);
 const message=s.gameMaster.grant('warMerit');assert.equal(s.o.mats.misc.tk_merit,10000);assert.equal(s.saved.at(-1).mats.misc.tk_merit,10000);assert.match(message,/Quan Quân Nhu/);
 s.gameMaster.grant('warMerit');assert.equal(s.o.mats.misc.tk_merit,20000);assert.doesNotMatch(panel.innerHTML,/20.000/);
 const first=s.o;s.o={fac:'shaolin',mats:{misc:{tk_merit:300}}};s.gameMaster.grant('warMerit');assert.equal(s.o.mats.misc.tk_merit,10300);assert.equal(first.mats.misc.tk_merit,20000);
 s.o.mats.misc.tk_merit=Number.MAX_SAFE_INTEGER;assert.throws(()=>s.gameMaster.grant('warMerit'),/giới hạn/);assert.equal(s.o.mats.misc.tk_merit,Number.MAX_SAFE_INTEGER);
});

test('GM learns real 120/150 skills for every faction and maxes only learned 90/150 skills', () => {
  const s = game(false);
  const catalog = {};
  catalog.window = catalog;
  vm.createContext(catalog);
  for (const file of ['public/data.js', 'src/client/data/projectile-effects-01.js', 'src/client/data/projectile-effects-02.js', 'src/client/data/advanced-skills-01.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), catalog);
  s.T = catalog.JX.skills;
  for (const skill of Object.values(s.T))
    if (skill.learn === '90') Object.assign(skill, { tier: 90, req: 80 });
  s.I = Object.fromEntries(catalog.JX.factions.filter(f => f.skills?.length).map(f => [f.key, f]));
  vm.runInContext(declaration('src/client/gameplay/shop-and-books-01.js', 'va'), s);
  vm.runInContext(declaration('src/client/combat/skills-01.js', 'W2'), s);
  const panel = s.nodes.find(node => node.id === 'gm-panel');
  assert.match(panel.innerHTML, /data-gm="learn120"/);
  assert.match(panel.innerHTML, /data-gm="learn150"/);
  assert.match(panel.innerHTML, /Nâng tối đa các chiêu cấp 90 và 150 đã học/);
  for (const faction of Object.values(s.I)) {
    Object.assign(s.o, { fac: faction.key, lvl: 150, sk: {}, skL: {}, bkOk: {} });
    for (const tier of [120, 150]) {
      const ids = faction.skills.filter(id => s.T[id]?.tier === tier);
      assert.ok(ids.length, `${faction.key}: ${tier}`);
      s.o.lvl = tier - 1;
      assert.throws(() => s.gameMaster.grant(`learn${tier}`), /Chưa đủ cấp/);
      assert.ok(ids.every(id => !s.o.sk[id]));
      s.o.lvl = 150;
      s.gameMaster.grant(`learn${tier}`);
      assert.ok(ids.every(id => s.o.sk[id] === 1 && s.o.bkOk[id] === 1));
      const first = ids[0];
      s.o.sk[first] = 5;
      s.o.skL[first] = { lv: 5, xp: 42 };
      s.gameMaster.grant(`learn${tier}`);
      assert.equal(s.o.sk[first], 5);
      assert.equal(s.o.skL[first].xp, 42);
    }
    s.gameMaster.grant('learn90');
    const skipped = faction.skills.find(id => s.T[id]?.tier === 150);
    delete s.o.sk[skipped];
    s.gameMaster.grant('max90');
    assert.equal(s.o.sk[skipped], undefined);
    for (const id of faction.skills.filter(id => s.o.sk[id])) {
      const skill = s.T[id];
      assert.equal(s.saved.at(-1).sk[id], skill.tier === 120 ? s.o.sk[id] : skill.max);
      if (skill.tier !== 120) {
        assert.equal(s.o.skL[id].lv, skill.max);
        assert.equal(s.o.skL[id].xp, 0);
      }
    }
    assert.equal(s.o.skPts, 0);
  }
});
