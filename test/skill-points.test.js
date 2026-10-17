const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),acorn=require('acorn');
const ROOT=path.resolve(__dirname,'..');
function declaration(s,file,name){const text=fs.readFileSync(path.join(ROOT,file),'utf8');const node=acorn.parse(text,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));vm.runInContext(text.slice(node.start,node.end),s);}
function game(){
 const s={Math,T:{1:{id:1,n:'Chiêu 60',req:60,max:20},2:{id:2,n:'Chiêu 149',req:149,max:20},90:{id:90,n:'Chiêu 90',tier:90,req:80,max:20}},I:{wudang:{skills:[1,2,90]}},o:{fac:'wudang',lvl:150,sk:{1:5},skPts:495,main:1,mainLock:true},l:{P:{life:100,mana:100},life:100,mana:100},
 SA:()=>false,GA:()=>s.o.lvl,W2:skill=>s.o.lvl>=skill.req,m4:skill=>skill.tier===90,P4:()=>true,Z2(){},va:()=>s.o.skL||(s.o.skL={}),
 D0(){},tn(){},Zn(){},qA(){},_s(){},$(){},k(){}};
 vm.createContext(s);
 for(const name of ['Ni','Q1'])declaration(s,'app/core/attributes-02.js',name);
 declaration(s,'app/gameplay/skill-progression-01.js','unlockSkillBook');
 declaration(s,'app/combat/skills-01.js','Yi');
 declaration(s,'app/ui/legacy-panels-and-audio-01.js','qf');
 declaration(s,'app/ui/legacy-panels-and-audio-02.js','bulkSkillPoints');
 return s;
}
test('bulk max spends only the required skill points, and clear refunds all allocated points and unlocks the removed main skill',()=>{
 const s=game();assert.equal(s.bulkSkillPoints(1,'max'),15);assert.equal(s.o.sk[1],20);assert.equal(s.o.skPts,480);
 assert.equal(s.bulkSkillPoints(1,'clear'),20);assert.equal(s.o.sk[1],undefined);assert.equal(s.o.skPts,500);assert.equal(s.o.mainLock,false);
 assert.equal(s.bulkSkillPoints(1,'clear'),0);assert.equal(s.o.skPts,500);
});
test('bulk max respects remaining point budget and level requirements',()=>{
 const s=game();s.o.sk={};s.o.skPts=3;assert.equal(s.bulkSkillPoints(1,'max'),3);assert.equal(s.o.sk[1],3);assert.equal(s.o.skPts,0);
 s.o.skPts=50;assert.equal(s.bulkSkillPoints(2,'max'),2);assert.equal(s.o.sk[2],2);assert.equal(s.o.skPts,48);
 s.o.lvl=50;delete s.o.sk[1];assert.equal(s.bulkSkillPoints(1,'max'),0);assert.equal(s.o.sk[1],undefined);
});
test('arena preset level 90 skills remain max and cannot refund free mastery as skill points',()=>{
 const s=game();s.combatSandbox={};s.o.sk[90]=20;
 assert.equal(s.bulkSkillPoints(90,'clear'),0);assert.equal(s.o.sk[90],20);assert.equal(s.o.skPts,495);
 assert.equal(s.bulkSkillPoints(999,'max'),0);
});
