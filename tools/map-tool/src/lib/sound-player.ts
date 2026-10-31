import type { PreviewClip } from './sound-model';
export interface PreviewAudio {
  src: string;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}
interface Callbacks {
  source(id: string): Promise<string | undefined>;
  state(clip: PreviewClip | null, index: number, total: number): void;
  error(clip: PreviewClip, error: unknown): void;
}
/** One player for buttons, arrow-key audition, and row/all queues. */
export class SoundPreviewPlayer {
  private token = 0;
  private cancelClip?: () => void;
  constructor(private audio: PreviewAudio, private callbacks: Callbacks) {}
  stop() {
    this.token++; this.cancelClip?.(); this.cancelClip = undefined;
    this.audio.pause(); this.callbacks.state(null, 0, 0);
  }
  async play(queue: PreviewClip[]) {
    this.stop(); const token = this.token;
    for (let index = 0; index < queue.length; index++) {
      const clip = queue[index];
      try {
        const source = await this.callbacks.source(clip.id);
        if (token !== this.token) return;
        if (!source) continue;
        this.audio.src = source;
        let finish!: () => void, fail!: () => void;
        const ended = new Promise<void>((resolve, reject) => { finish = resolve; fail = () => reject(new Error('Không giải mã được file âm thanh')); });
        // Register before play(): short clips can end before its promise resolves.
        this.audio.addEventListener('ended', finish);
        this.audio.addEventListener('error', fail);
        this.cancelClip = finish;
        this.callbacks.state(clip, index + 1, queue.length);
        // Attach the rejection handler immediately, including errors during play().
        const completion = ended.then(() => null, error => error);
        try { await this.audio.play(); const error = await completion; if (error) throw error; }
        finally {
          this.audio.removeEventListener('ended', finish); this.audio.removeEventListener('error', fail);
          if (token === this.token) this.cancelClip = undefined;
        }
      } catch (error) { if (token === this.token) this.callbacks.error(clip, error); }
      if (token !== this.token) return;
    }
    if (token === this.token) this.callbacks.state(null, queue.length, queue.length);
  }
}
