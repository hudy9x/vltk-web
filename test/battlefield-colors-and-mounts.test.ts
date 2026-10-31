{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const vm: typeof import("node:vm") = require("node:vm");
  const fs: typeof import("node:fs") = require("node:fs");
  const path: typeof import("node:path") = require("node:path");
  const {
    createRequire,
  }: typeof import("node:module") = require("node:module");
  const { compileTypeScriptEntry } = require("../tools/build-app.js");
  const {
    createHeadlessGame,
    collectLegacyDeclarations,
  } = require("../tools/sim-balance/legacy-runtime.ts");
  const declarations: Map<string, string> =
    collectLegacyDeclarations("src/client");
  function loadNative(game: any, names: string[]) {
    for (const name of names) vm.runInContext(declarations.get(name)!, game);
  }
  test("grounded 150 branches inherit the 90 mount policy while mounted-capable branches remain usable", () => {
    const game = createHeadlessGame(process.cwd());
    loadNative(game, ["eP", "sP", "E3"]);
    const pairs = [
      [318, 1055],
      [319, 1056],
      [323, 1059],
      [325, 1060],
      [328, 1061],
      [380, 1062],
      [336, 1063],
      [337, 1065],
      [339, 1069],
      [302, 1070],
      [342, 1071],
      [357, 1073],
      [359, 1074],
      [362, 1076],
      [365, 1078],
      [368, 1079],
      [372, 1080],
      [375, 1081],
      [321, 1057],
      [322, 1058],
      [361, 1075],
    ];
    for (const [base, advanced] of pairs)
      for (const mounted of [false, true])
        assert.equal(
          game.E3(game.T[advanced], mounted),
          game.E3(game.T[base], mounted),
          `${advanced} riding=${mounted}`,
        );
    assert.equal(game.E3(game.T[1066], false), true, "Hình Tiêu Cốt Lập on foot");
    assert.equal(game.E3(game.T[1066], true), false, "Hình Tiêu Cốt Lập requires dismount");
    assert.equal(game.E3(game.T[1067], false), true, "U Hồn Phệ Ảnh on foot");
    assert.equal(game.E3(game.T[1067], true), true, "U Hồn Phệ Ảnh while mounted");
  });
  function ridingFixture() {
    const game = createHeadlessGame(process.cwd());
    loadNative(game, ["eP", "sP", "E3", "Ka", "tP", "aP"]);
    game.xe = () => true;
    game.O3 = () => {};
    game.S3 = () => game.o.autoRide !== false;
    Object.assign(game.l, { mounted: true, rideCd: 0, mana: 500 });
    return game;
  }
  test("grounded casts dismount before spending resources and remain blocked during ride cooldown or with auto ride disabled", () => {
    const game = ridingFixture(),
      skill = { id: 1055 };
    assert.equal(game.tP(skill), true);
    assert.equal(game.l.mounted, false);
    assert.equal(game.l.mana, 500);
    assert.equal(game.tP(skill), false);
    Object.assign(game.l, { mounted: true, rideCd: 0.4 });
    assert.equal(game.tP(skill), true);
    assert.equal(game.l.mounted, true);
    game.l.rideCd = 0;
    game.o.autoRide = false;
    assert.equal(game.tP(skill), null);
    assert.equal(game.l.mounted, true);
    assert.equal(
      game.tP({ id: 1057 }),
      false,
      "mounted-capable skill is not blocked",
    );
  });
  test("the separate curse cast path cannot bypass a grounded mount requirement", () => {
    const game = ridingFixture();
    loadNative(game, ["jm"]);
    let spent = 0,
      casts = 0;
    Object.assign(game, {
      actorActionLocked: () => false,
      w_: () => true,
      skillCastDistance: () => 50,
      g_: 240,
      QA: 1,
      o4: () => spent++,
      l_: () => casts++,
      beginActorCast: (_actor: unknown, _seconds: number, release: () => void) => { release(); return true; },
      hA: () => false,
      $1: () => false,
      kn: () => 0,
      G8: () => {},
      playActorAttackVoice: () => {},
      Y: undefined,
    });
    const skill = { id: 1081, rate: 1, rad: 470 },
      target = { x: 100, y: 100, r: 10 };
    game.o.autoRide = false;
    assert.equal(game.jm(skill, target), 0.25);
    assert.equal(casts, 0);
    assert.equal(spent, 0);
    game.o.autoRide = true;
    assert.equal(game.jm(skill, target), 0.25);
    assert.equal(game.l.mounted, false);
    assert.equal(casts, 0);
    game.jm(skill, target);
    assert.equal(casts, 1);
    assert.equal(spent, 1);
  });
  test("world nameplates use viewer-relative health and distinct title colors for both player teams", () => {
    const fixturePath = path.resolve("test/nameplates.test.js");
    const prefix = fs
      .readFileSync(fixturePath, "utf8")
      .split("test('crowded nameplates")[0];
    const scene = new Function(
      "require",
      "__dirname",
      prefix + ";return scene;",
    )(createRequire(fixturePath), path.dirname(fixturePath));
    const scope: Record<string, any> = {};
    vm.runInNewContext(
      compileTypeScriptEntry("simulator/presentation.ts", "Presentation").code,
      scope,
    );
    const colors = scope.Presentation;
    const titles = [
      "Binh sĩ",
      "Hiệu úy",
      "Thống lĩnh",
      "Đại thống lĩnh",
      "Tướng quân",
      "Phó tướng",
      "Đại tướng",
      "Nguyên soái",
    ];
    assert.equal(
      new Set(titles.map((name) => colors.battlefieldTitleColor(name))).size,
      titles.length,
    );
    for (const playerTeam of ["song", "jin"]) {
      const game = scene(),
        labels: any[][] = [];
      game.l.battlefield = true;
      Object.assign(game.arenaSimulator, colors, {
        battlefield: { state: { team: playerTeam } },
        warRewards: { rank: () => ({ name: "Tướng quân" }) },
      });
      game.L3 = (...args: any[]) => labels.push(args);
      game.l.enemies = ["song", "jin"].map((team, index) => ({
        x: 100,
        y: 100 + index * 40,
        n: team,
        tid: 1,
        r: 17,
        hp: 75,
        max: 100,
        cls: "normal",
        series: 0,
        battlefieldTeam: team,
        battlefieldRank: index ? "Nguyên soái" : "Binh sĩ",
      }));
      game.NP(0.016);
      const hero = labels.find((row) => row[2] === "hero")!;
      assert.equal(hero[6], "#4fd04f");
      assert.equal(hero[8], colors.battlefieldTitleColor("Tướng quân"));
      for (const team of ["song", "jin"]) {
        const row = labels.find((row) => row[2] === team)!;
        assert.equal(row[6], team === playerTeam ? "#4fd04f" : "#ff6038");
        assert.equal(
          row[8],
          colors.battlefieldTitleColor(
            team === "song" ? "Binh sĩ" : "Nguyên soái",
          ),
        );
      }
    }
  });
  test("SIM and golden boss health colors follow either viewer team without copying the player mount", () => {
    const game = createHeadlessGame(process.cwd());
    const simulator = game.arenaSimulator,
      labels: any[][] = [],
      mounts: { actual: boolean; expected: boolean }[] = [];
    Object.assign(game, {
      E0: { anim: { "sim-body": { st: { h: 80 } } } },
      Jn: 1,
      H8() {},
      ps() {},
      M8: () => true,
      bA: () => ({}),
      L3: (...args: any[]) => labels.push(args),
      kf: () => {
        mounts.push({
          actual: !!game.l.mounted,
          expected: !!game.v.mounted && !game.v.battlefieldBoss,
        });
        return 80;
      },
    });
    vm.runInContext(
      compileTypeScriptEntry("render/nameplates.ts", "nameplateOffset").code,
      game,
    );
    for (const playerTeam of ["song", "jin"]) {
      simulator.battlefield.start(playerTeam);
      simulator.battlefield.tick(600);
      const own = simulator.battlefield.add({
        team: playerTeam,
        faction: "wudang",
        level: 150,
        strength: "normal",
        count: 1,
      })[0];
      const hostileTeam = playerTeam === "song" ? "jin" : "song";
      const enemy = simulator.battlefield.add({
        team: hostileTeam,
        faction: "wudang",
        level: 150,
        strength: "normal",
        count: 1,
      })[0];
      game.l.mounted = true;
      for (const actor of [
        own,
        enemy,
        ...simulator.actors.filter((actor: any) => actor.battlefieldBoss),
      ]) {
        actor.look = { anim: "sim-body" };
        simulator.draw({}, actor, 0.016);
        const row = labels.at(-1)!;
        assert.equal(
          row[6],
          actor.battlefieldTeam === playerTeam ? "#4fd04f" : "#ff6038",
        );
        assert.equal(
          row[8],
          simulator.battlefieldTitleColor(
            actor.battlefieldBoss ? "Nguyên soái" : "Binh sĩ",
          ),
        );
      }
      assert.equal(
        game.l.mounted,
        true,
        "player mount state restored after each SIM render",
      );
    }
    assert.ok(
      mounts.every((mounted) => mounted.actual === mounted.expected),
      "SIMs use their own riding state",
    );
  });
}
