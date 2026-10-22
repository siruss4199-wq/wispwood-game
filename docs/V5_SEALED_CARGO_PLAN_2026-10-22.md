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
