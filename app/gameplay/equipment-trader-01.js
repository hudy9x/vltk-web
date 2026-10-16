// Reusable equipment NPC. place() returns a handle with remove(); open() also
// works from a town menu, quest or any other interaction in the shared IIFE.
var equipmentTrader = (function () {
  const slots = [[2, "Áo"], [7, "Mũ"], [4, "Dây chuyền"], [8, "Bao tay"], [3, "Nhẫn"], [9, "Ngọc bội"], [6, "Thắt lưng"], [5, "Giày"]];
  const placements = [];
  const requirement = (item, kind) => (item.req.find(row => row[0] === kind) || [kind, -1])[1];
  const copy = value => JSON.parse(JSON.stringify(value));
  function blueCatalog(sex) {
    if (sex !== 0 && sex !== 1) throw new Error("Giới tính không hợp lệ.");
    return slots.flatMap(([d]) => (S.items[d]?.list || [])
      .filter(item => item.lvl === 10 && (requirement(item, 38) < 0 || requirement(item, 38) === sex))
      .map(item => ({ ...item, d, key: `${d}:${item.k}` })));
  }
  function goldCatalog(faction) {
    if (!I[faction] || I[faction].novice) return [];
    const groups = new Map();
    for (const template of S.sets.gold) {
      if (requirement(template, 39) !== I[faction].id || !cA(template)) continue;
      if (!groups.has(template.grp)) groups.set(template.grp, []);
      const items = groups.get(template.grp);
      if (!items.some(item => item.sid === template.sid)) items.push(template);
    }
    return Array.from(groups, ([key, items]) => {
      const words = items.map(item => K1(item.n).split(/\s+/));
      let count = 0;
      while (words.every(parts => parts[count] && parts[count] === words[0][count])) count++;
      return { key: String(key), n: words[0].slice(0, Math.max(2, count)).join(" "), items };
    });
  }
  // Follow the blue drop table, including its alternating visible/hidden lines.
  // One highest-tier entry per attribute; never offer purple-only attributes.
  function affixes(item, series, index) {
    const result = new Map();
    for (const entry of S.affix) {
      if (entry.pre !== (index % 2 === 0 ? 1 : 0) || entry.lvl > 10 ||
          !(entry.w[item.d] > 0) || (entry.s >= 0 && entry.s !== series)) continue;
      if (!result.has(entry.a) || result.get(entry.a).lvl < entry.lvl) result.set(entry.a, entry);
    }
    return [...result.values()];
  }
  function highRoll(ranges, random = Math.random) {
    return ranges.map(([a, b]) => {
      if (a === b) return a; // Preserve fixed skill IDs, durations and -1 sentinels.
      const max = Math.max(a, b), min = Math.max(Math.min(a, b), Math.ceil(max * 0.9));
      return min + Math.floor(random() * (max - min + 1));
    });
  }
  function blueSelection(selection) {
    if (!Number.isInteger(selection.series) || selection.series < 0 || selection.series > 4) throw new Error("Hệ không hợp lệ.");
    const template = blueCatalog(selection.sex).find(item => item.key === selection.item);
    if (!template) throw new Error("Hãy chọn trang bị cấp 10 hợp lệ.");
    if (!Array.isArray(selection.lines) || !selection.lines.length || selection.lines.length > 6) throw new Error("Hãy chọn từ 1 đến 6 dòng thuộc tính.");
    const used = new Set();
    const lines = selection.lines.map((id, index) => {
      const entry = affixes(template, selection.series, index).find(entry => entry.a === id);
      if (!entry || used.has(id)) throw new Error("Dòng thuộc tính không hợp lệ hoặc bị trùng.");
      used.add(id);
      return entry;
    });
    return { template, lines };
  }
  function templatesFor(selection) {
    if (selection.kind === "blue") return [blueSelection(selection).template];
    if (selection.kind !== "gold") throw new Error("Loại giao dịch không hợp lệ.");
    const set = goldCatalog(selection.faction).find(set => set.key === selection.set);
    if (!set) throw new Error("Hãy chọn bộ Hoàng Kim môn phái hợp lệ.");
    return set.items;
  }
  function makeItem(template, selection, random) {
    const item = copy(template);
    delete item.key;
    item.lock = true;
    if (selection.kind === "blue") {
      item.s = selection.series;
      for (const row of item.req) if (row[0] === 37 && row[1] >= 0) row[1] = selection.series;
      item.r = 1;
      item.mag = blueSelection(selection).lines.map(entry => ({ a: entry.a, pre: entry.pre, n: entry.n, p: highRoll(entry.p, random) }));
    } else {
      item.r = 4;
      item.set = { kind: "gold", grp: template.grp, sid: template.sid, n1: template.n1 || 99, n2: template.n2 || 99 };
      const roll = id => {
        const entry = S.ge[id];
        if (!entry) throw new Error("Thiếu dữ liệu thuộc tính Hoàng Kim.");
        return { a: entry.a, pre: 1, p: highRoll(entry.p, random) };
      };
      item.mag = template.mag.map(roll);
      item.ext = (template.ext || []).map(roll);
    }
    return item;
  }
  function preview(selection) {
    // Deterministic max preview does not consume random values or character UIDs.
    return templatesFor(selection).map(template => makeItem(template, selection, () => 0.999999999));
  }
  function trade(selection) {
    if (!o || !o.fac) throw new Error("Hãy vào game với một nhân vật trước.");
    const templates = templatesFor(selection);
    if (o.inv.length + templates.length > INV_MAX) throw new Error(`Cần ${templates.length} ô trống trong Hành trang để nhận ${selection.kind === "gold" ? "trọn bộ" : "trang bị"}.`);
    // Validate and generate everything before changing inventory or the UID counter.
    const items = templates.map(template => makeItem(template, selection, Math.random));
    for (const item of items) item.uid = o.uid++;
    o.inv.push(...items);
    R = true; l.dirty = true; $(); V();
    return items;
  }
  function open() {
    if (!o || !o.fac) return k("Hãy vào game với một nhân vật trước.");
    const selection = { kind: "blue", sex: o.sex || 0, series: F0(), item: "", lines: [], faction: o.fac, set: "" };
    let count = 6;
    const option = (value, label, selected) => `<option value="${D(String(value))}"${selected ? " selected" : ""}>${D(label)}</option>`;
    function render(message = "") {
      const catalog = blueCatalog(selection.sex);
      const template = catalog.find(item => item.key === selection.item) || catalog[0];
      selection.item = template?.key || "";
      const maxLines = Math.min(6, affixes(template, selection.series, 0).length * 2, affixes(template, selection.series, 1).length * 2 + 1);
      count = Math.min(count, maxLines);
      const used = new Set();
      selection.lines = Array.from({ length: count }, (_, index) => {
        const choices = affixes(template, selection.series, index).filter(entry => !used.has(entry.a));
        const entry = choices.find(entry => entry.a === selection.lines[index]) || choices[0];
        if (entry) used.add(entry.a);
        return entry?.a;
      });
      const sets = goldCatalog(selection.faction);
      if (!sets.some(set => set.key === selection.set)) selection.set = sets[0]?.key || "";
      let items = [], error = "";
      try { items = preview(selection); } catch (reason) { error = reason.message; }
      const lineFields = selection.lines.map((id, index) => `<label>Dòng ${index + 1} · ${index % 2 ? "Ẩn" : "Hiện"}<select data-trader-line="${index}">${affixes(template, selection.series, index).filter(entry => entry.a === id || !selection.lines.includes(entry.a)).map(entry => option(entry.a, Zi({ a: entry.a, p: highRoll(entry.p, () => 0.999999999), pre: entry.pre }), entry.a === id)).join("")}</select></label>`).join("");
      J(`<section class="equipment-trader"><h3>Thần Trang Sứ Giả</h3><p class="desc">Chọn trang bị · thuộc tính ngẫu nhiên 90%–100% tối đa. Nhận miễn phí, đồ được khóa để giữ trong túi.</p><div class="btnrow"><button class="btn ${selection.kind === "blue" ? "on" : ""}" data-trader-kind="blue">Đồ xanh cấp 10</button><button class="btn ${selection.kind === "gold" ? "on" : ""}" data-trader-kind="gold">Hoàng Kim môn phái</button></div><div class="trader-layout"><div class="trader-fields">${selection.kind === "blue" ? `<label>Giới tính<select data-trader="sex">${["Nam", "Nữ"].map((name, i) => option(i, name, selection.sex === i)).join("")}</select></label><label>Trang bị<select data-trader="item">${slots.map(([d, name]) => `<optgroup label="${name}">${catalog.filter(item => item.d === d).map(item => option(item.key, item.n, item.key === selection.item)).join("")}</optgroup>`).join("")}</select></label><label>Hệ<select data-trader="series">${g0.slice(0, 5).map((name, i) => option(i, name, selection.series === i)).join("")}</select></label><label>Số dòng<select data-trader="count">${Array.from({ length: maxLines }, (_, i) => i + 1).map(i => option(i, String(i), count === i)).join("")}</select></label>${lineFields}` : `<label>Môn phái<select data-trader="faction">${Object.entries(I).filter(([, faction]) => !faction.novice && faction.skills?.length).map(([key, faction]) => option(key, faction.n, key === selection.faction)).join("")}</select></label><label>Bộ Hoàng Kim<select data-trader="set">${sets.map(set => option(set.key, `${set.n} · ${set.items.length} món`, set.key === selection.set)).join("")}</select></label><p>Nhận toàn bộ ${items.length} món của bộ đã chọn, gồm cả các dòng ẩn của bộ.</p>`}</div><div><h4>${selection.kind === "gold" ? "Xem trước trọn bộ" : "Xem trước trang bị"}</h4><p class="dim small">Ảnh và chỉ số tối đa để tham khảo; khi nhận mỗi dòng sẽ roll 90%–100%.</p><div class="trader-preview">${items.map((item, index) => `<button class="trader-piece" data-trader-inspect="${index}" title="Xem thuộc tính ${D(item.n)}"><img src="${D(item.ic)}" alt="${D(item.n)}"><span>${D(item.n)}</span></button>`).join("")}</div><div class="trader-details">${items[0] ? details(items[0]) : ""}</div></div></div><p role="status">${D(message || error || `Hành trang: ${o.inv.length}/${INV_MAX} ô · Cần ${items.length} ô trống.`)}</p><button class="btn" data-trader-receive ${error || !items.length || o.inv.length + items.length > INV_MAX ? "disabled" : ""}>${selection.kind === "gold" ? `Nhận trọn bộ · ${items.length} món` : "Nhận trang bị"}</button></section>`, () => {
        const root = m("#mBody .equipment-trader");
        root.onchange = event => {
          const field = event.target.dataset.trader;
          const index = event.target.dataset.traderLine;
          if (index !== undefined) selection.lines[+index] = +event.target.value;
          else if (field === "count") count = +event.target.value;
          else if (field) selection[field] = ["sex", "series"].includes(field) ? +event.target.value : event.target.value;
          render();
        };
        root.onclick = event => {
          const button = event.target.closest("button");
          if (!button) return;
          if (button.dataset.traderKind) { selection.kind = button.dataset.traderKind; render(); }
          else if (button.dataset.traderInspect !== undefined) root.querySelector(".trader-details").innerHTML = details(items[+button.dataset.traderInspect]);
          else if (button.hasAttribute("data-trader-receive")) {
            try { const received = trade(selection); render(`Đã nhận ${received.length} món vào Hành trang.`); }
            catch (reason) { render(reason.message); }
          }
        };
      });
    }
    function details(item) {
      return `<b style="color:${item.set ? "#f4cd68" : "#73d6ff"}">${D(item.n)}</b><p>Cấp ${item.lvl} · Hệ ${D(g0[item.s])}</p>${item.mag.map((line, i) => `<div>${i + 1}. ${D(Zi(line))}</div>`).join("")}${(item.ext || []).map(line => `<div class="dim">Dòng bộ: ${D(Zi(line))}</div>`).join("")}`;
    }
    render();
  }
  function place({ x, y, visible = () => true, name = "Thần Trang Sứ Giả" }) {
    const npc = { x, y, name, visible, equipmentTrader: true, remove() { const index = placements.indexOf(npc); if (index >= 0) placements.splice(index, 1); } };
    placements.push(npc);
    return npc;
  }
  function entities() { return placements.filter(npc => o?.fac && npc.visible()); }
  function draw(context, npc) {
    context.save();
    context.fillStyle = "#0007"; context.beginPath(); context.ellipse(npc.x, npc.y, 18, 7, 0, 0, 7); context.fill();
    const look = Jt("wudang", 0);
    if (!look?.anim || !kf(look.anim, "st", 0, l.clock || 0, npc.x, npc.y, Jn)) M8(bA(look?.img || "img/pl/wudang.png"), look?.sz, npc.x, npc.y, 0.9, false);
    context.font = '12px "IBM Plex Mono", monospace'; context.textAlign = "center";
    context.strokeStyle = "#000"; context.lineWidth = 3; context.fillStyle = "#f6d27c";
    const top = npc.y - 105;
    context.strokeText(npc.name, npc.x, top); context.fillText(npc.name, npc.x, top);
    context.font = '10px "IBM Plex Mono", monospace';
    context.strokeText("Giao dịch trang bị", npc.x, top - 16); context.fillText("Giao dịch trang bị", npc.x, top - 16);
    context.restore();
  }
  // Capture only NPC taps so movement, loot and combat targeting stay unchanged.
  const canvas = m("#arena");
  if (canvas) canvas.addEventListener("pointerdown", event => {
    const rect = canvas.getBoundingClientRect(), scale = $8();
    const x = (event.clientX - rect.left) / scale + B0.x, y = (event.clientY - rect.top) / scale + B0.y;
    const npc = entities().find(npc => Math.abs(x - npc.x) <= 30 && y >= npc.y - 125 && y <= npc.y + 12);
    if (!npc) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open();
  }, true);
  const style = document.createElement("style");
  style.textContent = `body:has(#modal:not(.hidden) .equipment-trader) #combat-sandbox{visibility:hidden}#modal:has(.equipment-trader){z-index:95000!important}.equipment-trader .trader-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin:14px 0}.equipment-trader label{display:block;margin:0 0 10px}.equipment-trader select{display:block;width:100%;margin-top:4px;background:#1b211b;color:#eddfba;border:1px solid #807653;padding:6px;font:inherit}.equipment-trader .trader-preview{display:grid;grid-template-columns:repeat(auto-fit,minmax(85px,1fr));gap:6px}.equipment-trader .trader-piece{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 5px;background:#172019;color:#ebd49b;border:1px solid #6b654b;font:inherit;font-size:11px;cursor:pointer}.equipment-trader .trader-piece img{width:44px;height:44px;object-fit:contain;image-rendering:pixelated}.equipment-trader .trader-details{margin-top:12px;line-height:1.6;font-size:12px}.equipment-trader .on{border-color:#f3cd73}.equipment-trader h4{margin:0 0 6px}@media(max-width:540px){.equipment-trader .trader-layout{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
  if (typeof combatSandbox !== "undefined" && combatSandbox) {
    place({ x: O0.w / 2 - 130, y: O0.h / 2 + 50, visible: () => !l.town && !l.dg && !l.tower });
    const button = document.createElement("button");
    button.type = "button"; button.textContent = "Thần Trang Sứ Giả · Đồ xanh / HKMP";
    button.onclick = open;
    m("#combat-sandbox")?.appendChild(button);
  }
  return { open, trade, preview, blueCatalog, goldCatalog, affixes, highRoll, place, entities, draw };
})();
