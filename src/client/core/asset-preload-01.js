// Critical assets for the current screen/session. Never enumerate every map or sprite catalog.
window.localGameAssets = {
  imageFor: bA,
  invalidate: url => { delete of[url]; },
  prepare: async function () {
    if (!window.localGameLoading) return;
    await window.localGameLoading.preload(this);
    window.localGameLoading.finish();
  },
  collect: function () {
    const urls = new Set(Object.keys(of));
    const add = value => { if (typeof value === 'string' && value) urls.add(value); };
    const animations = key => {
      for (const sprite of Object.values(E0.anim && E0.anim[key] || {})) if (sprite && sprite.f) add('img/a/' + sprite.f);
    };
    const look = value => {
      if (!P0 || !value) return;
      for (const pose of Object.values(value.asc || {})) for (const part of Object.keys(X3)) {
        const row = value.rows[_f[part]];
        if (row == null || row < 0) continue;
        const sheet = (((P0.tabs[value.sx] || {})[part] || {})[row] || {})[pose];
        if (sheet && P0.sheets[L8(value.sx, sheet)]) add('img/jx/' + L8(value.sx, sheet) + '.webp');
      }
    };
    if (u0.on || !o.fac) {
      const characters = u0.on ? u0.st.filter(Boolean) : sectPortraits.map(fac => ({ fac, sex:0 }));
      for (const character of characters) {
        add(characterPortrait(character.fac));
        const hero = Jt(character.fac, character.sex);
        if (hero) add(hero.img);
      }
      return [...urls];
    }
    const hero = Jt();
    if (hero) { add(hero.img); animations(hero.anim); }
    look(l.jx || (J3() ? N8() : null));
    const zone = AA(Math.min(o.stage, d0));
    const map = MapsEngine.getMap(l.town ? E0.town.id : zone.id);
    if (map) {
      for (const layer of map.layers) {
        if ('image' in layer) add(MapsEngine.resolveMapAsset(map.id, layer.image));
        if (layer.type === 'world') for (const object of layer.objects) add(MapsEngine.resolveMapAsset(map.id, object.image));
      }
      for (const npc of MapsEngine.mapNpcs(map)) add(MapsEngine.getNpc(npc.npcId)?.image);
    }
    if (!l.town) for (const id of [...(zone.m || []), zone.boss]) {
      const monster = r0[id];
      if (monster) { add(monster.img); animations(monster.anim); }
    }
    for (const id of Object.keys(o.sk || {}).filter(id => o.sk[id] > 0)) {
      const effect = A0.f && A0.f[id];
      const missile = A0.m && A0.m[effect && effect.c || A0.s && A0.s[id]];
      for (const sprite of [U1[id], effect && A0.c && A0.c[effect.pre], ...Object.values(missile || {})])
        if (sprite && typeof sprite === 'object') add(sprite.f);
    }
    for (const sprite of JP()) add(sprite.f);
    return [...urls];
  },
};
