# Vaultwake V5 Coast Camp — proposed Lantern Kiln secondary chain "Stained Glass": art preparation (2026-10-29)

**Branch.** `claude/v5-rover-secondary-art`, with the Rover, Kite, Rope Winch and Shell Trap sets
(`docs/V5_*_SECONDARY_ART_2026-10-29.md`).

**Scope.** Art and an isolated preview only.
- No chain or id is registered.
- No drops, order requirements, energy, progression, saves, existing items or rules change.
- The files sit in `v5/assets/premium/coast/proposed/`, which the game does not load and
  `tools/measure-art-fit.py` does not read.
- The chain is meant for future crew orders; rates and rewards come with the energy and bad-luck
  pass.

## Tier mapping (identified by appearance)

| Tier | Proposed name | What it shows | Master (pixel-exact lossless WebP) | Board file (192 px, WebP q92) |
|---|---|---|---|---|
| 1 | Coloured Glass Shard | one chunky cobalt-blue fragment | `docs/art-source/lamp-secondary-2026-10-29/glass-shard-master.webp` | `v5/assets/premium/coast/proposed/lamp-glass-shard.webp` (14.1 KB) |
| 2 | Joined Glass | a blue piece and a violet piece joined along one metal seam | `…/joined-glass-master.webp` | `…/lamp-joined-glass.webp` (15.6 KB) |
| 3 | Glass Mosaic | diamond panel, four blue panes around a violet centre, pale gold frame | `…/glass-mosaic-master.webp` | `…/lamp-glass-mosaic.webp` (13.8 KB) |
| 4 | Sunwave Window | arched stone window: a gold sun over blue waves, violet sky | `…/sunwave-window-master.webp` | `…/lamp-sunwave-window.webp` (14.1 KB) |

- The masters are the attachments as received: 1254 px RGBA with real transparency, verified
  identical after lossless saving.
- Their silhouettes are complete; edge alpha is noise of value 1, which the recipe clears.
- All four are ordinary merge items. The window is not a building, a place, a generator or a story
  key.
- The board icons are made with `tools/prepare-icon.py` (Build 45l recipe):
  - trim to alpha ≥ 8;
  - object at 92 %;
  - Lanczos to 192 px;
  - WebP q92.
  - Nothing is baked in.

## Existing Kiln, optics, crystals and tideglass (inspected)

- **The Lantern Kiln chain** (family `lamp`, tiers 0–4, book keys `lamp0`…`lamp4`): Candle stub,
  Tin lantern, Storm lantern, Signal lamp, Beacon lens. Its glass is a lamp's lens (teal) in brass.
- **The Lens Bench chain** (family `optic`, Chapter 2): Sea-glass chip, Polished blank, Ground lens,
  Brass-ringed lens, Focus barrel, Signal reader.
  - The **Sea-glass chip** (`optic-0`) is a teal glass fragment, the nearest existing object to the
    Glass Shard.
- **Crystals.** The Echo Crucible's **Violet shard** (`flux-0`) is a violet crystal, and its higher
  parts are violet too.
- **Tideglass** is the world's material:
  - the ice-like cells a merge cracks open ("Tideglass", "Cracked tideglass");
  - the "Tideglass Vault";
  - the beacon's "crown of tideglass".
  - All of it is pale teal or cyan.
- **Family ids in use:** `rig`, `chart`, `rope`, `shell`, `lamp`, `optic`, `flux`. Nothing uses
  `glass`, so a new id would be free. None is registered. (The board's tideglass cells have the
  *type* `glass`, so a chain id such as `stainedglass` would avoid reading code that checks
  `type==='glass'`.)

## Issues found (to settle before registering ids)

1. **Tiers 1–2 read as cut gems, not glass.**
   - At board size the Shard and the Joined Glass look like a sapphire and an amethyst: thick, fully
     saturated, faceted, with no see-through, no thin edge and no flat pane.
   - That is the currency-gem look the brief wants to avoid (Coast Camp has no gem currency, but
     merge players expect one).
   - They are also the darkest items on the board: luma 62 and 67, where the darkest so far was the
     Captain's Logbook at 86 and most items are 115–170. In grayscale they turn near-black.
   - *Revise:* a thin, flat broken pane (shown edge-on for thickness), lighter where it is thin,
     with some see-through (the board tint behind it), a chipped or ground edge, and for tier 2 a
     lead or copper came along the join rather than a thick metal seam.
2. **Violet again means the Echo Crucible.**
   - The Joined Glass's violet half, and the Mosaic's violet centre, sit close to the Crucible's
     Violet shard in colour and, for the joined piece, in its faceted look.
   - This is the same finding as the Pearlcraft set.
   - Keeping the chain to blues with amber or gold accents (the Kiln's own warm light) would
     separate it.
3. **Names.**
   - "Coloured Glass **Shard**" vs the Crucible's "Violet **shard**".
   - "Glass" vs the Lens Bench's "Sea-**glass** chip" and the world's "Tide**glass**".
   - Players will meet "Tideglass" on every board as the cells to crack. An item called "glass" may
     read as related, and a "shard" as a piece of it.
   - *Options:* "Cobalt chip" or "Cobalt pane" for tier 1, "Leaded pane" for tier 2.
4. **The Sunwave Window's waves echo the story's wave seal.**
   - The seal on the letter, the Vault's orb and the archive's records is a wave.
   - A sun over stylised waves is a generic sea motif, so the overlap is lighter than the Captain's
     Logbook's emblem (Kite set). Still, a window often seen and delivered should not look like the
     seal.
   - The waves are curls, not the seal's single breaking wave, so this is for the director's eye
     rather than a clear conflict.
5. **Tideglass, ice and sea glass (good).**
   - The glass is saturated cobalt and violet (mean hue 232–242°), well apart from the teal of
     tideglass cells, the ice tint, the Sea-glass chip and the Tide token (172–173°).
   - Contrast with the cells is very high (ΔE 85–132 for tiers 1–3).
6. **The Mosaic and the Window stay distinct at 48 px** (a framed diamond against an arch). The
   Window's sun and waves still read at 48 px; at 45 px (360 viewport) only the arch and colours do,
   which is enough.

## The Glass Mosaic's size

- A diamond fills half its box. At the item target it covers 25.3 % of a cell, against 32.7–32.8 %
  for tiers 1–2 and 31.3 % for the Window, so it would look like the smallest tier.
- **Proposed `TARGET_OF['lamp-glass-mosaic']=.807`** (fit .880) at integration brings it to about
  31 %, level with the Window.
- The preview and the "after" strip use it. It is not written into `art-fit.mjs` in this pass,
  because the file is not on the board yet.

## Normalisation (measured as `tools/measure-art-fit.py` does: solid object at alpha ≥ 160)

| | Solid object in master | After the recipe | Board fit | Visible area of the cell | Brightness (luma) |
|---|---|---|---|---|---|
| Coloured Glass Shard | 0.907 | 0.917 | 0.795 | 0.328 | 62 |
| Joined Glass | 0.818 | 0.917 | 0.795 | 0.327 | 67 |
| Glass Mosaic | 0.919 | 0.917 | 0.880 (tuned) | ≈ 0.31 (0.253 untuned) | 95 |
| Sunwave Window | 0.933 | 0.911 | 0.825 | 0.313 | 142 |
| Existing Kiln (`lamp-0`…`4`) | — | — | — | 0.22–0.33 | 142–168 |

- **Lighting.** Bright rim highlights from the upper left, as on the board's icons.
- **Not darkened or lightened here.** The darkness of tiers 1–2 is the painting's (point 1); lifting
  it in code would only grey the blue.
- **Shadows.** Soft rims only; the board draws its own small drop shadow under every item.

## Previews

- `node tools/preview-proposed-art.cjs lamp OUT`. On the real board, on screen only:
  - row 1: the Lantern Kiln chain, tiers 0–4, the Lantern Kiln and the Sea-glass chip;
  - row 2: the four new items in order, beside the Crucible's Violet shard (drawn by the game), the
    Ground lens and the Tide token;
  - row 3: the four again, Joined Glass selected and the Mosaic marked as a merge target, beside the
    Brass-ringed lens, the Lens Bench and the Brass cog.
  - The rest of the board stays real, including its tideglass cells.
- Board cells: 44.8 px at 360, 49.1 at 390, 54.8 at 430 and 65.7 at 907×510.
- **Before/after at exactly 48 px** (`lamp-before-after-48px-x3`). Its rows are:
  - as received;
  - prepared;
  - prepared with the Mosaic untuned;
  - on the lower cell;
  - on an ice-tinted cell;
  - grayscale.
  - The Sea-glass chip, the Beacon lens and the Tide token are alongside.

## Checks actually run

- Masters compared byte-for-byte with the attachments (identical).
- Edge alpha, solid bounds, covered area at board fit, brightness, mean hue and saturation, and ΔE
  against the cells and the ice tint (Pillow).
- Board previews at 360/390/430/907×510 in Chromium on the real page, and the 48 px strip.
- `node --test tests/v5-next.test.mjs` (board-art test included) passes; the proposed folder is not
  measured.
