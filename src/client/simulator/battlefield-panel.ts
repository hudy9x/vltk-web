import { WAR_ITEMS } from './war-rewards';
import type { WarRewards, WarItem } from './war-rewards';
import { ARMY_FACTIONS, distributeArmy } from './composition';
import { splitArmyTotal, TEAM_NAMES } from './battlefield';
import type { Team, BothArmyBuild } from './battlefield';
import type { Faction } from './types';
import type { createBattlefield } from './battlefield';

export function mountBattlefieldPanel(match: ReturnType<typeof createBattlefield>, factions: Faction[], escape: (text: string) => string, rewards?: WarRewards) {
  const toggle = document.createElement('button');
  toggle.id = 'battlefield-toggle'; toggle.type = 'button'; toggle.textContent = 'Tống Kim';
  toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'battlefield-panel');
  const panel = document.createElement('section'); panel.id = 'battlefield-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Chiến trường Tống Kim');
  const style = document.createElement('style');
  style.textContent = `#battlefield-toggle{position:fixed;left:112px;top:8px;z-index:90000;padding:8px;background:#573c26;color:#ffdf97;border:1px solid #c39a53;cursor:pointer}body:has(#battlefield-toggle) #quick-sale-toggle{left:208px}#battlefield-panel{position:fixed;right:8px;top:50px;width:min(390px,calc(100vw - 16px));max-height:calc(100dvh - 65px);overflow:auto;box-sizing:border-box;z-index:90002;background:#1c211df5;color:#efdfb0;border:1px solid #9f8c51;padding:12px;font:13px inherit}#battlefield-panel[hidden]{display:none}#battlefield-panel header{display:flex;justify-content:space-between;align-items:center}#battlefield-panel button,#battlefield-panel select,#battlefield-panel input{background:#26352b;color:#ffdf97;border:1px solid #78825a;padding:6px;font:inherit;max-width:100%;box-sizing:border-box}#battlefield-panel label{display:block;margin:8px 0}#battlefield-panel select{width:100%}#battlefield-panel input{width:100px}#battlefield-panel input[type=checkbox]{width:auto}#battlefield-panel fieldset{border:1px solid #78825a;margin-top:10px;padding:8px}#battlefield-panel .battlefield-ratios{display:grid;grid-template-columns:1fr 1fr;gap:5px}#battlefield-panel .battlefield-ratios label{margin:0;display:flex;align-items:center;justify-content:space-between;gap:4px}#battlefield-panel .battlefield-ratios input{width:64px}#battlefield-composition{font-size:12px;line-height:1.5}#battlefield-panel h3{margin:14px 0 8px}#battlefield-status{white-space:pre-line;line-height:1.6}#battlefield-hud{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:89000;background:#17201be8;color:#ffdf97;padding:5px 12px;border:1px solid #78825a;pointer-events:none;font:12px inherit;max-width:50vw;text-align:center}#battlefield-hud[hidden]{display:none}`;
  const armyFactions = ARMY_FACTIONS.map(key => factions.find(faction => faction.key === key)!).filter(Boolean);
  const elements = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
  panel.innerHTML = `<header><strong>Tống Kim · Song Doanh</strong><button id="battlefield-close" type="button" aria-label="Đóng chiến trường">×</button></header><p>20 phút · Boss Hoàng Kim · Hồi sinh sau 5 giây</p><label>Phe người chơi<select id="battlefield-player"><option value="song">Tống</option><option value="jin">Kim</option></select></label>${(['song', 'jin'] as const).map(team => `<label>Hệ boss ${TEAM_NAMES[team]}<select id="battlefield-boss-${team}">${elements.map((name, i) => `<option value="${i}" ${i === (team === 'song' ? 3 : 2) ? 'selected' : ''}>${name}</option>`).join('')}</select></label>`).join('')}<button id="battlefield-start" type="button">Bắt đầu trận mới</button> <button id="battlefield-reset" type="button">Rời chiến trường</button><h3>Bổ sung quân hai phe</h3><label>Cấu hình tỉ lệ phe<select id="battlefield-team"><option value="song">Tống</option><option value="jin">Kim</option></select></label><fieldset><legend>Tỉ lệ 10 môn phái (%)</legend><div class="battlefield-ratios">${armyFactions.map(f => `<label>${escape(f.n)} <input id="battlefield-ratio-${f.key}" aria-label="Tỉ lệ ${escape(f.n)} (%)" type="number" min="0" max="100" step="0.1" value="10"></label>`).join('')}</div><p id="battlefield-composition" aria-live="polite"></p></fieldset><label>Level <input id="battlefield-level" type="number" min="1" max="200" value="150"></label><label>Sức mạnh<select id="battlefield-strength"><option value="weak">Yếu · thuộc tính thấp</option><option value="normal" selected>Trung bình · thuộc tính ngẫu nhiên</option><option value="strong">Mạnh · thuộc tính cao, cường hóa +8</option></select></label><label>Tổng SIM hai phe <input id="battlefield-count" type="number" min="2" max="200" step="2" value="40"></label><label><input id="battlefield-equipped" type="checkbox" checked> Mặc đồ cấp 10 · 5 dòng · phối tương sinh</label><button id="battlefield-add" type="button">Thêm SIM cho cả hai phe</button><p>Tổng quân chia đều hai phe: 40 SIM = 20 Tống + 20 Kim. Chọn phe ở trên để chỉnh tỉ lệ riêng. Điểm tự cộng theo Gợi ý; đồ cấp 10 cần đủ level. Mỗi phe có 6 binh sĩ trên ba tuyến, hồi lại sau 20 giây. Hạ binh sĩ địch được 10 quân trạng, có 35% rơi hoàn. HP boss ước tính theo quân đối phương.</p><h3>Quân trạng &amp; vật phẩm</h3><p id="battlefield-merit" role="status"></p>${(Object.keys(WAR_ITEMS) as WarItem[]).map(kind => `<label><button type="button" id="battlefield-use-${kind}">${WAR_ITEMS[kind].name}</button><small> ${WAR_ITEMS[kind].description} · 180 giây</small></label>`).join('')}<p>Đến gần hoàn rơi trên đất để tự nhặt. Nhặt xong bấm loại hoàn để dùng; dùng lại làm mới thời gian.</p><p id="battlefield-status" role="status"></p><p id="battlefield-error" role="alert"></p>`;
  const hud = document.createElement('div'); hud.id = 'battlefield-hud'; hud.hidden = true;
  const input = (id: string) => panel.querySelector<HTMLInputElement>('#battlefield-' + id)!;
  const button = (id: string) => panel.querySelector<HTMLButtonElement>('#battlefield-' + id)!;
  const setOpen = (open: boolean) => { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); if (open) { const arena = document.getElementById('combat-sandbox') as HTMLDetailsElement | null; if (arena) arena.open = false; const sim = document.getElementById('sim-panel'); if (sim) sim.hidden = true; document.getElementById('sim-toggle')?.setAttribute('aria-expanded', 'false'); } };
  toggle.onclick = () => setOpen(Boolean(panel.hidden));
  button('close').onclick = () => setOpen(false);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
  function act(fn: () => unknown) { try { fn(); input('error').textContent = ''; } catch (error) { input('error').textContent = error instanceof Error ? error.message : String(error); } render(); }
  button('start').onclick = () => act(() => match.start(input('player').value as Team, { song: +input('boss-song').value, jin: +input('boss-jin').value }));
  button('reset').onclick = () => act(() => match.reset());
  const ratios = { song: Object.fromEntries(ARMY_FACTIONS.map(key => [key, 10])), jin: Object.fromEntries(ARMY_FACTIONS.map(key => [key, 10])) };
  let selectedTeam: Team = 'song';
  const readRatios = () => Object.fromEntries(ARMY_FACTIONS.map(key => [key, Number(input('ratio-' + key).value)]));
  function previewComposition() {
    ratios[selectedTeam] = readRatios();
    const sum = Object.values(ratios[selectedTeam]).reduce((total, value) => total + value, 0);
    try {
      const halves = splitArmyTotal(+input('count').value);
      const counts = distributeArmy(halves[selectedTeam], ratios[selectedTeam]);
      input('composition').textContent = `Tổng ${halves.song + halves.jin} SIM = ${halves.song} Tống + ${halves.jin} Kim · Tỉ lệ ${TEAM_NAMES[selectedTeam]} ${sum}% · ` + armyFactions.map(f => `${f.n}: ${counts[f.key]}`).join(' · ');
    } catch (error) { input('composition').textContent = `Tổng ${sum}% · ${error instanceof Error ? error.message : error}`; }
  }
  for (const key of ARMY_FACTIONS) input('ratio-' + key).oninput = previewComposition;
  input('count').oninput = previewComposition;
  input('team').onchange = () => {
    ratios[selectedTeam] = readRatios(); selectedTeam = input('team').value as Team;
    for (const key of ARMY_FACTIONS) input('ratio-' + key).value = String(ratios[selectedTeam][key]);
    previewComposition();
  };
  let adding = false;
  button('add').onclick = async () => {
    adding = true; render();
    try { ratios[selectedTeam] = readRatios(); await match.addBothAsync({ compositions: { song: { ...ratios.song }, jin: { ...ratios.jin } }, faction: 'shaolin', equipped: input('equipped').checked, level: +input('level').value, strength: input('strength').value, count: +input('count').value } as BothArmyBuild, (done, total) => { input('error').textContent = `Đang tạo quân ${done}/${total}…`; render(); }); input('error').textContent = ''; }
    catch (error) { input('error').textContent = error instanceof Error ? error.message : String(error); }
    finally { adding = false; render(); }
  };
  for (const kind of Object.keys(WAR_ITEMS) as WarItem[]) button('use-'+kind).onclick = () => act(() => rewards?.use(kind));
  function render() {
    const state = match.state, seconds = Math.ceil(state.remaining), time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    const reward = rewards?.state;
    input('merit').textContent = reward ? `${reward.title} · ${reward.points} quân trạng${reward.next ? ` · Mốc tiếp theo ${reward.next}` : ' · Chức hiệu cao nhất'}` : '';
    for(const kind of Object.keys(WAR_ITEMS) as WarItem[]) {
      button('use-'+kind).disabled = !match.running || !reward?.inventory[kind] || !!state.playerRespawn;
      button('use-'+kind).textContent = `${WAR_ITEMS[kind].name} (${reward?.inventory[kind] || 0})${reward?.buffs[kind] ? ` · Còn ${Math.ceil(reward.buffs[kind])}s` : ''}`;
    }
    button('add').disabled = !match.running || adding;
    button('start').disabled = adding;
    for (const id of ['player', 'boss-song', 'boss-jin']) input(id).disabled = match.active;
    hud.hidden = !match.active;
    hud.textContent = `${time} · ${TEAM_NAMES[state.team]}${reward ? ` · ${reward.title} ${reward.points}` : ''} · Tống ${state.score.song} : ${state.score.jin} Kim${state.result ? ' · ' + state.result : ''}${state.playerRespawn ? ` · Hồi sinh ${Math.ceil(state.playerRespawn)}s` : ''}`;
    input('status').textContent = state.phase === 'idle' ? 'Chọn phe và hệ boss rồi bắt đầu. Tổng SIM chia đều cho Tống và Kim.' : `${state.result || 'Đang giao chiến'} · Còn ${time}\n` + (['song', 'jin'] as const).map(side => {
      const army = state.armies[side]; return `${TEAM_NAMES[side]}: ${army.alive}/${army.count} SIM · Boss ${Math.ceil(army.bossHP).toLocaleString('vi-VN')}/${Math.ceil(army.bossMax).toLocaleString('vi-VN')} HP`;
    }).join('\n') + `\nBinh sĩ hai phe: ${state.monsters.alive}/${state.monsters.count}`;
  }
  document.head.appendChild(style); document.body.appendChild(toggle); document.body.appendChild(panel); document.body.appendChild(hud);
  previewComposition(); render(); return { render };
}
