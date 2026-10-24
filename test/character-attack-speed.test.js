const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');

function panelFixture(name, file) {
  const elements = new Map();
  const stats = {
    life: 100, mana: 50, def: 10, ar: 20, speed: 1, wmin: 10, wmax: 20,
    aspd: 2.23, aspdP: 2.23, aspdC: 1.37, skAdd: {}, res: {},
    basic: { n: 'Đánh thường', rate: 2.23, crit: 0 },
  };
  const s = {
    Math, l: { P: stats }, o: { fac: 'test', lvl: 1, eq: {}, attr: {}, attrPts: 0 },
    I: { test: { n: 'Võ Đang', series: 0 } }, S: { exp: [] }, T: {},
    un: [], nn: {}, Q0: [], w0: ['#fff'], g0: ['Kim'],
    document: { querySelectorAll: () => [], querySelector: () => null },
    m(selector) {
      if (!elements.has(selector)) elements.set(selector, { innerHTML: '' });
      return elements.get(selector);
    },
    j0: () => stats, F: String, D: String, Ki: skill => skill.n,
    v0: () => 0, OA: () => false, N: () => 0, tx: () => false,
    t5: String, Q: () => ({}), Ri() {}, D2() {}, _h() {}, As() {}, MB() {},
  };
  vm.createContext(s);
  const source = fs.readFileSync(file, 'utf8');
  const declaration = acorn.parse(source, { ecmaVersion: 'latest' }).body.find(node =>
    node.type === 'VariableDeclaration' && node.declarations.some(d => d.id.name === name));
  assert.ok(declaration, name);
  vm.runInContext(source.slice(declaration.start, declaration.end), s);
  return {
    stats,
    render(main) {
      stats.main = main;
      s[name]();
      const match = elements.get('#t-char').innerHTML.match(/Tốc độ đánh<\/span><(?:b|span)>([\d.]+)</);
      assert.ok(match, 'attack speed is rendered');
      return match[1];
    },
  };
}

for (const [name, file] of [
  ['HB', 'src/client/ui/world-panels-01.js'],
  ['Bs', 'src/client/ui/legacy-panels-and-audio-01.js'],
]) {
  test(`${name} follows external/internal skill switches and uses raw speed before cooldown`, () => {
    const { render, stats } = panelFixture(name, file);
    const external = { n: 'Ngoại công', phys: true, crit: 0, rawRate: stats.aspdP, rate: .5 };
    const internal = { n: 'Nội công', phys: false, crit: 0, rawRate: stats.aspdC, rate: .5 };
    assert.equal(render(external), '2.23');
    assert.equal(render(internal), '1.37');
    assert.equal(render(external), '2.23');
    assert.equal(render(stats.basic), '2.23');
  });

  test(`${name} respects skill-specific rates and preserves zero speed`, () => {
    const { render } = panelFixture(name, file);
    assert.equal(render({ n: 'Chiêu riêng', crit: 0, rawRate: 1.8, rate: .5 }), '1.80');
    assert.equal(render({ n: 'Ngừng đánh', crit: 0, rawRate: 0, rate: .5 }), '0.00');
  });
}
