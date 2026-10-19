const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { openDatabase, initialize, reset } = require('../src/server/database.ts');
const { createServer } = require('../src/server/index.ts');

const auth = (app, mode, username, password='secret123') => app.inject({ method:'POST', url:'/api/auth/'+mode, payload:JSON.stringify({ username,password }) });
const cookieOf = response => response.headers['set-cookie'].split(';')[0];
const storage = (app, cookie) => app.inject({ url:'/api/storage', headers:{ cookie } });
const save = (app, cookie, generation, id, value) => app.inject({ method:'POST', url:'/api/storage', headers:{ cookie },
  payload:JSON.stringify({ generation,id,operations:[{ key:'jxidle',value }] }) });

test('two-field registration, password verification, session revocation and account isolation', async () => {
  const db = openDatabase(':memory:');
  initialize(db, { jxidle:'legacy-character', jxidle_slot:'login' });
  const { app } = createServer({ db, downloadAssets:false });
  try {
    assert.equal((await storage(app, '')).statusCode,401);
    const register = await auth(app,'register','  First_User  ');
    assert.equal(register.statusCode,200,register.body);
    assert.equal(register.json().user.username,'first_user');
    assert.match(register.headers['set-cookie'], /HttpOnly; SameSite=Strict/);
    const first = cookieOf(register), initial = (await storage(app,first)).json();
    assert.equal(initial.entries.jxidle,'legacy-character');
    assert.equal((await auth(app,'register','FIRST_USER')).statusCode,409);
    assert.equal((await auth(app,'login','first_user','wrong123')).statusCode,401);
    assert.equal((await auth(app,'login','missing_user')).statusCode,401);
    assert.equal((await auth(app,'register','ab')).statusCode,400);
    assert.equal((await auth(app,'register','second_user','123')).statusCode,400);
    const second = cookieOf(await auth(app,'register','second_user'));
    assert.deepEqual((await storage(app,second)).json().entries,{});
    const secondState = (await storage(app,second)).json();
    assert.equal((await save(app,second,initial.generation,'cross-account','stolen')).statusCode,409);
    assert.equal((await save(app,first,initial.generation,'first-save','updated-first')).statusCode,200);
    assert.equal((await save(app,second,secondState.generation,'first-save','second-character')).statusCode,200);
    assert.equal((await save(app,first,initial.generation,'first-save','stale')).statusCode,200);
    assert.equal((await storage(app,first)).json().entries.jxidle,'updated-first');
    assert.equal((await storage(app,second)).json().entries.jxidle,'second-character');
    assert.equal((await storage(app,'volam_session=forged')).statusCode,401);
    assert.equal((await app.inject({ method:'POST',url:'/api/auth/logout',headers:{cookie:first} })).statusCode,200);
    assert.equal((await storage(app,first)).statusCode,401);
    assert.equal((await app.inject({ url:'/api/auth/session',headers:{cookie:first} })).json().user,null);
    const login = await auth(app,'login','first_user');
    assert.equal(login.statusCode,200);
    assert.equal((await storage(app,cookieOf(login))).json().entries.jxidle,'updated-first');
    const row = db.prepare('SELECT salt,password_hash FROM accounts WHERE username=?').get('first_user');
    assert.notEqual(row.password_hash,'secret123'); assert.equal(row.password_hash.length,128);
    reset(db);
    assert.deepEqual((await storage(app,second)).json().entries,{});
    assert.equal((await save(app,second,secondState.generation,'after-reset','stale')).statusCode,409);
  } finally { await app.close(); db.close(); }
});

test('account and saved character survive a server/database restart', async () => {
  const dir = mkdtempSync(path.join(tmpdir(),'volam-account-')), filename = path.join(dir,'game.sqlite');
  let db = openDatabase(filename), { app } = createServer({ db,downloadAssets:false });
  try {
    const cookie = cookieOf(await auth(app,'register','persistent'));
    const state = (await storage(app,cookie)).json();
    assert.equal((await save(app,cookie,state.generation,'persist','saved-character')).statusCode,200);
    await app.close(); db.close();
    db = openDatabase(filename); ({ app } = createServer({ db,downloadAssets:false }));
    assert.equal((await storage(app,cookie)).json().entries.jxidle,'saved-character');
    assert.equal((await auth(app,'login','persistent')).statusCode,200);
  } finally { await app.close(); db.close(); rmSync(dir,{ recursive:true,force:true }); }
});
