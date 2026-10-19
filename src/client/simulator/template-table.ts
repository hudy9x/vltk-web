import type { SimulatorTemplate } from './types';

export function renderTemplateTable(templates: readonly SimulatorTemplate[], factionName: (id: string) => string,
  skillName: (id: number | string) => string, escape: (value: string) => string): string {
  const rows = templates.map(template => `<tr><td>${escape(template.name)}<small>Cấp ${template.profile.lvl}</small></td><td>${escape(factionName(template.profile.fac))}<small>${escape(skillName(template.profile.main))} · cấp ${template.profile.sk[template.profile.main] || 1}</small></td><td><button type="button" data-template-create="${escape(template.id)}" aria-label="Tạo SIM từ ${escape(template.name)}">Tạo SIM</button> <button type="button" data-template-delete="${escape(template.id)}" aria-label="Xóa template ${escape(template.name)}">Xóa</button></td></tr>`).join('');
  return `<table aria-label="Template SIM đã lưu"><thead><tr><th>Template</th><th>Môn phái / Chiêu</th><th>Thao tác</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Chưa có template đã lưu.</td></tr>'}</tbody></table>`;
}
