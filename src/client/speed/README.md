# Speed phases

Edit **`config.ts`** to balance movement and attack animation. This is the only
place that defines the speed floor/ceiling, thresholds, movement distance and reference FPS.
No item IDs, skill effects, damage values or renderer settings belong here.

- `minPercent` / `maxPercent`: final limits, applied **after** buffs and debuffs.
- `run.phases` / `attack.phases`: ascending thresholds with a fixed FPS per phase.
  Select the highest threshold reached; 149% running uses the 120% phase.
- `referenceFrames`: reference sheet size. Actual sheets are normalized so their
  different frame counts do not give different action rates.
- `run.distanceScale`: physical movement distance multiplier, independent of
  sprite FPS. `1` keeps current movement, `1.15` travels 15% farther per second,
  and `1.3` travels 30% farther. It must be finite and positive. Applies to player,
  SIM, monster pursuit and soldier patrol movement; attack timing is unchanged.
- Every track must include its minimum, 100%, and maximum thresholds. FPS must
  be positive and nondecreasing. Invalid configuration fails validation at load.

With the defaults, a reference attack has 20 frames. At 100% it runs at 25 FPS
and takes 0.8 seconds; at 200% it runs at 50 FPS and takes 0.4 seconds;
at 300% it runs at 70 FPS and takes about 0.286 seconds. Actual sheets
of 6, 12 or 20 frames all finish within that same duration. Each completed pose
releases one primary cast. Flight speed, field lifetime and secondary pulse
cadence are independent. A skill's own cooldown may still limit cast frequency.

Running velocity is the actor's base velocity multiplied by the selected FPS
divided by the 100% phase FPS, then multiplied by `run.distanceScale`.
For a fixed route, `1.15` takes about 87% of the previous travel time.
Editing a phase's FPS therefore changes both
movement and the step animation. Player/SIM/monster base velocities stay distinct.

`runtime.ts` contains pure phase/frame calculations. `combat/legacy-bridge.js`
adapts legacy player/monster/SIM stats and statuses to those calculations.
`combat/action-state.ts` advances attack poses and releases casts in simulation
time. Renderers read the pose progress; they never trigger damage or casts.
Movement changes phase immediately. An attack snapshots its phase at the start;
the next attack picks up buff/debuff changes. Stun, death, zone changes and action
interrupts cancel unreleased casts. Already launched effects keep existing rules.

After editing configuration, run `npm run build` (development also rebuilds
changed imported TypeScript sources). No database migration is needed.

Run focused checks with `node --test test/speed-phases.test.js` and the full
regression suite with `npm test`.
Mechanism tests use a fixed 20 FPS baseline to keep timing assertions independent
of balance tuning. The shipped configuration is verified separately in
`speed-phases.test.js` using the `productionSpeed` test-helper option.
