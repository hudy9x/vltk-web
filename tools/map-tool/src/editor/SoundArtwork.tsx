import { useEffect, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { readAudioAsset } from '@/lib/sound-native';

/** Artwork is read from the selected workspace using the tool's shared paths. */
export function SoundArtwork({ id, kind, revision }: { id: string; kind: 'faction' | 'element'; revision: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false, url = ''; setSrc('');
    if (isTauri()) void readAudioAsset(id, kind).then(bytes => {
      if (cancelled) return;
      url = URL.createObjectURL(new Blob([bytes], { type: kind === 'element' ? 'image/svg+xml' : 'image/webp' })); setSrc(url);
    }).catch(() => {});
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [id, kind, revision]);
  return src ? <img src={src} alt="" /> : <span className="sound-artwork-placeholder" aria-hidden="true">{id.slice(0, 2).toUpperCase()}</span>;
}
