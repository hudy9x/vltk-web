# Online speed and the original game

Compared read-only against `~/ws/volamidle2` on 2026-10-29. Its
`speed/config.ts`, `speed/runtime.ts`, `combat/legacy-bridge.js` and native
attribute formulas match this client's rules. The original repository is not
modified or required at runtime.

Running uses `150 * actorMovementSpeed(v)`: native speed phases, a 1.15 distance
multiplier, boots on foot, and horse bonuses only while mounted. Animation and
physical travel share the phase multiplier. At runtime cold modifies the raw
percentage before phase selection and the final 25–300% cap.

Attacks use `actorAttackTiming(v, skill).cycleSeconds`, with the skill's own
cooldown as a minimum. This is not `1 / skill.rate`: the reference attack cycle
has 20 frames at 25 FPS at baseline (0.8 seconds), 50 FPS at the 200% phase
(0.4 seconds), and 70 FPS at the 300% cap (20/70 seconds).

The trusted adapter exports raw speed percentages and the native configuration.
`domain/speed.rs` applies these curves to runtime status and shares the result
between simulation and movement snapshots. Buff variants use their own raw
percentages with the same configuration. Rust's 20 Hz tick rounds attack
intervals up to the next tick; cooldown expiry tolerates floating-point residue.

The existing binary event `value` for kind 1 carries the native attack cycle in
seconds. Skill FX remain immediate cosmetic replays of approved casts; this does
not add another local windup or change projectile geometry. Local and remote body
poses normalize the sprite cycle using this duration. Hit event values keep their
original damage meaning. The binary record layout and protocol version stay the
same.

Verification: `test/multiplayer-speed.test.js`, `test/speed-phases.test.js`,
`test/character-attack-speed.test.js`, Rust native speed/cadence tests, and the real
WebTransport browser harness. `test/fixtures/native-speed.json` is a golden copy
of the native config for Rust/JS parity checks, not a runtime balance table.
