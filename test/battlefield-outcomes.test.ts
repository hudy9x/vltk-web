{
  const {test}:typeof import('node:test')=require('node:test');
  const assert:typeof import('node:assert/strict')=require('node:assert/strict');
  const fs:typeof import('node:fs')=require('node:fs');
  const vm:typeof import('node:vm')=require('node:vm');
  const {createHeadlessGame,collectLegacyDeclarations}=require('../tools/sim-balance/legacy-runtime.ts');
  test('merit totals, soldier kills, promotions, highlighted player rank and mandatory result acknowledgement share the same score',()=>{
    const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
    match.start('song');const hero=game.v;
    const [enemy]=match.add({team:'jin',faction:'shaolin',level:150,strength:'normal',count:1});
    for(let index=0;index<10;index++) {
      const victim={hp:0,x:3000,y:3000,n:'Lính địch',battlefieldMonster:true,battlefieldTeam:'jin',battlefieldRank:'Hiệu úy'};
      sim.warRewards.record(hero,victim);sim.warRewards.killed(victim);sim.warRewards.killed(victim);
      const other={...victim,battlefieldTeam:'song',battlefieldRank:'Binh sĩ'};
      sim.warRewards.record(enemy,other);sim.warRewards.killed(other);
    }
    assert.equal(sim.warRewards.rank(hero).soldierKills,10);
    for(const attacker of [hero,enemy]) for(let index=0;index<3;index++) {
      const target={hp:0,x:3000,y:3000,n:'Boss địch',arenaSim:true,battlefieldBoss:true,battlefieldTeam:attacker===hero?'jin':'song'};
      sim.warRewards.record(attacker,target);sim.warRewards.killed(target);
    }
    assert.equal(sim.warRewards.rank(enemy).name,'Hiệu úy');
    sim.warRewards.record(hero,enemy);enemy.hp=0;sim.warRewards.killed(enemy);
    assert.equal(sim.warRewards.totals.song,4300);assert.equal(sim.warRewards.totals.jin,3500);
    sim.remove(enemy);assert.equal(sim.warRewards.totals.jin,3500,'removing a SIM preserves earned team points');
    sim.leaderboard.open();const ranking=game.simNodes.find((node:any)=>node.id==='war-leaderboard');
    assert.match(ranking.querySelector('tbody').innerHTML,/aria-current="true"/);
    assert.match(ranking.querySelector('tbody').innerHTML,/\(Bạn\)/);
    assert.match(ranking.querySelector('tbody').innerHTML,/<td>10<\/td><td>4300<\/td>/);
    assert.match(ranking.querySelector('#war-team-totals').innerHTML,/Tống: 4.300/);
    assert.match(ranking.querySelector('#war-team-totals').innerHTML,/Kim: 3.500/);
    assert.equal(game.simNodes.some((node:any)=>node.id==='battlefield-hud'),false);
    assert.match(ranking.querySelector('#war-match-status').textContent,/Còn 20:00.*Phe của bạn: Tống/);
    sim.tick(1200);
    assert.equal(match.state.phase,'finished');assert.match(match.state.result,/^Tống thắng/);
    assert.equal(sim.resultDialog.isOpen,true);
    const result=game.simNodes.find((node:any)=>node.id==='battlefield-result');
    assert.match(result.querySelector('#battlefield-result-points').textContent,/Tống: 4.300.*Kim: 3.500/);
    assert.throws(()=>match.reset(),/Đồng ý/);assert.throws(()=>match.start('jin'),/Đồng ý/);
    let prevented=false;game.simListeners.keydown({key:'Escape',preventDefault(){prevented=true;},stopImmediatePropagation(){}});
    assert.equal(prevented,true);assert.equal(sim.resultDialog.isOpen,true);
    const log=game.combatLog.text('war');
    assert.doesNotMatch(log,/danh hiệu mới/);assert.match(log,/tiêu diệt.*<Hiệu úy>/);
    assert.equal(game.combatLog.entries('war').length,14,'only ten personal soldier kills, three bosses and one SIM');
    assert.equal(game.combatLog.entries('in').length,0);
    result.querySelector('#battlefield-result-accept').onclick();
    assert.equal(sim.resultDialog.isOpen,false);assert.equal(match.active,false);assert.equal(game.l.battlefield,false);
  });
  test('equal team merits produce a draw regardless of surviving bosses',()=>{
    const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
    match.start('song');
    for(const boss of sim.actors.filter((actor:any)=>actor.battlefieldBoss))boss.hp=0;
    sim.tick(1200);assert.match(match.state.result,/^Hòa/);assert.equal(sim.resultDialog.isOpen,true);
  });
  test('runtime promotions rebuild only the promoted SIM and apply player bonuses only inside the battlefield',()=>{
    const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,original=game.j0;
    game.j0=()=>{
      const stats=original();
      Object.assign(stats,{res:{phys:50,cold:50,fire:50,poison:50,light:50},aspdP:1,aspdC:.9,aspd:1});
      sim.applyBattlefieldBonuses(stats);return stats;
    };
    sim.battlefield.start('song');
    const [fighter]=sim.battlefield.add({team:'jin',faction:'shaolin',level:150,strength:'normal',count:1});
    fighter.hp=123;fighter.mana=42;
    const hero=game.v,heroStats=game.l.P;
    function earn(actor:any,count:number){for(let i=0;i<count;i++){
      const victim={hp:0,x:3000,y:3000,n:'Boss địch',arenaSim:true,battlefieldBoss:true,battlefieldTeam:actor===hero?'jin':'song'};
      sim.warRewards.record(actor,victim);sim.warRewards.killed(victim);
    }}
    earn(fighter,3);
    assert.equal(fighter.stats.warPhysicalMultiplier,1.05);assert.equal(fighter.stats.res.phys,52.5);assert.equal(fighter.res,fighter.stats.res);
    assert.equal(fighter.hp,123);assert.equal(fighter.mana,42);assert.equal(game.l.P,heroStats);
    earn(fighter,6);assert.equal(fighter.stats.warPhysicalMultiplier,1.1);assert.ok(Math.abs(fighter.stats.res.phys-55)<1e-9);
    sim.warRewards.revived(fighter);assert.equal(fighter.stats.warPhysicalMultiplier,1.1);
    earn(hero,30);const boosted=game.j0();assert.equal(boosted.warPhysicalMultiplier,1.2);assert.equal(boosted.res.phys,60);
    sim.leaderboard.open();const ranking=game.simNodes.find((node:any)=>node.id==='war-leaderboard');
    assert.match(ranking.querySelector('#war-personal-bonus').textContent,/\+20%.*Quân hàm cao nhất/);
    assert.match(ranking.querySelector('#war-rank-guide').innerHTML,/Phó tướng/);assert.match(ranking.querySelector('#war-rank-guide').innerHTML,/18.000–29.999/);
    sim.battlefield.reset();const normal=game.j0();assert.equal(normal.warPhysicalMultiplier,undefined);assert.equal(normal.res.phys,50);assert.equal(normal.aspdP,1);
  });
  test('Escape gives developer tools priority over opening the battlefield leaderboard',()=>{
    const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;
    sim.battlefield.start('song');
    let closed=0;
    game.developerTools={closeOpen(){closed++;return true;}};
    game.simListeners.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});
    assert.equal(closed,1);assert.equal(sim.leaderboard.isOpen,false);
    sim.tick(1200);
    game.simListeners.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});
    assert.equal(closed,1,'mandatory result acknowledgement takes priority over tools');
    assert.equal(sim.resultDialog.isOpen,true);
  });
  test('shared tool dismissal closes GM, SIM, Test room and quick sale and resets toggles',()=>{
    const nodes=new Map<string,any>();
    const controls=new Map<string,any>();
    let keydown:any,sale=true,saleClosed=0;
    const element=()=>({hidden:true,open:false,attributes:{} as Record<string,string>,setAttribute(key:string,value:string){this.attributes[key]=value;},addEventListener(){},appendChild(){},querySelector(selector:string){return controls.get(selector)||null;}});
    const scope:any={document:{createElement:element,body:{appendChild(){}},getElementById:(id:string)=>nodes.get(id),addEventListener:(type:string,fn:any)=>{if(type==='keydown')keydown=fn;}}};
    vm.createContext(scope);vm.runInContext(fs.readFileSync('src/client/ui/developer-tools-01.js','utf8'),scope);
    for(const [kind,id]of [['gm','gm-panel'],['sim','sim-panel'],['room','combat-sandbox']]){
      const panel=element();panel.hidden=false;panel.open=true;nodes.set(id,panel);
      const button=element();controls.set(`[data-dev-tool="${kind}"]`,button);scope.developerTools.register(button,kind,kind);
    }
    scope.developerTools.register(element(),'sale','Bán nhanh',()=>{if(!sale)return false;sale=false;saleClosed++;return true;});
    let prevented=0,stopped=0;
    const event={key:'Escape',preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}};
    nodes.set('battlefield-result',{hidden:false});keydown(event);
    assert.equal(sale,true);assert.equal(prevented,0);
    nodes.get('battlefield-result').hidden=true;keydown(event);
    assert.equal(nodes.get('gm-panel').hidden,true);assert.equal(nodes.get('sim-panel').hidden,true);assert.equal(nodes.get('combat-sandbox').open,false);
    assert.equal(saleClosed,1);assert.equal(prevented,1);assert.equal(stopped,1);
    for(const control of controls.values())assert.equal(control.attributes['aria-expanded'],'false');
    keydown(event);assert.equal(prevented,1,'an empty tool rail does not consume Escape');
  });
  test('mana shortage notification is throttled, skips SIM context, and preserves a free basic attack',()=>{
    let now=10000;const notices:string[]=[];
    const scope:any={Date:{now:()=>now},l:{mana:0,life:100,battlefield:true,quiet:false,sim:false,clock:0},o:{},T:{1:{}},S3:()=>false,E3:()=>true,W9:()=>[],k:(message:string)=>notices.push(message)};
    scope.ji=(skill:any)=>skill.costLife?scope.l.life>=skill.cost:scope.l.mana>=skill.cost;
    vm.createContext(scope);vm.runInContext(fs.readFileSync('src/client/ui/developer-tools-01.js','utf8'),scope);
    vm.runInContext(collectLegacyDeclarations('src/client').get('Z9'),scope);
    const profile={main:{id:1,cost:10},basic:{id:0,cost:0}};
    assert.equal(scope.Z9(profile,true),profile.basic);assert.equal(notices.length,1);
    scope.Z9(profile,true);assert.equal(notices.length,1);
    now+=2500;scope.Z9(profile,true);assert.equal(notices.length,2);
    scope.l.sim=true;now+=2500;scope.Z9(profile,true);assert.equal(notices.length,2);
    scope.l.sim=false;scope.l.mana=100;scope.Z9(profile,true);assert.equal(notices.length,2);
    assert.match(notices[0],/Không đủ nội lực/);
  });
}
