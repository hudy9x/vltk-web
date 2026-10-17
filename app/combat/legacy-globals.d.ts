/**
 * Biên giao tiếp với IIFE JS hiện có. Đây là khai báo kiểu, không sao chép state.
 * Các giá trị được đọc tại thời điểm gọi (player có thể đổi phái/đổi bản đồ).
 * Chưa type-check toàn bộ JS; các khai báo này chỉ bao phủ phần TS sử dụng.
 */
import type { CombatCast, CombatWorld, CombatTarget, CombatSkill, SpriteMetadata, SpriteMissile } from './types';

declare global {
  var activeCombatCast: CombatCast | null;
  var l: CombatWorld;
  var v: CombatTarget;
  var QA: number;
  var K3: number;
  var wf: number;
  var mf: number;
  var Z0: { g?: unknown };
  var W: CanvasRenderingContext2D;
  var Hi: Record<string, string>;
  var A0: {
    f?: Record<string, { c?: number }>;
    s?: Record<string, number>;
    m: Record<string, { fly?: SpriteMetadata | null; hit?: SpriteMetadata; spd?: number; life?: number }>;
  };
  function _1(): CombatTarget[];
  function E(value: number, min: number, max: number): number;
  function Y3(dx: number, dy: number): number;
  function G3(actor: CombatTarget, target: CombatTarget, skill: CombatSkill): unknown;
  function gf(effect: SpriteMissile, x: number, y: number): void;
  function x8(actor: CombatTarget, target: CombatTarget, skill: CombatSkill): void;
  function yn(sprite: SpriteMetadata): number;
  function KP(effect: SpriteMissile): void;
  function RP(effect: SpriteMissile, dt: number): boolean;
  function TP(effect: import('./types').InterpolatedMissile | import('./types').StationaryEffect, dt: number): boolean;
  function mt(x0: number, y0: number, x1: number, y1: number): boolean;
  function R2(x: number, y: number): boolean;
}
