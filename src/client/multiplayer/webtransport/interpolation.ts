import { newer } from './protocol';
import type { RemotePosition } from './protocol';
type Sample = RemotePosition & { time: number };

/** Sample time belongs to the sender. Repeated server snapshots must not add pauses. */
export class RemoteTimeline {
  private samples: Sample[] = [];
  private origin = 0;
  constructor(private readonly delay = 150) {}

  push(position: RemotePosition, arrival: number): void {
    const last = this.samples[this.samples.length - 1];
    if (last && !newer(position.seq, last.seq)) return;
    const elapsed = last ? (position.timestamp - last.timestamp) >>> 0 : 0;
    if (!last || elapsed > 10000 || Math.hypot(position.x - last.x, position.y - last.y) > 250) {
      this.origin = arrival;
      this.samples = [{ ...position, time: 0 }];
      return;
    }
    this.samples.push({ ...position, time: last.time + elapsed });
    while (this.samples.length > 40) this.samples.shift();
  }

  sample(now: number): RemotePosition | undefined {
    if (!this.samples.length) return;
    const time = now - this.origin - this.delay;
    while (this.samples.length > 2 && this.samples[1].time <= time) this.samples.shift();
    const a = this.samples[0], b = this.samples[1] || a;
    const ratio = b.time > a.time ? Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time))) : 1;
    const moving = Math.hypot(b.x - a.x, b.y - a.y) > 0.01 && time < b.time;
    return { ...b, x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio,
      effectTime: a.effectTime + (b.effectTime - a.effectTime) * ratio,
      moving };
  }
}
