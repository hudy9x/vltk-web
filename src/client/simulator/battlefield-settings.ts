export interface BattlefieldSettings {
  version: 1;
  fields: Record<string, string | boolean>;
  ratios: Record<'song' | 'jin', Record<string, number>>;
}
interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Managed keys are loaded from SQLite before the game starts and written through
 * bootstrap's durable outbox. Scope settings to the current character slot.
 */
export function createBattlefieldSettingsStore(storage: SettingsStorage) {
  function key() {
    const slot = storage.getItem('jxidle_slot');
    return 'jxidle_battlefield_settings_' + (/^\d+$/.test(slot || '') ? slot : 'default');
  }
  function load(): BattlefieldSettings | null {
    const raw = storage.getItem(key());
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !value.fields || !value.ratios?.song || !value.ratios?.jin)
      throw new Error('Cấu hình Chiêu mộ sứ đã lưu không hợp lệ.');
    return value;
  }
  function save(settings: BattlefieldSettings) {
    storage.setItem(key(), JSON.stringify(settings));
  }
  return { key, load, save };
}
