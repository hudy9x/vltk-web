# Crowd visibility

This is a render-only level-of-detail pass. It never removes enemies from the
world, moves them, edits HP, changes target selection, or changes combat hitboxes.
`arena-02.js` still advances hidden monsters' animation clocks and hit flashes.

- `policy.ts`: overlap radii (40 × 28 logical pixels), budgets (3 bodies, 5 damage
  recipients) and the 350ms representative hold time.
- `grouping.ts`: bounded anchor ellipses with neighboring-cell lookup. A chain of
  partially overlapping monsters cannot merge into one screen-wide group. Prior
  membership gets a 15% exit margin to reduce boundary flicker.
- `selection.ts`: boss/selected-target protection and latest actual label per
  crowded recipient. No cross-monster damage sums are synthesized.
- `controller.ts`: per-renderer membership and selection memory, viewport culling,
  live counts and the frame's body/damage sets.
- `index.ts`: browser bundle entry (`CrowdVisibility`).

Each frame supplies living enemies, delta time, viewport, selected targets and
monster recipients of still-live damage labels. The last list keeps a death burst
bounded after those monsters leave the enemy array; dead recipients can only
contribute labels, never rendered bodies or the live `×N` count.

Groups of at most three monsters keep all bodies and damage rows. Larger groups
show three bodies, up to five recipients with one latest label each, and one
`×N` suffix on a representative nameplate. Bosses and explicitly selected targets
are always retained, so unusually many overlapping bosses can exceed the ambient
budgets. Players, SIM actors, allies, remote players and generic notifications
keep their existing rendering.

All limits are visual. The full enemy list continues through AI, collision,
damage, poison, rewards and logs. Corpses and skill projectile effects keep their
existing rendering; this pass reduces living monster sprites/nameplates/HP bars
and floating damage only.

Tests: `node --test test/crowd-visibility.test.js test/nameplates.test.js`.
