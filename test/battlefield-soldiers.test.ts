{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const vm: typeof import("node:vm") = require("node:vm");
  const {
    compileTypeScriptEntry,
  }: typeof import("../tools/build-app.js") = require("../tools/build-app.js");
  const {
    createHeadlessGame,
    collectLegacyDeclarations,
    installNativeDeclarations,
  }: typeof import("../tools/sim-balance/legacy-runtime.ts") = require("../tools/sim-balance/legacy-runtime.ts");
  function loadSoldierModule<Module>(entry: string): Module {
    const scope: Record<string, unknown> = {};
    vm.runInNewContext(
      compileTypeScriptEntry(entry, "SoldierModule").code,
      scope,
    );
    return scope.SoldierModule as Module;
  }
  test("rank-specific skins match the requested roster for either team, including golden marshals", () => {
    const rules = loadSoldierModule<
      typeof import("../src/client/simulator/soldiers.ts")
    >("simulator/soldiers.ts");
    const catalog = Object.fromEntries(
      [599, 588, 597, 600, 598, 595, 589, 144, 566].map((id) => [id, {}]),
    );
    const expected = {
      soldier: [599, 588, 597],
      captain: [600, 598],
      commander: [595],
      general: [589],
      marshal: [144, 566],
    };
    for (const team of ["song", "jin"] as const)
      for (const rank of Object.keys(expected) as (keyof typeof expected)[]) {
        assert.deepEqual(
          Array.from({ length: expected[rank].length }, (_, index) =>
            rules.soldierSkin(catalog, team, index, rank),
          ),
          expected[rank],
        );
      }
    const game = createHeadlessGame(process.cwd());
    game.arenaSimulator.battlefield.start("song");
    assert.ok(
      game.arenaSimulator.actors
        .filter((actor: any) => actor.battlefieldBoss)
        .every((actor: any) => expected.marshal.includes(actor.tid)),
    );
    const pharmacy = game.equipmentTrader
      .entities()
      .find((npc: any) => npc.name === "Chủ Dược Điếm");
    assert.equal(pharmacy.animation, game.r0[852].anim);
    assert.ok(
      !game.simNodes
        .find((node: any) => node.id === "battlefield-panel")
        .innerHTML.includes('id="battlefield-shop"'),
    );
  });
  test("one-damage training mode never overwrites battlefield soldier damage or native player/SIM hits", () => {
    const game = createHeadlessGame(process.cwd());
    const declarations = collectLegacyDeclarations("src/client");
    installNativeDeclarations(game, declarations);
    game.mapNavigation = { clear: () => true };
    game.nativeIncoming = vm.runInContext(
      "(function(){" + declarations.get("U9") + "; return U9;})()",
      game,
    );
    game.arenaSimulator.battlefield.start("song");
    const enemy = game.arenaSimulator.roadMonsters.actors.find(
      (actor: any) => actor.battlefieldTeam === "jin",
    );
    Object.assign(enemy, { ar: 999999, series: 0 });
    game.combatSandbox.setOneDamage(true);
    assert.equal(enemy.dmg, enemy.nativeDamage);
    assert.ok(enemy.dmg > 1);
    Object.assign(game.l.P, {
      life: 100000,
      mana: 1000,
      res: { phys: 0, cold: 0, fire: 0, poison: 0, light: 0 },
      def: 0,
      series: 0,
    });
    game.l.life = 100000;
    const before = game.l.life;
    game.U9(enemy);
    assert.ok(before - game.l.life > 1);
    const [fighter] = game.arenaSimulator.battlefield.add({
      team: "song",
      faction: "wudang",
      level: 150,
      strength: "normal",
      count: 1,
    });
    fighter.hp = fighter.max = 100000;
    fighter.stats.life = 100000;
    const hp = fighter.hp;
    game.arenaSimulator.receiveMonsterHit(fighter, enemy);
    assert.ok(hp - fighter.hp > 1);
    const ally = game.arenaSimulator.roadMonsters.actors.find(
      (actor: any) => actor.battlefieldTeam === "song",
    );
    const playerHP = game.l.life;
    game.U9(ally);
    assert.equal(game.l.life, playerHP);
    enemy.hp = 0;
    game.arenaSimulator.tick(0.01);
    game.arenaSimulator.tick(20);
    assert.ok(
      game.arenaSimulator.roadMonsters.actors.every(
        (actor: any) => actor.dmg === actor.nativeDamage,
      ),
    );
  });
  test("patrol chooses walkable points within its radius and latches a return after exceeding the leash", () => {
    const { patrolSoldier } = loadSoldierModule<
      typeof import("../src/client/simulator/soldier-patrol.ts")
    >("simulator/soldier-patrol.ts");
    const actor = {
      x: 1000,
      y: 1000,
      n: "Soldier",
      hp: 100,
      max: 100,
      tid: 599,
      series: 0,
      res: {},
      def: 0,
      spd: 50,
      battlefieldHome: { x: 1000, y: 1000 },
      battlefieldPatrolRadius: 180,
      battlefieldLeashRadius: 800,
      battlefieldReturning: false,
    };
    const host = {
      clear: () => true,
      direction: () => 0,
      move(unit: typeof actor, x: number, y: number, distance: number) {
        const length = Math.hypot(x - unit.x, (y - unit.y) * 2),
          ratio = Math.min(1, distance / Math.max(1, length));
        unit.x += (x - unit.x) * ratio;
        unit.y += (y - unit.y) * ratio;
      },
    };
    for (let index = 0; index < 100; index++)
      patrolSoldier(actor, 0.1, host, () => 0.25);
    assert.ok(actor.y !== 1000);
    assert.ok(Math.hypot(actor.x - 1000, (actor.y - 1000) * 2) <= 180);
    actor.x = 1900;
    patrolSoldier(actor, 1, host, () => 0.25);
    assert.ok(actor.battlefieldReturning);
    assert.ok(actor.x < 1900);
    for (let index = 0; index < 20; index++)
      patrolSoldier(actor, 1, host, () => 0.25);
    assert.ok(!actor.battlefieldReturning);
  });
  test("configured 50–70 attacks alternate through contact damage, preserve allies, and stop after death", () => {
    const game = createHeadlessGame(process.cwd());
    const options = loadSoldierModule<
      typeof import("../src/client/simulator/soldier-skills.ts")
    >("simulator/soldier-skills.ts");
    const available = options.soldierSkillOptions(
      game.T,
      Object.values(game.I),
      (skill) =>
        !!(
          skill.enemy &&
          !skill.aura &&
          [
            "physicsenhance_p",
            "physicsdamage_v",
            "firedamage_v",
            "colddamage_v",
            "poisondamage_v",
            "lightingdamage_v",
          ].some((key) => skill.attr?.[key])
        ),
    );
    assert.ok(available.some((skill) => skill.id === 11 && skill.level === 50));
    assert.ok(available.some((skill) => skill.level === 60));
    assert.ok(!available.some((skill) => skill.id === 157));
    const road = game.arenaSimulator.roadMonsters,
      configuration = road.configuration;
    for (const setting of Object.values(configuration) as any[])
      setting.count = 0;
    configuration.commander = {
      count: 2,
      hp: 100000,
      skills: [11, 19],
      patrolRadius: 180,
      leashRadius: 800,
    };
    road.configure(configuration);
    game.arenaSimulator.battlefield.start("song");
    const caster = road.actors.find(
      (actor: any) => actor.battlefieldTeam === "jin",
    );
    const ally = road.actors.find(
      (actor: any) => actor.battlefieldTeam === "song",
    );
    Object.assign(game.v, { x: caster.x + 20, y: caster.y });
    Object.assign(ally, { x: caster.x + 30, y: caster.y });
    // Move the opposing soldier away so this test isolates the human contact.
    ally.x -= 1500;
    const alliedHP = caster.hp;
    game.l.life = 10000;
    game.l.P.life = 10000;
    game.arenaSimulator.tick(0.01);
    assert.equal(caster.lastCast.id, 11);
    const before = game.l.life;
    assert.equal(before, 10000, "damage waits for contact");
    for (let step = 0; step < 30; step++) game.advanceSkillContacts(0.02);
    assert.ok(game.l.life < before);
    assert.equal(caster.hp, alliedHP);
    game.arenaSimulator.tick(1);
    assert.equal(caster.lastCast.id, 19);
    caster.hp = 0;
    const life = game.l.life;
    for (let step = 0; step < 30; step++) game.advanceSkillContacts(0.02);
    assert.equal(
      game.l.life,
      life,
      "dead caster cannot deliver pending damage",
    );
    const invalid = road.configuration;
    invalid.soldier.skills = [11];
    assert.throws(() => road.configure(invalid));
  });
}
