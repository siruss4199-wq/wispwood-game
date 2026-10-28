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
