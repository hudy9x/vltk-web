// An opt-in development arena with its own database and ten independent profiles.
var combatSandbox = (function () {
  const config = window.localGameConfig;
  if (!config || !config.development || !config.combatSandbox) return null;
  const key = "jxidle_arena_profiles";
  const selectionKey = "jxidle_arena_selected";
  const optionsKey = "jxidle_arena_options";
  const factions = Object.values(I).filter(faction => !faction.novice && faction.skills && faction.skills.length);
  const profiles = {};
  let activeFaction = null;
  let stored = {};
  const healthOptions = [100_000, 1_000_000, 10_000_000, 100_000_000];
  let options = { monster: 0, count: 3, health: 100_000, stationary: false, level: null, rarity: "all", monsterRarity: "normal", showHealth: false, oneDamage: true };
  try { stored = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  try { Object.assign(options, JSON.parse(localStorage.getItem(optionsKey) || "{}")); } catch {}
  if (!healthOptions.includes(+options.health)) options.health = 100_000;
  function createProfile(faction) {
    const state = I3();
    Object.assign(state, {
      name: "Test-" + faction.n.replace(/ phái| môn| Giáo| Bang/gi, ""),
      fac: faction.key, sex: Zt[faction.key] || 0, sexSet: 1,
      lvl: 150, xp: 0, skPts: 500, attrPts: 149 * z2,
      gold: 1_000_000_000, knb: 100_000, ctrl: "manual", mainLock: true, rot: false,
      autoPts: false, autoEquip: false, autoForge: false, autoBuy: false,
      snd: { on: false, vol: 0.7, music: false, mvol: 0.4 },
      bkOk: {}, skL: {}, sk9Free: 1, sk9m: 1, arenaFaction: faction.key, arenaVersion: 2,
    });
    if (faction.starter) state.sk[faction.starter] = 1;
    for (const id of faction.skills) {
      const skill = T[id];
      if (skill && skill.tier === 90 && !SA(id)) {
        state.sk[id] = skill.max; state.skL[id] = { lv: skill.max, xp: 0 }; state.bkOk[id] = 1;
      }
    }
    state.main = faction.skills.find(id => state.sk[id] && T[id] && T[id].tier === 90 && UA(T[id])) || faction.starter || "basic";
    state.slots = faction.skills.filter(id => state.sk[id] && T[id] && T[id].tier === 90 && UA(T[id])).slice(0, 4);
    return state;
  }
  for (const faction of factions) {
    let state;
    try { const decoded = t1(stored[faction.key]); if (decoded.ok && decoded.state.fac === faction.key && decoded.state.arenaVersion === 2) state = decoded.state; } catch {}
    profiles[faction.key] = state || createProfile(faction);
  }
  const originalSave = $;
  function persistProfiles() {
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(factions.map(faction => [faction.key, bn(profiles[faction.key])]))));
  }
  $ = function () {
    if (activeFaction && o && o.arenaFaction === activeFaction) maxLevel90Skills(o);
    originalSave();
    if (activeFaction && o && o.arenaFaction === activeFaction && profiles[activeFaction]) {
      profiles[o.arenaFaction] = JSON.parse(JSON.stringify(o));
      persistProfiles();
      refreshPanel();
    }
  };
  // Keep the real movement, obstacle, projectile and collision simulation.
  window.NO_FIELD = true;
  let arenaTime = 0;
  let spawnPlans = [];
  const pendingRespawns = new Map();
  o8 = function () {};
  cD = function (monster) {
    if (monster && monster.hp <= 0 && monster.arenaMonster && spawnPlans[monster.arenaSlot] && !pendingRespawns.has(monster.arenaSlot))
      pendingRespawns.set(monster.arenaSlot, arenaTime + 3);
  };
  lD = function () {};
  rD = function () { l.stall = 0; };
  const originalDamage = U9;
  U9 = function (attacker) {
    if (!attacker.arenaMonster || !options.oneDamage) return originalDamage(attacker);
    const before = l.life;
    l.life = Math.max(0, l.life - 1);
    if (typeof arenaSimulator !== "undefined" && arenaSimulator) arenaSimulator.forcedDamage(attacker, before, l.life);
    if (typeof combatLog !== "undefined" && combatLog) combatLog.record("in", attacker, before - l.life, "Đòn đánh");
    l.hurtT = 0.15;
    showDamageNumber(v, before - l.life);
  };
  function clearCombat(preserveSims = true) {
    pendingRespawns.clear(); spawnPlans = [];
    l.enemies = preserveSims ? l.enemies.filter(actor => actor.arenaSim && !actor.dead && actor.hp > 0) : [];
    for (const field of ["corpses", "ground", "fx", "fxQ", "combatProjectiles", "traps", "allies", "txt"]) l[field] = [];
    for (const field of ["manTgt", "tgt", "moveTo", "pickTarget", "clickedTarget", "dash", "dashTrail"]) l[field] = null;
    for (const field of ["atkT", "deadT", "stunT", "slowT", "hpDotT", "hpDot", "hurtT", "stall", "spawnT"]) l[field] = 0;
    l.skCd = {}; l.clickHold = false; Y.target = null; Y.active = false; Y.keys = {};
  }
  function createMonster(plan, slot) {
    const monster = n1(plan.id, plan.level, plan.rarity === "normal" ? "normal" : "boss", plan.x, plan.y);
    if (plan.rarity === "gold") { monster.goldBoss = true; monster.n = "Trùm Hoàng Kim · " + r0[plan.id].n; }
    Object.assign(monster, { hp: plan.health, max: plan.health, nativeDamage: monster.dmg, dmg: options.oneDamage ? 1 : monster.dmg, arenaMonster: true, arenaSlot: slot, spd: plan.stationary ? 0 : monster.spd });
    return monster;
  }
  function setOneDamage(enabled) {
    options.oneDamage = !!enabled;
    for (const monster of l.enemies) if (monster.arenaMonster) monster.dmg = options.oneDamage ? 1 : monster.nativeDamage;
    localStorage.setItem(optionsKey, JSON.stringify(options));
  }
  function tick(dt) {
    arenaTime += dt;
    l.enemies = l.enemies.filter(monster => !monster.arenaMonster || !monster.dead);
    if (l.town) return;
    const occupied = new Set(l.enemies.filter(monster => monster.arenaMonster && monster.hp > 0).map(monster => monster.arenaSlot));
    for (const [slot, due] of pendingRespawns) {
      if (arenaTime + 1e-9 < due) continue;
      if (spawnPlans[slot] && !occupied.has(slot)) {
        l.enemies.push(createMonster(spawnPlans[slot], slot)); occupied.add(slot);
      }
      pendingRespawns.delete(slot);
    }
  }
  function healthLabel(monster) {
    return options.showHealth && monster.arenaMonster ? ` · HP ${Math.max(0, Math.ceil(monster.hp)).toLocaleString("vi-VN")}/${monster.max.toLocaleString("vi-VN")}` : "";
  }
  function nearestTarget(monster) {
    let nearest = l.life > 0 && !(l.deadT > 0) ? v : null;
    const distance = actor => (actor.x - monster.x) ** 2 + ((actor.y - monster.y) * 2) ** 2;
    let best = nearest ? distance(nearest) : Infinity;
    const sims = typeof arenaSimulator !== "undefined" && arenaSimulator ? arenaSimulator.actors : l.enemies.filter(actor => actor.arenaSim);
    for (const actor of sims) {
      if (!actor.arenaSim || actor.dead || !(actor.hp > 0)) continue;
      const value = distance(actor);
      if (value < best) { best = value; nearest = actor; }
    }
    return nearest;
  }
  function selectSkill(id) {
    maxLevel90Skills(o);
    if (id !== "basic" && (!I[o.fac].skills.includes(+id) || !o.sk[id] || !UA(T[id]))) throw new Error("Chiêu không thuộc nhân vật này.");
    o.main = id === "basic" ? "basic" : +id;
    o.mainLock = true; o.rot = false;
    const weapon = id === "basic" ? null : j1(T[id]);
    if (weapon !== null) {
      const item = _A(weapon >= 100 ? 1 : 0, weapon >= 100 ? weapon - 100 : weapon === -1 ? 6 : weapon, 1, 0);
      if (item) o.eq.weapon = item;
    }
    l.dirty = true; D0(); l.mana = l.P.mana; $(); V(); refreshPanel();
  }
  function maxLevel90Skills(state) {
    state.skL || (state.skL = {});
    state.bkOk || (state.bkOk = {});
    for (const id of I[state.fac].skills) {
      const skill = T[id];
      if (skill && skill.tier === 90 && !SA(id)) {
        state.sk[id] = skill.max;
        state.skL[id] = { lv: skill.max, xp: 0 };
        state.bkOk[id] = 1;
      }
    }
  }
  function switchFaction(faction) {
    if (!profiles[faction]) throw new Error("Môn phái không hợp lệ.");
    if (activeFaction) $();
    clearCombat(false);
    HA = false; m0 = 0;
    o = v8(JSON.parse(JSON.stringify(profiles[faction])));
    maxLevel90Skills(o);
    activeFaction = faction;
    Object.assign(l, { town: false, dg: null, tower: false, mounted: false, unvoid: 0 });
    window.NO_FIELD = true;
    const map = AA(o.stage);
    ma(map.id); l.bgImg = map.bg ? bA(map.bg) : null;
    [v.x, v.y] = X0(O0.w / 2, O0.h / 2);
    v.act = "st"; v.actT = 0; v.px = v.x; v.py = v.y;
    Vf(); D0(); l.life = l.P.life; l.mana = l.P.mana;
    pi(); n0(true); M1(); uo(); tt(); fA("log");
    localStorage.setItem(selectionKey, faction);
    selectSkill(o.main);
    const matching = filterMonsters(options.level, options.rarity);
    const selectedMonster = matching.find(entry => entry.id === options.monster && entry.rarity === options.monsterRarity) || matching[0];
    if (selectedMonster) spawnMonsters(selectedMonster.id, options.count, options.stationary, options.level, selectedMonster.rarity);
  }
  function spawnMonsters(id, count, stationary, level = options.level, rarity = options.monsterRarity, health = options.health) {
    if (!r0[id]) throw new Error("Quái không hợp lệ.");
    count = +count; health = +health;
    if (!Number.isSafeInteger(count) || count < 1 || count > 10_000) throw new Error("Số lượng quái phải là số nguyên từ 1 đến 10.000.");
    if (!healthOptions.includes(health)) throw new Error("Máu quái phải là 100k, 1m, 10m hoặc 100m.");
    rarity = ["normal", "boss", "gold"].includes(rarity) ? rarity : "normal";
    const entry = monsterCatalog.find(entry => entry.id === +id && entry.rarity === rarity);
    if (!entry) throw new Error("Loại quái không có trong dữ liệu.");
    const spawnLevel = level == null || level === "" ? (entry.ranges[0]?.[0] || 150) : Math.max(1, Math.min(200, Math.floor(+level) || 1));
    if (level != null && level !== "" && !entry.ranges.some(([lo, hi]) => spawnLevel >= lo && spawnLevel <= hi)) throw new Error("Quái không có ở cấp đã chọn.");
    options = Object.assign({}, options, { monster: +id, count, health, stationary: !!stationary, level: level == null || level === "" ? null : spawnLevel, monsterRarity: rarity });
    localStorage.setItem(optionsKey, JSON.stringify(options));
    clearCombat();
    l.town = false;
    // Divide the visible, walkable arena into scattered packs. No timers or waves:
    // every requested body exists before this function returns, including stress loads.
    const width = typeof M0 !== "undefined" && M0.w > 0 ? Math.min(M0.w, O0.w) : Math.min(900, O0.w);
    const height = typeof M0 !== "undefined" && M0.h > 0 ? Math.min(M0.h, O0.h) : Math.min(600, O0.h);
    const left = Math.max(0, Math.min(O0.w - width, v.x - width / 2));
    const top = Math.max(0, Math.min(O0.h - height, v.y - height / 2));
    const groups = Math.min(count, Math.max(4, Math.min(24, Math.ceil(count / 8))));
    const columns = Math.min(groups, Math.max(1, Math.ceil(Math.sqrt(groups * width / height))));
    const rows = Math.ceil(groups / columns);
    const cellWidth = Math.max(1, width - 100) / columns, cellHeight = Math.max(1, height - 180) / rows;
    for (let index = 0; index < count; index++) {
      const group = index % groups, member = Math.floor(index / groups);
      const members = Math.ceil((count - group) / groups), angle = member * 2.399963 + group;
      const spread = Math.sqrt((member + 0.5) / members) * 0.38;
      const [x, y] = X0(left + 50 + (group % columns + 0.5 + Math.cos(angle) * spread) * cellWidth,
        top + 130 + (Math.floor(group / columns) + 0.5 + Math.sin(angle) * spread) * cellHeight);
      const plan = { id: +id, level: spawnLevel, rarity, health, x, y, stationary: !!stationary };
      spawnPlans.push(plan);
      l.enemies.push(createMonster(plan, index));
    }
    panel.querySelector("#arena-count").value = count;
    panel.querySelector("#arena-health").value = String(health);
    refreshPanel();
  }
  const panel = document.createElement("details");
  panel.id = "combat-sandbox"; panel.open = true;
  const style = document.createElement("style");
  style.textContent = `#combat-sandbox{position:fixed;top:50px;left:8px;z-index:89990;width:min(400px,calc(100vw - 16px));max-height:calc(100dvh - 70px);overflow:auto;background:#17201bee;color:#efdfb0;border:1px solid #9f8c51;padding:10px;font:13px inherit}#combat-sandbox summary{cursor:pointer;font-weight:bold;padding-bottom:8px}#combat-sandbox .arena-factions{display:grid;grid-template-columns:1fr 1fr;gap:4px}#combat-sandbox button{cursor:pointer;background:#34462c;color:#f4e7ba;border:1px solid #78825a;padding:6px}#combat-sandbox button.on{background:#806529;border-color:#f2d17b}#combat-sandbox .arena-skills{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}#combat-sandbox input,#combat-sandbox select{max-width:100%;background:#101a14;color:#efdfb0;border:1px solid #78825a;padding:5px}#combat-sandbox label{display:block;margin:7px 0}#arena-info{margin:6px 0;color:#cdd1bc}`;
  document.head.appendChild(style);
  const monsterCatalog = [];
  function addMonster(id, rarity, lo, hi) {
    if (!r0[id] || !r0[id].n) return;
    let entry = monsterCatalog.find(entry => entry.id === +id && entry.rarity === rarity);
    if (!entry) { entry = { id: +id, name: r0[id].n, rarity, ranges: [] }; monsterCatalog.push(entry); }
    if (Number.isFinite(lo) && Number.isFinite(hi) && !entry.ranges.some(range => range[0] === lo && range[1] === hi)) entry.ranges.push([lo, hi]);
  }
  for (const zone of k0) {
    for (const id of zone.m || []) addMonster(id, "normal", zone.lo, zone.hi);
    addMonster(zone.boss, "boss", zone.lo + 1, zone.hi + 1);
    addMonster(zone.boss, "gold", Math.min(zone.lo, 150) + 2, Math.min(zone.hi, 150) + 2);
  }
  for (const id of Object.keys(r0)) if (!monsterCatalog.some(entry => entry.id === +id)) addMonster(id, "normal");
  monsterCatalog.sort((a, b) => a.id - b.id || a.rarity.localeCompare(b.rarity));
  const rarityNames = { normal: "Thường", boss: "Boss", gold: "Hoàng Kim" };
  function filterMonsters(level, rarity, text = "") {
    const query = text.toLocaleLowerCase("vi");
    return monsterCatalog.filter(entry => (rarity === "all" || entry.rarity === rarity) &&
      (level == null || level === "" || entry.ranges.some(([lo, hi]) => +level >= lo && +level <= hi)) &&
      `${entry.id} ${entry.name}`.toLocaleLowerCase("vi").includes(query));
  }
  panel.innerHTML = `<summary>Phòng test · 10 môn phái</summary><div class="arena-factions">${factions.map(faction => `<button type="button" data-faction="${faction.key}">${D(faction.n)}</button>`).join("")}</div><p id="arena-info"></p><div class="arena-skills"></div><label>Lọc quái <input id="arena-filter" placeholder="Tên hoặc ID quái"></label><label>Cấp quái <input id="arena-level" type="number" min="1" max="200" placeholder="Tất cả" value="${options.level || ""}" style="width:90px"></label><label>Độ hiếm <select id="arena-rarity"><option value="all">Tất cả</option><option value="normal">Thường</option><option value="boss">Boss</option><option value="gold">Hoàng Kim</option></select></label><label>Quái <select id="arena-monster"></select></label><label>Số lượng (1–10.000) <input id="arena-count" type="number" min="1" max="10000" step="1" value="${options.count}" style="width:65px"></label><label>Máu quái <select id="arena-health"><option value="100000">100k HP</option><option value="1000000">1m HP</option><option value="10000000">10m HP</option><option value="100000000">100m HP</option></select></label><label><input id="arena-still" type="checkbox" ${options.stationary ? "checked" : ""}> Quái đứng yên</label><button type="button" data-spawn>Tạo lại quái</button> <button type="button" data-clear>Xóa quái</button>`;
  function refreshPanel() {
    if (!panel || !o || !I[o.fac]) return;
    panel.querySelectorAll("[data-faction]").forEach(button => button.classList.toggle("on", button.dataset.faction === o.fac));
    panel.querySelector("#arena-info").textContent = `${I[o.fac].n} · Cấp ${o.lvl} · ${o.skPts} điểm kỹ năng còn lại`;
    panel.querySelector(".arena-skills").innerHTML = `<button type="button" data-skill="basic">Đánh thường</button>` + I[o.fac].skills.filter(id => o.sk[id] && T[id] && T[id].tier === 90 && UA(T[id])).map(id => `<button type="button" class="${+o.main === +id ? "on" : ""}" data-skill="${id}">${D(T[id].n)}</button>`).join("");
  }
  panel.onclick = event => {
    const button = event.target.closest("button");
    if (!button) return;
    try {
      if (button.dataset.faction) switchFaction(button.dataset.faction);
      else if (button.dataset.skill) selectSkill(button.dataset.skill);
      else if (button.hasAttribute("data-spawn")) {
        const [id, rarity] = panel.querySelector("#arena-monster").value.split(":");
        if (!id) throw new Error("Không có quái phù hợp với bộ lọc.");
        spawnMonsters(id, panel.querySelector("#arena-count").value, panel.querySelector("#arena-still").checked, panel.querySelector("#arena-level").value, rarity, panel.querySelector("#arena-health").value);
      }
      else if (button.hasAttribute("data-clear")) clearCombat();
    } catch (error) { k(error.message); }
  };
  function updateMonsterFilter() {
    options.level = panel.querySelector("#arena-level").value || null;
    options.rarity = panel.querySelector("#arena-rarity").value || "all";
    const select = panel.querySelector("#arena-monster");
    const previous = select.value || `${options.monster}:${options.monsterRarity}`;
    const entries = filterMonsters(options.level, options.rarity, panel.querySelector("#arena-filter").value);
    select.innerHTML = entries.length ? entries.map(entry => {
      const value = `${entry.id}:${entry.rarity}`;
      const ranges = entry.ranges.length ? entry.ranges.map(([lo, hi]) => lo === hi ? lo : `${lo}–${hi}`).join(", ") : "chưa có cấp";
      return `<option value="${value}" ${value === previous ? "selected" : ""}>${entry.id} · ${D(entry.name)} · ${rarityNames[entry.rarity]} · Cấp ${ranges}</option>`;
    }).join("") : '<option value="">Không có quái phù hợp</option>';
    if (entries.length && !entries.some(entry => `${entry.id}:${entry.rarity}` === previous)) select.value = `${entries[0].id}:${entries[0].rarity}`;
    const selectedEntry = entries.find(entry => `${entry.id}:${entry.rarity}` === select.value) || entries[0];
    if (selectedEntry) { options.monster = selectedEntry.id; options.monsterRarity = selectedEntry.rarity; }
    panel.querySelector("[data-spawn]").disabled = !entries.length;
    localStorage.setItem(optionsKey, JSON.stringify(options));
  }
  panel.querySelector("#arena-rarity").value = options.rarity;
  const hpLabel = document.createElement("label");
  hpLabel.innerHTML = `<input id="arena-show-health" type="checkbox" ${options.showHealth ? "checked" : ""}> Hiển thị HP cạnh tên quái`;
  panel.appendChild(hpLabel);
  panel.querySelector("#arena-show-health").onchange = event => {
    options.showHealth = event.target.checked;
    localStorage.setItem(optionsKey, JSON.stringify(options));
  };
  const damageLabel = document.createElement("label");
  damageLabel.innerHTML = `<input id="arena-one-damage" type="checkbox" ${options.oneDamage ? "checked" : ""}> Quái gây đúng 1 máu (bỏ chọn: sát thương gốc)</label>`;
  panel.appendChild(damageLabel);
  panel.querySelector("#arena-one-damage").onchange = event => setOneDamage(event.target.checked);
  panel.querySelector("#arena-level").value = options.level || "";
  panel.querySelector("#arena-filter").oninput = updateMonsterFilter;
  panel.querySelector("#arena-level").oninput = updateMonsterFilter;
  panel.querySelector("#arena-rarity").onchange = updateMonsterFilter;
  panel.querySelector("#arena-monster").onchange = () => {
    const [id, rarity] = panel.querySelector("#arena-monster").value.split(":");
    if (id) { options.monster = +id; options.monsterRarity = rarity; localStorage.setItem(optionsKey, JSON.stringify(options)); }
  };
  updateMonsterFilter();
  document.body.appendChild(panel);
  let selected;
  try { selected = localStorage.getItem(selectionKey); } catch {}
  switchFaction(profiles[selected] ? selected : factions[0].key);
  return { switchFaction, selectSkill, spawnMonsters, clearCombat, createProfile, filterMonsters, tick, healthLabel, setOneDamage, nearestTarget, get oneDamage() { return options.oneDamage; } };
})();
