{
  const { test }: typeof import("node:test") = require("node:test");
  const assert: typeof import("node:assert/strict") = require("node:assert/strict");
  const vm: typeof import("node:vm") = require("node:vm");
  const { compileTypeScriptEntry } = require("../tools/build-app.js");
  const {
    createHeadlessGame,
    collectLegacyDeclarations,
    installNativeDeclarations,
  } = require("../tools/sim-balance/legacy-runtime.ts");
  function setup() {
    const game = createHeadlessGame(process.cwd());
    installNativeDeclarations(game, collectLegacyDeclarations("src/client"));
    const scope: Record<string, any> = {};
    vm.runInNewContext(
      compileTypeScriptEntry("gameplay/horse-trader/model.ts", "HorseModel")
        .code,
      scope,
    );
    let generated = 0,
      saved = 0,
      alive = true,
      limit = 100;
    const player: { fac: string; knb: number; inv: any[] } = {
      fac: "wudang",
      knb: 25,
      inv: [],
    };
    const shop: ReturnType<
      typeof import("../src/client/gameplay/horse-trader/model.ts").createHorseShop
    > = scope.HorseModel.createHorseShop({
      catalog: () => game.S.items[10].list,
      quality: (template: any) => game.st({ ...template, d: 10 }),
      obsolete: (kind: number) => game.Mc[kind] != null,
      describe: () => "Tốc độ di chuyển",
      player: () => player,
      inventoryLimit: () => limit,
      alive: () => alive,
      make: (template: any) => {
        generated++;
        return { ...template, d: 10, uid: generated };
      },
      changed: () => saved++,
    });
    return {
      shop,
      player,
      game,
      get generated() {
        return generated;
      },
      get saved() {
        return saved;
      },
      set alive(value: boolean) {
        alive = value;
      },
      set limit(value: number) {
        limit = value;
      },
    };
  }
  test("native horse offers cover seven qualities and all levels without generating items during preview", () => {
    const fixture = setup(),
      offers = fixture.shop.offers();
    assert.equal(offers.length, 240);
    assert.equal(new Set(offers.map((offer) => offer.quality)).size, 7);
    assert.equal(new Set(offers.map((offer) => offer.level)).size, 10);
    assert.ok(
      offers.every((offer) => ![30, 31, 32].includes(offer.template.k)),
    );
    const offer = offers.find((item) => item.name.includes("Xích"))!;
    assert.ok(offer);
    const query = offer.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d");
    assert.ok(
      fixture.shop
        .filter({ quality: -1, level: 0, search: query })
        .some((item) => item.key === offer.key),
    );
    assert.equal(
      fixture.shop.filter({ quality: -1, level: 0, search: "" }).length,
      240,
    );
    assert.ok(
      fixture.shop
        .filter({ quality: offer.quality, level: offer.level, search: "" })
        .every(
          (item) =>
            item.quality === offer.quality && item.level === offer.level,
        ),
    );
    assert.equal(fixture.generated, 0);
    assert.equal(fixture.saved, 0);
    assert.equal(fixture.player.knb, 25);
  });
  test("horse purchase delivers exact variant to inventory and charges precisely 10 KNB once", () => {
    const fixture = setup(),
      offer = fixture.shop.offers()[0];
    const item = fixture.shop.buy(offer.key);
    assert.equal(item.k, offer.template.k);
    assert.equal(item.lvl, offer.level);
    assert.equal(item.d, 10);
    assert.equal(item.stOut, 1);
    assert.equal(fixture.player.inv[0], item);
    assert.equal(fixture.player.knb, 15);
    assert.equal(fixture.generated, 1);
    assert.equal(fixture.saved, 1);
  });
  test("invalid, full, dead or unaffordable horse purchases never generate or charge", () => {
    const fixture = setup(),
      key = fixture.shop.offers()[0].key;
    assert.throws(() => fixture.shop.buy("invalid"));
    fixture.limit = 0;
    assert.throws(() => fixture.shop.buy(key));
    fixture.limit = 100;
    fixture.alive = false;
    assert.throws(() => fixture.shop.buy(key));
    fixture.alive = true;
    fixture.player.knb = 9;
    assert.throws(() => fixture.shop.buy(key));
    assert.equal(fixture.generated, 0);
    assert.equal(fixture.saved, 0);
    assert.equal(fixture.player.inv.length, 0);
    assert.equal(fixture.player.knb, 9);
  });
  test('native merchant keeps live dialog state and generates a persistent horse with one UID', () => {
    const game = createHeadlessGame(process.cwd());
    delete game._A;
    installNativeDeclarations(game, collectLegacyDeclarations('src/client'));
    game.INV_MAX = 100;
    vm.runInContext(compileTypeScriptEntry('gameplay/horse-trader/index.ts', 'horseTrader').code, game);
    const merchant = game.horseTrader;
    assert.equal(merchant.isOpen, false);
    merchant.open(); assert.equal(merchant.isOpen, true);
    merchant.close(); assert.equal(merchant.isOpen, false);
    const uid = game.o.uid, knb = game.o.knb;
    merchant.offers();
    assert.equal(game.o.uid, uid);
    const offer = merchant.offers()[0];
    const item = merchant.buy(offer.key);
    assert.equal(item.uid, uid); assert.equal(game.o.uid, uid + 1);
    assert.equal(item.k, offer.template.k); assert.equal(item.lvl, offer.level);
    assert.equal(game.o.inv[0], item); assert.equal(game.o.knb, knb - 10);
    assert.equal(merchant.state.knb, game.o.knb);
  });

}
