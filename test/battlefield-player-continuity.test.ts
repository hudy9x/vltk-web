{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const fs: typeof import("node:fs") = require("node:fs");
  const path: typeof import("node:path") = require("node:path");
  const {
    createRequire,
  }: typeof import("node:module") = require("node:module");
  const fixturePath = path.resolve("test/manual-target.test.js");
  const prefix = fs.readFileSync(fixturePath, "utf8").split("\ntest(")[0];
  const fixture = new Function(
    "require",
    "__dirname",
    prefix + ";return {game,enemy,ticks,declaration,pointer};",
  )(createRequire(fixturePath), path.dirname(fixturePath));
  function battle(mode: "manual" | "auto", rotation = false) {
    const game = fixture.game();
    game.l.battlefield = true;
    game.o.ctrl = mode;
    game.o.rot = rotation;
    game.T = { 10: { id: 10 }, 11: { id: 11 } };
    game.E3 = () => true;
    const primary = {
      id: 10,
      rad: 300,
      rate: 5,
      targets: 1,
      cost: 10,
      dps: 100,
    };
    const secondary = { ...primary, id: 11, cost: 15 };
    Object.assign(game.l.P, {
      main: primary,
      basic: { ...primary, id: 0, cost: 0, dps: 1 },
      actives: [primary, secondary],
      mana: 100,
    });
    game.l.mana = 100;
    game.o.slots = [10, 11];
    for (const symbol of ["ji", "o4"])
      fixture.declaration(game, "src/client/combat/skills-01.js", symbol);
    for (const symbol of ["W9", "Z9"])
      fixture.declaration(game, "src/client/core/state-and-save-01.js", symbol);
    const casts: { id: number; target: any }[] = [];
    game.queueSkillContact = (_actor: any, target: any, skill: any) => {
      game.casts++;
      casts.push({ id: skill.id, target });
    };
    const target = fixture.enemy(game);
    if (mode === "manual") game.Y.selectTarget(target);
    return { game, casts, target };
  }
  for (const mode of ["manual", "auto"] as const)
    for (const rotation of [false, true])
      test(`battlefield ${mode} attacks continue for 12 seconds after MP runs out (rotation=${rotation})`, () => {
        const { game, casts } = battle(mode, rotation);
        fixture.ticks(game, 12);
        assert.ok(
          casts.length > 30,
          "attacks must continue after the first resource burst",
        );
        assert.ok(
          casts.some((cast) => cast.id === 0),
          "use a free basic attack while MP recovers",
        );
        assert.ok(game.l.mana >= 0);
        assert.ok(game.l.mana < 15);
        const before = casts.length;
        game.l.mana = 30;
        fixture.ticks(game, 1);
        assert.ok(
          casts.slice(before).some((cast) => cast.id > 0),
          "resume learned skills once mana is available",
        );
      });
  test("a battlefield click keeps following a moving SIM after the first attack until movement cancels the command", () => {
    const { game, target, casts } = battle("manual");
    game.l.mana = 10000;
    fixture.ticks(game, 6);
    const before = casts.length;
    target.x = 900;
    fixture.ticks(game, 6);
    assert.ok(game.v.x > 0, "follow a target leaving cast range");
    assert.ok(casts.length > before);
    fixture.pointer(game, "pointerdown", 1200, 100);
    fixture.pointer(game, "pointerup", 1200, 100);
    assert.equal(game.l.manTgt, null);
    const stopped = casts.length;
    fixture.ticks(game, 0.5);
    assert.equal(
      casts.length,
      stopped,
      "explicit movement still cancels the attack command",
    );
  });
  test("auto selects a fresh enemy after the original enemy dies", () => {
    const { game, target, casts } = battle("auto");
    fixture.ticks(game, 6);
    target.hp = 0;
    target.dead = true;
    const replacement = fixture.enemy(game, 200);
    fixture.ticks(game, 6);
    assert.ok(casts.some((cast) => cast.target === replacement));
  });
}
