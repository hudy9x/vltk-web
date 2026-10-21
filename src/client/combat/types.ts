/** Các kiểu chỉ mô tả dữ liệu hiện có, không tạo thêm state ở runtime. */
export interface WorldPoint { x: number; y: number }

export interface CombatTarget extends WorldPoint {
  slowT?: number;
  slowPower?: number;
  act?: string;
  actT?: number;
  animKey?: string;
  moving?: boolean;
  mv?: boolean;
  atT?: number;
  castT?: number;
  hurtT?: number;
  actionRevision?: number;
  hurtProxy?: boolean;
  /** Player dùng l.life; quái dùng hp. Player không bắt buộc có hp. */
  hp?: number;
  r?: number;
  dead?: boolean;
}

/** Tên trường geo được giữ để tương thích bảng skill JS hiện tại. */
export interface SkillGeometry {
  k?: 'line' | 'self' | 'spot' | 'fan';
  shape?: 'rect';
  r?: number;
  area?: number;
  width?: number;
  len?: number;
  n?: number;
  pierce?: boolean;
}

export interface CombatSkill {
  id?: number | string;
  L?: number;
  geo?: SkillGeometry;
  rad?: number;
  targets?: number;
  melee?: boolean;
  ignoreTerrain?: boolean;
  ev2?: boolean;
  parts?: Record<string, unknown>;
}

/** Callback chạy sau va chạm: code cũ tiếp tục tính damage, debuff và log. */
export type ContactHitHandler = (target: CombatTarget) => void;
/** Mỗi cặp đạn/mục tiêu phát một impact, độc lập giới hạn damage của cả cast. */
export type ContactImpactHandler = (target: CombatTarget, position: WorldPoint) => void;
export interface CastOptions {
  targets?: () => CombatTarget[];
  maxTargets?: number;
  maxHits?: (target: CombatTarget) => number;
  windup?: number;
  visual?: () => void;
  hideFallbackVisual?: boolean;
  onImpact?: ContactImpactHandler;
  duration?: number;
}

export interface CombatCast {
  actionRevision?: number;
  actor: CombatTarget;
  skill: CombatSkill;
  ignoreTerrain: boolean;
  onHit: ContactHitHandler;
  onImpact?: ContactImpactHandler;
  targets: () => CombatTarget[];
  maxTargets: number;
  maxHits: (target: CombatTarget) => number;
  hits: Map<CombatTarget, number>;
  zone: number | string;
  windup: number;
  emitted: number;
  origin: WorldPoint;
  direction: number;
  elapsed: number;
  pulse: number;
  nextPulse: number;
  pulseFrame: number;
  targetPulses: Map<CombatTarget, number>;
  interval: number;
  /** Finite fields keep a fixed pulse budget, including frames that run late. */
  pulseCount?: number;
  duration?: number;
}

export interface SpriteMetadata {
  n: number;
  ms: number;
}

interface EffectBase extends WorldPoint {
  combat?: CombatCast;
  contactHits?: Set<CombatTarget>;
  impactTargets?: Set<CombatTarget>;
  contactAlive?: boolean;
  cosmetic?: boolean;
  follow?: unknown;
  add?: unknown;
  staticArea?: boolean;
  melee?: boolean;
  cv?: boolean | number;
}

/** jm chạy theo frame K3; mis/boom/contact chạy theo giây. Không đổi đơn vị. */
export interface SpriteMissile extends EffectBase {
  k: 'jm';
  spd?: number;
  ang?: number;
  kind?: number;
  still?: boolean;
  age: number;
  lf: number;
  /** Original one-shot animation length, independent of damage-field lifetime. */
  visualLifetime?: number;
  loop?: boolean;
  z: number;
  hz: number;
  za?: boolean | number;
  travelLimit?: number;
  traveled: number;
}
export interface InterpolatedMissile extends EffectBase {
  k: 'mis';
  s?: SpriteMetadata;
  t: number;
  life: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hit?: SpriteMetadata | null;
  dir?: number;
}
export interface StationaryEffect extends EffectBase {
  /** Animation playback multiplier, consumed by the stationary FX renderer. */
  sp?: number;
  k: 'boom';
  t: number;
  life: number;
  s?: SpriteMetadata;
  dir?: number;
}
export interface FallbackContact extends EffectBase {
  k: 'contact';
  age: number;
  life: number;
  x2: number;
  y2: number;
  melee: boolean;
  speed: number;
  color: string;
  ang: number;
}
/** Các FX khác chỉ được giữ lại; combat không điều khiển vòng đời của chúng. */
export interface OtherVisualEffect extends EffectBase {
  k: 'txt' | 'ring' | 'arc' | 'line' | 'spark' | 'mark' | 'blood' | 'heal';
}
export type ContactVisual = SpriteMissile | InterpolatedMissile | StationaryEffect | FallbackContact;
export type VisualEffect = ContactVisual | OtherVisualEffect;
export type ContactEffect = ContactVisual & {
  combat: CombatCast;
  contactHits: Set<CombatTarget>;
};
export interface CombatWorld {
  /** The local battlefield continues simulating while the player is respawning. */
  battlefield?: boolean;
  slowT?: number;
  slowPower?: number;
  moveTo?: CombatTarget | null;
  pickTarget?: unknown;
  hurtT?: number;
  fx: VisualEffect[];
  fxQ?: VisualEffect[];
  combatProjectiles?: ContactEffect[];
  zoneShown: number | string;
  life: number;
  quiet?: boolean;
  town?: boolean;
  deadT: number;
}
