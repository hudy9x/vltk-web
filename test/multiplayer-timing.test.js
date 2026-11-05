const {test}=require('node:test'),assert=require('node:assert/strict');
const {createServer:httpServer}=require('node:http'),{once}=require('node:events');
const {createHash}=require('node:crypto');
const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');

test('connection timings correlate tickets without logging secrets and retain the failed phase',async()=>{
  const previous={MULTIPLAYER_SECRET:process.env.MULTIPLAYER_SECRET,MULTIPLAYER_WT_CONTROL_URL:process.env.MULTIPLAYER_WT_CONTROL_URL,ONLINE_TIMING:process.env.ONLINE_TIMING};
  const records=[],info=console.info;let failAdmission=false;
  const control=httpServer((req,res)=>{
    req.resume();res.setHeader('content-type','application/json');
    if(req.url==='/config')res.end(JSON.stringify({protocol:8,playUrl:'https://localhost:4434/play',certificateHash:Array(32).fill(7)}));
    else if(req.url==='/admit'&&failAdmission){res.statusCode=503;res.end(JSON.stringify({error:'test admission unavailable'}));}
    else res.end('true');
  });
  control.listen(0,'127.0.0.1');await once(control,'listening');
  process.env.MULTIPLAYER_SECRET='timing-test-secret-01234567890123456789';
  process.env.MULTIPLAYER_WT_CONTROL_URL=`http://127.0.0.1:${control.address().port}`;
  delete process.env.ONLINE_TIMING;
  console.info=(message)=>{if(typeof message==='string'&&message.startsWith('[online:timing] '))records.push(JSON.parse(message.slice(16)));};
  const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false});
  try{
    const auth=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'timing_user',password:'secret123'}});
    const cookie=auth.headers['set-cookie'].split(';')[0];
    db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(auth.json().user.id,'jxidle',JSON.stringify({fac:'vo0',lvl:1}));
    const call=()=>app.inject({method:'POST',url:'/api/multiplayer/webtransport/session',headers:{cookie},payload:{slot:0}});
    const response=await call();assert.equal(response.statusCode,200);
    const ticket=Buffer.from(response.json().ticket,'base64');
    const trace=createHash('sha256').update(ticket.subarray(21,37)).digest('hex').slice(0,16);
    for(const stage of ['character-read','catalog-build','catalog-install','character-build','rust-admit','response']){
      const row=records.find(r=>r.stage===stage);assert.ok(row,stage);assert.ok(row.stepMs>=0&&row.elapsedMs>=row.stepMs);
    }
    assert.ok(records.some(r=>r.stage==='response'&&r.trace===trace));
    failAdmission=true;assert.equal((await call()).statusCode,503);
    assert.ok(records.some(r=>r.stage==='rust-admit'&&r.failed&&r.error==='test admission unavailable'));
    assert.ok(records.some(r=>r.stage==='http-end'&&r.status===503));
    const output=JSON.stringify(records);
    for(const secret of [cookie,response.json().ticket,ticket.subarray(21,37).toString('hex'),process.env.MULTIPLAYER_SECRET,'secret123'])assert.ok(!output.includes(secret));
    const count=records.length;process.env.ONLINE_TIMING='0';failAdmission=false;assert.equal((await call()).statusCode,200);assert.equal(records.length,count);
  }finally{
    await app.close();db.close();await new Promise(resolve=>control.close(resolve));console.info=info;
    for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});
