{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const vm: typeof import("node:vm") = require("node:vm");
  const {
    compileTypeScriptEntry,
  }: typeof import("../tools/build-app.js") = require("../tools/build-app.js");

  function loadDashboardModule<Module>(entry: string): Module {
    const scope: Record<string, unknown> = {};
    vm.runInNewContext(compileTypeScriptEntry(entry, "Dashboard").code, scope);
    return scope.Dashboard as Module;
  }

  test("SIM names provide 100 distinct names for each gender and remain unique beyond a pool", () => {
    const { createSimNames, SIM_NAME_POOLS } = loadDashboardModule<
      typeof import("../src/client/simulator/sim-names.ts")
    >("simulator/sim-names.ts");
    const names = createSimNames(() => 0.5);
    for (const gender of [0, 1]) {
      assert.equal(SIM_NAME_POOLS[gender].length, 100);
      const generated = Array.from({ length: 500 }, () => names.next(gender));
      assert.equal(new Set(generated).size, 500);
      assert.ok(
        generated
          .slice(0, 100)
          .every((name) => SIM_NAME_POOLS[gender].includes(name)),
      );
    }
    names.reset();
    assert.ok(SIM_NAME_POOLS[0].includes(names.next(0)));
  });

  test("patrol rank settings support zero counts and retain HP and spawn locations through respawns", () => {
    const { DEFAULT_SOLDIERS, validateSoldierConfiguration } =
      loadDashboardModule<
        typeof import("../src/client/simulator/soldier-config.ts")
      >("simulator/soldier-config.ts");
    const { createRoadMonsters } = loadDashboardModule<
      typeof import("../src/client/simulator/road-monsters.ts")
    >("simulator/road-monsters.ts");
    const configuration = validateSoldierConfiguration(DEFAULT_SOLDIERS);
    configuration.soldier = { count: 0, hp: 100 };
    configuration.general = { count: 3, hp: 9876543 };
    const road = createRoadMonsters({
      create(_index, x, y, spawn) {
        return {
          x,
          y,
          hp: spawn!.hp,
          max: spawn!.hp,
          n: spawn!.rank,
          tid: 0,
          series: 0,
          res: {},
          def: 0,
          rank: spawn!.rank,
        };
      },
      remove() {},
      cancel() {},
      tick() {},
    });
    road.configure(configuration);
    road.start();
    assert.equal(road.actors.length, 19);
    assert.equal(
      road.actors.filter((actor) => actor.rank === "general").length,
      3,
    );
    assert.ok(!road.actors.some((actor) => actor.rank === "soldier"));
    const original = road.actors.find((actor) => actor.rank === "general")!;
    original.hp = 0;
    road.tick(0.1, true);
    configuration.general.hp = 1;
    road.configure(configuration);
    road.tick(20, true);
    const respawn = road.actors.find((actor) => actor.rank === "general")!;
    assert.notEqual(respawn, original);
    assert.equal(respawn.hp, 9876543);
    assert.equal(respawn.x, original.x);
    assert.equal(respawn.y, original.y);
    road.restart();
    assert.equal(road.actors.find((actor) => actor.rank === "general")!.hp, 1);
    configuration.captain.count = -1;
    assert.throws(() => road.configure(configuration));
  });

  test("pharmacy counts mixed bottles once, charges purchases atomically and exposes selected hotbar quantities", () => {
    const { createWarSupplies } = loadDashboardModule<
      typeof import("../src/client/simulator/supplies.ts")
    >("simulator/supplies.ts");
    let gold = 1000,
      recoverable = true;
    const position = { x: 450, y: 1792 };
    const supplies = createWarSupplies({
      running: () => true,
      alive: () => true,
      team: () => "song",
      position: () => position,
      changed() {},
      recover: () => recoverable,
      catalog: () => [
        { key: "hp", kind: "life", tier: 1, n: "Máu", total: 100, price: 10 },
        { key: "mp", kind: "mana", tier: 1, n: "Mana", total: 100, price: 10 },
        {
          key: "both",
          kind: "both",
          tier: 2,
          n: "Kết hợp",
          total: 100,
          mtotal: 60,
          price: 20,
        },
      ],
      pay(amount) {
        if (amount > gold) return false;
        gold -= amount;
        return true;
      },
    });
    supplies.buy("hp", 20);
    supplies.buy("mp", 20);
    supplies.buy("both", 10);
    assert.equal(supplies.state.total, 50);
    assert.equal(gold, 400);
    assert.equal(supplies.slot("life").n, 30);
    supplies.select("life", "both");
    assert.equal(supplies.slot("life").n, 10);
    recoverable = false;
    assert.equal(supplies.use("life"), false);
    assert.equal(supplies.state.total, 50);
    recoverable = true;
    assert.equal(supplies.use("life"), true);
    assert.equal(supplies.state.total, 49);
    assert.equal(supplies.state.mana, 29);
    supplies.buy("hp", 11);
    assert.equal(supplies.state.total, 60);
    const paid = gold;
    assert.throws(() => supplies.buy("hp", 1), /60/);
    assert.equal(gold, paid);
    position.x = 1000;
    assert.throws(() => supplies.buy("hp", 1), /điểm tập trung/);
    position.x = 450;
    supplies.reset();
    assert.throws(() => supplies.buy("both", 60), /ngân lượng/);
    assert.equal(supplies.state.total, 0);
    assert.equal(gold, paid);
  });

  test("leaderboard ranks all participants so the human retains a position outside the top ten", () => {
    const { buildWarStandings } = loadDashboardModule<
      typeof import("../src/client/simulator/leaderboard.ts")
    >("simulator/leaderboard.ts");
    const entries = Array.from({ length: 15 }, (_, index) => ({
      id: String(index),
      name: `SIM ${index}`,
      team: "song",
      points: index * 10,
      title: "Binh sĩ",
      player: index === 0,
    }));
    const standings = buildWarStandings(entries);
    assert.equal(standings[0].points, 140);
    assert.equal(standings.find((entry) => entry.player)!.position, 15);
    assert.equal(
      entries[0].points,
      0,
      "sorting does not mutate the source roster",
    );
  });

  test("PvP merit credits SIM and human kills once per life without rewarding allied kills", () => {
    const { createWarRewards } = loadDashboardModule<
      typeof import("../src/client/simulator/war-rewards.ts")
    >("simulator/war-rewards.ts");
    const player = {
        x: 0,
        y: 0,
        hp: 100,
        max: 100,
        n: "Player",
        tid: 0,
        series: 0,
        res: {},
        def: 0,
      },
      enemy = { ...player, arenaSim: true, battlefieldTeam: "jin" };
    const rewards = createWarRewards({
      player: () => player,
      team: () => "song",
      running: () => true,
      alive: () => true,
      changed() {},
    });
    rewards.record(player, enemy);
    rewards.killed(enemy);
    rewards.killed(enemy);
    assert.equal(rewards.state.points, 150);
    rewards.revived(enemy);
    rewards.killed(enemy);
    assert.equal(
      rewards.state.points,
      150,
      "a new life needs a fresh hostile hit",
    );
    rewards.revived(enemy);
    rewards.record(player, enemy);
    rewards.killed(enemy);
    assert.equal(rewards.state.points, 300);
    rewards.record(enemy, player);
    rewards.killed(player);
    assert.equal(rewards.rank(enemy).points, 150);
    const ally = { ...enemy, battlefieldTeam: "song" };
    rewards.record(player, ally);
    rewards.killed(ally);
    assert.equal(rewards.state.points, 300);
  });

  test("recruitment offers battlefield selection and joins the selected map/team only after pressing Join", () => {
    const { createHeadlessGame } = require("../tools/sim-balance/legacy-runtime.ts");
    for (const mapId of [9001, 9002, 9003]) for (const team of ["song", "jin"]) {
      const game = createHeadlessGame(process.cwd()), simulator = game.arenaSimulator;
      simulator.tick(.01);
      const recruiter = game.equipmentTrader.entities().find((npc: any) => npc.name === "Chiêu Mộ Sứ");
      assert.ok(recruiter);
      recruiter.onInteract();
      const panel = game.simNodes.find((node: any) => node.id === "battlefield-panel");
      const field = (id: string) => panel.querySelector("#battlefield-" + id);
      assert.equal(panel.hidden, false);
      assert.equal(field("section-join").hidden, false);
      assert.equal(field("section-match").hidden, true);
      assert.match(panel.innerHTML, /Tham gia chiến trường Tống Kim/);
      for (const id of [9001, 9002, 9003]) assert.ok(panel.innerHTML.includes(`value="${id}"`));
      field("map").value = String(mapId);
      field("player").value = team;
      field("tab-match").onclick();
      assert.equal(field("section-join").hidden, true);
      assert.equal(field("section-match").hidden, false);
      field("tab-join").onclick();
      assert.equal(field("map").value, String(mapId));
      assert.equal(field("player").value, team);
      assert.equal(simulator.battlefield.active, false, "choosing a map does not start a match");
      field("start").onclick();
      assert.equal(field("error").textContent, "");
      assert.equal(simulator.battlefield.running, true);
      assert.equal(simulator.battlefield.state.mapId, mapId);
      assert.equal(simulator.battlefield.state.team, team);
      const camp = simulator.battlefield.state.camps[team];
      assert.equal(game.v.x, camp.x);
      assert.equal(game.v.y, camp.y);
      assert.equal(panel.hidden, true, "joining closes the recruitment panel");
    }
  });

  test("runtime NPCs open settings and pharmacy, and SIM targeting prefers humans then SIMs then soldiers", () => {
    const {
      createHeadlessGame,
    }: typeof import("../tools/sim-balance/legacy-runtime.ts") = require("../tools/sim-balance/legacy-runtime.ts");
    const game = createHeadlessGame(process.cwd());
    const simulator = game.arenaSimulator,
      match = simulator.battlefield;
    match.start("song");
    simulator.tick(5);
    const npcs = game.equipmentTrader.entities();
    const recruitment = npcs.find(
      (npc: { name: string }) => npc.name === "Chiêu Mộ Sứ",
    );
    const pharmacy = npcs.find(
      (npc: { name: string }) => npc.name === "Chủ Dược Điếm",
    );
    assert.ok(recruitment);
    assert.ok(pharmacy);
    recruitment.onInteract();
    assert.equal(
      game.simNodes.find(
        (node: { id: string }) => node.id === "battlefield-panel",
      ).hidden,
      false,
    );
    pharmacy.onInteract();
    assert.equal(
      game.simNodes.find((node: { id: string }) => node.id === "war-pharmacy")
        .hidden,
      false,
    );
    const [attacker] = match.add({
      team: "jin",
      faction: "gaibang",
      level: 150,
      strength: "normal",
      count: 1,
    });
    const [opponent] = match.add({
      team: "song",
      faction: "wudang",
      level: 150,
      strength: "normal",
      count: 1,
    });
    attacker.x = game.v.x + 100;
    attacker.y = game.v.y;
    opponent.x = attacker.x + 5;
    opponent.y = attacker.y;
    const soldier = simulator.roadMonsters.actors.find(
      (actor: { battlefieldTeam: string }) => actor.battlefieldTeam === "song",
    );
    soldier.x = attacker.x + 1;
    soldier.y = attacker.y;
    assert.equal(
      match.targets(attacker)[0],
      game.v,
      "nearby human wins priority over closer SIM and NPC",
    );
    game.v.x = 2000;
    assert.equal(
      match.targets(attacker)[0],
      opponent,
      "SIM wins priority over a closer NPC",
    );
    opponent.hp = 0;
    assert.ok(match.targets(attacker).includes(soldier));
    assert.ok(!attacker.n.includes("Kim ·"));
    assert.notEqual(attacker.n, opponent.n);
  });

  test("battlefield hotbar explicitly displays zero after exhausting either potion slot", () => {
    const {
      collectLegacyDeclarations,
    }: typeof import("../tools/sim-balance/legacy-runtime.ts") = require("../tools/sim-balance/legacy-runtime.ts");
    const declaration = collectLegacyDeclarations("src/client").get("Kv");
    assert.ok(declaration);
    const slots = new Map<
      string,
      { _k?: string; title?: string; querySelector(selector: string): any }
    >();
    for (const id of ["#bHp", "#bMp", "#bTp"]) {
      const children = new Map<string, any>();
      slots.set(id, {
        querySelector(selector) {
          if (!children.has(selector))
            children.set(selector, {
              textContent: "",
              style: { setProperty() {} },
            });
          return children.get(selector);
        },
      });
    }
    const scope = {
      l: {},
      ao: 1,
      ih: 1,
      E: (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value)),
      m: (id: string) => slots.get(id),
      document: { querySelectorAll: () => [] },
      Za: () => ({ ic: "", n: 0, name: "Hết thuốc" }),
      arenaSimulator: { battlefield: { active: true } },
    };
    vm.runInNewContext(declaration + "\nKv();", scope);
    assert.equal(slots.get("#bHp")!.querySelector("em").textContent, "0");
    assert.equal(slots.get("#bMp")!.querySelector("em").textContent, "0");
  });
}
