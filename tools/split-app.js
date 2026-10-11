// One-time extraction from the preserved backup. Never use line numbers or overwrite modules.
const fs = require('node:fs/promises');
const path = require('node:path');
const acorn = require('acorn');
const prettier = require('prettier');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
function staticLiteral(node) {
  if (!node) return false;
  if (node.type === 'Literal') return !node.regex && typeof node.value !== 'bigint';
  if (node.type === 'UnaryExpression') return ['-','+','!','~','void'].includes(node.operator) && staticLiteral(node.argument);
  if (node.type === 'ArrayExpression') return node.elements.every(n => n && staticLiteral(n));
  if (node.type === 'ObjectExpression') return node.properties.every(p => p.type === 'Property' && !p.computed && !p.method && p.kind === 'init' && staticLiteral(p.value));
  return false;
}
function theme(index, label) {
  if (index <= 6) return 'core/item-sets';
  if (index === 7) {
    if (label.includes('SK_')) return 'data/skill-tables';
    if (label.includes('JMO')) return 'data/map-navigation';
    if (label.includes('JFX')) return 'data/projectile-effects';
    if (label.includes('window.JS')) return 'data/audio-tables';
    if (label.includes('window.JW')) return 'data/monsters-and-zones';
    return 'data/equipment-and-zone-patches';
  }
  if (index <= 20) return 'core/helpers-and-config';
  if (index <= 22) return 'core/attributes';
  if (index <= 33) return 'combat/skills';
  if (index <= 35) return 'gameplay/shop-and-books';
  if (index === 36) return 'gameplay/equipment';
  if (index === 37) return 'data/crafting-recipes';
  if (index <= 47) return 'gameplay/crafting';
  if (index === 48) return 'core/state-and-save';
  if (index === 49) return 'core/integrity-timers';
  if (index <= 51) return 'render/arena';
  if (index <= 54) return 'render/projectiles';
  if (index === 55) return 'data/status-effects';
  if (index <= 61) return 'render/effects-and-look';
  if (index === 62) return 'ui/legacy-panels-and-audio';
  if (index <= 66) return 'gameplay/npc-shops';
  if (index <= 68) return 'systems/rewards';
  if (index === 69) return 'systems/activities-and-stash';
  if (index <= 76) return 'online/auth-chat-and-market';
  if (index <= 84) return 'online/party';
  if (index <= 87) return 'ui/world-shell';
  if (index <= 95) return 'ui/world-panels';
  if (index <= 97) return 'ui/character-select';
  return 'core/game-loop';
}
async function main() {
  const directory = path.join(ROOT, 'app');
  try { await fs.access(directory); throw new Error('app/ already exists; edit its modules instead of re-extracting the backup.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const source = await fs.readFile(path.join(ROOT,'app.js'),'utf8');
  const program = acorn.parse(source,{ ecmaVersion:'latest' });
  const call = program.body[0]?.expression;
  if (program.body.length !== 1 || call?.callee?.type !== 'FunctionExpression' || call.arguments.length) throw new Error('Unexpected backup wrapper');
  const units=[];
  const emit = async (index,label,code) => {
    const formatted = await prettier.format(code,{ parser:'babel', printWidth:100 });
    acorn.parse(formatted,{ ecmaVersion:'latest' });
    units.push({ theme:theme(index,label),label,code:formatted });
  };
  // Large pure data tables may be split at property boundaries. No functions are evaluated.
  async function assignment(index,label,target,node) {
    if (node.type === 'ObjectExpression' && staticLiteral(node) && node.end-node.start > 8000) {
      await emit(index,label,`${target} = {};`);
      for (const property of node.properties) {
        const key = property.key.type === 'Identifier' ? JSON.stringify(property.key.name) : source.slice(property.key.start,property.key.end);
        await assignment(index,label,`${target}[${key}]`,property.value);
      }
    } else await emit(index,label,`${target} = ${source.slice(node.start,node.end)};`);
  }
  for (const [index,statement] of call.callee.body.body.entries()) {
    if (statement.type === 'VariableDeclaration' && statement.kind === 'var') {
      for (const declaration of statement.declarations) {
        let code = 'var '+source.slice(declaration.start,declaration.end)+';';
        // Recognize both supported local entry points in the original provenance check.
        if (declaration.id.name === 'yP') code = code.replace('/\\/app\\.js(\\?|$)/', '/\\/(?:app\\/game|app)\\.js(\\?|$)/');
        await emit(index,declaration.id.name,code);
      }
    } else if (statement.type === 'ExpressionStatement' && !statement.directive) {
      for (const expression of statement.expression.expressions || [statement.expression]) {
        const label=source.slice(expression.start,expression.start+100);
        if (expression.type === 'AssignmentExpression' && expression.operator === '=' && expression.left.type === 'MemberExpression' && staticLiteral(expression.right)) {
          await assignment(index,label,source.slice(expression.left.start,expression.left.end),expression.right);
        } else if (expression.type === 'CallExpression' && source.slice(expression.callee.start,expression.callee.end) === 'Object.assign' && expression.arguments.length === 2 && expression.arguments[0].type === 'MemberExpression' && staticLiteral(expression.arguments[1]) && expression.arguments[1].type === 'ObjectExpression') {
          const target=source.slice(expression.arguments[0].start,expression.arguments[0].end);
          for (const property of expression.arguments[1].properties) {
            const key=property.key.type === 'Identifier' ? JSON.stringify(property.key.name) : source.slice(property.key.start,property.key.end);
            await assignment(index,label,`${target}[${key}]`,property.value);
          }
        } else await emit(index,label,'('+source.slice(expression.start,expression.end)+');');
      }
    } else {
      let code=source.slice(statement.start,statement.end);
      if (index === 61) code=code.replace('script[src*="app.js"]','script[src*="app/game.js"]');
      await emit(index,statement.type,code);
    }
  }
  const groups=[];
  for (const unit of units) {
    let group=groups.at(-1);
    const lines=unit.code.split('\n').length;
    if (!group || group.theme!==unit.theme || group.lines+lines>900 || group.bytes+unit.code.length>40000) {
      group={ theme:unit.theme, lines:0,bytes:0,units:[] };groups.push(group);
    }
    group.units.push(unit);group.lines+=lines;group.bytes+=unit.code.length;
  }
  await fs.mkdir(directory,{ recursive:true });
  const counts=new Map(), modules=[];
  for (const group of groups) {
    const number=(counts.get(group.theme)||0)+1;counts.set(group.theme,number);
    const file=`${group.theme}-${String(number).padStart(2,'0')}.js`;
    const filename=path.join(directory,file);
    await fs.mkdir(path.dirname(filename),{ recursive:true });
    await fs.writeFile(filename,`// ${group.theme} — shared IIFE scope; order is defined in modules.json.\n`+group.units.map(u=>u.code).join('\n'));
    modules.push({ file, symbols:group.units.map(u=>u.label).filter(s=>/^[$A-Z_a-z][$\w]*$/.test(s)), lines:group.lines });
  }
  const manifest={ backup:'../app.js',backupSha256:createHash('sha256').update(source).digest('hex'),modules };
  await fs.writeFile(path.join(directory,'modules.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Extracted ${modules.length} modules; app.js is unchanged.`);
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={ staticLiteral };
