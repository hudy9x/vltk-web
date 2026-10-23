const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const code = buildSync({ entryPoints:[path.join(root, 'tools/map-tool/src/App.tsx')], bundle:true,
  platform:'node', format:'cjs', write:false, jsx:'automatic',
  external:['react', 'react/jsx-runtime', 'lucide-react', '@tauri-apps/*',
    path.join(root, 'tools/map-tool/src/editor/*'), path.join(root, 'tools/map-tool/src/components/*'),
    path.join(root, 'tools/map-tool/src/styles.css')],
  alias:{ '@':path.join(root, 'tools/map-tool/src'), '@game':path.join(root, 'src/client/maps') },
}).outputFiles[0].text;

// Invoke the actual App event handlers with deterministic React hook state and image decode.
function fixture() {
  const hooks = []; let cursor = 0, finishDecode, failDecode;
  const decode = new Promise((resolve, reject) => { finishDecode = resolve; failDecode = reject; });
  const revoked = [];
  const components = new Proxy({}, { get:(_, name) => String(name) });
  const react = {
    useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current:initial }; },
    useCallback:callback => callback, useEffect() {},
  };
  const element = (type, props) => ({ type, props });
  const context = vm.createContext({ module:{ exports:{} }, structuredClone, atob, btoa, TextEncoder,
    Uint8Array, Map, Set, Blob, crypto:{ randomUUID:() => 'test-image-id' },
    localStorage:{ setItem() {} },
    Image:class { naturalWidth = 2; naturalHeight = 2; decode() { return decode; } },
    URL:{ createObjectURL:() => 'blob:upload', revokeObjectURL:url => revoked.push(url) },
    require:name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx:element, jsxs:element }
      : name === '@tauri-apps/api/core' ? { isTauri:() => false, invoke:() => Promise.reject(new Error('unexpected native read')) } : components,
  });
  vm.runInContext(code, context);
  const App = context.module.exports.default;
  const render = () => { cursor = 0; return App(); };
  render();
  const map = id => ({ schemaVersion:1, id, name:`Map ${id}`, status:'test', size:{ width:256, height:128 },
    entry:{ x:128, y:64 }, layers:[{ id:'ground', type:'ground', image:'./ground.jpg' }, { id:'world', type:'world', objects:[] }],
    navigation:{ kind:'open' }, spawns:[] });
  const maps = [map(2), map(3)];
  const workspace = { root:'/fixture', maps, projects:{}, encounters:[], progression:[], monsters:[], revision:'start' };
  const document = { map:structuredClone(maps[0]), project:{ schemaVersion:1, mapId:2, paintedNavigation:{ kind:'open' }, colliders:{} },
    encounters:[], progression:[], assets:[] };
  hooks[0] = workspace; hooks[1] = document; hooks[2] = JSON.stringify(document);
  const busyIndex = hooks.findIndex(value => value === 'Đang mở workspace…'); hooks[busyIndex] = '';
  const find = (tree, predicate) => {
    if (!tree || typeof tree !== 'object') return;
    if (predicate(tree)) return tree;
    for (const child of [tree.props?.children].flat(Infinity)) {
      const found = find(child, predicate); if (found) return found;
    }
  };
  const start = () => {
    const tree = render();
    find(tree, node => node.type === 'Inspector').props.onImport({ kind:'object' });
    find(tree, node => node.type === 'input' && node.props.type === 'file').props.onChange({ target:{
      files:[{ name:'tree.png', size:8, arrayBuffer:async () => new Uint8Array([1, 2, 3]).buffer }], value:'',
    } });
  };
  return { hooks, maps, render, find, start, finishDecode, failDecode, revoked };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('an image import commits to its original draft and always releases the decode URL', async () => {
  const f = fixture(); f.start(); await tick(); f.finishDecode(); await tick();
  assert.equal(f.hooks[1].map.id, 2);
  assert.equal(f.hooks[1].map.layers[1].objects.length, 1);
  assert.equal(f.hooks[1].assets.length, 1);
  assert.deepEqual(f.revoked, ['blob:upload']);
});

test('changing maps during image decode cannot overwrite the new draft or its selection', async () => {
  const f = fixture(); f.start(); await tick();
  f.find(f.render(), node => node.type === 'MapSidebar').props.selectMap(f.maps[1]);
  f.render(); f.finishDecode(); await tick();
  assert.equal(f.hooks[1].map.id, 3);
  assert.equal(f.hooks[1].assets.length, 0);
  assert.equal(f.hooks[1].map.layers[1].objects.length, 0);
  const tree = f.render();
  assert.equal(f.find(tree, node => node.type === 'Inspector').props.selection, null);
  assert.match(f.find(tree, node => node.props?.role === 'alert').props.children[1].props.children, /Map đã thay đổi/);
  assert.deepEqual(f.revoked, ['blob:upload']);
});

test('failed image decoding leaves the draft intact and releases its temporary URL', async () => {
  const f = fixture(), before = JSON.stringify(f.hooks[1]); f.start(); await tick();
  f.failDecode(new Error('corrupt image')); await tick();
  assert.equal(JSON.stringify(f.hooks[1]), before);
  assert.deepEqual(f.revoked, ['blob:upload']);
});
