# Vaultwake V5 Coast Camp — Chapter 2 integration (2026-10-28)

**Branch:** `claude/v5-observatory-integration`, from `claude/v5-story-intro` (`6864900`, Build 46q).
It also contains Home/Loading (46p) and everything in #83 (46o).

**Director's decision (2026-10-28):**
- Keep **The Silent Observatory** (PR #80) as Chapter 2.
- The Tide Archive is only a short bridge inside the opened Vault, leading into the Observatory.
- No Record Press and no new chain for the Archive.
- No lighthouse history and no beacon-hum link.
- The wave seal may connect the intro letter to the archive without revealing its sender.

**How it is built:** in separate commits. PR #80 is ported selectively, never merged. PR #75, PR #77,
`main`, V4 and `v5/lab/` are not touched.

## Step 1 (Build 47a): rewards on a full board wait instead of being lost

**The defect, before this step.** A stage bought on a full board lost its board reward: a generator
copy, a crate or a Tide token.
- Repro: fill every free space, then buy "Lay a boardwalk" (`beach-path` stage 2).
- The 70 coins are paid and the stage counts, but the Rover copy is gone (`effects.copy:-1`).
- `restore` placed rewards with `put()`, which gives up when the board has no free space
  (`v5/next/game.mjs`).
- No other reward path loses anything:
  - delivery tools fall back to the shed;
  - the daily gift, the shop and book cogs refuse with "make space";
  - new generators wait in `release()`.

**The fix**, ported from PR #80's plan D6 (`give`, `placePending`, `s.pending`) and adapted:
- **Where rewards go.** A reward with no space goes into `s.pending` in the save. A reward with room
  still lands where it did before (the first free space from the top left). #80 moved rewards next
  to the Rover; that changed the scripted player's whole run, so the old placement is kept.
- **Order and count.** Waiting rewards land **first earned, first placed** after the next
  successful action that leaves a space. #80 placed generators first; the brief asks for the order
  to be kept. Each reward leaves the list as it lands, so none can land twice. The number and order
  survive save and reload.
- **Older saves** load with `pending: []`.
- **Damaged waiting lists.** A waiting list holding something that can never be a reward (cargo,
  tideglass, unknown things), or more than 100 entries, is not trusted. Such a save is unreadable,
  so the Build 46p Home keeps it untouched and offers Retry.
- **On screen:**
  - the stage's reward note says "(waits for a free space)";
  - the board's space tab says "N rewards waiting · make a space";
  - the landing is announced in the message line.

**Evidence:**
- `tests/v5-next-rewards.test.mjs` (new, 5 tests): the boardwalk repro waits and then lands once;
  four rewards keep their number and order through two reloads and partial landings; a bought stage
  cannot be claimed twice; older saves load with nothing waiting; bad waiting lists are refused; a
  reward with room is unchanged.
  - Against the old engine the file fails (no waiting rewards). Against the fix: 5/5.
- `tests/v5-next-rewards-browser.cjs` (new, in CI, 390×844 and 907×510): bought on the coast
  screen, said on the reward note and the space tab, kept across reload, lands once after a merge,
  no console errors.
- `node --test tests/v5-*.test.mjs`: 300/300.
- **The economy is unchanged.** The scripted player's run is identical action by action to Build
  46q (10 s/action, seed 4, first 15 minutes). In all 40 economy runs (8 speeds × 5 seeds) the
  scripted player never bought a stage on a full board, on either engine. So the defect hits real
  players, not the bot, and the pacing numbers stay as they were.
- **Test fix.** `tests/v5-next-home-browser.cjs`'s reduced-motion check could release a held logo
  request before it had arrived, leaving it held for good. It now waits for the request.

## Step 2 (Build 47b): the Vault Entrance finale and the opening reveal

**Rules and data,** ported from PR #80 and adapted:

**The Vault door.**
- The Vault Entrance (area 2, index unchanged) has one place, the Vault door, in three stages:
  turn the outer ring (240), the middle ring (280) and the inner ring (320), 840 coins in all.
- The inner ring names its own materials (stage field `gold`): a Signal lamp (Lantern Kiln tier 3)
  and a Bearing dial (Survey Kite tier 4).
- Turning the inner ring completes Chapter 1. The Vault itself (area 3) is still listed as coming
  until steps 4–5.

**Engine pieces taken from #80:**
- stage `gold` (authored gold orders);
- `requires` / `stageReady` / `blockedStage`, a stage that waits for another (unused until the
  Observatory);
- `ensureGold`, a gold order after a purchase and when a save moves on as it loads;
- stale gold orders are replaced after a purchase;
- `s.seen` with a `seen` action: story cards play once.

**Old saves:**
- A finished Chapter 1 save (Build 46: the worksite done, area 1) moves on to the Vault door as it
  loads, with its gold order ready. Its board, coins and moves are unchanged.
- The old end mark (`seenEnd`) is cleared when there are new places, so a save that already saw
  the old ending sees the new end card at the new end.
- `seen` is optional with a default. A damaged `seen` list is not trusted (unreadable save → Home
  keeps it and offers Retry).
- A camp partway through Chapter 1 is untouched.

**Presentation:**
- **Door intro.** On reaching the Vault Entrance, #80's door intro plays once (Neri, Ivo). A camp
  that loads past it has it marked without playing.
- **Coast screen.** It shows the coast's own Vault: `vault-door-vibrant.webp`, cropped 941×706 from
  the Home art. Each turned ring lights one turquoise ring over the dial (CSS).
- **The reveal.** The inner ring plays the Vault reveal once, in the story player (Skip throughout,
  Escape, reduced motion), labelled "Chapter 1 complete":
  - the light runs down the door's seam;
  - the door floods with light;
  - Neri: "It opens. After all this time, the Vault is open."
- **End card.** Then: "Chapter 1 complete · The Vault is open". Whatever comes next is named,
  never offered as a button.

**Not taken from #80 (art):**
- PR #80's door art (`vault-gate`, `vault-door-*`, `vault-reveal-*`) shows a different vault: a
  brass compass dial. The Classic `entrance-vibrant` / `vault-open-vibrant` pictures show a third
  one.
- The game's own Vault (Home, story intro) has the turquoise wave orb and a lit seam. Those images
  are not used here.

**Missing art** (nothing unrelated was substituted):
1. The open Vault door for this Vault design. The reveal's light is CSS over the closed door.
2. Ring-turning states for this door. The rings are CSS.
3. A Vault Entrance coast-screen picture. A crop of the Home art is used.
4. "The Vault" thumbnail in the coast screen's journey row is still the Classic violet-portal
   picture (pre-existing). It is replaced in step 5.

**Story wording changed from #80:**
- The middle ring's line said "The tideglass hums like the beacon crown". The beacon-hum link is
  held back, so it now reads "The tideglass in the dial glows brighter."
- Neri's reveal line in #80 ("…an observatory, gone quiet") is replaced by "It opens. After all
  this time, the Vault is open.", because the Archive comes first (step 4).

**Tests:**
- `tests/v5-next-chapter2.test.mjs` (new, 5 tests): finished saves with `seenEnd` true, false or
  absent go to the door with its gold order; a mid-Chapter 1 save is untouched; the three rings
  through real gold deliveries, the inner ring's exact materials, no stale gold order; seen flags;
  the door's crate on a full board waits.
- `tests/v5-next-chapter2-browser.cjs` (new, in CI, 360/390/430/907×510): a finished save that saw
  the old ending continues to the door intro once; the coast's Vault with lit rings; three rings
  delivered and built by hand; the reveal once with Skip; the end card; reload shows neither again.
- **Deliberately updated:**
  - the economy sims and tests now stop at the finished worksite (it is no longer the camp's last
    area);
  - `tests/v5-next.test.mjs` counts 15 places;
  - the playtest end-card test and the bright test's end strip now use the door.
- **Regression found and fixed:** the story player gave the board back as inert after the
  first-play story. Home now owns its own inertness.
- `node --test tests/v5-*.test.mjs`: 305/305. All eight Coast Camp browser tests pass in Chromium
  (WebKit runs in CI).

## Step 3 (Build 47c): PR #80 against the current line, and what is taken

**Background.** PR #80 (Build 43, `claude/v5-chapter2`, `e3bc1f4`) was built on `e020a5f` (Build
41l). The current line has since gained:
- Builds 44–46: the bright board, the audit fixes, the level path, the harder start, and the tool,
  crate and barrel art;
- Home and Loading (46p) and the story intro (46q).

PR #80 is therefore not merged; each part is decided below.

| PR #80 part | Decision | Why |
|---|---|---|
| Rewards wait on a full board (`give`, `placePending`, `s.pending`) | **Ported, step 1** | Placement kept at the old spot and order kept first-in-first-out, so Chapter 1's economy is unchanged and the brief's order rule holds. |
| Authored gold stages, `requires`, `ensureGold`, stale gold orders, `s.seen` | **Ported, step 2** | Needed by the door and the Observatory. |
| Vault door data (3 rings, 840 coins, inner-ring materials) | **Ported, step 2** | One line changed (no beacon-hum link). |
| Vault door / gate / reveal art | **Not used** | It shows a different vault than the game's own (Home, story intro); see the missing-art list. |
| Unreadable save → `vaultwake-v5-coast-backup`, then a new camp | **Replaced by Build 46p's safer handling, reconciled here** | 46p leaves the unreadable save in place and copies it aside only when the player chooses a new camp. #80 copied it to one fixed key and started a new camp at once, so a second bad save would overwrite the first copy. See "Backups" below. |
| The Observatory area: 5 places × 3 stages, Lens Bench copies, optics gold, `requires` on the sea gate | **To port, step 5** | After the Archive bridge; costs re-measured on today's economy (Build 46k's harder start and the level path changed it). |
| Optics chain (6 tiers), Lens Bench generator, `NEWEST_ORDER`, book page | **To port, step 5** | New art exists in #80 (optic-0…5, gen-optic) and matches the painted icons. |
| Everyday-order focus on optics in the Observatory | **To port, step 5** | The current line already has `focus` (the worksite's Rope Winch). |
| Signal and harbour reveals, Chapter 2 end card, "Hidden Harbour" listed as coming | **To port, step 5** | Shown in the story player like the Vault reveal. `harbour-view.webp` is a small upscaled crop (#80 said so); it is flagged, not replaced. |
| Generators parked in the shed | **Measure first, step 5** | Added only if board occupancy in the Observatory needs it. |
| Journal, replaying finished areas, non-blocking stage bubble | **Deferred** | Not needed for a complete chapter. The current stage cards stay as they are. |
| Build 42 visual direction (`vd.css`, beach place art changes, `landing-map`) | **Not taken** | Superseded by the current board and coast art (Builds 44–46). |
| `D5` copy-to-cog | **Not taken** | #80 had already dropped it (it broke the Chapter 1 guard). |

**Story facts in PR #80** (kept as written unless noted):
- **The fleet** that "no shipping register remembers".
- **The signal** "three long, two short" on a bearing: where from, not who sends it.
- **The hidden harbour** as the next objective.
- **Conflict to decide (not changed):** #80's Observatory hall says "A compass and a crescent on
  every banner. That mark was on the door too." The approved intro (46q) says the wave seal is on
  the Vault. The current Vault art shows a wave orb inside a compass star, so both marks can be on
  the door. Please confirm or reword.
- **Changed:** the beacon-hum line (step 2) and Neri's reveal line (step 2: the Archive comes
  before the Observatory).

**Backups (reconciled here).**
- A recovery copy is never overwritten. The unreadable save goes to the first free key of
  `vaultwake-v5-coast-damaged`, `-damaged-2` … `-damaged-9`, then one named by the time.
- Nothing is written if an identical copy is already kept, under these keys or #80's
  `vaultwake-v5-coast-backup`.
- If the copy cannot be written (storage full), the new camp is refused and the save stays.
- The existing keys `vaultwake-v5-coast`, `-damaged` and `-backup` are never renamed, cleared or
  overwritten.
- Tested in `tests/v5-next-home-browser.cjs` 3b: an older `-damaged` copy and a #80 `-backup` copy
  stay; the new copy lands in `-damaged-2`.

**Test robustness.** `tests/v5-next-home-browser.cjs` held picture requests by hand. A picture can be
asked for twice (its `<img>` and the loader), so one could stay held for good: about 1 run in 3
timed out. A gate now holds the requests and lets every one through once it opens. 4/4 runs pass.
