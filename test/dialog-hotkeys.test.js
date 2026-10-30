const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
  const nodes=new Map(),calls=[];let handle,capture;
  const s={o:{fac:'shaolin'},document:{getElementById:id=>nodes.get(id)},
    window:{addEventListener(type,fn,option){assert.equal(type,'keydown');handle=fn;capture=option;}},
    Bm:()=>true,bB:panel=>calls.push(panel),ui:()=>calls.push('party'),n0:()=>calls.push('modal-close'),
    developerTools:{closeOpen:()=>calls.push('tools-close')}};
  vm.runInNewContext(fs.readFileSync('src/client/ui/keyboard-shortcuts-01.js','utf8'),s);
  function press(key,extra={}){const e={key,target:{tagName:'BODY'},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};handle(e);return e;}
  return {s,nodes,calls,press,get capture(){return capture;}};
}
test('dialog keys capture conflicts, accept uppercase and do not toggle repeatedly while held',()=>{
  const f=fixture();assert.equal(f.capture,true);
  for(const [key,panel]of[['Q','char'],['w','inv'],['E','skill'],['r','forge'],['T','quest'],['P','party'],['Escape','more']]){
    const e=f.press(key);assert.equal(e.prevented,true);assert.equal(e.stopped,true);assert.equal(f.calls.at(-1),panel);
    const n=f.calls.length,repeat=f.press(key,{repeat:true});assert.equal(f.calls.length,n);assert.equal(repeat.stopped,true);
  }
});
test('typing, browser modifier combinations and blocked screens do not trigger dialogs',()=>{
  const f=fixture();
  for(const target of [{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{tagName:'SPAN',isContentEditable:true}]){
    const e=f.press('q',{target});assert.equal(e.prevented,undefined);
  }
  for(const modifier of ['ctrlKey','altKey','metaKey'])assert.equal(f.press('r',{[modifier]:true}).stopped,undefined);
  f.nodes.set('csel',{});assert.equal(f.press('q').stopped,undefined);f.nodes.delete('csel');
  f.nodes.set('battlefield-result',{hidden:false});assert.equal(f.press('Escape').stopped,undefined);f.nodes.delete('battlefield-result');
  f.nodes.set('modal',{classList:{contains:()=>false},dataset:{locked:'1'}});assert.equal(f.press('q').stopped,undefined);
  assert.deepEqual(f.calls,[]);
});
