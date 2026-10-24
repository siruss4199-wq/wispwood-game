# Coast Camp rendered art (build 27)

The user asked for icons "on a par" with the painted Fieldworks parts; no image-generation
tool was available, so these are real 3D renders made here: a ray-marched signed-distance
scene in WebGL (`render.html`), soft upper-left key light, sky and bounce fill, soft
shadows, ambient occlusion, specular and a darkened rim, with a contact shadow on a
transparent background.

Render: serve nothing, just run from this folder
`NODE_OPTIONS=... node render-shot.cjs barrel crate chest bundle basket opencrate trunk token cog`
(Playwright Chromium, `--use-gl=swiftshader`), then crop to the alpha box plus 8 %, and
export 192 px WebP (quality 88, alpha 100) with the names below.

| File | Object |
|---|---|
| cargo-crate, cargo-bundle, cargo-barrel, cargo-basket | sealed cargo (Rover, Kite, Rope Winch, later chains) |
| driftwood-crate, sea-chest, captains-trunk | crates, sizes 1–3 |
| tide-token, brass-cog | Tide token, Brass cog |

**Place stages (builds 38–40).** `render-places.html` draws every place of Landing Beach and the Survey
Worksite in three stages (`render-shot.cjs workshop1 … cliff3 wscamp1 … wsdoor3`). Each
place's three renders are cropped to the union of their alpha boxes plus 16 px (so the stages line
up), then exported at 256 px WebP (quality 88).

| File | Stage |
|---|---|
| place-workshop-1, -2, -3 | timber workshop · + chimney with fire and anvil · + parts store lean-to, crates, sign |
| place-pier-1, -2, -3 | pier on pilings · + cargo crane · + moored supply boat |
| place-beacon-1, -2, -3 | stone beacon with fire · + brass mirrors · + tideglass crown |
| place-path-1, -2, -3 | sand path lined with stones · + boardwalk · + lantern posts |
| place-tent-1, -2, -3 | striped camp tent · + stove and bedrolls · + mess awning with table and benches |
| place-mast-1, -2, -3 | signal mast with a pennant · + strings of flags · + lookout nest with a spyglass |
| place-cliff-1, -2, -3 | steps cut into the cliff · + rope hand rail · + stone cliff gate, open |
| place-ws-camp-1, -2, -3 | ochre survey tent · + stacked instrument crates · + drafting table with a lamp |
| place-ws-scope-1, -2, -3 | theodolite on a tripod · + survey poles and marked lines · + chart on an easel |
| place-ws-ropes-1, -2, -3 | coiled hauling rope · + rope reel · + rope store rack under a roof |
| place-ws-steps-1, -2, -3 | steps cut between boulders · + hand ropes · + paved floor |
| place-ws-pool-1, -2, -3 | tide pool ringed with stones, shells · + sieve and a bucket of shells · + stone wall |
| place-ws-hoist-1, -2, -3 | A-frame hoist with a pulley and crate · + brass gears and crank · + cable with a bucket |
| place-ws-door-1, -2, -3 | survey scaffold with a ladder · + lantern posts · + chart of the dial on an easel |

Painted art from `docs/V5_COAST_ART_BRIEF_2026-10-23.md` can replace any file with the same name.

**Rope Winch, Shell Trap and Lantern Kiln (build 41k).** `render-parts.html` draws the three generators
and their 17 parts in the same light and grading (`render-shot.cjs twine coil … genlamp`). Each render
is framed on the object's opaque pixels (side 1.12 × the larger dimension, the soft shadow faded out
over the last 6 % of the frame), then exported at 192 px WebP (quality 88). They replace the flat SVG
shapes in `v5/next/chains.mjs` (kept as the fallback for other chains).

| File | Object |
|---|---|
| gen-rope, gen-shell, gen-lamp | rope drum with crank in a wooden frame · wicker trap with shells and a float · stone kiln with a glowing mouth |
| part-rope-0 … 5 | frayed twine · rope coil · fishing net with cork floats · pulley block · rope ladder · cargo hoist with a crate |
| part-shell-0 … 5 | sand dollar · cockle shell · conch · pearl oyster · nautilus · coral crown |
| part-lamp-0 … 4 | candle stub on a dish · tin lantern · storm lantern · signal lamp · beacon lens |

**Painted icons (build 41l).** The user supplied a painted sheet of all 47 objects; `icons/` holds each one
cut out (the sheet colour and the soft shadow made transparent by a flood fill from the cell's edge, large
enclosed holes cleared, stray specks dropped, a one-pixel unmixed edge), framed square on the object and
saved at 192 px WebP. They replace the 3D renders of build 41k (removed) and the crate, cargo, token and
cog renders above for items on the board; place stages still use the renders.

| Files | Objects |
|---|---|
| gen-rig, gen-chart, gen-rope, gen-shell, gen-lamp | Rivet Rover (drill crawler), Survey Kite, Rope Winch, Shell Trap, Lantern Kiln |
| rig-4 … 7 | crawler jack · bridge rig · dune hauler · expedition crawler (rig 0–3 keep the original painted Fieldworks art, `../copper-offcut-vibrant.webp` etc.) |
| chart-0 … 7 | ink scrap · route fold · sight lens · survey scope · bearing dial · star chart · horizon model · sky atlas |
| rope-0 … 5, shell-0 … 5, lamp-0 … 4 | as in build 41k |
| cargo-crate, cargo-bundle, cargo-barrel, cargo-basket, driftwood-crate, sea-chest, captains-trunk, tide-token, brass-cog | cargo, crates 1–3, Tide token, Brass cog |
