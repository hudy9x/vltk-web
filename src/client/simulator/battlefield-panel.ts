import { SOLDIER_RANK_SKINS, SOLDIER_SKIN_NAMES } from "./soldiers";
import type { SoldierSkillOption } from "./soldier-skills";
import type { WarSupplies } from "./supplies";
import type { WarRewards } from "./war-rewards";
import { ARMY_FACTIONS, distributeArmy } from "./composition";
import { splitArmyTotal, TEAM_NAMES } from "./battlefield";
import {
  DEFAULT_SOLDIERS,
  SOLDIER_RANKS,
  SOLDIER_TITLES,
  validateSoldierConfiguration,
} from "./soldier-config";
import { mountWarDialogStyle } from "./dialog-style";
import type { SoldierConfiguration } from "./soldier-config";
import type { Team, BothArmyBuild, createBattlefield } from "./battlefield";
import type { Faction } from "./types";
interface PanelHost {
  skills?: SoldierSkillOption[];
  configureSoldiers(configuration: SoldierConfiguration, applyNow?: boolean): void;
  openPharmacy(): void;
  openLeaderboard(): void;
}
/** The recruitment NPC owns this dialog. Switching tabs never discards inputs. */
export function mountBattlefieldPanel(
  match: ReturnType<typeof createBattlefield>,
  factions: Faction[],
  escape: (text: string) => string,
  rewards?: WarRewards,
  supplies?: WarSupplies,
  host?: PanelHost,
) {
  mountWarDialogStyle();
  const panel = document.createElement("section");
  panel.id = "battlefield-panel";
  panel.className = "war-dialog";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chiêu mộ sứ · Cài đặt Tống Kim");
  const armyFactions = ARMY_FACTIONS.map((key) =>
    factions.find((faction) => faction.key === key)!,
  ).filter(Boolean);
  const elements = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
  panel.innerHTML = `<header><h2>Chiêu mộ sứ · Tống Kim</h2><button id="battlefield-close" class="war-close" aria-label="Đóng cài đặt Tống Kim">×</button></header>
  <nav class="war-tabs" role="tablist" aria-label="Cài đặt chiến trường">${[
    ["match", "Trận đấu"],
    ["army", "Quân SIM"],
    ["soldiers", "Quái vật"],
    ["behaviour", "Tuần tra & chiêu"],
    ["info", "Tiếp tế & điểm"],
  ]
    .map(
      ([key, label]) =>
        `<button role="tab" id="battlefield-tab-${key}" aria-controls="battlefield-section-${key}" aria-selected="${key === "match"}" data-war-tab="${key}">${label}</button>`,
    )
    .join("")}</nav>
  <div class="war-content">
  <section id="battlefield-section-match" role="tabpanel"><p>20 phút · Boss Hoàng Kim · Hồi sinh sau 5 giây</p><div class="war-grid"><label>Phe người chơi<select id="battlefield-player"><option value="song">Tống</option><option value="jin">Kim</option></select></label>${(["song", "jin"] as const).map((team) => `<label>Hệ boss ${TEAM_NAMES[team]}<select id="battlefield-boss-${team}">${elements.map((name, index) => `<option value="${index}" ${index === (team === "song" ? 3 : 2) ? "selected" : ""}>${name}</option>`).join("")}</select></label>`).join("")}</div><p>Quân và quái được cài ở các tab bên cạnh. Thay đổi quái có hiệu lực khi bắt đầu trận mới hoặc bấm Cập nhật quái trong trận.</p><div class="war-actions"><button id="battlefield-start">Bắt đầu trận mới</button><button id="battlefield-reset">Rời chiến trường</button></div></section>
  <section id="battlefield-section-army" role="tabpanel" hidden><div class="war-grid"><label>Cấu hình tỉ lệ phe<select id="battlefield-team"><option value="song">Tống</option><option value="jin">Kim</option></select></label><label>Tổng SIM hai phe<input id="battlefield-count" type="number" min="2" max="200" step="2" value="40"></label></div><div class="war-card"><h3>Tỉ lệ 10 môn phái (%)</h3><div class="war-grid">${armyFactions.map((faction) => `<label>${escape(faction.n)}<input id="battlefield-ratio-${faction.key}" aria-label="Tỉ lệ ${escape(faction.n)} (%)" type="number" min="0" max="100" step="0.1" value="10"></label>`).join("")}</div><p id="battlefield-composition"></p></div><div class="war-grid"><label>Level<input id="battlefield-level" type="number" min="1" max="200" value="150"></label><label>Sức mạnh<select id="battlefield-strength"><option value="weak">Yếu</option><option value="normal" selected>Trung bình</option><option value="strong">Mạnh · Cường hóa +8</option></select></label><label>Chiêu chính SIM<select id="battlefield-skill-tier"><option value="90">Chiêu 90</option><option value="150">Chiêu 150</option></select></label><label>Loại trang bị<select id="battlefield-equipment-kind"><option value="blue">Đồ xanh cấp 10 · 5 dòng</option><option value="gold">Hoàng Kim môn phái</option><option value="thientu">Thiên Tứ môn phái</option></select></label></div><label><span><input id="battlefield-equipped" type="checkbox" checked> Mặc trang bị cho SIM</span></label><p>Món chưa có Thiên Tứ giữ Hoàng Kim gốc; ô ngoài bộ dùng đồ xanh tương thích.</p><button id="battlefield-add">Thêm SIM cho cả hai phe</button></section>
  <section id="battlefield-section-soldiers" role="tabpanel" hidden><p>Số lượng và HP áp dụng cho <b>mỗi phe</b>. Tối đa 200 quái/phe, hồi sinh sau 20 giây. Các quái này tách riêng hai boss Hoàng Kim.</p><table><thead><tr><th>Cấp quái</th><th>Số lượng/phe</th><th>HP mỗi quái</th></tr></thead><tbody>${SOLDIER_RANKS.map((rank) => `<tr><td>${SOLDIER_TITLES[rank]}</td><td><input id="battlefield-soldier-${rank}-count" aria-label="Số lượng ${SOLDIER_TITLES[rank]} mỗi phe" type="number" min="0" max="100" value="${DEFAULT_SOLDIERS[rank].count}"></td><td><input id="battlefield-soldier-${rank}-hp" aria-label="HP ${SOLDIER_TITLES[rank]}" type="number" min="1" max="1000000000000" value="${DEFAULT_SOLDIERS[rank].hp}"></td></tr>`).join("")}</tbody></table><p>Đặt số lượng 0 để không tạo cấp quái đó. Thiết lập tuần tra và võ công tại tab Tuần tra & chiêu; bấm Cập nhật quái trong trận hoặc bắt đầu trận mới để áp dụng.</p></section><section id="battlefield-section-behaviour" role="tabpanel" hidden><label>Cấp quái<select id="battlefield-soldier-setup-rank">${SOLDIER_RANKS.map((rank) => `<option value="${rank}" ${rank === "commander" ? "selected" : ""}>${SOLDIER_TITLES[rank]}</option>`).join("")}</select></label>${SOLDIER_RANKS.map((rank) => `<div class="war-card" id="battlefield-soldier-card-${rank}" ${rank === "commander" ? "" : "hidden"}><h3>${SOLDIER_TITLES[rank]}</h3><p>${SOLDIER_RANK_SKINS[rank].map((id) => SOLDIER_SKIN_NAMES[id]).join(" · ")}</p><div class="war-grid"><label>Bán kính tuần tra<input id="battlefield-soldier-${rank}-patrol" type="number" min="40" max="1200" value="180"></label><label>Bán kính truy đuổi<input id="battlefield-soldier-${rank}-leash" type="number" min="40" max="1600" value="800"></label>${["commander", "general", "marshal"].includes(rank) ? [0, 1].map((slot) => `<label>Chiêu ${slot + 1} · cấp 50–70<select id="battlefield-soldier-${rank}-skill-${slot}"><option value="0">Không dùng · đánh thường nếu tắt cả hai</option>${(host?.skills || []).map((skill) => `<option value="${skill.id}">Cấp ${skill.level} · ${escape(skill.name)}</option>`).join("")}</select></label>`).join("") : "<p>Đánh thường theo chỉ số gốc.</p>"}</div></div>`).join("")}<p>Quái được rải trên hai bờ, chỉ truy đuổi trong phạm vi đã đặt rồi quay về. Chiêu giữ cấp yêu cầu của catalog, luân phiên qua hệ thống đạn/va chạm thật.</p><p>Bấm Cập nhật quái trong trận hoặc bắt đầu trận mới để áp dụng thiết lập.</p></section>
  <section id="battlefield-section-info" role="tabpanel" hidden><h3>Quân trạng</h3><p id="battlefield-merit"></p><p>10 điểm hạ quái · 50 điểm hạ SIM/người chơi · 1.000 điểm hạ boss. Esc mở top 10 cùng thứ hạng và danh hiệu của bạn.</p><button id="battlefield-ranking">Bảng xếp hạng</button><h3>Dược điếm</h3><p id="battlefield-supplies"></p><p>Tổng sức chứa 60 bình máu + mana. Mua thêm từ Chủ dược điếm ở điểm tập trung. Hồi sinh không tự nạp thuốc.</p><p>Gặp NPC Chủ Dược Điếm riêng tại doanh trại để mua thuốc.</p><p>Hoàn nhặt được nằm trong Hành trang. Mở vật phẩm rồi bấm Sử dụng để nhận hiệu ứng 180 giây.</p></section>
  <div class="war-actions"><button id="battlefield-update-monsters">Cập nhật quái trong trận</button></div><p>Sinh lại binh lính theo cấu hình mới; giữ thời gian, quân trạng, SIM và boss. Chỉ dùng khi trận đang chạy.</p><p id="battlefield-status" role="status"></p><p id="battlefield-error" class="war-note" role="alert"></p></div>`;
  const input = (id: string) =>
    panel.querySelector<HTMLInputElement>("#battlefield-" + id)!;
  const button = (id: string) =>
    panel.querySelector<HTMLButtonElement>("#battlefield-" + id)!;
  const tabs = ["match", "army", "soldiers", "behaviour", "info"];
  for (const tab of tabs)
    button("tab-" + tab).onclick = () => {
      for (const key of tabs) {
        input("section-" + key).hidden = key !== tab;
        button("tab-" + key).setAttribute("aria-selected", String(key === tab));
      }
    };
  const close = () => {
    panel.hidden = true;
  };
  button("close").onclick = close;
  input("soldier-setup-rank").onchange = () => {
    const selectedRank = input("soldier-setup-rank").value;
    for (const rank of SOLDIER_RANKS)
      input("soldier-card-" + rank).hidden = rank !== selectedRank;
  };
  function open() {
    panel.hidden = false;
    document.getElementById("combat-sandbox")?.removeAttribute?.("open");
    const sim = document.getElementById("sim-panel");
    if (sim) sim.hidden = true;
    render();
  }
  function act(action: () => unknown) {
    try {
      action();
      input("error").textContent = "";
    } catch (error) {
      input("error").textContent =
        error instanceof Error ? error.message : String(error);
    }
    render();
  }
  function readSoldiers() {
    return validateSoldierConfiguration(
      Object.fromEntries(
        SOLDIER_RANKS.map((rank) => [
          rank,
          {
            patrolRadius: Number(
              input("soldier-" + rank + "-patrol").value || 180,
            ),
            leashRadius: Number(
              input("soldier-" + rank + "-leash").value || 800,
            ),
            skills: ["commander", "general", "marshal"].includes(rank)
              ? [0, 1]
                  .map((slot) =>
                    Number(
                      input("soldier-" + rank + "-skill-" + slot).value || 0,
                    ),
                  )
                  .filter((id) => id > 0)
              : [],
            count: Number(
              input("soldier-" + rank + "-count").value ||
                DEFAULT_SOLDIERS[rank].count,
            ),
            hp: Number(
              input("soldier-" + rank + "-hp").value ||
                DEFAULT_SOLDIERS[rank].hp,
            ),
          },
        ]),
      ) as SoldierConfiguration,
    );
  }
  button("start").onclick = () =>
    act(() => {
      host?.configureSoldiers(readSoldiers());
      match.start(input("player").value as Team, {
        song: +input("boss-song").value,
        jin: +input("boss-jin").value,
      });
    });
  button("reset").onclick = () => act(() => match.reset());
  button('update-monsters').onclick = () => act(() => {
    if (!match.running) throw new Error('Bắt đầu trận trước khi cập nhật quái.');
    host?.configureSoldiers(readSoldiers(),true);
  });
  button("ranking").onclick = () => {
    close();
    host?.openLeaderboard();
  };
  const ratios = {
    song: Object.fromEntries(ARMY_FACTIONS.map((key) => [key, 10])),
    jin: Object.fromEntries(ARMY_FACTIONS.map((key) => [key, 10])),
  };
  let selectedTeam: Team = "song",
    adding = false;
  const readRatios = () =>
    Object.fromEntries(
      ARMY_FACTIONS.map((key) => [key, Number(input("ratio-" + key).value)]),
    );
  function previewComposition() {
    ratios[selectedTeam] = readRatios();
    try {
      const halves = splitArmyTotal(+input("count").value);
      const counts = distributeArmy(halves[selectedTeam], ratios[selectedTeam]);
      input("composition").textContent =
        `Tổng ${halves.song + halves.jin} = ${halves.song} Tống + ${halves.jin} Kim · ` +
        armyFactions
          .map((faction) => `${faction.n}: ${counts[faction.key]}`)
          .join(" · ");
    } catch (error) {
      input("composition").textContent =
        error instanceof Error ? error.message : String(error);
    }
  }
  for (const key of ARMY_FACTIONS)
    input("ratio-" + key).oninput = previewComposition;
  input("count").oninput = previewComposition;
  input("team").onchange = () => {
    ratios[selectedTeam] = readRatios();
    selectedTeam = input("team").value as Team;
    for (const key of ARMY_FACTIONS)
      input("ratio-" + key).value = String(ratios[selectedTeam][key]);
    previewComposition();
  };
  button("add").onclick = async () => {
    adding = true;
    render();
    try {
      ratios[selectedTeam] = readRatios();
      await match.addBothAsync(
        {
          compositions: { song: { ...ratios.song }, jin: { ...ratios.jin } },
          faction: "shaolin",
          equipped: input("equipped").checked,
          skillTier: +(input("skill-tier").value || 90),
          equipmentKind: input("equipment-kind").value || "blue",
          level: +input("level").value,
          strength: input("strength").value,
          count: +input("count").value,
        } as BothArmyBuild,
        (done, total) => {
          input("error").textContent = `Đang tạo quân ${done}/${total}…`;
          render();
        },
      );
      input("error").textContent = "";
    } catch (error) {
      input("error").textContent =
        error instanceof Error ? error.message : String(error);
    } finally {
      adding = false;
      render();
    }
  };
  const hud = document.createElement("div");
  hud.id = "battlefield-hud";
  hud.hidden = true;
  hud.style.cssText =
    "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:89000;background:#202319ed;color:#ffdf97;border:1px solid #8a8058;padding:5px 12px;font:12px monospace;pointer-events:none";
  function render() {
    const state = match.state,
      seconds = Math.ceil(state.remaining),
      time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
      reward = rewards?.state,
      supply = supplies?.state;
    input("merit").textContent = reward
      ? `<${reward.title}> · ${reward.points} quân trạng`
      : "";
    input("supplies").textContent = supply
      ? `Máu ${supply.life} · Mana ${supply.mana} · Tổng ${supply.total}/60 bình`
      : "";
    button("add").disabled = !match.running || adding;
    button("update-monsters").disabled = !match.running || adding;
    button("start").disabled = adding;
    for (const id of ["player", "boss-song", "boss-jin"])
      input(id).disabled = match.active;
    hud.hidden = !match.active;
    hud.textContent = `${time} · ${TEAM_NAMES[state.team]} · ${reward?.title || ""} ${reward?.points || 0} · Tống ${state.score.song} : ${state.score.jin} Kim`;
    input("status").textContent =
      state.phase === "idle"
        ? "Gặp Chiêu mộ sứ để bắt đầu trận."
        : `${state.result || "Đang giao chiến"} · ${time}\n` +
          (["song", "jin"] as const)
            .map(
              (side) =>
                `${TEAM_NAMES[side]}: ${state.armies[side].alive}/${state.armies[side].count} SIM · Boss ${Math.ceil(state.armies[side].bossHP).toLocaleString("vi-VN")} HP`,
            )
            .join("\n") +
          `\nQuái: ${state.monsters.alive}/${state.monsters.count}`;
  }
  document.body.appendChild(panel);
  document.body.appendChild(hud);
  previewComposition();
  render();
  return {
    open,
    close,
    render,
    get isOpen() {
      return !panel.hidden;
    },
  };
}
