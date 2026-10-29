// Trusted source adapter. Reuse the game's formulas/catalog; never evaluate save contents as code.
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const { parse } = require('acorn');
const { compileTypeScriptEntry } = require('../../../../tools/build-app.js');
const root = path.resolve(__dirname, '../../../..');
let runtime;
function createRuntime() {
  const declarations = new Map();
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (file.endsWith('.js') && entry.name !== 'game.js') {
        let source = fs.readFileSync(file, 'utf8'),
          program;
        try {
          program = parse(source, { ecmaVersion: 'latest' });
        } catch {
          continue;
        }
        for (const node of program.body)
          if (node.type === 'VariableDeclaration')
            for (const item of node.declarations)
              if (item.id.type === 'Identifier')
                declarations.set(item.id.name, `var ${source.slice(item.start, item.end)};`);
      }
    }
  }
  collect(path.join(root, 'src/client'));
  const globals = {
    console,
    Math,
    JSON,
    Date,
    Object,
    Array,
    Set,
    Map,
    WeakMap,
    WeakSet,
    String,
    Number,
    Boolean,
    RegExp,
    Infinity,
    NaN,
    parseInt,
    parseFloat,
    isFinite,
    structuredClone,
    URL,
    Uint8Array,
    Int32Array,
    Float32Array,
    ArrayBuffer,
    Error,
    TypeError,
    Promise,
    atob,
    btoa,
    TextDecoder,
    TextEncoder,
    localStorage: { getItem: () => null, setItem() {} },
    document: { querySelector: () => null, createElement: () => ({}), head: { appendChild() {} } },
    m: () => null,
    nm: () => [],
    b: {},
    m0: 0,
    combatSandbox: null,
    arenaSimulator: null,
    l: { quiet: true, sim: false, buffAssume: false, clock: 0 },
  };
  const resolving = new Set();
  let context;
  const scope = new Proxy(globals, {
    get(target, name) {
      if (name in target) return target[name];
      if (typeof name !== 'string' || resolving.has(name) || !declarations.has(name))
        return undefined;
      resolving.add(name);
      try {
        vm.runInContext(declarations.get(name), context, {
          filename: `native:${name}`,
          timeout: 1000,
        });
      } finally {
        resolving.delete(name);
      }
      return target[name];
    },
  });
  globals.window = globals.globalThis = scope;
  context = vm.createContext(scope);
  function run(file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {
      filename: file,
      timeout: 10000,
    });
  }
  run('public/data.js');
  globals.S = globals.JX;
  vm.runInContext(compileTypeScriptEntry('maps/index.ts', 'MapsEngine').code, context);
  vm.runInContext(compileTypeScriptEntry('combat/index.ts', 'CombatEngine').code, context);
  vm.runInContext(compileTypeScriptEntry('config/potential-allocation.ts', 'PotentialAllocation').code, context);
  // Follow the actual client manifest, including the standard-table reset before
  // skill-150 synergies. A hand-maintained second order can silently change stats.
  const modules=JSON.parse(fs.readFileSync(path.join(root,'src/client/modules.json'))).modules;
  const beforeHelpers=modules.findIndex(m=>m.file==='core/helpers-and-config-01.js');
  for(const entry of modules.slice(0,beforeHelpers))
    if(entry.file.startsWith('data/'))run('src/client/'+entry.file);
  globals.T = globals.JX.skills;
  globals.I = Object.fromEntries(globals.S.factions.filter(f=>f.skills?.length).map(f=>[f.key,f]));
  const config = fs.readFileSync(
    path.join(root, 'src/client/core/helpers-and-config-01.js'),
    'utf8',
  );
  for (const node of parse(config, { ecmaVersion: 'latest' }).body)
    if (node.type !== 'VariableDeclaration')
      vm.runInContext(config.slice(node.start, node.end), context);
  for(const entry of modules.slice(beforeHelpers+1)){
    if(entry.file.startsWith('data/'))run('src/client/'+entry.file);
    else if(entry.file==='combat/skills-01.js'){
      const source=fs.readFileSync(path.join(root,'src/client',entry.file),'utf8');
      for(const node of parse(source,{ecmaVersion:'latest'}).body)if(node.type==='ForOfStatement'||node.type==='ExpressionStatement'&&node.expression.type==='CallExpression'&&node.expression.callee.type==='FunctionExpression')
        vm.runInContext(source.slice(node.start,node.end),context,{timeout:1000});
    }
  }
  // Shop catalog normalizations also run in the browser after declarations.
  run('src/client/gameplay/npc-shops-01.js');
  return { scope, context };
}
function getRuntime() {
  return (runtime ||= createRuntime());
}
exports.buildCharacter = function (input, activeBuffs = [], activeAuras = null) {
  const { scope, context } = getRuntime();
  scope.o = Object.assign(scope.I3(), structuredClone(input));
  if(activeAuras!==null){scope.o.auraOff={};for(const id of Object.keys(scope.o.sk||{}))
    if(scope.T[id]&&scope.wn(scope.T[id])==='aura'&&!activeAuras.includes(+id))scope.o.auraOff[id]=1;}
  scope.l = {
    quiet: true,
    sim: false,
    buffAssume: false,
    clock: 0,
    sks: { buff: Object.fromEntries(activeBuffs.map(id=>[id,1e9])), cd: {} },
    mounted: !!scope.o.onlineMounted && scope.xe(),
  };
  const stats = vm.runInContext('j0()', context, { timeout: 2000 });
  scope.l.P = stats;
  const skills = [stats.basic, ...stats.actives];
  return JSON.parse(
    JSON.stringify({
      stats,
      supports: Object.keys(scope.o.sk||{}).filter(id=>scope.o.sk[id]>0&&scope.T[id]&&['buff','aura'].includes(scope.wn(scope.T[id]))).map(id=>{
        const row=scope.T[id], level=scope.o.sk[id]+(stats.plusSkill||0)+(stats.skAdd?.[id]||0);
        const kind=scope.wn(row),duration=scope.ae(row,level),heal=kind==='buff'&&duration<5;
        const cooldown=(scope.b0(row,'skill_mintimepercast_v',level)||[0])[0]/scope.k7;
        return {id:+id,level,aura:kind==='aura',enabled:kind==='aura'?scope.o6(id):scope.o.autoBuff!==false&&!scope.o.supportAutoOff?.[id],
          duration,cost:scope.M7(row,level),lifeCost:scope.i4(row),cooldown:Math.max(heal?8:0,cooldown),
          heal:heal?Math.max(0,(scope.b0(row,'lifereplenish_v',level)||[0])[0]*duration*2):0};
      }),
      skills,
      attackTimings: skills.map(skill=>scope.actorAttackTiming(scope.v,skill)),
      timing: { runPercent: 100 * (scope.l.mounted ? stats.speed : stats.speedFoot ?? stats.speed), config: scope.CombatEngine.SPEED_CONFIG },
      moveSpeed: vm.runInContext('150 * actorMovementSpeed(v)', context, { timeout: 1000 }),
    }),
  );
};
exports.catalog = function () {
  const { scope } = getRuntime();
  return JSON.parse(
    JSON.stringify({
      monsters: scope.JW.mon,
      zones: scope.JW.zones,
      skills: scope.T,
      exp: scope.S.exp,
      town: scope.E0.town.id,
    }),
  );
};
exports.monsterStats = function (level, rank = 'normal') {
  const { scope } = getRuntime();
  return JSON.parse(JSON.stringify(scope.F9(level, rank)));
};

// Probe only the native geometry configuration; never run casts, timers or damage.
exports.contactGeometry = function (skill) {
  const { scope } = getRuntime();
  const cast = { skill: structuredClone(skill), maxTargets: 1 };
  scope.CombatEngine.configureAdvancedSkillImpact(+skill.id, cast);
  const row = scope.T[skill.id];
  const speed = row && scope.b0(row, 'missle_speed_v', skill.L || 1)?.[0];
  const fx = scope.A0.f[skill.id], missile = fx && scope.A0.m[fx.c];
  return JSON.parse(JSON.stringify({
    geometry: cast.skill.geo || null,
    scale: scope.QA,
    speed: speed > 0 ? speed * scope.K3 : missile?.spd || 360,
    ignoreTerrain: scope.CombatEngine.skillIgnoresTerrain(skill),
  }));
};

exports.monsterSeries = function(id){return getRuntime().scope.j2(id);};
exports.damageRules = function(){const {scope}=getRuntime();return {criticalMultiplier:scope.y5,advantageBonus:scope.Ct,maximumResistance:scope.cw};};

exports.potions = function(){
  const {scope}=getRuntime();
  const rows=[...scope.S.potions,...(scope.fh||[])];
  return JSON.parse(JSON.stringify([...new Map(rows.map(p=>[p.kind+':'+p.tier,p])).values()]
    .map(p=>({...p,level:scope.be[p.tier]||1}))));
};

exports.alignment = function(faction){return ['chinh','trung','ta','tan'].indexOf(getRuntime().scope.Kh(faction));};

// Run trusted native progression rules with rendering/storage effects muted.
// Synchronous scope + cloned input prevents cross-account state leaks.
exports.withProgression=function(input,reduce){
  exports.buildCharacter(input);
  const {scope,context}=getRuntime(),previous=new Map();
  const mute=['C','k','o0','tn','qA','n0','V','$','Bs','Zn','_s','Bn','Gm','af','O3'];
  for(const key of mute){previous.set(key,scope[key]);scope[key]=()=>{};}
  previous.set('D0',scope.D0);scope.D0=()=>{scope.W5();scope.l.P=scope.j0();scope.l.dirty=false;};
  scope.__progressionReduce=()=>reduce(scope);
  try{return JSON.parse(JSON.stringify(vm.runInContext('__progressionReduce()',context,{timeout:5000})));}
  catch(error){if(error.code==='ERR_SCRIPT_EXECUTION_TIMEOUT')throw Object.assign(new Error('Thao tác quá lớn, hãy chia nhỏ số điểm.'),{status:400});throw error;}
  finally{delete scope.__progressionReduce;for(const [key,value]of previous)scope[key]=value;}
};
