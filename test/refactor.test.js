const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { assemble } = require('../tools/build-app');
const ROOT = path.resolve(__dirname,'..');
const manifest = require('../app/modules.json');
test('source modules parse independently and generated source map covers every module',()=>{
  const {modules,map,code}=assemble();
  const sourceFiles = fs.readdirSync(path.join(ROOT,'app'),{ recursive:true })
    .filter(file => file.endsWith('.js') && file !== 'game.js')
    .map(file => file.split(path.sep).join('/'));
  assert.equal(new Set(modules.map(module => module.file)).size,modules.length,'Each source module must be included once');
  assert.deepEqual(modules.map(module => module.file).sort(),sourceFiles.sort(),'Every source module must be included in the manifest');
  assert.equal(modules.length,manifest.modules.length);
  assert.deepEqual(map.sources,modules.map(m=>m.file));
  assert.deepEqual(map.sourcesContent,modules.map(m=>m.source));
  assert.equal(map.mappings.split(';').length,code.trimEnd().split('\n').length);
  for(const module of modules)assert.doesNotThrow(()=>acorn.parse(module.source,{ecmaVersion:'latest'}),module.file);
});
