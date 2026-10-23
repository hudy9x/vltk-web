import { findCrowdDetour } from '../simulator/dynamic-route';
import { canStandAt, clearSegment } from '../maps/navigation/grid';
import type { NavigationGrid, Point } from '../maps/types';

export interface RouteJob { id: number; actorIndex: number; start: Point; goal: Point }
export interface RouteBatch { kind: 'routes'; jobs: RouteJob[]; bodies: Point[] }
export interface RouteResult { id: number; points: Point[] | null }
export type RouteMessage = RouteBatch | { kind: 'terrain'; grid: NavigationGrid | null };

// This entry is bundled separately and embedded in the game bundle as worker source.
const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<RouteMessage>) => void;
  postMessage(message: RouteResult[]): void;
};
let terrain: NavigationGrid | null = null;
scope.onmessage = ({ data }) => {
  if (data.kind === 'terrain') { terrain = data.grid; return; }
  const clear = (x: number, y: number, tx: number, ty: number) =>
    x === tx && y === ty ? canStandAt(terrain, x, y) : clearSegment(terrain, { x, y }, { x: tx, y: ty }, true);
  scope.postMessage(data.jobs.map(job => ({ id: job.id, points: findCrowdDetour(job.start, job.goal,
    data.bodies.filter((_, index) => index !== job.actorIndex).map(body => ({ ...body, hp: 1 })), clear) })));
};
