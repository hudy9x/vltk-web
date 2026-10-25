const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const ROOT = path.resolve(__dirname, '..');

function declaration(s, file, name) {
  const source = fs.readFileSync(path.join(ROOT, 'src/client', file), 'utf8');
  const node = acorn.parse(source, { ecmaVersion: 'latest' }).body.find(node =>
    node.type === 'VariableDeclaration' && node.declarations.some(d => d.id.name === name));
  assert.ok(node, name);
  vm.runInContext(source.slice(node.start, node.end), s);
}

function game(faction = 'wudang', points = 100) {
  const nodes = new Map();
  const s = { Math, Set, Map, console, PotentialAllocation: { config: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/client/config/potential-allocation.json'), 'utf8')) }, o: {
    fac: faction, lvl: 150, sk: {}, skL: {}, skPts: points, bkOk: {}, mats: { misc: { bk90: 1 } },
    attr: { str: 0, dex: 0, vit: 0, eng: 0 }, attrPts: 0, main: 0, mainLock: false,
  }, l: { sim: false, buffAssume: false }, GA: () => s.o.lvl, v0: () => 0,
    N: (_, id) => s.o.mats.misc[id] || 0,
    U: (_, id, count) => { s.o.mats.misc[id] = (s.o.mats.misc[id] || 0) + count; },
    D: String, C() {}, k() {}, D0() {}, $() {}, V() {}, j0: () => 100, G0: value => value,
    e4: () => ({ total: 0, list: [] }), nn: { str: 'Sức mạnh', dex: 'Thân pháp', vit: 'Sinh khí', eng: 'Nội công' },
    m: id => nodes.get(id), document: { querySelectorAll: selector => [...nodes.values()].filter(node =>
      selector.includes('data-potential-profile') ? node.dataset.potentialProfile : node.dataset.skillRoute) },
  };
  s.window = s;
  vm.createContext(s);
  for (const file of ['public/data.js', 'src/client/data/projectile-effects-01.js',
    'src/client/data/projectile-effects-02.js', 'src/client/data/advanced-skills-01.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), s);
  s.T = s.JX.skills;
  s.I = Object.fromEntries(s.JX.factions.map(f => [f.key, f]));
  for (const skill of Object.values(s.T)) if (skill.learn === '90') Object.assign(skill, { tier: 90, req: 80, book: 'bk90' });
  for (const name of ['ee', 'SA', 'P4', 'va']) declaration(s, 'gameplay/shop-and-books-01.js', name);
  for (const name of ['D4', 'm4', 'W2', 'Yi', 'Fi']) declaration(s, 'combat/skills-01.js', name);
  for (const name of ['Ni', 'Q1', 'Pt', 'yt']) declaration(s, 'core/attributes-02.js', name);
  declaration(s, 'gameplay/skill-progression-01.js', 'unlockSkillBook');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/client/gameplay/skill-routes-01.js'), 'utf8'), s);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/client/gameplay/potential-routes-01.js'), 'utf8'), s);
  for (const name of ['Ik', 'pg']) declaration(s, 'systems/activities-and-stash-06.js', name);
  for (const name of ['Nk', 'D2']) declaration(s, 'systems/activities-and-stash-07.js', name);
  s.J = (html, ready) => {
    s.html = html; nodes.clear();
    for (const match of html.matchAll(/<button\b([^>]*)>/g)) {
      const id = match[1].match(/\bid="([^"]+)"/)?.[1];
      if (!id) continue;
      const route = match[1].match(/data-skill-route="([^"]+)"/)?.[1];
      const profile = match[1].match(/data-potential-profile="([^"]+)"/)?.[1];
      nodes.set('#' + id, { dataset: { skillRoute: route, potentialProfile: profile }, disabled: /\bdisabled\b/.test(match[1]),
        focus() { s.focused = id; }, click() { if (!this.disabled) this.onclick?.(); } });
    }
    ready?.();
  };
  s.nodes = nodes;
  return s;
}

test('all ten factions expose distinct, valid point-based routes with real icons and complete finisher prerequisites', () => {
  const s = game();
  assert.equal(Object.keys(s.skillRouteCatalog).length, 10);
  for (const [faction, catalog] of Object.entries(s.skillRouteCatalog)) {
    s.o.fac = faction;
    const routes = s.getSkillRoutes();
    assert.ok(routes.length >= 2);
    assert.equal(new Set(routes.map(route => route.id)).size, routes.length);
    for (const route of routes) {
      assert.equal(route.skills.length, new Set([...catalog.shared, ...catalog.routes.find(r => r.id === route.id).skills]).size);
      for (const id of [...route.skills, ...(route.main || [])]) {
        assert.ok(s.T[id], `${faction}/${route.id}: missing ${id}`);
        assert.ok(s.I[faction].skills.includes(id), `${faction}/${route.id}: foreign skill ${id}`);
        assert.ok(fs.existsSync(path.join(ROOT, 'public', s.T[id].ic)));
      }
      for (const id of route.skills) {
        assert.ok(![90, 120, 150].includes(s.T[id].tier) || s.SA(id));
      }
      if (route.finisher) for (const id of s.ee[route.finisher]) assert.ok(route.skills.includes(id));
    }
  }
});

test('planning is read-only; applying spends exactly the preview on the chosen branch and preserves other/trained skills', () => {
  const s = game('wudang', 51);
  s.o.sk = { 151: 7, 365: 12, 1078: 4, 716: 2 };
  s.o.skL = { 365: { lv: 12, xp: 10 }, 1078: { lv: 4, xp: 2 } };
  const before = JSON.stringify(s.o), plan = s.planSkillRoute('qi');
  assert.equal(JSON.stringify(s.o), before);
  assert.equal(plan.spent, 51);
  assert.equal(s.applySkillRoute('qi'), 51);
  assert.equal(s.o.skPts, 0);
  assert.equal(s.o.skillRoute, 'qi');
  for (const row of plan.rows) assert.equal(s.o.sk[row.id] || 0, row.to);
  for (const [id, level] of [[151, 7], [365, 12], [1078, 4], [716, 2]]) assert.equal(s.o.sk[id], level);
  assert.equal(JSON.stringify(s.o.skL), JSON.stringify(JSON.parse(before).skL));
  assert.equal(s.o.mats.misc.bk90, 1);
  assert.equal(s.applySkillRoute('qi'), 0);
});

test('every branch can spend to its legal caps without leaking to another branch or advanced/trained skills', () => {
  const s = game();
  for (const faction of Object.keys(s.skillRouteCatalog)) {
    s.o.fac = faction;
    for (const route of s.getSkillRoutes()) {
      s.o.sk = {}; s.o.skL = {}; s.o.skPts = 10000; s.o.bkOk = {}; s.o.mats.misc.bk90 = 1;
      const plan = s.planSkillRoute(route.id);
      assert.equal(s.applySkillRoute(route.id), plan.spent, `${faction}/${route.id}`);
      assert.equal(10000 - s.o.skPts, Object.values(s.o.sk).reduce((sum, value) => sum + value, 0));
      for (const row of plan.rows) assert.equal(s.o.sk[row.id], row.skill.max, `${faction}/${route.id}/${row.id}`);
      for (const id of Object.keys(s.o.sk)) assert.ok(route.skills.includes(+id));
      assert.deepEqual(Object.keys(s.o.skL), []);
    }
  }
});

test('curse/support/trap 8x unlocks only after every prerequisite reaches five and consumes points plus one book', () => {
  for (const [faction, routeId, finisher] of [
    ['wudu', 'curse', 390], ['tianren', 'curse', 391], ['kunlun', 'curse', 394],
    ['emei', 'support', 332], ['tangmen', 'trap', 351],
  ]) {
    const s = game(faction, 1), prerequisites = s.ee[finisher];
    for (const id of prerequisites) s.o.sk[id] = 5;
    s.o.sk[prerequisites.at(-1)] = 4;
    const capBefore = s.D4(finisher);
    assert.equal(capBefore, 0);
    // Max out shared skills to isolate the prerequisite/finisher allocation.
    for (const id of s.skillRouteCatalog[faction].shared) s.o.sk[id] = s.T[id].max;
    s.applySkillRoute(routeId);
    assert.equal(s.o.sk[prerequisites.at(-1)], 5);
    assert.equal(s.o.sk[finisher], undefined);
    s.o.skPts = 1;
    const plan = s.planSkillRoute(routeId);
    assert.equal(plan.rows.find(row => row.id === finisher).add, 1);
    assert.equal(s.o.mats.misc.bk90, 1, 'preview must not consume the book');
    s.applySkillRoute(routeId);
    assert.equal(s.o.sk[finisher], 1);
    assert.equal(s.o.skPts, 0);
    assert.equal(s.o.mats.misc.bk90, 0);
    assert.equal(s.o.skL[finisher], undefined, 'point-based 8x must not gain training progress');
    s.o.skPts = 30; s.applySkillRoute(routeId);
    const levels = prerequisites.map(id => s.o.sk[id]);
    assert.ok(Math.max(...levels) - Math.min(...levels) <= 1);
    assert.ok(s.o.sk[finisher] <= s.D4(finisher));
    assert.equal(s.o.mats.misc.bk90, 0, 'learned finisher needs no second book');
  }
});

test('level and missing-book gates remain authoritative and no advanced book is consumed', () => {
  const s = game('kunlun', 500);
  s.o.lvl = 79; s.o.mats.misc = { bk90: 1, bk120: 2, bk150: 2 };
  s.applySkillRoute('curse');
  assert.equal(s.o.sk[394], undefined);
  assert.equal(s.o.mats.misc.bk90, 1);
  for (const id of s.getSkillRoutes().find(route => route.id === 'curse').skills) {
    if (id !== 394) assert.ok((s.o.sk[id] || 0) <= s.Ni(s.T[id]));
  }
  s.o.lvl = 150; s.o.skPts = 500; s.o.mats.misc.bk90 = 0;
  const plan = s.planSkillRoute('curse');
  assert.match(plan.rows.find(row => row.id === 394).reason, /Bí Kíp 90/);
  s.applySkillRoute('curse');
  assert.equal(s.o.sk[394], undefined);
  assert.equal(s.o.mats.misc.bk120, 2);
  assert.equal(s.o.mats.misc.bk150, 2);
  s.o.lvl = 10; s.o.sk = {}; s.o.skPts = 100;
  s.applySkillRoute('blade');
  assert.equal(s.o.sk[167], 1); assert.equal(s.o.sk[169], 1);
  assert.equal(s.o.sk[176], undefined);
});

test('route inference follows main/saved branch and auto points continue the accepted branch', () => {
  const s = game('wudang', 10);
  s.o.main = 368;
  assert.equal(s.selectSkillRoute().id, 'sword');
  s.applySkillRoute('qi');
  assert.equal(s.selectSkillRoute().id, 'qi');
  s.o.skPts = 10;
  const plan = s.planSkillRoute();
  assert.equal(s.Pt(), plan.spent);
  for (const row of plan.rows) assert.equal(s.o.sk[row.id], row.to);
  assert.equal(s.o.sk[151], undefined);
  s.o.skillRoute = 'nonexistent'; s.o.main = 0;
  assert.equal(s.selectSkillRoute().id, 'qi');
  s.o.fac = 'novice-earth';
  assert.equal(s.getSkillRoutes().length, 0);
  assert.equal(s.applySkillRoute('qi'), 0);
});

test('dialog shows icons, tabs and preview; switching tabs is read-only and one agreement applies the current route', () => {
  const s = game('wudang', 20), before = JSON.stringify(s.o);
  s.D2();
  assert.equal(JSON.stringify(s.o), before);
  assert.match(s.html, /role="tablist"/);
  assert.match(s.html, /img\/s\/152.png/);
  assert.match(s.html, /Hiện tại → Đề xuất/);
  assert.doesNotMatch(s.html, /img\/s\/(365|368|716|1078|1079).png/);
  s.nodes.get('#route-sword').click();
  assert.equal(JSON.stringify(s.o), before);
  assert.match(s.html, /img\/s\/151.png/);
  assert.equal(s.focused, 'route-sword');
  // Recompute from the live point budget when confirming a previously rendered preview.
  s.o.skPts = 3;
  s.nodes.get('#sgSk').click();
  assert.equal(s.o.skPts, 0);
  assert.equal(s.o.skillRoute, 'sword');
  assert.equal(Object.values(s.o.sk).reduce((sum, value) => sum + value, 0), 3);
  assert.equal(s.o.sk[152], undefined);
  assert.equal(s.nodes.get('#sgSk').disabled, true);
});

test('route tabs support arrow keys and support tab explains the actual prerequisite gate', () => {
  const s = game('kunlun', 100);
  s.D2('sword');
  let prevented = false;
  s.nodes.get('#route-sword').onkeydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(s.focused, 'route-curse');
  assert.match(s.html, /Tăng đều 6 kỹ năng nền/);
  assert.match(s.html, /img\/s\/394.png/);
  assert.match(s.html, /Chiêu 8x · cộng bằng điểm/);
  assert.equal(s.o.skPts, 100);
});

test('every branch uses the configured potential ratio and the preview never changes character state', () => {
  const s = game();
  s.o.attrPts = 745;
  for (const faction of Object.keys(s.skillRouteCatalog)) {
    s.o.fac = faction;
    for (const route of s.getSkillRoutes()) {
      const options = s.getPotentialProfiles(route.id);
      assert.equal(options.profiles.length, 1);
      for (const profile of options.profiles) {
        assert.equal(profile.weights.reduce((sum, value) => sum + value, 0), 100);
        const before = JSON.stringify(s.o), plan = s.planPotentialRoute(route.id, profile.id);
        assert.equal(JSON.stringify(s.o), before);
        assert.equal(plan.spent, 745);
        assert.equal(plan.remaining, 0);
        assert.equal(plan.rows.reduce((sum, row) => sum + row.add, 0), 745);
        for (const row of plan.rows) {
          assert.ok(Number.isInteger(row.add) && row.add >= 0);
          assert.ok(Math.abs(row.add - 745 * row.weight / 100) <= 1);
        }
      }
    }
  }
});

test('potential profile families follow actual branch damage: melee, thrown, spell and Wudang shields', () => {
  const s = game('wudang');
  assert.equal(s.getPotentialProfiles('sword').type, 'swordShield');
  assert.equal(s.getPotentialProfiles('qi').type, 'shield');
  s.o.fac = 'tangmen';
  assert.equal(s.getPotentialProfiles('dart').type, 'ranged');
  assert.equal(s.getPotentialProfiles('trap').type, 'spell');
  assert.equal(s.planPotentialRoute('trap', 'offense').profile.id, 'configured');
  s.o.fac = 'kunlun';
  assert.equal(s.getPotentialProfiles('blade').type, 'physical');
  assert.equal(s.getPotentialProfiles('sword').type, 'spell');
  assert.equal(s.getPotentialProfiles('curse').type, 'spell');
  assert.ok(!s.getPotentialProfiles('curse').profiles.some(profile => profile.id === 'offense'));
  s.o.fac = 'novice-earth';
  assert.equal(s.planPotentialRoute().spent, 0);
  assert.equal(s.applyPotentialRoute(), 0);
});

test('potential pays real equipment requirements first, including overlapping requirements and an insufficient budget', () => {
  const s = game('kunlun');
  s.o.attrPts = 45;
  s.o.eq = {
    weapon: { n: 'Đao', req: [[36, 20], [32, 50], [33, 30]] },
    armor: { n: 'Áo', req: [[36, 10], [32, 40]] },
  };
  s.X2 = { 32: 'str', 33: 'dex', 34: 'vit', 35: 'eng' };
  s.c1 = key => 10 + s.o.attr[key];
  declaration(s, 'core/attributes-02.js', 'e4');
  const plan = s.planPotentialRoute('curse', 'survival');
  assert.equal(plan.requirements.total, 60);
  assert.equal(plan.equipmentSpent, 45);
  assert.equal(plan.equipmentMissing, 15);
  assert.equal(plan.rows.find(row => row.key === 'str').to, 40);
  assert.equal(plan.rows.find(row => row.key === 'dex').to, 5);
  assert.equal(plan.rows.find(row => row.key === 'vit').to, 0);
  assert.equal(s.applyPotentialRoute('curse', 'survival'), 45);
  assert.equal(s.o.attrPts, 0);
  s.o.attrPts = 115;
  const next = s.planPotentialRoute('curse', 'survival');
  assert.equal(next.equipmentSpent, 15);
  assert.equal(next.equipmentMissing, 0);
  s.applyPotentialRoute('curse', 'survival');
  assert.ok(s.c1('str') >= 50 && s.c1('dex') >= 30);
  assert.equal(Object.values(s.o.attr).reduce((sum, value) => sum + value, 0), 160);
});

test('potential apply preserves existing points, skills, gear and resources, and replans a stale preview', () => {
  const s = game('wudang');
  s.o.attr = { str: 70, dex: 10, vit: 20, eng: 0 };
  s.o.attrPts = 100; s.o.sk = { 365: 12 }; s.o.eq = { weapon: { n: 'Kiếm đang mặc' } };
  const before = JSON.stringify(s.o), preview = s.planPotentialRoute('qi', 'mana');
  assert.equal(JSON.stringify(s.o), before);
  assert.equal(preview.spent, 100);
  s.o.attrPts = 7;
  const livePlan = s.planPotentialRoute('qi', 'mana');
  assert.equal(s.applyPotentialRoute('qi', 'mana'), 7);
  assert.equal(s.o.attrPts, 0);
  for (const row of livePlan.rows) assert.equal(s.o.attr[row.key], row.to);
  assert.equal(s.o.attr.str, 70, 'old off-branch points are never withdrawn');
  for (const key of ['sk', 'skL', 'skPts', 'eq', 'mats']) assert.equal(JSON.stringify(s.o[key]), JSON.stringify(JSON.parse(before)[key]));
  assert.equal(s.o.skillRoute, 'qi');
  assert.equal(s.o.potentialStyle, undefined);
  assert.equal(s.applyPotentialRoute('qi', 'mana'), 0);
});

test('single-point auto allocation converges to the same ratio as a bulk grant and follows the saved plan', () => {
  const once = game('tangmen'), streaming = game('tangmen');
  once.o.attrPts = 101;
  once.applyPotentialRoute('dart', 'balanced');
  streaming.o.skillRoute = 'dart'; streaming.o.potentialStyle = 'mana';
  for (let i = 0; i < 101; i++) {
    streaming.o.attrPts = 1;
    assert.equal(streaming.yt(), 1);
  }
  assert.equal(JSON.stringify(once.o.attr), JSON.stringify(streaming.o.attr));
  assert.ok(streaming.o.attr.dex > streaming.o.attr.vit);
  assert.equal(streaming.o.attr.str, 0);
  assert.equal(streaming.o.attr.eng, 0);
});

test('potential dialog follows the JSON for the selected branch and confirms without spending skill points', () => {
  const s = game('wudang', 30);
  s.o.attrPts = 100;
  const before = JSON.stringify(s.o);
  s.D2('qi');
  assert.match(s.html, /Tiềm năng · Khí công/);
  assert.match(s.html, /không trực tiếp tăng sát thương phép/);
  assert.match(s.html, /Tọa Vọng Vô Ngã/);
  assert.match(s.html, /Tỷ lệ riêng của tuyến/);
  assert.doesNotMatch(s.html, /data-potential-profile/);
  assert.equal(JSON.stringify(s.o), before);
  assert.equal(s.planPotentialRoute('qi').rows.find(row => row.key === 'eng').weight, 30);
  s.o.attrPts = 5;
  s.nodes.get('#sgAt').click();
  assert.equal(s.o.attrPts, 0);
  assert.equal(s.o.skPts, 30);
  assert.equal(Object.values(s.o.attr).reduce((sum, value) => sum + value, 0), 5);
  assert.equal(s.nodes.get('#sgAt').disabled, true);
  s.nodes.get('#route-sword').click();
  assert.match(s.html, /Tiềm năng · Kiếm pháp/);
  assert.equal(s.planPotentialRoute('sword').rows.find(row => row.key === 'str').weight, 50);
});

test('defaults and route overrides are read directly from JSON, including Cái Bang internal/external builds', () => {
  const s = game('gaibang');
  s.o.attrPts = 100;
  s.o.potentialStyle = 'mana';
  assert.equal(JSON.stringify(s.planPotentialRoute('staff').rows.map(row => row.add)), '[65,5,30,0]');
  assert.equal(JSON.stringify(s.planPotentialRoute('palm').rows.map(row => row.add)), '[0,5,90,5]');
  s.potentialAllocationConfig.defaults.internal = { str: 0, dex: 10, vit: 80, eng: 10 };
  assert.equal(JSON.stringify(s.planPotentialRoute('palm').rows.map(row => row.add)), '[0,10,80,10]');
  s.o.fac = 'wudang';
  assert.equal(JSON.stringify(s.planPotentialRoute('qi').rows.map(row => row.add)), '[0,5,65,30]');
  for (const [faction, routes] of Object.entries(s.potentialAllocationConfig.overrides))
    for (const route of Object.keys(routes)) assert.ok(s.skillRouteCatalog[faction].routes.some(entry => entry.id === route));
});

test('equipment points are excluded from ratios and repeated single-point allocation matches a bulk grant', () => {
  const once = game('gaibang'), streaming = game('gaibang');
  for (const s of [once, streaming]) {
    s.o.eq = { weapon: { req: [[32, 20]] } };
    s.X2 = { 32: 'str', 33: 'dex', 34: 'vit', 35: 'eng' };
    s.c1 = key => 10 + s.o.attr[key];
    declaration(s, 'core/attributes-02.js', 'e4');
    s.o.skillRoute = 'staff';
  }
  once.o.attrPts = 110;
  once.applyPotentialRoute('staff');
  assert.equal(JSON.stringify(once.o.attr), '{"str":75,"dex":5,"vit":30,"eng":0}');
  for (let i = 0; i < 110; i++) { streaming.o.attrPts = 1; streaming.yt(); }
  assert.equal(JSON.stringify(once.o.attr), JSON.stringify(streaming.o.attr));
});

test('equipmentFirst false uses the ratio directly without paying gear requirements first', () => {
  const s = game('gaibang');
  s.o.eq = { weapon: { req: [[32, 100]] } };
  s.X2 = { 32: 'str', 33: 'dex', 34: 'vit', 35: 'eng' };
  s.c1 = key => 10 + s.o.attr[key];
  declaration(s, 'core/attributes-02.js', 'e4');
  s.potentialAllocationConfig.equipmentFirst = false;
  s.o.attrPts = 100;
  const plan = s.planPotentialRoute('palm');
  assert.equal(plan.equipmentSpent, 0);
  assert.equal(plan.equipmentMissing, 90);
  assert.equal(JSON.stringify(plan.rows.map(row => row.add)), '[0,5,90,5]');
});
