const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
function scene(lowFx=false){
 const source=fs.readFileSync('app/render/arena-01.js','utf8');
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
