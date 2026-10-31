import source from './config.json';

export type SoundStage = 'cast' | 'release' | 'hit';
type Stage = { effect?: string; maleEffect?: string; femaleEffect?: string; male?: string; female?: string };
interface SkillSounds {
  name: string; level: number; faction: string; icon: string;
  inherit?: number; route?: string;
  cast?: Stage; release?: Stage; hit?: Stage;
  review?: { sound: string; reason: string }[];
}
interface Sound { src: string; category: string; gender?: string; name: string }
export const SKILL_AUDIO_CONFIG = source as {
  version: number; defaults: { male: string; female: string };
  sounds: Record<string, Sound>; skills: Record<string, SkillSounds>;
};
interface Actor { x: number; y: number; profile?: { sex?: number }; }
declare function Q8(path: string, volume?: number, rate?: number, priority?: boolean): unknown;
declare function z8(path: string): void;
declare function playActorAttackVoice(actor: Actor, soundId?: string): void;
declare const o: { sex?: number };
declare const skillVisualContext: { audioListener?: Actor } | null;

/** Resolve once for game and report; child stages override only specified fields. */
export function resolveSkillAudio(id: number | string, seen = new Set<string>()): SkillSounds | undefined {
  const key = String(id), own = SKILL_AUDIO_CONFIG.skills[key];
  if (!own) return;
  if (seen.has(key)) throw new Error(`Skill audio inheritance cycle: ${key}`);
  seen.add(key);
  const parent = own.inherit == null ? undefined : resolveSkillAudio(own.inherit, seen);
  return { ...parent, ...own,
    cast: { ...parent?.cast, ...own.cast },
    release: { ...parent?.release, ...own.release },
    hit: { ...parent?.hit, ...own.hit },
    review: own.review ?? parent?.review ?? [] };
}

export function playSound(id: string, volume = 0.5, priority = false): unknown {
  const sound = SKILL_AUDIO_CONFIG.sounds[id];
  if (sound && typeof Q8 === 'function') return Q8(sound.src, volume, 1, priority);
}

export function preloadSkillAudio(): void {
  if (typeof z8 !== 'function') return;
  for (const sound of Object.values(SKILL_AUDIO_CONFIG.sounds)) z8(sound.src);
}

/** One invocation per primary release, and one hit sound per cast. */
export function playSkillSound(actor: Actor, id: number | string, stage: SoundStage): void {
  const config = resolveSkillAudio(id), event = config?.[stage];
  const profile = actor.profile || (typeof v !== 'undefined' && actor === v && typeof o !== 'undefined' ? o : null);
  const sex = profile?.sex === 1 ? 'female' : 'male';
  const effect = event?.[sex === 'female' ? 'femaleEffect' : 'maleEffect'] || event?.effect;
  if (effect) {
    const listener = typeof skillVisualContext !== 'undefined' && skillVisualContext?.audioListener ||
      (typeof v !== 'undefined' ? v : null);
    const distance = listener ? Math.hypot(actor.x - listener.x, actor.y - listener.y) : 0;
    if (distance < 420) playSound(effect, 0.5 * (1 - distance / 420));
  }
  if (stage !== 'cast' || typeof playActorAttackVoice !== 'function') return;
  const voice = event?.[sex];
  // Named cast effects can already contain a shout; never layer the generic one.
  if (voice || !effect) playActorAttackVoice(actor, voice || SKILL_AUDIO_CONFIG.defaults[sex]);
}
