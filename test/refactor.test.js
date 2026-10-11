const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { createHash } = require('node:crypto');
const { assemble } = require('../tools/build-app');
const { staticLiteral } = require('../tools/split-app');
const ROOT = path.resolve(__dirname,'..');
const manifest = require('../app/modules.json');
function clean(node) {
  if(Array.isArray(node))return node.map(clean);
  if(!node || typeof node!=='object')return node;
  if(node.type==='MemberExpression' && (!node.computed || node.property.type==='Literal'))return {
    type:'MemberExpression',object:clean(node.object),key:String(node.property.type==='Identifier'?node.property.name:node.property.value),optional:node.optional
  };
  return Object.fromEntries(Object.entries(node).filter(([key])=>!['start','end','loc','raw'].includes(key)).map(([key,value])=>[key,clean(value)]));
}
const member = (target,key) => ({type:'MemberExpression',object:target,computed:true,optional:false,property:{type:'Literal',value:key}});
function normalize(source) {
  const parsed = acorn.parse(source,{ecmaVersion:'latest'});
  const body=parsed.body[0].expression.callee.body.body;
  const output=[];
  function assign(target,value) {
    if(value.type==='ObjectExpression' && staticLiteral(value)) {
      output.push({assign:clean(target),value:{type:'ObjectExpression',properties:[]}});
      for(const property of value.properties)assign(member(target,property.key.type==='Identifier'?property.key.name:property.key.value),property.value);
    } else output.push({assign:clean(target),value:clean(value)});
  }
  function expression(node) {
    if(node.type==='SequenceExpression')return node.expressions.forEach(expression);
    if(node.type==='AssignmentExpression' && node.operator==='=' && node.left.type==='MemberExpression' && staticLiteral(node.right))return assign(node.left,node.right);
    if(node.type==='CallExpression' && node.callee.type==='MemberExpression' && node.callee.object.name==='Object' && node.callee.property.name==='assign' && node.arguments.length===2 && node.arguments[0].type==='MemberExpression' && node.arguments[1].type==='ObjectExpression' && staticLiteral(node.arguments[1])) {
      for(const property of node.arguments[1].properties)assign(member(node.arguments[0],property.key.type==='Identifier'?property.key.name:property.key.value),property.value);
      return;
    }
    output.push({expression:clean(node)});
  }
  for(const node of body) {
    if(node.type==='VariableDeclaration' && node.kind==='var')node.declarations.forEach(declaration=>output.push({var:clean(declaration)}));
    else if(node.type==='ExpressionStatement')expression(node.expression);
    else output.push(clean(node));
  }
  return output;
}
test('refactored modules preserve the backup logic and data in execution order',()=>{
  const backup=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  assert.equal(createHash('sha256').update(backup).digest('hex'),manifest.backupSha256,'The preserved backup must not be edited by build/refactor tools');
  // The only deliberate behavior adaptations recognize the new script path.
  const expected=backup.replace('/\\/app\\.js(\\?|$)/','/\\/(?:app\\/game|app)\\.js(\\?|$)/').replace('script[src*="app.js"]','script[src*="app/game.js"]');
  // New GM module has separate behavior tests; the 123 original modules stay unchanged.
  const originalModules = assemble().modules.filter(module => module.file !== 'dev/game-master-01.js');
  const before=normalize(expected),after=normalize('(function(){\n'+originalModules.map(module=>module.source).join('\n')+'\n})();');
  assert.equal(after.length,before.length,'No initialization/declaration may be lost');
  for(let i=0;i<before.length;i++) {
    const original=JSON.stringify(before[i]),extracted=JSON.stringify(after[i]);
    assert.ok(original===extracted,`AST mismatch at initialization ${i}: ${original.slice(0,160)} / ${extracted.slice(0,160)}`);
  }
});
test('source modules parse independently and generated source map covers every module',()=>{
  const {modules,map,code}=assemble();
  assert.equal(modules.length,manifest.modules.length);
  assert.deepEqual(map.sources,modules.map(m=>m.file));
  assert.deepEqual(map.sourcesContent,modules.map(m=>m.source));
  assert.equal(map.mappings.split(';').length,code.trimEnd().split('\n').length);
  for(const module of modules)assert.doesNotThrow(()=>acorn.parse(module.source,{ecmaVersion:'latest'}),module.file);
});
