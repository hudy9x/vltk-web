export interface LabelTarget { x: number; y: number }

/** Optional fields let the same queue retain legacy loot/healing notifications. */
export interface FloatingCombatLabel {
  x: number;
  y: number;
  t: string;
  color: string;
  size: number;
  life: number;
  target?: LabelTarget;
  amount?: number;
  status?: string;
  kind?: string;
  critical?: boolean;
  suffix?: string;
  hits?: number;
  /** Independent projectile hits stay separate through queueing and crowd culling. */
  merge?: boolean;
  age?: number;
  index?: number;
  rise?: number;
  ascent?: number;
  descent?: number;
  priority?: number;
}

export interface LabelOptions {
  merge?: boolean;
  minRows?: number;
  quiet?: boolean;
  lowFx?: boolean;
  critical?: boolean;
  suffix?: string;
  context?: CanvasRenderingContext2D;
  priority?: number;
  viewport?: { x: number; y: number; width: number; height: number };
}

