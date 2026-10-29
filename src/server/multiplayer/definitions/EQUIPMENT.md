# Online equipment

The existing authenticated progression endpoint also handles equipment intents.
`equipment.cjs` resolves catalog selections and owned item UIDs; `progression.cjs`
runs it against a cloned canonical profile. SQLite commits the inventory,
equipment, currency, UID counter and revision in one idempotent transaction.
The existing durable profile-refresh queue updates Rust at the same level.

```text
NPC / inventory UI → OnlineProgression → authenticated progression API
  → native item/requirement rules → SQLite transaction → Rust profile refresh
  → canonical ACK + client cache → reload bootstrap
```

Commands: `equipmentTrader` (item, compatible set, rings), `horseBuy`, `shopBuy`,
`equip`, `unequip`, `mount`. Item stats, rolls and prices are resolved on the
server; clients send catalog keys or owned UIDs. Offline/simulator paths keep
using the native client rules. This does not port crafting, trading or stables.

`onlineMounted` records mounting separately from owning/equipping a horse.
The stat adapter validates native riding requirements and feeds that state to
`actorMovementSpeed`, including boots, horse bonuses, the shared speed phases
and distance multiplier. Rust uses the resulting speed for navigation and
reports it in movement snapshots for client prediction. Buff variants use the
same mounted state. Removing the horse clears the mounted state.

Checks: `test/multiplayer-equipment.test.js`, the Rust
`equipment_refresh_changes_distance_and_snapshot_speed_without_reissuing_mouse_goal`
test, and `EQUIPMENT_TEST=1 PROGRESSION_TEST=1` with the WebTransport browser harness.
