# Coast Camp — pre-release clarity and mobile QA (Build 45g, 2026-10-26)

Branch `claude/v5-coastal-board-ui` (draft PR #82), on top of Build 45f (af36831).
Presentation only: `v5/next/game.mjs`, the generators, tide, economy, board size and saves are
unchanged. No V4, `v5/lab/`, PR #75 or PR #77 file was touched.

## 1. Order requirements that looked duplicated

**Repro (this branch, fresh save):** start a new camp. Bram's opening order is
`[{rig, tier 2, ×1}, {rig, tier 1, ×2}]` (`fresh()` in `v5/next/game.mjs`). The card drew two
wrench pictures, `0/1` and `1/2`.

**Root cause, two cases:**

1. **Different tiers that look alike (this branch).** Tier 1 is the *Grip tool*, tier 2 the
   *Split spanner*. Both are orange-and-teal wrenches and look the same at card size (34 px). The
   counts were correct, but nothing on the card told the two apart.
2. **The same part listed twice (PR #83 engine, Build 46c+).** The same-chain two-crew job
   (`game.mjs` 46e, line 258) plus the variation step that lowers or raises one need's tier (lines
   273/275) can produce `[{rig,1,×1},{rig,1,×2}]`. `orderProgress()` counts each need on its own,
   so a single Grip tool on the board showed as **1/1 and 1/2**. Delivery (`orderItems()`) is
   correct: it takes a different board piece for every part, so it needs three Grip tools.
   - Measured with a scripted player: 15 of 105 crew orders on 46e name the same part twice,
     against 0 of 114 on this branch.
   - Bram asks 63 % of crew orders on 46e (32 % here). `crewFor()` gives every two-need order to
     Bram, including the same-chain jobs.

**UI fix (this branch):** `v5/next/needs.mjs` pools needs by family+tier. The card, the tapped-order
panel, the board highlights, the guidance line and the coast card all use it.

- In case 2 the card now shows one Grip tool at **1/3**.
- In case 1 each picture carries **Lv2 / Lv3** when one chain appears at two tiers in the same
  order.
- The selected part's panel shows its level too, and its card entry lights up.
- A new test in `tests/v5-next.test.mjs` checks that the pooled view shows "complete" exactly when
  `orderItems()` accepts, over 400 random boards and orders.

**Proposed gameplay fix, separate, for PR #83 — not done here:**

- In `makeOrder()`, merge needs that end on the same family+tier after the variation step, or
  reject that variation.
- In `crewFor()`, give a same-chain two-part job to the chain's own crew member (rig → Ivo,
  chart → Neri) instead of Bram.

The second change is a content decision for the director, because it changes who asks for what.

## 2. Board clutter

- The "?" printed on every crate, bundle and barrel is gone from the board.
- The small "opens with" badge now shows only when it matters now:
  - the opening part is on the board (it pulses, as before);
  - the cargo is selected;
  - the selected part opens it.
- The tapped order also rings cargo that holds a generator the order still needs.
- Everything else is in the panel under the board when the cargo is tapped.
- Deep cargo keeps its dimming. Board contents and art sizes are unchanged.

## 3. Generators

- Every working generator carries a small gold ϟ in its corner. A locked one keeps "NEXT AREA".
- Its panel now says what the next tap will make ("Next tap: Copper offcut (Lv1)"). This is
  computed by running the engine's own `produce` on a copy of the state, so it is the real output.
- When production is blocked, "Make · 1 ϟ" is disabled and the real reason sits beside it:
  - "No energy · +1 in m:ss";
  - "Board full";
  - otherwise the engine's own message.

## 4. Mobile space

- The gaps between the orders, the strip, the guidance line and the board are about 10 px tighter
  in total. Page height at 390×844 went from 936 to 926 px.
- The free-space count is a small tab on the board's bottom-right rim, beside the shed:
  - it reads "N spaces left" while 3 or fewer are free;
  - it turns coral "Board full" at 0.
- In landscape the tab sits on the board's rim too. 907×510 stays exactly 510 px tall, with no
  scrolling.
- Text and controls are the same size as before.
- The safe-area bottom padding from `mobile.css` stays as it was.

## 5. HUD and ice

- Energy and coin numbers are the same size and weight (17 px / 900).
- The energy number has a firm dark edge.
- The "/50" cap is lighter, but readable on the painted well.
- The gauge slot behind it has a faint dark fill, which cuts the white glare at the right of the
  pill.
- **Ice at real cell size** (45 px at 360, 49 px at 390, 3× captures):
  - all three painted states (whole, cracked, nearly broken) keep the part inside recognizable;
  - the selection panel shows "N hits left" with pips.
  - No change was needed.

## 6. Full-loop check (Chromium, 390×844 touch, reduced motion; real page, every step asserted on the save)

**Merging**
- ✓ A tap on a twin after selecting moves the selection. Coast Camp merges by drag only; the
  selected part marks its twins and the guidance says "Drag … onto its twin". There is no
  tap-to-merge, by design.
- ✓ Drag merge: Copper offcut + Copper offcut → Grip tool. Tideglass beside it cracks 1 → 2 → 3,
  then breaks, and its part is free.
- ✓ Invalid merge (Grip tool onto a chart part): no merge, no parts lost, message "Merge two
  identical parts."

**Production**
- ✓ Produce: energy 40 → 39, one more part. The panel names the next output.
- ✓ Blocked at 0 energy: nothing made, the button is disabled, and the reason and refill time are
  shown.
- ✓ Blocked with a full board: nothing made, no energy spent. The panel and the board tab both say
  "Board full".

**Orders and builds**
- ✓ Delivery: Bram's card ready → tap → coins 10 → 30 (saved and shown); a new order takes the lane.
- ✓ Unaffordable build: no Build button; the card says "Earn 30 more".
- ✓ Affordable build: coins 60 → 20. The place picture appears on the coast (`place-path-1.webp`),
  the story beat plays, and the player returns to the board.

**Storage, menus and saves**
- ✓ Shed: store a part, put it back.
- ✓ Menu: opens and closes.
- ✓ Reload: board, coins, orders and shed are unchanged.

**Settings and accessibility**
- ✓ Sound toggle: saved.
- ✓ With no `navigator.vibrate` (as on iPhone Safari): the vibration setting is hidden, play goes
  on, no page errors.
  - Vibration was **not** tested on a real iPhone. iOS Safari does not expose the Vibration API, so
    the game shows no vibration setting there.
- ✓ Reduced motion: `tests/v5-next-bright-browser.cjs` passes the whole flow at 390×844 with
  `reduce`.

### Merge sound — measured, not listened to

I cannot hear audio. These numbers come from an offline render (Chromium `OfflineAudioContext`,
48 kHz) through the game's own bus and repeat rules (`sfx.renderInto`). A person still has to
listen on a phone speaker.

| cue | peak | length to −40 dB | spectral centroid | energy above 2 kHz / 4 kHz |
|---|---|---|---|---|
| merge (tiers 1–7) | −12.3 dBFS | 88 ms | 450–630 Hz | 0.1–1.8 % / 0 % |
| produce | −13.5 dBFS | 86 ms | 1.8 kHz | 21 % / 18 % |
| ice crack | −14.3 dBFS | 27 ms | 4.5 kHz | 94 % / 43 % |
| deliver | −14.5 dBFS | 194 ms | 1.3 kHz | 7 % / 0.5 % |

- **Merge:** short and low-centred by these measures, not shrill.
- **Repeats** never get louder:
  - ten merges 80 ms apart peak at −12.3 dB, then fall to about −20 dB;
  - at 30 ms apart, only 5 of 10 play (45 ms repeat gap).
- **Brightest cue:** the ice crack, which is short (27 ms).

## 7. Order effort and economy (this branch's engine, unchanged; reported, not changed)

Scripted player (`tests/v5-next-policy.mjs`), 76 orders. Effort is in energy: a tier-t part costs
2^t generator taps.

| kind | orders | energy avg (max) | coins avg | coins per energy |
|---|---|---|---|---|
| quick | 9 | 8.0 (16) | 22.2 | 2.78 |
| pair (two crew) | 17 | 10.6 (24) | 33.2 | 3.14 |
| big job | 8 | 13.0 (32) | 50.0 | 3.85 |
| gold (stage materials) | 42 | 31.5 (40) | 137.1 | 4.35 |

**Crew share:** Ivo 16, Bram 12, Neri 6. Tamsin never asks in this run.

**Energy pacing**, 12 h simulation, `energy-measure` on this branch:
- at 4 s per action, idle waiting is 65 % of play time;
- at 10 s per action, it is 12 %.

PR #83's delivery energy brought the 4 s figure down to 54 % in the same harness. That change
lives in #83, not here.

## 8. Tests run

| command | result |
|---|---|
| `node --test tests/v5-*.test.mjs` | 283 pass, 0 fail (282 before + 1 new) |
| `node tests/v5-next-browser.cjs` | Chromium 360/390/430 pass. WebKit not installable in this container (CI runs it). |
| `node tests/v5-next-bright-browser.cjs` | Chromium 360×780, 390×844 (plus reduce), 430×932, 907×510 pass. WebKit: CI. |
| `node tests/v5-next-playtest-browser.cjs` | Chromium 360/390 pass. WebKit: CI. |
| scratch full-loop and screenshot scripts | all steps pass; no page errors; no sideways scroll at any width |

Already known, not from this change:
- Classic V5 CI failures at `tests/v5-camp-browser.cjs:126` and the WebKit sideways-scroll check
  at `tests/v5-coastal-browser.cjs:29`.
- They also fail on the base branch.

## 9. Not release-ready yet — honest blockers

- No real-device run (iPhone Safari, Android Chrome). Every check here is desktop Chromium with
  touch emulation.
- Sound has been measured, not listened to.
- PR #83's engine gives Bram 63 % of crew orders and can list one part twice. The UI now shows
  that correctly, but the orders themselves need the separate fix proposed in section 1.
- The shed and some coast places still use earlier art.
- Classic V5 CI is red, for reasons that predate this work.
- PRs #82 and #83 are still open drafts and not merged.

## Build 45h: the gold order's missing parts are obvious (2026-10-27)

User, with an iPhone screenshot of the coast card ("item dutaj baigaa ni sain anzaaragdahgui"):
the card showed the coins as a green 70/70, but the missing part only as a small "1/2". It read as
if nothing was missing.

**Coast card** (`mapCard`)
- A missing part gets a coral ring and a coral count. A part already on the board gets a green
  "✓ 1/1".
- A line under the needs names what is missing, for example "Missing: 1 × Grip tool", or says
  "All parts are on the board: deliver the gold order".
- The button names the part: "Make the missing Grip tool", or "Make N missing parts".

**Strip** on the board: "◆ 1 part missing · 🪙70/70" (it said "Gold order"). The strip's spoken
label names the parts.

Tested in `tests/v5-next-bright-browser.cjs`, after the first build: the card's "Missing:" line,
the ringed part, the button wording and the strip's count, at all five viewports. Presentation
only.

## Build 45i: board art consistency pass (2026-10-27)

User, with an iPhone screenshot: item scale, cell surfaces and visual weight were inconsistent; the
board did not read as one art set. Presentation only: board contents, mechanics and saves are
unchanged.

### Why the sizes were inconsistent (measured, not guessed)

- **The art.** Every painted icon is cropped so its solid object (alpha ≥ 160) fills about 91 % of
  its canvas on its longest side. The four original Rover parts (copper offcut, grip tool, split
  spanner, pocket winch) fill 95 %. Size therefore said nothing about the object: a copper offcut
  and an excavator were drawn equally large unless the board scaled them.
- **The board CSS.** Scattered rules gave each kind a different box. At 390 px (49 px cell):

  | Kind | Visible longest side | Why |
  |---|---|---|
  | Materials | ~92 % of the cell | `premium.css`'s 100 % rule won on specificity |
  | Generators | ~80 % | 88 % box |
  | Cargo | ~75 % | 84 % box |
  | Crates | ~64 % | `scale(.82)` |
  | A selected part | ~98 % | `style.css` `scale(1.07)`, lifted 5 px |

- **The cells.** Even cells had the painted bevel (`cell.webp`). Odd cargo and odd empty cells had
  flat colours from `bright.css`. Ice was a pale-blue card. The twin of the selected part had a mint
  background.

### What changed

- **One presentation map.** `v5/next/art-bounds.mjs` holds the measured bounds, generated by
  `tools/measure-art-fit.py`. `v5/next/art-fit.mjs` holds the target per kind and an empty
  per-sprite tuning map. `draw()` puts each sprite's fit on it as CSS variables (`--fit`, `--dx`,
  `--dy`); only the board reads them. The original asset files are untouched.

  | Kind | Longest visible side, square object | Thin object |
  |---|---|---|
  | Items | 72 % of the cell | up to 80 % |
  | Containers | 78 % | up to 84 % |
  | Generators | 85 % | up to 88 % |

  Each sprite is centred on its visible object. Identical items render identically: selection and
  twins no longer change the size.
- **One cell surface.** Every cell is the same warm sand, with a 1 px highlight and a 1.5 px depth
  line drawn as background layers, so state rings keep `box-shadow`. Empty cells are the same sand,
  flat. The board has a thin rim. States are overlays only: gold corner brackets for the selection,
  a plain green ring for twins (no glow), the existing rings for a drag target and for the tapped
  order.
- **Ice.** The painted frame lies over the same sand, with a faint cool tint inside. The part sits
  at one size in all three states, with no wash-out filter. This replaces 45d's pale-blue ice
  cards; the new brief asks for ice as an overlay on the base cell.
- **Badges.** All badges share one size (15 px, 17 px on the landscape board), one white ring and a
  2 px corner inset: the ϟ generator mark, the crate's parts count and the level tag. The crate's
  family dot is 8 px, top-left. A cargo key is 17 px and still shows only when relevant.

### Checked

- Same save and same arrangement before and after at 360/390/430 px and 907×510. The board shows
  copper, grip tools (one selected, its twin unselected), spanner, crate, barrel, bundle, the three
  ice states, empty cells, a level-2 generator and crate counts.
- A tap on a cell's corner, outside the sprite, still selects. A corner-to-corner drag still merges.
  The scripted full loop passes.

### Assets that may still need repainting

These clash a little after normalising; none blocks release.
- **`rope-0` (Frayed twine):** a thin squiggle with little visual weight even at 80 %.
- **The four original Rover parts:** more saturated, with heavier outlines than the sheet icons.

## Build 45j: breaking the blue/bronze monotony (2026-10-27)

Art direction: the board overused turquoise (background, bags, ice) and bronze (cells, copper
tools, wooden containers).

### Done with board styling (no global filter on items)

- **Board.** Pale, low-saturation sand cells (`#f3ede2`) on a grey-sand board (`#e2d9ca`), with a
  thin rim. The orange cast is gone.
- **Background.** The sea behind the board is less saturated, with a pale aqua wash around the
  board.
- **Ice.** A very pale translucent cyan inside, and the painted frame at 78 % opacity.
- **Badges.** The level tag and the crate count are neutral slate. The generator's ϟ action mark
  keeps its colour.
- **Interim container tone.** `art-fit.mjs` `TONE` applies to containers only; a test enforces
  that. The canvas bundle (sealed Survey Kite cargo, often a third of the board) is painted
  turquoise. No filter makes it natural canvas while keeping its rope and brass: a hue turn makes
  the straps violet. So the board draws it as a pale weathered canvas until it is repainted. This
  is not a material fix, and the sea chest stays as painted.

### Colour baked into the art: sprites that need repainting

Measured share of each sprite's solid, saturated pixels (`turquoise` = hue 165–205°):

| Sprite(s) | Now | Direction |
|---|---|---|
| `cargo-bundle` (interim tone above) | turquoise 50 % | natural canvas, small coloured accent |
| `sea-chest` | turquoise 51 % | natural wood with a small accent |
| `grip-tool`, `split-spanner` (`assets/premium/*-vibrant.webp`) | turquoise handles 19–23 % | coral handles, silver steel jaws |
| `chart-0`…`chart-7`, `gen-chart` | turquoise 20–54 % | ocean blue, ivory map paper, restrained brass |
| `lamp-0`…`lamp-4`, `gen-lamp` | copper/gold 36–66 % | sea-green, selective violet, pearl white |
| `tide-token` | turquoise 77 % | shift off the ice/sea hue (sea-green) |

Unchanged, and correct as they are:
- `copper-offcut`, 85 % copper: copper should read as copper.
- The rope chain: natural rope.
- The shells: coral and peach.
- The barrels and crates: wood.

Until these are repainted, tools, maps and lights are only as distinct as their current paint.
Order cards and the board show the same art.

### Checked

- Same save at 390 px, before (45h) and after: full screen and board. Also 360, 430 and 907×510.
- Matching items are marked by the gold brackets and the green ring, not by colour alone.
