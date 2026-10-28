# V5 Coast Camp: a harder start (2026-10-27, Build 46k)

Scope: Coast Camp only. Gameplay branch `claude/v5-audit-fixes`.

The user wrote: "Nadad manai togloom ehneesee mash amarhan sanagdaad baigaa toglogchid hetsuu davan
tuulj baigaa medremj uguhgui" (the game feels very easy from the start; players do not get the
feeling of overcoming something hard). They chose option A: change the difficulty curve with
existing systems, with no new rules. Option B (timed challenge orders) and option C (area boss goals)
are not built.

## What made the start easy (measured)

Scripted player (`tests/v5-next-policy.mjs`), first 30 minutes, mean of seeds 1–5, Build 46j:

| | 5 s an action | 7 s an action |
|---|---|---|
| Energy at 10 / 20 / 30 min | 42 / 19 / 6 | 43 / 37 / 23 |
| Time with energy out | 0 min | 0 min |
| Stages built | 11 (one per 2.7 min) | 7.8 |
| First gold order delivered | 1.5 min | 2.1 min |

Why:
- **Energy never ran out:** 40 to start, +15 per level (a level every ~4 min) and +1 per delivery.
- **Goals were short:** a stage every ~3 min.
- **Orders were easy:** every order was within one level of what the generator makes.

## Change (`game.mjs`)

| | Before | Build 46k |
|---|---|---|
| Energy in a new camp (`START_ENERGY`) | 40 | **30** |
| Energy per level-up, levels 2–5 (`levelEnergy`) | +15 | **+5** (from level 6: +15 as before) |
| Gold order's main part, first six stages (`GOLD_LIFT`, `GOLD_LIFT_STAGES`) | one level past what the generator makes easily | **two levels past**. For example, the first gold order asks a Pocket winch and two Split spanners, where it asked a Split spanner and two Grip tools. |

From the seventh stage, gold orders are as before.

## Tried and rejected

- **"Hard" crew orders** (every third order one level bigger, ×1.25 pay). They changed nothing
  measurable in the first half hour, because the gold order dominates, and they broke variety and
  pricing tests.
- **Bigger gold orders for the whole campaign.** Crew orders were delivered far less often, and
  repeat-variety fell below its guard.
- **Harsher energy:**
  - 25 start with +5 levels up to 6: the 5 s player waited 24 of the first 30 minutes.
  - 25 start with +6: 18 minutes of waiting.

## Measured after

**First 30 minutes**, same harness:

| | 5 s an action | 7 s an action |
|---|---|---|
| Energy at 10 / 20 / 30 min | 10 / 0 / 0 | 18 / 13 / 0 |
| First time out of energy | about 12 min | about 17 min |
| Time out of energy or waiting | 16 min | 4 min |
| Stages built | 7 (one per 4.3 min) | 7 |
| Taps per order | 12 (was 7) | 12 |

**First 15 minutes**, worst seed, 4 s → 10 s an action:

| | Before | Build 46k |
|---|---|---|
| First restoration | 1.3–3.3 min | 2.1–5.3 min |
| First cargo or generator merge | 1.9–4.8 min | 3.4–8.6 min |
| Orders delivered | 8–18 | 4–8 |
| Restorations | 3–7 | 3–7 (unchanged) |

**Whole campaign** (economy guard harness, 8 speeds × 5 seeds, shop on):
- every guard passes, and energy runs out at every speed;
- the Shell Trap still comes out at the worksite (63 vs 52 min at 4 s);
- mean real time 2.1–4.1 h (was 1.8–4.1 h);
- the lowest share of low-energy moments with a free move is 50 % at 5 s, exactly at the guard's
  limit.

## Tests changed on purpose

These encoded the old, easy start; each now says why it changed.

| Test | Before | Now |
|---|---|---|
| A new camp's energy | 40 | 30 |
| Level-up energy | +15 at every level | +5 for levels 2–5 |
| First gold order | tier 2 | tier 3 |
| First upgrade (beach run) | within 3 min | within 6 min |
| First restoration (first 15 minutes) | ≤ 4.5 min | ≤ 6 |
| First discovery (first 15 minutes) | ≤ 8 min | ≤ 9.5 |
| Orders in 15 min | ≥ 8 | ≥ 4 |

A new test checks:
- 30 starting energy;
- the level-energy rule;
- the bigger first gold order;
- that gold orders are back to normal from the seventh stage.

## Saves

No state-shape change. An existing save keeps its energy and its orders. The new rules apply to new
level-ups and to gold orders made from now on.

## Risk and what to watch

- **A fast player waits for energy early.** At 5 s an action, about half of the first 30 minutes is
  spent out of energy. The shop's Energy pack, the daily gift, the ad offer and the field ration
  are the ways out. A real player is usually slower than 5 s an action. A playtest should check
  whether the first wait, at about 12 minutes, feels like a challenge or like a wall.
- **A quick knob if it is too much:** `EARLY_LEVEL_ENERGY` (5 → 8). Measured: the first squeeze
  then comes at 18 min at 5 s, with 8 minutes of waiting.
