import { createSourceCollector, explainStatus, fmt } from './model';
import type { Legacy, Source, StatusInput, StatusModel } from './model';
import { escape, renderStatus, styles } from './view';

declare var o: Legacy, l: Legacy, T: Record<string, Legacy>, m0: number;
declare var f8: number, Od: number, Ed: number, gD: number, uD: Record<string, number>, cw: number, s7: number;
declare function j0(equipment?: Legacy, trace?: ReturnType<typeof createSourceCollector>['capture']): Legacy;
declare function b0(skill: Legacy, attribute: string, level: number): number[] | null;
declare function F5(skill: Legacy): Legacy[];
declare function S5(skill: Legacy, event: Legacy): Record<string, number>;
declare function Rn(target: Legacy): Legacy | null;
declare function ja(base: number, kind: string, from: number, to: number, resistance: Record<string, number>, cap: number, series: number): number;
declare function Vi(skill: Legacy): boolean;
declare function nm(): unknown;
declare function bo(): unknown;
const slotNames: Record<string, string> = { weapon: 'Vũ khí', armor: 'Áo', helm: 'Mũ', boots: 'Giày', belt: 'Đai', amulet: 'Dây chuyền', ring1: 'Nhẫn trái', ring2: 'Nhẫn phải', horse: 'Ngựa' };

function trackedProfile(): Legacy {
  const equipment = Object.fromEntries(Object.entries(o.eq || {}).map(([slot, item]) => [slot, item &&
    Object.fromEntries(['n', 'd', 'k', 's', 'enh', 'plv', 'pv3', 'base', 'mag', 'ext', 'leg', 'set', 'vio', 'req'].map(key => [key, (item as Legacy)[key]]))]));
  return { owner: `${typeof m0 === 'undefined' ? '' : m0}|${o.fac}|${o.name}`, potential: o.attr, skills: o.sk,
    equipment, buffs: { assumed: l.buffAssume, off: o.auraOff,
      active: Object.keys(o.sk || {}).filter(id => T[id] && Vi(T[id])), party: typeof nm === 'function' ? nm() : [] },
    consumables: { count: o.potUsed || 0, items: o.useN, active: Object.fromEntries(Object.entries(o.buf || {}).filter(([, b]) => (b as Legacy).until > Date.now())) },
    points: { potential: o.attrPts, skills: o.skPts }, title: typeof bo === 'function' ? bo() : null,
    main: o.main, locked: o.mainLock, slots: o.slots,
    // These include bonuses not represented by the allocations/equipment alone.
    final: l.P && [l.P.dmgMul, l.P.stunLong, l.P.stunAdd, l.P.coldEnh, l.P.skillEnh, l.P.eng, l.P.res?.cold, l.P.antiStun, l.P.freezeRed, l.P.stunRed] };
}
function labelSources(sources: Source[]): Source[] {
  return sources.map(source => ({ ...source,
    name: source.kind === 'equipment' || source.kind === 'inactive' ? `${slotNames[String(source.id)] || source.id} · ${source.name}` : source.name || String(source.id) }));
}
function inputFor(stats: Legacy, sources: Source[], skill: Legacy, target: Legacy | null): StatusInput {
  const physical = !!(skill.basic || T[skill.id] && b0(T[skill.id], 'physicsenhance_p', skill.L));
  const curse = target && typeof Rn === 'function' ? Rn(target) : null;
  const baseResistance = target?.res?.cold || 0, penetration = stats.anti?.cold || 0, broken = target?.resBrkT > 0 ? 10 : 0;
  const res = { cold: baseResistance - penetration - broken + (curse?.res?.cold || 0) };
  const cap = stats.antiMax ? Math.max(0, 75 - stats.antiMax / 4) : 75;
  const resistanceFactor = target ? ja(1, 'cold', skill.series, target.series, res, cap, skill.series5 || 0) : 1;
  const now = Date.now();
  const consumables = [`Thuốc hồi máu / nội lực đã dùng: ${o.potUsed || 0} lần. Không cộng tỉ lệ choáng, thời gian choáng, thời gian băng hay băng sát.`];
  const names: Record<string, string> = { xp: 'Kinh nghiệm', tt: 'Tiên Thảo Lộ', tt2: 'Thuốc kinh nghiệm', luck: 'May mắn', luck2: 'May mắn', drop: 'Tỉ lệ rơi đồ' };
  for (const [key, entry] of Object.entries(o.buf || {})) {
    const buff = entry as Legacy;
    if (buff.until > now) consumables.push(`${names[key] || key}: +${fmt(buff.p)}; hết lúc ${new Date(buff.until).toLocaleTimeString('vi-VN')}. Không trực tiếp tăng bốn hiệu ứng.`);
  }
  for (const [key, count] of Object.entries(o.useN || {})) consumables.push(`Vật phẩm đã dùng ${key}: ${count} lần; tác dụng cộng điểm phản ánh qua phân bổ tiềm năng / kỹ năng.`);
  const skillBonusSources: string[] = [];
  for (const [id, learned] of Object.entries(o.sk || {})) {
    const data = T[id];if (!learned || !data) continue;
    const level = Number(learned) + (stats.plusSkill || 0) + (stats.skAdd?.[id] || 0);
    for (const key of Object.keys(data.attr || {}).filter(key => key.startsWith('addskilldamage'))) {
      const parts = b0(data, key, level);
      if (parts && parts[0] === +skill.id) skillBonusSources.push(`${data.n} cấp ${level}: +${fmt(parts[2])}% sát thương riêng cho chiêu.`);
    }
  }
  return { owner: o.name || o.fac, profile: o, stats, skill, sources: labelSources(sources), physical,
    skillCold: !skill.basic && T[skill.id] ? b0(T[skill.id], 'colddamage_v', skill.L) : null, energyScaling: !!s7,
    target: target ? target.n || 'Quái / SIM được chọn' : 'Chưa có mục tiêu — minh họa với 0% kháng', resistanceFactor,
    resistanceSources: target ? [
      `Kháng băng mục tiêu ${fmt(baseResistance)}% − xuyên kháng ${fmt(penetration)}% − phá kháng ${broken}% + lời nguyền ${fmt(curse?.res?.cold || 0)}%.`,
      `Sau khắc hệ (tham số ${fmt(skill.series5 || 0)}) và giới hạn −${fmt(cap)}…${fmt(Math.min(cap, cw))}%: kháng hiệu dụng ${fmt((1 - resistanceFactor) * 100)}%.`,
      `Băng sát của chiêu ${fmt(skill.parts?.cold || 0)} × ngẫu nhiên 0,85…1,15 × hệ số sau kháng ${fmt(resistanceFactor)}.`,
    ] : ['Chưa chọn quái: không giả định đây là kết quả thực chiến. Chọn mục tiêu để đưa kháng / xuyên kháng / khắc hệ vào công thức.'],
    defaultCold: f8, naturalStunChance: Od, naturalStunSeconds: Ed, incomingStunSeconds: gD,
    targetBoss: target?.cls === 'boss',
    actualTarget: target,
    incomingStunChances: { 'quái thường': 0, 'tinh anh': uD.elite || 0, 'trùm': uD.boss || 0 },
    skillBonusSources, consumables,
    events: typeof F5 === 'function' ? F5(skill).filter(event => !event.fxOnly).map(event => ({ name: event.n || 'Nhánh phụ', chance: event.chance,
      skill: { ...skill, parts: S5(skill, event), stun: event.stun || 0 } })) : [],
  };
}

/** Standalone panel; does not replace the combat log or change a combat setting. */
export function mountStatusInspector() {
  const style = document.createElement('style');style.textContent = styles;document.head.appendChild(style);
  const toggle = document.createElement('button');toggle.id = 'status-log-toggle';toggle.type = 'button';toggle.textContent = '❄ Hiệu ứng';toggle.hidden = true;
  toggle.setAttribute('aria-controls', 'status-log-panel');toggle.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('section');panel.id = 'status-log-panel';panel.hidden = true;panel.setAttribute('aria-label', 'Log chỉ số choáng và băng sát');
  panel.innerHTML = `<header><h2>Choáng & băng sát · Log chỉ số</h2><button id="status-log-close" type="button" aria-label="Đóng log hiệu ứng">Đóng ×</button></header>
    <div id="status-log-controls"><label>Chiêu <select id="status-log-skill"><option value="auto">Chiêu đang dùng</option></select></label><label>Mục tiêu <select id="status-log-target"><option value="auto">Theo mục tiêu đang chọn</option></select></label><button id="status-log-refresh" type="button">Cập nhật</button></div>
    <p id="status-log-notice" role="status">Cập nhật khi thay đổi chỉ số; kiểm tra mỗi 250 ms khi mở.</p><div id="status-log-content"></div>
    <div id="status-log-history"><h3>Thay đổi khi bảng đang mở</h3><button id="status-log-clear" type="button">Xóa lịch sử</button><ol id="status-log-changes"></ol></div>`;
  document.body.appendChild(toggle);document.body.appendChild(panel);
  const field = <T extends HTMLElement>(id: string) => panel.querySelector<T>('#' + id)!;
  const skillSelect = field<HTMLSelectElement>('status-log-skill'), targetSelect = field<HTMLSelectElement>('status-log-target');
  const content = field('status-log-content'), notice = field('status-log-notice'), changes = field('status-log-changes');
  let previous: Legacy | null = null, signature = '', rendered = '', skillOptions = '', targetOptions = '', owner = '';
  let stats: Legacy | null = null, sources: Source[] = [], latest: StatusModel | null = null;
  const history: string[] = [], ids = new WeakMap<object, string>();let nextId = 0;
  const targetId = (target: object) => { if (!ids.has(target)) ids.set(target, String(++nextId));return ids.get(target)!; };
  const updateHistory = () => { changes.innerHTML = history.map(line => `<li>${escape(line)}</li>`).join(''); };
  function setOpen(open: boolean) {
    panel.hidden = !open;toggle.setAttribute('aria-expanded', String(open));
    if (open) refresh();
  }
  function refresh(force = false) {
    const playing = typeof o !== 'undefined' && !!o?.fac;
    toggle.hidden = !playing;
    if (!playing) { setOpen(false);previous = null;signature = '';owner = '';return; }
    if (panel.hidden) return;
    try {
      const state = trackedProfile();
      if (state.owner !== owner) {
        owner = state.owner;previous = null;signature = '';history.length = 0;rendered = '';stats = null;
        skillSelect.value = targetSelect.value = 'auto';updateHistory();
      }
      const nextSignature = JSON.stringify(state), changed = nextSignature !== signature;
      let pendingChange = '';
      if (changed || force || !stats) {
        const trace = createSourceCollector();stats = j0(undefined, trace.capture);sources = trace.sources;
        const reasons: string[] = [];
        if (previous) for (const [key, label] of Object.entries({ potential: 'Tiềm năng', skills: 'Kỹ năng', equipment: 'Mặc / tháo / thay đổi đồ', buffs: 'Buff / vòng sáng', consumables: 'Thuốc / vật phẩm', points: 'Điểm chưa phân bổ', title: 'Danh hiệu', main: 'Đổi chiêu', final: 'Chỉ số tổng hợp' })) {
          if (JSON.stringify(previous[key]) !== JSON.stringify(state[key])) reasons.push(label);
        }
        if (previous) {
          const names: Record<string, string> = { str: 'Sức mạnh', dex: 'Thân pháp', vit: 'Sinh khí', eng: 'Nội công' };
          for (const key of Object.keys(names)) if (previous.potential?.[key] !== state.potential?.[key])
            reasons.push(`${names[key]} ${previous.potential?.[key] || 0} → ${state.potential?.[key] || 0}`);
          for (const id of new Set([...Object.keys(previous.skills || {}), ...Object.keys(state.skills || {})]))
            if (previous.skills?.[id] !== state.skills?.[id]) reasons.push(`${T[id]?.n || id}: cấp ${previous.skills?.[id] || 0} → ${state.skills?.[id] || 0}`);
          for (const slot of new Set([...Object.keys(previous.equipment || {}), ...Object.keys(state.equipment || {})]))
            if (JSON.stringify(previous.equipment?.[slot]) !== JSON.stringify(state.equipment?.[slot]))
              reasons.push(`${slotNames[slot] || slot}: ${previous.equipment?.[slot]?.n || 'Trống'} → ${state.equipment?.[slot]?.n || 'Trống'}`);
          if (previous.consumables?.count !== state.consumables?.count) reasons.push(`Số thuốc hồi đã dùng ${previous.consumables?.count || 0} → ${state.consumables?.count || 0}`);
        }
        signature = nextSignature;
        if (changed) {
          pendingChange = `${new Date().toLocaleTimeString('vi-VN')} · ${previous ? reasons.join(', ') || 'Cập nhật nhân vật' : 'Mốc hiện tại'}`;
        }
        previous = JSON.parse(nextSignature);
      }
      const calculated = stats!;
      const skills = [calculated.basic, ...(calculated.actives || [])].filter(Boolean);
      const options = '<option value="auto">Chiêu đang dùng</option>' + skills.map(skill => `<option value="${escape(String(skill.id))}">${escape(skill.n)} · cấp ${fmt(skill.L || 1)}</option>`).join('');
      if (options !== skillOptions) { const selected = skillSelect.value;skillSelect.innerHTML = options;skillOptions = options;skillSelect.value = [...skillSelect.options].some(option => option.value === selected) ? selected : 'auto'; }
      const skill = skills.find(skill => String(skill.id) === skillSelect.value) || calculated.main || calculated.basic;
      const enemies: Legacy[] = (l.enemies || []).filter((enemy: Legacy) => !enemy.dead && enemy.hp > 0);
      const targets = '<option value="auto">Theo mục tiêu đang chọn</option><option value="none">Minh họa: 0% kháng</option>' + enemies.map(enemy => `<option value="${targetId(enemy)}">${escape(enemy.n || 'Quái / SIM')} #${targetId(enemy)}</option>`).join('');
      if (targets !== targetOptions) { const selected = targetSelect.value;targetSelect.innerHTML = targets;targetOptions = targets;targetSelect.value = [...targetSelect.options].some(option => option.value === selected) ? selected : 'auto'; }
      const target = targetSelect.value === 'none' ? null : enemies.find(enemy => targetId(enemy) === targetSelect.value) || enemies.find(enemy => enemy === l.manTgt || enemy === l.clickedTarget) || enemies[0] || null;
      if (!skill) { content.textContent = 'Hãy chọn nhân vật và học một chiêu để xem chỉ số.';return; }
      latest = explainStatus(inputFor(calculated, sources, skill, target));
      if (pendingChange) {
        history.unshift(`${pendingChange} → ${latest.skill}: choáng ${latest.metrics[0].value} / ${latest.metrics[1].value}; băng ${latest.metrics[2].value}, chậm ${latest.metrics[3].value} (${latest.target}).`);
        history.splice(40);updateHistory();
      }
      const html = renderStatus(latest);
      if (html !== rendered) {
        const expanded = [...content.querySelectorAll('details')].map(detail => detail.open), scroll = panel.scrollTop;
        content.innerHTML = html;
        if (rendered) [...content.querySelectorAll('details')].forEach((detail, i) => detail.open = !!expanded[i]);
        panel.scrollTop = scroll;rendered = html;
      }
      notice.textContent = 'Đang theo dõi chỉ số. Chọn chiêu / quái để xem đúng công thức áp dụng.';
    } catch (error) {
      notice.textContent = 'Chưa đọc được chỉ số: ' + (error instanceof Error ? error.message : String(error));
    }
  }
  toggle.onclick = () => setOpen(Boolean(panel.hidden));
  field('status-log-close').onclick = () => { setOpen(false);toggle.focus(); };
  skillSelect.onchange = targetSelect.onchange = () => refresh();
  field('status-log-refresh').onclick = () => refresh(true);
  field('status-log-clear').onclick = () => { history.length = 0;updateHistory(); };
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { setOpen(false);toggle.focus(); } });
  const timer = setInterval(() => refresh(), 250);refresh();
  return { refresh, setOpen, panel, toggle, get model() { return latest; }, get history() { return [...history]; }, destroy() { clearInterval(timer);toggle.remove();panel.remove();style.remove(); } };
}
