# Coast Camp — sealed cargo and the generator tree (2026-10-22)

**Status:** approved ("A", after "board neg generatoroos ehleed busad zai nilenhuudee
hairtsagtai nuutslagdmal maygtai ehluulmeer baina, tendeesee shine generatoruud
nemegdej yavdag, board bas hurdan telj zadardaggui baih").
**Replaces:** the tide (build 4) and generators with several chains (build 3).
The user: one generator making two chains does not work; generators should grow from
each other; the board should start with one generator and mysterious boxes, and open slowly.

## The board
- Start: Rivet Rover and its small dry camp (nine cells, five parts, three spaces).
  Every other cell holds **sealed cargo**: a crate whose contents are hidden ("?").
  Cargo holding a generator glows faintly.
- **Each cargo shows its key**: one part (e.g. a Grip tool). Drag that part onto it, or
  tap the part and then the cargo, and the cargo opens; the part is used up. Keys are
  small orders on the board, so the board opens one deliberate step at a time.
- Keys get harder away from the camp: Rover parts (tier 0–1) next to it, then tier-2
  parts and Kite parts, then rope and shell parts.
- Contents (mystery): parts, crates (free parts), energy (+5), star pouches (+2 to +4 ★)
  and **new generators**. Energy and stars leave the space free; the rest stay on it.

## One generator, one chain; generators grow from each other
| Generator | Chain | Found in cargo opened with |
|---|---|---|
| Rivet Rover | Fieldworks parts | (start) |
| Survey Kite | Wayfinding | a Split spanner (Rover) |
| Rope Winch | Rope | a Sight lens (Kite) |
| Shell Trap | Shells | a Fishing net (Rope) |
| Lantern Kiln | Lamps | a Pulley block (Rope) |
Each new generator is opened with a part from the one before, so every generator stays
useful. Echo Crucible joins in the next area. Orders draw on every generator you have.
Generator levels (fed a Captain's trunk) lift output tiers as before; they no longer add chains.

## Restorations
Stars still restore Landing Beach place by place, with the picture and story lines.
They no longer open the board; each gives a reward: path → driftwood crate, tent →
+10 energy, signal mast → fourth order card, Workshop → Rivet Rover +1 level, supply
pier → sea chest for your newest generator, beacon → +15 energy, cliff path → area done.

## Saves
Coast Camp save version 3. A build-4 save (tide) loads with its water cells turned
into sealed cargo holding the same find, keyed by distance; build-3 saves go through
the build-4 step first. Generators already on the board stay. Classic saves untouched.

## Checks
Scripted player: first restoration within ~1 minute, all four new generators found and
Landing Beach restored in 20–30 minutes at 5–6 s per action, board still partly
sealed at the end, energy felt. Unit tests for keys, contents, generator tree and
saves; browser walkthrough at 360/390/430 px. Build 5 label and test link.

## Built (build 5, 2026-10-22)
- `v5/next/game.mjs`: `cargo` cells (`CARGO` layout: key and find per cell), `unseal`
  (also any merge or drag of the key onto the cargo), finds: parts, crates, energy +5,
  star pouches +2–4, generators. Save version 3 with `upgrade()` from versions 1–2.
- `v5/next/chains.mjs`: one chain per generator; Rope Winch, Shell Trap and Lantern Kiln
  drawn in SVG; the crate drawing with its key pinned to the corner.
- Keys: Survey Kite's cargo opens with a Grip tool (it was a Split spanner; the Kite
  then came at 8–10 minutes). Landing Beach costs lowered to 4·6·8·10·13·16·20 ★, as
  cargo keys now take part of the energy.
- Scripted player (5–6 s per action): Survey Kite at ~3.5 min, Rope Winch ~9–10,
  Shell Trap ~13–14, Lantern Kiln ~17–20, Landing Beach restored in 22–27 min, 9–13 of
  40 cargo still sealed, energy 16–19 at the end, no waiting.
- UI: crates you can open now pulse their key; generator cargo glows; tapping a crate
  says what opens it and who makes that part; a new generator shows its whole chain.

## Slower opening (build 6, user: "Sul bainaa deerees ni hurdan zadarch telj baina")
In build 5 the top half of the board was open by the fourth restoration: keys next
to the camp were Copper offcuts and Grip tools, and any crate could be opened anywhere.
- Only cargo touching open ground (an orthogonal neighbour that is not cargo) can be
  opened (`reachable`). Deeper crates are darker and keep even their key hidden; when a
  crate opens, the keys of the crates behind it pop into view.
- Keys one tier harder: Grip tools and Split spanners next to the camp (the Survey Kite
  still opens with a Grip tool), tier 3 further out, a Beacon lens in the far corner.
- Shell Trap's cargo moved from cell 28 to 22 so it is reached during Landing Beach.
- Level chest back to +10 energy (more keys to make).
- Scripted player, 5–6 s per action: 7 crates open by the Workshop (was ~24), Survey
  Kite ~3 min, Rope Winch ~11–13, Shell Trap ~13–16, Lantern Kiln ~20–24, Landing Beach
  in 23–28 min, 22 of 40 crates still sealed at the end, energy ~15, no waiting.
- Also fixed: the hint read "Restore Restore the Coastal Workshop".

## Build 7 (user: "2dahi generator shuud garaad irlee")
The Survey Kite's cargo sat at the camp edge (cell 3) and opened with the first Grip
tool. It now sits one crate in (cell 10, still a Grip tool): open a crate beside the
camp first (cell 9 with a Split spanner, or cells 3 then 4 with Grip tools). Cell 3
holds +5 energy instead. Scripted player: Kite at ~3.5–4 min after two crates, Rope
Winch ~11–13, Shell Trap ~16–19, Lantern Kiln ~20–24, Landing Beach 23–28 min, 18
crates still sealed. A Split-spanner key on the Kite pushed it to 10–13 minutes and
left the shells and lamps unfound, so the Grip tool stays.

## Build 8 — generators grow by merging (user: "generatoriig uuriig ni merge hiij hugjuulj yavdag")
- Generators move and merge like parts: two of the same kind and level make the next
  level (up to 5; `generatorsMerge`). Feeding a Captain's trunk to a generator is gone;
  crates only give parts.
- Copies to merge: cargo holds two more Rivet Rovers, two more Survey Kites, a second
  Rope Winch and a second Shell Trap (glowing like any generator cargo); the Workshop
  restoration now gives a second Rivet Rover; level chests at 5, 7, 9 … give a copy of
  a generator you have instead of a crate.
- Taps choose the generator tapped (`produce` takes an index). Tapping a generator and
  then an identical one merges them; dragging works too.
- The Survey Kite cargo moved again, two crates in from the camp (cell 16), since a
  determined player still opened it within a minute at cell 10.
- Scripted "curious" player (works toward the glowing crates): second Rover ~3.5 min,
  Survey Kite ~5 min, Rope Winch ~13, Shell Trap ~20, Lantern Kiln ~23; Landing Beach
  in 25–30 min, energy ~18 at the end. Level chest +7 energy. Costs 4·6·8·10·13·14·17 ★.

## Build 9 — tideglass (user, after a reference board: "the second generator, once it can open, goes merging onto half-buried items"; "Ok bulagdsaniig ni arai uur zuiliin designaar orluulay")
- Half-buried items are done our own way: a part **locked in tideglass** (a faceted
  sea-green shard over it). Merge a free twin onto it: the glass breaks and the part
  comes free one tier up. Nine glass cells, near the generator that makes each part:
  a Grip tool beside the camp (to teach it), Kite parts by the Kite, rope by the Rope
  Winch, shells by the Shell Trap, lamps by the Lantern Kiln. A new generator has work
  waiting at once.
- Glass is not open ground: cargo behind it stays sealed until it breaks.
- Generators spaced apart so they come one at a time: Survey Kite (cell 16, Grip
  tool), Rope Winch (30, Survey scope), Shell Trap (39, Pulley block), Lantern Kiln (46,
  Pearl oyster). Copies: Rovers at 20 and 31, Kites at 26 and 43, a Rope Winch at 35, a
  Shell Trap at 41. Level chest +5 energy.
- Scripted player, 5–6 s per action: Survey Kite ~3.5 min, Rope Winch 7–8, Shell Trap
  12–15, the Lantern Kiln left for after Landing Beach; Landing Beach 20–25 min, energy
  ~20 at the end; all nine glass cells broken.
