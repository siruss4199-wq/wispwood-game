# Vaultwake V5 Coast Camp — proposed Shell Trap secondary chain "Pearlcraft": art preparation (2026-10-29)

**Branch.** `claude/v5-rover-secondary-art`, with the Rover, Survey Kite and Rope Winch sets
(`docs/V5_ROVER_/KITE_/ROPE_SECONDARY_ART_2026-10-29.md`).

**Scope.** Art and an isolated preview only.
- No chain or id is registered.
- No drops, order requirements, energy, progression, saves, existing item ids or rules change.
- The files sit in `v5/assets/premium/coast/proposed/`, which the game does not load and
  `tools/measure-art-fit.py` does not read.
- The items are meant for future crew-order demand; drop rates, order rewards and energy wait for
  the gameplay pass.

## Tier mapping (identified by appearance)

| Tier | Proposed name | What it shows | Master (pixel-exact lossless WebP) | Board file (192 px, WebP q92) |
|---|---|---|---|---|
| 1 | Raw Pearl | one irregular (baroque) lavender pearl | `docs/art-source/shell-secondary-2026-10-29/raw-pearl-master.webp` | `v5/assets/premium/coast/proposed/shell-raw-pearl.webp` (12.6 KB) |
| 2 | Pearl Cluster | three loose round pearls, one cream and two lavender | `…/pearl-cluster-master.webp` | `…/shell-pearl-cluster.webp` (12.7 KB) |
| 3 | Pearl Bracelet | six lavender pearls on silver links with a clasp | `…/pearl-bracelet-master.webp` | `…/shell-pearl-bracelet.webp` (14.7 KB) |
| 4 | Pearl Brooch | five pearl petals in silver around a violet cabochon | `…/pearl-brooch-master.webp` | `…/shell-pearl-brooch.webp` (16.7 KB) |

- The masters are the attachments as received: 1254 px RGBA with real transparency, verified
  identical after lossless saving.
- Their silhouettes are complete; edge alpha is noise of value 0–1, which the recipe clears.
- All four are ordinary merge items: not generators, not a currency.
- The board icons are made with `tools/prepare-icon.py` (Build 45l recipe):
  - trim to alpha ≥ 8;
  - object at 92 %;
  - Lanczos to 192 px;
  - WebP q92.
  - Nothing is baked in.

## Existing Shell Trap chain and ids (inspected)

- **The Shell Trap chain** (family `shell`, tiers 0–5, book keys `shell0`…`shell5`): Sand dollar,
  Cockle shell, Conch, Pearl oyster, Nautilus, Coral crown. Its palette is warm sand, coral and peach.
- **Family ids in use:** `rig`, `chart`, `rope`, `shell`, `lamp`, `optic`, `flux`. Nothing uses
  `pearl`, so a new id would be free. None is registered.
- **Jewellery and pearls today:**
  - the **Pearl oyster** (`shell-3`) is an open shell with a white pearl in it;
  - the **Coral crown** (`shell-5`) is the chain's only other ornament.
  - There is no other jewellery and no pearl currency. Coast Camp's currencies are coins (gold) and
    Tide tokens (teal).

## Issues found (to settle before registering ids)

1. **Lavender and violet already mean the Echo Crucible.**
   - The Crucible's colour on the board is violet (`TAG.flux #ac83fa`), and its parts are violet:
     Violet shard, Loop cell, Resonator and on up.
   - All four pearls are lavender, and the brooch's centre is a violet cabochon close to the Violet
     shard.
   - In the preview they sit beside the Crucible's parts and read as one colour family. A Shell Trap
     secondary that looks like Crucible output weakens "which generator makes this".
   - *Options:*
     - whiter, cream-pink nacre with only a lavender sheen (classic pearl, closer to the Shell Trap's
       warm palette; mind the board contrast, point 4);
     - or keep lavender and rely on the producer tag planned for secondary items.
2. **The Raw Pearl reads more like a stone than a pearl at board size.**
   - Its irregular baroque shape and streaky, marbled iridescence survive at 48 px; the round,
     single-highlight read that says "pearl" does not.
   - Beside the Cluster's round pearls it looks like a lilac pebble.
   - *Revise:* a rounder baroque pearl with one clear specular highlight and a soft white core, or a
     pearl still sitting on a sliver of shell.
3. **"Pearl" already exists as Shell Trap tier 3.**
   - The Pearl oyster holds a white pearl, and its book entry and order lines say "pearl".
   - A "Raw Pearl" at secondary tier 1 implies the oyster's pearl is the same thing.
   - Naming could separate them ("Baroque pearl", "Pearl seed"); or the director accepts the link
     (the oyster is where pearls come from).
4. **Contrast (measured, good).**
   - Lavender stands well off the warm cells: ΔE 50–57 against #FFE2AC and #F3CC8D, and rims
     ΔE 45–58. That is well above the Kite paper (ΔE 10–20) and the Rope cloth (14–18).
   - Against the pale teal of ice cells it is ΔE 33–40.
   - Even the cream pearl in the Cluster is carried by its lavender neighbours.
5. **Bracelet.**
   - **Links:** at 48 px and 45 px (360 viewport) the silver links shrink to small grey dots between
     the pearls. The piece still reads as a bracelet or necklace of beads, and the clasp is a small
     bright mark.
   - **Weight:** it is an open ring, so it covers 18.7 % of a cell at the item target against
     33–34 % for the other three. Its outline is as large as theirs, so it does not look smaller,
     but it looks lighter.
   - **Shadow:** it carries a baked dark shadow (20 % of its pixels are soft and near black, against
     2 % for the other three). On the board it reads as depth under the pearls, not as a smudge.
   - No size tuning is proposed. Thicker links would help if it must read as chained.
6. **No confusion with Tideglass, ice or currency.**
   - Tideglass cells, the Sea-glass chip (`optic-0`), the Tide token and the ice tint are all teal
     and the pearls are lavender, so they stay apart in colour and in shape.
   - Merge games often use pearls or gems as a premium currency; Coast Camp has none, but if one is
     ever added, its icon should not be a pearl.

## Normalisation (measured as `tools/measure-art-fit.py` does: solid object at alpha ≥ 160)

| | Solid object in master | After the recipe | Board fit (item target) | Visible area of the cell | Brightness (luma) |
|---|---|---|---|---|---|
| Raw Pearl | 0.834 | 0.917 | 0.799 | 0.332 | 181 |
| Pearl Cluster | 0.823 | 0.917 | 0.794 | 0.335 | 176 |
| Pearl Bracelet | 0.869 | 0.896 | 0.843 | 0.187 (open ring) | 162 |
| Pearl Brooch | 0.869 | 0.917 | 0.789 | 0.338 | 157 |
| Existing Shell Trap (`shell-0`…`5`) | — | — | — | 0.25–0.40 | — |

- **Lighting.** The key light is upper left with soft specular highlights, matching the board's
  painted icons. Nothing was retoned.
- **Shadows.** Tiers 1, 2 and 4 have only soft rims. The board draws one small drop shadow under
  every item.

## Previews

- `node tools/preview-proposed-art.cjs shell OUT` (the tool now also draws game-rendered parts, such
  as the Crucible's, with the game's own `draw()`). On the real board, on screen only:
  - row 1: the Shell Trap chain, tiers 0–5, and the Shell Trap;
  - row 2: the four new items in order, beside the Violet shard, the Pearl oyster and the Tide token;
  - row 3: the four again, the Cluster selected and the Bracelet marked as a merge target, beside the
    Loop cell, the Resonator and the Sea-glass chip.
  - The rest of the board stays real (cargo, ice cells, the Rover).
- Board cells: 44.8 px at 360, 49.1 at 390, 54.8 at 430 and 65.7 at 907×510.
- **Before/after at exactly 48 px** (`shell-before-after-48px-x3`). Its rows are:
  - the attachments as received, sized by canvas;
  - the prepared icons on the light cell, on the lower cell and on an ice-tinted cell;
  - grayscale.
  - The Pearl oyster, Sea-glass chip and Tide token are alongside for comparison.

## Checks actually run

- Masters compared byte-for-byte with the attachments (identical).
- Edge alpha, solid bounds, covered area at board fit, brightness, soft-shadow share, and ΔE of the
  object and rim against the cells and the ice tint (Pillow).
- Board previews at 360/390/430/907×510 in Chromium on the real page, and the 48 px strip.
- `node --test tests/v5-next.test.mjs` (board-art test included) passes; the proposed folder is not
  measured.
