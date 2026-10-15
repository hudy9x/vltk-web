interface StandingSprite { h: number }
declare var E0: { anim?: Record<string, { st?: StandingSprite }> };

/** Anchor to the model's standing pose, never to an attack frame or image load. */
export function nameplateOffset(animation: string | undefined, scale: number,
  ratio: number, padding: number, fallback: number): number {
  const height = animation && E0.anim?.[animation]?.st?.h;
  return typeof height === 'number' && height > 0
    ? Math.min(height * scale, 90) * ratio + padding : fallback;
}
