import type { ContactEffect, FallbackContact } from './types';

// Chỉ vẽ FX thay thế khi thiếu sprite. Hàm này không gây sát thương.
export function drawContactProjectile(effect: FallbackContact & ContactEffect): void {
  if (effect.age < 0) return;
  if (effect.staticArea) {
    const geo = effect.combat.skill.geo!;
    const radius = Math.max(8, (geo.r || geo.area || 12) * QA);
    W.save();
    W.globalAlpha = 0.3;
    W.strokeStyle = effect.color;
    W.beginPath();
    W.ellipse(effect.x, effect.y + 14, radius, radius / 2, 0, 0, Math.PI * 2);
    W.stroke();
    W.restore();
    return;
  }
  if (effect.melee) return;
  W.fillStyle = effect.color;
  W.beginPath();
  W.ellipse(effect.x, effect.y, 5, 3, 0, 0, Math.PI * 2);
  W.fill();
}
