const assert = require('node:assert/strict');
async function accountCookie(app, username = 'test_user') {
  const response = await app.inject({ method:'POST', url:'/api/auth/register', payload:JSON.stringify({ username, password:'secret123' }) });
  assert.equal(response.statusCode,200,response.body);
  return response.headers['set-cookie'].split(';')[0];
}
function accountSnapshot(db) {
  const account = db.prepare('SELECT * FROM accounts LIMIT 1').get();
  return { generation:db.prepare("SELECT value FROM metadata WHERE key='generation'").get().value + ':' + account.generation,
    initialized:!!account.initialized,
    entries:Object.fromEntries(db.prepare('SELECT key,value FROM account_storage WHERE account_id=?').all(account.id).map(row => [row.key,row.value])) };
}
module.exports = { accountCookie, accountSnapshot };
