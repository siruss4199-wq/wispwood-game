# Vaultwake V5 Coast Camp — Build 45, coastal board design (2026-10-25)

Branch `claude/v5-coastal-board-ui`, from `claude/v5-bright-coast` f4a08d8 (Build 44b: the bright
coast pass, PR #78's painted beach map and the meaningful orders the user asked for). The gameplay
source `claude/v5-autonomous-rebuild` was checked first: its HEAD is still e020a5f. Review branch,
not for `main` or the gameplay branch.

**Presentation only.** No file of the rules is touched: `v5/next/game.mjs`, `areas.mjs`,
`guide.mjs`, `purposes.mjs`, economy, order requirements, rewards, progression, generators, tide,
board size, item art and saves (`vaultwake-v5-coast`, `vaultwake-v5`) are as in f4a08d8.

## What the player sees

| Part | Build 45 | Where |
|---|---|---|
| Background | the supplied coastal picture (sea, sky, sand, palms at the edges), the same on every area; each area's own picture now lives on the restoration strip and the coast screen | `coastal.css`, `app.mjs` `render` |
| HUD (52 px) | turquoise energy pill with the +1 timer, cream coin pill, the painted level badge (number live, progress as a thin ring), the painted menu button. No add/buy buttons. The BEACH button is gone from the header: the restoration strip is the way to the coast | `play.html`, `coastal.css` |
| Order rail | a sideways rail of painted cards, 146 × 150 px, 8 px apart (two whole cards and part of the third at 390 px), in their lanes. Each card: a painted face for Ivo and Bram (the drawn portrait for Neri and Tamsin), the name, a "Big job" or "Stage n" tag inside the card, the real parts with have/need (green with ✓ when there are enough), and a footer that always holds one thing: the coins, or the painted Deliver button with live "Deliver +N". No progress bars, no clipped subtitles (the reason stays in the tapped order's panel) | `app.mjs` `renderOrders`, `coastal.css` |
| Restoration strip (56 px) | the painted strip; its circle shows the place the next stage is for, its pill says **Build** (coral) only when materials and coins are both in, otherwise **View** (turquoise) with the real objective and what it still needs. Tapping it opens the coast on that place and spends nothing; the build is confirmed there | `app.mjs` `renderNextPlace`, `coastal.css` |
| Board | uniform painted apricot cells, 3 px gaps, a shallow sand tray; no glows or gleams on cargo; a cargo's key stays small inside its cell; levels and crate counts stay small inside their cells | `coastal.css` |
| Selection | thin gold corner brackets; the twins it can merge with (engine rules) get a soft green ring; the cell under a dragged part a stronger one | `coastal.css` |
| Ice | the three supplied ice pictures, chosen by the engine's crack count: intact (3 hits left), cracked (2), heavily cracked (1); the third hit shatters it (Build 44 shards) and frees the part. The selected-item panel starts with "N hits left" | `chains.mjs` `draw`, `app.mjs` |
| Selected thing | a compact cream card: the thing on a cell tile, its name, two lines of help (tap for the rest), its buttons | `coastal.css`, `app.mjs` |
| Story cards | the painted faces for Ivo and Bram | `app.mjs` `playLines` |
| Motion | merge pop about 200 ms; coins and parts fly about 500 ms (Build 44); the strip changes as the coins land and pulses when it becomes ready; the coast opens on the place (Build 44 focus move); before → after on build. Reduced motion turns the flights off and keeps every result | `coastal.css`, Build 44 code |

Sound and vibration are Build 44's (`sfx.mjs`, `haptics.mjs`, menu → Sound and vibration check).

## Supplied art and what was made of it

Runtime exports in `v5/assets/premium/coast/ui/` (WebP, cropped to their visible edges, sized for
2× screens), about 250 KB in all; the full-resolution masters (WebP q92, 4 MB, never loaded by
the game) are in `docs/art-source/coastal-ui-2026-10-25/`.

| Runtime file | Size | Used for | How |
|---|---|---|---|
| `coast-bg.webp` | 720×1563, 81 KB | board-screen background | `cover`, top-anchored |
| `hud-level.webp`, `hud-menu.webp` | 109×112, 4–5 KB | level badge, menu button | number live in HTML |
| `order-card.webp` | 276×330, 14 KB | order cards | nine-slice (`border-image` 95/30/75/95) so the face ring and the footer band keep their shape at 146 × 150 |
| `deliver.webp` | 330×84, 4 KB | Deliver button | live text over it |
| `restore-strip.webp` | 720×159, 24 KB | restoration strip | nine-slice (left 170 / right 215) at 56 px; the baked boardwalk in the circle is covered by the real place, the orange pill by a live label (turquoise when not ready) |
| `cell.webp` | 128×127, 2 KB | every board cell and the panel's tile | `100% 100%` |
| `ice-0/1/2.webp` | 160×160, 11–20 KB | the three ice states | over the part |
| `crew-ivo.webp`, `crew-bram.webp` | 160 px, 8–10 KB | Ivo and Bram | round 35 px faces |
| `crew-nara.webp`, `crew-sela.webp` | 160 px, 12–13 KB | **not used** (prepared only) | see below |

The supplied turquoise "beach" pill (with a baked beach picture) is not used: the restoration
strip already is the way to the coast, and its picture would not match each objective.

## Needs approval: Nara and Sela

The game's crew is Ivo (quartermaster), Neri (navigator), Tamsin (signal keeper) and Bram
(expedition lead); every order and story line names one of them. Nara and Sela are not in the game,
so their portraits are prepared and not shown. Two ways forward, for the user to choose:

1. **Faces for the existing crew**: use the Nara portrait for Neri and the Sela portrait for
   Tamsin (or the other way round). No rule changes; only the pictures (and, if wanted, the names
   in `v5/crew.mjs` text, which Classic V5 also uses, so the names would stay).
2. **New crew members**: Nara and Sela as new characters would need an unlock moment, a share of
   orders and story lines: a design proposal, not a UI change.

Until then Neri and Tamsin keep their drawn portraits, which do not match the painted faces.

## Gameplay feedback (analysed separately, no change here)

The measured analysis and the order changes the user asked for on 2026-10-25 are in
`docs/V5_ECONOMY_AUDIT_PROPOSAL_2026-10-24.md` (they ship in PR #81, not in this UI PR). In short:
orders that were already done on arrival fell from 14 % to 5 %, repeats from 29 % to 24 %
(chapter 19 % → 14 %), coins per part from 2.7 to 3.1; energy was left alone (cutting the level-up
refill doubled the waiting); and pay and difficulty are coupled (order tiers follow stages built),
so any reward change needs measuring. Proposals still open: memory of more orders, difficulty that
follows generator levels instead of stages built (needs approval).

## Tests

| Command | Result |
|---|---|
| `node --test tests/v5-*.test.mjs` | 282 pass, 0 fail |
| `node tests/v5-next-browser.cjs` | Chromium 360/390/430 pass (the old header-button assertions now check the strip) |
| `node tests/v5-next-playtest-browser.cjs` | Chromium 360/390 pass |
| `node tests/v5-next-bright-browser.cjs` | Chromium 360×780, 390×844 (+ reduced motion), 430×932, 907×510 pass; now also checks card size, the sideways rail, no bars or subtitles, painted faces, strip height and View/Build, the painted ice per state, "1 hit left", and that opening the coast spends nothing |
| WebKit | not installable in this environment; runs in CI (Coast Camp step) |

## Remaining visual issues

- Neri and Tamsin have no painted faces (needs the choice above).
- The shed row has no painted art (the mockup's shed hut was not supplied).
- The coast screen keeps Build 44's styling; it was not part of the supplied art.
- The cracked ice (2 hits left) is a lighter change from intact at phone size than the other two
  steps; the item stays readable in all three.
- When a tapped order's panel is open it pushes the board down; at 390 × 844 the board then needs a
  small scroll.
