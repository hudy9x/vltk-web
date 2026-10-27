// Actual game, two accounts, pinned QUIC, binary protocol and real mouse input.
// Build Rust first. Set PLAYWRIGHT_MODULE if Playwright is installed outside this repo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const net = require('node:net'), dgram = require('node:dgram');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname,'../../../..');
async function tcpPort() {
  const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}
async function udpPort() {
  const socket=dgram.createSocket('udp4');socket.bind(0,'127.0.0.1');await once(socket,'listening');
  const port=socket.address().port;socket.close();return port;
}
async function ready(url,child,logs) {
  for(let i=0;i<100;i++) {
    if(child.exitCode!==null) throw new Error(logs());
    try{if((await fetch(url)).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error(`Server did not start: ${logs()}`);
}
test('game WebTransport binary: two human accounts, movement, rooms, appearance and reconnect', {timeout:120000}, async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vltk-online-'));
  const [http,control,udp]=await Promise.all([tcpPort(),tcpPort(),udpPort()]);
  const base=`http://127.0.0.1:${http}`,secret=randomBytes(32).toString('hex');
  let logs='';
  const rust=spawn(path.join(__dirname,'target/debug/vltk-multiplayer-webtransport'),[],{cwd:root,env:{...process.env,
    MULTIPLAYER_SECRET:secret,WT_ORIGINS:base,WT_HTTP_BIND:`127.0.0.1:${control}`,WT_BIND:`127.0.0.1:${udp}`,
    WT_PUBLIC_URL:`https://127.0.0.1:${udp}/play`},stdio:['ignore','pipe','pipe']});
  const node=spawn(process.execPath,['src/server/index.ts'],{cwd:root,env:{...process.env,NODE_ENV:'development',
    PORT:String(http),DB_PATH:path.join(directory,'game.sqlite'),MULTIPLAYER_SECRET:secret,
    MULTIPLAYER_WT_CONTROL_URL:`http://127.0.0.1:${control}`},stdio:['ignore','pipe','pipe']});
  for(const child of [rust,node]) for(const output of [child.stdout,child.stderr]) output.on('data',bytes=>{logs+=bytes;});
  let browser;
  t.after(async()=>{
    await browser?.close();
    for(const child of [rust,node]) {child.kill('SIGTERM');await once(child,'exit').catch(()=>{});}
    await fs.rm(directory,{recursive:true,force:true});
  });
  await ready(`http://127.0.0.1:${control}/health`,rust,()=>logs);
  await ready(base+'/api/health',node,()=>logs);
  browser=await chromium.launch({headless:true,args:['--enable-quic']});
  const errors=[];
  async function player(username,name) {
    const context=await browser.newContext({viewport:{width:1280,height:850},serviceWorkers:'block'});
    const register=await context.request.post(base+'/api/auth/register',{data:{username,password:'test-secret-123'}});
    assert.equal(register.status(),200,await register.text());
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    // Observe game state without shipping debug globals in the production bundle.
    await page.route('**/app/game.js?*',async route=>{
      const response=await route.fetch();let body=await response.text();
      const at=body.lastIndexOf('\n})();');assert.ok(at>0);
      body=body.slice(0,at)+`
      window.__onlineDraws=0;
      const originalOnlineDraw=gameMultiplayer.draw;
      gameMultiplayer.draw=function(...args){window.__onlineDraws++;return originalOnlineDraw(...args);};
      window.__onlineTest={
        state:()=>({x:v.x,y:v.y,map:Z0.key,remote:gameMultiplayer.entities().map(e=>e.remotePlayer),draws:window.__onlineDraws,
          target:Y.target,blocked:i0.blocked,hidden:document.hidden,modal:document.getElementById('modal').className}),
        town:()=>nc(true),field:()=>en(AA(1)),
        tutorialDone:()=>{o.tut=999;},
        outfit:()=>{o.sex=1;l.jx=null;},
        target:()=>{const [x,y]=X0(v.x+90,v.y+35);const rect=lA.getBoundingClientRect();
          return {x:rect.left+(x-B0.x)*$8(),y:rect.top+(y-B0.y)*$8()};}
      };`+body.slice(at);
      await route.fulfill({response,body});
    });
    await page.goto(base);
    await page.waitForSelector('#csNew, #ncName');
    if(await page.locator('#csNew').isVisible()) await page.locator('#csNew').click();
    await page.locator('#ncName').fill(name);await page.locator('#ncGo').click();
    await page.waitForSelector('#multiplayerStatus[data-online="true"]',{timeout:30000});
    const understood=page.getByRole('button',{name:'Đã hiểu',exact:true});
    if(await understood.isVisible())await understood.click();
    await page.evaluate(()=>window.__onlineTest.tutorialDone());
    if(await page.locator('#mClose').isVisible())await page.locator('#mClose').click();
    await page.evaluate(()=>window.__onlineTest.town());
    return {page,context};
  }
  const a=await player('online_a','Kiếm Khách'),b=await player('online_b','Nữ Hiệp');
  for(const {page} of [a,b]) await page.waitForFunction(()=>window.__onlineTest.state().remote.length===1);
  assert.ok((await a.page.evaluate(()=>window.__onlineTest.state())).draws>0);
  const initial=await a.page.evaluate(()=>window.__onlineTest.state());
  for(const key of ['ArrowRight','w','a','s','d']) {await a.page.keyboard.down(key);await a.page.waitForTimeout(200);await a.page.keyboard.up(key);}
  const afterKeys=await a.page.evaluate(()=>window.__onlineTest.state());
  assert.ok(Math.hypot(initial.x-afterKeys.x,initial.y-afterKeys.y)<1,'keyboard cannot move online player');
  const target=await a.page.evaluate(()=>window.__onlineTest.target());
  await a.page.mouse.click(target.x,target.y,{button:'right'});await a.page.waitForTimeout(250);
  assert.ok(Math.hypot(initial.x-(await a.page.evaluate(()=>window.__onlineTest.state())).x,initial.y-(await a.page.evaluate(()=>window.__onlineTest.state())).y)<1);
  await a.page.mouse.click(target.x,target.y);
  await a.page.waitForFunction(({x,y})=>{const p=window.__onlineTest.state();return Math.hypot(p.x-x,p.y-y)>20;},{x:initial.x,y:initial.y});
  await a.page.waitForTimeout(1500);
  const local=await a.page.evaluate(()=>window.__onlineTest.state());
  await b.page.waitForFunction(({x,y})=>{const p=window.__onlineTest.state().remote[0];return p&&Math.hypot(p.x-x,p.y-y)<3;},{x:local.x,y:local.y});
  await a.page.evaluate(()=>window.__onlineTest.outfit());
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote[0]?.appearance.sex===1);
  await a.page.evaluate(()=>window.__onlineTest.field());
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===0);
  await a.page.evaluate(()=>window.__onlineTest.town());
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===1);
  await a.page.locator('#multiplayerStatus').click();
  await a.page.waitForSelector('#multiplayerStatus[data-online="true"]');
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===1);
  const secondTarget=await b.page.evaluate(()=>window.__onlineTest.target());
  await b.page.mouse.click(secondTarget.x,secondTarget.y);
  await b.page.waitForTimeout(1800);
  await fs.mkdir(path.join(root,'output/multiplayer'),{recursive:true});
  await b.page.screenshot({path:path.join(root,'output/multiplayer/game-webtransport.png')});
  await a.context.close();
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===0);
  assert.deepEqual(errors,[]);
});
