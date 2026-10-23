const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),acorn=require('acorn');
const ROOT=path.resolve(__dirname,'..');
function load(s,file){vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),s);}
function decl(s,file,name){
  const code=fs.readFileSync(path.join(ROOT,file),'utf8');
  const node=acorn.parse(code,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
  assert.ok(node,name);vm.runInContext(code.slice(node.start,node.end),s);
}
function game(){
  const nodes=new Map(),s={Math,Set,Map,Date,setTimeout(){},
    o:{fac:'shaolin',lvl:150,sk:{},skL:{},skPts:500,attr:{str:0},attrPts:0,bkOk:{},mats:{misc:{}},knb:10000,gold:0,inv:[],eq:{}},
    l:{P:{life:100,mana:100,main:{id:0}},life:100,mana:100},reborn:0,
    E:(v,a,b)=>Math.max(a,Math.min(b,v)),D:String,k(){},C(){},$(){},V(){},D0(){},D2(){},Ri(){},tn(){},Zn(){},qA(){},_s(){},n0(){},o0(){},iA(){},
    GA:()=>s.o.lvl,v0:()=>s.reborn,UA:skill=>!!skill?.enemy&&!skill.aura,
    N:(_,id)=>s.o.mats.misc[id]||0,U:(_,id,count)=>s.o.mats.misc[id]=(s.o.mats.misc[id]||0)+count,
    Q:()=>s.o.rw||(s.o.rw={stat:{reborn:0}}),G1:[],es:()=>true,
    m:id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){}}});return nodes.get(id);},document:{querySelectorAll:()=>[]},z1:()=>0,nodes};
  s.window=s;vm.createContext(s);
  for(const file of ['public/data.js','src/client/data/projectile-effects-01.js','src/client/data/projectile-effects-02.js','src/client/data/advanced-skills-01.js'])load(s,file);
  s.T=s.JX.skills;s.I=Object.fromEntries(s.JX.factions.map(f=>[f.key,f]));
  load(s,'src/client/gameplay/skill-progression-01.js');
  for(const name of ['ee','SA','va','v4','P4','_4','h6','u6','l6'])decl(s,'src/client/gameplay/shop-and-books-01.js',name);
  for(const name of ['m4','W2','Yi','Fi','w7','Z5','p7','D7','p4'])decl(s,'src/client/combat/skills-01.js',name);
  for(const name of ['Ni','Q1'])decl(s,'src/client/core/attributes-02.js',name);
  for(const name of ['H4','$4','Q7','G7','j7','J0'])decl(s,'src/client/gameplay/shop-and-books-02.js',name);
  // Execute the real post-catalog price scaling as well as the entries.
  const shop=fs.readFileSync(path.join(ROOT,'src/client/gameplay/shop-and-books-02.js'),'utf8');
  const scaling=acorn.parse(shop,{ecmaVersion:'latest'}).body.find(n=>n.type==='ForOfStatement'&&shop.slice(n.start,n.end).includes('s.knb *= H4'));
  vm.runInContext(shop.slice(scaling.start,scaling.end),s);
  for(const name of ['ts','ie'])decl(s,'src/client/gameplay/equipment-01.js',name);
  decl(s,'src/client/ui/legacy-panels-and-audio-01.js','qf');
  return s;
}
test('120 and 150 books each cost exactly 5000 KNB through real purchase flow',()=>{
  for(const [key,material] of [['mt120','bk120'],['mt150','bk150']]){
    const s=game(),book=s.J0.find(item=>item.k===key);
    assert.equal(book.knb,5000);assert.equal(s.ts[key],material);
    s.o.knb=4999;assert.equal(s.u6(key,1,true),0);assert.equal(s.N('misc',material),0);
    s.o.knb=10000;assert.equal(s.u6(key,2,true),2);assert.equal(s.o.knb,0);assert.equal(s.N('misc',material),2);
    assert.equal(s.u6(key,1,true),0);assert.equal(s.N('misc',material),2);
  }
});
test('all 24 skill 150s unlock at level one using one book and never take skill points',()=>{
  const s=game();
  for(const skill of Object.values(s.T).filter(skill=>skill.tier===150)){
    s.o.fac=skill.f;s.o.skPts=0;
    assert.equal(skill.book,'bk150');assert.equal(s.Q1(skill),false);
    s.o.mats.misc.bk150=1;s.o.lvl=149;assert.equal(s.Yi(skill.id),false);assert.equal(s.N('misc','bk150'),1);
    s.o.lvl=150;assert.equal(s.Yi(skill.id),true);assert.equal(s.o.sk[skill.id],1);assert.equal(s.o.skPts,0);
    assert.equal(s.o.skL[skill.id].lv,1);assert.equal(s.N('misc','bk150'),0);assert.equal(s.o.bkOk[skill.id],1);
    s.o.lvl=250;s.o.skPts=500;s.o.mats.misc.bk150=1;
    assert.equal(s.Yi(skill.id),false);assert.equal(s.o.sk[skill.id],1);assert.equal(s.o.skPts,500);
    s.o.mats.misc.bk150=0;
  }
});
test('120 consumes its book only once and remains point-based; rebirth does not bypass advanced books',()=>{
  const s=game(),skill=s.T[708];s.o.fac=skill.f;s.reborn=1;
  assert.equal(skill.book,'bk120');assert.equal(s.Yi(skill.id),false);
  s.o.mats.misc.bk120=1;assert.equal(s.Yi(skill.id),true);assert.equal(s.N('misc','bk120'),0);
  assert.equal(s.o.skPts,499);assert.equal(s.Yi(skill.id),true);assert.equal(s.o.skPts,498);
  assert.equal(s.o.sk[skill.id],2);assert.equal(s.o.skL[skill.id],undefined);
  assert.equal(s.P4(s.T[1058]),false,'rebirth never grants a free 150 unlock');
});
test('automatic point allocation can unlock 150 but cannot level it past one or spend points on it',()=>{
  const s=game();s.o.mats.misc.bk150=1;
  Object.assign(s,{te:()=>false,d7:0,G0:value=>value,j0:()=>Object.values(s.o.sk).reduce((sum,n)=>sum+n,0)});
  decl(s,'src/client/core/attributes-02.js','Nw');s.Nw({skills:[1055]});
  assert.equal(s.o.sk[1055],1);assert.equal(s.o.skPts,500);assert.equal(s.N('misc','bk150'),0);
  s.Nw({skills:[1055]});assert.equal(s.o.sk[1055],1);assert.equal(s.o.skPts,500);
});
test('level 90 training and Đại Thành remain supported alongside 150',()=>{
  const s=game(),id=99999;
  s.T[id]={id,n:'Chiêu 90',tier:90,req:80,max:20,book:'bk90',enemy:1};s.I.shaolin.skills.push(id);
  s.o.lvl=80;s.o.skPts=0;s.o.mats.misc.bk90=1;
  assert.equal(s.Yi(id),true);assert.equal(s.o.skPts,0);assert.equal(s.N('misc','bk90'),0);
  s.Z5(s.v4(1),true,{[id]:1});assert.equal(s.o.sk[id],2);
  s.o.mats.misc.dtbk=1;s.h6(id);assert.equal(s.o.sk[id],20);assert.equal(s.N('misc','dtbk'),0);
});
test('150 XP comes from eligible killed monsters and only the participating attack skill trains',()=>{
  const s=game();s.o.mats.misc.bk150=2;s.Yi(1055);s.Yi(1056);
  decl(s,'src/client/core/state-and-save-01.js','hs');s.Pe=()=>0;s.showDamageNumber=()=>{};
  const monster={L:150,cls:'normal',def:0};s.hs({id:1055,useAR:true},monster);
  assert.equal(monster.hitSk[1055],1);
  for(let i=0;i<s.v4(1);i++)s.p7(monster);
  assert.equal(s.o.sk[1055],2);assert.equal(s.o.skL[1055].xp,0);assert.equal(s.o.sk[1056],1);
  const before=s.o.skL[1055].xp;s.p7({...monster,L:139});assert.equal(s.o.skL[1055].xp,before);
  assert.match(s.D7(1055),/Luyện 0\//);
  s.Z5(1e9,true,{1055:1});assert.equal(s.o.sk[1055],25);assert.equal(s.o.skL[1055].xp,0);
});
test('Đại Thành requires a learned 150 skill and one book, reaches 25 and never grants skill points',()=>{
  const s=game();s.o.mats.misc.dtbk=2;
  s.h6(1055);assert.equal(s.N('misc','dtbk'),2);assert.equal(s.o.sk[1055],undefined);
  s.o.mats.misc.bk150=1;s.Yi(1055);s.o.skL[1055].xp=20;s.h6(1055);
  assert.equal(s.o.sk[1055],25);assert.equal(s.o.skL[1055].lv,25);assert.equal(s.o.skL[1055].xp,0);
  assert.equal(s.o.skPts,500);assert.equal(s.N('misc','dtbk'),1);assert.match(s.D7(1055),/tối đa/);
  s.h6(1055);assert.equal(s.N('misc','dtbk'),1,'mastered skills do not consume another book');
  s.o.fac='tianwang';assert.equal(s._4(1055),false);
});
test('clearing/relearning or resetting trained 150 skills cannot create points or consume another unlock book',()=>{
  const s=game();s.o.mats.misc.bk150=1;s.Yi(1055);s.o.sk[1055]=7;s.o.skL[1055]={lv:7,xp:12};
  assert.equal(s.qf(1055),true);assert.equal(s.o.skPts,500);assert.equal(s.o.sk[1055],undefined);
  assert.equal(s.Yi(1055),true);assert.equal(s.o.sk[1055],7);assert.equal(s.o.skL[1055].xp,12);
  s.o.sk[10]=3;s.o.skPts=497;s.p4(false,true);
  assert.equal(s.o.sk[1055],7);assert.equal(s.o.skPts,500);assert.equal(s.o.sk[10],undefined);
});
test('real save normalization preserves new books and migrates allocated 150 points once',()=>{
  const s=game();Object.assign(s,{b8:1,d0:100,Q2:1000,gP:[],INV_MAX:100,$i:0,_5:()=>100,iP(){}});
  for(const name of ['I3','v8'])decl(s,'src/client/core/state-and-save-03.js',name);
  const original={fac:'shaolin',lvl:150,sk:{1055:12},skPts:488,sk9Free:1,sk9m:1,mats:{misc:{bk120:2,bk150:3,bk90:4}}};
  const migrated=s.v8(JSON.parse(JSON.stringify(original)));
  assert.equal(migrated.sk[1055],12);assert.equal(migrated.skL[1055].lv,12);assert.equal(migrated.skPts,500);
  assert.equal(migrated.bkOk[1055],1);assert.equal(migrated.mats.misc.bk120,2);assert.equal(migrated.mats.misc.bk150,3);
  assert.equal(migrated.mats.misc.bk90,4);
  const reloaded=s.v8(JSON.parse(JSON.stringify(migrated)));assert.equal(reloaded.skPts,500);assert.equal(reloaded.sk[1055],12);
  const arena=s.v8({...original,arenaFaction:'shaolin',skL:{1055:{lv:12,xp:20}}});
  assert.equal(arena.skPts,488);assert.equal(arena.skL[1055].xp,20);
  const older=s.v8({...original,sk9m:0});assert.equal(older.sk[1055],12);assert.equal(older.skPts,500);
});
test('actual skill grid and shop expose the new books and 150 mastery action',()=>{
  const s=game();s.o.mats.misc.bk150=1;s.Yi(1055);s.o.mats.misc.dtbk=1;
  decl(s,'src/client/ui/world-panels-01.js','$B');s.$B();
  const grid=s.nodes.get('#t-skill').innerHTML;
  assert.match(grid,/data-dt="1055"/);assert.doesNotMatch(grid,/class="plus" data-id="1055"/);
  assert.match(grid,/120 ×0 · 150 ×0/);
  let html='';Object.assign(s,{J:text=>html=text,wi:1,Tr:String,q:String,qt:()=>'',m6:()=>''});
  for(const name of ['z7','K7','pn','XA','Bt','ns'])decl(s,'src/client/gameplay/shop-and-books-02.js',name);
  for(const name of ['F7','E4','g6','w6'])decl(s,'src/client/gameplay/equipment-01.js',name);
  decl(s,'src/client/ui/world-panels-02.js','e5');decl(s,'src/client/ui/world-panels-01.js','IB');s.IB();
  assert.match(html,/Bí Kíp 120/);assert.match(html,/Bí Kíp 150/);
  assert.match(html,/data-ktc="mt120"/);assert.match(html,/data-ktc="mt150"/);
  assert.equal((html.match(/5000 KNB/g)||[]).length,2);
});
test('changing faction does not refund trained 150 levels as points and keeps their progress for relearning',()=>{
  const s=game();s.o.sk={1055:7,10:3};s.o.skL={1055:{lv:7,xp:12}};s.o.skPts=497;s.o.mats.misc.ldp=1;
  Object.assign(s,{hn:()=>true,Kr:()=>[0,0],_A:()=>null,w0:['#fff'],g0:['Kim']});
  decl(s,'src/client/gameplay/shop-and-books-02.js','N7');s.N7('tianwang');
  const starterCost=s.I.tianwang.starter?1:0;
  assert.equal(s.o.skPts,500-starterCost);assert.equal(s.o.fac,'tianwang');
  assert.equal(s.o.skL[1055].lv,7);assert.equal(s.o.skL[1055].xp,12);assert.equal(s.o.bkOk[1055],1);
});
test('disabled rebirth and its dialog leave the character unchanged',async()=>{
  const s=game();s.o.sk={1055:7,10:3};s.o.skL={1055:{lv:7,xp:12}};
  const before=JSON.stringify(s.o), messages=[];
  Object.assign(s,{k:message=>messages.push(message),X1:()=>assert.fail('must not prompt'),J:()=>assert.fail('must not open dialog')});
  decl(s,'src/client/systems/rewards-01.js','ob');
  decl(s,'src/client/systems/rewards-02.js','_h');
  s._h();await s.ob();
  assert.equal(JSON.stringify(s.o),before);
  assert.equal(messages.length,2);
  assert.ok(messages.every(message=>message.includes('đã tắt')));
});
