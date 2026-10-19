import type { CombatTarget } from './types';

// Quét cả đoạn đường đi giữa hai tick, tránh đạn nhanh xuyên qua hitbox.
export function contactFraction(x0: number, y0: number, x1: number, y1: number, target: CombatTarget, radius: number, yScale = 2): number | null {
  const dx = x1 - x0, dy = (y1 - y0) * yScale;
  const px = x0 - target.x, py = (y0 - (target.y - 14)) * yScale;
  const rr = radius + Math.max(8, target.r || 12);
  const c = px * px + py * py - rr * rr;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return null;
  const b = px * dx + py * dy;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
}

export function rectangleContactFraction(x0: number, y0: number, x1: number, y1: number, target: CombatTarget, halfWidth: number, direction: number): number | null {
  const dx = x1 - x0, dy = (y1 - y0) * 2;
  const length = Math.hypot(dx, dy);
  const ux = length ? dx / length : Math.cos(direction), uy = length ? dy / length : Math.sin(direction);
  const px = target.x - x0, py = (target.y - 14 - y0) * 2;
  const along = px * ux + py * uy, across = Math.abs(px * uy - py * ux);
  const body = Math.max(8, target.r || 12);
  const endGap = Math.max(0, -along, along - length), sideGap = Math.max(0, across - halfWidth);
  if (Math.hypot(endGap, sideGap) > body) return null;
  return length ? E((along - body) / length, 0, 1) : 0;
}
