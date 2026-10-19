// Session-only combat diagnostics for the currently controlled character.
var combatLog = (function () {
  const limit = 300;
  const timeFormat = new Intl.DateTimeFormat("vi-VN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
  const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
  let lastSecond = -1, timeText = "";
  let owner = null, revision = 0;
  let events = [], sequence = 0;
  let simulatorLog = null;
  const targetIds = new WeakMap();
  let nextTargetId = 0;
  function ensureOwner() {
    const current = o && o.fac ? `${m0}|${o.arenaFaction || o.netOwner || "local"}|${o.name}` : null;
    if (current !== owner) { owner = current; events = []; sequence = 0; revision++; }
  }
  function record(type, target, amount, detail = "", outcome = "hit") {
    if (l.sim) return;
    ensureOwner();
    if (!owner || l.quiet || !["out", "in"].includes(type) || !(amount > 0 || amount === 0 && outcome === "miss") || !Number.isFinite(amount)) return;
    const now = Date.now(), second = Math.floor(now / 1000);
    if (second !== lastSecond) { lastSecond = second; const parts = timeFormat.formatToParts(new Date(now)); timeText = `${parts.find(part => part.type === "hour").value}:${parts.find(part => part.type === "second").value}`; }
    if (target && typeof target === "object" && !targetIds.has(target)) targetIds.set(target, ++nextTargetId);
    const targetKey = target && typeof target === "object" ? `entity:${targetIds.get(target)}` : `name:${target}`;
    events.push({ sequence: ++sequence, outcome, type, target: typeof target === "string" ? target : target && target.n || "Quái", targetKey, amount, detail, time: timeText, timestamp: now });
    if (events.length > limit) events.splice(0, events.length - limit);
    revision++;
  }
  function lost(before, after) { return Math.max(0, Math.min(Math.max(0, before), before - after)); }
  const originalHit = hs;
  hs = function (skill, target) {
    const before = target.hp;
    const result = originalHit(skill, target);
    record("out", target, lost(before, target.hp), skill.id && T[skill.id] ? T[skill.id].n : "Tấn công");
    return result;
  };
  const originalIncoming = U9;
  U9 = function (attacker) {
    const before = l.life, enemyBefore = attacker.hp;
    const result = originalIncoming(attacker);
    record("in", attacker, lost(before, l.life), "Đòn đánh");
    record("out", attacker, lost(enemyBefore, attacker.hp), "Phản đòn");
    return result;
  };
  const originalMonsterTick = $d;
  $d = function (monster, dt) {
    const before = monster.hp;
    const result = originalMonsterTick(monster, dt);
    record("out", monster, lost(before, monster.hp), "Hiệu ứng duy trì");
    return result;
  };
  function entries(filter = "both") {
    ensureOwner();
    return events.filter(event => filter === "both" || event.type === filter).map(event => Object.assign({}, event));
  }
  function currentFilter() {
    return o && ["out", "in", ...(simulatorLog ? ["formula", "sim"] : [])].includes(o.combatLogFilter) ? o.combatLogFilter : "both";
  }
  // Presentation only: preserve every raw event and its actual HP loss in entries().
  // Object identity prevents two monsters with the same name from sharing a total.
  function displayEntries(filter) {
    const groups = [], latest = new Map();
    for (const event of entries(filter)) {
      const key = JSON.stringify([event.type, event.targetKey, event.outcome, event.detail]);
      const group = latest.get(key);
      if (group && event.timestamp - group.timestamp <= 120) {
        group.amount += event.amount;
        group.hits++;
      } else {
        const row = { ...event, hits: 1 };
        groups.push(row); latest.set(key, row);
      }
    }
    return groups;
  }
  function direction(event) {
    return event.type === "out" ? "→ Gây" : "← Nhận";
  }
  function line(event) {
    return `${String(event.sequence).padStart(3, "0")} - ${event.time} ${event.outcome === "miss" ? (event.type === "out" ? "→" : "←") : direction(event)} ${event.outcome === "miss" ? "Trượt ⚔️" : `${numberFormat.format(event.amount)} ⚔️`}${event.hits > 1 ? ` ×${event.hits}` : ""} ${event.type === "out" ? "lên" : "từ"} ${event.target}`;
  }
  function text(filter = currentFilter()) {
    if (simulatorLog && ["formula", "sim"].includes(filter)) return simulatorLog.text(filter === "sim");
    return displayEntries(filter).map(line).join("\n");
  }
  function clear() {
    ensureOwner(); events = []; sequence = 0; revision++;
  }
  function render(container) {
    const filter = currentFilter();
    // Keep controls mounted: replacing the select closes its native popup during combat.
    if (!container.querySelector(".combat-log-rows") || container._simulatorLogProvider !== simulatorLog) {
      container._simulatorLogProvider = simulatorLog;
      container.innerHTML = `<div class="combat-log-filter"><label>Hiển thị <select id="combat-log-filter"><option value="both">Cả hai</option><option value="out">Gây sát thương</option><option value="in">Nhận sát thương</option>${simulatorLog ? '<option value="formula">Log công thức</option><option value="sim">Log của SIM</option>' : ""}</select></label>${simulatorLog ? '<label class="sim-log-options"><input id="sim-log-enabled" type="checkbox"> Ghi log công thức</label>' : ""}<button id="combat-log-clear" type="button">Xóa log</button><button id="combat-log-copy" type="button">Copy log</button><span class="combat-log-status" role="status"></span></div><div class="combat-log-rows"></div>`;
      container.querySelector("#combat-log-filter").onchange = event => {
        o.combatLogFilter = ["out", "in", ...(simulatorLog ? ["formula", "sim"] : [])].includes(event.target.value) ? event.target.value : "both";
        $(); T2();
      };
      container.querySelector("#combat-log-clear").onclick = () => {
        if (simulatorLog && ["formula", "sim"].includes(currentFilter())) simulatorLog.clear(currentFilter() === "sim");
        else clear();
        T2();
        container.querySelector(".combat-log-status").textContent = "Đã xóa log";
      };
      container.querySelector("#combat-log-copy").onclick = async () => {
        const contents = text();
        const status = container.querySelector(".combat-log-status");
        if (!contents) { status.textContent = "Chưa có log để copy"; return; }
        try {
          await navigator.clipboard.writeText(contents);
          status.textContent = "Đã copy log";
        } catch (error) {
          status.textContent = "Không thể copy tự động. Nhấn Ctrl/Cmd+C để copy log đã chọn.";
          if (typeof document === "undefined") return;
          const fallback = document.createElement("textarea");
          fallback.value = contents; fallback.readOnly = true;
          fallback.setAttribute("aria-label", "Log để copy");
          status.appendChild(fallback); fallback.focus(); fallback.select();
        }
      };
    }
    const select = container.querySelector("#combat-log-filter");
    if (select.value !== filter) select.value = filter;
    const formulas = simulatorLog && ["formula", "sim"].includes(filter);
    const options = container.querySelector(".sim-log-options");
    if (options) options.hidden = !formulas;
    const enabled = container.querySelector("#sim-log-enabled");
    if (enabled && simulatorLog) {
      enabled.checked = simulatorLog.enabled;
      enabled.onchange = event => { simulatorLog.enabled = event.target.checked; T2(); };
    }
    if (formulas) { simulatorLog.render(container.querySelector(".combat-log-rows"), filter === "sim"); return; }
    const rows = displayEntries(filter).slice(-100);
    container.querySelector(".combat-log-rows").innerHTML = rows.length ? rows.map(event => `<div class="cl combat-${event.type}"><i>${String(event.sequence).padStart(3, "0")} - ${D(event.time)}</i> ${event.outcome === "miss" ? (event.type === "out" ? "→" : "←") : direction(event)} <b>${event.outcome === "miss" ? "Trượt" : numberFormat.format(event.amount)}</b> ⚔️${event.hits > 1 ? ` ×${event.hits}` : ""} ${event.type === "out" ? "lên" : "từ"} ${D(event.target)}</div>`).join("") : '<div class="combat-empty">Chưa có sát thương phù hợp với bộ lọc.</div>';
  }
  return { registerSimulatorLog(provider) { simulatorLog = provider; revision++; }, get simulatorLog() { return simulatorLog; }, record, miss: (type, target) => record(type, target, 0, "", "miss"), entries, render, clear, text, get revision() { ensureOwner(); return revision + (simulatorLog ? simulatorLog.revision : 0); } };
})();
