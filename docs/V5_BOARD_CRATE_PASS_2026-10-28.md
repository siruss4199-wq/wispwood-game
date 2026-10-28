# Vaultwake V5 Coast Camp — Builds 46n/46o: board colours, cargo crate and barrel art (2026-10-28)

- **Branch:** `claude/v5-board-crate`, cut from `claude/v5-audit-fixes` at `82409c3` (Build 46m, the
  latest build with green CI apart from the known Classic V5 failures).
- **Scope:** two visual changes.
- **Not touched:**
  - code: `v5/next/game.mjs`, rules, economy, progression, item IDs, save keys;
  - other art: tools, bags, barrels, generators, background, HUD, crew cards, restoration layout;
  - other areas: `v4/`, `v5/lab/`, PR #75, PR #77.

## 1. Board colours

The colours come from the brief's hex values. Only the crate image was attached to the request,
not the board mockup, so nothing was taken from a mockup. The rules are appended to the end of
`v5/next/coastal.css` (the "Build 46n" block). They replace 45j's pale grey-beige.

| Part | Before (45j) | After (46n) |
|---|---|---|
| Outer frame | 1.5 px `#cbbfa9` | 3 px ocean turquoise `#168da8`, plus a 1.5 px lighter upper rim `#6fcadb` |
| Board surface / gaps | `#e2d9ca` | warm sand `#e9be7a` |
| Cell | flat `#f3ede2` | gradient `#ffe2ac` → `#f3cc8d`, 1 px top highlight `#fff3d6`, soft 1.5 px lower shade `#d9a45cb3` |
| Empty cell | the cell colour at 80 % opacity | recessed sand `#eac58c`: soft darker 3 px top edge, 1 px light bottom edge, full opacity |
| Ice cell | pale cyan wash over the cell | the same pale cyan wash, kept over the warm cell so the ice reads as ice and the part inside is not tinted |

**What stays the same:**
- The frame and rim are outer `box-shadow`s, and the cell depth is background layers. The board's
  size, padding (4 px), gaps (3 px), cell size, sprite sizes and touch targets do not change.
- `box-shadow` stays free for the state rings (twin, target, next action, tapped order).
- The selection corner brackets are unchanged.
- There are no bevels, gold borders, permanent glows or button styling on cells.

## 2. Cargo crate

**Identity.** The closed cargo crate is sealed cargo whose key is a Rivet Rover part
(`CARGO_LOOK.rig` → `CARGO_FILE.crate` → `cargo-crate`, in `v5/next/chains.mjs`).
- It now maps to `cargo-crate-v2` through `PILOT`.
- Deep (buried) crates use the same art with their existing dimming.
- These keep their art:
  - the other cargo looks (canvas bundle, barrel, basket);
  - the generator crates (`KIT_FILE`: driftwood crate, sea chest, captain's trunk), which are a
    different object.
- There is no opened-crate sprite: opened cargo becomes its contents.
- `draw()` is the only Coast Camp renderer, so the new file appears on the board, in the
  selected-item panel and in every preview that draws cargo.
- **Rollback:** delete the `PILOT` entry.

**Files.**
- **Master:** `docs/art-source/coastal-crate-2026-10-28/cargo-crate-master.webp`, the attachment as
  received (1254 px, transparent).
- **Runtime file:** `v5/assets/premium/coast/icons/cargo-crate-v2.webp`, made with the 45l recipe:
  - trim to alpha ≥ 8;
  - square canvas with the object at 92 %;
  - Lanczos resize to 192 px;
  - WebP q92: 16.2 KB.
- The alpha and aspect ratio are kept. There is no baked tile, glow or symbol.
- The old `cargo-crate.webp` is kept.
- `tools/measure-art-fit.py` was re-run, adding one line to `art-bounds.mjs`.

**Size.** `TARGET_OF['cargo-crate-v2']=.81`, measured as a share of the sprite box. The cell has
1 px of padding, so the rendered visible width as a share of the whole cell is:

| Viewport | Visible crate width |
|---|---|
| 360 | 77.6 % |
| 390 | 77.9 % |
| 430 | 78.3 % |
| 907×510 | 78.7 % |

For comparison, the barrel is 78–79 % and the bundle 73–74 %.

## 3. Mint supply barrel (Build 46o)

The closed cargo barrel is sealed cargo whose key is a Rope Winch part
(`CARGO_LOOK.rope` → `CARGO_FILE.barrel` → `cargo-barrel`).
- It now maps to `cargo-barrel-v2` through `PILOT`. The board, the selected-item panel and the
  previews show it; the panel reads "Opens with a Pulley block".
- Nothing else uses the barrel file. There is no open-barrel state.
- Contents, opening rules and the old `cargo-barrel.webp` are unchanged.
- **Master:** `docs/art-source/coastal-crate-2026-10-28/cargo-barrel-master.webp`, as received.
- **Runtime file:** `cargo-barrel-v2.webp`, made with the same recipe: 13.7 KB. The alpha and aspect
  ratio are kept. There is no recolouring, glow, badge or tile.

**Optical balance.** The sizes come from each sprite's own alpha (≥ 160) scaled to its rendered
box, so transparent padding does not count. Measured at 390 px:

| Container | Visible width | Visible height | Painted area of the cell |
|---|---|---|---|
| Canvas bundle (unchanged) | 72.9 % | 66.3 % | 35 % |
| Crate (46n) | 77.6 % | 67.1 % | 39 % |
| Barrel at the crate's longest side | 64.4 % | 77.6 % | 43 % |
| **Barrel as shipped** (`TARGET_OF` .795) | 63.2 % | 76.2 % | 41 % |

At the crate's longest side, the barrel is a solid rounded block that fills its box and painted 9 %
more of the cell, so it looked heavier. The shipped size is at the bottom of the 76–80 % start
(75.9 % tall at 360, 77.0 % at 907×510). The bundle was left as it is; at 73 % it is the lightest of
the three, as before.

**Silhouettes at real phone size** (390 px board at DPR 1, compared side by side):
- **Bundle:** a wide, soft canvas bag with a handle, green flap and coral straps.
- **Crate:** a rectangular block with blue corner bands and a coral clasp.
- **Barrel:** an upright rounded block with a mint middle and two navy hoops.

They are told apart by shape as well as colour. Bundle and barrel share green: the bundle's is a
dark flap on khaki, the barrel's a pale band on brown wood.

**Test change.** `tests/v5-next.test.mjs` "board art" asserted that rope cargo draws the old
`cargo-barrel.webp`. It now asserts:
- the closed crate (including deep cargo) and the barrel draw their `-v2` files;
- the basket and the generator crates do not;
- both are shown at 76–82 % of the sprite box;
- the containers still agree within 5 points, now using the files the board actually draws.

## Verification (Chromium; same save before and after)

- **Screenshots:** before (`82409c3`, served from `git archive`) and after, at 360×780, 390×844,
  430×932 and 907×510. They show the board with a selected part and its twin ring, the crate
  selected with its panel, and (at 390) a part held over its merge target.
- **Contrast:** copper, wood and the yellow Rover stay distinct from the warm cells; each has a
  dark outline and its 1 px contact shadow. The wicker basket (cargo opened by Shell/Lantern parts)
  is the closest to the sand, but its outline and weave keep it readable. It is unchanged in this
  pass.
- **Crates against bags and barrels:** at every width the blue bands and coral clasp set the crate
  apart from the green and khaki bags and the brown hooped barrels.
- **State indicators:** all three ice damage stages, the selection brackets, the twin ring and the
  drag target ring stay clear.
- **Interactions:**
  - a drag merge works, and reload keeps the result;
  - `tests/v5-next-browser.cjs` opens a cargo during its loop;
  - the earlier Tide-token, weak-ice and level-path browser checks pass at 390 (level path also at
    907×510).
- **Errors:** there is no clipping of the frame at 360 or at the top in landscape. There are no
  missing images, failed requests or console errors.

**Commands:**
- `node --test tests/v5-*.test.mjs`: 295/295 pass (46n and 46o).
- `node tests/v5-next-browser.cjs`: the Chromium Coast Camp steps pass at 360, 390 and 430. The run
  then stops because WebKit is not installed in this container; that is not a test failure. CI
  runs WebKit.

**Not tested here:** WebKit and real Safari or iOS devices.
