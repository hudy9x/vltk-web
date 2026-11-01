const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
  const nodes=new Map(),calls=[];let handle,capture;
  const s={o:{fac:'shaolin'},document:{getElementById:id=>nodes.get(id),querySelectorAll:()=>[],body:{classList:{contains:()=>false}}},
    window:{addEventListener(type,fn,option){assert.equal(type,'keydown');handle=fn;capture=option;}},
    Bm:()=>true,bB:panel=>calls.push(panel),ui:()=>calls.push('party'),n0:()=>calls.push('modal-close'),
    developerTools:{closeOpen:()=>{calls.push('tools-close');return false;}}};
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
test('Escape toggles system on desktop even when the floating inventory layout is supported',()=>{
 const f=fixture();let bag=false,windowOpen=false,current=null;
 f.s.O2=()=>true;f.s.dn=()=>bag;f.s.A5=()=>{bag=false;f.calls.push('bag-close');};
 f.s.document.body.classList.contains=name=>name==='u20win'&&windowOpen;
 f.s._r=()=>{windowOpen=false;current=null;f.calls.push('window-close');};
 f.s.bB=panel=>{current=panel;windowOpen=true;f.calls.push(panel);};
 f.press('Escape');assert.equal(current,'more');assert.equal(bag,false);
 f.press('Escape');assert.equal(windowOpen,false);assert.equal(bag,false);
 f.press('Escape');assert.equal(current,'more');
 bag=true;f.press('Escape');assert.equal(bag,false);assert.equal(windowOpen,true,'closing inventory does not toggle system behind it');
 f.press('Escape');assert.equal(windowOpen,false);
});
test('Escape closes the focused dialog first, then the topmost window, then toggles system',()=>{
 const f=fixture(),nodes=f.nodes;let bag=true,windowOpen=true;
 const node=(id,z)=>({id,styleZ:z});const bagNode=node('u2bagw',10),panelNode=node('panel',20);
 nodes.set('u2bagw',bagNode);nodes.set('panel',panelNode);
 f.s.getComputedStyle=element=>({zIndex:element.styleZ});f.s.dn=()=>bag;
 f.s.document.body.classList.contains=name=>name==='u20win'&&windowOpen;
 f.s.A5=()=>{bag=false;f.calls.push('bag-close');};f.s._r=()=>{windowOpen=false;f.calls.push('window-close');};
 f.press('Escape',{target:{closest:()=>bagNode}});assert.equal(bag,false);assert.equal(windowOpen,true);
 bag=true;f.press('Escape',{target:{closest:()=>panelNode}});assert.equal(windowOpen,false);assert.equal(bag,true);
 windowOpen=true;f.press('Escape');assert.equal(windowOpen,false);assert.equal(bag,true,'higher window closes before bag');
 f.press('Escape');assert.equal(bag,false);f.press('Escape');assert.equal(f.calls.at(-1),'more');
});
test('Escape repeat never closes a second dialog or opens system',()=>{
 const f=fixture();let bag=true;f.s.dn=()=>bag;f.s.A5=()=>{bag=false;};
 f.press('Escape',{repeat:true});assert.equal(bag,true);assert.deepEqual(f.calls,[]);
 f.press('Escape');assert.equal(bag,false);f.press('Escape',{repeat:true});assert.ok(!f.calls.includes('more'));
});
