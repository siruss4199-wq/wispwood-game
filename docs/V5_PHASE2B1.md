# Phase 2B1 — critical-path review

Baseline: PR #71, `9725775`. Branch: `codex/v5-critical-path-challenge`.
No V4, art, board dimensions, energy prices, tiers or timer changes.

## Why 17 actions worked

Reproduced with `node tests/v5-seal-metrics.mjs` on the baseline (64 policies).
The prepared survey correctly kept both tools, but Conduit then supplied a coil;
Recover used the retained spanner for a winch; restoring the finder refunded a
coil and cache. Starter shards plus density supplies supplied the wiring. The
repaired lift at 20 and finder at 23 had empty cells 21–22 between them. The UI
even drew that shortest solution. Result: 17 actions, 7 merges, zero pulls,
20–26 occupied cells. Keeping the prepared tools was not the defect.

## One connected physical problem

1. **Survey:** put the actual Sight Lens on either board survey mark and move
   obstructing stock out of its sightline. Ridge spends the spanner and preserves
   the lens; Conduit spends the lens and preserves the spanner. Neither is an
   additional delivery milestone. Prepared equipment is not consumed twice.
2. **Route:** Ridge leaves the upper beam crossing available, with the lower
   cross-breach rib closed; Conduit exposes the lower crossing but leaves the
   upper rib closed. Existing resource rewards remain different.
3. **Repair:** Recover gives movable equipment to keep/trade/deploy. Rebuilding
   the lift leaves the lower rail open. Restore retains its counterweight and
   opens the middle rail, closing the lower left crossing. The rails are visible
   before repair. The finder now gives a battery, not a refund of its repair coil.
4. **Resonate:** one Loop Cell powers the lift once. Aim it north/south; move and
   turn the site reflector **and a real Sight Lens** around rails and kept stock
   into an active receiver's top/bottom port. The lens stays collectible: merging
   or delivering it breaks the unfinished circuit. A second free reflector is
   not supplied. No ghost solution is rendered.
5. **Receiver:** finder returns a sealed relic ampoule; bridge returns a winch,
   charges and three improved pulls. The geometry and reward both differ.

Wrong turns/moves cost no energy. Reflector swaps work on full boards. Loose
stock can be merged/recycled; batteries are not charged again after mistakes.
Old completed saves keep their seals; unresolved saves keep their inventory.

## Observed policy results (not human difficulty or exhaustive optimality)

64 deterministic policies: both routes, two styles, four repair preferences,
cache/no-cache and discovery/no-discovery. All finish. Additional regression
styles include contract-heavy and aggressive merging; stress cases start with
a full board, zero energy and zero source charges and reload during play.

| Fastest policy in each group | Actions | Merges | Pulls | Resonance segment |
|---|---:|---:|---:|---:|
| Ridge / Recover | 25 | 8 | 1 | 6 |
| Ridge / Restore | 25 | 8 | 3 | 6 |
| Ridge / mixed | 27 | 8 | 1 | 9 |
| Conduit / Recover | 27 | 10 | 0 | 7 |
| Conduit / Restore | 22 | 8 | 1 | 6 |
| Conduit / mixed | 23 | 6 | 0 | 9 |

Fastest observed: 22 actions, 22–26 occupied cells, 76 energy remaining, six
environment commands. Old winning preference: now 23 actions, 23–26 occupied
cells, zero pulls, eight environment commands. **Zero-production solutions still
exist.** They are not concealed or prevented with compulsory tapping.

Four design decision categories on the required path: route, lift repair,
lens allocation, receiver/beam layout. These are NOT measured human deliberations
or four equally difficult decisions. Tests establish that the route/repair
combinations have different legal paths; the shortest restored route has three
geometric alternatives at receiver readiness. Other paths require moving caches
or fragments, not merely placing more batteries. Receiver preparation and layout
are coupled, so counting them as many independent decisions would exaggerate depth.

## Complete traces (zero-based board cells)

Common opening, actions 1–7: merge 2→7; landing; merge 1→9; merge 9→14;
merge 2→8; merge 1→8; survey. `move` below is the reducer's non-merging move.

| After common opening | Baseline winner | New fastest | Same mixed preference now |
|---:|---|---|---|
| 8 | Breach 27 | Move 15→3 | Move 15→3 |
| 9 | Recover 19 | Move lens 14→9 | Move lens 14→9 |
| 10 | Restore 32 | Breach 27 | Breach 27 |
| 11 | Deploy 20 | Restore 19 | Recover 19 |
| 12 | Merge 6→7 | Merge 3→16 | Restore 32 |
| 13 | Move 7→21 | Crucible pull | Deploy 20 |
| 14 | Merge 15→16 | Merge 3→16 | Merge lens 9→12 |
| 15 | Move 16→22 | Restore 32 | Prime lift |
| 16 | Power | Merge lens 4→6 | Aim lift south |
| 17 | Open vault | Prime lift | Reflector 13→26 |
| 18 | — | Reflector 12→14 | Turn reflector 26 |
| 19 | — | Lens 6→17 | Cache 29→4 |
| 20 | — | Turn lens 17 | Lens 12→29 |
| 21 | — | Power | Fragment 27→9 |
| 22 | — | Open vault | Power |
| 23 | — | — | Open vault |

CI artifacts contain every current policy's complete action trace, occupancy,
energy, actual choices and geometric alternatives (`resonance-policy-metrics.json`).

## Remaining weaknesses / honest gate

This is a compact spatial challenge, not a hard full chapter. A knowledgeable
solver still finishes quickly; free starting supplies remain generous. The route
sighting is intentionally simple. Receiver rewards only affect continuation,
not difficulty before vault opening. Independent iPhone playtesting must establish
whether the rail/port language is understood and the decisions feel worthwhile.
Browser automation and screenshot review cannot establish enjoyment or retention.
No Chapter 2 or Phase 2B economy/content expansion is included.
