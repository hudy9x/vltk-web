import type { NavigationGrid, Point } from '../maps/types';
import type { RouteJob, RouteMessage, RouteResult } from '../workers/crowd-path';

declare const __CROWD_WORKER_SOURCE__: string;
export interface RouteWorker {
  onmessage: ((event: MessageEvent<RouteResult[]>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: RouteMessage): void;
  terminate(): void;
}
function browserWorker(): RouteWorker {
  const url = URL.createObjectURL(new Blob([__CROWD_WORKER_SOURCE__], { type: 'text/javascript' }));
  try { return new Worker(url, { name: 'tongkim-pathfinding' }); }
  finally { URL.revokeObjectURL(url); }
}
interface Request { actor: Point; job: RouteJob; complete(points: Point[] | null): void }
/** One worker, one in-flight batch, at most three searches per batch. */
export function createPathWorkerClient(factory: () => RouteWorker = browserWorker) {
  let worker: RouteWorker | null = null, failed = false, sequence = 0;
  let terrain: NavigationGrid | null | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue = new Map<Point, Request>(), pending = new Map<number, Request>();
  function stop() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); }
    worker = null; terrain = undefined; queue.clear(); pending.clear();
  }
  function fail() { stop(); failed = true; }
  function ensure(): boolean {
    if (failed) return false;
    if (!worker) try {
      worker = factory();
      const current = worker;
      worker.onerror = worker.onmessageerror = () => { if (worker === current) fail(); };
      worker.onmessage = ({ data }) => {
        if (worker !== current) return;
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        const batch = new Map(pending); pending.clear();
        for (const result of data) batch.get(result.id)?.complete(result.points);
      };
    } catch { fail(); }
    return !!worker;
  }
  function request(actor: Point, goal: Point, complete: Request['complete']) {
    if (!ensure()) return false;
    // Replacing a queued job preserves Map insertion order, preventing starvation.
    queue.set(actor, { actor, job: { id: ++sequence, actorIndex: -1, start: { x: actor.x, y: actor.y }, goal: { ...goal } }, complete });
    return true;
  }
  function flush(bodies: Point[], grid: NavigationGrid | null) {
    if (!worker || pending.size || !queue.size) return;
    try {
      if (terrain !== grid) {
        worker.postMessage({ kind: 'terrain', grid }); terrain = grid;
      }
      const jobs: RouteJob[] = [];
      for (const [actor, entry] of queue) {
        queue.delete(actor);
        const index = bodies.indexOf(actor);
        if (index < 0) continue;
        entry.job.actorIndex = index;
        jobs.push(entry.job); pending.set(entry.job.id, entry);
        if (jobs.length === 3) break;
      }
      if (!jobs.length) return;
      worker.postMessage({ kind: 'routes', jobs, bodies: bodies.map(({ x, y }) => ({ x, y })) });
      // A worker that never responds must not permanently strand the queue.
      timer = setTimeout(fail, 2000);
    } catch { fail(); }
  }
  return { request, flush, reset: stop, cancel(actor: Point) {
    queue.delete(actor);
    // Keep the in-flight marker until its batch returns; discard only its callback.
    for (const entry of pending.values()) if (entry.actor === actor) entry.complete = () => {};
  }, get available() { return ensure(); } };
}
