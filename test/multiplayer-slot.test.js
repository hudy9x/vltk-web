const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer:httpServer}=require('node:http');
const {once}=require('node:events');
const {openDatabase}=require('../src/server/database.ts');
const {createServer}=require('../src/server/index.ts');

test('session admits the requested character slot through the real raw-body parser',async()=>{
  const admissions=[];
  const control=httpServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    if(req.url==='/admit')admissions.push(JSON.parse(body));
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify(req.url==='/config'?{protocol:7}:req.url==='/rewards'?[]:true));
  });
  control.listen(0,'127.0.0.1');await once(control,'listening');
  const before={secret:process.env.MULTIPLAYER_SECRET,control:process.env.MULTIPLAYER_WT_CONTROL_URL};
  process.env.MULTIPLAYER_SECRET='slot-test-secret-01234567890123456789';
  process.env.MULTIPLAYER_WT_CONTROL_URL=`http://127.0.0.1:${control.address().port}`;
  const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false});
  try{
    const register=await app.inject({method:'POST',url:'/api/auth/register',payload:JSON.stringify({username:'slot_test',password:'secret123'})});
    const account=register.json().user.id,cookie=register.headers['set-cookie'].split(';')[0];
    for(const [key,p]of [['jxidle',{fac:'cuiyan',lvl:151}],['jxidle_3',{fac:'tangmen',lvl:150,skillRoute:'knife',slots:[339],eq:{weapon:{d:1,k:1,g:0,nat:0,lvl:1,base:[],magic:[]}},sk:{45:20,50:20,249:20,339:20},skL:{339:{lv:20,xp:0}}}]])
      db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,key,JSON.stringify(p));
    const request=payload=>app.inject({method:'POST',url:'/api/multiplayer/webtransport/session',headers:{cookie,'content-type':'application/json'},payload:JSON.stringify(payload)});
    const response=await request({slot:2});
    assert.equal(response.statusCode,200);
    assert.equal(admissions.at(-1).slot,2,'third character must not silently become slot zero');
    assert.ok(admissions.at(-1).profile.skills.some(s=>s.id===339),'Rust receives Nhiếp Hồn Nguyệt Ảnh');
    for(const slot of [-1,3,1.5,null,'2'])assert.equal((await request({slot})).statusCode,400);
    assert.equal((await request({})).statusCode,200);
    assert.equal(admissions.at(-1).slot,0,'omitted slot preserves legacy default');
  }finally{
    await app.close();db.close();await new Promise(r=>control.close(r));
    for(const [key,value]of [['MULTIPLAYER_SECRET',before.secret],['MULTIPLAYER_WT_CONTROL_URL',before.control]])
      if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
