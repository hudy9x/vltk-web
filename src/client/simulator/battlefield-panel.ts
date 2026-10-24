import { SOLDIER_APPEARANCE_SECONDS, validateDeploymentSettings } from "./deployment-settings";
import { createBattlefieldSettingsStore } from "./battlefield-settings";
import { SOLDIER_RANK_SKINS, SOLDIER_SKIN_NAMES } from "./soldiers";
import type { SoldierSkillOption } from "./soldier-skills";
import type { WarSupplies } from "./supplies";
import type { WarRewards } from "./war-rewards";
import { ARMY_FACTIONS, distributeArmy } from "./composition";
import { BATTLEFIELD_MAPS, splitArmyTotal, TEAM_NAMES } from "./battlefield";
import {
  DEFAULT_SOLDIERS,
  SOLDIER_RANKS,
  SOLDIER_TITLES,
  validateSoldierConfiguration,
} from "./soldier-config";
import { mountWarDialogStyle } from "./dialog-style";
import type { SoldierConfiguration } from "./soldier-config";
import type { Team, BothArmyBuild, createBattlefield } from "./battlefield";
import type { LegacyRecord, Faction } from "./types";
interface PanelHost {
  skills?: SoldierSkillOption[];
  mounts?: LegacyRecord[];
  preferPKSim?(): boolean;
  setPreferPKSim?(value: boolean): void;
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
  panel.setAttribute("aria-label", "Chiêu mộ sứ · Tống Kim");
  const armyFactions = ARMY_FACTIONS.map((key) =>
    factions.find((faction) => faction.key === key)!,
  ).filter(Boolean);
  const patrolRanks = SOLDIER_RANKS.filter(rank => rank !== "marshal");
  const elements = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
  panel.innerHTML = `<header><h2>Chiêu mộ sứ · Tống Kim</h2><button id="battlefield-close" class="war-close" aria-label="Đóng menu Chiêu mộ sứ">×</button></header>
  <nav class="war-tabs" role="tablist" aria-label="Cài đặt chiến trường">${[
    ["join", "Tham gia chiến trường"],
    ["match", "Trận đấu"],
    ["army", "Quân SIM"],
    ["soldiers", "Quái vật"],
    ["behaviour", "Tuần tra & chiêu"],
    ["info", "Bảng xếp hạng"],
  ]
    .map(
      ([key, label]) =>
        `<button role="tab" id="battlefield-tab-${key}" aria-controls="battlefield-section-${key}" aria-selected="${key === "join"}" data-war-tab="${key}">${label}</button>`,
    )
    .join("")}</nav>
  <div class="war-content">
  <section id="battlefield-section-join" role="tabpanel"><h3>Tham gia chiến trường Tống Kim</h3><p>Chọn chiến trường và phe để tham gia trận đấu 20 phút. Thiết lập quân và binh sĩ ở các tab bên cạnh sẽ được áp dụng khi vào trận.</p><div class="war-grid"><label>Chiến trường<select id="battlefield-map">${BATTLEFIELD_MAPS.map(map=>`<option value="${map.id}" ${map.id===9003?"selected":""}>${map.name}</option>`).join("")}</select></label><label>Phe người chơi<select id="battlefield-player"><option value="song">Tống</option><option value="jin">Kim</option></select></label></div><div class="war-actions"><button id="battlefield-start">Tham gia chiến trường</button><button id="battlefield-reset">Rời chiến trường</button></div></section>
  <section id="battlefield-section-match" role="tabpanel" hidden><p>20 phút · Boss Hoàng Kim</p><div class="war-grid">${(["song", "jin"] as const).map((team) => `<label>Hệ boss ${TEAM_NAMES[team]}<select id="battlefield-boss-${team}">${elements.map((name, index) => `<option value="${index}" ${index === (team === "song" ? 3 : 2) ? "selected" : ""}>${name}</option>`).join("")}</select></label>`).join("")}</div><p>Quân và quái được cài ở các tab bên cạnh. Thay đổi quái có hiệu lực khi bắt đầu trận mới hoặc bấm Cập nhật quái trong trận.</p><div class="war-grid"><label>Tái xuất chiến sau tử vong (SIM và người chơi)<select id="battlefield-redeployment">${[30,50,60].map(seconds => `<option value="${seconds}">${seconds} giây</option>`).join("")}</select></label><label>Binh sĩ xuất hiện sau khi bắt đầu trận (giây)<input id="battlefield-soldier-appearance" type="number" readonly value="${SOLDIER_APPEARANCE_SECONDS}"></label></div><p>Người chơi từ lần chết thứ 5 trong cùng trận chờ gấp đôi thời gian đã cài, không nhân dồn. SIM giữ mức gốc. Binh sĩ xuất hiện sau 5 giây, có đếm ngược trên màn hình. Cài đặt thời gian áp dụng cho trận mới.</p></section>
  <section id="battlefield-section-army" role="tabpanel" hidden><label><span><input id="battlefield-prefer-pk" type="checkbox"> Ưu tiên PK SIM (tự đánh)</span></label><div class="war-grid"><label>Cấu hình tỉ lệ phe<select id="battlefield-team"><option value="song">Tống</option><option value="jin">Kim</option></select></label><label>Tổng SIM hai phe<input id="battlefield-count" type="number" min="2" max="200" step="2" value="40"></label></div><div class="war-card"><h3>Tỉ lệ 10 môn phái (%)</h3><div class="war-grid">${armyFactions.map((faction) => `<label>${escape(faction.n)}<input id="battlefield-ratio-${faction.key}" aria-label="Tỉ lệ ${escape(faction.n)} (%)" type="number" min="0" max="100" step="0.1" value="10"></label>`).join("")}</div><p id="battlefield-composition"></p></div><div class="war-grid"><label>Level<input id="battlefield-level" type="number" min="1" max="200" value="150"></label><label>Sức mạnh<select id="battlefield-strength"><option value="weak">Yếu</option><option value="normal" selected>Trung bình</option><option value="strong">Mạnh · Cường hóa +8</option></select></label><label>Chiêu chính SIM<select id="battlefield-skill-tier"><option value="90">Chiêu 90</option><option value="150">Chiêu 150</option></select></label><label>Ngựa chiến SIM<select id="battlefield-mount"><option value="random">Ngẫu nhiên theo cấp (90–150)</option><option value="none">Không cưỡi ngựa</option>${(host?.mounts || []).map(horse => `<option value="${horse.key}">${escape(horse.n)} · yêu cầu cấp ${horse.req.find(([kind]: number[]) => kind === 36)?.[1] || 0}</option>`).join('')}</select></label><label>Loại trang bị<select id="battlefield-equipment-kind"><option value="blue">Đồ xanh cấp 10 · 5 dòng</option><option value="gold">Hoàng Kim môn phái</option><option value="thientu">Thiên Tứ môn phái</option></select></label></div><label><span><input id="battlefield-equipped" type="checkbox" checked> Mặc trang bị cho SIM</span></label><p>Món chưa có Thiên Tứ giữ Hoàng Kim gốc; ô ngoài bộ dùng đồ xanh tương thích.</p><button id="battlefield-add">Thêm SIM cho cả hai phe</button></section>
  <section id="battlefield-section-soldiers" role="tabpanel" hidden><p>Số lượng là <b>tổng cả hai phe</b>, chia đều Tống/Kim (số lẻ dư 1 Tống). Sinh một lần sau 5 giây kể từ lúc bắt đầu trận; hồi sinh chỉ thay quân đã chết, không vượt tổng đã cài. Tối đa 200 quái; boss không hồi sinh. Nguyên soái là boss đứng tại doanh trại, mỗi phe đúng 1 boss, xuất hiện sau 50% thời gian trận (phút 10); HP dùng theo cấu hình bên dưới.</p><table><thead><tr><th>Cấp quái</th><th>Tổng hai phe</th><th>HP mỗi quái</th><th>Hồi sinh</th></tr></thead><tbody>${SOLDIER_RANKS.map((rank) => `<tr><td>${SOLDIER_TITLES[rank]}${rank === "marshal" ? " (1/phe)" : ""}</td><td><input id="battlefield-soldier-${rank}-count" aria-label="Số lượng ${SOLDIER_TITLES[rank]} ${rank === "marshal" ? "mỗi phe" : "tổng hai phe"}" type="number" min="${rank === "marshal" ? 1 : 0}" max="${rank === "marshal" ? 1 : 100}" ${rank === "marshal" ? "readonly" : ""} value="${DEFAULT_SOLDIERS[rank].count}"></td><td><input id="battlefield-soldier-${rank}-hp" aria-label="HP ${SOLDIER_TITLES[rank]}" type="number" min="1" max="1000000000000" value="${DEFAULT_SOLDIERS[rank].hp}"></td><td>${rank === "marshal" ? "Không hồi sinh" : `<select id="battlefield-soldier-${rank}-respawn" aria-label="Thời gian hồi sinh ${SOLDIER_TITLES[rank]}">${[10,20,30].map(seconds => `<option value="${seconds}" ${seconds === 20 ? "selected" : ""}>${seconds} giây</option>`).join("")}</select>`}</td></tr>`).join("")}</tbody></table><p>Đặt số lượng 0 để không tạo cấp quái đó. Thiết lập tuần tra và võ công tại tab Tuần tra & chiêu; bấm Cập nhật quái trong trận hoặc bắt đầu trận mới để áp dụng.</p></section><section id="battlefield-section-behaviour" role="tabpanel" hidden><label>Cấp quái<select id="battlefield-soldier-setup-rank">${patrolRanks.map((rank) => `<option value="${rank}" ${rank === "commander" ? "selected" : ""}>${SOLDIER_TITLES[rank]}</option>`).join("")}</select></label>${patrolRanks.map((rank) => `<div class="war-card" id="battlefield-soldier-card-${rank}" ${rank === "commander" ? "" : "hidden"}><h3>${SOLDIER_TITLES[rank]}</h3><p>${SOLDIER_RANK_SKINS[rank].map((id) => SOLDIER_SKIN_NAMES[id]).join(" · ")}</p><div class="war-grid"><label>Bán kính tuần tra<input id="battlefield-soldier-${rank}-patrol" type="number" min="40" max="1200" value="180"></label><label>Bán kính truy đuổi<input id="battlefield-soldier-${rank}-leash" type="number" min="40" max="1600" value="800"></label>${["commander", "general", "grandGeneral"].includes(rank) ? [0, 1].map((slot) => `<label>Chiêu ${slot + 1} · cấp 50–70<span class="war-skill-picker"><select hidden id="battlefield-soldier-${rank}-skill-${slot}"><option value="0">Không dùng</option>${(host?.skills || []).map((skill) => `<option value="${skill.id}">Cấp ${skill.level} · ${escape(skill.name)}</option>`).join("")}</select><details name="battlefield-skill" id="battlefield-skill-menu-${rank}-${slot}"><summary aria-label="Chiêu ${slot + 1} của ${SOLDIER_TITLES[rank]}"><span id="battlefield-skill-summary-${rank}-${slot}">Không dùng · đánh thường nếu tắt cả hai</span></summary><div class="war-skill-options">${[{id:0,name:"Không dùng · đánh thường nếu tắt cả hai",level:0,icon:""},...(host?.skills || [])].map(skill => `<button type="button" data-war-skill="${rank}:${slot}:${skill.id}">${skill.icon ? `<img src="${escape(skill.icon)}" alt="">` : ""}<span>${skill.level ? `Cấp ${skill.level} · ` : ""}${escape(skill.name)}</span></button>`).join("")}</div></details></span></label>`).join("") : "<p>Đánh thường theo chỉ số gốc.</p>"}</div></div>`).join("")}<p>Quái được rải trên chiến trường, chỉ truy đuổi trong phạm vi đã đặt rồi quay về. Chiêu giữ cấp yêu cầu của catalog, luân phiên qua hệ thống đạn/va chạm thật. Nguyên soái đứng tại doanh trại và dùng bộ chiêu boss 90/150 theo hệ.</p><p>Bấm Cập nhật quái trong trận hoặc bắt đầu trận mới để áp dụng thiết lập.</p></section>
  <section id="battlefield-section-info" role="tabpanel" hidden><h3>Quân trạng</h3><p id="battlefield-merit"></p><p>10 điểm hạ quái · 50 điểm hạ SIM/người chơi · 1.000 điểm hạ boss. Esc mở top 10 cùng thứ hạng và danh hiệu của bạn.</p><button id="battlefield-ranking">Bảng xếp hạng</button></section>
  <div class="war-actions"><button id="battlefield-save-settings">Lưu cài đặt</button><button id="battlefield-update-monsters">Cập nhật quái trong trận</button></div><p>Sinh lại binh lính theo cấu hình mới; giữ thời gian, quân trạng, SIM và boss. HP Nguyên soái áp dụng khi bắt đầu trận mới. Chỉ dùng khi trận đang chạy.</p><p id="battlefield-settings-status" role="status"></p><p id="battlefield-status" role="status"></p><p id="battlefield-error" class="war-note" role="alert"></p></div>`;
  const input = (id: string) =>
    panel.querySelector<HTMLInputElement>("#battlefield-" + id)!;
  const button = (id: string) =>
    panel.querySelector<HTMLButtonElement>("#battlefield-" + id)!;
  input("prefer-pk").checked = host?.preferPKSim?.() || false;
  input("prefer-pk").onchange = () => host?.setPreferPKSim?.(input("prefer-pk").checked);
  const tabs = ["join", "match", "army", "soldiers", "behaviour", "info"];
  const selectTab = (tab: string) => {
    for (const key of tabs) {
      input("section-" + key).hidden = key !== tab;
      button("tab-" + key).setAttribute("aria-selected", String(key === tab));
    }
  };
  for (const tab of tabs)
    button("tab-" + tab).onclick = () => selectTab(tab);
  const close = () => {
    void saveSettings();
    panel.hidden = true;
  };
  button("close").onclick = close;
  input("soldier-setup-rank").onchange = () => {
    const selectedRank = input("soldier-setup-rank").value;
    for (const rank of patrolRanks)
      input("soldier-card-" + rank).hidden = rank !== selectedRank;
  };
  function open() {
    restoreSettings();
    panel.hidden = false;
    selectTab("join");
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
            respawnSeconds: rank === "marshal" ? 20 : Number(input("soldier-" + rank + "-respawn").value || 20),
            patrolRadius: rank === "marshal" ? 180 : Number(
              input("soldier-" + rank + "-patrol").value || 180,
            ),
            leashRadius: rank === "marshal" ? 800 : Number(
              input("soldier-" + rank + "-leash").value || 800,
            ),
            skills: ["commander", "general", "grandGeneral"].includes(rank)
              ? [0, 1]
                  .map((slot) =>
                    Number(
                      input("soldier-" + rank + "-skill-" + slot).value || 0,
                    ),
                  )
                  .filter((id) => id > 0)
              : [],
            count: rank === "marshal" ? 1 : Number(
              input("soldier-" + rank + "-count").value === "" ?
                DEFAULT_SOLDIERS[rank].count : input("soldier-" + rank + "-count").value,
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
  function readDeployment() {
    return validateDeploymentSettings({respawnSeconds:Number(input("redeployment").value || 30), soldierAppearanceSeconds:SOLDIER_APPEARANCE_SECONDS});
  }
  button("start").onclick = () =>
    act(() => {
      match.configureDeployment(readDeployment());
      host?.configureSoldiers(readSoldiers());
      match.start(input("player").value as Team, {
        song: +input("boss-song").value,
        jin: +input("boss-jin").value,
      }, Number(input("map").value || 9003));
      close();
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
          mount: input("mount").value || "random",
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
  function render() {
    const state = match.state,
      seconds = Math.ceil(state.remaining),
      time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
      reward = rewards?.state;
    input("merit").textContent = reward
      ? `<${reward.title}> · ${reward.points} quân trạng`
      : "";
    button("add").disabled = !match.running || adding;
    input("map").disabled = match.active;
    button("update-monsters").disabled = !match.running || adding;
    button("start").disabled = adding || state.phase === "finished";
    button("reset").disabled = state.phase === "finished";
    for (const id of ["player", "boss-song", "boss-jin"])
      input(id).disabled = match.active;
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
          `\nQuái: ${state.monsters.alive}/${state.monsters.count}` +
          (state.marshalPreparing ? '\nĐang chuẩn bị cấu hình Nguyên soái…' : '') +
          (state.preparationError ? `\nKhông thể chuẩn bị Nguyên soái: ${state.preparationError}. Rời và tham gia lại trận để thử lại.` : '');
  }
  const settingsStore = createBattlefieldSettingsStore(localStorage);
  const fieldIds = ["redeployment", "soldier-appearance", "map", "player", "boss-song", "boss-jin", "prefer-pk", "team", "count", "level", "strength", "skill-tier", "mount", "equipment-kind", "equipped", "soldier-setup-rank",
    ...ARMY_FACTIONS.map(key => "ratio-" + key),
    ...SOLDIER_RANKS.flatMap(rank => ["count", "hp", ...(rank === "marshal" ? [] : ["patrol", "leash", "respawn"]), ...(["commander", "general", "grandGeneral"].includes(rank) ? ["skill-0", "skill-1"] : [])].map(field => `soldier-${rank}-${field}`))];
  const checkboxIds = new Set(["prefer-pk", "equipped"]);
  const defaults = Object.fromEntries(fieldIds.map(id => [id, checkboxIds.has(id) ? input(id).checked : input(id).value]));
  let restoredKey = "";
  function refreshSkillIcon(rank: string, slot: number) {
    const select = input(`soldier-${rank}-skill-${slot}`);
    const skill = host?.skills?.find(skill => skill.id === Number(select.value));
    input(`skill-summary-${rank}-${slot}`).innerHTML = skill
      ? `${skill.icon ? `<img src="${escape(skill.icon)}" alt="">` : ""}<span>Cấp ${skill.level} · ${escape(skill.name)}</span>`
      : "Không dùng · đánh thường nếu tắt cả hai";
  }
  function restoreSettings() {
    if (restoredKey === settingsStore.key()) return;
    restoredKey = settingsStore.key();
    try {
      const saved = settingsStore.load();
      for (const id of fieldIds) {
        const value = id === "soldier-appearance" ? SOLDIER_APPEARANCE_SECONDS : saved?.fields[id] ?? defaults[id];
        if (checkboxIds.has(id)) input(id).checked = value === true;
        else input(id).value = String(value);
      }
      if (!BATTLEFIELD_MAPS.some(map => String(map.id) === input("map").value)) input("map").value = "9003";
      selectedTeam = input("team").value === "jin" ? "jin" : "song";
      for (const team of ["song", "jin"] as const)
        ratios[team] = Object.fromEntries(ARMY_FACTIONS.map(key => [key, saved?.ratios[team][key] ?? 10]));
      for (const key of ARMY_FACTIONS) input("ratio-" + key).value = String(ratios[selectedTeam][key]);
      match.configureDeployment(readDeployment());
      host?.configureSoldiers(readSoldiers());
      host?.setPreferPKSim?.(input("prefer-pk").checked);
      for (const rank of patrolRanks) input("soldier-card-" + rank).hidden = rank !== input("soldier-setup-rank").value;
      for (const rank of ["commander", "general", "grandGeneral"]) for (const slot of [0, 1]) refreshSkillIcon(rank, slot);
      previewComposition();
      input("settings-status").textContent = saved ? "Đã nạp cài đặt đã lưu." : "";
    } catch (error) {
      input("settings-status").textContent = error instanceof Error ? error.message : String(error);
    }
  }
  async function saveSettings() {
    try {
      readSoldiers();
      readDeployment();
      ratios[selectedTeam] = readRatios();
      settingsStore.save({version:1, fields:Object.fromEntries(fieldIds.map(id => [id, checkboxIds.has(id) ? input(id).checked : input(id).value])), ratios});
      const sync = (window as Window & { localGameStorage?: { flush(): Promise<void>; readonly pending: number } }).localGameStorage;
      input("settings-status").textContent = "Đang lưu cài đặt…";
      if (sync) {
        await sync.flush();
        if (sync.pending) throw new Error("Cài đặt đang chờ đồng bộ database. Kiểm tra kết nối và bấm Lưu cài đặt để thử lại.");
      }
      input("settings-status").textContent = sync ? "Đã lưu cài đặt vào database." : "Đã lưu cài đặt.";
    } catch (error) {
      input("settings-status").textContent = error instanceof Error ? error.message : String(error);
    }
  }
  button("save-settings").onclick = () => { void saveSettings(); };
  for (const id of fieldIds) {
    const field = input(id), previous = field.onchange;
    field.onchange = event => { previous?.call(field, event); void saveSettings(); };
  }
  for (const option of panel.querySelectorAll<HTMLButtonElement>("[data-war-skill]")) option.onclick = () => {
    const [rank, slot, id] = option.dataset.warSkill!.split(":");
    input(`soldier-${rank}-skill-${slot}`).value = id;
    refreshSkillIcon(rank, Number(slot));
    input(`skill-menu-${rank}-${slot}`).removeAttribute("open");
    input(`skill-menu-${rank}-${slot}`).querySelector("summary")?.focus();
    void saveSettings();
  };
  const pickerStyle = document.createElement("style");
  pickerStyle.textContent = `#battlefield-panel .war-skill-picker summary{display:flex;align-items:center;gap:6px;list-style:none;min-height:64px;box-sizing:border-box;cursor:pointer;border:1px solid #746d4f;border-radius:4px;padding:7px;background:#25271f}#battlefield-panel .war-skill-picker summary::-webkit-details-marker{display:none}#battlefield-panel .war-skill-picker summary::before{content:"▸"}#battlefield-panel details[open] summary::before{content:"▾"}#battlefield-panel .war-skill-picker summary>span,#battlefield-panel .war-skill-options button{display:flex;align-items:center;gap:8px;text-align:left}#battlefield-panel .war-skill-picker img{width:32px;height:32px;object-fit:contain;image-rendering:pixelated;flex-shrink:0}#battlefield-panel .war-skill-options{max-height:260px;overflow:auto;border:1px solid #746d4f;padding:4px}#battlefield-panel .war-skill-options button{width:100%;margin:3px 0}#battlefield-panel .war-skill-options button:focus-visible{outline:2px solid #ffdf97}#battlefield-panel summary:focus-visible{outline:2px solid #ffdf97}`;
  document.head.appendChild(pickerStyle);
  restoreSettings();
  document.body.appendChild(panel);
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
