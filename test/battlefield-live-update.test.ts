{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const {
    createHeadlessGame,
  } = require("../tools/sim-balance/legacy-runtime.ts");
  test("live soldier update replaces only soldiers and retains match progress, SIMs and bosses", () => {
    const game = createHeadlessGame(process.cwd());
    const simulator = game.arenaSimulator,
      match = simulator.battlefield;
    match.start("song");
    const [fighter] = match.add({
      team: "song",
      faction: "wudang",
      level: 150,
      strength: "normal",
      count: 1,
    });
    match.tick(3);
    const bosses = simulator.actors.filter(
      (actor: any) => actor.battlefieldBoss,
    );
    const bossHP = bosses.map((actor: any) => actor.hp);
    const before = match.state;
    const oldSoldiers = simulator.roadMonsters.actors;
    const panel = game.simNodes.find(
      (node: any) => node.id === "battlefield-panel",
    );
    const field = (selector: string) => panel.querySelector(selector);
    for (const rank of [
      "soldier",
      "captain",
      "commander",
      "general",
      "marshal",
    ]) {
      field(`#battlefield-soldier-${rank}-count`).value =
        rank === "soldier" ? "2" : "0";
      field(`#battlefield-soldier-${rank}-hp`).value = "123456";
    }
    field("#battlefield-update-monsters").onclick();
    assert.equal(field("#battlefield-error").textContent, "");
    assert.equal(simulator.roadMonsters.actors.length, 4);
    assert.ok(
      simulator.roadMonsters.actors.every((actor: any) => actor.max === 123456),
    );
    assert.ok(
      simulator.roadMonsters.actors.every(
        (actor: any) => !oldSoldiers.includes(actor),
      ),
    );
    assert.equal(match.state.elapsed, before.elapsed);
    assert.deepEqual(match.state.score, before.score);
    assert.ok(simulator.actors.includes(fighter));
    assert.deepEqual(
      bosses.map((actor: any) => actor.hp),
      bossHP,
    );
    assert.ok(bosses.every((actor: any) => simulator.actors.includes(actor)));
    const current = simulator.roadMonsters.actors;
    field("#battlefield-soldier-soldier-hp").value = "-1";
    field("#battlefield-update-monsters").onclick();
    assert.ok(field("#battlefield-error").textContent);
    assert.deepEqual(simulator.roadMonsters.actors, current);
    match.reset();
    simulator.openSettings();
    assert.equal(field("#battlefield-update-monsters").disabled, true);
  });
}
