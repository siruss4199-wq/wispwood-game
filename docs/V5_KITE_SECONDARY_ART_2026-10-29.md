# Vaultwake V5 Coast Camp — proposed Survey Kite secondary chain "Expedition Records": art preparation (2026-10-29)

**Branch.** `claude/v5-rover-secondary-art` (with the Rover set, `docs/V5_ROVER_SECONDARY_ART_2026-10-29.md`).

**Scope.** Art and an isolated preview only.
- No chain is registered.
- No drops, order requirements, energy, progression, save keys or rules change.
- The files sit in `v5/assets/premium/coast/proposed/`, which the game does not load and
  `tools/measure-art-fit.py` does not read, so `art-bounds.mjs` is unchanged.
- Drop rates, bad-luck protection and order rewards come in the later gameplay pass, balanced
  together.

## Tier mapping (identified by appearance)

| Tier | Proposed name | What it shows | Master (pixel-exact lossless WebP) | Board file (192 px, WebP q92) |
|---|---|---|---|---|
| 1 | Note Fragment | narrow torn parchment, half a coral compass | `docs/art-source/kite-secondary-2026-10-29/note-fragment-master.webp` | `v5/assets/premium/coast/proposed/kite-note-fragment.webp` |
| 2 | Expedition Note | whole parchment page, coral clip, compass rose | `…/expedition-note-master.webp` | `…/kite-expedition-note.webp` |
| 3 | Travel Notebook | open burgundy notebook, dashed route to an X | `…/travel-notebook-master.webp` | `…/kite-travel-notebook.webp` |
| 4 | Captain's Logbook | closed burgundy book, gold wave emblem | `…/captains-logbook-master.webp` | `…/kite-captains-logbook.webp` |

- The four board files total 68 KB.
- The masters are the attachments as received: 1254 px RGBA with real transparency, verified
  identical after lossless saving.
- Their silhouettes are complete; the only alpha at the canvas edges is noise of value 1, which the
  recipe clears.
- All four are ordinary merge items: no generator, no unique story key, no baked tier label, badge
  or tile.

## Existing Survey Kite chain and IDs (inspected)

- **Kite chain** (family `chart`, tiers 0–7, book keys `chart0`…`chart7`): Ink scrap, Route fold,
  Sight lens, Survey scope, Bearing dial, Star chart, Horizon model, Sky atlas.
- **Family ids in use:** `rig`, `chart`, `rope`, `shell`, `lamp`, `optic`, `flux` (Coast Camp), and
  `rig`, `chart`, `flux` (Classic `core.mjs`).
- No Coast Camp code uses `note`, `log` or `records`. A new id (for example `records`) would be free,
  but none is registered in this pass.
- Existing items and saves are untouched.

## Conflicts to resolve before registering the chain

1. **Story (most important): the gold wave emblem on the Captain's Logbook is the story's mark.**
   - The wave seal closes the intro's unsigned letter (46q).
   - The Tide Archive says: "The same wave seal as on your letter, pressed into every cover." /
     "Then the letter and this archive belong together. Who sealed them is another question." (47d)
   - The Vault's orb carries a wave.
   - An ordinary item that every player merges again and again, carrying that seal and called a
     *Captain's* logbook, would make the seal common and hint at who sent the letter (a captain).
   - *Options:* a different emblem (a compass, a knot or a plain tooling), or keep the wave and
     treat the item as story, which the brief rules out.
2. **Story: logbooks are already story objects.**
   - The Observatory's survey desk: "Logbooks. Hundreds of them, all in the same hand." / "Read the
     last logbook" ("Array silent. Lenses sent to the bench…").
   - A mergeable "Captain's Logbook" beside them blurs story logbooks and order parts.
   - "Records" in the chain name echoes the archive's "sealed records" and the rejected Record Press
     direction.
3. **Visual overlap with the Kite's own tier 0.**
   - **Ink scrap** (`chart-0`) is painted as a parchment scroll map with a route and a pin. At 48 px
     it is the same material as Note Fragment and Expedition Note; it differs by its turquoise map
     against their coral compass.
   - **Route fold** (`chart-1`, a folded map with a route and a pin) shares the route idea with the
     Travel Notebook.
   - **Sky atlas** (`chart-7`, a stack of books under a globe) shares the closed-book shape with the
     Captain's Logbook. The globe tells it apart.
4. **The compass rose** on the two paper items echoes the compass drawn on the letter (story intro)
   and PR #80's "a compass and a crescent on every banner" (the fleet's mark, an open story
   question). It is a common map symbol, so this is a light overlap only.
5. **Names.**
   - "Expedition" is also the Rover's tier 7 ("Expedition crawler").
   - "Notebook" and "Logbook" sit next to the Collection **Book** (the 📖 Book button and the Home
     book icon); the open notebook looks like that emoji.
6. **Ivory paper against the board (measured).**
   - The paper bodies of the two parchment items are close to the cell colour (#FFE2AC, and #F3CC8D
     on the lower cells): ΔE 10–20.
   - Only their golden torn rims separate them (ΔE 24–35).
   - At 48 px and 45 px (360 viewport) the Note Fragment is the faintest item on the board; in
     grayscale it all but disappears except for its rim.
   - Tested in scratch only: darker tones (gamma 1.2 and 1.4) help little and make the paper look
     dirty, so the files keep their painted tone.
   - *Fix in the art:* an older, warmer parchment value, or a stronger dark edge on tiers 1–2.

## Normalisation (measured as `tools/measure-art-fit.py` does: solid object at alpha ≥ 160)

| | Solid object in master | After the recipe | Board fit (item target .72–.80) | Visible area of the cell | Brightness (luma) |
|---|---|---|---|---|---|
| Note Fragment | 0.758 | 0.917 | 0.799 | 0.25 | 189 |
| Expedition Note | 0.817 | 0.917 | 0.795 | 0.32 | 187 |
| Travel Notebook | 0.945 | 0.917 | 0.818 | 0.30 | 172 |
| Captain's Logbook | 0.868 | 0.917 | 0.790 | 0.35 | 86 |
| Existing Kite (`chart-0`…`7`) | 0.906–0.911 | — | 0.800–0.828 | 0.24–0.39 | 120–166 |

- **Size.**
  - The same `tools/prepare-icon.py` recipe as the Rover set and earlier art (Build 45l):
    - trim to alpha ≥ 8;
    - object at 92 %;
    - Lanczos to 192 px;
    - WebP q92.
  - The board's own per-sprite fit then sets each item's longest visible side.
  - Visible size was checked by covered area, not only by canvas. The thin, diagonal Note Fragment
    covers 25 % of its cell at board size, inside the existing Kite range (24–39 %: the Survey
    scope is 24 %), so it needs no special scaling.
  - Area grows with the tiers (25 → 32 → 30 → 35 %).
- **Lighting.** The key light is upper left with warm rim highlights, as on the board's painted
  icons.
  - Brightness follows the material: the parchment (187–189) is brighter than any Kite part, and the
    burgundy leather (86) darker.
  - Neither was changed. Darkening the paper loses more contrast with the cells than it gains (point
    6), and the logbook's weight is its silhouette.
- **Shadows.** Only a soft rim, no baked ground shadow, as on existing icons. The board draws the
  same small drop shadow under every item.
- **Silhouettes.** The four stay distinct (fragment, page, open book, closed book) in colour and in
  grayscale at 48 px.

## Preview

`node tools/preview-proposed-art.cjs kite OUT` (now takes `rover` or `kite`) opens the real page and,
on screen only, draws:
- row 1: the Kite chain, tiers 0–6;
- row 2: the four new items beside Ink scrap, Sky atlas and the Survey Kite;
- row 3: the four again, the Expedition Note selected and the Travel Notebook marked as a merge
  target, beside Route fold, the Tide token and the canvas cargo.

The cells are picked by where they stand once the board has settled (the first Rover preview was off
by one cell because the board briefly lays out six columns at load).

Board cells measured 44.8 px at 360, 49.1 px at 390, 54.8 px at 430 and 65.7 px at 907×510. A strip
at exactly 48 px was rendered on both cell colours and in grayscale.

## Gameplay intent (recorded, not implemented)

The chain is meant to supply items for crew orders, including mixed and larger ones; it is not
collection-only.
- Discovery is already kept apart from the items: found parts stay in the save's `found` list and the
  collection book after an item is delivered.
- A new chain would add its keys there in the same way when it is registered.

## Checks actually run

- Masters re-read and compared byte-for-byte with the attachments (identical).
- Edge alpha, solid bounds, covered area, brightness and ΔE against the cell colours (Pillow).
- Board previews at 360/390/430/907×510 in Chromium on the real page; a 48 px strip on both cell
  colours and in grayscale; a paper-tone test (scratch only).
- `node --test tests/v5-next.test.mjs`, including the board-art test, after the files were added:
  it passes, and the proposed folder is not measured.
