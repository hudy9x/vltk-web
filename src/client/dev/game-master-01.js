// GameMaster tools. Appended after the original game initialization.
var gameMaster = (function () {
  const prefix = "gm_hk_";
  const saveAndRefresh = () => {
    R = true;
    l.dirty = true;
    $();
    V();
  };
  // Keep earned chests usable after restarting without development mode.
  for (const [faction, info] of Object.entries(I)) {
    J0.push({
      k: prefix + faction,
      n: "Rương Hoàng Kim môn phái · " + info.n,
      ic: "img/ep/box2.png",
      hide: 1,
      d: "Mở nhận 1 trang bị Hoàng Kim của " + info.n + ". Phái được giữ theo lúc nhận rương.",
    });
  }
  const originalUse = c6;
  c6 = function (chest) {
    const key = chest && chest.ktc && chest.ktc.k;
    if (!key || !key.startsWith(prefix)) return originalUse(chest);
    if (!o.inv.includes(chest) || !(chest.ktc.c > 0)) return false;
    if (chest.ktc.c > 1 && o.inv.length >= INV_MAX) {
      k("Hành trang đầy. Cần 1 ô trống để mở rương.");
      return false;
    }
    const faction = I[key.slice(prefix.length)];
    if (!faction) return false;
    const candidates = S.sets.gold.filter(
      (item) =>
        item.req.some(([kind, value]) => kind === 39 && value === faction.id) &&
        k1(item.req) &&
        cA(item),
    );
    const nearLevel = candidates.filter(
      (item) =>
        (item.req.find(([kind]) => kind === 36) || [36, 0])[1] <= o.lvl + 15 && c3(item, o.lvl),
    );
    const pool = nearLevel.length ? nearLevel : candidates;
    if (!pool.length) {
      k("Chưa có trang bị Hoàng Kim phù hợp của môn phái này.");
      return false;
    }
    const item = Ta("gold", C0(pool), 5);
    if (!item) return false;
    item.lock = true;
    chest.ktc.c--;
    if (!chest.ktc.c) o.inv.splice(o.inv.indexOf(chest), 1);
    else
      chest.n = se(
        J0.find((entry) => entry.k === key),
        chest.ktc.c,
      );
    o.inv.push(item);
    C("GM: mở rương nhận " + D(item.n));
    saveAndRefresh();
    return true;
  };
  const development = !!window.localGameConfig?.development;

  let showSkillRange = false;
  let showDamageAreas = false;
  function drawSkillRange(context) {
    if (showDamageAreas) CombatEngine.drawSkillDamageAreas(context);
    if (!showSkillRange || !o || !o.fac || !l.P || !l.P.main) return;
    const skill = l.P.main;
    const reach = skill.geo && skill.geo.k === "self" ? skill.geo.r || skill.rad : skill.rad;
    if (!(reach > 0) || !Number.isFinite(reach)) return;
    // Use the same ellipse as the skill cast-distance check.
    const radius = reach * QA;
    context.save();
    context.globalAlpha = 1;
    context.lineWidth = 2;
    context.strokeStyle = "#70e8ff";
    context.fillStyle = "rgba(112,232,255,0.07)";
    context.setLineDash([8, 5]);
    context.beginPath();
    context.ellipse(v.x, v.y, radius, radius * SKILL_RANGE_Y_RATIO, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  const amounts = { gold: 1_000_000_000_000, knb: 100_000, xp: 100_000_000, chest: 100, level150: 150, learn90: 1, max90: 1, potential: 3000 };
  function grant(action) {
    if (!o || !o.fac) throw new Error("Hãy vào game với một nhân vật trước.");
    if (!(action in amounts)) throw new Error("Lệnh GM không hợp lệ.");
    if (!development && (action === "potential" || action === "chest"))
      throw new Error("Lệnh GM này chỉ dùng trong môi trường development.");
    if (action === "level150") {
      if (o.lvl >= 150) return "Nhân vật đã đạt cấp 150 trở lên.";
      if (G2() < 150) throw new Error("Giới hạn cấp hiện tại chưa cho phép lên cấp 150.");
      const levels = 150 - o.lvl;
      o.lvl = 150;
      o.xp = 0;
      o.attrPts = (o.attrPts || 0) + levels * z2;
      o.skPts = (o.skPts || 0) + levels * x5;
      saveAndRefresh();
      return "Đã lên cấp 150 và nhận điểm tiềm năng, kỹ năng tương ứng.";
    }
    if (action === "learn90" || action === "max90") {
      const faction = I[o.fac];
      if (!faction || !faction.skills) throw new Error("Hãy gia nhập môn phái trước.");
      const skills = [...new Set(faction.skills.map(Number))].map(id => T[id]).filter(skill => skill && skill.tier === 90);
      if (!skills.length) throw new Error("Môn phái này không có chiêu cấp 90.");
      const eligible = action === "learn90" ? skills : skills.filter(skill => (o.sk[skill.id] || 0) > 0);
      if (!eligible.length) throw new Error("Hãy học chiêu cấp 90 trước khi nâng tối đa.");
      if (eligible.some(skill => !W2(skill))) throw new Error("Chưa đủ cấp học chiêu 90. Hãy dùng nút lên cấp 150 trước.");
      o.bkOk || (o.bkOk = {});
      const mastery = va();
      for (const skill of eligible) {
        const level = action === "max90" ? skill.max : Math.max(1, o.sk[skill.id] || 0, mastery[skill.id]?.lv || 0);
        o.bkOk[skill.id] = 1;
        o.sk[skill.id] = level;
        mastery[skill.id] = { lv: level, xp: action === "max90" ? 0 : mastery[skill.id]?.xp || 0 };
      }
      saveAndRefresh();
      return (action === "learn90" ? "Đã học: " : "Đã nâng tối đa: ") + eligible.map(skill => skill.n).join(" · ") + ".";
    }
    if (action === "potential") {
      const next = (o.attrPts || 0) + amounts.potential;
      if (!Number.isSafeInteger(next)) throw new Error("Điểm tiềm năng vượt giới hạn số nguyên an toàn.");
      o.attrPts = next;
      saveAndRefresh();
      return "Đã thêm 3.000 điểm tiềm năng chưa phân bổ.";
    }
    if (action === "gold" || action === "knb") {
      const next = (o[action] || 0) + amounts[action];
      if (!Number.isSafeInteger(next)) throw new Error("Số dư vượt giới hạn số nguyên an toàn.");
      o[action] = next;
    } else if (action === "xp") {
      if (o.lvl >= G2()) throw new Error("Nhân vật đã đạt giới hạn cấp hiện tại.");
      // d8 applies XP bonuses and performs level-ups. Compensate those bonuses
      // so the GM reward adds exactly 100 million XP, including XP spent leveling.
      const factor =
        ye *
        (1 + (o.tanthuXp && !(v0() > 0) ? +o.tanthuXp : 0)) *
        (1 + mo().xp + (l.P && l.P.expPct ? l.P.expPct / 100 : 0)) *
        (1 + Lt("xp")) *
        (1 + Lt("tt") + Lt("tt2"));
      if (!(factor > 0) || !Number.isFinite(factor))
        throw new Error("Hệ số kinh nghiệm không hợp lệ.");
      d8(amounts.xp / factor);
    } else {
      const key = prefix + o.fac;
      if (!I[o.fac]) throw new Error("Môn phái không hợp lệ.");
      const stack = o.inv.find((item) => item.ktc && item.ktc.k === key && item.ktc.c < Wi);
      const capacity = (stack ? Wi - stack.ktc.c : 0) + Math.max(0, INV_MAX - o.inv.length) * Wi;
      if (capacity < amounts.chest) throw new Error("Hành trang không đủ chỗ cho 100 rương.");
      if (!B4(key, amounts.chest)) throw new Error("Không thể thêm rương vào hành trang.");
    }
    saveAndRefresh();
    return (
      "Đã nhận " +
      amounts[action].toLocaleString("vi-VN") +
      " " +
      {
        gold: "lượng",
        knb: "KNB",
        xp: "điểm kinh nghiệm",
        chest: "rương Hoàng Kim môn phái",
      }[action] +
      "."
    );
  }
  const saleCursor = 'url("img/cursors/sell.png") 11 9, pointer';
  const style = document.createElement("style");
  style.textContent = `
    #gm-toggle{position:fixed;top:8px;left:8px;z-index:90000;min-width:44px;min-height:34px;padding:5px 10px;font-family:inherit;font-size:14px;cursor:pointer}
    #gm-toggle,#quick-sale-toggle,#gm-panel [data-gm]{background:linear-gradient(#5d684d,#2e3825);border:1px solid #a6ad80;color:#f3edc8;border-radius:3px;box-shadow:inset 0 1px 0 #ffffff22,0 1px 2px #000;text-shadow:0 1px 2px #000}
    #quick-sale-toggle{position:fixed;top:8px;left:60px;z-index:90000;min-height:34px;padding:5px 10px;font:inherit;font-size:14px;cursor:pointer}
    #quick-sale-toggle[aria-pressed="true"]{background:linear-gradient(#7a3a2e,#3e1a12);border-color:#c48a70;color:#ffe0d0}
    #quick-sale-toggle:hover{filter:brightness(1.2)}
    #quick-sale-toggle:focus-visible{outline:2px solid #e8c860;outline-offset:2px}
    body.quick-sale,body.quick-sale *{cursor:${saleCursor}!important}
    body.quick-sale #t-inv .invgrid .it{outline:1px solid #a0604a}
    body.quick-sale #t-inv .invgrid .it:hover{outline:2px solid #e1b45d;filter:brightness(1.2)}
    #gm-toggle:hover,#gm-panel [data-gm]:hover{filter:brightness(1.2)}
    #gm-toggle[aria-expanded="true"]{background:linear-gradient(#8a7a5a,#4e4330);border-color:#b4a77a}
    #gm-toggle:focus-visible,#gm-panel button:focus-visible{outline:2px solid #e8c860;outline-offset:2px}
    #gm-panel{position:fixed;top:50px;left:8px;z-index:90000;width:min(370px,calc(100vw - 16px));max-height:calc(100dvh - 62px);overflow:auto;box-sizing:border-box;padding:0;color:var(--w2tx,#e8e0c0);background:var(--w2bg,#1b1e17);border:1px solid var(--w2ln,#8c876a);outline:1px solid #000;border-radius:4px;box-shadow:inset 0 0 0 1px var(--w2ln2,#3c3b2e),0 4px 22px #000;font-family:inherit;font-size:14px}
    #gm-panel[hidden]{display:none}
    #gm-header{position:relative;display:flex;align-items:center;justify-content:center;min-height:42px;background:linear-gradient(#55564a,#2a2b24 55%,#1d1e19);border-bottom:1px solid #8c876a;letter-spacing:.5px;text-shadow:0 1px 2px #000}
    #gm-header span{font-size:17px;font-weight:600}
    #gm-header::before,#gm-header::after{content:'';position:absolute;top:21px;width:17%;height:1px;background:linear-gradient(90deg,transparent,#a59c78)}
    #gm-header::before{left:12px}#gm-header::after{right:45px;transform:scaleX(-1)}
    #gm-header button{position:absolute;right:7px;top:6px;width:30px;height:30px;padding:0;border-radius:50%;border:2px solid #c9c6b6;background:radial-gradient(circle at 40% 35%,#6a6a66,#1d1d1b);color:#fff;font-size:20px;line-height:24px;box-shadow:0 0 3px #000;cursor:pointer}
    #gm-content{padding:12px}
    #gm-range-label,#gm-damage-label{display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer}
    #gm-panel [data-gm]{display:block;width:100%;min-height:48px;margin:0 0 8px;padding:9px 12px;font:inherit;text-align:left;line-height:1.45;cursor:pointer}
    #gm-panel [data-gm] img{width:24px;height:24px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;margin-right:8px}
    #gm-status{margin:12px 0 0;padding-top:10px;border-top:1px solid #4e4c3c;font-size:12px;line-height:1.5;color:#c6c1a2}
  `;
  document.head.appendChild(style);
  const toggle = document.createElement("button");
  toggle.id = "gm-toggle";
  toggle.textContent = "GM";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "gm-panel");
  const panel = document.createElement("section");
  panel.id = "gm-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "GameMaster");
  panel.innerHTML = `<header id="gm-header"><span>GameMaster</span><button type="button" data-gm-close aria-label="Đóng GameMaster" title="Đóng">×</button></header>
    <div id="gm-content">
    <label id="gm-range-label"><input type="checkbox" id="gm-show-range">Hiển thị tầm tung chiêu (xanh)</label>
    <label id="gm-damage-label" title="Vùng màu cam: vùng va chạm của chiêu đang hoạt động, gồm cả SIM. Chưa cộng kích thước thân mục tiêu."><input type="checkbox" id="gm-show-damage">Hiển thị vùng sát thương (cam)</label>
    <button type="button" data-gm="level150">Tăng nhân vật lên cấp 150</button>
    <button type="button" data-gm="learn90">Học tất cả chiêu cấp 90 của môn phái</button>
    <button type="button" data-gm="max90">Nâng tối đa các chiêu cấp 90 đã học</button>
    ${development ? '<button type="button" data-gm="potential">+3.000 điểm tiềm năng</button>' : ""}
    <button type="button" data-gm="gold">+100 triệu vạn lượng (1.000 tỷ lượng)</button>
    <button type="button" data-gm="knb"><img src="img/ep/knb.png" alt="">+10 vạn Kim Nguyên Bảo</button>
    <button type="button" data-gm="xp">+100 triệu điểm kinh nghiệm</button>
    ${development ? '<button type="button" data-gm="chest"><img src="img/ep/box2.png" alt="">+100 rương Hoàng Kim môn phái hiện tại</button>' : ""}
    <p id="gm-status" role="status" aria-live="polite">Phần thưởng được lưu vào save hiện tại.</p></div>`;
  toggle.onclick = () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  };
  panel.onchange = (event) => {
    if (event.target.id === "gm-show-range") showSkillRange = event.target.checked;
    if (event.target.id === "gm-show-damage") showDamageAreas = event.target.checked;
  };
  panel.onclick = (event) => {
    if (event.target.closest("[data-gm-close]")) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
      return;
    }
    const button = event.target.closest("[data-gm]");
    if (!button) return;
    const status = panel.querySelector("#gm-status");
    try {
      status.textContent = grant(button.dataset.gm);
    } catch (error) {
      status.textContent = error.message;
    }
  };
  if (typeof developerTools === "undefined") document.body.appendChild(toggle);
  document.body.appendChild(panel);
  const quickSaleButton = document.createElement("button");
  quickSaleButton.id = "quick-sale-toggle";
  quickSaleButton.type = "button";
  quickSaleButton.title = "Bật rồi bấm món trong Hành trang để bán ngay. Esc để kết thúc.";
  let quickSale = false;
  function setQuickSale(active) {
    quickSale = active;
    quickSaleButton.textContent = typeof developerTools !== "undefined" ? "" : active ? "Bán nhanh · Esc để thoát" : "Bán nhanh";
    quickSaleButton.title = active ? "Bán nhanh · Esc để thoát" : "Bán nhanh";
    quickSaleButton.setAttribute("aria-pressed", String(active));
    document.body.classList.toggle("quick-sale", active);
  }
  setQuickSale(false);
  if (typeof developerTools !== "undefined") { developerTools.register(toggle,"gm","GM · GameMaster"); developerTools.register(quickSaleButton,"sale","Bán nhanh", () => {
    if (!quickSale) return false;
    setQuickSale(false);
    if (typeof A5 === "function") A5();
    if (typeof _r === "function") _r();
    if (typeof n0 === "function") n0(true);
    return true;
  }); }
  quickSaleButton.onclick = () => {
    if (!o || !o.fac) return k("Hãy vào game với một nhân vật trước.");
    setQuickSale(!quickSale);
    if (quickSale) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      (typeof zn === "function" && zn() ? mi : fA)("inv");
      k("Bán nhanh: bấm món để bán ngay cả chồng, tự mở khóa nếu cần. Esc để thoát.");
    }
  };
  const originalInspect = He;
  He = function (item, slot) {
    if (!quickSale || !o || !o.inv.includes(item)) return originalInspect(item, slot);
    if (item.lock) delete item.lock;
    const price = x0(item);
    Ef(item);
    $();
    k("Đã bán " + item.n + " (+" + q(price) + " lượng)");
  };
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !quickSale || typeof developerTools !== "undefined") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setQuickSale(false);
      k("Đã kết thúc bán nhanh.");
    },
    true,
  );
  if (typeof developerTools === "undefined") document.body.appendChild(quickSaleButton);
  return {
    grant,
    drawSkillRange,
    setQuickSale,
    get quickSale() {
      return quickSale;
    },
  };
})();
