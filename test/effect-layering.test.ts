{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const fs: typeof import("node:fs") = require("node:fs");
  const path: typeof import("node:path") = require("node:path");
  const {
    createRequire,
  }: typeof import("node:module") = require("node:module");
  test("skill effects draw below every living body and label, with lifetime advanced exactly once", () => {
    // Reuse the shared renderer scene, without registering the fixture file's tests.
    const fixturePath = path.resolve("test/nameplates.test.js");
    const prefix = fs
      .readFileSync(fixturePath, "utf8")
      .split("test('crowded nameplates")[0];
    const scene = new Function(
      "require",
      "__dirname",
      prefix + "; return scene;",
    )(createRequire(fixturePath), path.dirname(fixturePath));
    const game = scene();
    game.CP = () => game.events.push("effect:boom");
    game.YP = () => game.events.push("effect:jm");
    game.drawContactProjectile = () => game.events.push("effect:contact");
    const ring = { k: "ring", life: 1, max: 1, x: 100, y: 60, color: "#fff" };
    game.l.fx = [
      { k: "boom", life: 1 },
      { k: "jm", life: 1 },
      { k: "contact", life: 1 },
      ring,
    ];
    game.l.enemies = [
      {
        x: 100,
        y: 120,
        n: "monster-120",
        tid: 1,
        r: 17,
        hp: 100,
        max: 100,
        cls: "normal",
        series: 0,
      },
      { x: 100, y: 80, n: "sim", arenaSim: true },
    ];
    game.othEnts = () => [{ y: 90, oth: { x: 100, y: 90, n: "remote" } }];
    game.NP(0.1);
    assert.deepEqual(game.events.slice(0, 3), [
      "effect:boom",
      "effect:jm",
      "effect:contact",
    ]);
    for (const name of ["hero", "sim", "remote", "monster-120"]) {
      assert.ok(game.events.indexOf("body:" + name) > 2);
      assert.ok(game.events.indexOf("label:" + name) > 2);
    }
    assert.equal(ring.life, 0.9);
    assert.equal(
      game.events.filter((event: string) => event === "effect:boom").length,
      1,
    );
  });
}
