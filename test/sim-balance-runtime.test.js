const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');

test('balance harness keeps native Hao Hung stats after SIM recalculates its loadout',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hao-hung-native-'));
  try{
    const data=native.withProgression({fac:'tianwang',lvl:200,main:1058,slots:[1058],sk:{24:20,36:30,1058:25},
      eq:{weapon:{d:0,k:1,lvl:10,base:[[28,500,500],[29,500,500]],mag:[]}}},s=>({
      builds:[{faction:'tianwang',name:'Thiên Vương',profile:s.o,stats:s.j0()}],T:s.T,S:s.S,JFX:s.A0,
    }));
    fs.writeFileSync(path.join(directory,'profiles.json'),JSON.stringify(data));
    const {createSimulation}=await import('../tools/sim-balance/simulation.ts');
    const {game,dataset,spawnFighter}=createSimulation(directory);
    assert.equal(game.CombatEngine.resolveSpeed('attack',100).fps,25);
    assert.equal(game.CombatEngine.resolveSpeed('attack',300).fps,70);
    assert.equal(game.CombatEngine.SPEED_CONFIG.run.distanceScale,1.15);
    const actor=spawnFighter(dataset.builds[0],'song',1700);
    spawnFighter(dataset.builds[0],'jin',1860);
    // A mount change exercises the real runtime's j0 refresh, after spawning.
    actor.mounted=true;
    game.arenaSimulator.tick(1/60);
    assert.equal(actor.mounted,false);
    assert.equal(actor.stats.main.n,'Hào Hùng Trảm');
    assert.equal(actor.stats.main.id,1058);
    assert.equal(actor.stats.main.crit,75);
    assert.equal(actor.stats.main.cost,41);
    assert.equal(actor.stats.main.parts.phys,data.builds[0].stats.main.parts.phys);
    assert.ok(actor.stats.mana>100,'the fixture MP pool must not replace native stats');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
