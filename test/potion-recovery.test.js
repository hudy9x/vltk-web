const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const acorn=require('acorn');
const {loadCombatEngine}=require('./helpers/combat-engine');
function declaration(s,file,name){
 const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(node=>node.type==='VariableDeclaration'&&node.declarations.some(d=>d.id.name===name));
 assert.ok(node,name);vm.runInContext(source.slice(node.start,node.end),s);
}
function game(){
 const life={kind:'life',tier:1,n:'Máu',total:100,dur:5,price:50};
 const mana={kind:'mana',tier:1,n:'Mana',total:60,dur:5,price:40};
 const s={Math,Set,Map,o:{gold:10000,potBuy:false,potOff:true,stage:0},
 l:{life:10,mana:10,P:{life:1000,mana:1000,regen:0,manaRegen:0,main:{cost:0}},fx:[],enemies:[],corpses:[],town:true,zoneShown:1},v:{x:0,y:0},
 selected:{life,mana},stock:{life:5,mana:5,both:5},messages:[],Y:{},E:(x,lo,hi)=>Math.max(lo,Math.min(hi,x)),
 Ot:p=>p.price,_n(){},k:text=>s.messages.push(text),q:String,D:String,J9(){},ch:()=>null,r8:()=>null,
 C1:kind=>({1:s.stock[kind]}),
 $w(){},Sb(){},nP(){},Ab(){},cb(){},Oy(){},Gv(){},
 O0:{w:1000,h:1000},E0:{town:{bg:'town',id:'town',n:'Thành'}},X0:(x,y)=>[x,y],
 mapAdapter:{entryPosition:()=>[400,600]},ma(){},M1(){},bA:()=>({}),o0(){},_e(){},C(){},d0:1,AA:()=>({id:'field'}),Gn(){},
 m:()=>({textContent:'',classList:{remove(){},add(){}}}),
 };
 s.ic=index=>{const p=s.selected[index?'mana':'life'];if(!p||s.stock[p.kind]<=0)return null;s.stock[p.kind]--;return {p,free:true};};
 vm.createContext(s);loadCombatEngine(s);
 for(const name of ['ao','ih'])declaration(s,'app/ui/legacy-panels-and-audio-04.js',name);
 for(const name of ['Hd','X9'])declaration(s,'app/core/state-and-save-01.js',name);
 for(const name of ['Ms','nc','en'])declaration(s,'app/ui/legacy-panels-and-audio-03.js',name);
 declaration(s,'app/core/state-and-save-02.js','Td');return s;
}

test('HP and mana potions restore their complete amounts immediately, without a later healing tick',()=>{
 const s=game();s.Ms('life');s.Ms('mana');
 assert.equal(s.l.life,110);assert.equal(s.l.mana,70);assert.equal(s.o.potUsed,2);assert.equal(s.l.hot,undefined);
 s.Td(5);assert.equal(s.l.life,110);assert.equal(s.l.mana,70,'no queued mana recovery remains');
});

test('combined potions restore both resources immediately and cap at their respective maxima',()=>{
 const s=game();s.selected.life={kind:'both',tier:1,n:'Kép',total:100,mtotal:60,dur:5,mdur:5};
 s.Ms('life');assert.equal(s.l.life,110);assert.equal(s.l.mana,70);assert.equal(s.stock.both,4);
 assert.equal(s.l.potCd.life,.3);assert.equal(s.l.potCd.mana,.3);
 s.Ms('mana');assert.equal(s.stock.mana,5,'combined potion locks both slots');
 s.Td(.3);s.l.life=990;s.l.mana=980;s.Ms('life');assert.equal(s.l.life,1000);assert.equal(s.l.mana,1000);
});

test('manual potions cannot be reused at 299ms and unlock at 300ms without floating-point delay',()=>{
 const s=game();s.Ms('life');assert.equal(s.l.potCd.life,.3);
 s.Td(.299);s.Ms('life');assert.equal(s.stock.life,4);assert.equal(s.l.life,110);
 s.Td(.001);s.Ms('life');assert.equal(s.stock.life,3);assert.equal(s.l.life,210);
});

test('automatic recovery respects 300ms and recomputes mana need after a combined potion',()=>{
 const s=game();s.o.potOff=false;s.selected.life={kind:'both',tier:1,n:'Kép',total:600,mtotal:600,dur:5,mdur:5};
 s.X9(.01);assert.equal(s.l.life,610);assert.equal(s.l.mana,610);assert.equal(s.stock.both,4);assert.equal(s.stock.mana,5);
 s.l.life=10;s.l.mana=10;s.Td(.299);assert.equal(s.stock.both,4);
 s.Td(.001);assert.equal(s.stock.both,3);assert.equal(s.l.life,610);assert.equal(s.l.potCd.life,.3,'a newly used potion gets the full cooldown');
});

test('teleport in both directions uses the same 300ms cooldown',()=>{
 const s=game();s.l.town=false;s.nc();assert.equal(s.l.town,true);assert.equal(s.l.tpCd,.3);
 s.Td(.299);s.en();assert.equal(s.l.town,true);
 s.Td(.001);s.en();assert.equal(s.l.town,false);assert.equal(s.l.tpCd,.3);
 s.nc();assert.equal(s.l.town,false);s.advanceConsumableCooldowns(s.l,.3);s.nc();assert.equal(s.l.town,true);
});

test('paid potions still deduct currency once and ignore the old recovery-over-time state',()=>{
 const s=game();s.l.hot={life:100,lifeT:5,mana:100,manaT:5};s.Hd('life',s.selected.life,false);
 assert.equal(s.o.gold,9950);assert.equal(s.o.potUsed,1);assert.equal(s.l.life,110);assert.equal(s.l.hot,undefined);
 s.Td(1);assert.equal(s.l.life,110);assert.equal(s.l.mana,10);
});
