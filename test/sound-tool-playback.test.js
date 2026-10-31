const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { buildSync } = require('esbuild');
function load(file) {
  const source=buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
  const context={module:{exports:{}},exports:{}};context.exports=context.module.exports;vm.createContext(context);vm.runInContext(source,context);return context.module.exports;
}
const model=load('tools/map-tool/src/lib/sound-model.ts');
const {SoundPreviewPlayer}=load('tools/map-tool/src/lib/sound-player.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Audio extends EventTarget {
  src='';starts=[];listeners=new Map();
  async play(){this.starts.push(this.src);}
  pause(){}
  addEventListener(type,fn){super.addEventListener(type,fn);let set=this.listeners.get(type);if(!set)this.listeners.set(type,set=new Set());set.add(fn);}
  removeEventListener(type,fn){super.removeEventListener(type,fn);this.listeners.get(type)?.delete(fn);}
  end(){this.dispatchEvent(new Event('ended'));}
  fail(){this.dispatchEvent(new Event('error'));}
  count(){return [...this.listeners.values()].reduce((n,set)=>n+set.size,0);}
}
const clip=id=>({id,label:id});

test('filtering lists every skill in faction, combines elements, searches without accents and sorts by level',()=>{
 const cfg=JSON.parse(fs.readFileSync('src/client/combat/audio/config.json'));
 const all=model.filterSoundSkills(cfg,{faction:'gaibang',element:'all',query:''});
 assert.equal(all.length,Object.values(cfg.skills).filter(s=>s.faction==='gaibang').length);
 assert(all.some(([,s])=>s.level===150));
 assert(all.every(([,s],i)=>!i||all[i-1][1].level<=s.level));
 const fire=model.filterSoundSkills(cfg,{faction:'all',element:'Hỏa',query:''});
 assert(fire.length>all.length);assert(fire.every(([,s])=>['gaibang','tianren'].includes(s.faction)));
 assert.equal(model.filterSoundSkills(cfg,{faction:'gaibang',element:'Thủy',query:''}).length,0);
 assert(model.filterSoundSkills(cfg,{faction:'all',element:'all',query:'su tu hong'}).some(([id])=>id==='20'));
 const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('public/data.js','utf8'),sandbox);
 for(const faction of sandbox.window.JX.factions)if(model.SOUND_FACTIONS[faction.key])assert.equal(model.SOUND_FACTIONS[faction.key].element,model.ELEMENTS[faction.series]);
});

test('preview queue follows cast, release, hit with inheritance, gender variants and default shout policy',()=>{
 const cfg={defaults:{male:'vm',female:'vf'},sounds:Object.fromEntries(['vm','vf','cm','cf','fx','release','hit'].map(id=>[id,{}])),skills:{80:{name:'Base',cast:{male:'vm',female:'vf',maleEffect:'cm',femaleEffect:'cf'},release:{effect:'release'},hit:{effect:'hit'},review:[{sound:'fx'}]},150:{name:'Child',inherit:80}}};
 assert.deepEqual(plain(model.skillPreviewQueue(cfg,'150','male').map(c=>c.id)),['vm','cm','release','hit']);
 assert.deepEqual(plain(model.skillPreviewQueue(cfg,'150','female').map(c=>c.id)),['vf','cf','release','hit']);
 assert.deepEqual(plain(model.skillPreviewQueue(cfg,'150','both').map(c=>c.id)),['vm','cm','release','hit','vf','cf','release','hit']);
 cfg.skills[80].cast={effect:'fx'};assert.deepEqual(plain(model.skillPreviewQueue(cfg,'150','male').map(c=>c.id)),['fx','release','hit']);
 cfg.skills[80].cast={};cfg.skills[150].release={effect:''};assert.deepEqual(plain(model.skillPreviewQueue(cfg,'150','female').map(c=>c.id)),['vf','hit']);
});

test('multiple level filters combine with faction, element and ID search; empty levels means all',()=>{
 const cfg=JSON.parse(fs.readFileSync('src/client/combat/audio/config.json'));
 const filter={faction:'emei',element:'Thủy',query:'',levels:[30,150]};
 const rows=model.filterSoundSkills(cfg,filter);
 assert(rows.length>1);assert(rows.every(([,s])=>s.faction==='emei'&&[30,150].includes(s.level)));
 assert(rows.some(([,s])=>s.level===30));assert(rows.some(([,s])=>s.level===150));
 assert.deepEqual(plain(model.filterSoundSkills(cfg,{...filter,query:'89'}).map(([id])=>id)),['89']);
 assert.equal(model.filterSoundSkills(cfg,{...filter,query:'89',levels:[150]}).length,0);
 assert.equal(model.filterSoundSkills(cfg,{...filter,levels:[]}).length,model.filterSoundSkills(cfg,{faction:'emei',element:'all',query:''}).length);
});

test('Water skills always preview female only, including mixed-faction Play all and both genders',()=>{
 const cfg=JSON.parse(fs.readFileSync('src/client/combat/audio/config.json'));
 for(const [id,s] of Object.entries(cfg.skills))if(model.SOUND_FACTIONS[s.faction]?.element==='Thủy'){
  const female=plain(model.skillPreviewQueue(cfg,id,'female'));
  assert.deepEqual(plain(model.skillPreviewQueue(cfg,id,'male')),female,id);
  assert.deepEqual(plain(model.skillPreviewQueue(cfg,id,'both')),female,id);
  assert(female.every(clip=>clip.gender==='female'&&cfg.sounds[clip.id]?.gender!=='male'),id);
 }
 const mixed=Object.keys(cfg.skills).flatMap(id=>model.skillPreviewQueue(cfg,id,'both'));
 assert(mixed.some(c=>c.gender==='male'));assert(mixed.some(c=>c.gender==='female'));
 assert.equal(model.soundPreviewGender('emei','both'),'female');assert.equal(model.soundPreviewGender('gaibang','both'),'both');
});

test('disabled skills are silent without destroying mappings; inherited silence can be explicitly overridden',()=>{
 const cfg=JSON.parse(fs.readFileSync('src/client/combat/audio/config.json'));
 for(const id of ['69','89']){assert.equal(cfg.skills[id].disabled,true);assert.equal(model.skillPreviewQueue(cfg,id,'both').length,0);}
 const id='14',before=JSON.stringify(cfg.skills[id]);cfg.skills[id].disabled=true;
 assert.equal(model.skillPreviewQueue(cfg,id,'both').length,0);
 cfg.skills.child={name:'Child',inherit:14};assert.equal(model.skillPreviewQueue(cfg,'child','male').length,0);
 cfg.skills.child.disabled=false;assert(model.skillPreviewQueue(cfg,'child','male').length>0);
 delete cfg.skills[id].disabled;assert.equal(JSON.stringify(cfg.skills[id]),before);assert(model.skillPreviewQueue(cfg,id,'male').length>0);
});

test('the ten faction portraits and five element images exist at the configured workspace directories',()=>{
 const cfg=JSON.parse(fs.readFileSync('src/client/combat/audio/config.json'));
 const factions=[...new Set(Object.values(cfg.skills).map(s=>s.faction))];assert.equal(factions.length,10);
 for(const faction of factions)assert(fs.statSync(`${model.paths.factionPortraitDirectory}/${faction}.webp`).size>0);
 for(const element of model.ELEMENTS)assert.match(fs.readFileSync(`${model.paths.elementIconDirectory}/${model.ELEMENT_ICONS[element]}.svg`,'utf8'),/<svg/);
});

test('Play all waits for ended, runs in order and releases every event listener',async()=>{
 const audio=new Audio(),states=[],errors=[];const player=new SoundPreviewPlayer(audio,{source:async id=>'blob:'+id,state:(clip,index,total)=>states.push([clip?.id,index,total]),error:(...e)=>errors.push(e)});
 const done=player.play(['cast','release','hit'].map(clip));await tick();assert.deepEqual(audio.starts,['blob:cast']);
 audio.end();await tick();assert.deepEqual(audio.starts,['blob:cast','blob:release']);
 audio.end();await tick();assert.deepEqual(audio.starts,['blob:cast','blob:release','blob:hit']);
 audio.end();await done;assert.equal(errors.length,0);assert.equal(audio.count(),0);assert.deepEqual(states.at(-1),[undefined,3,3]);
});

test('stop and rapid new auditions cancel old queues, including an unresolved asset read',async()=>{
 const audio=new Audio();let resolveSlow;const states=[];const player=new SoundPreviewPlayer(audio,{source:id=>id==='slow'?new Promise(resolve=>resolveSlow=resolve):Promise.resolve('blob:'+id),state:c=>states.push(c?.id),error(){}});
 const old=player.play([clip('slow'),clip('never')]);const fresh=player.play([clip('new')]);await tick();assert.deepEqual(audio.starts,['blob:new']);
 resolveSlow('blob:slow');await old;assert.deepEqual(audio.starts,['blob:new']);
 player.stop();audio.end();await fresh;assert.equal(audio.count(),0);assert.equal(states.at(-1),undefined);
 const queue=player.play([clip('first'),clip('second')]);await tick();player.stop();await queue;audio.end();await tick();assert(!audio.starts.includes('blob:second'));
});

test('a decode or play error does not stall the remaining queue',async()=>{
 const audio=new Audio(),errors=[];const player=new SoundPreviewPlayer(audio,{source:async id=>'blob:'+id,state(){},error:c=>errors.push(c.id)});
 const done=player.play([clip('bad'),clip('good')]);await tick();audio.fail();await tick();assert.deepEqual(audio.starts,['blob:bad','blob:good']);audio.end();await done;assert.deepEqual(errors,['bad']);assert.equal(audio.count(),0);
 audio.play=async()=>{throw new Error('play rejected');};await player.play([clip('rejected')]);assert.equal(audio.count(),0);assert.equal(errors.at(-1),'rejected');
});

test('sound combobox arrow keys change and audition the next option without Enter',()=>{
 const code=buildSync({entryPoints:['tools/map-tool/src/editor/SoundSelect.tsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react-dom','react/jsx-runtime','lucide-react'],alias:{'@':require('node:path').resolve('tools/map-tool/src')}}).outputFiles[0].text;
 const state=[];let cursor=0;const element=(type,props)=>({type,props});const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>state[i]=v]},useId:()=> 'test-combo',useRef:()=>({current:null}),useEffect(){},useLayoutEffect(){}};
 const s={module:{exports:{}},document:{body:{}},require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:element,jsxs:element}:name==='react-dom'?{createPortal:node=>node}:new Proxy({},{get:(_,key)=>String(key)})};vm.createContext(s);vm.runInContext(code,s);
 const choices=[],options=[{value:'',label:'Không gắn'},{value:'one',label:'Một',soundId:'one'},{value:'two',label:'Hai',soundId:'two'}];let value='one';
 const render=()=>{cursor=0;return s.module.exports.SoundSelect({label:'Xuất chiêu',value,options,onChoose:option=>{value=option.value;choices.push(option.soundId)}})};
 let tree=render();tree.props.children[0].props.onClick({currentTarget:{focus(){}}});tree=render();let prevented=0;
 tree.props.onKeyDown({key:'ArrowDown',preventDefault(){prevented++},stopPropagation(){}});assert.equal(value,'two');assert.deepEqual(choices,['two']);assert.equal(prevented,1);
 tree=render();tree.props.onKeyDown({key:'ArrowUp',preventDefault(){},stopPropagation(){}});assert.equal(value,'one');assert.deepEqual(choices,['two','one']);
 tree=render();tree.props.onKeyDown({key:'Escape',preventDefault(){}});assert.equal(render().props.children[1],false);
});
