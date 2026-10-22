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

## Build 10 — centre camp, well-merged keys, harder tasks (user: "Hairtsaguudiig nileen merge hiisen level undur itemaar neey, tegeed generatoroo tuvruugee oruulay, taskuud het amar baigaad baina")
- **Rivet Rover in the middle.** The camp is the 3×3 square at the centre of the 7×7
  board (cells 14–16, 20–22, 26–28; the Rover on 21). Cargo and tideglass fill the two
  rings around it: 30 crates and 10 glass cells. Nine crates touch the camp at the start.
- **Keys need well-merged parts.** Next to the camp: Pocket winches (Rover tier 3) and Survey
  scopes (Kite tier 3); one crate straight above the Rover opens with a Split spanner (tier 2) to teach it. The
  outer ring wants tier 3–4 parts of every chain. The Survey Kite sits in a corner behind
  a crate (or the Split-spanner glass beside it) and opens with a Crawler jack (tier 4).
  Crates that cost more pay more: energy +10/+18, star pouches +3 to +10.
- **Harder tasks.** Orders ask for tier 2 and up from level 3, the top tier climbs every
  fourth level, pairs and two-part orders are common; tier 3+ pays more (★ 1·1·2·5·9·16).
  Landing Beach costs 6·10·14·18·21·24·26 ★ (was 4·6·8·10·13·14·17). Level chest +10 energy,
  start 50 energy.
- Scripted players, 4–6 s per action: a curious player (goes for each new generator after
  two orders) finds the Survey Kite at 5–8 min, Rope Winch 14–21, Shell Trap 17–26,
  Lantern Kiln 22–34, and restores Landing Beach in 35–49 min (442–489 actions, was ~175),
  energy 0–11 at the end; an order-only player takes 18–27 min with Rivet Rover alone.
- Saves: no shape change (still version 3). A build-9 camp keeps its own board; only new
  camps get the centre layout.

## Build 11 — tideglass cracks from merges beside it (user: "Hairtsag mus 2 neeh yalgaa alga, zugeer l design uur bolhoos neg uuregtei baina")
Cargo and tideglass both opened by laying one particular part on them. They now work
differently:
- **Cargo** (unchanged): a deliberate job. It shows the part it wants; lay that part on
  it and it is used up; what is inside is a surprise.
- **Tideglass**: takes no part. Every merge (parts, crates or generators) in a space
  beside it cracks it; the second breaks it and the part inside is free as it is, nothing
  used up (`GLASS_HITS`=2, `crack()` in `v5/next/game.mjs`). Where you merge now matters,
  and glass opens by itself as you work near it. Laying a part on glass is refused.
- Glass contents: the three beside the camp stay (Split spanner, Route fold, Rope coil);
  the outer seven are one tier higher than in build 9, since they no longer turn a twin
  into the next tier. Cracked glass shows dark crack lines; a crack shakes it.
- Saves: glass may carry `cracks` (0–1); build-9/10 glass without it loads as uncracked.
- Scripted player (now merges beside glass when it can): the camp's three glass cells
  break in the first 1–3 minutes, the outer ones as the board opens (7 of 10 broken by
  the end); Landing Beach in 35–49 min at 4–6 s per action as in build 10.

## Build 12 — the more useful the find, the harder the key; Brass cogs (user: "Hairtsagnaas mash heregtei zuiliig hetsuu neey, jishee ni shine generator ch yumuu. Bas generator ahiulagch baij bolno, energy mungu ch yumuu")
- **Key by value.** In each ring, crates holding a generator or a Brass cog need a
  higher part than any crate with energy, stars, parts or a crate (unit-tested):
  - next to the camp: everyday finds open with tier 3 (one tier-2 teaching crate);
    Survey Kite and a cog with a Crawler jack (tier 4); the second Rivet Rover and the
    Rope Winch with tier 4–5;
  - at the edge: everyday finds tier 3–4; Shell Trap, Lantern Kiln, a Kite copy and two
    cogs tier 4; the Rope Winch and Rivet Rover copies tier 5.
- **Brass cog** (new find, approved by the user as a "generator upgrader"): three in
  cargo (cells 17, 24, 42), glowing green where generators glow gold. Lay it on any
  generator (tap then tap, or drag) for +1 level up to 5; used up. Moves like a part;
  cannot be recycled. Saves: a new cell and find type `{type:'cog'}`; older saves have
  none and load unchanged.
- **Energy and stars for the costlier keys:** energy jars +15 (+25 at the edge), the tent
  +15 and the beacon +25 energy; Landing Beach costs 6·10·14·16·19·20·22 ★.
- **"Money":** stars are the coin of the camp for now (orders and star pouches pay them,
  restorations spend them). A separate coin currency would need a place to spend it
  (a shop) and is left for the user to decide.
- Scripted players, 4–6 s per action: the curious player (goes for each new generator
  while energy is 25+, without taking parts orders need unless energy is 40+) finds the
  Kite at 4.5–7 min and every kind by 24–36 min, opens the cog beside the camp at
  9–14 min (the two at the edge stay sealed for later), and restores
  Landing Beach in 39–61 min with no waiting; an order-only player takes 15–23 min with
  Rivet Rover alone.

## Build 13 — a buried camp start, little energy in crates (user, with a reference board: "Hairtsagnaas bas dan energytei holbootoi yum garhaar amarhan duusah yumaa, ehlel ni iimerhuuduu baimaar baina")
- **Start:** six tideglass cells ring the camp (Split spanners, Grip tools, a Route fold, a
  Rope coil), so a new camp opens on half-buried parts beside the Rover; merges in the
  camp crack them. Six crates touch the camp between them (one tier-2 teaching crate).
  27 crates and 13 tideglass cells in all.
- **Level-numbered cells were not used:** the user asked whether cells unlocked by player
  level would just be a copy of the reference game; they would, so the board stays gated
  by crate keys and tideglass, which are our own.
- **Energy in crates is rare and small:** two +5 jars (was five jars, +15/+25). The crates
  that held energy now hold parts and crates. Level chest +15 energy instead.
- Scripted players, 4–6 s per action: the curious player finds the Survey Kite at 3–4 min
  (it is reachable once the glass or crate beside it opens) and restores Landing Beach in
  33–49 min with no waiting; an order-only player in 14–21 min.

## Build 14 — level a generator up to bring out the next (user: "Ehleed ehnii generatoroo saijruuldag baiy, ternii daraagaas daraagiin generator garch irdeg baih")
- **New kinds come from levelling, not from crates.** When a generator reaches level 2
  (`UNLOCK_LEVEL`), the next kind comes out beside it: Rivet Rover → Survey Kite → Rope
  Winch → Shell Trap → Lantern Kiln (`release()` in `v5/next/game.mjs`, checked after every
  action, so a full board only delays it; a moment shows the new chain).
- **Crates hold what levels generators up:** copies (three Rovers, two Kites, a Rope Winch,
  two Shell Traps) and four Brass cogs, all behind the highest keys of their ring. The
  first upgrade is close: a second Rivet Rover in the corner beside the camp (Crawler
  jack). Later copies and cogs want tier-5 parts. The Workshop still gives a Rover copy.
- The hint line names the generator to level next; tapping a generator says what its
  level 2 brings.
- Saves: no shape change. An older camp whose generator is already level 2 gets the
  next kind on its next action; generators already found stay.
- Scripted player, 4–6 s per action: Survey Kite at 3–4.5 min, Rope Winch 9–13, Shell
  Trap 14–21, Lantern Kiln 17–25; Landing Beach in 27–42 min, no waiting, energy ~23 left.

## Build 15 — level 3 to unlock, a slower board (user: "Ehnii generator deer leveliin ahiulaad ternii daraagaas er ni next generator garch irii gesen shd, board bas hurdan neegdeed duusch baina")
- **Level the generator up more than once:** the next kind now comes out at level 3
  (`UNLOCK_LEVEL`=3): two Rovers make level 2, and another level-2 Rover or a Brass cog
  makes level 3, which brings out the Survey Kite. Landing Beach is now a Rover-and-Kite
  area; the Rope Winch (Kite level 3) and the rest come with the next areas.
- **Slower board:** tideglass needs three merges beside it (`GLASS_HITS`=3); the scripted
  player no longer opens everyday crates unless energy is plentiful (45+).
- Economy: Landing Beach costs 6·10·15·20·24·28·32 ★; tent +15, beacon +20 energy,
  level chest +15.
- Scripted player (order parts first, then the copy or cog for the next level), 4–6 s per
  action: Rover level 2 at 3–5 min, Survey Kite at 11–17 min, Landing Beach in 30–45 min,
  energy ~21–23 at the end, no waiting. Closed cells (crates and glass) out of 40:
  ~32 at 5 min, ~29 at 10, ~25 at 20, 22 when the beach is done (build 14: 13).
