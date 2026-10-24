// Bundle the existing stat/optimization functions, never a second copy of their formulas.
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');

// Resolve function-local bindings per scope. A parameter in one callback must
// never hide a legacy global referenced by its sibling callback.
function identifiers(root) {
  const references = new Set();
  function bind(pattern, names) {
    if (!pattern) return;
    if (pattern.type === 'Identifier') names.add(pattern.name);
    else if (pattern.type === 'Property') bind(pattern.value,names);
    else if (pattern.type === 'AssignmentPattern') bind(pattern.left,names);
    else for (const child of Object.values(pattern)) {
      if (Array.isArray(child)) child.forEach(value => bind(value,names));
      else if (child && typeof child === 'object') bind(child,names);
    }
  }
  const isFunction = node => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type);
  function hoisted(node, names) {
    if (!node || typeof node !== 'object') return;
    if (isFunction(node)) { if (node.type === 'FunctionDeclaration') bind(node.id,names); return; }
    if (node.type === 'VariableDeclarator') bind(node.id,names);
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(value => hoisted(value,names));
      else if (child && typeof child === 'object') hoisted(child,names);
    }
  }
  function walk(node, scopes = [], parent, key) {
    if (!node || typeof node !== 'object') return;
    if (isFunction(node)) {
      const local = new Set(); bind(node.id,local); node.params.forEach(param => bind(param,local)); hoisted(node.body,local);
      const nested = [...scopes,local];
      for (const param of node.params) if (param.type === 'AssignmentPattern') walk(param.right,nested);
      walk(node.body,nested); return;
    }
    if (node.type === 'CatchClause') { const local = new Set();bind(node.param,local);walk(node.body,[...scopes,local]);return; }
    if (node.type === 'VariableDeclarator') { walk(node.init,scopes);return; }
    if (node.type === 'Identifier') {
      if (parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) ||
        ((parent.type === 'Property' || parent.type === 'MethodDefinition') && key === 'key' && !parent.computed))) return;
      if (!scopes.some(scope => scope.has(node.name))) references.add(node.name);
      return;
    }
    for (const [childKey,child] of Object.entries(node)) {
      if (Array.isArray(child)) child.forEach(value => walk(value,scopes,node,childKey));
      else if (child && typeof child === 'object') walk(child,scopes,node,childKey);
    }
  }
  walk(root); return {references,bound:new Set()};
}

let previous;
function potentialBundle() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/client/modules.json'), 'utf8'));
  const sources = manifest.modules.filter(({file}) => file.endsWith('.js')).map(({file}) => ({file,source:fs.readFileSync(path.join(ROOT,'src/client',file),'utf8')}));
  const sourceHash = createHash('sha256').update(JSON.stringify(sources)).update(fs.readFileSync(path.join(ROOT,'public/data.js'))).digest('hex');
  if (previous?.sourceHash === sourceHash) return previous.result;
  const declarations = new Map();
  for (const { file, source } of sources) {
    for (const node of acorn.parse(source, { ecmaVersion: 'latest' }).body) if (node.type === 'VariableDeclaration')
      for (const declaration of node.declarations) if (declaration.id.type === 'Identifier')
        declarations.set(declaration.id.name, { node: declaration.init, source: source.slice(declaration.start, declaration.end), fullSource:source, file });
  }
  // These hooks observe a live world. Capture their values before crossing the worker boundary.
  const boundaries = new Set(['o','l','S','I','T','window','arenaSimulator','Hb','Qb','Vi','nm','Lt','mo','a4','J1','ne','unlockSkillBook']);
  const functions = new Map(), values = new Set(['S','I','T']), embedded = new Map();
  function storedFunctions(node, target, source, found = []) {
    if (!node) return found;
    if (['FunctionExpression','ArrowFunctionExpression'].includes(node.type)) found.push({target,source:source.slice(node.start,node.end),node});
    else if (node.type === 'ObjectExpression') for (const entry of node.properties) {
      if (entry.type === 'Property' && !entry.computed) storedFunctions(entry.value,target+'['+JSON.stringify(entry.key.name ?? entry.key.value)+']',source,found);
    } else if (node.type === 'ArrayExpression') node.elements.forEach((entry,index) => storedFunctions(entry,target+'['+index+']',source,found));
    return found;
  }
  function include(name) {
    if (boundaries.has(name) || functions.has(name) || values.has(name)) return;
    const declaration = declarations.get(name);
    if (!declaration) return;
    if (!['FunctionExpression','ArrowFunctionExpression'].includes(declaration.node?.type)) {
      values.add(name);
      const stored = storedFunctions(declaration.node,name,declaration.fullSource);
      if (stored.length) {
        embedded.set(name,stored);
        for (const entry of stored) { const {references,bound}=identifiers(entry.node);for(const reference of references)if(!bound.has(reference))include(reference); }
      }
      return;
    }
    functions.set(name, declaration);
    const { references, bound } = identifiers(declaration.node);
    for (const reference of references) if (!bound.has(reference)) include(reference);
  }
  for (const name of ['yt','Pt','j0','G0']) include(name);
  const body = [...functions.values()].map(value => `var ${value.source};`).join('\n');
  const globals = [...values].sort();
  const setup = `var ${globals.join(',')},o,l,external,window,ne=null,J1,unlockSkillBook=()=>true;\n` +
    `var add=(a,b)=>{for(const [k,v] of Object.entries(b)){if(!a[k])a[k]=[0,0,0];for(let i=0;i<3;i++)a[k][i]+=v[i]||0;}},Hb=a=>add(a,external.title),Qb=a=>add(a,external.collection),Vi=a=>external.active.includes(a.id),nm=()=>external.party,Lt=k=>external.luck[k]||0,mo=()=>external.reborn,a4=()=>external.newbie;\n`;
  const restores = [...embedded.values()].flat().map(entry => entry.target+'='+entry.source+';').join('');
  const run = `\nfunction optimize(input){o=input.profile;l=input.world;external=input.external;window=input.window;${globals.map(name => `${name}=input.globals[${JSON.stringify(name)}];`).join('')}${restores}if(input.autoSkills)Pt();if(input.autoPotential!==false)yt();return {attr:o.attr,attrPts:o.attrPts,sk:o.sk,skL:o.skL,skPts:o.skPts,sk150Training:o.sk150Training};}\n`;
  const kernel = setup + body + run;
  const version = createHash('sha256').update(kernel).update(sourceHash).digest('hex');
  // This function runs inside the game's shared scope, not in the worker.
  const capture = `var capturePotentialContext=function(profile,world){return {profile:JSON.parse(JSON.stringify(profile)),world:{sim:true,quiet:true,buffAssume:true,mounted:!!world.mounted,buffs:{},skCd:{},P:world.P&&JSON.parse(JSON.stringify(world.P))},globals:{${globals.map(name => `${JSON.stringify(name)}:typeof ${name}==='undefined'?undefined:${embedded.has(name) ? 'JSON.parse(JSON.stringify('+name+'))' : name}`).join(',')}},window:{SK_EV:window.SK_EV,SK_STD:window.SK_STD},external:{title:(()=>{const a={};if(typeof Hb==='function')Hb(a);return a;})(),collection:(()=>{const a={};if(typeof Qb==='function')Qb(a);return a;})(),active:Object.keys(T).filter(id=>typeof Vi==='function'&&Vi(T[id])).map(Number),party:typeof nm==='function'?nm():[],luck:{luck:typeof Lt==='function'?Lt('luck'):0,luck2:typeof Lt==='function'?Lt('luck2'):0},reborn:typeof mo==='function'?mo():{dmg:0},newbie:typeof a4==='function'?a4():false}};};\n`;
  const worker = kernel + `\nvar catalog;self.onmessage=function(event){const m=event.data;if(m.kind==='init'){catalog=m.catalog;return;}try{self.postMessage({id:m.id,result:optimize({...m.input,globals:catalog})});}catch(error){self.postMessage({id:m.id,error:String(error&&error.message||error)});}};`;
  const result = { worker, capture, version, globals, serialized:[...embedded.keys()], functions: [...functions.keys()] };
  previous = { sourceHash, result }; return result;
}
module.exports = { potentialBundle };
