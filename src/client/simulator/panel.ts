import type { Faction } from './types';

interface SimulatorElements {
  'sim-roster': HTMLSelectElement;
  'sim-list': HTMLUListElement;
  'sim-build': HTMLDivElement;
  'sim-templates': HTMLDivElement;
  'sim-template-name': HTMLInputElement;
  'sim-template-save': HTMLButtonElement;
  'sim-status': HTMLParagraphElement;
  'sim-faction': HTMLSelectElement;
  'sim-skill': HTMLSelectElement;
  'sim-health': HTMLSelectElement;
  'sim-auto-skills': HTMLInputElement;
  'sim-auto-potential': HTMLInputElement;
  'sim-farm': HTMLInputElement;
  'sim-pk': HTMLInputElement;
  'sim-create': HTMLButtonElement;
  'sim-remove': HTMLButtonElement;
  'sim-info': HTMLParagraphElement;
}

/** Independent developer panel. Closing it never changes a running simulation. */
export function mountSimulatorPanel(content: string) {
  const style = document.createElement('style');
  style.textContent = `
    #sim-toggle{position:fixed;top:8px;left:60px;z-index:90000;min-width:44px;min-height:34px;padding:5px 10px;font-family:inherit;font-size:14px;cursor:pointer}
    body:has(#sim-toggle) #quick-sale-toggle{left:112px}
    #sim-toggle,#sim-panel button{background:linear-gradient(#5d684d,#2e3825);border:1px solid #a6ad80;color:#f3edc8;border-radius:3px;cursor:pointer}
    #sim-toggle[aria-expanded="true"]{background:linear-gradient(#8a7a5a,#4e4330);border-color:#b4a77a}
    #sim-toggle:focus-visible,#sim-panel button:focus-visible{outline:2px solid #e8c860;outline-offset:2px}
    #sim-panel{position:fixed;top:50px;left:8px;z-index:90001;width:min(420px,calc(100vw - 16px));max-height:calc(100dvh - 62px);overflow:auto;box-sizing:border-box;padding:12px;color:#efdfb0;background:#17201bf5;border:1px solid #9f8c51;border-radius:4px;font-family:inherit;font-size:13px;box-shadow:0 4px 22px #000}
    #sim-panel[hidden]{display:none}
    #sim-panel header{display:flex;justify-content:space-between;align-items:center;font-weight:bold;margin-bottom:10px}
    #sim-panel button{padding:6px;font:inherit}
    #sim-panel label{display:block;margin:7px 0}
    #sim-panel input,#sim-panel select,#sim-panel textarea{max-width:100%;background:#101a14;color:#efdfb0;border:1px solid #78825a;padding:5px}
    #sim-panel select{width:100%}
    #sim-templates{overflow-x:auto;margin-top:10px}#sim-templates table{width:100%;border-collapse:collapse;font-size:12px}#sim-templates th,#sim-templates td{padding:6px 3px;text-align:left;border-bottom:1px solid #78825a55;overflow-wrap:anywhere}#sim-templates small{display:block;margin-top:4px;color:#b5bb9b}#sim-templates td:last-child{min-width:76px}
    #sim-build table{width:100%;border-collapse:collapse;font-size:12px}#sim-build th,#sim-build td{padding:4px;text-align:left;border-bottom:1px solid #78825a55}#sim-build input{width:65px;box-sizing:border-box}#sim-build td:first-child{overflow-wrap:anywhere}
    #sim-panel h3{font-size:14px;margin:12px 0 8px}
    #sim-list{list-style:none;padding:0;max-height:220px;overflow:auto}#sim-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;padding:7px 0;border-bottom:1px solid #78825a55}#sim-list li>button:first-child{text-align:left;overflow-wrap:anywhere}#sim-list li>span{grid-column:1;font-size:11px}#sim-list li>button:last-child{grid-column:2;grid-row:1 / 3}#sim-list li[aria-current="true"]>button:first-child{border-color:#e8c860}
  `;
  document.head.appendChild(style);
  const toggle = document.createElement('button');
  toggle.id = 'sim-toggle'; toggle.type = 'button'; toggle.textContent = 'SIM';
  toggle.setAttribute('aria-controls', 'sim-panel'); toggle.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('section');
  panel.id = 'sim-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'Simulator');
  panel.innerHTML = '<header><span>SIM · Nhân vật mô phỏng</span><button id="sim-close" type="button" aria-label="Đóng SIM">×</button></header>' + content;
  function setOpen(open: boolean): void {
    panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      const gm = document.getElementById('gm-panel');
      if (gm) gm.hidden = true;
      document.getElementById('gm-toggle')?.setAttribute('aria-expanded', 'false');
    }
  }
  toggle.onclick = () => setOpen(Boolean(panel.hidden));
  panel.querySelector<HTMLButtonElement>('#sim-close')!.onclick = () => { setOpen(false); toggle.focus(); };
  document.getElementById('gm-toggle')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  document.body.appendChild(toggle); document.body.appendChild(panel);
  function field<K extends keyof SimulatorElements>(id: K): SimulatorElements[K] {
    return panel.querySelector<SimulatorElements[K]>('#' + id)!;
  }
  return { panel, toggle, field };
}

export const SIM_HEALTH_PRESETS = [20_000, 50_000, 100_000, 500_000, 1_000_000, 10_000_000, 20_000_000, 100_000_000] as const;

export function renderSimulatorControls(factions: readonly Faction[], escapeHTML: (text: string) => string): string {
  return `<h3>Danh sách SIM đang có</h3><ul id="sim-list" aria-label="Danh sách SIM đang có"></ul><label>SIM đang chỉnh sửa <select id="sim-roster"></select></label><label>Môn phái <select id="sim-faction">${factions.filter(f => !f.novice && f.skills?.length).map(f => `<option value="${f.key}">${escapeHTML(f.n)}</option>`).join("")}</select></label><label>Máu tối đa <select id="sim-health"><option value="">Theo chỉ số nhân vật</option>${SIM_HEALTH_PRESETS.map(hp => `<option value="${hp}">${hp >= 1_000_000 ? hp / 1_000_000 + "m" : hp / 1_000 + "k"}</option>`).join("")}</select></label><small>Áp dụng riêng cho SIM được chọn; đổi mức máu sẽ hồi đầy HP.</small><label>Chiêu thức <select id="sim-skill"></select></label><label><input id="sim-auto-skills" type="checkbox"> Tự cộng kỹ năng</label><label><input id="sim-auto-potential" type="checkbox"> Tự cộng tiềm năng</label><button type="button" id="sim-create">Tạo thêm SIM</button> <button type="button" id="sim-remove">Xóa SIM được chọn</button><label><input id="sim-farm" type="checkbox"> SIM tự đánh quái</label><label><input id="sim-pk" type="checkbox"> SIM tự PK người chơi (ưu tiên hơn quái)</label><p id="sim-info" role="status"></p><details><summary>Điểm tiềm năng và kỹ năng của SIM được chọn</summary><div id="sim-build"></div></details><h3>Template SIM</h3><label>Tên template <input id="sim-template-name" maxlength="80" placeholder="Ví dụ: Võ Đang kiếm 9x"></label><button id="sim-template-save" type="button">Lưu template</button><div id="sim-templates"></div><p id="sim-status" role="status"></p>`;
}
