# Vaultwake V5 Coast Camp — economy audit and proposal (2026-10-24)

Branch `claude/v5-bright-coast` (from `claude/v5-autonomous-rebuild` e020a5f). **Nothing in this
document is implemented.** Build 44 changes presentation only; the game's economy, drop rates,
order generation and progression are exactly as at e020a5f. The proposal below waits for approval.

Player feedback this answers: *orders complete too easily and feel repetitive*; *the
energy/effort/reward relationship is unsatisfying*.

## How it was measured

`node tests/v5-next-economy-audit.mjs . 3,5,8,12 1,2,3,4,5`: the existing scripted player
(`tests/v5-next-policy.mjs`) at 3, 5, 8 and 12 seconds per action (each action's time jittered
±40 % by the seed), five seeds each, through Landing Beach and through the whole chapter (beach
plus Survey Worksite, 21 + 21 stages). When it has nothing useful to do and energy is out it
takes the free ration, otherwise it waits. Numbers are means over seeds unless marked median.
The player is greedy and never wastes a tap, so a person needs more actions; *ratios* are the
reliable part.

Glossary: **units** = an order's size in generator parts at level 1 (a tier-t part is 2^t parts:
Split spanner = 4); **ready at birth** = an order that is already on the board when it appears;
**wait** = real time − actions × speed.

## Rules as they are (e020a5f)

| What | Value | Where |
|---|---|---|
| Tap a generator | 1 energy, one part | `game.mjs` `produce` |
| Part tier from a tap | Lv1: tier 0, every 4th tap tier 1. Lv2: +1 every 3rd. Lv3: +1 every 2nd. Lv4: +1 always. Lv5: +1, every 3rd +2 (max tier 3 from a tap) | `kits.mjs` `levelLift`, `game.mjs:351` |
| Generator levels | merge two of the same level, or a Brass cog; Lv3 releases the next kind; copies come from stages | `game.mjs` `release`, `areas.mjs` |
| Energy | +1 / 2 min up to 50; ration +8 once an hour at ≤3; level-up +15 (tops up to 50); stage rewards; jars in cargo; shop pack 80 coins for 20 (3 a day); daily gift; ad +15 | `energy.mjs`, `game.mjs` |
| Order coins | sum of `COIN_VALUE[tier]` × count, `COIN_VALUE=[5,5,10,25,45,80,140,240]`; gold order ×1.5 | `game.mjs` `priceOf` |
| Everyday orders | turns easy/middle/hard by thirds of a tier-sorted list; 60 % of tier ≤2 asks ask two; a second part 20 %→60 % of the time as the beach is built | `game.mjs` `makeOrder` |
| Gold order | newest generator's part one tier past its level + two of a second chain; its delivery brings the next stage's materials | `game.mjs` `goldNeeds` |
| Stages | beach 7 places × 3 stages, 40–230 coins; worksite 7 × 3 | `areas.mjs` |
| Board | 49 cells, most of them cargo and tideglass at the start | `game.mjs` `fresh` |

## Baseline measurements

Landing Beach (one area, 21 stages):

| s/action | real min | active min | waiting min | taps | orders | everyday ready at birth | everyday median units / min | coins per unit (everyday / gold) | orders per stage (median) | taps per stage | energy from levels / regen / ration | free cells median (p10) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | 126 | 40 | **86** | 368 | 42 | 14 % | 8 / 1.3 | 2.72 / 4.44 | 2 | 16 | 241 / 62 / 16 | 9 (6) |
| 5 | 132 | 66 | **66** | 364 | 43 | 14 % | 8 / 3.7 | 2.73 / 4.44 | 2 | 16 | 235 / 65 / 16 | 9 (6) |
| 8 | 138 | 108 | 30 | 370 | 44 | 13 % | 8 / 8.7 | 2.72 / 4.44 | 2 | 16 | 234 / 67 / 16 | 9 (6) |
| 12 | 160 | 159 | 1 | 366 | 44 | 10 % | 8 / 8.6 | 2.73 / 4.44 | 2 | 17 | 231 / 78 / 8 | 8 (5) |

Whole chapter: 336–379 real minutes, 1,708–1,736 actions, ~790 taps, 67–70 orders; waiting is
257 / 192 / 133 / 37 minutes at 3 / 5 / 8 / 12 s per action.

What the numbers say:

1. **Orders are small and alike.** The median everyday order is 8 units (one Pocket winch, or two
   Split spanners); 55–65 % of everyday orders top out at tier 2; 10–14 % are already on the board
   when they appear. 28–30 % of everyday orders on the beach repeat one of the last four (same
   chain, tier and count), and on a quarter of the beach's boards all everyday orders start with
   the same chain (early on only Rivet Rover and the Survey Kite are out).
2. **Reward does not grow with effort.** Coins per unit are flat (2.7) whatever the order's size;
   only the gold order pays more (4.4 a unit) and it is three times the work (24 units).
3. **A stage is about two orders.** Median: one gold order and one everyday order per stage, 16
   taps. The gold order carries the stage; everyday orders mainly top up coins.
4. **Energy is shaped by level-ups, not by the clock.** About 71 % of the beach's energy comes
   from level-up refills (~235 of ~330), 20 % from the 2-minute regeneration. A fast player
   (3 s/action) spends 68 % of the beach *waiting* for energy; a slow one (12 s) never waits.
   The same 365 taps buy the beach at every speed; only the waiting changes.
5. **The board is never the limit.** A median of 8–9 free cells (10th percentile 5–6); the
   scripted player was never blocked by a full board. Tideglass and cargo give free parts.

## Proposal A — order roles and a reward curve (recommended for a trial)

Patch (for review only, not applied): `docs/V5_ECONOMY_PROPOSAL_A_2026-10-24.patch`, against
`v5/next/game.mjs` `makeOrder`. Gold orders, stage costs, generators, drop rates, energy and
board are unchanged.

- **P1 roles.** Everyday orders take turns being *short* (one chain, the area's floor tier or one
  under it, sometimes two of them), *medium* (two different chains, one tier over the floor and
  one under it) and *long* (one part one tier past what its generator makes easily). The first
  chain of a new order is one that no other everyday order on the board starts with, when the
  area has one; only unlocked chains are used, and nothing is asked above `maxTier − 1`.
- **P2 reward curve.** Coins = the part values × 1.0 (short), × 1.15 (medium), × 1.3 (long),
  rounded to 5. Gold orders keep ×1.5.

Measured the same way (same speeds, seeds and player):

| Landing Beach | 3 s | 5 s | 8 s | 12 s |
|---|---|---|---|---|
| real minutes: baseline → A | 126 → 84 | 132 → 105 | 138 → 125 | 160 → 150 |
| waiting minutes | 86 → 46 | 66 → 42 | 30 → 24 | 1 → 0 |
| everyday ready at birth | 14 % → 0 % | 14 % → 4.5 % | 13 % → 4.5 % | 10 % → 4.9 % |
| everyday top tier 1 / 2 / 3 / 4 (share) | 14/45/12/29 → 26/26/26/21 | 9/55/14/23 → 27/36/27/9 | → 27/36/27/9 | → 29/32/26/12 |
| coins per unit (everyday) | 2.72 → 3.45 | 2.73 → 3.31 | 2.72 → 3.31 | 2.73 → 3.36 |
| taps for the beach | 368 → 342 | 364 → 351 | 370 → 351 | 366 → 352 |
| orders per stage (median) | 2 → 2 | 2 → 2 | 2 → 2 | 2 → 2 |

Whole chapter: real minutes 344 → 288 (3 s), 336 → 355 (5 s), 363 → 376 (8 s), 379 → 376 (12 s);
taps 761–831 against 786–796.

Read honestly:

- A spreads difficulty (tiers 1–4 in roughly equal shares instead of mostly tier 2), nearly ends
  orders that arrive already done, and pays more for bigger orders, without making anyone wait
  longer: fast players wait less on the beach because effort now pays.
- It does **not** fix repetition by this measure (28–30 % → ~30 %) or same-chain boards on the
  beach (~25 %): with one or two chains out early, short orders repeat by nature. A real fix
  needs the game to remember the last few delivered orders (a new save field, so a `load()`
  migration and an old-save test), or the Survey Kite out earlier. Both need approval.
- Two-part orders fall from ~47 % to ~18 % on the beach (the medium turn needs a second chain).
- The beach gets faster for fast players. If that is unwanted, stage costs (not order sizes)
  are the dial.

## Proposal B — rebalancing energy (measured, not recommended)

B = A plus: level-up refill 15 → 10, and +1 energy per 8 units of every everyday order delivered
(work pays energy back). Result: **worse**. Waiting on the beach rose to 161 / 140 / 68 / 42 minutes
(3 / 5 / 8 / 12 s), and the whole chapter to 466 / 414 / 278 / 183 minutes of waiting. The
energy-back does not replace the level-up refills, so B only adds forced waits, which the brief
rules out. The level-up refill should stay as it is unless something else replaces it.

## Recommendation

1. Approve P1 + P2 for a playtest build (behind the measured guard in
   `tests/v5-next-economy.test.mjs`, which would need its bounds re-checked), or ask for a
   variant (for example long orders ×1.2).
2. Decide whether to add order memory (repetition) — needs a save migration.
3. Keep energy as it is for now; the waiting a fast player meets is the existing design, and the
   only lever that measured better is P2 (more coins for effort), not less energy.

Raw JSON lines: run the audit command above on this branch (baseline) or on a copy of `v5/` with
the patch applied.
