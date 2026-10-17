export interface CrowdActor {
  x: number; y: number;
  dead?: boolean; hp?: number; cls?: string; goldBoss?: boolean; arenaSim?: boolean;
}
export interface CrowdView { x: number; y: number; width: number; height: number }
export interface CrowdGroup { anchor: CrowdActor; members: CrowdActor[] }
export interface LabelLike { target?: CrowdActor; life: number }
export interface CrowdFrame {
  bodies: Set<CrowdActor>;
  damageTargets: Set<CrowdActor>;
  clustered: Set<CrowdActor>;
  counts: Map<CrowdActor, number>;
  selectLabels<T extends LabelLike>(labels: readonly T[]): T[];
}
