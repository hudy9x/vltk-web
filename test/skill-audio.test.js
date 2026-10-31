const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
const {loadCombatEngine}=require('./helpers/combat-engine');
const config=require('../src/client/combat/audio/config.json');
function api(){const s={};vm.createContext(s);vm.runInContext(compileTypeScriptEntry('combat/audio/runtime.ts','SkillAudio').code,s);return s.SkillAudio;}

test('sound IDs, files, stage references and all 23 inheritance pairs are valid',()=>{
 const a=api();assert.equal(Object.keys(config.sounds).length,74);
 for(const sound of Object.values(config.sounds)){assert(fs.existsSync('public/'+sound.src));assert(['voice','effect'].includes(sound.category));}
 for(let i=1;i<=10;i++){const sex=i<=5?'male':'female',n=i<=5?i:i-5;assert.equal(config.sounds[`voice_${sex}_0${n}`].src,`snd/skill/sound_k${String(i).padStart(3,'0')}.wav`);}
 const inherited=Object.entries(config.skills).filter(([,s])=>s.inherit);assert.equal(inherited.length,23);
 for(const [id,s]of Object.entries(config.skills)){
  const resolved=a.resolveSkillAudio(id);
  for(const stage of ['cast','release','hit'])for(const sound of Object.values(resolved[stage]))assert(config.sounds[sound],`${id}: ${sound}`);
  for(const review of resolved.review)assert(config.sounds[review.sound]);
  if(s.inherit){assert(config.skills[s.inherit]);const parent=a.resolveSkillAudio(s.inherit);for(const stage of ['cast','release','hit'])assert.deepEqual(resolved[stage],parent[stage]);}
 }
});

test('inheritance rejects cycles and unknown IDs do not play',()=>{const a=api();a.SKILL_AUDIO_CONFIG.skills['cycle']={inherit:'cycle'};assert.throws(()=>a.resolveSkillAudio('cycle'),/cycle/);assert.equal(a.playSound('missing'),undefined);});

test('primary release uses configured gender, release sound and one hit per cast',()=>{
 const calls=[];const s={window:{},l:{fx:[],zoneShown:1,life:100},v:{x:0,y:0},o:{sex:1},Y:{},QA:.81,K3:18,Z0:{g:false},R2:()=>true,mt:()=>true,A0:{f:{},s:{},m:{}},Hi:{},Y3:()=>0,G3(){},Q8:(url)=>{calls.push(url);},playActorAttackVoice(actor,id){calls.push(id);}};
 vm.createContext(s);loadCombatEngine(s);
 const cfg=s.CombatEngine.SKILL_AUDIO_CONFIG.skills[14];cfg.hit={effect:'fx_sound_k014'};
 const target={x:40,y:0,hp:100},actor=s.v;
 const cast=s.queueSkillContact(actor,target,{id:14,parts:{phys:10}},()=>{},{targets:()=>[target]});
 assert(calls.includes('voice_female_03'));assert(calls.includes('snd/skill/hang-long-bat-vu.wav'));
 cast.onHit(target);cast.onHit(target);assert.equal(calls.filter(x=>x==='snd/skill/sound_k014.wav').length,1);
 calls.length=0;s.queueSkillContact(actor,target,{id:14,ev2:true,parts:{}},()=>{},{targets:()=>[target]});assert.deepEqual(calls,[]);
});

test('named cast effects suppress the generic shout',()=>{
 const played=[],s={Q8:(url)=>played.push(url),playActorAttackVoice:()=>played.push('generic'),v:{x:0,y:0},o:{sex:0}};vm.createContext(s);vm.runInContext(compileTypeScriptEntry('combat/audio/runtime.ts','SkillAudio').code,s);s.SkillAudio.playSkillSound(s.v,20,'cast');assert.deepEqual(played,['snd/skill/su-tu-hong.wav']);
});

test('gender-specific named cast effects select the actor voice, including inherited 150',()=>{
 const played=[],s={Q8:(url)=>played.push(url),playActorAttackVoice:()=>played.push('generic'),v:{x:0,y:0},o:{sex:1}};
 vm.createContext(s);vm.runInContext(compileTypeScriptEntry('combat/audio/runtime.ts','SkillAudio').code,s);
 s.SkillAudio.playSkillSound(s.v,179,'cast');assert.deepEqual(played,['snd/skill/cuong-loi-chan-dia-nu.wav']);
 played.length=0;s.SkillAudio.playSkillSound(s.v,1081,'cast');assert.deepEqual(played,['snd/skill/ngu-loi-chanh-phap-nu.wav']);
});

test('the shared player starts more than ten simultaneous sound effects',()=>{
 const s={window:{},l:{},o:{},v:{x:0,y:0}};vm.createContext(s);vm.runInContext(fs.readFileSync('src/client/ui/legacy-panels-and-audio-01.js','utf8'),s);
 let starts=0;s.c0.ctx={currentTime:1,createBufferSource:()=>({playbackRate:{},connect(){},start(){starts++}}),createGain:()=>({gain:{},connect(){}})};s.c0.gain={};
 for(let i=0;i<15;i++){s.c0.buf[`sound-${i}`]={};s.Q8(`sound-${i}`)}assert.equal(starts,15);
});
