import source from './potential-allocation.json';

type Weights = Record<'str' | 'dex' | 'vit' | 'eng', number>;
interface AllocationConfig {
  version: 1;
  equipmentFirst: boolean;
  preserveAllocatedPoints: true;
  defaults: Record<'external' | 'internal', Weights>;
  overrides: Record<string, Record<string, Weights>>;
}

export function validateConfig(value: unknown): AllocationConfig {
  const object = (input: unknown): Record<string, unknown> => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Cấu hình tiềm năng phải là object.');
    return input as Record<string, unknown>;
  };
  const root = object(value);
  if (root.version !== 1 || typeof root.equipmentFirst !== 'boolean' || root.preserveAllocatedPoints !== true)
    throw Error('Cấu hình tiềm năng cần version 1 và giữ nguyên điểm đã cộng.');
  const weights = (input: unknown, name: string) => {
    const row = object(input), keys = ['str', 'dex', 'vit', 'eng'];
    if (Object.keys(row).length !== keys.length || keys.some(key =>
      typeof row[key] !== 'number' || !Number.isFinite(row[key]) || (row[key] as number) < 0 || (row[key] as number) > 100) ||
      Math.abs(keys.reduce((sum, key) => sum + (row[key] as number), 0) - 100) > 1e-9)
      throw Error(`Tỷ lệ ${name} phải gồm str/dex/vit/eng, không âm và có tổng 100%.`);
  };
  const defaults = object(root.defaults);
  if (Object.keys(defaults).length !== 2) throw Error('Cần hai cấu hình chung external và internal.');
  for (const kind of ['external', 'internal']) weights(defaults[kind], kind);
  for (const [faction, routes] of Object.entries(object(root.overrides)))
    for (const [route, row] of Object.entries(object(routes))) weights(row, `${faction}.${route}`);
  return value as AllocationConfig;
}

export const config = validateConfig(source);
