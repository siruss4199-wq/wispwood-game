# Vaultwake V5 Coast Camp — secondary chains, first playable pilot (2026-10-29)

**Branch.** `claude/v5-secondary-pilot`, from `claude/v5-rover-secondary-art` at `cc63b84`, which
holds the five art passes (`docs/V5_*_SECONDARY_ART_2026-10-29.md`) and the measurement plan
(`docs/V5_SECONDARY_CHAINS_PLAN_2026-10-28.md`). Not merged anywhere.

**Round 2** (the director's review, build 47t) is the first section below; round 1 follows it, with
superseded statements marked.

**Preview.** https://claude.ai/artifact/LDdJLFatkwsyykjnJ3Q9sr (private until shared; round 2 is
build 47t, published to the same link).
- It is a launcher page with two buttons: "Start a new camp" (`v5/play.html?new=1`) and "Continue this camp".
- The game files are published at their repo paths, byte-identical to this branch.
- Use the launcher's "Start a new camp" there: the in-game menu's new-camp button asks `confirm()`, which
  that viewer answers "no".

**Scope.**
- The Rivet Rover's and the Survey Kite's secondary chains are playable: drops, bad-luck limit, crew
  orders, pricing, collection book.
- The Rope Winch, Shell Trap and Lantern Kiln sets stay prepared but inactive: their files remain in
  `v5/assets/premium/coast/proposed/`, and no id is registered.
- Unchanged: save keys, existing items and chains, chapter requirements, gold orders, V4, `v5/lab/`.
  Chapter 3 is not started.

## Round 2: after the director's review (build 47t)

The Rover and Kite pilot continues. Drop rates (10 %, limit 14, first 3) and the rarity factor (2) are
unchanged. The Winch, Shell and Lamp chains stay inactive, and no new generator was added.

| Review point | What changed | Where |
|---|---|---|
| 1. Pacing analysis | Each run is now split into active time, energy waiting, taps, merges, deliveries, stage purchases, energy sources and coin sources, seed by seed. Measurement only, no rule changes. | `tests/v5-next-secondary-pacing.mjs`, R2.1 |
| 2. Order purpose | Extra orders alternate between *use* orders (parts held) and bounded *goal* orders (one drop beyond what is held). | `secondaryNeed`, `secondaryGoal` in `game.mjs`, R2.2 |
| 3. Drop protection | "Within 14" now means 14 *eligible* taps. A full waiting list pauses drops instead of rolling and losing one. A first drop that is still waiting counts as met. Every interaction is tested. | `secondaryPaused`, `secondaryRoll`, R2.3 |
| 4. Rollback risk | A save from a newer build is named as one and never replaced. Every camp that is replaced is kept first. A **Kept camps** list restores any of them. | `v5/next/saves.mjs`, `app.mjs`, `home.mjs`, R2.4 |
| 5. Visual ambiguity | Five icons edited from their masters: a flat Gear, a two-gear Gear assembly, a compass-star Logbook, and edged papers. | `tools/secondary-icon-edits.py`, R2.5 |
| 6. Exact HEAD | Every check was re-run on the final commit. The CI run for that commit is linked in the draft PR. | R2.6 |

### R2.1 Pacing, taken apart

`node tests/v5-next-secondary-pacing.mjs [speeds] [seeds] [shop|noshop|both] [models] [--runs]` runs the same
scripted player and harness as the pilot metrics, with 10 seeds per cell. Each seed has its own drop
sequence and its own action-time jitter.

How the numbers are defined:
- **Active minutes** are the player acting. Every action takes the speed with ±40 % jitter, so active
  time ≈ actions × speed.
- **Waiting** is time with no useful action and no energy. It is counted in the harness's 10-second
  idle steps.
- Every other column is a median over the seeds.

**Why the first round's 4 s / no-shop cell was 36 % shorter (320 → 204 min).** These are the
round-1 B numbers, re-measured:

| Speed, shop | Model | Total | Active | Waiting | Taps | Merges, primary | Merges, extras | Orders delivered: primary-only / with an extra / gold | Stages bought | Shed moves | Energy from level-ups / refill / rations / shop | Coins from primary / extra / gold orders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 s, no shop | Baseline | 320 | 155 | 165 | 1058 | 875 | 0 | 66 / 0 / 63 | 63 | 0 | 667 / 160 / 48 / 0 | 3010 / 0 / 6710 |
| 4 s, no shop | B | 204 | 154 | 50 | 952 | 816 | 52 | 38 / 12 / 63 | 63 | 106 | 674 / 100 / 24 / 0 | 1765 / 1085 / 6820 |
| 10 s, shop | Baseline | 366 | 366 | 0 | 1001 | 819 | 0 | 56 / 0 / 63 | 63 | 0 | 651 / 179 / 0 / 20 | 2855 / 0 / 6820 |
| 10 s, shop | B | 392 | 392 | 0 | 982 | 823 | 51 | 39 / 14 / 63 | 63 | 112 | 644 / 184 / 0 / 20 | 1722 / 1248 / 6832 |

- **Active time is unchanged** (155 vs 154 min). The whole gain is waiting: 165 → 50 min.
- **B needed 106 fewer taps** (1058 → 952) because it needed fewer everyday orders:
  - a delivered order with an extra paid about 87 coins on average (1085 coins over 12.5 orders);
  - a primary-only order paid about 46 (3010 over 66).

  The extra itself cost no tap. Gold orders and stages (63 each) are identical.
- **At 4 s the player is energy-bound.** Half the baseline run is waiting for the 2-minute refill, so
  every tap not needed is about 2 minutes not waited. The free rations fell too (48 → 24).
- **Level-up energy is the same** (667 vs 674). The gain is fewer taps needed, not more energy given.

**Why 10 s / shop was 31 minutes longer (366 → 397 in the first report; 392 in this re-run).**
- **Neither run waits**, so time is simply actions × 10 s.
- **B saved only 19 taps there.** With plenty of energy the scripted player spends it on crates and
  cargo keys (it taps for them at 45 energy and up), so cheaper coins do not become fewer taps.
- **B added actions:**
  - about 112 shed moves (tidying extras away and bringing them back);
  - 51 merges of extras;
  - 14 extra deliveries;
  - 9 book ticks.

  It saved 17 primary-only deliveries. Net, that is about +150 actions ≈ +25 min.
- **The shed moves are mostly the scripted player.** It has to tidy extras off the camp spaces (round 1
  measured +130 min without that). A real player handles extras differently, but not for free.

**Round 2, every cell.** Medians over 10 seeds:

| Speed, shop | Model | Total | Active | Waiting | Taps | Merges, primary | Merges, extras | Orders delivered: primary-only / with an extra / gold | Stages bought | Shed moves | Energy from level-ups / refill / rations / shop | Coins from primary / extra / gold orders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 s, no shop | Baseline | 320 | 155 | 165 | 1058 | 875 | 0 | 66 / 0 / 63 | 63 | 0 | 667 / 160 / 48 / 0 | 3010 / 0 / 6710 |
| 4 s, no shop | B | 225 | 159 | 67 | 986 | 838 | 53 | 42 / 13 / 63 | 63 | 104 | 668 / 112 / 24 / 0 | 1785 / 1125 / 6782 |
| 5 s, no shop | Baseline | 259 | 189 | 70 | 1018 | 847 | 0 | 63 / 0 / 63 | 63 | 0 | 674 / 129 / 32 / 0 | 3015 / 0 / 6755 |
| 5 s, no shop | B | 228 | 196 | 34 | 970 | 820 | 53 | 42 / 13 / 63 | 63 | 109 | 666 / 112 / 24 / 0 | 1788 / 1128 / 6765 |
| 8 s, no shop | Baseline | 352 | 307 | 45 | 1057 | 859 | 0 | 64 / 0 / 63 | 63 | 0 | 659 / 175 / 32 / 0 | 3025 / 0 / 6625 |
| 8 s, no shop | B | 311 | 309 | 3 | 973 | 813 | 51 | 40 / 14 / 63 | 63 | 99 | 664 / 151 / 8 / 0 | 1682 / 1250 / 6795 |
| 10 s, no shop | Baseline | 390 | 382 | 7 | 1041 | 858 | 0 | 63 / 0 / 63 | 63 | 0 | 664 / 194 / 12 / 0 | 2928 / 0 / 6735 |
| 10 s, no shop | B | 395 | 395 | 0 | 996 | 819 | 54 | 40 / 14 / 63 | 63 | 106 | 638 / 190 / 8 / 0 | 1780 / 1150 / 6808 |
| 4 s, shop | Baseline | 208 | 156 | 52 | 1059 | 873 | 0 | 70 / 0 / 63 | 63 | 0 | 675 / 103 / 24 / 60 | 3335 / 0 / 6690 |
| 4 s, shop | B | 164 | 164 | 0 | 1022 | 860 | 56 | 47 / 13 / 63 | 63 | 108 | 687 / 81 / 8 / 60 | 2022 / 1055 / 6820 |
| 5 s, shop | Baseline | 185 | 185 | 1 | 1014 | 822 | 0 | 65 / 0 / 63 | 63 | 0 | 684 / 92 / 8 / 60 | 3315 / 0 / 6748 |
| 5 s, shop | B | 195 | 195 | 0 | 974 | 817 | 56 | 44 / 14 / 63 | 63 | 110 | 660 / 96 / 0 / 40 | 1825 / 1308 / 6850 |
| 8 s, shop | Baseline | 312 | 311 | 0 | 1060 | 880 | 0 | 62 / 0 / 63 | 63 | 0 | 669 / 154 / 8 / 60 | 2880 / 0 / 6880 |
| 8 s, shop | B | 307 | 307 | 0 | 977 | 800 | 54 | 41 / 14 / 63 | 63 | 106 | 658 / 148 / 0 / 20 | 1845 / 1292 / 6772 |
| 10 s, shop | Baseline | 366 | 366 | 0 | 1001 | 819 | 0 | 56 / 0 / 63 | 63 | 0 | 651 / 179 / 0 / 20 | 2855 / 0 / 6820 |
| 10 s, shop | B | 384 | 384 | 0 | 968 | 792 | 55 | 39 / 14 / 63 | 63 | 110 | 634 / 184 / 0 / 20 | 1798 / 1132 / 6780 |

**Seed by seed.** The baseline has no random drops, so its seeds differ only by timing jitter and
barely vary. B's spread comes from its drop sequence:

| Speed, shop | Baseline total min: min · median · max | B total min: min · median · max | Paired difference per seed (min) | Faster in | Baseline wait min (median) | B wait min (median) |
|---|---|---|---|---|---|---|
| 4 s, no shop | 250 · 320 · 320 | 190 · 225 · 300 | -118 -34 -91 -20 -130 -72 -99 -33 -105 -82 | 10 of 10 | 165 | 67 |
| 5 s, no shop | 258 · 259 · 259 | 216 · 228 · 310 | -28 +38 -42 +51 -42 -16 -40 -32 -9 -39 | 8 of 10 | 70 | 34 |
| 8 s, no shop | 344 · 352 · 353 | 298 · 311 · 416 | -37 +15 -37 +63 -37 -53 -43 -13 -48 -49 | 8 of 10 | 45 | 3 |
| 10 s, no shop | 376 · 390 · 403 | 363 · 395 · 433 | +10 +23 +1 +48 -13 -13 -14 +9 +11 -6 | 4 of 10 | 7 | 0 |
| 4 s, shop | 208 · 208 · 230 | 152 · 164 · 222 | +1 -12 -44 +14 -66 -56 -50 -19 -49 -49 | 8 of 10 | 52 | 0 |
| 5 s, shop | 181 · 185 · 228 | 184 · 195 · 247 | +8 +66 -5 +25 +12 +12 -33 +8 +13 +8 | 2 of 10 | 1 | 0 |
| 8 s, shop | 302 · 312 · 320 | 298 · 307 · 350 | -6 +31 -19 +20 +4 +2 -2 -7 -14 -5 | 6 of 10 | 0 | 0 |
| 10 s, shop | 363 · 366 · 402 | 375 · 384 · 414 | +14 +49 +8 +4 +26 +14 -8 -19 +7 +12 | 2 of 10 | 0 | 0 |

- **Seeds 2 and 4 are B's slow seeds in every cell, in both rounds.** At 5 s with the shop, they are
  already 24–29 min behind baseline by stages 26–31. Then they hit an energy wall at the Survey
  Worksite, where three everyday orders sat undelivered for about 75 minutes with energy at 0
  (`node`-traced, seed 2, minutes 100–175).
- **B is not faster for everyone.** At 10 s without the shop it is faster in 4 of 10 seeds. At 5 s
  and 10 s with the shop it is faster in 2 of 10. Those are the patient, energy-rich cells, where the
  extra handling actions outweigh the taps saved.

**What the rarity factor changes, exactly.** `SECONDARY_ORDERS.rarity` (2) is how many tiers higher an
extra is priced:
- **The formula:** `partValue = COIN_VALUE[tier + rarity]`, with `COIN_VALUE = [5, 5, 10, 25, 45, 80, 140, 240]`.
- **The prices:**

  | Rarity | Bolt / Note fragment | Gear / Expedition note | Gear assembly / Travel notebook |
  |---|---|---|---|
  | 1 | 5 | 10 | 25 |
  | 2 (current) | 10 | 25 | 45 |
  | 3 | 25 | 45 | 80 |

- **An order's coins:** the parts' sum × 1.15 for a two-part job (× 1 for a quick one), rounded to 5.
  Extras get no generator-level lift. Example: Split spanner (10) + Gear (25) → 40 coins.
- **What it changes:** only the coins of orders that include an extra, and therefore their XP (an
  order pays a fifth of its coins as XP). That XP feeds level-ups and their energy.
- **What it does not change:** drop chance, the bad-luck limit, which orders ask for an extra, primary
  or gold prices, book coins, or clearing an extra (0 energy).
- **Expected effect of a change:**
  - Lowering it shrinks the gain where energy is the limit: 4–5 s, no shop. Fewer coins per extra
    order means more primary orders, so more taps.
  - It barely moves the energy-rich cells, whose extra time is handling actions, not coins.
- **Not changed this round, as instructed.**

### R2.2 Order purpose: use orders and near-term goals

Round 1 asked only what the held extras make. Now the secondary turns (every 3rd everyday order, one
extra order on the board at a time) alternate between two kinds:

| Kind | Asks | Example |
|---|---|---|
| **Use** | What the extras held (board, shed, or waiting for space) make by merging | 3 Bolts held → a Gear |
| **Goal** | At most `SECONDARY_ORDERS.goal = 1` drop beyond what is held | none held → a Bolt; 1 Bolt → a Gear; 3 Bolts → a Gear assembly |

A turn that cannot give its kind gives the other. Bounds:
- **A goal comes only from an open source.** The generator's extras must be open (after 4 deliveries;
  the Kite's after its 8th tap), so nothing waits on a sealed or later generator. There are no
  circular dependencies: drops come from taps, never from orders.
- **A goal comes only after the chain has been met.** Its first part must have been found or be
  waiting for space. The very first meeting is the drop itself, explained by its find moment, never
  an order for something unseen.
- **No high-tier walls.**
  - Tier 2 is asked only from the first stage built, tier 3 only from the third.
  - The chain's top part is never asked.
  - A goal is one drop away, so at most 14 eligible taps.
  - Drops never pause while an order wants that chain.
- **There is always a primary-only order.** Only one extra order can be on the board at a time, so at
  least two of the three or four cards ask no extra (asserted for every order of a full run).
- **Gold orders never ask an extra.**

Measured with the pilot metrics, round-2 rules (`node tests/v5-next-secondary-pilot-metrics.mjs 4,5,8,10 1,...,10 both off,bonus`):

| Speed, shop | Model | Total min (median) | Waiting share (mean) | Energy per primary unit | Energy per order | Orders delivered | Extra orders offered / delivered | Their wait (min, median) | Occupied spaces | Primary parts on board | Primary parts owned at order start | Longest dry run (eligible taps) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 s, no shop | Baseline | 320 | 0.51 | 0.48 | 8.19 | 128 | — | — | 11.5 | 5.5 | 11.2 % | — |
| 4 s, no shop | **B, round 2** | 229 | 0.31 | 0.48 | 8.47 | 117 | 17.2 / 12.8 | 3.9 | 12.9 | 6.3 | 7.2 % | 14 |
| 5 s, no shop | Baseline | 259 | 0.28 | 0.46 | 8.15 | 124 | — | — | 11.1 | 5.3 | 8 % | — |
| 5 s, no shop | **B, round 2** | 230 | 0.18 | 0.48 | 8.42 | 116 | 16.7 / 12.6 | 4.6 | 13 | 6.2 | 6.6 % | 14 |
| 8 s, no shop | Baseline | 352 | 0.12 | 0.49 | 8.38 | 126 | — | — | 12.7 | 6.8 | 7.9 % | — |
| 8 s, no shop | **B, round 2** | 314 | 0.04 | 0.48 | 8.40 | 117 | 18.2 / 13.8 | 6.7 | 13.3 | 6.2 | 8 % | 14 |
| 10 s, no shop | Baseline | 392 | 0.02 | 0.48 | 8.38 | 124 | — | — | 12.6 | 6.4 | 10.3 % | — |
| 10 s, no shop | **B, round 2** | 401 | 0.00 | 0.49 | 8.48 | 117 | 17.6 / 13.4 | 9.4 | 15 | 6.3 | 6.7 % | 14 |
| 4 s, shop | Baseline | 208 | 0.26 | 0.48 | 7.97 | 133 | — | — | 11.3 | 5.6 | 10.5 % | — |
| 4 s, shop | **B, round 2** | 164 | 0.07 | 0.48 | 8.22 | 123 | 17.7 / 13.1 | 3.5 | 12.6 | 5.6 | 6.1 % | 14 |
| 5 s, shop | Baseline | 185 | 0.03 | 0.46 | 7.93 | 128 | — | — | 12.4 | 6.3 | 7.4 % | — |
| 5 s, shop | **B, round 2** | 196 | 0.03 | 0.47 | 8.29 | 118 | 17 / 13.5 | 3.5 | 13.4 | 6 | 6.3 % | 14 |
| 8 s, shop | Baseline | 318 | 0.00 | 0.49 | 8.55 | 124 | — | — | 12.9 | 5.8 | 8.3 % | — |
| 8 s, shop | **B, round 2** | 307 | 0.00 | 0.48 | 8.39 | 117 | 19.1 / 13.9 | 5.1 | 14 | 5.8 | 6.1 % | 14 |
| 10 s, shop | Baseline | 366 | 0.00 | 0.48 | 8.41 | 123 | — | — | 13.2 | 6.3 | 7.3 % | — |
| 10 s, shop | **B, round 2** | 389 | 0.00 | 0.48 | 8.38 | 117 | 18.7 / 13.8 | 7 | 14.4 | 5.7 | 5.9 % | 14 |

- **Against the targets:**
  - **Waiting share is never above baseline.** It is equal at 5 s with the shop (0.03) and lower or
    zero everywhere else.
  - **Energy per primary unit is 0.47–0.49 against baseline 0.46–0.49.** Per seed:

| Speed, shop | Baseline, 10 seeds | B, 10 seeds | Mean difference (B − baseline, same seed) | B higher in |
|---|---|---|---|---|
| 4 s, no shop | 0.462–0.484 | 0.470–0.508 | +0.000 | 3 of 10 |
| 5 s, no shop | 0.460–0.466 | 0.449–0.500 | +0.011 | 9 of 10 |
| 8 s, no shop | 0.491–0.501 | 0.459–0.525 | -0.008 | 4 of 10 |
| 10 s, no shop | 0.468–0.499 | 0.453–0.528 | +0.006 | 6 of 10 |
| 4 s, shop | 0.476–0.485 | 0.460–0.500 | +0.005 | 6 of 10 |
| 5 s, shop | 0.450–0.483 | 0.445–0.500 | +0.014 | 8 of 10 |
| 8 s, shop | 0.475–0.493 | 0.456–0.529 | -0.005 | 3 of 10 |
| 10 s, shop | 0.465–0.496 | 0.453–0.510 | +0.001 | 6 of 10 |

  In six cells the mean difference is within ±0.008, and B is higher in 3–6 of 10 seeds: within the
  seeds' own spread. **At 5 s it is +0.011 (no shop) and +0.014 (shop), higher in 9 and 8 of 10
  seeds.** That is a small (2–3 %) but consistent increase, already there in round 1 (0.47 against
  0.46). So the target "no increase in primary-order energy" is met within noise everywhere except
  5 s, where it is narrowly missed (see remaining issues).
- **Extra orders.** About 17–19 are offered per run and 13–14 delivered. Their median wait rose from
  1–5 min to 3.5–9.4 min, because a goal order waits for a drop.
- **Board occupancy** is +1.4 to +2.4 spaces on average. The longest dry run was 14 eligible taps, and
  at most one extra waited for space.
- **Time against round 1.** Totals moved by −7 to +25 min per cell. B is still faster than baseline
  in 5 of 8 cells. It is slower at 10 s (+10, +23 min) and at 5 s with the shop (+10 min); see R2.1.

### R2.3 Drop protection, exactly

**The promise.** On the 14th eligible tap without a drop, a drop comes (the 3rd for a chain's very
first). An *eligible tap* is a tap of that kind of generator that:
- succeeds (energy spent, part made);
- comes while its extras are open;
- comes while they are not paused.

Any other tap is neither rolled nor counted. There is **no unconditional 14-tap maximum**: paused taps
do not count.

| Situation | Rolled? | Counter (`s.secSince`) | Test |
|---|---|---|---|
| Before the extras open (fewer than 4 deliveries; the Kite before its 8th tap) | no | unchanged | case 7 |
| Paused: 3+ extras of that chain below the top on the board **or waiting for space**, and no order wants one | no | unchanged | case 1 |
| Paused: 4 extras (any chain) already waiting for space. Round 1 rolled and lost this drop. | no | unchanged | case 2 |
| Full board: the tap is refused | no | unchanged, nothing spent | existing |
| Room for the tap's own part only | yes | a drop waits for space (saved) and resets the count; a waiting first drop counts as met | case 3 |
| Two copies of a generator | yes | one counter and one tap number per kind, either copy counts | case 4 |
| Merging two copies (a level-up) | — | counter and tap number kept | case 5 |
| Reload (also while paused or with a drop waiting) | — | counter, pause and waiting part kept; rolls are the tap number's hash, so a reload cannot re-roll | case 6, existing |
| Damaged counter in a save | — | reset to 0 (only delays, never resets the camp) | existing |

Cases are in `tests/v5-next-secondary.test.mjs`, "bad-luck limit counts eligible taps only…", and all
run at the worst luck (chance 0). The in-game text now says "at the latest on the 14th tap, while fewer
than three lie unused". Help adds that taps do not count while extras rest.

### R2.4 Save rollback: isolated and recoverable

**The risk, verified.** The pre-pilot engine (`cc63b84`) answers a save holding an extra
(`tests/fixtures/coast/coast-pilot-extras.json`) with a fresh camp. It still reads the pre-pilot
fixtures. The same holds for any pilot save whose book has ticked an extra. An older build cannot be
changed, so the fix is in this build and on:

1. **Never silent.** `readSave` (`v5/next/saves.mjs`) tells a save from a **newer** build apart from a
   damaged one. A newer save has a later version, or parts, generators or order parts this build does
   not know. Home then says: "This camp was saved by a newer version of Vaultwake, so this version
   cannot open it. It has been left exactly as it is…".
   - There is no Play button.
   - Nothing is written over the save across reloads.
   - A new camp starts only through "Start a new camp" and its confirmation, which first keeps the
     save under `vaultwake-v5-coast-damaged`.
2. **Nothing replaced is lost.** Three paths overwrote a camp before; each now keeps it first under
   `vaultwake-v5-coast-kept`, `-kept-2`…:
   - the menu's "Start the Coast Camp again";
   - Home's "Start a new camp";
   - the `?new=1` link.

   Kept copies are never overwritten or removed. An identical copy is kept once.
3. **A reliable way back: Kept camps.** The menu (and Home, over an unreadable save) lists every camp
   kept in this browser that this build can read, newest first, with its place and last play.
   - The sources are `-damaged…`, PR #80's `-backup` and `-kept…`.
   - **Restore** keeps the current camp first, then restores and reloads.

The round trip, tested in a real browser (`tests/v5-next-saves-browser.cjs`):
1. A pilot camp goes through an older build, which keeps it as `-damaged` when the player starts a
   new camp there.
2. Back in this build, the menu shows "Kept camps (1)".
3. Restore brings the pilot camp back with its Bolts and Gears, and keeps the older build's camp as
   `-kept`.

No key was renamed or cleared. Classic keys are untouched. `load()` and the save shape are unchanged,
so no migration is needed.

**What remains.** An older build itself (47s and before) still cannot open a save that holds extras.
It shows its "could not be read" Home with nothing overwritten, and keeps the save as `-damaged` if
the player starts a new camp there. Any build from 47t on brings it back through Kept camps. Before
wider sharing:
- serve the pilot on its own origin (as the preview does);
- or ship it only where older builds will not be served again on the same origin.

### R2.5 Visual ambiguity

All five edits are made by `tools/secondary-icon-edits.py` from the untouched masters in
`docs/art-source/{rover,kite}-secondary-2026-10-29/`. Each goes through the board-icon recipe
(`prepare-icon.py`) and is then re-measured (`measure-art-fit.py`; only these five entries changed).
No tile, glow or shadow is baked in.

| Icon | Problem | Edit |
|---|---|---|
| Gear (`mech-1`) | Read as the Brass cog (one upright toothed wheel) | Laid flat: 62 % height, turned 14°. A steel gear on the bench against the upright gold cog with its anchor. |
| Gear assembly (`mech-2`) | Same blue housing as the Hand-crank | Housing removed: two meshed gears. The Hand-crank keeps housing and handle. |
| Captain's logbook (`notes-3`) | Cover carried the story's wave seal | Seal removed (leather refilled, matched to the recess). A gold compass star, the mark of the Kite's papers, sits in the same ring. |
| Note fragment, Expedition note (`notes-0`, `-1`) | Ivory paper faded into the sand cells | Pale tones deepened by up to 20 % and warmed. A thin ink-brown edge follows the sprite's own outline. |

Checked on the real board (`tools/preview-secondary-pilot.cjs`, 390×844 and 907×510): the five read
apart from each other and from the cog, and there are no page errors.

**Assets that still need replacement artwork.** The edits are interim, not repaints:
- **Gear:** a painted three-quarter view with real thickness. The flattening keeps the front-lit
  painting.
- **Gear assembly:** two gears on a small bracket in a colour other than the Hand-crank's blue. With the
  housing removed it reads lighter than its neighbours at 45–55 px.
- **Captain's logbook:** the cover repainted with its own tooled mark. The star is drawn, and the refill
  is smoother than the painted leather around it.
- **Note fragment, Expedition note:** repainted in a deeper parchment. The edge helps, but the paper is
  still the palest thing on the board.
- **Unchanged and fine:** Bolt, Hand-crank mechanism, Travel notebook.

### R2.6 Validation of the exact head

- **Coverage.** The checks below were run on the final commit of this round, and the draft PR records
  the CI run for that same commit.
- **Why CI is not recorded here.** The round-1 report quoted CI for `ab79a60` while the branch head was
  `178db30`. The two later commits only touched this document, which is why they differed. A commit
  that wrote the CI result here would again be newer than the run it reports, so the result lives in
  the PR instead.
- **Local, final tree:**
  - `node --test tests/v5-*.test.mjs`: 332 pass, 0 fail (16 secondary-chain tests, 4 saves tests);
  - Chromium browser suites: `v5-next-browser` (360/390/430), `-playtest-` (360/390), `-bright-` (360/390/430/907×510, reduced motion), `-crazygames-` (907×510/390/360), `-home-`, `-story-`, `-rewards-`, `-chapter2-` and the new `-saves-` all pass; WebKit is not installed here (its launch fails at `pw_run.sh`), so WebKit comes from CI;
  - `node tools/coast-crazygames.mjs --check`, every `node --check` of the CI step, and the seal, resonance
    and journey metrics scripts pass.
- **Pre-existing CI failures** (base `b34a2b9`, run 40739490746, and round 1) are kept apart:
  - "Verify mobile render…" at `tests/v5-camp-browser.cjs:126` (Classic camp);
  - "Fresh coastal journey (webkit)" (Classic).

# Round 1 (the first pilot, build 47s)

## 1. State verified before the change

- **Engine** (`v5/next/game.mjs`, at `cc63b84`):
  - one chain per generator (`GENERATOR_CHAINS`);
  - a tap makes tier 0, every fourth tap tier 1, plus the generator level's lift;
  - a tap on a full board fails before energy is spent;
  - rewards with no space wait in `s.pending` and land once (Build 47a);
  - `load()` validates every cell and falls back to a new camp on bad data, while the app keeps the
    unreadable save under `vaultwake-v5-coast-damaged` (Build 47c).
- **Orders:**
  - three tutorial orders;
  - then everyday quick and two-part jobs in turn (quick, pair, pair);
  - one gold order at a time, which carries the next stage's materials;
  - coins are the parts' worth (`COIN_VALUE`) ×1.15 for a two-part job, plus the level lift;
  - a delivery gives +1 energy.
- **All 20 supplied secondary images are present** in `v5/assets/premium/coast/proposed/` (4 each for
  Rover, Kite, Rope Winch, Shell Trap, Lantern Kiln) with pixel-exact masters in
  `docs/art-source/*-secondary-2026-10-29/`. None was missing; none was regenerated.

## 2. The two chains

| Family id | Generator | Tier 1 | Tier 2 | Tier 3 | Tier 4 (top, a keepsake) |
|---|---|---|---|---|---|
| `mech` | Rivet Rover | Bolt | Gear | Gear assembly | Hand-crank mechanism |
| `notes` | Survey Kite | Note fragment | Expedition note | Travel notebook | Captain's logbook |

- **Ids.** `mech` and `notes` contain no digits: book keys are family + tier, read with `/\d+$/`.
- **No clashes.** Neither id is used elsewhere, and no part name repeats another (checked by a test).
  The art docs' name and silhouette notes still stand, for the director:
  - Gear against Brass cog;
  - the Logbook's wave emblem against the story's seal.
- **Registration** (`chains.mjs`): `CHAINS.mech` / `CHAINS.notes` with `secondary:true` and `gen`, and
  `SECONDARY_OF={rig:'mech',chart:'notes'}`. They are not in `GENERATOR_CHAINS`, so the primary
  chains, generator progression and the orders' "open chains" are unchanged.
- **Art.**
  - The eight prepared 192 px icons were copied to `assets/premium/coast/icons/mech-0…3.webp` and
    `notes-0…3.webp`.
  - `tools/measure-art-fit.py` was re-run: `art-bounds.mjs` gains the 8 measured entries, and they
    equal the art pass's numbers.
  - No per-sprite tuning was needed (none of the Rover and Kite items is an open or thin shape).

## 3. Output model: measured, B chosen

### What was compared

- Script: `node tests/v5-next-secondary-pilot-metrics.mjs [speeds] [seeds] [shop|noshop|both] [models] [key=value…]`.
- The scripted player plays Chapters 1–2 with:
  - the chains **off** (the game before the pilot);
  - **B, bonus:** the tap's own part *and*, sometimes, a secondary;
  - **A, replace:** sometimes a secondary *instead of* the tap's part. It is compensated: secondary
    orders pay the rarity price, and order energy and XP follow coins as for any order.
- Each seed also rolls its own drops.
- The models differ only in `SECONDARY_RULES[gen].model`; demand, pricing and the limit are the same.

### Final numbers

Ten seeds per row, speeds 4, 5, 8 and 10 s per action, with and without the shop's Energy packs.

- **Energy per primary unit:** taps spent for each tier-0 equivalent of primary parts delivered (a
  tier-*t* part counts 2^*t*). This is what a primary order's part costs in energy.
- **Owned at order start:** the share of a new order's primary parts already on the board when it
  came.

| Speed, shop | Model | Total min (median) | Chapter 1 min (median) | Waiting share (mean) | Energy per primary unit | Energy per order | Orders delivered | Primary parts on board | Primary parts owned at order start | Occupied spaces | Secondary orders offered / delivered | Their wait (min, median) | Drops |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 s, no shop | Baseline | 320 | 258 | 0.51 | 0.48 | 8.19 | 128 | 5.5 | 11.2 % | 11.5 | — | — | 0 |
| 4 s, no shop | **B (bonus)** | 205 | 165 | 0.28 | 0.47 | 8.35 | 115 | 6.2 | 6.7 % | 12.9 | 15.6 / 12.9 | 1.9 | 71 |
| 4 s, no shop | A (replace) | 311 | 244 | 0.46 | 0.51 | 8.71 | 119 | 5.8 | 6.5 % | 12.3 | 17 / 15.2 | 1.7 | 79 |
| 5 s, no shop | Baseline | 259 | 208 | 0.28 | 0.46 | 8.15 | 124 | 5.3 | 8.0 % | 11.1 | — | — | 0 |
| 5 s, no shop | **B (bonus)** | 223 | 176 | 0.19 | 0.47 | 8.42 | 114 | 6.0 | 6.1 % | 12.8 | 16.6 / 13.9 | 3.9 | 71 |
| 5 s, no shop | A (replace) | 296 | 244 | 0.33 | 0.50 | 8.64 | 119 | 6.0 | 6.1 % | 12.8 | 18.1 / 15.4 | 1.8 | 80 |
| 8 s, no shop | Baseline | 352 | 264 | 0.12 | 0.49 | 8.38 | 126 | 6.8 | 7.9 % | 12.7 | — | — | 0 |
| 8 s, no shop | **B (bonus)** | 315 | 227 | 0.03 | 0.48 | 8.38 | 116 | 6.4 | 7.8 % | 14.4 | 18.3 / 14.2 | 3.8 | 72 |
| 8 s, no shop | A (replace) | 354 | 269 | 0.11 | 0.51 | 8.92 | 116 | 6.2 | 5.3 % | 12.9 | 18.7 / 14.9 | 2.6 | 79 |
| 10 s, no shop | Baseline | 392 | 283 | 0.02 | 0.48 | 8.38 | 124 | 6.4 | 10.3 % | 12.6 | — | — | 0 |
| 10 s, no shop | **B (bonus)** | 381 | 283 | 0.00 | 0.48 | 8.46 | 114 | 6.5 | 6.7 % | 14.8 | 18.2 / 13.5 | 5 | 71 |
| 10 s, no shop | A (replace) | 418 | 314 | 0.05 | 0.51 | 8.96 | 116 | 5.9 | 7.1 % | 13.0 | 18.7 / 15.4 | 3.7 | 79 |
| 4 s, shop | Baseline | 208 | 153 | 0.26 | 0.48 | 7.97 | 133 | 5.6 | 10.5 % | 11.3 | — | — | 0 |
| 4 s, shop | **B (bonus)** | 156 | 117 | 0.04 | 0.47 | 8.18 | 119 | 5.8 | 5.3 % | 13.2 | 19.9 / 15.7 | 1.2 | 75 |
| 4 s, shop | A (replace) | 224 | 178 | 0.27 | 0.51 | 8.70 | 122 | 6.0 | 7.1 % | 13.1 | 19.4 / 15.3 | 1.7 | 85 |
| 5 s, shop | Baseline | 185 | 138 | 0.03 | 0.46 | 7.93 | 128 | 6.3 | 7.4 % | 12.4 | — | — | 0 |
| 5 s, shop | **B (bonus)** | 194 | 146 | 0.04 | 0.47 | 8.22 | 119 | 6.4 | 6.2 % | 13.5 | 17.8 / 14.2 | 1.3 | 73 |
| 5 s, shop | A (replace) | 237 | 184 | 0.13 | 0.51 | 8.82 | 120 | 6.5 | 6.5 % | 13.3 | 18.1 / 14.6 | 2.6 | 84 |
| 8 s, shop | Baseline | 318 | 226 | 0.00 | 0.49 | 8.55 | 124 | 5.8 | 8.3 % | 12.9 | — | — | 0 |
| 8 s, shop | **B (bonus)** | 309 | 228 | 0.00 | 0.48 | 8.46 | 115 | 5.8 | 5.2 % | 14.2 | 18.3 / 14.8 | 3 | 75 |
| 8 s, shop | A (replace) | 332 | 250 | 0.02 | 0.52 | 8.82 | 122 | 6.0 | 7.4 % | 13.3 | 19 / 15.6 | 3 | 86 |
| 10 s, shop | Baseline | 366 | 272 | 0.00 | 0.48 | 8.41 | 123 | 6.3 | 7.3 % | 13.2 | — | — | 0 |
| 10 s, shop | **B (bonus)** | 397 | 286 | 0.00 | 0.48 | 8.37 | 118 | 6.1 | 6.5 % | 14.6 | 18.1 / 14.9 | 2.6 | 73 |
| 10 s, shop | A (replace) | 406 | 300 | 0.01 | 0.51 | 8.74 | 122 | 5.9 | 6.9 % | 14.0 | 19.1 / 15.7 | 4.3 | 84 |

All 240 runs finished both chapters.

### Reading

- **Against the targets**, B (bonus) lowers or keeps the waiting share in 7 of 8 cells. The
  exception is 5 s with the shop: mean 0.04 against 0.03 (median 0.00 against 0.01). Its energy per
  primary unit is within ±0.01 of baseline (0.47–0.48 against 0.46–0.49).
- **A (replace) misses both targets.**
  - Primary units cost 6–10 % more energy (0.50–0.52).
  - Waiting is higher in 6 of 8 cells.
  - Chapters 1–2 take −9 to +52 min (median), longer in 7 of 8 cells.
  - The rarity price does not repay displaced primary parts where energy is tightest (Chapter 1).
- **Time and pacing.**
  - B is faster for quick players: −25 to −36 % at 4 s, −14 % at 5 s with no shop. Secondary
    orders use parts the player already holds and pay the rarity price, so they bring coins, XP and the
    delivery's +1 energy without taps.
  - B is about even at 5 s with the shop (+5 %) and at 8 s with it (−3 %), and −11 % at 8 s with no
    shop.
  - At 10 s with the shop it is +8 % (+31 min). That is play time, not waiting (0.00): the extra merges
    and tidying of secondary parts cost actions.
- **Energy per order** rises a little (+0.16 to +0.29 at 4–5 s; −0.09 to +0.08 at 8–10 s). Fewer
  orders are needed (114–119 against 123–133), because secondary orders pay more, while the taps per
  primary part stay level.
- **Board.**
  - B occupies 1.1–2.2 more spaces on average (out of 49, with the cargo opening up).
  - Primary parts on the board are the same (5.8–6.5 against 5.3–6.8).
  - The share of a new order's primary parts already owned falls from 7–11 % to 5–8 %: new orders
    find a little less ready-made.
- **Secondary demand.** About 16–20 secondary orders are offered per run and 13–16 delivered, with a
  median wait of 1–5 min. Undelivered ones are mostly replaced when a stage swaps an order for its gold
  order, or are still on the board at the end.
- **Merge XP is not where B's gain comes from.** With XP switched off for secondary merges (a test
  build, not kept), the median waiting share stayed below baseline: 0.28 against 0.52 at 4 s, 0.18
  against 0.27 at 5 s, no shop. The merge rule is therefore kept the same for every part.

### How the measurement shaped the rules

1. **A secondary order never asks a drop the player does not hold** (round 1; round 2 adds bounded
   goal orders, R2.2). At first the rule allowed one drop more than was held, since the bad-luck limit
   guarantees one within 14 taps. Measured, at 5 %
   that sent the scripted player tapping the Rover for luck: +80 min over the two chapters, with lower
   rates *worse* than higher ones. Asking only what the held parts make removed it.
2. **Secondary book pages pay no Brass cog.** Two more cogs (a generator level each) brought the Shell
   Trap out during the beach for a quick player, breaking the existing guard "the Shell Trap comes out
   at the worksite". The page's parts still pay their book coins.
3. **Board space is bounded.** A generator pauses its drops while 3 or more of its secondary parts
   (below the top) lie on the board and no order wants one.
4. **The scripted player tidies.** It never moved parts, so a lone Bolt stayed on a camp space for
   good. That space is where the player's merges crack the tideglass beside the Rover, and the board
   cost alone added +130 min.
   - The policy now puts an unwanted, twinless secondary part in the shed and brings it back for an
     order or a twin. It also clears a finished keepsake once it is in the book.
   - Rare wanted parts are kept up to the number wanted. The old all-or-none keep merged away a
     wanted Gear assembly whenever a second one existed.
   - Baseline runs never meet these branches, so baseline numbers are unchanged (258.5 min at 5 s,
     no shop, before and after).

### Chosen model and exact rates (`SECONDARY_RULES`, `SECONDARY_ORDERS` in `game.mjs`)

| Rule | Rivet Rover → Mechanisms | Survey Kite → Expedition records |
|---|---|---|
| Model | B: bonus (tap's part + secondary) | B: bonus |
| Opens | after 4 crew orders delivered | after 4 orders and the Kite's first 8 taps |
| Chance per tap | 10 % | 10 % |
| Bad-luck limit | a drop at the latest on the 14th **eligible** tap without one (R2.3); the first one by the 3rd | same |
| Drop | tier 1 (Bolt / Note fragment), beside the generator | same |
| Pause | while 3+ of its secondary parts below the top lie on the board or wait for space and no order wants one; and while 4 extras wait for space (round 2) | same |
| Energy | none for the drop (the tap costs its 1); clearing a secondary part gives none | same |

- **Rolls and the limit.**
  - The roll is the tap's own number hashed, so a reload cannot re-roll it.
  - The counter `s.secSince` is saved and survives a reload; this is tested.
  - Over 240 runs the longest dry run of eligible taps was 14.
- **Timing at 5 s** (median of 10 runs):
  - first Bolt at 6 min, after the 3 tutorial orders and one more;
  - first secondary order at 17 min;
  - Survey Kite at 14 min, first Note fragment at 26 min.

**Orders** (`SECONDARY_ORDERS={every:3,top:2,rarity:2}`):
- **Which orders.** Every 3rd everyday order may ask one secondary part, and only while no other
  order on the board asks one. The other two or three orders never wait on a drop.
- **Mixed or alone.** A two-part job keeps its first (primary) part and asks the secondary as its
  second: a mixed order. Every third such order is a quick job for the secondary alone.
- **Never gold.** Never in a gold order, so no stage or chapter requirement depends on a drop, and
  there is no circular dependency.
- **Tier ramp.** Tier 1 first; tier 2 from the first stage built; tier 3 from the third. In round 1,
  always only what the secondary parts held (board and shed) make by merging; round 2 alternates that
  with goal orders one drop beyond (R2.2). The chain's top part is never asked: it is the book's
  keepsake.
- **Price.** A secondary part pays as a part 2 tiers higher: Bolt 10, Gear 25, Gear assembly 45
  coins, against 5, 5 and 10 for the same tiers of a primary chain.
  - The rarity is 2 because tiers 0 and 1 both pay 5 coins: at 1, a Bolt would pay exactly what a
    Copper offcut pays.
  - The generator-level lift does not apply to secondary parts.

**Full board and duplicates:**
- A tap on a full board is refused before anything is spent, rolled or counted.
- A tap that fills the last space makes its own part there, and its secondary waits in `s.pending`
  (saved). It lands once, after the next action that frees a space.
- Round 1: past 4 waiting secondaries, a drop counted as a miss. Round 2: with 4 waiting, drops pause
  instead, so none is rolled and lost (R2.3).
- Tests check the part is neither lost nor doubled across a reload.

## 4. Saves

- No key changes:
  - Coast Camp saves stay in `vaultwake-v5-coast`;
  - Classic `vaultwake-v5`, `vaultwake-v5-replay` and `vaultwake-v5-active-slot` are untouched.
- **New field: `s.secSince`** `{rig, chart}`. Saves without it get 0s.
- **Damaged values.** A damaged value (not an integer in 0…14, or an unknown key) only restarts that
  count. It never resets the camp.
- **Older saves.** `tests/fixtures/coast/coast-ch1-pre-secondary.json` (41 min into the beach, Kite
  out) and `coast-ch2-pre-secondary.json` (inside the Observatory) were made by the engine at
  `cc63b84`. They load with board, coins, stages, found parts, orders, taps, book, shed and materials
  unchanged, and play on.
- **Rollback caveat.**
  - A save that holds a secondary part is not readable by a build before this pilot: it rejects the
    unknown family.
  - That build's app (47c on) leaves the unreadable save as it is on its Home ("could not be read"),
    and keeps it under `vaultwake-v5-coast-damaged` if the player starts a new camp there.
  - Round 2 makes this recoverable and never silent (R2.4).

## 5. Presentation

- **On the board.**
  - Secondary parts use the painted icons with their measured fit, like every part. No badge, tag or
    new panel was added.
  - A drop lands beside the generator with the board's arrival pop, a small burst and the "rare"
    sound. The message line says "Copper offcut · and a Bolt".
- **First find of each chain.** One short moment: "New: Bolt — A rare Rivet Rover extra. A tap
  sometimes adds one, at no extra energy: at the latest on the 14th tap, while fewer than three lie
  unused (round 2 wording). Crew orders ask for them · merge two for a Gear."
- **Selecting a secondary part.** It says where it comes from first, because the panel shows two lines
  until tapped: "★ Bram needs this. A rare Rivet Rover extra. A tap sometimes adds one… Merge with a
  twin → Gear assembly." Its "Clear" button is always there and gives no energy.
- **Tapping an order that asks one.** It names the part and its source: "Gear: merged from Bolts, a
  rare Rivet Rover extra…". The order's route reads "A rare extra from Rivet Rover taps (at the
  latest on the 14th tap), then merge up…".
- **The guide's tap hint.** When only a secondary part is missing it says "Tap Rivet Rover: a Bolt
  comes now and then".
- **Collection book.**
  - "Rivet Rover extras" and "Survey Kite extras" pages appear once their first part is found.
  - Each part pays its book coins once, and a full page shows "✓ Complete".
  - Finds stay found after delivery.
- **Normalisation checked on the real board** at 360×780, 390×844, 430×932 and 907×510
  (`node tools/preview-secondary-pilot.cjs OUT`): both chains beside their generators and primary
  parts, a selected Gear, the order's route, the book page, and the first-drop moment.
  - No page errors and no sideways scroll at any size.
  - Cells are 44.8 / 49.1 / 54.8 / 65.7 px.

## 6. Tests

- **`tests/v5-next-secondary.test.mjs`** (new, 14 tests):
  - registration and art;
  - pre-pilot saves (two fixtures) and damaged counters;
  - both chains merge to the top and no further;
  - the bonus drop costs one energy and the first comes within 3 taps;
  - the bad-luck limit at worst luck (exactly every 14) and across reloads;
  - rolls are identical with or without reloads;
  - full board: no spend, no roll; a waiting drop survives a reload and lands once;
  - the pause rule;
  - recycling gives no energy;
  - model A for the measurements;
  - pricing above common parts of the same tier, with no level lift;
  - a full scripted Chapters 1–2 run checking every order: never gold, one at a time, only what is
    held, at least one order without a rare drop, mixed and single orders, most delivered;
  - the tier ramp and parts in the shed;
  - book finds persist and pay once, and secondary pages pay no cog;
  - a delivery pays once;
  - the guide hint.
- **Existing tests updated:**
  - `v5-next.test.mjs`: `BOOK_CHAINS` now ends with `mech`, `notes`;
  - `v5-next-browser.cjs`: the UI driver can store and unstore through the shed;
  - `v5-next-policy.mjs`: the tidying and keep rules above.
- **Run:**
  - `node --test tests/v5-*.test.mjs`: 326 pass, 0 fail (the economy guard included), plus the 14
    new tests.
  - Browser, Chromium: `v5-next-browser`, `-playtest-`, `-bright-` (390/430/907×510, reduced motion),
    `-crazygames-` (907×510/390/360), `-home-`, `-story-`, `-rewards-` and `-chapter2-` all pass.
  - WebKit is not installed in this container, so its runs error at launch. That is an environment
    limit, not a regression; CI runs both engines.
- **CI** (`test.yml`, run 40811310342 on `ab79a60`):
  - Rules, V5 simulations, module checks and "Coast Camp CrazyGames page is made from play.html"
    pass. That page was regenerated for build 47s in `ab79a60`.
  - "Coast Camp browser tests (Chromium and WebKit)" passes: all eight suites in both engines. That
    includes WebKit Chapter 2, which failed on `/Neri/` in the base run.
  - Two failures, both pre-existing and outside Coast Camp. Each fails identically on base
    `b34a2b9` (run 40739490746):
    - "Verify mobile render…": `tests/v5-camp-browser.cjs:126` (Classic V5 camp), `true !== false`;
    - "Fresh coastal journey (webkit)": the Classic coastal journey, the same assertion.

## 7. Remaining issues (for the director), after round 2

1. **Pacing depends on how energy-bound the player is** (R2.1).
   - B is faster where energy is the limit: −28 % at 4 s, −11 % at 5 s and 8 s without the shop,
     −21 % at 4 s with it.
   - It is slower where the player is patient and energy-rich: +6 % at 5 s and 10 s with the shop,
     +3 % at 10 s without (medians of the pilot metrics).
   - Two of ten drop sequences (seeds 2 and 4) are slow in every cell.
   - The levers are `rarity`, `every` (3 → 4) and how much handling extras need. None is applied
     without a decision.
2. **Primary energy at 5 s** is +0.011 / +0.014 per primary unit (2–3 %), higher in 8–9 of 10 seeds;
   the other cells are within seed noise (R2.2). This was already in round 1. It is not yet isolated;
   the candidates are the keep rule for wanted extras and goal orders' Rover taps.
3. **Art.** Five icons carry interim edits; the repaints they still need are listed in R2.5.
4. **Rollback.** Builds 47s and older still cannot open a save holding extras. Nothing is lost and
   47t+ restores it (R2.4), but serve the pilot on its own origin until a release carries it.
5. **The scripted player is still a proxy.** It tidies about 105 shed moves a run. Real players may
   hold more extras on the board; the pause rule bounds that to 3 per chain.
6. **Prepared, inactive.** Rope Winch Sailmaking, Shell Trap Pearlcraft and Lantern Kiln Stained Glass
   sit in `proposed/` with their open art notes. Activating one means:
   - adding a `CHAINS` entry and a `SECONDARY_OF` / `SECONDARY_RULES` pair;
   - moving its icons into `icons/` and re-running `measure-art-fit`, applying the proposed
     `TARGET_OF` for the Finished Sail and the Glass Mosaic;
   - re-running the metrics and pacing scripts.
7. **WebKit** is not installed in this container: its results come from CI only.
