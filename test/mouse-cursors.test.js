const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const handlers = {}, classes = new Set(), children = [], timers = new Map();
  let timerId = 0;
  const listen = (type, fn) => { (handlers[type] ||= []).push(fn); };
  const body = { classList: { add: x => classes.add(x), remove: x => classes.delete(x) }, appendChild: x => children.push(x) };
  vm.runInNewContext(fs.readFileSync('src/client/ui/mouse-cursors-01.js', 'utf8'), {
    document: { body, addEventListener: listen, createElement: () => ({
      children: [], style: { setProperty(k,v) { this[k] = v; } },
      setAttribute(k,v) { this[k] = v; }, appendChild(x) { this.children.push(x); },
      remove() { const i = children.indexOf(this); if (i >= 0) children.splice(i, 1); },
    }) },
    window: { addEventListener: listen, setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id) },
  });
  const fire = (name, event = {}) => handlers[name].forEach(fn => fn(event));
  const press = () => fire('pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 120, clientY: 80 });
  return { fire, press, classes, children, timers };
}

test('mouse press feedback releases on up, cancellation or lost focus and ignores touch/right click', () => {
  const s = setup();
  for (const event of [{ pointerType: 'touch', button: 0 }, { pointerType: 'mouse', button: 2 }]) {
    s.fire('pointerdown', event);
    assert.equal(s.classes.size, 0); assert.equal(s.children.length, 0);
  }
  for (const end of ['pointerup', 'pointercancel', 'blur']) {
    s.press(); assert.ok(s.classes.has('game-pointer-down'));
    s.fire('pointerup', { pointerId: 2 }); assert.ok(s.classes.has('game-pointer-down'));
    s.fire(end, end === 'blur' ? {} : { pointerId: 1 }); assert.equal(s.classes.size, 0);
  }
});

test('click wave has four inward directions at the click point; rapid clicks replace it and timers clean it up', () => {
  const s = setup(); s.press();
  const wave = s.children[0];
  assert.equal(wave.style.left, '120px'); assert.equal(wave.style.top, '80px');
  assert.equal(wave['aria-hidden'], 'true');
  assert.deepEqual(wave.children.map(x => x.style['--direction']), ['0deg','90deg','180deg','270deg']);
  s.fire('pointerup', { pointerId: 1 });
  assert.equal(s.children.length, 1); // Finish the wave after a quick click.
  s.press(); assert.equal(s.children.length, 1); assert.equal(s.timers.size, 1);
  [...s.timers.values()][0](); assert.equal(s.children.length, 0); assert.equal(s.timers.size, 0);
  s.press(); s.fire('blur'); assert.equal(s.children.length, 0); assert.equal(s.timers.size, 0);
});
