{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const vm: typeof import("node:vm") = require("node:vm");
  const fs: typeof import("node:fs") = require("node:fs");
  const { compileTypeScriptEntry } = require("../tools/build-app.js");
  const {
    createHeadlessGame,
    collectLegacyDeclarations,
    installNativeDeclarations,
  } = require("../tools/sim-balance/legacy-runtime.ts");
  test("diagonal map is exactly 3584px, tiled at native 120px with cropped edges and reachable camps", () => {
    const map = JSON.parse(
      fs.readFileSync("src/client/maps/content/9002/map.json", "utf8"),
    );
    const manifest = JSON.parse(
      fs.readFileSync("src/client/maps/content/9002/tiles.json", "utf8"),
    );
    assert.deepEqual(map.size, { width: 3584, height: 3584 });
    assert.equal(manifest.tileSize, 120);
    assert.equal(manifest.placements.length, 900);
    assert.equal(manifest.placements.at(-1).width, 104);
    assert.equal(manifest.placements.at(-1).height, 104);
    const scope: Record<string, any> = { atob, btoa };
    vm.runInNewContext(
      compileTypeScriptEntry("maps/index.ts", "MapsEngine").code,
      scope,
    );
    const engine = scope.MapsEngine,
      definition = engine.getMap(9002);
    assert.ok(definition);
    assert.ok(definition.layers.filter((layer: any) => layer.type === "world")[0].objects.length >= 26);
    const navigation = engine.createLegacyCatalog().navigation[9002];
    assert.ok(navigation);
    const bits = Buffer.from(navigation.obs, "base64"),
      cols = navigation.gw,
      rows = navigation.gh;
    const cell = (x: number, y: number) =>
      Math.floor(y / 16) * cols + Math.floor(x / 32);
    const free = (index: number) =>
      index >= 0 &&
      index < cols * rows &&
      !(bits[index >> 3] & (1 << (index & 7)));
    const start = cell(850, 950),
      goal = cell(2734, 2634),
      seen = new Set([start]),
      queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor++)
      for (const next of [
        queue[cursor] - 1,
        queue[cursor] + 1,
        queue[cursor] - cols,
        queue[cursor] + cols,
      ])
        if (free(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
    assert.ok(seen.has(goal), "both camps share a navigable component");
  });
  test("both layouts preserve team respawn locations, supply camps and horse NPC coordinates", () => {
    const game = createHeadlessGame(process.cwd()),
      sim = game.arenaSimulator;
    sim.battlefield.start("jin", { song: 3, jin: 2 }, 9002);
    assert.equal(sim.battlefield.state.mapId, 9002);
    assert.equal(game.v.x, 2734);
    assert.equal(game.v.y, 2634);
    assert.equal(sim.roadMonsters.actors.length, 70);
    for (const actor of sim.roadMonsters.actors)
      assert.ok(
        actor.x > 128 && actor.x < 3456 && actor.y > 128 && actor.y < 3456,
      );
    sim.battlefield.start("song");
    assert.equal(sim.battlefield.state.mapId, 9001);
    assert.equal(game.v.x, 450);
    assert.equal(game.v.y, 1792);
  });
  test("level-60 supports reserve ordinary skill points and apply real native defensive stats", () => {
    const game = createHeadlessGame(process.cwd());
    const declarations = collectLegacyDeclarations("src/client");
    installNativeDeclarations(game, declarations);
    game.arenaSimulator.battlefield.start("song");
    const actor = game.arenaSimulator.battlefield.add({
      team: "song",
      faction: "wudang",
      level: 150,
      strength: "normal",
      count: 1,
      equipped: false,
    })[0];
    assert.equal(actor.profile.sk[166], game.T[166].max);
    assert.ok(actor.profile.skPts >= 0);
    const nativeStats = vm.runInContext(
      "(function(){" + declarations.get("j0") + ";return j0;})()",
      game,
    );
    game.o = actor.profile;
    game.l.buffAssume = true;
    game.l.mounted = false;
    const withSupport = nativeStats();
    delete actor.profile.sk[166];
    const withoutSupport = nativeStats();
    assert.ok(
      withSupport.mana > withoutSupport.mana ||
        withSupport.life > withoutSupport.life ||
        withSupport.manaShield > withoutSupport.manaShield,
      "actual support changes native defense/resources",
    );
  });
  test("SIM horses belong to their own profiles and obey grounded/horse-compatible skill branches", () => {
    const game = createHeadlessGame(process.cwd());
    const sim = game.arenaSimulator;
    sim.battlefield.start("song");
    const actor = sim.battlefield.add({
      team: "song",
      faction: "shaolin",
      level: 150,
      strength: "normal",
      count: 1,
      skillTier: 150,
    })[0];
    assert.ok(actor.profile.eq.horse);
    const declarations = collectLegacyDeclarations("src/client");
    for (const name of ["eP", "sP", "E3"])
      vm.runInContext(declarations.get(name)!, game);
    // Skill changes use the same equipment adaptation and riding policy as real casts.
    sim.selectActor(actor.simId);
    sim.selectSkill(1057);
    assert.equal(actor.mounted, true);
    sim.selectSkill(1055);
    assert.equal(actor.mounted, false);
  });
}
