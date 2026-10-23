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

**Place stages (builds 38–39).** `render-places.html` draws every Landing Beach place in three stages
(`render-shot.cjs workshop1 … cliff3`: workshop, pier, beacon, path, tent, mast, cliff × 1–3). Each
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

Painted art from `docs/V5_COAST_ART_BRIEF_2026-10-23.md` can replace any file with the same name.
