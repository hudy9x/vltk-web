import { invoke } from '@tauri-apps/api/core';
import type { SoundAsset, SoundConfig, SoundSnapshot } from './sound-model';
export const loadAudio = () => invoke<SoundSnapshot>('load_audio');
export const saveAudio = (config: SoundConfig, expectedRevision: string, assets: SoundAsset[]) => invoke<SoundSnapshot>('save_audio', { request: { config, expectedRevision, assets } });
export const readAudioAsset = (id: string, kind: 'sound' | 'icon' | 'faction' | 'element') => invoke<ArrayBuffer>('read_audio_asset', { id, kind });
