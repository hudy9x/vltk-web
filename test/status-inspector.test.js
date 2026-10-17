const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
const {compileTypeScriptEntry}=require('../tools/build-app');
function declaration(s,file,name){const text=fs.readFileSync(file,'utf8');const node=acorn.parse(text,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));assert.ok(node,name);vm.runInContext(text.slice(node.start,node.end),s);}
function game(){
 const elements=new Map(),timers=[],listeners={};
 function element(){return {hidden:false,style:{},attributes:{},textContent:'',_html:'',value:'auto',scrollTop:0,options:[{value:'auto'}],setAttribute(k,v){this.attributes[k]=v;},focus(){this.focused=true;},remove(){},
  set innerHTML(html){this._html=html;this.options=[...html.matchAll(/<option value="([^"]+)"/g)].map(m=>({value:m[1]}));},get innerHTML(){return this._html;},
  querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);},querySelectorAll(){return [];}};}
 const s={Math,Date,Intl,Set,Map,WeakMap,setInterval:fn=>timers.push(fn),clearInterval(){},
 document:{createElement:element,head:{appendChild(){}},body:{appendChild(){}},addEventListener:(name,fn)=>listeners[name]=fn},
 o:{name:'Kiểm thử',fac:'wudang',lvl:100,attr:{str:10,dex:10,vit:10,eng:100},sk:{1:2,2:1},eq:{},inv:[],main:1,mainLock:true,potUsed:0},
 l:{enemies:[],P:{},life:100,mana:100},m0:1,
 T:{1:{id:1,n:'Băng kiếm',phys:1,series:2,attr:{physicsenhance_p:[0,0,0],colddamage_v:l=>[50*l,18,50*l],stun_p:l=>[5*l,0,0]}},2:{id:2,n:'Tâm pháp choáng',attr:{do_stun_p:l=>[2*l,0,0]}}},
 S:{levelAdd:[{LifePerLevel:1,LifePerVitality:1,ManaPerLevel:1,ManaPerEnergy:1,physicres:0,poisonres:0,coldres:0,fireres:0,lightingres:0}]},
 F0:()=>0,O5:()=>({str:10,dex:10,vit:10,eng:10,life:100,mana:100}),sA:x=>x,Ti:x=>x,Rw:{},Dt:()=>3,R5:x=>!x.disabled,Y4:()=>0,Yw:1,Ei:.08,A4:.05,Si:.04,ko:(_item,x)=>x,t4:()=>9,
 b0:(skill,key,level)=>{const v=skill.attr[key];return typeof v==='function'?v(level):v||null;},K5:/^(skill_|missle_|addskill)/,E5:()=>true,UA:s=>s.id===1,Vi:()=>true,
 nm:()=>[],Hb(){},Qb(){},mo:()=>({dmg:0}),g7:1,uw:0,Yr:75,Fr:0,Vr:0,dw:5,k5:5,Q5:1,a4:()=>false,
 Q0:['phys','cold','poison','fire','light'],P5:{phys:'physicsres_p',cold:'coldres_p',poison:'poisonres_p',fire:'fireres_p',light:'lightingres_p'},
 rw:{cold:'addcolddamage_v',poison:'addpoisondamage_v',fire:'addfiredamage_v',light:'addlightingdamage_v'},v5:{cold:'coldenhance_p'},
 Rr:{phys:'physicsdamage_v',cold:'colddamage_v',poison:'poisondamage_v',fire:'firedamage_v',light:'lightingdamage_v'},
 E:(x,a,b)=>Math.max(a,Math.min(b,x)),Ew:()=>0,Xr:()=>0,Ci:()=>true,j1:()=>null,te:()=>false,p0:()=>true,Ur:()=>0,
 h4:{},U2:()=>false,r4:()=>1,n7:()=>false,Cw:()=>1,i4:()=>false,r7:new Set(),Fw:{},Li:()=>1,Zw:()=>0,q5:()=>1,J5:1,y5:2,w4:1,s7:1,
 f8:1.5,Od:0,Ed:.5,gD:.6,uD:{boss:.1,elite:.05},cw:75,Rn:()=>null,F5:()=>[],S5:()=>({}),bo:()=>null,
 ja:(damage,_kind,_from,_to,res)=>damage*(100-Math.max(-75,Math.min(75,res.cold)))/100,
 };
 vm.createContext(s);
 for(const name of ['pt','M5','ua','j0'])declaration(s,'app/core/attributes-01.js',name);
 declaration(s,'app/combat/skills-01.js','z');
 for(const name of ['F2','Ow'])declaration(s,'app/core/attributes-02.js',name);
 vm.runInContext(compileTypeScriptEntry('status/index.ts','StatusInspector').code,s);
 s.timers=timers;s.listeners=listeners;s.elements=elements;
 s.gear={n:'Nhẫn băng',base:[],mag:[{a:'do_stun_p',p:[25,0,0]},{a:'anti_stuntimereduce_p',p:[300,0,0]},
 {a:'coldenhance_p',p:[36,0,0]},{a:'addcolddamage_v',p:[100,0,0]},{a:'allskill_v',p:[2,0,0]},
 {a:'freezetimereduce_p',p:[100,0,0]},{a:'anti_do_stun_p',p:[100,0,0]}]};
 s.l.P=s.j0();return s;
}
function inspector(s){return s.StatusInspector.inspector;}
function text(s){return s.elements.get('#status-log-content').innerHTML;}

test('tracing real j0 preserves every final stat and attributes activated equipment, skill levels and clamps',()=>{
 const s=game();s.o.eq.ring1=s.gear;
 const trace=s.StatusInspector.createSourceCollector(),withTrace=s.j0(undefined,trace.capture),normal=s.j0();
 assert.deepEqual(withTrace,normal);
 assert.equal(withTrace.stunAdd,31);assert.equal(withTrace.stunLong,200);assert.equal(withTrace.freezeRed,80);assert.equal(withTrace.antiStun,80);
 assert.equal(withTrace.coldEnh,36);assert.equal(withTrace.main.L,4);assert.equal(withTrace.main.parts.cold,300);
 const gear=trace.sources.find(x=>x.kind==='equipment');assert.equal(gear.values.anti_stuntimereduce_p,300);assert.equal(gear.values.allskill_v,2);
 const skill=trace.sources.find(x=>x.kind==='skill');assert.equal(skill.values.do_stun_p,6);assert.equal(skill.level,3);
 s.gear.disabled=true;const inactive=s.StatusInspector.createSourceCollector();const off=s.j0(undefined,inactive.capture);
 assert.equal(off.plusSkill,0);assert.equal(off.stunAdd,2);assert.equal(inactive.sources[0].kind,'inactive');assert.deepEqual(Object.keys(inactive.sources[0].values),[]);
});

test('separate toggle starts closed, opens four live formulas, and closes by button or Escape without changing combat',()=>{
 const s=game(),p=inspector(s),before=JSON.stringify(s.o);
 assert.equal(p.panel.hidden,true);assert.equal(p.toggle.hidden,false);p.toggle.onclick();
 assert.equal(p.panel.hidden,false);assert.equal(p.toggle.attributes['aria-expanded'],'true');
 assert.equal(p.model.metrics[0].value,'12%');assert.equal(p.model.metrics[1].value,'0,8 giây');assert.equal(p.model.metrics[2].value,'1 giây');
 assert.match(text(s),/85–115|0,85/);assert.match(text(s),/FPS/);
 s.elements.get('#status-log-close').onclick();assert.equal(p.panel.hidden,true);assert.equal(p.toggle.focused,true);
 p.setOpen(true);s.listeners.keydown({key:'Escape'});assert.equal(p.panel.hidden,true);assert.equal(JSON.stringify(s.o),before);
});

test('equipment, skill allocation, removal and potential update final formulas and per-source values live',()=>{
 const s=game(),p=inspector(s);p.setOpen(true);s.o.eq.ring1=s.gear;s.timers[0]();
 assert.equal(p.model.metrics[0].value,'51%');assert.equal(p.model.metrics[1].value,'2,4 giây');assert.equal(p.model.metrics[2].value,'3 giây');
 assert.match(text(s),/Nhẫn băng/);assert.match(text(s),/\+300/);assert.match(text(s),/Tâm pháp choáng/);assert.match(p.history[0],/Nhẫn băng/);
 s.o.sk[1]=3;s.timers[0]();assert.equal(p.model.metrics[0].value,'56%');assert.match(p.history[0],/cấp 2 → 3/);
 s.o.attr.eng=150;s.timers[0]();assert.match(p.model.potentials,/150/);assert.match(p.history[0],/Nội công 100 → 150/);
 delete s.o.eq.ring1;s.timers[0]();assert.equal(p.model.metrics[0].value,'17%');assert.equal(p.model.metrics[2].value,'1 giây');
 assert.ok(!p.model.sources.some(source=>source.name.includes('Nhẫn băng')));
 assert.match(p.history[0],/Nhẫn băng → Trống/);
});

test('selected target resistance changes slow intensity without changing skill duration and snapshots are bounded',()=>{
 const s=game(),p=inspector(s);p.setOpen(true);const first=p.model.metrics[3].value;
 s.l.enemies=[{n:'Quái kháng băng',hp:100,max:100,res:{cold:75},series:0}];s.timers[0]();
 assert.notEqual(p.model.metrics[3].value,first);assert.equal(p.model.metrics[2].value,'1 giây');assert.match(text(s),/75%/);
 for(let i=0;i<50;i++){s.o.attr.eng++;s.timers[0]();}assert.equal(p.history.length,40);
 s.elements.get('#status-log-clear').onclick();assert.equal(p.history.length,0);
});

test('drinking recovery/XP potions is logged without inventing status bonuses; expired buffs are removed',()=>{
 const s=game(),p=inspector(s);p.setOpen(true);const values=p.model.metrics.map(row=>row.value);
 s.o.potUsed++;s.o.buf={xp:{p:.2,until:Date.now()+60000}};s.timers[0]();
 assert.deepEqual(p.model.metrics.map(row=>row.value),values);assert.match(p.history[0],/Số thuốc hồi đã dùng 0 → 1/);assert.match(text(s),/Kinh nghiệm/);
 s.o.buf.xp.until=Date.now()-1;s.timers[0]();assert.ok(!p.model.consumables.some(line=>line.includes('Kinh nghiệm')));
});

test('active skill buffs and named secondary stun branches are explained independently of the primary',()=>{
 const s=game(),p=inspector(s);let enabled=true;
 s.T[3]={id:3,n:'Buff kéo dài',attr:{anti_stuntimereduce_p:[50,0,0]}};s.o.sk[3]=1;s.Vi=data=>data.id!==3||enabled;
 s.F5=()=>[{n:'Choáng từ nhánh phụ',stun:30}];s.S5=()=>({light:10});p.setOpen(true);
 assert.equal(p.model.metrics[1].value,'1,2 giây');assert.match(text(s),/Buff kéo dài/);assert.equal(p.model.events[0].chance,'32% khi nhánh trúng');
 enabled=false;s.timers[0]();assert.equal(p.model.metrics[1].value,'0,8 giây');assert.ok(!p.model.sources.some(x=>x.name==='Buff kéo dài'));
});

test('profile switching resets history and markup escapes player/item names',()=>{
 const s=game(),p=inspector(s);s.o.name='<img src=x onerror=alert(1)>';s.o.eq.ring1={...s.gear,n:'<script>bad</script>'};p.setOpen(true);
 assert.ok(!text(s).includes('<script>bad'));assert.match(text(s),/&lt;script&gt;bad/);assert.ok(!text(s).includes('<img src=x'));
 s.o.name='Nhân vật khác';s.o.eq={};s.timers[0]();assert.equal(p.history.length,1);assert.match(p.model.owner,/Nhân vật khác/);
});

test('magic cold provenance follows real F2 energy scaling and status preview cannot change player stats',()=>{
 const s=game(),p=inspector(s);delete s.T[1].attr.physicsenhance_p;s.T[1].phys=0;s.l.P=s.j0();
 const before=JSON.stringify(s.l.P);p.setOpen(true);
 assert.equal(p.model.coldSteps.find(row=>row.name==='Hệ số từ tiềm năng Nội công').value,'1,22×');
 assert.equal(p.model.coldSteps.at(-1).value,'122');assert.match(p.model.potentials,/gốc 10 \+ đã cộng 100/);
 assert.ok(!p.model.notes.some(note=>note.includes('phần điều chỉnh khác')));assert.equal(JSON.stringify(s.l.P),before);
 s.o.attr.eng=150;s.timers[0]();assert.equal(p.model.coldSteps.at(-1).value,'132');
});

test('actual target status is separate from the preview and expires without inventing a new application',()=>{
 const s=game(),p=inspector(s),target={n:'Quái',hp:100,res:{cold:0},slowT:2,slowPower:.25,stun:.8};
 s.l.enemies=[target];p.setOpen(true);assert.equal(p.model.actual[0].value,'25%');assert.equal(p.model.actual[1].value,'2 giây');
 target.slowT=0;target.stun=0;s.timers[0]();assert.equal(p.model.actual[0].value,'0%');assert.equal(p.model.actual[2].value,'0 giây');
});
