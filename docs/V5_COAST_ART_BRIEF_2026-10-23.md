# Coast Camp — art brief for 3D-style icons (2026-10-23)

**Why:** the user, comparing the board's crates with the painted parts: "Bur undur tuvshinii 3D
designtai baij chadahgui yu, ungulug ss dehi itemuudtaigaa neg tuvshinii icontoi baimaar
baina." Only a few objects have painted 3D art (Copper offcut, Grip tool, Split spanner,
Pocket winch, Ink scrap, Route fold, Survey scope, Survey Kite, the scenes). Everything else is
flat SVG. This session has no image-generation tool, so the art has to be made elsewhere
(e.g. ChatGPT image generation) from this brief; Claude then converts and wires it in.

## How to deliver
- One object per image, **transparent background PNG**, square, 1024×1024 or larger, object
  filling ~80% of the frame, small soft contact shadow only.
- Name each file exactly as in the tables (e.g. `cargo-crate.png`) and upload them in the chat
  (or add them to `v5/assets/premium/coast/`). Claude makes 192 px WebP runtime copies
  (quality 88, alpha kept), keeps the masters, and maps them in `v5/next/chains.mjs`.
- The game adds its own "?" mark, key badge, level plate, pips and glass on top: **no text,
  numbers, badges or frames in the images.**

## Style (paste before every prompt)
> One isolated original Vaultwake collectible for a mobile merge game. Premium casual
> art-directed 3D illustration, like a soft clay-and-metal toy render. Three-quarter overhead
> camera at about 35 degrees, soft upper-left key light and cool fill, strong simple shapes that
> read clearly at 48 pixels, satin materials with restrained wear. Palette: warm copper-orange,
> silver edges, petrol-teal accents, driftwood browns, sea-glass teal. Genuine transparent
> background, small soft contact shadow. No text, logos, numbers, pedestal, card, frame, heavy
> outlines or flat vector rendering.

## Batch 1 — what a new player sees in the first 15 minutes (17 images)
| File | Object (add after the style text) |
|---|---|
| `cargo-crate.png` | A sealed wooden shipping crate, weathered driftwood planks, iron corner straps, lid nailed shut, slightly chunky proportions. |
| `cargo-bundle.png` | A sealed cargo bundle wrapped in teal waxed canvas, tied with two thick hemp ropes and a knot on top, soft rounded shape. |
| `cargo-barrel.png` | A sealed wooden barrel, reddish-brown staves, two dark iron hoops, closed lid, short and stout. |
| `cargo-basket.png` | A closed wicker basket with a woven lid and rope handles, honey-coloured weave. |
| `driftwood-crate.png` | A small open driftwood crate with a few copper parts peeking out, friendly and light. |
| `sea-chest.png` | A sea chest with a domed lid, teal-painted wood, brass corners and a brass latch, closed. |
| `captains-trunk.png` | A large captain's trunk, dark red leather and wood, gold-brass trim and lock, slightly glowing seams. |
| `rivet-rover.png` | Rivet Rover generator: a small chunky orange-red tracked work vehicle with a teal windscreen, a brass tool rack on top, cute but not a character (no face). |
| `tide-token.png` | Tide token: a thick round sea-glass coin, teal, with two curved arrows (one teal, one orange) chasing each other embossed on it. |
| `brass-cog.png` | Brass cog: a chunky brass gear with a green up-arrow inlay in the centre. |
| `coin.png` | A thick gold coin with a raised rim and a small shell emboss, warm shine. |
| `energy-jar.png` | A glass jar with a cork, filled with glowing yellow-orange energy and a small lightning mark inside the glow (not text). |
| `sight-lens.png` | Sight lens (Survey Kite chain, tier 3): a brass-framed round lens on a short teal handle. |
| `place-path.png` | Landing path: a short curving stone path with a few planks, top-down three-quarter view. |
| `place-tent.png` | Camp tent: a sturdy canvas expedition tent, cream with teal trim, a lantern by the door. |
| `place-mast.png` | Signal mast: a wooden mast with a small lookout nest and two coloured pennants. |
| `place-pier.png` | Supply pier: a short wooden pier on posts with a coil of rope and a crate on it. |

## Batch 2 — the rest of Landing Beach and the next generators
| File | Object |
|---|---|
| `place-beacon.png` | Beacon: a stone tower top with a brass fire basket glowing warm orange. |
| `place-cliff.png` | Cliff path: a carved stone stair climbing a pale cliff edge with rope rails. |
| `rope-winch.png` | Rope Winch generator: a wooden-and-copper hand winch on a sturdy base with a big rope drum and a crank. |
| `shell-trap.png` | Shell Trap generator: a woven fishing trap of wicker and rope with shells caught in it. |
| `lantern-kiln.png` | Lantern Kiln generator: a small brick-and-copper kiln with a glowing hatch and a chimney. |
| `crawler-jack.png`, `bridge-rig.png`, `dune-hauler.png`, `expedition-crawler.png` | Rover chain tiers 4–7: a compact jack on treads; a small portable bridge rig; a desert hauler truck; a large expedition crawler. Each bigger and more polished than the last, same copper/teal materials. |
| `bearing-dial.png`, `star-chart.png`, `horizon-model.png`, `sky-atlas.png` | Kite chain tiers 4–7: a brass bearing compass dial; a rolled star chart with a ribbon; a brass horizon/orrery model; a thick leather sky atlas with brass corners. |
| `frayed-twine.png`, `rope-coil.png`, `fishing-net.png`, `pulley-block.png`, `rope-ladder.png`, `cargo-hoist.png` | Rope chain tiers 0–5. |
| `sand-dollar.png`, `cockle-shell.png`, `conch.png`, `pearl-oyster.png`, `nautilus.png`, `coral-crown.png` | Shell chain tiers 0–5. |
| `candle-stub.png`, `tin-lantern.png`, `storm-lantern.png`, `signal-lamp.png`, `beacon-lens.png` | Lamp chain tiers 0–4. |

## Quality check (before Claude wires them in)
Look at each at real size (48 px) next to the Split spanner and Copper offcut: same camera,
same light from the upper left, same satin finish, no text, transparent background. A chain's
tiers should grow in size and richness from one to the next.

## Build 26 — shaded SVG in the meantime (user: "chi uuruu saijruulaad bai")
Until painted art arrives, Coast Camp's own objects are redrawn as shaded "toy render" SVGs
in `v5/next/coast-art.mjs`: three-quarter view, light from the upper left, darker right
faces, rim highlights, gloss and a soft contact shadow. Redrawn: the four cargo looks
(wooden crate, canvas bundle, barrel, wicker basket), the three crates (open driftwood
crate with parts, teal sea chest, red captain's trunk with glowing seam), the Tide token
and the Brass cog. Painted WebP files named as in the tables above can replace any of them.
