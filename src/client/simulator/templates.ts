import { clone } from './diagnostics';
import type { SimulatorTemplate } from './types';

export const TEMPLATE_STORAGE_KEY = 'jxidle_sim_templates';
interface TemplateStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** The managed jxidle_ key is synchronized to SQLite by client/bootstrap.js. */
export function createTemplateStore(storage: TemplateStorage) {
  let sequence = 0;
  function list(): SimulatorTemplate[] {
    try {
      const value: unknown = JSON.parse(storage.getItem(TEMPLATE_STORAGE_KEY) || '[]');
      if (!Array.isArray(value)) return [];
      return value.filter((item): item is SimulatorTemplate => !!item && item.version === 1 &&
        typeof item.id === 'string' && typeof item.name === 'string' && item.profile &&
        typeof item.profile.fac === 'string' && item.profile.attr && item.profile.sk).map(clone);
    } catch { return []; }
  }
  function save(name: string, data: Omit<SimulatorTemplate, 'id' | 'name' | 'version' | 'updatedAt'>): SimulatorTemplate {
    name = name.trim();
    if (!name || name.length > 80) throw new Error('Tên template cần từ 1 đến 80 ký tự.');
    const templates = list(), old = templates.find(template => template.name === name);
    let id = old?.id;
    while (!id || templates.some(template => template.id === id && template !== old)) id = `tpl-${Date.now().toString(36)}-${++sequence}`;
    const template: SimulatorTemplate = { ...clone(data), version: 1, id, name, updatedAt: new Date().toISOString() };
    const next = templates.filter(item => item.id !== id).concat(template);
    const json = JSON.stringify(next);
    if (json.length > 1_900_000) throw new Error('Kho template đã đầy.');
    storage.setItem(TEMPLATE_STORAGE_KEY, json);
    return clone(template);
  }
  function remove(id: string): void {
    const templates = list();
    if (!templates.some(template => template.id === id)) throw new Error('Template không tồn tại.');
    storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates.filter(template => template.id !== id)));
  }
  return { list, save, remove };
}
