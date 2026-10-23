const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts');

test('death countdown follows each configured deadline and disappears on the exact respawn tick',()=>{
 for(const team of ['song','jin']) for(const seconds of [30,50,60]) {
  const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
  match.configureDeployment({respawnSeconds:seconds,soldierAppearanceSeconds:5});match.start(team);
  const notice=game.simNodes.find(node=>node.id==='battlefield-respawn-countdown');
  assert.equal(notice.hidden,true);
  game.l.life=0;match.playerDied();
  assert.equal(notice.hidden,false);assert.equal(notice.textContent,`Rời doanh trại sau ${seconds} giây`);
  assert.equal(game.v.x,match.state.camps[team].x);assert.equal(game.v.y,match.state.camps[team].y);
  sim.tick(1.2);assert.equal(notice.textContent,`Rời doanh trại sau ${seconds-1} giây`);
  sim.tick(seconds-1.21);assert.equal(notice.textContent,'Rời doanh trại sau 1 giây');assert.equal(game.l.life,0);
  sim.tick(.01);assert.equal(notice.hidden,true);assert.equal(notice.textContent,'');assert.ok(game.l.life>0);
  match.reset();
 }
});

test('fifth death displays the existing doubled penalty and ignores repeated death notifications',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
 match.start('song');const notice=game.simNodes.find(node=>node.id==='battlefield-respawn-countdown');
 for(let death=1;death<=5;death++) {
  game.l.life=0;match.playerDied();const seconds=death===5?60:30;
  assert.equal(notice.textContent,`Rời doanh trại sau ${seconds} giây`);
  sim.tick(1);match.playerDied();assert.equal(match.state.playerDeaths,death);
  assert.equal(notice.textContent,`Rời doanh trại sau ${seconds-1} giây`);
  sim.tick(seconds-1);assert.equal(notice.hidden,true);assert.ok(game.l.life>0);
 }
});

test('leaving, restarting or finishing a match clears the death countdown immediately',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
 const notice=game.simNodes.find(node=>node.id==='battlefield-respawn-countdown');
 const die=()=>{game.l.life=0;match.playerDied();assert.equal(notice.hidden,false);};
 match.start('song');die();match.reset();assert.equal(notice.hidden,true);
 match.start('jin');assert.equal(notice.hidden,true);die();match.start('song');assert.equal(notice.hidden,true);
 die();match.tick(1200);assert.equal(notice.hidden,true);assert.equal(match.running,false);
 match.acknowledgeResult();assert.equal(notice.hidden,true);
});
