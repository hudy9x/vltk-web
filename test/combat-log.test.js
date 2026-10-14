const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app/ui/combat-log-01.js'),'utf8');
function game(){
 const s={Date,Math,Number,o:{fac:'wudang',name:'Tester'},m0:0,l:{life:100,quiet:false},T:{1:{n:'Chiêu test'}},saved:0,refreshes:0,
 D:text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),$:()=>s.saved++,T2:()=>s.refreshes++,
 hs:(skill,target)=>{target.hp-=skill.damage||0;return skill.damage||0;},
 U9:attacker=>{if(!attacker.miss){s.l.life-=attacker.damage;attacker.hp-=attacker.reflection||0;}},
 $d:(monster,dt)=>{monster.hp-=(monster.dot||0)*dt;},};
 vm.createContext(s);vm.runInContext(source,s);return s;
}
test('combat log records actual lost HP after impact, including overkill, incoming attacks and reflected damage',()=>{
 const s=game(),monster={n:'Hổ',hp:35};
 assert.equal(s.hs({id:1,damage:100},monster),100);
 let entries=s.combatLog.entries();assert.equal(entries.length,1);assert.equal(entries[0].amount,35);assert.equal(entries[0].detail,'Chiêu test');
 s.l.life=30;const attacker={n:'Sói',hp:10,damage:50,reflection:20};s.U9(attacker);
 entries=s.combatLog.entries();assert.equal(entries.length,3);assert.equal(entries[1].type,'in');assert.equal(entries[1].amount,30);assert.equal(entries[2].amount,10);assert.equal(entries[2].detail,'Phản đòn');
});
test('combat log ignores misses, healing, zero damage and offline simulation, while tracking damage-over-time',()=>{
 const s=game(),monster={n:'Hổ',hp:100,dot:3};
 s.hs({id:1,damage:0},monster);s.hs({id:1,damage:-10},monster);s.U9({n:'Sói',hp:100,damage:5,miss:true});
 assert.equal(s.combatLog.entries().length,0);
 s.$d(monster,.5);assert.equal(s.combatLog.entries()[0].amount,1.5);
 s.l.quiet=true;s.hs({id:1,damage:10},monster);assert.equal(s.combatLog.entries().length,1);
});
test('combat log filters outgoing/incoming independently and clears old character data when switching profiles',()=>{
 const s=game();s.combatLog.record('out','Hổ',20);s.combatLog.record('in','Sói',1);
 assert.equal(s.combatLog.entries('both').length,2);assert.equal(s.combatLog.entries('out').length,1);assert.equal(s.combatLog.entries('in').length,1);
 s.o={fac:'gaibang',name:'Other',arenaFaction:'gaibang'};assert.equal(s.combatLog.entries().length,0);
 s.combatLog.record('out','Sói',15);assert.equal(s.combatLog.entries()[0].amount,15);
});
function logContainer() {
 const nodes={};let mounts=0;
 return {get mounts(){return mounts;},set innerHTML(html){mounts++;for(const key of ['#combat-log-filter','#combat-log-clear','#combat-log-copy','.combat-log-status','.combat-log-rows'])nodes[key]={value:'both',innerHTML:'',textContent:''};this.toolbar=html;},querySelector:selector=>nodes[selector]||null};
}
test('continuous damage preserves mounted controls and filter preferences',()=>{
 const s=game();for(let i=1;i<=500;i++)s.combatLog.record(i%2?'out':'in','<Quái>',i,'Chiêu test');
 assert.equal(s.combatLog.entries().length,300);assert.equal(s.combatLog.entries()[0].amount,201);
 const container=logContainer();s.combatLog.render(container);
 const filter=container.querySelector('#combat-log-filter'),handler=filter.onchange;
 assert.match(container.toolbar,/Cả hai/);
 assert.match(container.querySelector('.combat-log-rows').innerHTML,/&lt;Quái&gt;/);
 assert.doesNotMatch(container.querySelector('.combat-log-rows').innerHTML,/Chiêu test|<Quái>/);
 filter.onchange({target:{value:'in'}});assert.equal(s.o.combatLogFilter,'in');assert.equal(s.saved,1);assert.equal(s.refreshes,1);
 for(let i=0;i<20;i++){s.combatLog.record('out','Hổ',10);s.combatLog.render(container);}
 assert.equal(container.mounts,1);assert.equal(container.querySelector('#combat-log-filter'),filter);assert.equal(filter.onchange,handler);assert.equal(filter.value,'in');
 assert.doesNotMatch(container.querySelector('.combat-log-rows').innerHTML,/combat-out/);assert.match(container.querySelector('.combat-log-rows').innerHTML,/combat-in/);
});
test('copy exports all filtered events without skill names; clear removes both damage types and combat continues',async()=>{
 const s=game(),container=logContainer();let copied='';s.navigator={clipboard:{writeText:async text=>{copied=text;}}};
 s.combatLog.record('out','Hổ',20,'Chiêu test');s.combatLog.record('in','Sói',1,'Đòn đánh');s.o.combatLogFilter='out';s.combatLog.render(container);
 await container.querySelector('#combat-log-copy').onclick();assert.match(copied,/Gây 20 ⚔️ lên Hổ/);assert.doesNotMatch(copied,/Chiêu test|Sói/);assert.equal(container.querySelector('.combat-log-status').textContent,'Đã copy log');
 s.navigator.clipboard.writeText=async()=>{throw Error('Denied');};await container.querySelector('#combat-log-copy').onclick();assert.match(container.querySelector('.combat-log-status').textContent,/Không thể copy/);
 container.querySelector('#combat-log-clear').onclick();assert.equal(s.combatLog.entries().length,0);assert.equal(s.o.combatLogFilter,'out');
 await container.querySelector('#combat-log-copy').onclick();assert.match(container.querySelector('.combat-log-status').textContent,/Chưa có log/);
 s.combatLog.record('out','Hổ',7);s.combatLog.render(container);assert.match(container.querySelector('.combat-log-rows').innerHTML,/>7<\/b>/);assert.equal(container.mounts,1);
});

test('the real player poison tick records its fractional HP loss as incoming damage',()=>{
 const s=game();Object.assign(s.l,{P:{life:100,mana:100,regen:0,manaRegen:0},mana:100,town:true,hpDotT:1,hpDot:10});
 for(const name of ['$w','Sb','advanceSkillContacts','X9','nP','Ab','cb','Oy','Gv'])s[name]=()=>{};
 const acorn=require('acorn'),text=fs.readFileSync(path.join(__dirname,'../app/core/state-and-save-02.js'),'utf8');
 const node=acorn.parse(text,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='Td'));
 vm.runInContext(text.slice(node.start,node.end),s);s.Td(.25);
 assert.equal(s.l.life,97.5);assert.equal(s.combatLog.entries('in').length,1);assert.equal(s.combatLog.entries()[0].amount,2.5);
});

 test('misses have stable sequence numbers, follow direction filters, and share the hh:ss export format',()=>{
 const s=game(),container=logContainer();s.combatLog.miss('out','Hổ');s.combatLog.record('out','Hổ',12);s.combatLog.miss('in','Sói');
 assert.equal(s.combatLog.entries('out').length,2);assert.equal(s.combatLog.entries('in')[0].sequence,3);
 assert.match(s.combatLog.text(),/^001 - \d{2}:\d{2} → Trượt ⚔️ lên Hổ/m);
 s.combatLog.render(container);assert.match(container.querySelector('.combat-log-rows').innerHTML,/Trượt/);assert.doesNotMatch(container.querySelector('.combat-log-rows').innerHTML,/sát thương/);
 s.l.quiet=true;s.combatLog.miss('out','Hổ');assert.equal(s.combatLog.entries().length,3);
 s.l.quiet=false;s.combatLog.clear();s.combatLog.miss('out','Hổ');assert.equal(s.combatLog.entries()[0].sequence,1);
 });
 test('real accuracy failure logs one outgoing miss and one incoming miss without damage',()=>{
 const s=game(),core=fs.readFileSync(path.join(__dirname,'../app/core/state-and-save-01.js'),'utf8'),acorn=require('acorn');
 const nodes=acorn.parse(core,{ecmaVersion:'latest'}).body.filter(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>['hs','U9'].includes(d.id.name)));
 s.Math=Object.create(Math);s.Math.random=()=>1;s.Pe=()=>50;s.$A=()=>{};s.v={x:0,y:0};s.l.P={ar:1,def:1};
 for(const node of nodes)vm.runInContext(core.slice(node.start,node.end),s);
 const monster={n:'Hổ',hp:100,def:1,ar:1,x:0,y:0,r:10};s.hs({useAR:true,ar:1},monster);s.U9(monster);
 assert.equal(monster.hp,100);assert.equal(s.l.life,100);assert.equal(s.combatLog.entries().length,2);assert.equal(s.combatLog.entries()[0].outcome,'miss');assert.equal(s.combatLog.entries()[1].type,'in');
 });

test('sequence format pads to three digits and preserves values above 999 in display and copied logs',()=>{
 const s=game(),container=logContainer();s.combatLog.record('out','Hổ',1);assert.match(s.combatLog.text(),/^001 -/);
 for(let i=2;i<=1001;i++)s.combatLog.record('out','Hổ',1);
 assert.match(s.combatLog.text(),/^999 -/m);assert.match(s.combatLog.text(),/^1000 -/m);assert.match(s.combatLog.text(),/^1001 -/m);
 s.combatLog.render(container);assert.match(container.querySelector('.combat-log-rows').innerHTML,/>999 -/);assert.match(container.querySelector('.combat-log-rows').innerHTML,/>1000 -/);assert.doesNotMatch(s.combatLog.text(),/1000\. -/);
});
