export const ZOOM_LEVELS = [20, 30, 50, 70, 80, 90, 100, 120, 150, 200, 300, 400] as const;
export type ZoomAction = "fit" | "in" | "out" | number;
/** Also step predictably from a fitted view between two presets. */
export function stepZoom(percent: number, direction: "in" | "out"): number {
  return direction === "in"
    ? ZOOM_LEVELS.find(level => level > percent + 1e-6) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
    : [...ZOOM_LEVELS].reverse().find(level => level < percent - 1e-6) ?? ZOOM_LEVELS[0];
}
