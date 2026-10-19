const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
const {loadCombatEngine}=require('./helpers/combat-engine');
function damageScene(lowFx=false){
 const s={o:{lowFx},l:{txt:[],quiet:false}};vm.createContext(s);loadCombatEngine(s);return s;
}
function scene(lowFx=false){
 const source=fs.readFileSync('src/client/render/arena-01.js','utf8');
 const node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='$A'));
 const s={o:{lowFx},l:{txt:[],quiet:false}};vm.createContext(s);vm.runInContext(source.slice(node.start,node.end),s);return s;
}
function separated(labels){
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  const a=labels[i],b=labels[j];
  assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2 || a.y<=b.y-b.height || b.y<=a.y-a.height,`${a.t} overlaps ${b.t}`);
 }
}
test('simultaneous hits and status labels at clustered targets occupy separate visible bounds',()=>{
 const s=scene();for(let i=0;i<30;i++)s.$A(200+i%3,200,['518 🛡','1250 ⚡','☠123','Trượt'][i%4],'#fff',i%2?12:16);
 assert.equal(s.l.txt.length,30);separated(s.l.txt);
 for(const label of s.l.txt){label.y-=9.6;label.life-=.3;}
 for(let i=0;i<10;i++)s.$A(200,200,'600','#fff',12);
 separated(s.l.txt);
});
test('expired labels free their slots; quiet mode suppresses labels and low-effects bounds the queue',()=>{
 const s=scene(true);s.$A(10,10,'1','#fff');s.l.txt[0].life=0;s.$A(10,10,'2','#fff');assert.equal(s.l.txt[1].x,10);assert.equal(s.l.txt[1].y,10);
 s.l.quiet=true;s.$A(10,10,'hidden','#fff');assert.equal(s.l.txt.length,2);s.l.quiet=false;
 for(let i=0;i<30;i++)s.$A(10,10,String(i),'#fff');assert.equal(s.l.txt.length,20);assert.equal(s.l.txt.at(-1).t,'29');separated(s.l.txt);
});

test('a burst is summed from raw amounts only for the same recipient, element and critical state',()=>{
 const s=damageScene(),a={x:200,y:200},b={x:200,y:200};
 for(let i=0;i<20;i++)s.showDamageNumber(a,1.25,'cold');
 assert.equal(s.l.txt.length,1);assert.equal(s.l.txt[0].amount,25);assert.equal(s.l.txt[0].t,'25');assert.equal(s.l.txt[0].hits,20);
 s.showDamageNumber(b,10,'cold');s.showDamageNumber(a,10,'fire');s.showDamageNumber(a,10,'cold',true);
 assert.equal(s.l.txt.length,4);assert.equal(s.l.txt[1].target,b);
 assert.equal(s.l.txt[1].amount,10);assert.equal(s.l.txt[2].amount,10);assert.equal(s.l.txt[3].amount,10);
 assert.equal(s.l.txt[3].color,s.CombatEngine.DAMAGE_LABEL_COLORS.critical);
});

test('newest damage is centered with the largest paint index and older rows stack upward, following a moving target',()=>{
 const s=damageScene(),target={x:200,y:200};
 s.showDamageNumber(target,10);s.updateDamageLabels(s.l.txt,.15);
 s.showDamageNumber(target,20);s.updateDamageLabels(s.l.txt,.15);s.showDamageNumber(target,30);
 const [old,middle,newest]=s.l.txt;
 assert.ok(old.index<middle.index&&middle.index<newest.index);
 assert.equal(newest.y,170);assert.equal(middle.y,151);assert.equal(old.y,132);
 target.x=250;target.y=400;s.updateDamageLabels(s.l.txt,.02);
 assert.ok(s.l.txt.every(label=>label.x===250));assert.equal(newest.y,369.2);assert.equal(old.y,331.2);
 assert.equal(target.x,250);assert.equal(target.y,400);
});

test('refreshing a compatible burst promotes it above other types without extending its merge window',()=>{
 const s=damageScene(),target={x:20,y:90};
 s.showDamageNumber(target,10,'cold');const cold=s.l.txt[0];
 s.showDamageNumber(target,20,'phys');s.updateDamageLabels(s.l.txt,.08);
 s.showDamageNumber(target,5,'cold');assert.equal(s.l.txt.at(-1),cold);
 assert.equal(cold.t,'15');assert.equal(cold.hits,2);assert.equal(cold.y,60);assert.equal(s.l.txt[0].y,41);
 s.updateDamageLabels(s.l.txt,.08);s.showDamageNumber(target,7,'cold');
 assert.equal(s.l.txt.length,3);assert.notEqual(s.l.txt.at(-1),cold);assert.equal(cold.amount,15);
});

test('dense continuous hits remain bounded per target; quiet mode, expiry and a reset release their stacks',()=>{
 for(const lowFx of [false,true]){
  const s=damageScene(lowFx),target={x:20,y:90,hp:100};
  for(let i=0;i<60;i++){s.showDamageNumber(target,10);s.updateDamageLabels(s.l.txt,.15);s.l.txt=s.l.txt.filter(label=>label.life>0);}
  assert.ok(s.l.txt.length>1&&s.l.txt.length<=(lowFx?3:4));assert.equal(target.hp,100);
  assert.equal(s.l.txt.at(-1).y,54);assert.ok(s.l.txt.every(label=>label.x===20));
  const count=s.l.txt.length;s.l.quiet=true;s.showDamageNumber(target,10);assert.equal(s.l.txt.length,count);
  s.l.quiet=false;s.updateDamageLabels(s.l.txt,s.CombatEngine.DAMAGE_LABEL_LAYOUT.lifetime+1);s.l.txt=s.l.txt.filter(label=>label.life>0);
  s.showDamageNumber(target,12);assert.equal(s.l.txt.length,1);assert.equal(s.l.txt[0].y,60);
  s.l.txt=[];s.showDamageNumber(target,8);assert.equal(s.l.txt.length,1);assert.equal(s.l.txt[0].amount,8);
 }
});

test('misses and blocked hits share the target stack without being counted as numeric damage',()=>{
 const s=damageScene(),target={x:20,y:90};
 s.showDamageNumber(target,'Trượt');s.showDamageNumber(target,'Trượt');s.showDamageNumber(target,20);
 assert.equal(s.l.txt[0].t,'Trượt');assert.equal(s.l.txt[0].hits,2);assert.equal(s.l.txt[0].amount,0);assert.equal(s.l.txt[1].amount,20);
 assert.equal(s.l.txt[0].color,s.CombatEngine.DAMAGE_LABEL_COLORS.status);
 const length=s.l.txt.length;for(const value of [0,-10,NaN,Infinity])s.showDamageNumber(target,value);
 assert.equal(s.l.txt.length,length);
});

test('all ordinary elements use red and critical hits stay yellow',()=>{
 const s=damageScene(),colors=s.CombatEngine.DAMAGE_LABEL_COLORS;
 for(const kind of ['phys','fire','cold','light','poison','unknown']){
  const target={x:0,y:0};s.showDamageNumber(target,100,kind);
  assert.equal(s.l.txt.at(-1).color,colors.phys);
  s.showDamageNumber(target,100,kind,true);assert.equal(s.l.txt.at(-1).color,colors.critical);
 }
});

test('real outgoing and incoming damage keep individual HP/log events while only floating numbers are summed',()=>{
 const s=damageScene();Object.assign(s,{
  Math:Object.assign(Object.create(Math),{random:()=>.5}),m0:0,T:{},r0:{1:{anim:{}}},
  Rn:()=>null,E8(){},Z:(lo,hi)=>(lo+hi)/2,y1:()=>false,ja:damage=>damage,ea:()=>1,
  W3(){},Dw:{},Yr:75,U9(){},$d(){},
 });
 Object.assign(s.o,{fac:'cuiyan',name:'Tester'});Object.assign(s.l,{P:{heavy:0,res:{}},life:1000});s.v={x:50,y:70,act:'at'};
 const source=fs.readFileSync('src/client/core/state-and-save-01.js','utf8');
 for(const name of ['hs','U9']){
  const node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
  vm.runInContext(source.slice(node.start,node.end),s);
 }
 vm.runInContext(fs.readFileSync('src/client/ui/combat-log-01.js','utf8'),s);
 const monster={x:200,y:300,n:'Quái',hp:1000,tid:1,act:'at',res:{},series:0,ar:100,dmg:10};
 const skill={parts:{phys:100},crit:0,ev2:true};
 s.hs(skill,monster);s.hs(skill,monster);
 assert.equal(monster.hp,800);assert.equal(s.l.txt.length,1);assert.equal(s.l.txt[0].t,'200');
 assert.equal(s.combatLog.entries('out').length,2);assert.ok(s.combatLog.entries('out').every(event=>event.amount===100));
 s.Pe=()=>100;s.U9(monster);s.U9(monster);
 assert.equal(s.l.life,980);assert.equal(s.l.txt.length,2);assert.equal(s.l.txt[1].t,'20');assert.equal(s.l.txt[1].target,s.v);
 assert.equal(s.combatLog.entries('in').length,2);assert.ok(s.combatLog.entries('in').every(event=>event.amount===10));
});

test('floating damage respects the configured duration; a newer hit pushes the old one upward without extending its life',()=>{
 for(const lowFx of [false,true]){
  const s=damageScene(lowFx),target={x:100,y:100};
  const duration=lowFx?s.CombatEngine.DAMAGE_LABEL_LAYOUT.lowFxLifetime:s.CombatEngine.DAMAGE_LABEL_LAYOUT.lifetime;
  s.showDamageNumber(target,100);const old=s.l.txt[0];assert.equal(old.life,duration);
  s.updateDamageLabels(s.l.txt,.3);s.showDamageNumber(target,200);const newest=s.l.txt.at(-1);
  assert.equal(newest.y,70);assert.equal(old.y,51);assert.ok(newest.index>old.index);assert.equal(old.life,duration-.3);
  s.updateDamageLabels(s.l.txt,duration-.3+.001);assert.ok(old.life<=0);assert.ok(newest.life>0);
  s.updateDamageLabels(s.l.txt,.3);assert.ok(newest.life<=0);
  assert.ok(s.l.txt.every(label=>!label.t.includes('×')));
 }
});

test('a lone number rises immediately, and measured digits leave exactly 2px between stroked rows of different sizes',()=>{
 const s=damageScene(),target={x:100,y:100};
 s.W={font:'',save(){},restore(){},measureText(){return {actualBoundingBoxAscent:this.font.startsWith('16')?12:10,actualBoundingBoxDescent:1};}};
 s.showDamageNumber(target,100);const old=s.l.txt[0];assert.equal(old.y,70);
 s.updateDamageLabels(s.l.txt,.05,s.W);assert.equal(old.y,68);
 s.showDamageNumber(target,200,'phys',true);const newest=s.l.txt.at(-1);
 assert.equal(newest.y,70);assert.equal(old.y,52);
 // Upper bottom = baseline + descent + half stroke; lower top = baseline - ascent - half stroke.
 const gap=(newest.y-newest.ascent-1.5)-(old.y+old.descent+1.5);assert.equal(gap,2);
 s.updateDamageLabels(s.l.txt,.05,s.W);assert.equal(newest.y,68);assert.equal(old.y,50);
 assert.ok(newest.index>old.index);
});
