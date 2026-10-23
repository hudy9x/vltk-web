import type { StorageOperation } from './types.ts';

// Read both legacy saves and the { d: JSON, h: checksum } browser envelope.
function rebirthCount(value: string | undefined): number {
  if (!value) return 0;
  let state;
  try {
    state = JSON.parse(value);
    if (typeof state?.d === 'string' && typeof state?.h === 'string') state = JSON.parse(state.d);
  } catch { return 0; }
  const count = state?.rw?.stat?.reborn ?? 0;
  if (!Number.isSafeInteger(count) || count < 0)
    throw Object.assign(new Error('Invalid rebirth count'), { status: 400 });
  return count;
}

export function assertRebirthDisabled(operations: StorageOperation[], entries: Record<string, string>): void {
  for (const { key, value } of operations) {
    if (value === null || !/^jxidle(?:_[0-9]+)?(?:_bak)?$/.test(key)) continue;
    const slot = key.replace(/_bak$/, '');
    // A backup can legitimately lag behind the main save, or be restored to it.
    const previous = Math.max(rebirthCount(entries[slot]), rebirthCount(entries[slot + '_bak']));
    if (rebirthCount(value) > previous)
      throw Object.assign(new Error('Tính năng chuyển sinh hiện đã tắt.'), { status: 403 });
  }
}
