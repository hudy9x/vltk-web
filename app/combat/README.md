# Combat runtime

`index.ts` exports the stable API used by the legacy bridge and SIM. Simulation,
HP, hit quotas, pulses and diagnostic events remain on the same thread and keep
individual hits. Display budgets never change those events.

## Floating damage: `labels/`

- `types.ts`: labels and display options, including viewport and priority.
- `policy.ts`: sparse layout plus crowd thresholds and hard queue budgets.
- `queue.ts`: per-target `Map` index, raw-number merging and priority eviction.
- `layout.ts`: per-target positioning and cached canvas font measurements.
- `../damage-labels.ts`: compatibility re-exports; existing imports keep working.

Sparse scenes keep the existing 120ms merge window and 4 rows per target. At 24
labelled targets or 48 queue entries, merging increases to 400ms, rows reduce to
2, and remaining lifetime is capped at 800ms. Queue limits are 96 normally and
48 with low FX. Low FX keeps its 500ms lifetime. Player damage has priority 3,
selected targets 2, bosses 1, ordinary mobs 0. Offscreen hits do not allocate new
labels, and the renderer skips expired/offscreen text. Generic loot/healing
notifications continue to age even when offscreen.

The queue index is rebuilt once per frame or when legacy code replaces/mutates
the array. Each canvas context caches font measurements by size; no per-frame
`measureText` is necessary. Only compatible labels for the same entity merge;
no total is attributed to another monster.

## Collision broad phase: `spatial/`

- `target-grid.ts`: 128px cells, conservative body bounds, stable source order.
- `contact-query.ts`: lazy snapshots per target provider, scoped to one combat
  tick. The common player provider is shared across casts. Providers with fewer
  than 64 targets use direct scans. Large area queries also fall back to scans.

The grid finds candidates; `geometry.ts` remains the authority for exact circle
and rectangle contact, including fast swept projectiles and large bodies.
Candidates retain source order so tied contacts keep existing hit quotas.
Splash damage uses its own bounds query. Dead/HP checks remain live. Membership
and spatial positions are sampled per tick; new/moving bodies are reindexed on
the next tick. Outside an update tick, public collision calls scan fresh targets.
A `finally` block releases all snapshots, including when callbacks throw.

## Verification and measurements

- `npm run build`: typecheck and assemble the actual browser bundle.
- `npm test`: includes previous contact/HP tests plus crowd and broad-phase cases.
- `node tools/benchmark-combat.js`: synthetic label CPU workload and a local
  collision workload comparing candidate results with the full-scan oracle.

Benchmark times are CPU timings on the running machine, **not browser FPS**.
The distributed collision case measures the favorable case; tightly stacked
bodies can still all be candidates and must retain their legitimate hits.
Worker migration is a separate boundary: move authoritative simulation state
and send batched render snapshots, rather than sending one message per hit.
