# Vaultwake V5 Coast Camp — proposed Rivet Rover secondary chain: art preparation (2026-10-29)

**Branch.** `claude/v5-rover-secondary-art`, from `claude/v5-ch12-visual-qa` at `b34a2b9`.

**Scope.** Art only.
- No drop, order requirement, energy, progression, save or rule change.
- The game does not load these files: `v5/assets/premium/coast/proposed/` is outside the icon folder
  that `chains.mjs` and `tools/measure-art-fit.py` read, so `art-bounds.mjs` is unchanged.
- Integration waits for the secondary-chain measurements (`docs/V5_SECONDARY_CHAINS_PLAN_2026-10-28.md`):
  drop rates, bad-luck protection, order rewards and energy cost, measured together.

## The chain as proposed

| Tier | Proposed name | Master (as received, pixel-exact lossless WebP) | Board file (192 px, WebP q92) |
|---|---|---|---|
| 1 | Bolt | `docs/art-source/rover-secondary-2026-10-29/bolt-master.webp` | `v5/assets/premium/coast/proposed/rover-bolt.webp` (11.7 KB) |
| 2 | Gear | `…/gear-master.webp` | `…/rover-gear.webp` (16.0 KB) |
| 3 | Gear Assembly | `…/gear-assembly-master.webp` | `…/rover-gear-assembly.webp` (13.8 KB) |
| 4 | Hand-crank Mechanism | `…/hand-crank-master.webp` | `…/rover-hand-crank.webp` (13.1 KB) |

The Hand-crank Mechanism is the chain's last, mergeable-into collectible, **not** a generator.

**How the files were made.** `tools/prepare-icon.py`, the Build 45l recipe the Rover tools and the
cargo crate used:
- clear alpha noise (≤ 3);
- trim to alpha ≥ 8;
- square canvas with the object at 92 %;
- Lanczos to 192 px;
- WebP q92.

**Masters.**
- The four attachments were 1254 px RGBA PNGs with real transparency.
- They are stored as lossless WebP with exact pixels (verified identical, 3.1 MB instead of 6.7 MB).
- **Full silhouettes:** nothing is cut at the canvas edges. The only alpha touching an edge is noise
  of value 1, which the recipe clears.

## Normalisation (measured as `tools/measure-art-fit.py` does: solid object at alpha ≥ 160)

| | Solid object in master | After the recipe | Board fit (item target .72–.80) | Solid brightness (luma) |
|---|---|---|---|---|
| Bolt | 0.777 of canvas | 0.917 | 0.824 | 123 |
| Gear | 0.844 | 0.917 | 0.798 | 156 |
| Gear Assembly | 0.852 | 0.885 | 0.840 | 118 |
| Hand-crank | 0.872 | 0.911 | 0.818 | 104 → **113** (gamma 0.86 on colour only) |
| Existing Rover parts and Rover | 0.906–0.953 | — | 0.776–0.856 | 113–145 |

- **Size.** The masters filled 78–87 % of their canvas; the existing board art fills about 91–95 %.
  After the recipe, the board's own per-sprite fit (`art-fit.mjs`) gives all four the same visible
  size as other items: 72–80 % of the cell on their longest side.
- **Lighting.** All four are lit from the upper left with soft rim highlights, like the existing
  painted icons.
  - The Hand-crank was darker than every Rover sprite (104). A gentle gamma on its colour, with
    alpha untouched and the master kept as received, brings it to 113, the Rover generator's
    level.
  - The Gear (156) is as bright as the existing steel-and-brass Brass cog (159), so it was left.
- **Shadows.** The masters have only a soft dark rim (7–12 % soft pixels against 3–17 % in existing
  icons) and no baked ground shadow, like the existing icons. The board draws one uniform drop
  shadow under every item (`coastal.css`), so none was added.

## Preview

`tools/preview-proposed-art.cjs` opens the real page with a test camp. In the browser only, it puts
the four into board cells with the board's own fit:
- row 1: the Rover chain;
- row 2: the proposed chain beside the Brass cog, the Pocket winch and the Rover;
- row 3: the chain again, one selected and one marked as a merge target.

Board cells measured 44.8 px at 360, 49.1 px at 390, 54.8 px at 430 and 65.7 px at 907×510. A strip
at exactly 48 px, in colour and grayscale, was rendered the same way.

## Inconsistencies to resolve before integrating

1. **The Gear and the Brass cog share a silhouette.**
   - The Brass cog is an existing booster that players drop on a generator to level it. Both are a
     ten-tooth gear in the same three-quarter view.
   - At 48 px they differ only in colour (steel with a coral hub, against brass with a teal anchor),
     and in grayscale they are nearly identical.
   - The names clash too ("Gear" and "cog").
   - A player may try to feed the Gear to a generator.
   - *Options for the director:* a clearly different tier-2 shape (for example a gear on a shaft, or
     a sprocket with spokes cut through); or a name that does not mean "cog". Not changed here.
2. **Gear Assembly (tier 3) and Hand-crank (tier 4) read alike, and tier 4 looks the smaller step.**
   - Both are a navy base, grey gear and coral hub.
   - The crank has one gear where the assembly has two; its handle is the only new element, and it
     is small at 48 px.
   - Merging up should look like gaining something. *Options:* give the tier-4 piece more mass or a
     distinct read (for example the crank with both gears, a flywheel, or a brass housing); or swap
     the order of tiers 3 and 4.
3. **The Hand-crank sits close to existing cranks.**
   - The Rover's own tier 3, the **Pocket winch**, is a drum with a crank handle on a frame.
   - The **Rope Winch** generator is a drum with a crank lever and a red knob.
   - In colour the new one stands apart (navy against orange and wood), but its silhouette family is
     shared. A machine on a base can also read as something to tap. It is a collectible, so its info
     panel must say "Top of its chain", as other final parts do.
4. **Names.**
   - "Bolt" is free.
   - "Gear" clashes with "Brass cog" (point 1).
   - "Hand-crank Mechanism" overlaps "Pocket winch" in meaning, and it is long for the board's info
     line and the order cards. Nothing else in the game uses "Assembly".
5. **Palette (consistent).** Steel, coral and navy match the Rover's current tools: the coral-handled
   Grip tool and the blue-handled Split spanner. The family reads together.
6. **Story (no overlap).** Nothing in the four points at the letter, the beacon or the Hidden Harbour.

## Not done in this pass (by request)

- No drops are active.
- No order may ask for these parts.
- No energy, progression or save change.
- The chain is not in `chains.mjs`, the collection book or `art-bounds.mjs`.
- Integration will add the chain's measurements with `tools/measure-art-fit.py`, once the files move
  into the icon folder.
