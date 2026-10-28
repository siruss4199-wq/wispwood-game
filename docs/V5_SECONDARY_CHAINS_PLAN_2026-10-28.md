# Vaultwake V5 Coast Camp — secondary chains: state, baseline and proposal (2026-10-28)

**Status: design and measurement only.**
- No gameplay rule, drop rate, order rule or save field is changed by this document or its scripts.
- Secondary chains would be a new gameplay system. Under CLAUDE.md they need the director's
  approval before any code.
- Balance proposals (below, section 5) are kept apart from visual work (section 7).

**Branch.** `claude/v5-ch12-visual-qa`.
- Build 47f at `f062d29` (on Build 47e `7a769a2`).
- Measured with the game as it is there.

**The Rover assets.** The attached Rover assets did not reach this session: there was no attachment
and the upload folders were empty. Art preparation (section 4) is therefore a checklist for them,
not a review of them.

## 1. Done and pending

| Area | State at `f062d29` | Evidence |
|---|---|---|
| Full-board rewards wait, survive reload, land once, keep order | **Done** (47a), extended to Chapter 2's rewards (47f) | `tests/v5-next-rewards.test.mjs` (6), `tests/v5-next-rewards-browser.cjs` |
| Old saves: Chapter 1 ended, old ending seen, archive read | **Done** (47b, 47e) | `tests/v5-next-chapter2.test.mjs` |
| Vault visibly opens; Chapter 1 leads into the first Chapter 2 objective | **Done** (47f) | `tests/v5-next-chapter2-browser.cjs`, recording |
| Chapter-end text, labelled stats, no promised Chapter 3 | **Done** (47f) | same |
| Restoration before/after on the coast | Beach and worksite: painted stage cut-outs and colour returning. Observatory: colour returning only (no clean plate; missing art 3 in the integration doc). Vault door: CSS rings and the opening. | 47f screenshots |
| Merge sound, separate sound and haptics settings | **Done** (Bright E, Build 44). Haptics use `navigator.vibrate` only where it exists, and an iOS switch fallback; both are optional. | `v5/next/sfx.mjs`, `v5/next/haptics.mjs` |
| Selection, valid merge targets, producers, ice states | **Partly.** Selected and twin highlights exist, producers have their own frame, ice has two cracked states. A consistency pass against the new secondary art is **pending**. | `v5/next/app.mjs` tile classes, `bright.css`/`coastal.css` |
| Item scale and shadows | Measured per sprite (`tools/measure-art-fit.py`, `art-bounds.mjs`). New art must go through it. | test "board art: every sprite is measured" |
| Generator output variety | **Pending (this plan).** A tap makes its own chain only: tier 0, and every fourth tap tier 1 (plus level lifts). | `game.mjs` produce |
| Energy pacing | **Pending (this plan).** Baseline below. | section 3 |

## 2. Reward and save reliability (step 2)

Nothing open was found.
- `node --test tests/v5-*.test.mjs`: 312/312 at `f062d29`. This includes the Observatory's rewards
  on a full board through a reload.
- In 20 scripted Chapter 1–2 runs (two speeds, five seeds, with and without the shop), the board
  never filled and no reward had to wait.
- Any secondary-chain change must keep these tests and add its own: a secondary drop on a full
  board, and its order on reload.

## 3. Baseline: energy and order economy (step 3)

Command: `node tests/v5-next-economy-baseline.mjs 5,8 1,2,3,4,5 shop|noshop` (new). It runs the
scripted player from a new camp to the end of Chapter 2 and gives one JSON line per run.

The figures are means of five seeds at 5 s and 8 s per action.
- "shop" buys the coin Energy pack when out of energy; "noshop" never does and waits for the refill.
- The scripted player wastes nothing, so a real player's taps per stage and waiting are higher.

**Whole run.**

| | 5 s, shop | 5 s, no shop | 8 s, shop | 8 s, no shop |
|---|---|---|---|---|
| Total (min) | 190 | 259 | 309 | 351 |
| Active / waiting (min) | 184 / 6 | 186 / 72 | 309 / 0.4 | 308 / 42 |
| Energy packs bought / rations | 3 / 1 | 0 / 3.6 | 2.6 / 0.6 | 0 / 4.2 |

**Per segment, 5 s, no shop.** The table is the same in shape with the shop and at 8 s; the full
lines are in the JSON.

| | First 15 min | Rest of Chapter 1 | Tide Archive | Observatory |
|---|---|---|---|---|
| Minutes (active / waiting) | 15 / 0 | 120 / 72 | 3.9 / 0 | 47 / 0 |
| Taps / merges / deliveries | 83 / 73 / 6.4 | 630 / 534 / 79 | 22 / 15 / 4.8 | 266 / 219 / 32 |
| Stages bought / taps per stage | 5.4 / 15.5 | 39.6 / 15.9 | 3 / 7.3 | 15 / 17.7 |
| Energy spent | 83 | 630 | 22 | 266 |
| Energy in: level-ups / refill / stage rewards / orders / rations / cargo | 41 / 7 / 8 / 1 / 8 / 0 | 402 / 96 / 73 / 39 / 16 / 10 | 9 / 2 / 23 / 2 / 0 / 0 | 138 / 24 / 69 / 17 / 5 / 0 |
| Coins earned | 581 | 6,361 | 348 | 2,674 |
| Everyday orders / distinct part sets / repeat of last 4 | 4.4 / 4.4 / 0 % | 52 / 38 / 0 % | 4.8 / 4.8 / 0 % | 25 / 20 / 0.8 % |
| Orders ready the moment they appear / share of parts already owned | 0 % / 4 % | 0 % / 9 % | 0 % / 0 % | 0 % / 6 % |
| Taps by generator | Rover 83 | Rover 234, Kite 207, Winch 105, Shell 55, Kiln 29 | Kiln 13, Shell 3, Rover 4 | Lens 68, Kiln 52, Kite 49, Winch 40, Shell 29, Rover 29 |
| Taps that made a tier-0 part | 63 % | 48 % | 38 % | 46 % |

**Order difficulty** (`order-ease`, 5 s, seeds 1–3):
- Chapter 1: 54–67 everyday orders. 3–4 % ask nothing above tier 1. Tiers asked: 1 ≈ 20 %,
  2 ≈ 45 %, 3 ≈ 40 %, 4+ ≈ 10 %. About one in three is a single-part quick job (median 35 coins).
- Chapter 2: 25–30 orders. None asks only tier 1; the median pays 55 coins.
- Orders are completed in a median of 2.1–2.2 min; the 90th percentile is 14–20 min.

**What the baseline says about the reported problems.**
- **Energy drains fast relative to progress.** A restoration stage costs 15–18 taps. Most energy
  comes back through level-ups (about 60 % of all energy in); the timed refill gives only 10–15 %.
  When the shop is not used, all waiting falls in Chapter 1: 42–72 min, mostly between the worksite
  and the Vault door. Chapter 2 has none, because coins limit it, not energy. So energy feels tight
  in Chapter 1 and loose in Chapter 2.
- **Output is repetitive.** Each generator makes its own chain only, and 45–63 % of taps give its
  tier-0 part. The Rover and the Kite take 70 % of Chapter 1's taps (441 of 630): the most
  repeated actions in the game.
- **Orders.** They rarely repeat part sets in a row (0–1 %). Over a chapter, though, a third of
  them ask a set already asked before (38 distinct of 52), and most of those are Rover and Kite
  tiers 2–3. Orders are seldom trivial (0 % ready at birth), but they turn over fast: median 2 min,
  and a third are single parts.
- **Board space.** The board is never full in these runs: median 11–12 of 36 cells used in
  Chapter 1, 16–20 in the Observatory, 90th percentile ≤ 22. There is room for some extra items,
  but not unlimited.

## 4. Art preparation and the existing chains (step 4)

The names are proposals and the art was not received. These checks apply once it arrives.

**Names already in use** (avoid them and their near-synonyms):
- Rover (8 tiers): Copper offcut, Grip tool, Split spanner, Pocket winch, Crawler jack, Bridge rig,
  Dune hauler, Expedition crawler.
- Kite (8 tiers): Ink scrap, Route fold, Sight lens, Survey scope, Bearing dial, Star chart, Horizon
  model, Sky atlas.
- Winch: Frayed twine, Rope coil, Fishing net, Pulley block, Rope ladder, Cargo hoist.
- Kiln: Candle stub, Tin lantern, Storm lantern, Signal lamp, Beacon lens.
- Shell Trap: Sand dollar, Cockle shell, Conch, Pearl oyster, Nautilus, Coral crown.
- Lens Bench: Sea-glass chip, Polished blank, Ground lens, Brass-ringed lens, Focus barrel, Signal
  reader.
- Crucible: Violet shard, Loop cell, Pulse coil, Resonator, Phase lantern, Orbit engine, Vault heart,
  Aurora beacon.
- **Already crowded:** "lens", "scope" and "lantern" (Kite, Kiln, Lens Bench, Crucible), and "winch",
  "jack" and "hoist" (Rover, Winch).

**Silhouettes.** A secondary part sits next to its primary on the board, so it must read apart at
40 px:
- **Rover** primaries are hand tools and machines in copper and steel. A Rover secondary should be a
  different shape family: fasteners and plates, for example, not another spanner.
- **Kite** primaries are paper, lenses and dials. A Kite secondary should not be round glass (Lens
  Bench) or a tube (scope).
- **A shared mark** (for example a small corner tag in the producer's colour, like the crates')
  would say which generator made it.

**Story.** Coast Camp's established story is listed in the 46q and 47b–47f docs. A secondary item
should not:
- name the letter's sender;
- link the beacon;
- foreshadow the Hidden Harbour (Chapter 3 is not started).

The Silent Observatory direction stands. No Record Press chapter is introduced.

**Technical.** Each new icon:
- is a 256 px WebP painted icon, in the same pipeline as `coast/icons/*`;
- is measured by `tools/measure-art-fit.py` (the art test fails otherwise);
- is drawn in all four tiers before it is shown;
- is entered in `chains.mjs` and the collection book (a book page per chain, or a section on its
  primary's page; to decide).

## 5. Balance proposal (steps 5 and 6) — needs approval, nothing applied

### 5.1 Output models compared

`node tests/v5-next-secondary-models.mjs 5,8 1,2,3 shop|noshop` (new). A share of the Rover's and
the Kite's taps makes a secondary **instead of** their own part, and the secondary is taken away at
once (the uncompensated case). The runs show what replacement alone costs in taps, energy and time.

Means of three seeds. Minutes are for the whole of Chapters 1–2; "drought" is the longest run of
Rover or Kite taps without a drop.

| Model (Rover and Kite) | 5 s, shop: total / waiting | 5 s, no shop: total / waiting | 8 s, shop: total / waiting | 8 s, no shop: total / waiting | Extra taps | Drops | Longest drought |
|---|---|---|---|---|---|---|---|
| Baseline | 184 / 3 | 259 / 72 | 314 / 1 | 352 / 45 | — | 0 | — |
| Replace 5 % (pity 30) | 286 / 88 | 338 / 146 | 383 / 55 | 454 / 135 | +50 to +107 | 40–49 | 30 |
| Replace 10 % (pity 20) | 356 / 156 | 423 / 228 | 361 / 46 | 429 / 117 | +40 to +136 | 76–88 | 20 |
| Replace 15 % (pity 14) | 525 / 307 | 613 / 393 | 453 / 126 | 524 / 202 | +95 to +278 | 126–144 | 14 |
| Every 10th tap | 330 / 126 | 454 / 248 | 378 / 50 | 461 / 133 | +95 to +153 | 67–74 | 10 |

- Active time hardly changes (+5 to +37 min).
- Almost all the cost is **waiting for energy**: +45 to +320 min for the whole run, in Chapter 1.
- Even the shop does not cover it, because its daily packs are limited (3 bought in every run).
- **Noise:** at 8 s, 10 % came out cheaper than 5 %. With three seeds the scripted run varies by
  tens of minutes, so read the rows as a size, not an exact ranking. The direction is the same in
  all 16 replacement rows: replacement adds 40–280 taps and 47–355 min.

**Reading.**
- **Replacement, uncompensated, is ruled out by the measurement.** It makes primary parts dearer by
  1 / (1 − p), and that cost lands where energy is already tightest: the Rover and Kite in
  Chapter 1. Even 5 % adds 70–100 min to Chapters 1–2.
- **Compensated replacement** gives secondary orders the coins and XP of the primary parts they
  displace. Their demand then absorbs the secondary supply, so it can be energy-neutral, but only if
  demand matches supply. That needs the demand rules below, and a measured run with real secondary
  orders before any rate is chosen.
- **Bonus drops** (the normal part *and*, sometimes, a secondary) cost no energy, but they cost board
  space. With p = 10 % on the Rover and the Kite, Chapter 1 would make about 44 extra tier-0
  secondaries over about 2 h (441 taps × 10 %). Chapter 1's median board is 11–12 of 36, and
  unclaimed bonus items cost space until orders take them. Two rules are needed:
  - a bonus drop is skipped on a full board (it is not owed, so nothing is lost);
  - bonus drops pause while two or more unused secondaries of that generator lie on the board.

### 5.2 Demand rules (proposed)

1. **When.** A secondary part may be asked by ordinary, two-part and larger everyday orders once its
   generator is on the board and the player has made at least one. It is never collection-only.
2. **How many.** At most one everyday order on the board asks for a secondary at a time, so the
   other two or three stay actionable with primary parts.
3. **Never in gold orders.** A secondary is never asked by a gold (restoration) order. A stage then
   never waits on a drop's luck, and no circular dependency exists (a stage needing a secondary
   whose generator needs that stage).
4. **Tiers.** It asks tier 1–2 of a secondary at first, and tier 3 only after the player has made a
   tier 2. This is the same as `reach` for primary chains.
5. **Pay.** A secondary order pays at least its primary-tier equivalent, plus a small rarity bonus.
   That bonus is the compensation in 5.1.

### 5.3 Bad-luck protection (proposed)

- **Pity limit.** A secondary at the latest after N taps of that generator without one: N = 20 for
  p = 10 %. Random drops alone would give a 12 % chance of 20 taps without one, and 1 % of 44.
- **Or cadence.** Every n-th tap, as the game already does for tier 1 (every fourth tap). It has no
  variance and needs no randomness, and it is the simplest to test and explain.
- **Demand guard.** An order asking a secondary is offered only when the player has one on the
  board or the pity limit guarantees one within the next N taps.

### 5.4 Recommended pilot (for approval)

1. Rover only, bonus model, cadence every 10th tap from Rover level 2, skipped on a full board, at
   most two unused on the board.
2. Demand rules 1–5.
3. Measure with the baseline script plus a new "secondary demand met" figure.
4. Then the Kite, and only then compare with compensated replacement at the measured demand.

No percentage here is approved; the pilot's numbers come from the measured run, not from this
document.

## 6. Energy (proposal, separate from secondary chains)

The baseline shows Chapter 1 energy-bound and Chapter 2 coin-bound. Options to measure before
choosing:
- **(a)** a slightly faster refill in Chapter 1 only;
- **(b)** one more energy reward in the worksite's stages;
- **(c)** making the Energy pack's coin price visible earlier.

Each is a balance change, for the director to choose; none is applied.

## 7. Presentation and feedback (visual, separate from balance)

These are pending, for after the art arrives:
- One shadow and scale pass for any new icon (measured, not by eye).
- A distinct look for each of: selected, valid merge target, producer, ice (two cracks), and
  secondary part (corner tag).
- Merge sound: a softer variant for secondary merges, so the common Rover merge does not repeat one
  timbre.
- Restrained animation: no new motion under reduced motion.
- Haptics stay optional and capability-dependent (already so).
- Restoration and chapter transitions: 47f's Vault opening and chapter end stand. Real before/after
  changes in the Observatory need the clean plate listed in the integration doc's missing art.
