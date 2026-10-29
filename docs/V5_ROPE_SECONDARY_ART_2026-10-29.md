# Vaultwake V5 Coast Camp — proposed Rope Winch secondary chain "Sailmaking": art preparation (2026-10-29)

**Branch.** `claude/v5-rover-secondary-art`.
- Batch 1 is the Rover set: `docs/V5_ROVER_SECONDARY_ART_2026-10-29.md`.
- Batch 2 is the Survey Kite set: `docs/V5_KITE_SECONDARY_ART_2026-10-29.md`.

**Scope.** Art and an isolated preview only.
- No chain or id is registered.
- No drops, order requirements, energy, progression, saves, existing item ids or rules change.
- The files sit in `v5/assets/premium/coast/proposed/`, which the game does not load and
  `tools/measure-art-fit.py` does not read.

## Tier mapping (identified by appearance)

| Tier | Proposed name | What it shows | Master (pixel-exact lossless WebP) | Board file (192 px, WebP q92) |
|---|---|---|---|---|
| 1 | Canvas Offcut | crumpled coral fabric with frayed threads | `docs/art-source/rope-secondary-2026-10-29/canvas-offcut-master.webp` | `v5/assets/premium/coast/proposed/rope-canvas-offcut.webp` (12.7 KB) |
| 2 | Stitched Sailcloth | folded ivory cloth with a coral corner and cross stitches | `…/stitched-sailcloth-master.webp` | `…/rope-stitched-sailcloth.webp` (13.2 KB) |
| 3 | Rolled Sail | rolled ivory canvas, coral edge, two navy buckled straps | `…/rolled-sail-master.webp` | `…/rope-rolled-sail.webp` (12.0 KB) |
| 4 | Finished Sail | triangular ivory/coral sail lashed to a wooden frame | `…/finished-sail-master.webp` | `…/rope-finished-sail.webp` (11.0 KB) |

- The masters are the attachments as received: 1254 px RGBA with real transparency, verified
  identical after lossless saving.
- Their silhouettes are complete; edge alpha is noise of value 0–1, which the recipe clears.
- All four are ordinary merge items, not generators. Nothing is baked in: no label, badge, tile or
  shadow.
- The board icons are made with `tools/prepare-icon.py` (Build 45l recipe):
  - trim to alpha ≥ 8;
  - object at 92 %;
  - Lanczos to 192 px;
  - WebP q92.

## Existing Rope Winch chain and ids (inspected)

- **The Rope Winch chain** (family `rope`, tiers 0–5, book keys `rope0`…`rope5`): Frayed twine, Rope
  coil, Fishing net, Pulley block, Rope ladder, Cargo hoist. All are rope and wood; none is a sail or
  cloth.
- **Family ids in use:** `rig`, `chart`, `rope`, `shell`, `lamp`, `optic`, `flux`. Nothing uses
  `sail` or `cloth`. A new id would be free, but none is registered.
- **Canvas places on the beach.** The tent (coral and ivory striped canvas) and the signal mast
  (pennants, no sail) are place art, not items. The new cloth matches the tent's look, which suits
  the Winch, and does not conflict with it.

## Conflicts and art to revise before registering ids

1. **Finished Sail vs Cargo hoist (Rope Winch tier 5).**
   - Both are triangular wooden frames with rope lashings, and the hoist is the Winch's own top part.
   - Colour separates them on the board (ivory/coral cloth against brown rope and teal), but their
     silhouettes are close, and they would sit side by side in the same Winch orders.
   - *Revise:* a sail on a short mast or a rolled-up yard, or a sail shown billowing; or accept it
     with a clear name.
2. **Rolled Sail vs the canvas cargo.**
   - The board's sealed canvas cargo (a bundle that a Survey Kite part opens; often many on the
     board) is also cream canvas with straps and buckles.
   - Shape and colour differ: the cargo is a bag with a green flap and red straps, the Rolled Sail a
     cylinder with navy straps. At 45–49 px they stay apart in the preview.
   - Cargo is a container and this is an item, so any confusion would cost a mis-tap.
   - Worth a check in the gameplay pass, when both can be on the board together.
3. **"Canvas Offcut" vs the Rover's "Copper offcut".** Two tier-1 "offcuts" in different chains. A
   different word (for example "Canvas scrap", or "Sail scrap" to match the chain) avoids two
   identical book entries and order lines.
4. **One palette across two secondary chains.**
   - The Kite set (parchment with coral marks) and this set (ivory and coral cloth) share ivory and
     coral, and the Rover set uses coral and navy too.
   - The secondary items read as one family, but colour no longer says which generator makes them;
     only the shapes do.
   - If orders mix chains, a small producer tag (planned in `V5_SECONDARY_CHAINS_PLAN`, section 7)
     matters more.
5. **Ivory cloth against warm cells (measured).**
   - The light cloth of the Stitched Sailcloth, the Rolled Sail and the Finished Sail is ΔE 14–18
     from the light cell (#FFE2AC) and 22–25 from the lower cell (#F3CC8D).
   - Their rims stand out at ΔE 23–43.
   - **The Stitched Sailcloth is the weakest:** about half of it is ivory and its rim is the softest
     (ΔE 27 / 23). At 45–49 px it stays readable by its coral corner and fold shading; in grayscale
     its body all but merges with the cell.
   - *Revise if it must read without its coral corner:* a warmer, darker canvas or a stronger edge.
   - The other three keep a clear outline: a coral edge, the navy straps, the wooden frame.

## The Finished Sail's size

- It is a thin triangle, so it covers less of its box than the other tiers.
- At the board's item target it covers 21.6 % of a cell, against 25.8–32.1 % for tiers 1–3.
  It would look like the *smallest* tier, and the existing Rope Winch parts range from 12 % (Frayed
  twine) to 37 %.
- The art already fills its canvas (92 %). The fix is the board's per-sprite optical target, which
  already exists for this purpose:
  - **proposed `TARGET_OF['rope-finished-sail']=.845`** (fit .921) in `v5/next/art-fit.mjs` at
    integration;
  - that brings it to about 29 % of the cell, between tiers 2 and 3.
- The preview and the "after" strip use it. It is not written into `art-fit.mjs` in this pass,
  because the file is not on the board yet.
- The other tiers need no tuning: 26.8, 32.1 and 25.8 % at the item target.

## Normalisation (measured as `tools/measure-art-fit.py` does: solid object at alpha ≥ 160)

| | Solid object in master | After the recipe | Board fit | Visible area of the cell | Brightness (luma) |
|---|---|---|---|---|---|
| Canvas Offcut | 0.940 | 0.917 | 0.808 | 0.268 | 131 |
| Stitched Sailcloth | 0.946 | 0.917 | 0.807 | 0.321 | 178 |
| Rolled Sail | 0.968 | 0.917 | 0.805 | 0.258 | 157 |
| Finished Sail | 0.965 | 0.917 | 0.921 (tuned) | ≈ 0.29 (0.216 untuned) | 173 |
| Existing Rope Winch (`rope-0`…`5`) | — | — | — | 0.12–0.37 | — |

- **Lighting.** The key light is upper left with soft rim highlights, as on the board's icons.
  - Brightness follows the material: the cloth is brighter than the Winch's rope and wood.
  - It is not changed, because darkening ivory lowers its contrast with the cells (the same finding
    as the Kite papers).
- **Shadows.** Only soft rims, no baked ground shadow. The board draws one small drop shadow under
  every item.

## Previews

- `node tools/preview-proposed-art.cjs rope OUT` draws, on the real board and on screen only:
  - row 1: the Rope Winch chain, tiers 0–5, and the Rope Winch;
  - row 2: the four new items in order, beside the Cargo hoist, the canvas cargo and the Copper
    offcut;
  - row 3: the four again, the Stitched Sailcloth selected and the Rolled Sail marked as a merge
    target, beside the Fishing net, the sea chest and the driftwood crate.
- Board cells: 44.8 px at 360, 49.1 at 390, 54.8 at 430 and 65.7 at 907×510.
- **Before/after at exactly 48 px** (`rope-before-after-48px-x3`). Its rows are:
  - the attachments as received, sized by canvas the way the board sizes unmeasured art;
  - the prepared icons with their measured fit;
  - the same with the Finished Sail untuned;
  - on the lower cell colour;
  - in grayscale.

## Batch 2 (Survey Kite) at this point

Verified, not redone: its four files and masters are as committed in `cd5300e`, and its conflicts
stand (`docs/V5_KITE_SECONDARY_ART_2026-10-29.md`):
- the Logbook's wave emblem is the story's seal;
- logbooks are Observatory story objects;
- Ink scrap is the same parchment;
- the ivory paper of tiers 1–2 blends with the cells.

A matching before/after 48 px strip was added in this pass (`kite-before-after-48px-x3`).

## Checks actually run

- Masters compared byte-for-byte with the attachments (identical).
- Edge alpha, solid bounds, covered area at board fit, brightness, and ΔE of the light cloth and the
  rims against both cell colours (Pillow).
- Board previews at 360/390/430/907×510 in Chromium on the real page, and the 48 px before/after
  strips.
- `node --test tests/v5-next.test.mjs` (board-art test included) passes; the proposed folder is not
  measured.
