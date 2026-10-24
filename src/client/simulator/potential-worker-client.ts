import { createPotentialStore } from './potential-cache';
import type { PotentialStore } from './potential-cache';
import type { LegacyRecord, SimulatorProfile } from './types';
declare const __POTENTIAL_WORKER_SOURCE__: string;
declare const __POTENTIAL_VERSION__: string;
declare function capturePotentialContext(profile: SimulatorProfile, world: LegacyRecord): PotentialInput;
export interface PotentialAllocation { attr: Record<string, number>; attrPts: number; sk?: Record<string,number>; skL?: LegacyRecord; skPts?: number; sk150Training?: number }
export interface PotentialInput { autoSkills?: boolean; autoPotential?: boolean; profile: SimulatorProfile; globals: LegacyRecord; world: LegacyRecord; external: LegacyRecord; window: LegacyRecord }
export interface PotentialWorker {
  onmessage: ((event: MessageEvent<{ id: number; result?: PotentialAllocation; error?: string }>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}
function browserWorker(): PotentialWorker {
  const url = URL.createObjectURL(new Blob([__POTENTIAL_WORKER_SOURCE__], { type: 'text/javascript' }));
  try { return new Worker(url, { name: 'vltk-potential' }); }
  finally { URL.revokeObjectURL(url); }
}
export function canonical(value: unknown): string {
  if (value === undefined) return 'null';
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  const tag = Object.prototype.toString.call(value);
  if (tag === '[object RegExp]') return JSON.stringify([(value as RegExp).source, (value as RegExp).flags]);
  if (tag === '[object Set]') return '["Set",' + [...value as Set<unknown>].map(canonical).sort().join(',') + ']';
  if (tag === '[object Map]') return '["Map",' + [...value as Map<unknown,unknown>].map(([key,entry]) => canonical([key,entry])).sort().join(',') + ']';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().filter(key => (value as LegacyRecord)[key] !== undefined)
    .map(key => JSON.stringify(key) + ':' + canonical((value as LegacyRecord)[key])).join(',') + '}';
}
async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function validAllocation(value: unknown, profile: SimulatorProfile, autoPotential = true, autoSkills = false): value is PotentialAllocation {
  const result = value as PotentialAllocation | undefined, keys = ['str','dex','vit','eng'];
  if (!result || !Number.isSafeInteger(result.attrPts) || result.attrPts !== (autoPotential ? 0 : profile.attrPts) || !result.attr) return false;
  if (!keys.every(key => Number.isSafeInteger(result.attr[key]) && result.attr[key] >= profile.attr[key])) return false;
  if (keys.reduce((sum,key) => sum + result.attr[key] - profile.attr[key], 0) !== profile.attrPts - result.attrPts) return false;
  if (autoSkills && (!result.sk || !result.skL || !Number.isSafeInteger(result.skPts) || result.skPts! < 0 || result.skPts! > profile.skPts ||
    !Object.values(result.sk).every(level => Number.isSafeInteger(level) && level >= 0))) return false;
  return true;
}
interface Options { factory?: () => PotentialWorker; store?: PotentialStore; version?: string; hash?: (value: string) => Promise<string> }
/** Cache identical work, serialize misses in one persistent worker; never execute the optimizer here. */
export function createPotentialClient(options: Options = {}) {
  const store = options.store || createPotentialStore(), hash = options.hash || digest;
  const memory = new Map<string, PotentialAllocation>(), requests = new Map<string, Promise<PotentialAllocation>>();
  const queue: { id: number; input: PotentialInput; resolve(value: PotentialAllocation): void; reject(error: Error): void }[] = [];
  let disposed = false;
  let worker: PotentialWorker | undefined, sequence = 0, active: typeof queue[number] | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined, sentCatalog: LegacyRecord | undefined;
  let previousGlobals: LegacyRecord | undefined, catalogHash = Promise.resolve('');
  function fail(error: Error) {
    if (timer !== undefined) clearTimeout(timer);
    worker?.terminate(); worker = undefined; sentCatalog = undefined;
    active?.reject(error); active = undefined;
    for (const job of queue.splice(0)) job.reject(error);
  }
  function pump() {
    if (active || !queue.length) return;
    try {
      if (!worker) {
        worker = (options.factory || browserWorker)();
        worker.onerror = worker.onmessageerror = () => fail(new Error('Không thể tính tiềm năng trong Worker. Hãy thử lại.'));
        worker.onmessage = ({ data }) => {
          if (!active || data.id !== active.id) return;
          if (timer !== undefined) clearTimeout(timer);
          const job = active; active = undefined;
          if (data.error || !validAllocation(data.result, job.input.profile, job.input.autoPotential !== false, !!job.input.autoSkills)) job.reject(new Error(data.error || 'Kết quả tiềm năng không hợp lệ.'));
          else job.resolve(data.result!);
          pump();
        };
      }
      active = queue.shift()!;
      if (sentCatalog !== active.input.globals) {
        worker.postMessage({ kind: 'init', catalog: active.input.globals }); sentCatalog = active.input.globals;
      }
      const { globals: _globals, ...input } = active.input;
      worker.postMessage({ kind: 'optimize', id: active.id, input });
      timer = setTimeout(() => fail(new Error('Tính tiềm năng quá thời gian. Hãy thử lại.')), 120_000);
    } catch { fail(new Error('Worker không khả dụng. Không thể chuẩn bị nhân vật.')); }
  }
  function remember(key: string, result: PotentialAllocation) {
    memory.delete(key); memory.set(key, result);
    if (memory.size > 256) memory.delete(memory.keys().next().value!);
  }
  async function optimize(input: PotentialInput): Promise<PotentialAllocation> {
    if (disposed) throw new Error('Đã hủy tính tiềm năng.');
    // Build identity includes formulas/data; runtime tuning and catalogs also participate.
    if (!previousGlobals || Object.keys(input.globals).some(key => input.globals[key] !== previousGlobals![key])) {
      previousGlobals = input.globals; catalogHash = hash(canonical(input.globals));
    } else input = { ...input, globals: previousGlobals };
    const { globals: _globals, ...configuration } = input;
    // Display names do not affect optimization and must not defeat deduplication.
    configuration.profile = { ...configuration.profile, name: '' };
    const key = await hash((options.version || __POTENTIAL_VERSION__) + ':' + await catalogHash + ':' + canonical(configuration));
    const cached = memory.get(key); if (cached) return structuredClone(cached);
    const pending = requests.get(key); if (pending) return structuredClone(await pending);
    const task = (async () => {
      let saved: PotentialAllocation | undefined;
      try { saved = await store.get(key); } catch { /* Storage is optional. */ }
      if (disposed) throw new Error('Đã hủy tính tiềm năng.');
      if (validAllocation(saved, input.profile, input.autoPotential !== false, !!input.autoSkills)) { remember(key, saved); return saved; }
      const result = await new Promise<PotentialAllocation>((resolve, reject) => { queue.push({ id: ++sequence, input, resolve, reject }); pump(); });
      remember(key, result);
      void store.put(key, result).catch(() => {});
      return result;
    })();
    requests.set(key, task);
    try { return structuredClone(await task); } finally { requests.delete(key); }
  }
  return { optimize, capture: capturePotentialContext, dispose() { disposed = true; fail(new Error('Đã hủy tính tiềm năng.')); } };
}
