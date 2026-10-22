# Vaultwake V5 — Lessons from Travel Town, Merge Mansion and Gossip Harbor (2026-10-22)

**Status:** design proposal, not approved. No code changes. Asked for by the user
after the one-loop rework was rolled back ("take ideas from popular games' loop,
rewards, layout and art and develop them").
**Baseline:** the `f18333f` build (light sand board, coast scene, current art).
Every step below keeps that visual language.

## How the genre holds players
Two layers of progress. The board gives a win every few seconds (merge) and every
1–2 minutes (order). The meta layer turns those wins into a visible place being
restored, with story beats, every few orders. Level-ups with a reward chest land
every 5–10 minutes; refilled energy and events bring players back daily.

## Seven lessons
| # | Genre practice | Vaultwake today | Proposal | Type |
|---|---|---|---|---|
| 1 | Board starts full, mostly locked copies (Merge Mansion cobwebs: merge a free twin onto one to free it) | Sealed ground and rocks read as obstacles and hide what is inside | Salt-crusted parts: dimmed but readable; merge a matching part onto one to free it | New rule — approval needed |
| 2 | Orders come from story characters, 3–4 at once, at the top (Gossip Harbor) | Main objective, request lane and side tray split attention; rewards are supplies/charges | Three portrait orders (Ivo, Neri, Tamsin, Bram) paying stars + XP | Rework of existing orders |
| 3 | Restoration is its own rewarding screen (Travel Town town, renovations) | Restorations are buttons on the board or a small scene change | Tap the coast scene → coast map; spend stars on sites; 2–3 dialogue lines per step | New screen — approval needed |
| 4 | Rewards fly to a HUD; XP bar → level → chest | Rewards rare and abstract; no level feeling | XP bar; level chest with raw parts, energy, sometimes a producer | New system — approval needed |
| 5 | Simple generators that grow (Travel Town producer merging, power boost) | Charges, service, burst, surge layers | 1 energy per tap; drop charges/service; producers improve with level | Simplification |
| 6 | Free-floating, tier-distinct items; short juicy merge feedback | Art and sand board liked by the user | Keep the look; add "New!" discovery cards and star flights | Polish |
| 7 | Short, frequent dialogue around one big mystery | Mystery (Vault, lost fleet) exists, beats are rare and fast | Dialogue on every restoration step; chapter ends on a question | Content |

## Proposed order (one change per playtest link)
1. Portrait orders + stars/XP rewards (board and art untouched).
2. Salt-crusted parts filling ~20 starting cells.
3. Coast map screen with story beats.
4. Level chest; remove charges/service.

Each step: save migration with a test loading older saves (keys unchanged), full V5
suite, 360/390/430px browser check, playtest link. If a step is disliked, only that
step is reverted. Lesson from the rollback: never change loop and look together.

## Step 2 — salt-crusted parts (approved 2026-10-22, "2-r alhamaas ehle")
- New cell `{type:'crust',family,tier}` (`v5/core.mjs`: `crust`, `freesCrust`). It never
  moves, never counts for goals, orders or bench inputs, and cannot be recycled.
- Merging a free twin onto it gives the next tier in its cell and frees the source cell,
  exactly like a normal merge (discovery, merge bonus and mastery included).
- Fresh board: six crusts replace the four buried excavation cells and two spare
  corners (17 Copper offcut, 25 Copper offcut, 26 Ink scrap, 28 Grip tool, 29 Violet
  shard, 35 Route fold). Free cells at start: 7 (was 9).
- The Stone Lift winch and the survey scope crack up to two crusts free each, where
  they used to open two buried cells.
- Saves: older saves keep their boards and gain no crusts; saves with crusts round-trip;
  malformed crusts start fresh. Keys unchanged. Tests: `tests/v5-crust.test.mjs`.
- Limit: six, not the ~20 cells sketched in the mockup. The rest of the 6×6 board is
  held by producers, devices, routes and blockers; more crusts would need a larger
  board or fewer fixtures, which is a separate decision.

## Sources and limits
No first-party data was found. Travel Town figures (100 energy, 72-cell board) come
from fan guides; the "top-grossing" claim for Gossip Harbor is unverified. Level
chests and separate renovation screens are described from general genre knowledge.
- Naavik, "Why Travel Town Dominates Mobile Merge": https://naavik.co/digest/why-travel-town-is-dominating-mobile-merge/
- Deconstructor of Fun, "Just Dessert vs. Gossip Harbor": https://www.deconstructoroffun.com/blog/just-dessert-vs-gossip-harbor-who-merged-it-better
- Deconstructor of Fun, "Finding Genre Success: the Case of Gossip Harbor": https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor
- Merge Mansion Wiki, Cobwebs: https://merge-mansion.fandom.com/wiki/Cobwebs
- Travel Town guide (merge loop, energy): https://thegamereward.com/travel-town/
- Travel Town producer guide: https://traveltownhub.com/travel-town-producer-guide/
- "Good feedback for bad players" (juicy interfaces study): https://adk.elsevierpure.com/en/publications/good-feedback-for-bad-players-a-preliminary-study-of-juicy-interf
