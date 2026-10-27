// Small adapter into the legacy game IIFE. No remote actor can be selected or attacked.
var gameMultiplayer = (() => {
  const factions = Object.keys(I);
  let statusButton = null, previous = null, nextAppearance = 0, appearance = null, movedAt = -Infinity, direction = 0;
  const client = GameWebTransport.createClient({ status(text, online) {
    if (!text) { statusButton?.remove(); statusButton = null; return; }
    const battle = document.getElementById("battle");
    if (!battle) return;
    if (!statusButton) {
      statusButton = document.createElement("button");
      statusButton.id = "multiplayerStatus";
      statusButton.style.cssText = "position:absolute;right:8px;top:48px;z-index:6;font-size:10px;max-width:260px;background:#16251e;color:#c8edd6;padding:5px 8px;border:1px solid #43644f;border-radius:4px";
      statusButton.onclick = () => client.retry();
      battle.appendChild(statusButton);
    }
    statusButton.textContent = text;
    statusButton.dataset.online = String(online);
    statusButton.title = "Đồng bộ người chơi cùng bản đồ. Bấm để kết nối lại.";
  }});
  window.addEventListener("pagehide", () => client.close());
  return {
    get active() { return client.active; },
    tick() {
      if (!o?.fac || !Z0.key || window.localGameConfig?.combatSandbox) return;
      const now = performance.now();
      if (!appearance || now >= nextAppearance) {
        const j = l.jx, rows = j?.rows || {};
        appearance = { name: String(o.name || "Người chơi"), faction: Math.max(0, factions.indexOf(o.fac)), sex: o.sex ? 1 : 0,
          bodySex: j?.sx === "f" ? 1 : 0, ride: o.eq?.horse ? 1 : 0,
          helm: rows.helm ?? -1, armor: rows.armor ?? -1, weapon: rows.weapon ?? 0,
          horse: o.eq?.horse ? (rows.horse ?? -1) : -1 };
        nextAppearance = now + 1000;
      }
      const map = typeof Z0.key === "number" ? Z0.key : E0.town.id;
      const dx = previous?.map === map ? v.x - previous.x : 0;
      const dy = previous?.map === map ? v.y - previous.y : 0;
      if (Math.hypot(dx, dy) > 0.001) { movedAt = now; direction = kn(dx,dy); }
      client.update({ map, x: v.x, y: v.y, dir: direction, moving: now - movedAt < 120 }, appearance);
      if (client.active && o.ctrl !== "manual") Wa("manual", true);
      previous = { map, x: v.x, y: v.y };
    },
    entities() { return client.players().map(player => ({ remotePlayer: player, x: player.x, y: player.y })); },
    draw(ctx, entity) {
      const p = entity.remotePlayer, look = p.appearance;
      const actor = { n: look.name, f: factions[look.faction] || factions[0], s: look.sex, x: p.x, y: p.y,
        dir: p.dir, mv: p.moving, t: p.animationTime, hp: 1, hpMax: 1,
        J: look.armor >= 0 ? lB({ sx: look.bodySex ? "f" : "m", ride: look.ride,
          r: { helm: look.helm, armor: look.armor, weapon: look.weapon, horse: look.horse } }) : null };
      uB(ctx, actor, 0);
    },
  };
})();
