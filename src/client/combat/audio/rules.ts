/** Water factions use female voices, including previews across multiple factions. */
export const FEMALE_SOUND_FACTIONS: readonly string[] = ['emei', 'cuiyan', 'huashan'];
export function skillSoundGender(faction: string, requested: 'male' | 'female'): 'male' | 'female' {
  return FEMALE_SOUND_FACTIONS.includes(faction) ? 'female' : requested;
}
