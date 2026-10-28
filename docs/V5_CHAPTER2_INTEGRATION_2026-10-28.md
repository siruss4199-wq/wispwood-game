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

## Step 4 (Build 47d): the Tide Archive, a short bridge inside the Vault

**The director's frame:**
- The Tide Archive is a short narrative bridge, not a chapter.
- No new chain, no Record Press, no new XP gate.
- It reuses the underused late generators.
- No lighthouse history and no beacon-hum link.
- The wave seal ties the intro's letter to the archive without naming the sender.

**What is built:**
- **Where it sits.** The Vault (area 3, id `vault`, index unchanged) is now **The Silent
  Observatory**, Chapter 2. Its first place is the Tide Archive (`vault-archive`), three stages
  inside the open Vault.
- **Costs.** 100, 120 and 140 coins (360 in all), against about 156 a stage at the worksite and 280
  at the door. It is a short bridge, not a grind.
- **Gold orders** (authored), all for the late generators:
  1. two Storm lanterns (Lantern Kiln tier 2);
  2. a Pearl oyster and a Signal lamp (Shell Trap tier 3, Kiln tier 3);
  3. a Nautilus and a Storm lantern (Shell Trap tier 4, Kiln tier 2).
- **Rewards:** +8 energy, a Tide token, then a sea chest for the newest generator.
- **No new rule.** No level requirement, chain or currency. The engine pieces are step 2's
  authored gold.
- **Story:**
  - Intro: Tamsin "Records, floor to ceiling, every one sealed against the damp."; Bram "Lamps
    first. Then we find out what this place was for." (#80's line).
  - Stage lines (new):
    - Tamsin: shelves of records.
    - Neri: "The same wave seal as on your letter, pressed into every cover."
    - Bram: "Then the letter and this archive belong together. Who sealed them is another
      question."
    - Neri: the index points to "instruments, logbooks, an observatory".
    - Ivo: "Then that is where we go."
- **Reveals.**
  - After the Vault reveal, the archive's intro plays. Each reveal plays once, in order; one the
    camp has moved past is marked without playing.
  - "Chapter 1 complete" stays on the Vault reveal.
  - The end card at the end of this build's content reads "The archive is read".
- **Save.** A camp whose door is open (a Build 47b save at the Vault Entrance, all done) moves into
  the Vault as it loads, with the archive's gold order ready, and its old end mark cleared.
- **Picture.** The coast screen and the strip use PR #80's Observatory interior
  (`observatory-map.webp`, `observatory-vibrant.webp`, ported). The archive sits on its shelves.
  The journey row's Vault thumbnail is now the Observatory, not the Classic violet portal.

**Missing art:** the Tide Archive has no place art of its own. It is drawn with its map icon (a
Route fold) on the Observatory interior. A dedicated archive picture or shelf states would replace
that.

**Tests:**
- `tests/v5-next-chapter2.test.mjs`:
  - the door's inner ring now leads into the Vault (area 3, the archive's gold order, no stale
    door one);
  - new test: the archive's costs, authored gold and no level gate;
  - a Build 47b save at the open door moves into the Vault;
  - the three stages through real gold deliveries, then the end of the content.
- `tests/v5-next-chapter2-browser.cjs`: after the reveal, the archive intro (once), the Observatory
  interior on the coast screen, three stages delivered and built by hand with late-generator parts,
  the seal line, the end card, nothing again after reload.
- Updated:
  - `tests/v5-next.test.mjs` counts 16 places;
  - the playtest end card and the bright end strip now use the archive's last stage.
- **Bug found and fixed:** the end-card rewrite had dropped the Keep playing / Share feedback
  buttons from the Chapter 1 card; both cards have them.
- **Test robustness:** the Home test removed a request route while a request was held. Playwright
  then sometimes stalled an unrelated module request, so the page never started (2 in 25 runs in a
  standalone repro). The route now stays in place with its gate open: 0 in 25 and 3/3 full runs.
- `node --test tests/v5-*.test.mjs`: 306/306. All nine Coast Camp browser tests pass in Chromium
  (the two that also run WebKit stop at the missing local WebKit; CI runs it).

**Tried and reverted:** giving every loaded camp a missing gold order changed saves on a plain
round trip (5 save tests). Gold orders still come only when a camp moves on, or after a purchase.

## Step 5 (Build 47e): the Silent Observatory, with the Lens Bench and its optics

**What is in it.** PR #80's Observatory, as it was, after the Tide Archive, in the same area:

| Place | Stages (coins) | Rewards | Gold order |
|---|---|---|---|
| Entrance hall | 110, 130, 150 | energy 8, Tide token, crate (newest) | the newest generator's part |
| Survey desk | 130, 150, 170 | energy 8, Tide token, crate (newest) | the newest generator's part |
| Lens bench | 150, 170, 190 | **Lens Bench**, a second Lens Bench, a Lens Bench crate (size 2) | the newest generator's part |
| The array | 170, 200, 230 | energy 10, **Brass cog**, Lens Bench crate (size 3) | authored: optic 2 + 2 × lamp 2; optic 3 + chart 4; optic 4 + lamp 3 |
| Inner passage | 190, 220, 250 | energy 10, **Brass cog**, none | the last one authored: optic 4 + rope 4 |

- The area is 2,970 coins with the archive (21 places in all, 63 stages).
- **Unlock rules** (checked in tests and in the browser):
  - the hall opens only once the archive index is read (`requires`);
  - the other places follow one after another, as everywhere;
  - the sea gate's last stage waits for the array (`requires`).
  - A stage that waits says what for, on the coast card ("Opens once Wake the array is done.") and
    when it is refused (the rule message used to say "Upgrade the place before it first").
- **The Lens Bench** (optics, six tiers: Sea-glass chip → Polished blank → Ground lens →
  Brass-ringed lens → Focus barrel → Signal reader) is earned at the bench, introduced with its
  chain like a generator found in cargo. Half of the Observatory's everyday orders start with
  optics once it is out (`focus`). It is the newest generator from then on ("newest" crates follow
  it). Its book page appears once the camp is inside the Vault, so Chapter 1's book does not
  spoil it.
- **Reveals** (PR #80's D and E, as cards in the story dialog, each once):
  - the array wakes: Tamsin, "Three long, two short… I can tell where it comes from. Not who sends
    it, or how long it has been sending.";
  - the sea gate opens on a hidden harbour: Bram, "Who sent that signal, and what happened in that
    harbour?";
  - then the end card **"Chapter 2 complete · The sea gate is open"**, naming "Chapter 3, The Hidden
    Harbour, is in development". There is no button for it. The Hidden Harbour is listed as coming
    (no places, never entered).
- **Not ported:** generators parked in the shed (measured below: not needed), the journal and the
  stage bubble (deferred, see step 3).

**Saves.**
- A Build 47d camp that read the archive (its end card seen) goes on into the Observatory as it
  loads: its old end mark is cleared and the hall's gold order is made at once. This is a narrower
  rule than the one reverted in step 4. Only a camp whose content grew after its end gets a gold
  order on load, so plain round trips are unchanged (tested: loading twice changes nothing).
- An older save has no Lens Bench taps; they start at 0 instead of failing the check.
- An area with no places (the Hidden Harbour) is not a valid place for a save to stand, so a save
  claiming it starts a new camp, as an out-of-range area always has. No real save can stand there.
- The book's chains now include optics. Older saves' book lists stay valid.
- Rewards of the Observatory that do not fit wait (step 1): Lens Benches, crates, cogs and tokens.
- Save keys are unchanged.

**Pacing** (`node tests/v5-next-chapter2-metrics.mjs 5,8 1,2,3,4,5 [shop|noshop]`, new).
- The scripted player goes from a new camp to the sea gate, five seeds per speed.
- *Active* is time spent acting; *waiting* is time with nothing to do and no energy.
- "shop" buys the coin Energy pack when out of energy, as Build 41g's harness does; "noshop" never
  does and waits instead.

| 5 s/action | Chapter 1 (to the open Vault) | Tide Archive | Observatory | Total |
|---|---|---|---|---|
| shop: active / waiting (min) | 136 / 2 | 4.5 / 0 | 44 / 4 | 184 / 6 |
| noshop: active / waiting | 135 / 72 | 3.9 / 0 | 47 / 0 | 186 / 72 |

| 8 s/action | Chapter 1 | Tide Archive | Observatory | Total |
|---|---|---|---|---|
| shop: active / waiting | 223 / 0 | 7.6 / 0 | 79 / 0.4 | 309 / 0.4 |
| noshop: active / waiting | 220 / 42 | 8.5 / 0 | 80 / 0 | 308 / 42 |

- **Chapter 2** (archive and Observatory) is about 50 min of play at 5 s an action and 87 min at
  8 s, with no waiting. Energy is no longer the limit there; coins are. All of Chapter 1's waiting
  happens before the Vault, as measured before.
- **The Lens Bench** arrives 25–30 min before the end at 5 s (152–161 min with the shop, 224–227
  without), and 50–55 min before it at 8 s.
- **Discovery spacing** (a new generator kind, a part first found, or a stage bought):
  - Chapter 1: median 1.6–3 min, longest 9–22 min;
  - archive: median 0.7–3.4 min, longest under 5 min;
  - Observatory: median 1.8–4 min, longest 4–12 min.
  - **One outlier:** at 5 s with the shop, one seed took 27 min for the sea gate's last stage. It
    had spent its coins on energy packs and then had to earn the 250 coins. That is the chapter's
    longest stretch with nothing new; without the shop, the longest is 7 min. Not changed here (it
    would be an economy change); the director may want the last stage cheaper.
- **Repetition:**
  - Parts made most often by merging:
    - Chapter 1: Rover parts (tier 2 ×87–105, tier 1 ×77–90, tier 3 ×70–91);
    - Observatory: Ground lens / Polished blank ×15–35 and Tin/Storm lanterns ×14–24.
    - The Lantern Kiln, which Chapter 1 used only 3–14 times, now carries the archive and half
      of the array.
  - Everyday orders asking the same parts as one of the last four: 0–4 % (Chapter 1 and the
    Observatory), up to 25 % in the archive's 4–6 orders (one repeat).
- **Board occupancy** (used cells of 36, not cargo):
  - Chapter 1: median 11–12, 90th percentile 14–16;
  - Observatory, with 7–8 generators out: median 16–20, 90th percentile ≤ 22.
  - The board was never full, and no reward had to wait in any run. **Generator parking (PR #80) is
    not needed** and was not ported.

**Missing art (added to the list above; nothing unrelated substituted):**
- The Observatory's place art and the optics icons are PR #80's review art, cut from concept
  sheets.
- `harbour-view.webp` (the harbour card and the Hidden Harbour's thumbnail) is #80's small upscaled
  placeholder.
- The array's signal is drawn as a CSS beam over its stage-3 picture; there is no painted signal
  frame.

**Story check:**
- PR #80's lines are kept as written. The conflict noted in step 3 stays open for the director:
  the hall's line "A compass and a crescent on every banner. That mark was on the door too." against
  46q's wave seal on the Vault.
- Nothing in the Observatory names the letter's sender or links the beacon.
- Small wording fixed in the area-complete line:
  - "the The Silent Observatory" is now said once;
  - the Vault Entrance no longer says "Up the cliff";
  - an area still to come reads "is still to come", and the coast screen labels it "In
    development", not "Next update".

**Tests:**
- `tests/v5-next-chapter2.test.mjs`, new tests:
  - a 47d camp goes on into the Observatory with the hall's gold order, idempotent on reload;
  - the hall waits for the index, says why, and refuses with that reason;
  - a full playthrough of the 15 Observatory stages through real gold deliveries: two Lens Benches,
    two cogs, optics in the array and sea-gate gold, the sea gate never offered before the array,
    then the chapter's end in area 3;
  - with every generator out, 35–70 % of everyday orders start with optics;
  - an older save without Lens Bench taps loads; the optics book page has six parts; a bench taps
    out a Sea-glass chip.
- `tests/v5-next-chapter2-browser.cjs` goes on past the archive, at 360, 390, 430 and 907:
  - no end card after the archive;
  - the hall's gold order;
  - the first Lens Bench's chain moment and its book page;
  - the sea gate's "Opens once Wake the array is done";
  - the signal card;
  - the harbour card;
  - the Chapter 2 end card (only Keep playing and Share feedback);
  - nothing again after reload.
- Updated to the new end of content:
  - the playtest end card (now 63 stages, "Chapter 3, The Hidden Harbour, is in development", after
    the harbour card);
  - the bright end strip ("Coins carry over to The Hidden Harbour");
  - the place count (21);
  - the coming areas folded on the beach (4);
  - the book's chains;
  - an area with no places starting a new camp.
- `tests/v5-next-economy-sim.mjs` takes a `finish` option (default unchanged) and reports `active`.
- **Local results:**
  - `node --test tests/v5-*.test.mjs`: 311/311.
  - All nine Coast Camp browser tests pass in Chromium. WebKit is not installed here; CI runs it.

## Build 47f: Chapter 1–2 integration and visual QA (2026-10-28)

**Branch.** `claude/v5-ch12-visual-qa`, from `claude/v5-observatory-integration` at `7a769a2` (Build
47e). The same line, oldest first:
- `claude/v5-audit-fixes` (#83) and `claude/v5-board-crate` (46n/46o);
- `claude/v5-home-loading` (46p);
- `claude/v5-story-intro` (46q);
- `claude/v5-observatory-integration` (47a–47e).

PR #80 is not merged; its Chapter 2 parts were ported selectively (step 3).

The six screenshots named in the brief were not available in this session. Each reported issue was
checked against the HEAD above instead.

### What the numbers mean

- **"18 stages" on the Observatory screen.** The area named The Silent Observatory holds the Tide
  Archive bridge (one place, 3 stages, Build 47d) and PR #80's five Observatory places (15 stages):
  3 + 15 = 18. The audited 15 counted only PR #80's places. Progression is unchanged. The bar now
  says "16 / 18 stages" (it said "16 / 18").
- **"63 stages" on the end card.** Every stage bought across Chapters 1 and 2: Landing Beach 21,
  Survey Worksite 21, the Vault door 3, then the archive and the Observatory 18. The card now reads
  "Restoration stages 63 / 63" under "Your camp so far".
- **"7 generators" on the end card.** It counted the *kinds* standing on the board, not how many
  generators the player owns. The kinds a player can have are Rover, Kite, Winch, Shell Trap, Lantern
  Kiln, Crucible and Lens Bench. It is now "Generator types found": the kinds whose parts were found
  or that are owned (on the board, in the shed or waiting), so a kind kept in the shed still counts.

### Issues checked against HEAD, and what changed

| Reported | At `7a769a2` | Now |
|---|---|---|
| "Next: The Vault. It comes in a later update." | **Already gone from play.** That card is Build 46's. At 47e Chapter 1 leads into the Vault, and old-ending saves continue (step 2). The text still sat in an unreachable branch. | The branch is removed. The camp's only end card is Chapter 2's. |
| Glow over a closed door | **Still there.** The 47b reveal was light over the closed door. | The door visibly opens. The three rings glow, the inner one last, and light runs down the seam. The two halves, cut from the same Home picture along its painted seam and laid exactly over it, swing inward on the hinges painted at its sides. The Observatory interior shows behind them. Then a scene inside, ending on "Enter the Vault". Reduced motion shows each state at once: rings lit, doors open. Skip reaches the same state, since the reveal gives nothing. |
| First Chapter 2 objective | The archive intro ended on "Continue". The board hint could name another order. | The intro ends on **"Make the gold order"**. It marks the archive's gold order on the board, and the message line says "Light the archive: make 2 × Storm lantern for its gold order." The board hint then follows that order. |
| New area shown before the door opens | **Found here.** Building the inner ring redrew the coast screen as the Observatory, and Bram said it "is open", before the reveal. | The Vault Entrance stays on screen until the reveal; Bram's line is left to the reveal. |
| Oversized cut-outs over the Observatory room | **Still there.** PR #80's place cut-outs stood on a picture that already paints the shelves, both desks, the orb array and the passage. | No cut-outs on that picture. Each place's spot is moved onto its painted furnishing, and its restoration shows as the room's colour coming back around it (the beach's own effect). The cut-outs stay in the card and the place row, where they stand alone. Marker hit targets are unchanged (44 px). |
| "Telescope" for the Vault rings | **Still there.** The door used the Signal lamp part icon. | The door is drawn as itself, a crop of the Home picture's door (`coast/vault-door-thumb.webp`, new), with its rings lit for the stage. The coast screen's rings now sit on the door's painted rim, compass ring and orb ring. |
| Locked sea gate | 47e said "Opens once Wake the array is done." | "Finish the array first. It needs Wake the array (stage 3 of 3)." The **View array** button selects the array and shows its objective. Both come from the stage's own requirement, the first unmet one. |
| Card actions | Reveal cards all said "Continue". | The Vault reveal ends on **Enter the Vault** (it enters). The archive intro ends on **Make the gold order** (it marks it). The signal card says **View sea gate** (it opens the coast screen on the sea gate). The harbour card keeps Continue (the end card follows). |
| Completion card | Teal header with the title spilling under it at 360 px; stats inline; "Chapter 3 … is in development". | The harbour picture comes first, then "Chapter 2 complete", the title and two short lines. The totals sit in a secondary "Your camp so far" box. It says "This is the end of the story so far. The Hidden Harbour is not available yet." There is no Chapter 3 button and no "in development" claim. In landscape the picture stands beside the text. Wherever an unavailable area was promised, the wording now says it is not available (the strip says "N saved"; the coast list says "Not available yet"). |
| "the The Silent Observatory's next stage" | **Found here,** in the gold order's note. | "The gold order is for Light the archive: it stays." |

**Saves and rewards.**
- No rule changed in this build. `v5/next/game.mjs` is untouched, and save keys and backup keys are
  unchanged.
- The `at` positions and the `LABELS` of the Vault's places are presentation data in `areas.mjs`.
- New node test (`tests/v5-next-rewards.test.mjs`): on a full board, the Observatory's rewards wait
  in the order earned, survive a reload, land once each as spaces free, and nothing lands twice. The
  rewards are a Tide token, a crate, the Lens Bench copy and a Brass cog.
- Already covered:
  - Chapter 1 saves that saw the old ending (`v5-next-chapter2.test.mjs`, and its browser test);
  - story skip and reload, and Home Continue (`v5-next-story-browser.cjs`,
    `v5-next-home-browser.cjs`);
  - board interactions after overlays close.

**CI.** Build 47e's run was cancelled at the job's 20-minute limit while the Chapter 2 browser test
was running. Every other Coast Camp test had passed in Chromium and WebKit. The cause was in the
test: an optional hint click waited Playwright's full 30 s when the hint was absent. With a 1.5 s
limit the test takes 94 s in Chromium locally, down from 437 s. The job limit is raised to 30
minutes for the larger Chapter 1–2 suite.

### Missing art (exact use; nothing unrelated was substituted)

1. **Open Vault door, this Vault.** The same camera and door as `coast/home/home-bg.webp` (941×1672)
   and its crop `vault-door-vibrant.webp` (941×706). The round door's two halves stand swung inward
   on their side hinges, with the passage into the Observatory lit behind them.
   - Uses: the reveal's second and third scenes; the Vault Entrance on the coast screen once
     complete.
   - Stand-in: the closed door cut along its seam and turned in CSS.
   - Not usable: Classic V5's `vault-open-vibrant.webp` is a different, violet portal doorway.
2. **Ring states.** Three lit-ring overlays (outer rim, compass ring, orb ring), transparent and
   aligned to `vault-door-vibrant.webp`, or three door crops.
   - Uses: the Vault Entrance card, its place tile and the coast scene, for each stage.
   - Stand-in: CSS rings.
3. **Observatory clean plate.** `observatory-map.webp` (640×640) with the restorable furnishings
   removed or in ruin, plus three stage overlays per place aligned to it. The furnishings, by spot:
   - the archive shelves left of the passage (23 %, 36 %);
   - the passage gate (48 %, 30 %);
   - the orb array (55 %, 47 %);
   - the left survey desk (16 %, 68 %);
   - the right lens bench with its telescope (86 %, 46 %);
   - the hall's lamps and banners (around 58 %, 82 %, and the two banners at the top).
   - Use: the coast screen's Observatory scene.
   - Stand-in: colour returning around restored spots.
4. **Tide Archive place art** (3 stages). Its card and tile use the Route fold map icon.
5. **Hidden harbour view.** `coast/harbour-view.webp` is PR #80's small upscaled placeholder.
   - Uses: the harbour reveal card and the Chapter 2 end card. A sharp painted view is needed,
     about 941 px wide, portrait or 4:3.
6. **The array's signal.** A painted frame of the woken array sending its signal. It is now a CSS
   beam over `place-obs-array-3.webp`.
7. **Observatory place cut-outs.** PR #80's review cut-outs from concept sheets. Now used only in
   the card and the place row.
