# Vaultwake V5 — New core loop plan (2026-10-22)

**Status:** approved 2026-10-22 ("Zuvshuurlu, 1-r alhmaas ehle"). Step 1 built.
**Why:** the user, after the dig-out board and generator boxes: "no sense of progress";
"it is built on the old gameplay and stuck there". Every recent change was layered on
the old five-step expedition chain (landing → crossing → Stone Lift → rings → Vault),
where each step teaches a one-off rule instead of making the camp grow.

**Decisions taken (user, 2026-10-22):**
1. Remove the old special mechanics (route breach, device sites, Lift charging, ring
   receivers, side contracts and opportunities, the Precision Bench, instruments, Vault kits).
2. Restorations live on a separate map screen.
3. The current game becomes "Classic", with its saves untouched; the new loop starts
   a new game.

**Lesson kept from the rejected rework:** change the loop, not the look. The new mode
reuses the current header, coast picture, sand board, item art, energy pill and level
ring as they are.

## The loop
One loop, as in Travel Town and Merge Haven:
1. **Tap a generator** (1 energy) → a part. Generator boxes give free parts.
2. **Merge** twins up a chain. Merges dig the sand next to them, so the board grows.
3. **Crew orders**: three cards at the top (four from level 5), Ivo, Neri, Tamsin and
   Bram. They are the only source of work. Delivering pays ◆ stars, XP and sometimes a box.
4. **Restore the coast with ◆** on the map: each task (e.g. "Repair the pier", 6 ◆)
   shows the place changing and adds one or two story lines.
5. **An area fully restored** opens the next: a new generator or chain, new orders,
   new board space.

Levels (XP from merges, orders and restorations) open the numbered board cells and give
a chest (energy + a box), as now. Energy refills +1 every 2 minutes up to 50, as now.

## Areas (chapter 1)
| # | Area | Picture (existing) | Opens | Tasks |
|---|---|---|---|---|
| 1 | Landing Beach | `landing-vibrant` | Rivet Rover; Survey Kite after task 3 | 7 |
| 2 | Survey Worksite | `worksite-vibrant` | Echo Crucible | 8 |
| 3 | Vault Entrance | `entrance-vibrant` → `powered-vibrant` | Tide treasures (Kite chain) | 8 |
| 4 | The Vault | `vault-open-vibrant` | Chapter end: the star map mystery | 6 |

Each task costs 3–15 ◆ (rising through the chapter). The Workshop, Supply Pier and
Charting Loft become tasks in areas 1–3 instead of separate systems.

## Screens
- **Main:** header (energy, level, MAP), top card = current area picture with
  "Landing Beach 3/7" and the next task with its ◆ cost and a progress bar; the order row;
  the board. No goal-chain card, no side tray.
- **Map (separate screen):** the four areas; inside an area, its tasks with cost and a
  Restore button; restored tasks show a tick and replay their lines. The area picture
  goes from faded to full colour as tasks are done.

## Pacing targets (checked by scripted players before each link)
First merge < 10 s · first order < 1 min · first restoration ≈ 3 min · a level every
5–8 min · area 1 in 20–30 min · energy is felt (a session of ~15–20 min before waiting).

## Saves
- The new mode uses a **new key** `vaultwake-v5-coast` with its own `load()` and
  version. The Classic keys `vaultwake-v5`, `vaultwake-v5-replay` and
  `vaultwake-v5-active-slot` are never read for writing, cleared or renamed.
- A player with a Classic save sees "Continue Classic" on the new mode's menu.

## Code layout
- New page and modules under `v5/next/` (reducer, orders, areas, map, app), reusing
  `v5/art.mjs`, `v5/kits.mjs`, `v5/energy.mjs`, `v5/levels.mjs` (XP curve) and the CSS.
  `v5/index.html` stays Classic until the user approves the switch.
- Tests: `tests/v5-next-*.test.mjs` (rules, saves, scripted-player pacing) and one
  browser walkthrough at 360/390/430 px. Classic tests stay as they are.

## Steps (a test link after each)
1. Playable area 1: board, generators, boxes, orders with ◆, energy, levels, map screen
   with area 1 tasks and story lines.
2. Areas 2–4: Crucible, tide treasures, Vault ending; pacing tuned with scripted players.
3. After approval: the new mode becomes the default entry; Classic is reached from the menu.

## Step 1 — built (2026-10-22)
- Page `v5/play.html`; modules `v5/next/game.mjs` (reducer, orders, saves),
  `v5/next/areas.mjs` (Landing Beach, seven tasks with story lines), `v5/next/app.mjs`
  (UI), `v5/next/next.css`. Classic `v5/index.html` is unchanged.
- Landing Beach tasks (★): path 4, tent 6 (+10 energy), signal mast 9 (Survey Kite),
  Workshop 12 (Rivet Rover +1 level), supply pier 16 (Medium map satchel), beacon 20
  (fourth order card), cliff path 26 (area restored; Survey Worksite next update).
- Orders: the first three teach the loop; then one or two needs from the open
  generators, tiers growing with the level, never repeating a live need. Stars per
  item by tier 1·1·2·4·7·12; XP = the order's stars; every third order adds a small box.
- XP: merge 1, restoration 5, feeding a generator 5. Level chest: +5 energy and a small
  box of an open family; levels open the numbered cells. No merge energy bonus.
- Restored places appear on the coast picture, which warms as the area fills; each
  restoration plays its lines. Map dialog lists the four areas; only Landing Beach has
  tasks yet.
- Scripted player (`tests/v5-next-policy.mjs`, 5–6 s per action): first restoration
  0.6–0.7 min, Landing Beach in 16–19 min, five level-ups, energy ~11 at the end.
- Tests: `tests/v5-next.test.mjs`, `tests/v5-next-browser.cjs` (360/390/430 px, added
  to CI). Save key `vaultwake-v5-coast`; Classic keys are never written.

## More chains per generator (user, 2026-10-22: "A+B hiigeed uz", after a level-86 reference board)
The reference board had only four generators but some thirty item types: each
generator makes several short chains. Coast Camp had three generators with one chain each.
- `v5/next/chains.mjs`: Rivet Rover makes Fieldworks parts, then **Rope** at level 2
  (Frayed twine → Cargo hoist, 6 tiers) and **Lamps** at level 3 (Candle stub → Beacon
  lens, 5). Survey Kite makes Wayfinding, then **Shells** at level 2 (Sand dollar →
  Coral crown, 6). New chains are drawn in SVG in the existing style.
- (B) The Workshop restoration raises Rivet Rover to level 2 (rope); the supply pier now
  raises Survey Kite to level 2 (shells) instead of giving a box. Feeding Large boxes
  raises levels further (lamps at Rover level 3). Each new chain shows its whole line.
- A generator with several chains makes a chain the crew orders still need three pulls
  in five, otherwise any of its chains. Without this lean, a scripted player needed
  100 minutes (70 of them waiting for energy) for Landing Beach.
- Orders draw from every open chain; boxes drop parts of their generator's open chains;
  a box from a new-chain order belongs to that chain's generator.
- Scripted player, 5–6 s per action: Landing Beach in 15–18 min, energy ~15 at the end;
  all five open chains appear in orders.
- Fixed while building: a box from a rope order was created with the family "rope",
  which would have made the save invalid on reload. Covered by a test.
