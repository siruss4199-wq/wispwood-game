# Vaultwake V5 Coast Camp — secondary chains, first playable pilot (2026-10-29)

**Branch.** `claude/v5-secondary-pilot`, from `claude/v5-rover-secondary-art` at `cc63b84`, which
holds the five art passes (`docs/V5_*_SECONDARY_ART_2026-10-29.md`) and the measurement plan
(`docs/V5_SECONDARY_CHAINS_PLAN_2026-10-28.md`). Not merged anywhere.

**Preview.** https://claude.ai/artifact/LDdJLFatkwsyykjnJ3Q9sr (private until shared; build 47s).
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

1. **A secondary order never asks a drop the player does not hold.** At first the rule allowed one
   drop more than was held, since the bad-luck limit guarantees one within 14 taps. Measured, at 5 %
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
| Bad-luck limit | a drop at the latest on the 14th tap without one; the first one by the 3rd tap after opening | same |
| Drop | tier 1 (Bolt / Note fragment), beside the generator | same |
| Pause | while 3+ of its secondary parts below the top lie on the board and no order wants one | same |
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
- **Tier ramp.** Tier 1 first; tier 2 from the first stage built; tier 3 from the third. Always only
  what the secondary parts held (board and shed) make by merging. The chain's top part is never asked:
  it is the book's keepsake.
- **Price.** A secondary part pays as a part 2 tiers higher: Bolt 10, Gear 25, Gear assembly 45
  coins, against 5, 5 and 10 for the same tiers of a primary chain.
  - The rarity is 2 because tiers 0 and 1 both pay 5 coins: at 1, a Bolt would pay exactly what a
    Copper offcut pays.
  - The generator-level lift does not apply to secondary parts.

**Full board and duplicates:**
- A tap on a full board is refused before anything is spent, rolled or counted.
- A tap that fills the last space makes its own part there, and its secondary waits in `s.pending`
  (saved). It lands once, after the next action that frees a space.
- Past 4 waiting secondaries, a drop counts as a miss instead, so the list never grows.
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
- **Rollback caveat (not a regression, but a limit).**
  - A save that holds a secondary part is not readable by a build before this pilot: it rejects the
    unknown family.
  - That build's app (47c on) keeps the unreadable save under `vaultwake-v5-coast-damaged` and starts
    a new camp.
  - The preview below runs on its own origin, so it cannot touch saves of other builds.

## 5. Presentation

- **On the board.**
  - Secondary parts use the painted icons with their measured fit, like every part. No badge, tag or
    new panel was added.
  - A drop lands beside the generator with the board's arrival pop, a small burst and the "rare"
    sound. The message line says "Copper offcut · and a Bolt".
- **First find of each chain.** One short moment: "New: Bolt — A rare Rivet Rover extra. A tap
  sometimes adds one, at no extra energy (one at least every 14 taps). Crew orders ask for them · merge
  two for a Gear."
- **Selecting a secondary part.** It says where it comes from first, because the panel shows two lines
  until tapped: "★ Bram needs this. A rare Rivet Rover extra. A tap sometimes adds one… Merge with a
  twin → Gear assembly." Its "Clear" button is always there and gives no energy.
- **Tapping an order that asks one.** It names the part and its source: "Gear: merged from Bolts, a
  rare Rivet Rover extra…". The order's route reads "A rare extra from Rivet Rover taps (one at the
  latest every 14), then merge up…".
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

## 7. Remaining issues (for the director)

1. **Pacing for quick players.** B shortens Chapters 1–2 by a quarter to a third at 4 s per action.
   If that is too generous, the levers are `rarity` (2 → a price between tiers) or `every` (3 → 4).
   Both stay within the targets; neither is applied without a decision.
2. **Names and silhouettes** from the art passes are unchanged:
   - Gear and Brass cog look alike;
   - the Gear assembly and the Hand-crank read alike;
   - the Logbook's emblem is the story's seal;
   - the Kite's ivory papers at tiers 1–2 have low contrast against the cells.
3. **Rollback** of a save holding secondary parts to an older build (section 4).
4. **The scripted player is still a proxy.** Real players may hold more extras on the board than it
   does. The pause rule bounds the cost (3 per chain).
5. **Prepared, inactive.** Rope Winch Sailmaking, Shell Trap Pearlcraft and Lantern Kiln Stained Glass
   sit in `proposed/` with their open art notes. Activating one means:
   - adding a `CHAINS` entry and a `SECONDARY_OF` / `SECONDARY_RULES` pair;
   - moving its icons into `icons/` and re-running `measure-art-fit`, applying the proposed
     `TARGET_OF` for the Finished Sail and the Glass Mosaic;
   - re-running the metrics script.
