# Vaultwake V5 Coast Camp — Chapter 2, The Silent Observatory (Build 43)

Branch `claude/v5-chapter2`, built on `claude/v5-visual-direction` (Build 42, PR #79), which builds on
`claude/v5-beach-place-art` (PR #78) and `claude/v5-autonomous-rebuild` (e020a5f). Review branch:
not for `main` or the gameplay branch. The plan this implements was approved by the user on
2026-10-24 ("Ehel"); its owner decisions D1–D13 were taken as recommended, except where measured
otherwise (below).

## What a player gets

1. **Chapter 1 ends at the Vault door** (area 2, *Vault Entrance*, one place in three stages: turn
   the outer, middle and inner ring; 840 coins). The inner ring names its own materials (a Signal
   lamp and a Bearing dial). Turning it opens the door.
2. **Reveal A** (once, skippable with Continue or Esc, still under reduced motion): *Chapter 1
   complete*, the sealed door crossfading to the open one, Neri's line, and the next objective with
   its gold order already on the board. The Observatory intro follows. Board, generators, coins,
   energy, shed and every restoration are untouched.
3. **Chapter 2, The Silent Observatory** (area 3, five places × three stages, 2,610 coins): the
   Entrance Hall, the Survey Desk (the fleet's mark; the last logbook), the Lens Bench (the **Lens
   Bench** generator and its optics chain), the Tideglass Array (materials that mix optics with Kiln
   and Kite parts), the Inner Passage (its last stage waits for the array to wake).
4. **Reveal D, the signal** (array awake): a bearing and the fleet's call sign; Tamsin says she
   cannot tell who sends it or how old it is. **Reveal E, the hidden harbour** (sea gate open), then
   the end card: *Chapter 2 complete … Chapter 3, The Hidden Harbour, is in development*. No button
   points at Chapter 3; orders, the book, the shop and gifts carry on.

## The systems behind it (extending the existing engine)

| Change | Where | Note |
|---|---|---|
| Areas `entrance` and `vault` get places; `harbour` is listed, never playable | `v5/next/areas.mjs` | Append-only: saves keep `s.area`. `CHAPTERS` groups areas; `chapterAvailable` is "has places". |
| Stage fields `gold` (authored materials) and `requires` (wait for another place) | `areas.mjs`, `game.mjs` `makeOrder`, `upgrades`, `blockedStage` | Default gold orders are unchanged. |
| Optics chain and the Lens Bench, earned from a place (`copy:'optic'`), not from the level-3 chain | `chains.mjs`, `game.mjs` `NEWEST_ORDER`, `BOOK_CHAINS` | Named apart from the Kite's and the Kiln's lenses. The Kiln's level 3 releases nothing. |
| Rewards that find no space wait (`s.pending`) and land after the next action that leaves a space, generators first | `game.mjs` `give`, `placePending` | Before Chapter 2 a stage reward on a full board was lost (repro in the plan). |
| Generators can be parked in the shed (`SHED_TYPES` + `source`), keeping their level; the last one stays | `game.mjs` `store`, `hasGenerator`, `release` | A parked generator brings no new orders; an existing order shows "parked in the shed" with Bring it out. |
| A stale gold order (its place needs no more materials) is replaced after a purchase | `game.mjs` `restore` | Keeps the next objective's gold order on the board. |
| Story cards seen once (`s.seen`, action `seen`) | `game.mjs`, `app.mjs` `REVEALS`, `nextReveal` | Marked when dismissed. Stale reveals (a camp loading far past them) are marked without playing. |
| An unreadable save is kept under `vaultwake-v5-coast-backup` and the player is told | `game.mjs` `loadChecked`, `app.mjs` | The save key `vaultwake-v5-coast` is unchanged. |
| Stage lines as a non-blocking bubble; modal cards only before a reveal; a journal with replays; finished areas viewable again | `app.mjs` `bubble`, `journal`, `viewing` | Nothing new is stored for the journal. |
| End card names the chapter, never "prototype/game complete"; old `seenEnd` cleared when new places exist | `app.mjs` `showEnd`, `game.mjs` `load` | |

## Measured, and what changed because of it

- **D5 dropped.** Turning a generator copy above level 1 into a Brass cog moved the Shell Trap from
  152 to 35 minutes and the Lantern Kiln from 321 to 58 minutes in the existing economy guard
  (`tests/v5-next.test.mjs`, "the economy is tight"). Copies stay copies; a copy that cannot merge
  yet can be parked in the shed instead.
- **Chapter 2 costs lowered** from the plan's provisional 3,610 to 2,610 coins. With 3,610 the
  scripted player needed 334 min of real time for Chapter 2 at 5 s/action (80 min of play, the rest
  waiting for energy). With 2,610: 149 min real / 52 min play at 5 s, 95 / 79 at 8 s, i.e. 3.5 and
  5.3 min of play a stage, matching Chapter 1's guard (0.7 min per s/action). The door: 18–30 min.
- Board occupancy in Chapter 2: median 36–37 of 49 cells, 90th percentile 38–39 (scripted player).
- The Lens Bench came out 33–40 min into the chapter.

Commands: `node --test tests/v5-next-chapter2.test.mjs` (rules, saves, and the scripted player
through the door and the Observatory at 5 and 8 s/action, three seeds each).

## Saves

Key `vaultwake-v5-coast`, `VERSION=4`, unchanged. New optional fields with defaults filled in by
`load()`: `pending: []`, `seen: {}`, `taps.optic: 0`. A camp that finished the worksite under Build
41/42 moves on to the Vault door on load, hears its intro once, and its board, coins and restorations
are unchanged (unit and browser tests load such a save). A camp partway through Chapter 1 is
untouched. Reloading during a reveal shows it once more; after it is dismissed it never returns.

## Art (cut from the user's three concept sheets; see `v5/assets/premium/coast/README.md`)

Optics icons and the Lens Bench; the five places before/after (stage 1 = before, 2–3 = after; stage 3
adds the CSS glow); the door in three stages (rings lit, then open) and its Vault layer; the reveal
crossfade; the Vault Entrance and Observatory pictures; the harbour view.

**Still missing / placeholder:** painted crew portraits; a production Observatory map with places
drawn for it (the concept interior is used, dimmed, with the cut-out places on top); intermediate
place stages (stage 2 and 3 share the restored art); a larger harbour view (the current one is
upscaled from a small crop); a Signal reader that does not read as a telescope; Survey Worksite
places are still the Build 39 renders.

## Tests

- `tests/v5-next-chapter2.test.mjs` (new, node): data, optics, the door, the Observatory, the Lens
  Bench waiting on a full board, parking, story cards, old saves, the scripted player's pacing.
- `tests/v5-next-chapter2-browser.cjs` (new, Playwright, 360/390/430/907×510): an old finished save
  through the door, Reveal A once, the Observatory, journal, beach view, the Lens Bench on a full
  board, parking and bringing back, the signal, the harbour and the end card.
- Updated: `tests/v5-next.test.mjs` (20 places; the guard follows the worksite by area),
  `tests/v5-next-economy-sim.mjs` (`toArea`), `tests/v5-next-browser.cjs` (four coming areas from
  the beach; six book pages), `tests/v5-next-playtest-browser.cjs` (the end of the content is now the
  sea gate).
