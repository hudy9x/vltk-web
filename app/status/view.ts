import { ATTR_NAMES, fmt } from './model';
import type { Metric, StatusModel } from './model';
export const escape = (text: unknown): string => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const sources = (items: string[]) => items.length ? '<ul>' + items.map(item => `<li>${escape(item)}</li>`).join('') + '</ul>' : '<span class="sl-muted">Không có nguồn cộng thêm trong nhánh này.</span>';
const kindNames: Record<string, string> = { equipment: 'Trang bị', skill: 'Kỹ năng / buff đang có hiệu lực', ally: 'Buff đồng đội', inactive: 'Trang bị chưa kích hoạt', title: 'Danh hiệu', collection: 'Bộ sưu tập' };
function table(rows: Metric[]): string {
  return `<div class="sl-scroll"><table><thead><tr><th>Chỉ số</th><th>Giá trị cuối</th><th>Công thức và nguồn</th></tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${escape(row.name)}</th><td class="sl-value">${escape(row.value)}</td><td>${escape(row.formula)}${sources(row.sources)}</td></tr>`).join('')}</tbody></table></div>`;
}
export function renderStatus(model: StatusModel): string {
  return `<p class="sl-context">${escape(model.owner)} · <b>${escape(model.skill)}</b><br>Mục tiêu tính kháng: <b>${escape(model.target)}</b></p>
    ${table(model.metrics)}
    <details><summary>Hiệu ứng thực tế đang áp trên mục tiêu</summary>${model.actual.length ? table(model.actual) : '<p>Chọn một quái / SIM để xem hiệu ứng đang có.</p>'}</details>
    <details open><summary>Băng sát được tổng hợp từ đâu?</summary>${table(model.coldSteps)}<p>${escape(model.potentials)}</p></details>
    <details><summary>Nguồn chỉ số: từng món đồ, kỹ năng và buff</summary><div class="sl-scroll"><table><thead><tr><th>Nguồn</th><th>Giá trị thực được cộng</th></tr></thead><tbody>${model.sources.map(source => `<tr><th scope="row">${escape(source.name)}${source.level ? ` · cấp ${source.level}` : ''}<small>${escape(kindNames[source.kind] || source.kind)}${source.id != null ? ` · ${escape(source.id)}` : ''}</small></th><td>${source.kind === 'inactive' ? 'Không đủ điều kiện trang bị: không cộng chỉ số.' : Object.entries(source.values).map(([key, n]) => `${escape(ATTR_NAMES[key] || (key.startsWith('skillLevel:') ? 'Cấp riêng kỹ năng ' + key.slice(11) : key))}: <b>${n > 0 ? '+' : ''}${fmt(n)}</b>`).join('<br>') || 'Không cộng trực tiếp các chỉ số đang theo dõi.'}</td></tr>`).join('') || '<tr><td colspan="2">Chưa có đồ / kỹ năng hỗ trợ.</td></tr>'}</tbody></table></div></details>
    <details><summary>Choáng / băng từ các nhánh phụ của chiêu</summary><div class="sl-scroll"><table><thead><tr><th>Nhánh</th><th>Tỉ lệ choáng</th><th>Thời gian choáng</th><th>Băng</th></tr></thead><tbody>${model.events.map(event => `<tr><th>${escape(event.name)}</th><td>${escape(event.chance)}</td><td>${escape(event.duration)}</td><td>${escape(event.cold)}</td></tr>`).join('') || '<tr><td colspan="4">Chiêu hiện tại không có nhánh phụ đang mở.</td></tr>'}</tbody></table></div></details>
    <details><summary>Chỉ số chống hiệu ứng khi người chơi bị đánh</summary>${table(model.defense)}</details>
    <details><summary>Thuốc, vật phẩm và buff đang có</summary>${sources(model.consumables)}<p>Thuốc hồi máu / nội lực chỉ hồi tài nguyên; thuốc kinh nghiệm / may mắn không trực tiếp đổi bốn chỉ số. Vật phẩm cộng tiềm năng / kỹ năng thể hiện qua điểm đã phân bổ và cấp hiệu lực phía trên.</p></details>
    <details><summary>Cách đọc các chỉ số</summary>${sources(model.notes)}</details>`;
}
export const styles = `
#status-log-toggle{position:fixed;right:8px;top:8px;z-index:90000;min-height:34px;padding:5px 10px;font:inherit;color:#f3edc8;background:#34412d;border:1px solid #a6ad80;border-radius:3px;cursor:pointer}
#status-log-panel{position:fixed;right:8px;top:50px;z-index:90002;width:min(900px,calc(100vw - 16px));max-height:calc(100dvh - 62px);overflow:auto;box-sizing:border-box;background:#182018;color:#eee4c6;border:1px solid #9e9165;border-radius:4px;box-shadow:0 6px 24px #0009;font:13px/1.5 inherit}
#status-log-panel[hidden],#status-log-toggle[hidden]{display:none}
#status-log-panel header{position:sticky;top:0;z-index:1;background:#293224;border-bottom:1px solid #8d825c;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}
#status-log-panel h2{font-size:16px;margin:0}#status-log-panel h3{font-size:14px}#status-log-panel button,#status-log-panel select{font:inherit;color:#eee4c6;background:#202b1e;border:1px solid #89916c;border-radius:3px;padding:5px 8px}
#status-log-panel button{cursor:pointer}#status-log-panel button:focus-visible,#status-log-toggle:focus-visible{outline:2px solid #f0cb68;outline-offset:2px}
#status-log-content,#status-log-history{padding:0 12px 12px}#status-log-controls{display:flex;flex-wrap:wrap;gap:8px;padding:12px}#status-log-controls label{display:flex;gap:5px;align-items:center}#status-log-controls select{max-width:min(320px,70vw)}
#status-log-panel table{width:100%;border-collapse:collapse;margin:8px 0}#status-log-panel th,#status-log-panel td{padding:8px;text-align:left;vertical-align:top;border-bottom:1px solid #58634580}#status-log-panel thead{color:#d3c089}#status-log-panel th{font-weight:500}
#status-log-panel .sl-value{white-space:nowrap;color:#9ce4c4;font-weight:600}#status-log-panel small{display:block;color:#a8ad91}#status-log-panel ul{padding-left:18px;margin:6px 0}#status-log-panel p{margin:10px 0}#status-log-panel summary{cursor:pointer;padding:8px 0;color:#d7c99f}#status-log-panel details{border-bottom:1px solid #4e5b4080}#status-log-panel .sl-muted{display:block;color:#a8ad91;font-size:12px}#status-log-panel .sl-scroll{overflow-x:auto}#status-log-history li{margin:7px 0}#status-log-notice{padding:0 12px;color:#d8ca9d}
@media(max-width:600px){#status-log-panel table{min-width:580px}#status-log-panel header{padding:8px}#status-log-panel h2{font-size:14px}}
`;
