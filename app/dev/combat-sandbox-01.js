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
  let options = { monster: 0, count: 3, stationary: false };
  try { stored = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  try { Object.assign(options, JSON.parse(localStorage.getItem(optionsKey) || "{}")); } catch {}
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
    }
  };
  // Keep the real movement, obstacle, projectile and collision simulation.
  window.NO_FIELD = true;
  o8 = function () {};
  cD = function () {};
  lD = function () {};
  rD = function () { l.stall = 0; };
  const originalDamage = U9;
  U9 = function (attacker) {
    if (!attacker.arenaMonster) return originalDamage(attacker);
    l.life = Math.max(0, l.life - 1);
    l.hurtT = 0.15;
    $A(v.x, v.y - 30, "1", "#ffab8a", 11);
  };
  function clearCombat() {
    for (const field of ["enemies", "corpses", "ground", "fx", "fxQ", "combatProjectiles", "traps", "allies"]) l[field] = [];
    for (const field of ["manTgt", "tgt", "moveTo", "pickTarget", "clickedTarget", "dash", "dashTrail"]) l[field] = null;
    for (const field of ["atkT", "deadT", "stunT", "slowT", "hpDotT", "hpDot", "hurtT", "stall", "spawnT"]) l[field] = 0;
    l.skCd = {}; l.clickHold = false; Y.target = null; Y.active = false; Y.keys = {};
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
    clearCombat();
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
    spawnMonsters(options.monster, options.count, options.stationary);
  }
  function spawnMonsters(id, count, stationary) {
    if (!r0[id]) throw new Error("Quái không hợp lệ.");
    count = Math.max(1, Math.min(20, Math.floor(+count) || 1));
    options = { monster: +id, count, stationary: !!stationary };
    localStorage.setItem(optionsKey, JSON.stringify(options));
    clearCombat();
    l.town = false;
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count;
      const [x, y] = X0(v.x + Math.cos(angle) * 160, v.y + Math.sin(angle) * 100);
      const monster = n1(+id, 150, "normal", x, y);
      Object.assign(monster, { hp: 100_000, max: 100_000, dmg: 1, arenaMonster: true, spd: stationary ? 0 : monster.spd });
      l.enemies.push(monster);
    }
    l.life = l.P.life; l.mana = l.P.mana;
    refreshPanel();
  }
  const panel = document.createElement("details");
  panel.id = "combat-sandbox"; panel.open = true;
  const style = document.createElement("style");
  style.textContent = `#combat-sandbox{position:fixed;top:50px;left:8px;z-index:89990;width:min(400px,calc(100vw - 16px));max-height:calc(100dvh - 70px);overflow:auto;background:#17201bee;color:#efdfb0;border:1px solid #9f8c51;padding:10px;font:13px inherit}#combat-sandbox summary{cursor:pointer;font-weight:bold;padding-bottom:8px}#combat-sandbox .arena-factions{display:grid;grid-template-columns:1fr 1fr;gap:4px}#combat-sandbox button{cursor:pointer;background:#34462c;color:#f4e7ba;border:1px solid #78825a;padding:6px}#combat-sandbox button.on{background:#806529;border-color:#f2d17b}#combat-sandbox .arena-skills{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}#combat-sandbox input,#combat-sandbox select{max-width:100%;background:#101a14;color:#efdfb0;border:1px solid #78825a;padding:5px}#combat-sandbox label{display:block;margin:7px 0}#arena-info{margin:6px 0;color:#cdd1bc}`;
  document.head.appendChild(style);
  const monsterOptions = Object.entries(r0).filter(([, info]) => info && info.n);
  if (!r0[options.monster]) options.monster = +monsterOptions[0][0];
  panel.innerHTML = `<summary>Phòng test · 10 môn phái</summary><div class="arena-factions">${factions.map(faction => `<button type="button" data-faction="${faction.key}">${D(faction.n)}</button>`).join("")}</div><p id="arena-info"></p><div class="arena-skills"></div><label>Lọc quái <input id="arena-filter" placeholder="Tên hoặc ID quái"></label><label>Quái <select id="arena-monster">${monsterOptions.map(([id, info]) => `<option value="${id}" ${+id === +options.monster ? "selected" : ""}>${id} · ${D(info.n)}</option>`).join("")}</select></label><label>Số lượng <input id="arena-count" type="number" min="1" max="20" value="${options.count}" style="width:65px"></label><label><input id="arena-still" type="checkbox" ${options.stationary ? "checked" : ""}> Quái đứng yên</label><button type="button" data-spawn>Tạo lại quái · 100k HP / 1 sát thương</button> <button type="button" data-clear>Xóa quái</button>`;
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
      else if (button.hasAttribute("data-spawn")) spawnMonsters(panel.querySelector("#arena-monster").value, panel.querySelector("#arena-count").value, panel.querySelector("#arena-still").checked);
      else if (button.hasAttribute("data-clear")) clearCombat();
    } catch (error) { k(error.message); }
  };
  panel.querySelector("#arena-filter").oninput = event => {
    const text = event.target.value.toLocaleLowerCase("vi");
    for (const option of panel.querySelector("#arena-monster").options) option.hidden = !option.textContent.toLocaleLowerCase("vi").includes(text);
  };
  document.body.appendChild(panel);
  let selected;
  try { selected = localStorage.getItem(selectionKey); } catch {}
  switchFaction(profiles[selected] ? selected : factions[0].key);
  return { switchFaction, selectSkill, spawnMonsters, clearCombat, createProfile };
})();
